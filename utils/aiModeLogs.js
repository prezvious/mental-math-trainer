import { getProgressWriteGeneration, registerProgressBuffer, withAccountProgressWrite } from './progressWriteCoordinator.js';

export const AI_MODE_LOG_TABLE = 'ai_mode_logs';
export const AI_MODE_LOG_INSERT_BATCH_SIZE = 500;
export const AI_MODE_LOG_FETCH_PAGE_SIZE = 1000;
export const AI_MODE_LOG_BUFFER_FLUSH_SIZE = 20;
export const AI_MODE_LOG_BUFFER_FLUSH_DELAY_MS = 2000;
export const AI_MODE_LOG_UPSERT_ON_CONFLICT = 'user_id,session_id,question_index';
export const AI_MODE_LOG_UPSERT_OPTIONS = Object.freeze({
  onConflict: AI_MODE_LOG_UPSERT_ON_CONFLICT,
  ignoreDuplicates: true
});
export const AI_MODE_LOG_KEEPALIVE_PREFER = 'resolution=ignore-duplicates,return=minimal';
export const AI_MODE_LOG_SELECT_FIELDS = [
  'id',
  'session_id',
  'question_index',
  'source_kind',
  'operation_label',
  'prompt_text',
  'normalized_expression',
  'result_kind',
  'result_exact_text',
  'result_decimal_text',
  'response_ms',
  'created_at'
].join(', ');

export function buildAiModeLogRow(
  {
    sourceKind,
    operationLabel,
    promptText,
    normalizedExpression,
    resultKind,
    resultExactText,
    resultDecimalText,
    responseMs
  },
  userId,
  sessionId,
  questionIndex,
  createdAt = new Date().toISOString()
) {
  return {
    user_id: userId,
    session_id: sessionId,
    question_index: questionIndex,
    source_kind: sourceKind,
    operation_label: operationLabel,
    prompt_text: promptText,
    normalized_expression: normalizedExpression,
    result_kind: resultKind,
    result_exact_text: resultExactText,
    result_decimal_text: resultDecimalText,
    response_ms: responseMs,
    created_at: createdAt
  };
}

export function buildAiModeTrainerLogRow(
  problem,
  solvedProblem,
  userId,
  sessionId,
  questionIndex,
  createdAt = new Date().toISOString()
) {
  return buildAiModeLogRow(
    {
      sourceKind: 'trainer',
      operationLabel: problem.operation,
      promptText: solvedProblem.promptText,
      normalizedExpression: solvedProblem.normalizedExpression,
      resultKind: solvedProblem.resultKind,
      resultExactText: solvedProblem.resultExactText,
      resultDecimalText: solvedProblem.resultDecimalText,
      responseMs: solvedProblem.responseMs
    },
    userId,
    sessionId,
    questionIndex,
    createdAt
  );
}

export function buildAiModeCustomLogRow(
  solvedExpression,
  promptText,
  userId,
  sessionId,
  questionIndex = 1,
  createdAt = new Date().toISOString()
) {
  return buildAiModeLogRow(
    {
      sourceKind: 'custom',
      operationLabel: 'CUSTOM',
      promptText,
      normalizedExpression: solvedExpression.normalizedExpression,
      resultKind: solvedExpression.kind,
      resultExactText: solvedExpression.exactText,
      resultDecimalText: solvedExpression.decimalText,
      responseMs: solvedExpression.responseMs
    },
    userId,
    sessionId,
    questionIndex,
    createdAt
  );
}

export async function persistAiModeLogBatches(
  client,
  rows,
  batchSize = AI_MODE_LOG_INSERT_BATCH_SIZE
) {
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const { error } = await client.from(AI_MODE_LOG_TABLE).upsert(
      batch,
      AI_MODE_LOG_UPSERT_OPTIONS
    );

    if (error) {
      throw error;
    }
  }
}

export async function persistAiModeLogRowsKeepalive(
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
    `${restConfig.url}/rest/v1/${AI_MODE_LOG_TABLE}?on_conflict=${encodeURIComponent(AI_MODE_LOG_UPSERT_ON_CONFLICT)}`,
    {
      method: 'POST',
      headers: {
        apikey: restConfig.key,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: AI_MODE_LOG_KEEPALIVE_PREFER
      },
      body: JSON.stringify(rows),
      keepalive: true
    }
  );

  if (!response.ok) {
    const errorText = typeof response.text === 'function' ? await response.text() : '';
    throw new Error(errorText || `Keepalive AI MODE flush failed with ${response.status}.`);
  }

  return true;
}

export function createAiModeLogBuffer({
  getClient,
  getAccessToken,
  getRestConfig,
  batchSize = AI_MODE_LOG_INSERT_BATCH_SIZE,
  flushSize = AI_MODE_LOG_BUFFER_FLUSH_SIZE,
  flushDelayMs = AI_MODE_LOG_BUFFER_FLUSH_DELAY_MS,
  fetchImpl = globalThis.fetch,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout
} = {}) {
  let pendingRows = [];
  let inFlightRows = [];
  let flushTimer = null;
  let flushPromise = null;
  const generations = new WeakMap();
  const isCurrent = row => generations.get(row) === getProgressWriteGeneration(row.user_id);

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

    void withAccountProgressWrite(rows[0].user_id, () => persistAiModeLogRowsKeepalive(
      rows.filter(isCurrent), { accessToken, restConfig, fetchImpl }
    ), generations.get(rows[0])).catch(() => {});

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
          await withAccountProgressWrite(snapshot[0].user_id, async () => {
            const current = snapshot.filter(isCurrent);
            await persistAiModeLogBatches(client, current, batchSize);
            flushedCount += current.length;
          }, generations.get(snapshot[0]));
        } catch (error) {
          pendingRows = [...snapshot.filter(isCurrent), ...pendingRows];
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
      void flush().catch(() => {});
    }, flushDelayMs);
  };

  const enqueue = (row) => {
    generations.set(row, getProgressWriteGeneration(row.user_id));
    pendingRows = [...pendingRows, row];

    if (pendingRows.length >= flushSize) {
      void flush().catch(() => {});
      return;
    }

    scheduleFlush();
  };

  const clear = () => {
    pendingRows = [];
    cancelScheduledFlush();
  };

  const unregister = registerProgressBuffer(userId => {
    pendingRows = pendingRows.filter(row => row.user_id !== userId);
    if (!pendingRows.length) cancelScheduledFlush();
  });

  return {
    enqueue,
    flush,
    clear,
    dispose: () => { cancelScheduledFlush(); unregister(); },
    getPendingRows: () => pendingRows.slice(),
    getPendingCount: () => pendingRows.length,
    getInFlightRows: () => inFlightRows.slice()
  };
}

export async function fetchAllAiModeLogs(
  client,
  userId,
  pageSize = AI_MODE_LOG_FETCH_PAGE_SIZE
) {
  const rows = [];

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await client
      .from(AI_MODE_LOG_TABLE)
      .select(AI_MODE_LOG_SELECT_FIELDS)
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
