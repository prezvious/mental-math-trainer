export const PROGRESS_LOG_INSERT_BATCH_SIZE = 500;
export const PROGRESS_LOG_FETCH_PAGE_SIZE = 1000;
export const PROGRESS_LOG_BUFFER_FLUSH_SIZE = 20;
export const PROGRESS_LOG_BUFFER_FLUSH_DELAY_MS = 2000;
export const PROGRESS_LOG_UPSERT_ON_CONFLICT = 'user_id,session_id,question_index';
export const PROGRESS_LOG_SELECT_FIELDS = [
  'id',
  'session_id',
  'question_index',
  'operation',
  'digits_left',
  'digits_right',
  'left_operand',
  'right_operand',
  'submitted_answer',
  'correct_answer',
  'is_correct',
  'response_ms',
  'created_at'
].join(', ');

export function buildProgressLogRow(
  attempt,
  roundSettings,
  userId,
  sessionId,
  questionIndex
) {
  return {
    user_id: userId,
    session_id: sessionId,
    question_index: questionIndex,
    operation: attempt.operation,
    digits_left: attempt.operation === 'EXPONENTIATION'
      ? String(attempt.leftOperand).length
      : roundSettings.leftDigits,
    digits_right: attempt.operation === 'EXPONENTIATION'
      ? 1
      : roundSettings.rightDigits,
    left_operand: attempt.leftOperand,
    right_operand: attempt.rightOperand,
    correct_answer: attempt.correctAnswer.toString(),
    submitted_answer: attempt.submittedAnswer.toString(),
    is_correct: attempt.isCorrect,
    response_ms: attempt.responseMs
  };
}

export function buildProgressLogRows(
  attempts,
  roundSettings,
  userId,
  sessionId
) {
  return attempts.map((attempt, index) =>
    buildProgressLogRow(
      attempt,
      roundSettings,
      userId,
      sessionId,
      index + 1
    )
  );
}

export async function persistProgressLogBatches(
  client,
  rows,
  batchSize = PROGRESS_LOG_INSERT_BATCH_SIZE
) {
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const { error } = await client.from('progress_logs').upsert(batch, {
      onConflict: PROGRESS_LOG_UPSERT_ON_CONFLICT
    });

    if (error) {
      throw error;
    }
  }
}

export async function persistProgressLogRowsKeepalive(
  rows,
  { accessToken, restConfig, fetchImpl = globalThis.fetch }
) {
  if (!rows.length || !accessToken || !restConfig?.url || !restConfig?.key) {
    return false;
  }

  if (typeof fetchImpl !== 'function') {
    return false;
  }

  const response = await fetchImpl(
    `${restConfig.url}/rest/v1/progress_logs?on_conflict=${encodeURIComponent(PROGRESS_LOG_UPSERT_ON_CONFLICT)}`,
    {
      method: 'POST',
      headers: {
        apikey: restConfig.key,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(rows),
      keepalive: true
    }
  );

  if (!response.ok) {
    const errorText = typeof response.text === 'function' ? await response.text() : '';
    throw new Error(errorText || `Keepalive progress flush failed with ${response.status}.`);
  }

  return true;
}

export function createProgressLogBuffer({
  getClient,
  getAccessToken,
  getRestConfig,
  batchSize = PROGRESS_LOG_INSERT_BATCH_SIZE,
  flushSize = PROGRESS_LOG_BUFFER_FLUSH_SIZE,
  flushDelayMs = PROGRESS_LOG_BUFFER_FLUSH_DELAY_MS,
  fetchImpl = globalThis.fetch,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout
} = {}) {
  let pendingRows = [];
  let inFlightRows = [];
  let flushTimer = null;
  let flushPromise = null;

  const cancelScheduledFlush = () => {
    if (flushTimer) {
      clearTimeoutImpl(flushTimer);
      flushTimer = null;
    }
  };

  const fireKeepalive = (rows) => {
    const accessToken = getAccessToken?.();
    const restConfig = getRestConfig?.();

    if (!rows.length || !accessToken || !restConfig?.url || !restConfig?.key) {
      return false;
    }

    if (typeof fetchImpl !== 'function') {
      return false;
    }

    void persistProgressLogRowsKeepalive(rows, {
      accessToken,
      restConfig,
      fetchImpl
    }).catch(() => {});

    return true;
  };

  const flush = async ({ keepalive = false } = {}) => {
    cancelScheduledFlush();

    if (flushPromise) {
      if (keepalive) {
        const rowsToKeepalive = [...inFlightRows, ...pendingRows];
        if (rowsToKeepalive.length) {
          fireKeepalive(rowsToKeepalive);
        }
      }

      return flushPromise;
    }

    if (!pendingRows.length) {
      return { flushedCount: 0 };
    }

    const client = getClient?.();
    if (!client) {
      return { flushedCount: 0 };
    }

    let flushedCount = 0;

    flushPromise = (async () => {
      while (pendingRows.length) {
        const snapshot = pendingRows;
        pendingRows = [];
        inFlightRows = snapshot;

        if (keepalive) {
          fireKeepalive(snapshot);
        }

        try {
          await persistProgressLogBatches(client, snapshot, batchSize);
          flushedCount += snapshot.length;
        } catch (error) {
          pendingRows = [...snapshot, ...pendingRows];
          throw error;
        } finally {
          inFlightRows = [];
        }
      }

      return { flushedCount };
    })().finally(() => {
      flushPromise = null;
    });

    return flushPromise;
  };

  const scheduleFlush = () => {
    cancelScheduledFlush();
    flushTimer = setTimeoutImpl(() => {
      flushTimer = null;
      void flush();
    }, flushDelayMs);
  };

  const enqueue = (row) => {
    pendingRows = [...pendingRows, row];

    if (pendingRows.length >= flushSize) {
      void flush();
      return;
    }

    scheduleFlush();
  };

  const clear = () => {
    pendingRows = [];
    cancelScheduledFlush();
  };

  return {
    enqueue,
    flush,
    clear,
    dispose: cancelScheduledFlush,
    getPendingRows: () => pendingRows.slice(),
    getPendingCount: () => pendingRows.length,
    getInFlightRows: () => inFlightRows.slice()
  };
}

export async function fetchAllProgressLogs(
  client,
  userId,
  pageSize = PROGRESS_LOG_FETCH_PAGE_SIZE
) {
  const rows = [];

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await client
      .from('progress_logs')
      .select(PROGRESS_LOG_SELECT_FIELDS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(start, start + pageSize - 1);

    if (error) {
      throw error;
    }

    const page = data || [];
    rows.push(...page);

    if (page.length < pageSize) {
      return rows;
    }
  }
}
