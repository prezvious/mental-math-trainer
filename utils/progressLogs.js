export const PROGRESS_LOG_INSERT_BATCH_SIZE = 500;
export const PROGRESS_LOG_FETCH_PAGE_SIZE = 1000;
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

export function buildProgressLogRows(
  attempts,
  roundSettings,
  userId,
  sessionId
) {
  return attempts.map((attempt, index) => ({
    user_id: userId,
    session_id: sessionId,
    question_index: index + 1,
    operation: attempt.operation,
    digits_left: roundSettings.leftDigits,
    digits_right: roundSettings.rightDigits,
    left_operand: attempt.leftOperand,
    right_operand: attempt.rightOperand,
    correct_answer: attempt.correctAnswer.toString(),
    submitted_answer: attempt.submittedAnswer.toString(),
    is_correct: attempt.isCorrect,
    response_ms: attempt.responseMs
  }));
}

export async function persistProgressLogBatches(
  client,
  rows,
  batchSize = PROGRESS_LOG_INSERT_BATCH_SIZE
) {
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const { error } = await client.from('progress_logs').insert(batch);

    if (error) {
      throw error;
    }
  }
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
