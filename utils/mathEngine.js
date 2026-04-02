export const MAX_DIGITS = 8;
export const MAX_ROUND_SIZE = 10000;
export const MIN_ROUND_SIZE = 3;

export const OPERATION_META = {
  ADDITION: { label: 'Addition', symbol: '+' },
  SUBTRACTION: { label: 'Subtraction', symbol: '-' },
  MULTIPLICATION: { label: 'Multiplication', symbol: '\u00D7' },
  DIVISION: { label: 'Division', symbol: '\u00F7' },
  SQUARES: { label: 'Squares', symbol: '\u00B2' }
};

const VALID_OPERATIONS = Object.keys(OPERATION_META);
const ORDERED_DIGIT_OPERATIONS = ['SUBTRACTION', 'DIVISION'];

export function getOperationOptions() {
  return VALID_OPERATIONS.map((operation) => ({
    value: operation,
    ...OPERATION_META[operation]
  }));
}

export function operationRequiresOrderedDigits(operation) {
  return ORDERED_DIGIT_OPERATIONS.includes(operation);
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseNumberOrFallback(value, fallback) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function randomInteger(minInclusive, maxExclusive) {
  return Math.floor(Math.random() * (maxExclusive - minInclusive) + minInclusive);
}

function randomIntegerByDigits(digits) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits);
  return randomInteger(min, max);
}

function getOperands(operation, leftDigits, rightDigits) {
  switch (operation) {
    case 'ADDITION':
    case 'MULTIPLICATION':
      return [leftDigits, rightDigits].map((digits) =>
        digits === 1 ? randomInteger(2, 10) : randomIntegerByDigits(digits)
      );
    case 'SUBTRACTION':
      if (leftDigits !== rightDigits) {
        return [
          randomIntegerByDigits(leftDigits),
          randomIntegerByDigits(rightDigits)
        ];
      }
      // Keep subtraction positive to preserve flow and avoid sign mistakes.
      {
        const minLeft = Math.pow(10, leftDigits - 1) + 1;
        const maxLeft = Math.pow(10, leftDigits);
        const leftOperand = randomInteger(minLeft, maxLeft);
        const rightOperand = randomInteger(minLeft - 1, leftOperand);
        return [leftOperand, rightOperand];
      }
    case 'DIVISION':
      {
        let divisor;
        let minQuotient;
        let maxQuotient;

        if (leftDigits === rightDigits) {
          if (leftDigits === 1) {
            divisor = randomInteger(2, 5);
          } else {
            divisor = randomInteger(
              Math.pow(10, leftDigits - 1),
              Math.pow(10, leftDigits) / 2
            );
          }
          minQuotient = 2;
          maxQuotient = Math.floor((Math.pow(10, leftDigits) - 1) / divisor);
        } else {
          divisor =
            rightDigits === 1 ? randomInteger(2, 10) : randomIntegerByDigits(rightDigits);
          minQuotient = Math.ceil(Math.pow(10, leftDigits - 1) / divisor);
          maxQuotient = Math.floor((Math.pow(10, leftDigits) - 1) / divisor);
        }

        const quotient = randomInteger(minQuotient, maxQuotient + 1);
        return [divisor * quotient, divisor];
      }
    default:
      return [2, 2];
  }
}

function getCorrectAnswer(operation, leftOperand, rightOperand) {
  const left = BigInt(leftOperand);
  const right = BigInt(rightOperand);

  switch (operation) {
    case 'ADDITION':
      return left + right;
    case 'SUBTRACTION':
      return left - right;
    case 'MULTIPLICATION':
      return left * right;
    case 'DIVISION':
      return left / right;
    default:
      return 0n;
  }
}

export function createProblem(operation, leftDigits, rightDigits) {
  const [leftOperand, rightOperand] = getOperands(operation, leftDigits, rightDigits);
  const correctAnswer = getCorrectAnswer(operation, leftOperand, rightOperand);

  return {
    operation,
    leftOperand,
    rightOperand,
    correctAnswer
  };
}

export function formatDuration(milliseconds) {
  if (!milliseconds) {
    return '0.00s';
  }

  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;
  return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
}

export function parseIntegerInput(value) {
  const trimmedValue = value.trim();
  if (!/^\d+$/.test(trimmedValue)) {
    return null;
  }

  try {
    return BigInt(trimmedValue);
  } catch (_error) {
    return null;
  }
}

export function sanitizeSettings(settings) {
  const operation = VALID_OPERATIONS.includes(settings.operation)
    ? settings.operation
    : 'MULTIPLICATION';

  const leftDigits = clampNumber(parseNumberOrFallback(settings.leftDigits, 2), 1, MAX_DIGITS);
  let rightDigits = clampNumber(
    parseNumberOrFallback(settings.rightDigits, 2),
    1,
    MAX_DIGITS
  );
  if (operationRequiresOrderedDigits(operation)) {
    rightDigits = Math.min(rightDigits, leftDigits);
  }

  return {
    operation,
    leftDigits,
    rightDigits,
    roundSize: clampNumber(
      parseNumberOrFallback(settings.roundSize, 10),
      MIN_ROUND_SIZE,
      MAX_ROUND_SIZE
    )
  };
}

export function computeRoundStats(attempts) {
  const total = attempts.length;
  const correct = attempts.filter((attempt) => attempt.isCorrect).length;
  const totalResponseMs = attempts.reduce(
    (sum, attempt) => sum + attempt.responseMs,
    0
  );
  const averageResponseMs = total ? Math.round(totalResponseMs / total) : 0;
  const accuracy = total ? (correct / total) * 100 : 0;

  return {
    total,
    correct,
    incorrect: total - correct,
    accuracy,
    totalResponseMs,
    averageResponseMs
  };
}
