export const PROGRESS_LOG_INSERT_BATCH_SIZE = 500;
export const PROGRESS_LOG_FETCH_PAGE_SIZE = 1000;
export const PROGRESS_LOG_BUFFER_FLUSH_SIZE = 20;
export const PROGRESS_LOG_BUFFER_FLUSH_DELAY_MS = 2000;
export const PROGRESS_LOG_UPSERT_ON_CONFLICT = 'user_id,session_id,question_index';
export const PROGRESS_LOG_UPSERT_OPTIONS = Object.freeze({
  onConflict: PROGRESS_LOG_UPSERT_ON_CONFLICT,
  ignoreDuplicates: true
});
export const PROGRESS_LOG_KEEPALIVE_PREFER = 'resolution=ignore-duplicates,return=minimal';
export const PROGRESS_LOG_SELECT_FIELDS = [
  'id',
  'session_id',
  'question_index',
  'practice_mode',
  'operation',
  'digits_left',
  'digits_right',
  'left_decimal_digits',
  'right_decimal_digits',
  'left_operand',
  'right_operand',
  'submitted_answer',
  'correct_answer',
  'is_correct',
  'response_ms',
  'created_at'
].join(', ');
export const LEGACY_PROGRESS_LOG_SELECT_FIELDS = [
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

const LEGACY_PROGRESS_LOG_MISSING_COLUMNS = new Set([
  'practice_mode',
  'left_decimal_digits',
  'right_decimal_digits'
]);
const LEGACY_PROGRESS_LOG_SCHEMA_ERROR_MESSAGE =
  'This Supabase project is missing the decimal progress log migration. Apply the latest Supabase migrations before saving decimal rounds.';

function parseProgressLogError(errorLike) {
  if (!errorLike) {
    return { code: '', message: '' };
  }

  if (typeof errorLike === 'string') {
    try {
      const parsedError = JSON.parse(errorLike);
      return {
        code: parsedError?.code || '',
        message: parsedError?.message || errorLike
      };
    } catch (_error) {
      return { code: '', message: errorLike };
    }
  }

  if (typeof errorLike.message === 'string') {
    const parsedFromMessage = parseProgressLogError(errorLike.message);
    if (parsedFromMessage.message !== errorLike.message) {
      return {
        code: parsedFromMessage.code || errorLike.code || '',
        message: parsedFromMessage.message || errorLike.message
      };
    }

    return {
      code: errorLike.code || '',
      message: errorLike.message
    };
  }

  return {
    code: errorLike.code || '',
    message: ''
  };
}

function getMissingProgressLogColumn(errorLike) {
  const { code, message } = parseProgressLogError(errorLike);

  if (code && code !== 'PGRST204' && !/schema cache/i.test(message)) {
    return null;
  }

  const match = message.match(
    /Could not find the '([^']+)' column of 'progress_logs' in the schema cache/i
  );

  return match ? match[1] : null;
}

function isLegacyProgressLogSchemaError(errorLike) {
  return LEGACY_PROGRESS_LOG_MISSING_COLUMNS.has(getMissingProgressLogColumn(errorLike));
}

function createLegacyProgressLogSchemaError() {
  return new Error(LEGACY_PROGRESS_LOG_SCHEMA_ERROR_MESSAGE);
}

function isUnsignedIntegerText(value) {
  return typeof value === 'string' && /^\d+$/.test(value);
}

function isSignedIntegerText(value) {
  return typeof value === 'string' && /^-?\d+$/.test(value);
}

function canPersistWithLegacyProgressLogSchema(row) {
  return (
    row.practice_mode !== 'DECIMAL' &&
    isUnsignedIntegerText(row.left_operand) &&
    isUnsignedIntegerText(row.right_operand) &&
    isSignedIntegerText(row.correct_answer) &&
    isSignedIntegerText(row.submitted_answer)
  );
}

function toLegacyProgressLogRows(rows) {
  if (!rows.every(canPersistWithLegacyProgressLogSchema)) {
    throw createLegacyProgressLogSchemaError();
  }

  return rows.map((row) => ({
    user_id: row.user_id,
    session_id: row.session_id,
    question_index: row.question_index,
    operation: row.operation,
    digits_left: row.digits_left,
    digits_right: row.digits_right,
    left_operand: Number(row.left_operand),
    right_operand: Number(row.right_operand),
    correct_answer: row.correct_answer,
    submitted_answer: row.submitted_answer,
    is_correct: row.is_correct,
    response_ms: row.response_ms
  }));
}

function normalizeLegacyProgressLogRows(rows) {
  return rows.map((row) => ({
    ...row,
    practice_mode: 'POSITIVE',
    left_decimal_digits: 0,
    right_decimal_digits: 0,
    left_operand: String(row.left_operand),
    right_operand: String(row.right_operand),
    correct_answer: String(row.correct_answer),
    submitted_answer: String(row.submitted_answer)
  }));
}

async function postProgressLogRowsKeepalive(
  rows,
  { accessToken, restConfig, fetchImpl }
) {
  return fetchImpl(
    `${restConfig.url}/rest/v1/progress_logs?on_conflict=${encodeURIComponent(PROGRESS_LOG_UPSERT_ON_CONFLICT)}`,
    {
      method: 'POST',
      headers: {
        apikey: restConfig.key,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: PROGRESS_LOG_KEEPALIVE_PREFER
      },
      body: JSON.stringify(rows),
      keepalive: true
    }
  );
}

async function fetchProgressLogPage(client, userId, start, end, selectFields) {
  return client
    .from('progress_logs')
    .select(selectFields)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(start, end);
}

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
    practice_mode: roundSettings.practiceMode || 'POSITIVE',
    operation: attempt.operation,
    digits_left: attempt.operation === 'EXPONENTIATION'
      ? String(attempt.leftOperand).length
      : roundSettings.leftDigits,
    digits_right: attempt.operation === 'EXPONENTIATION'
      ? 1
      : roundSettings.rightDigits,
    left_decimal_digits:
      roundSettings.practiceMode === 'DECIMAL'
        ? roundSettings.leftDecimalDigits
        : 0,
    right_decimal_digits:
      roundSettings.practiceMode === 'DECIMAL'
        ? roundSettings.rightDecimalDigits
        : 0,
    left_operand: String(attempt.leftOperand),
    right_operand: String(attempt.rightOperand),
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
  let shouldUseLegacySchema = false;

  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const rowsToPersist = shouldUseLegacySchema
      ? toLegacyProgressLogRows(batch)
      : batch;
    const { error } = await client.from('progress_logs').upsert(
      rowsToPersist,
      PROGRESS_LOG_UPSERT_OPTIONS
    );

    if (error) {
      if (!shouldUseLegacySchema && isLegacyProgressLogSchemaError(error)) {
        shouldUseLegacySchema = true;

        const { error: legacyError } = await client.from('progress_logs').upsert(
          toLegacyProgressLogRows(batch),
          PROGRESS_LOG_UPSERT_OPTIONS
        );

        if (legacyError) {
          throw legacyError;
        }

        continue;
      }

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

  const response = await postProgressLogRowsKeepalive(rows, {
    accessToken,
    restConfig,
    fetchImpl
  });

  if (!response.ok) {
    const errorText = typeof response.text === 'function' ? await response.text() : '';

    if (isLegacyProgressLogSchemaError(errorText)) {
      const legacyRows = toLegacyProgressLogRows(rows);
      const legacyResponse = await postProgressLogRowsKeepalive(legacyRows, {
        accessToken,
        restConfig,
        fetchImpl
      });

      if (!legacyResponse.ok) {
        const legacyErrorText =
          typeof legacyResponse.text === 'function' ? await legacyResponse.text() : '';
        const { message } = parseProgressLogError(legacyErrorText);
        throw new Error(
          message || `Keepalive progress flush failed with ${legacyResponse.status}.`
        );
      }

      return true;
    }

    const { message } = parseProgressLogError(errorText);
    throw new Error(message || `Keepalive progress flush failed with ${response.status}.`);
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
  let selectFields = PROGRESS_LOG_SELECT_FIELDS;
  let shouldUseLegacySchema = false;

  for (let start = 0; ; start += pageSize) {
    let { data, error } = await fetchProgressLogPage(
      client,
      userId,
      start,
      start + pageSize - 1,
      selectFields
    );

    if (error && !shouldUseLegacySchema && isLegacyProgressLogSchemaError(error)) {
      shouldUseLegacySchema = true;
      selectFields = LEGACY_PROGRESS_LOG_SELECT_FIELDS;

      ({ data, error } = await fetchProgressLogPage(
        client,
        userId,
        start,
        start + pageSize - 1,
        selectFields
      ));
    }

    if (error) {
      throw error;
    }

    const page = shouldUseLegacySchema
      ? normalizeLegacyProgressLogRows(data || [])
      : data || [];
    rows.push(...page);

    if (page.length < pageSize) {
      return rows;
    }
  }
}
