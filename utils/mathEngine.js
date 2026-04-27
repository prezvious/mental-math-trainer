export const MAX_DIGITS = 8;
export const MAX_ROUND_SIZE = 10000;
export const MIN_ROUND_SIZE = 3;
export const MAX_BASE = 20;
const MIN_DIRECT_EXPONENT = 2;
const MAX_DIRECT_EXPONENT = 5;

export const PRACTICE_MODES = Object.freeze({
  POSITIVE: 'POSITIVE',
  DECIMAL: 'DECIMAL'
});

export const PRACTICE_MODE_META = Object.freeze({
  [PRACTICE_MODES.POSITIVE]: {
    label: 'Positive Numbers'
  },
  [PRACTICE_MODES.DECIMAL]: {
    label: 'Decimals'
  }
});

export const OPERATION_META = {
  ADDITION: { label: 'Addition', symbol: '+' },
  SUBTRACTION: { label: 'Subtraction', symbol: '-' },
  MULTIPLICATION: { label: 'Multiplication', symbol: '\u00D7' },
  DIVISION: { label: 'Division', symbol: '\u00F7' },
  EXPONENTIATION: { label: 'Exponentiation', symbol: '^' }
};

const VALID_OPERATIONS = Object.keys(OPERATION_META);
const VALID_PRACTICE_MODES = Object.values(PRACTICE_MODES);
const DECIMAL_OPERATIONS = VALID_OPERATIONS.filter(
  (operation) => operation !== 'EXPONENTIATION'
);
const ORDERED_DIGIT_OPERATIONS = ['SUBTRACTION', 'DIVISION'];
const LEGACY_OPERATION_ALIASES = Object.freeze({
  SQUARES: 'EXPONENTIATION'
});

function normalizeOperationValue(operation) {
  if (typeof operation !== 'string') {
    return operation;
  }

  return LEGACY_OPERATION_ALIASES[operation] || operation;
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

function pickRandomItem(items) {
  return items[randomInteger(0, items.length)];
}

function randomDigitString(length) {
  return Array.from({ length }, () => String(randomInteger(0, 10))).join('');
}

function randomIntegerByDigits(digits) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits);
  return randomInteger(min, max);
}

function pow10BigInt(exponent) {
  return 10n ** BigInt(exponent);
}

function randomBigIntInclusive(minInclusive, maxInclusive) {
  const minimum = BigInt(minInclusive);
  const maximum = BigInt(maxInclusive);

  if (maximum < minimum) {
    throw new Error('Cannot pick a random BigInt from an empty range.');
  }

  const minLength = minimum.toString().length;
  const maxLength = maximum.toString().length;

  while (true) {
    const length =
      minLength === maxLength ? maxLength : randomInteger(minLength, maxLength + 1);
    let candidateText = '';

    if (length === 1) {
      candidateText = String(randomInteger(0, 10));
    } else {
      candidateText = `${randomInteger(1, 10)}${randomDigitString(length - 1)}`;
    }

    const candidate = BigInt(candidateText);
    if (candidate >= minimum && candidate <= maximum) {
      return candidate;
    }
  }
}

function divideCeil(numerator, denominator) {
  return (numerator + denominator - 1n) / denominator;
}

function trimLeadingZeros(value) {
  return value.replace(/^0+(?=\d)/, '') || '0';
}

function formatCanonicalDecimal(numerator, scale) {
  const absoluteValue = numerator < 0n ? -numerator : numerator;
  const sign = numerator < 0n ? '-' : '';

  if (!scale) {
    return `${sign}${absoluteValue.toString()}`;
  }

  const rawText = absoluteValue.toString().padStart(scale + 1, '0');
  const splitIndex = rawText.length - scale;
  const wholePart = trimLeadingZeros(rawText.slice(0, splitIndex));
  const fractionPart = rawText.slice(splitIndex).replace(/0+$/, '');

  return fractionPart ? `${sign}${wholePart}.${fractionPart}` : `${sign}${wholePart}`;
}

function formatFixedDecimal(numerator, scale) {
  if (!scale) {
    return numerator.toString();
  }

  const rawText = numerator.toString().padStart(scale + 1, '0');
  const splitIndex = rawText.length - scale;
  const wholePart = trimLeadingZeros(rawText.slice(0, splitIndex));
  const fractionPart = rawText.slice(splitIndex).padStart(scale, '0');

  return `${wholePart}.${fractionPart}`;
}

function alignScaledNumerators(leftOperand, rightOperand) {
  const scale = Math.max(leftOperand.scale, rightOperand.scale);
  return {
    scale,
    leftNumerator: leftOperand.numerator * pow10BigInt(scale - leftOperand.scale),
    rightNumerator: rightOperand.numerator * pow10BigInt(scale - rightOperand.scale)
  };
}

function compareDecimalOperands(leftOperand, rightOperand) {
  const aligned = alignScaledNumerators(leftOperand, rightOperand);
  if (aligned.leftNumerator === aligned.rightNumerator) {
    return 0;
  }

  return aligned.leftNumerator > aligned.rightNumerator ? 1 : -1;
}

function buildDecimalOperand(wholeDigits, decimalDigits) {
  const wholePart =
    wholeDigits === 1
      ? String(randomInteger(0, 10))
      : String(randomIntegerByDigits(wholeDigits));
  const fractionalCeiling = Math.pow(10, decimalDigits);
  let fractionalValue = randomInteger(0, fractionalCeiling);

  // Keep Decimal mode visually decimal instead of showing ".00" style operands.
  if (fractionalValue === 0) {
    fractionalValue = randomInteger(1, fractionalCeiling);
  }

  const fractionPart = String(fractionalValue).padStart(decimalDigits, '0');
  const numerator = BigInt(`${wholePart}${fractionPart}`);

  return {
    numerator,
    scale: decimalDigits,
    text: `${wholePart}.${fractionPart}`
  };
}

function getDecimalNumeratorRange(wholeDigits, decimalDigits) {
  return {
    minimum:
      wholeDigits === 1 ? 1n : pow10BigInt(wholeDigits - 1 + decimalDigits),
    maximum: pow10BigInt(wholeDigits + decimalDigits) - 1n
  };
}

function pickNonRoundBase(minimum, maximum) {
  if (maximum < minimum) {
    return null;
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = randomBigIntInclusive(minimum, maximum);
    if (candidate % 10n !== 0n) {
      return candidate;
    }
  }

  const forwardCandidate = minimum % 10n === 0n ? minimum + 1n : minimum;
  if (forwardCandidate <= maximum) {
    return forwardCandidate;
  }

  const backwardCandidate = maximum % 10n === 0n ? maximum - 1n : maximum;
  return backwardCandidate >= minimum ? backwardCandidate : null;
}

function pickDecimalDivisionQuotient(minimum, maximum, base, leftScale) {
  if (maximum < minimum) {
    return null;
  }

  const leftScaleFactor = pow10BigInt(leftScale);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const quotient = randomBigIntInclusive(minimum, maximum);
    if ((base * quotient) % leftScaleFactor !== 0n) {
      return quotient;
    }
  }

  for (let offset = 0n; offset < 100n && minimum + offset <= maximum; offset += 1n) {
    const quotient = minimum + offset;
    if ((base * quotient) % leftScaleFactor !== 0n) {
      return quotient;
    }
  }

  return null;
}

function getPositiveOperands(operation, leftDigits, rightDigits) {
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

function getExponentiationOperands(maxBase) {
  const candidates = buildDirectExponentiationOperandPool(maxBase);
  return candidates.length ? pickRandomItem(candidates) : [2, 2];
}

export function buildDirectExponentiationOperandPool(maxBase = MAX_BASE) {
  const candidates = [];
  const maximumBase = Math.max(2, Math.floor(maxBase));

  for (let base = 2; base <= maximumBase; base += 1) {
    for (let exponent = MIN_DIRECT_EXPONENT; exponent <= MAX_DIRECT_EXPONENT; exponent += 1) {
      candidates.push([base, exponent]);
    }
  }

  return candidates;
}

function getPositiveCorrectAnswer(operation, leftOperand, rightOperand) {
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
    case 'EXPONENTIATION':
      return left ** right;
    default:
      return 0n;
  }
}

function createPositiveProblem(settings) {
  if (settings.operation === 'EXPONENTIATION') {
    const [base, exponent] = getExponentiationOperands(settings.maxBase || 10);
    return {
      practiceMode: PRACTICE_MODES.POSITIVE,
      operation: settings.operation,
      leftOperand: base,
      rightOperand: exponent,
      correctAnswer: getPositiveCorrectAnswer(settings.operation, base, exponent)
    };
  }

  const [leftOperand, rightOperand] = getPositiveOperands(
    settings.operation,
    settings.leftDigits,
    settings.rightDigits
  );

  return {
    practiceMode: PRACTICE_MODES.POSITIVE,
    operation: settings.operation,
    leftOperand,
    rightOperand,
    correctAnswer: getPositiveCorrectAnswer(settings.operation, leftOperand, rightOperand)
  };
}

function createDecimalAdditionProblem(settings) {
  const leftOperand = buildDecimalOperand(settings.leftDigits, settings.leftDecimalDigits);
  const rightOperand = buildDecimalOperand(settings.rightDigits, settings.rightDecimalDigits);
  const aligned = alignScaledNumerators(leftOperand, rightOperand);

  return {
    practiceMode: PRACTICE_MODES.DECIMAL,
    operation: settings.operation,
    leftOperand: leftOperand.text,
    rightOperand: rightOperand.text,
    correctAnswer: formatCanonicalDecimal(
      aligned.leftNumerator + aligned.rightNumerator,
      aligned.scale
    )
  };
}

function createDecimalSubtractionProblem(settings) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const leftOperand = buildDecimalOperand(settings.leftDigits, settings.leftDecimalDigits);
    const rightOperand = buildDecimalOperand(settings.rightDigits, settings.rightDecimalDigits);

    if (compareDecimalOperands(leftOperand, rightOperand) < 0) {
      continue;
    }

    const aligned = alignScaledNumerators(leftOperand, rightOperand);
    return {
      practiceMode: PRACTICE_MODES.DECIMAL,
      operation: settings.operation,
      leftOperand: leftOperand.text,
      rightOperand: rightOperand.text,
      correctAnswer: formatCanonicalDecimal(
        aligned.leftNumerator - aligned.rightNumerator,
        aligned.scale
      )
    };
  }

  throw new Error('Unable to generate a non-negative decimal subtraction problem.');
}

function createDecimalMultiplicationProblem(settings) {
  const leftOperand = buildDecimalOperand(settings.leftDigits, settings.leftDecimalDigits);
  const rightOperand = buildDecimalOperand(settings.rightDigits, settings.rightDecimalDigits);

  return {
    practiceMode: PRACTICE_MODES.DECIMAL,
    operation: settings.operation,
    leftOperand: leftOperand.text,
    rightOperand: rightOperand.text,
    correctAnswer: formatCanonicalDecimal(
      leftOperand.numerator * rightOperand.numerator,
      leftOperand.scale + rightOperand.scale
    )
  };
}

function formatDecimalDivisionAnswer(quotient, answerShift) {
  if (answerShift >= 0) {
    return formatCanonicalDecimal(quotient * pow10BigInt(answerShift), 0);
  }

  return formatCanonicalDecimal(quotient, -answerShift);
}

function createDecimalDivisionProblem(settings) {
  const leftRange = getDecimalNumeratorRange(
    settings.leftDigits,
    settings.leftDecimalDigits
  );
  const rightRange = getDecimalNumeratorRange(
    settings.rightDigits,
    settings.rightDecimalDigits
  );

  for (
    let divisorDecimalShift = 0;
    divisorDecimalShift < settings.rightDecimalDigits;
    divisorDecimalShift += 1
  ) {
    const divisorScale = pow10BigInt(divisorDecimalShift);
    const minimumBase = divideCeil(rightRange.minimum, divisorScale);
    const maximumBase = rightRange.maximum / divisorScale < leftRange.maximum
      ? rightRange.maximum / divisorScale
      : leftRange.maximum;

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const base = pickNonRoundBase(minimumBase, maximumBase);
      if (base === null) {
        continue;
      }

      const minimumQuotient = divideCeil(leftRange.minimum, base);
      const maximumQuotient = leftRange.maximum / base;
      const quotient = pickDecimalDivisionQuotient(
        minimumQuotient < 1n ? 1n : minimumQuotient,
        maximumQuotient,
        base,
        settings.leftDecimalDigits
      );

      if (quotient === null) {
        continue;
      }

      const leftNumerator = base * quotient;
      const rightNumerator = base * divisorScale;

      return {
        practiceMode: PRACTICE_MODES.DECIMAL,
        operation: settings.operation,
        leftOperand: formatFixedDecimal(leftNumerator, settings.leftDecimalDigits),
        rightOperand: formatFixedDecimal(rightNumerator, settings.rightDecimalDigits),
        correctAnswer: formatDecimalDivisionAnswer(
          quotient,
          settings.rightDecimalDigits -
            settings.leftDecimalDigits -
            divisorDecimalShift
        )
      };
    }
  }

  throw new Error('Unable to generate a terminating decimal division problem.');
}

function createDecimalProblem(settings) {
  switch (settings.operation) {
    case 'ADDITION':
      return createDecimalAdditionProblem(settings);
    case 'SUBTRACTION':
      return createDecimalSubtractionProblem(settings);
    case 'MULTIPLICATION':
      return createDecimalMultiplicationProblem(settings);
    case 'DIVISION':
      return createDecimalDivisionProblem(settings);
    default:
      return createDecimalMultiplicationProblem({
        ...settings,
        operation: 'MULTIPLICATION'
      });
  }
}

function toProblemSettings(
  settingsOrOperation,
  leftDigits,
  rightDigits,
  maxBase,
  leftDecimalDigits,
  rightDecimalDigits
) {
  if (typeof settingsOrOperation === 'object' && settingsOrOperation !== null) {
    return sanitizeSettings(settingsOrOperation);
  }

  return sanitizeSettings({
    practiceMode: PRACTICE_MODES.POSITIVE,
    operation: settingsOrOperation,
    leftDigits,
    rightDigits,
    maxBase,
    leftDecimalDigits,
    rightDecimalDigits
  });
}

export function getPracticeModeOptions() {
  return VALID_PRACTICE_MODES.map((practiceMode) => ({
    value: practiceMode,
    ...PRACTICE_MODE_META[practiceMode]
  }));
}

export function getOperationOptions(practiceMode = PRACTICE_MODES.POSITIVE) {
  const allowedOperations =
    practiceMode === PRACTICE_MODES.DECIMAL ? DECIMAL_OPERATIONS : VALID_OPERATIONS;

  return allowedOperations.map((operation) => ({
    value: operation,
    ...OPERATION_META[operation]
  }));
}

export function operationRequiresOrderedDigits(operation) {
  return ORDERED_DIGIT_OPERATIONS.includes(operation);
}

export function formatSettingsDigitLabel(settings) {
  if (settings.practiceMode === PRACTICE_MODES.DECIMAL) {
    return `${settings.leftDigits}d/${settings.leftDecimalDigits}dp \u00D7 ${settings.rightDigits}d/${settings.rightDecimalDigits}dp`;
  }

  return `${settings.leftDigits}x${settings.rightDigits} digits`;
}

export function createProblem(
  settingsOrOperation,
  leftDigits,
  rightDigits,
  maxBase,
  leftDecimalDigits,
  rightDecimalDigits
) {
  const settings = toProblemSettings(
    settingsOrOperation,
    leftDigits,
    rightDigits,
    maxBase,
    leftDecimalDigits,
    rightDecimalDigits
  );

  if (settings.practiceMode === PRACTICE_MODES.DECIMAL) {
    return createDecimalProblem(settings);
  }

  return createPositiveProblem(settings);
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

export function parseTrainerAnswer(value, practiceMode = PRACTICE_MODES.POSITIVE) {
  const trimmedValue =
    typeof value === 'string' ? value.trim() : String(value ?? '').trim();

  if (!trimmedValue) {
    return null;
  }

  if (practiceMode !== PRACTICE_MODES.DECIMAL) {
    return parseIntegerInput(trimmedValue);
  }

  if (!/^\d+(?:[.,]\d+)?$/.test(trimmedValue)) {
    return null;
  }

  const normalizedValue = trimmedValue.replace(',', '.');
  const [wholePartText, fractionPartText = ''] = normalizedValue.split('.');
  const wholePart = trimLeadingZeros(wholePartText);
  const fractionPart = fractionPartText.replace(/0+$/, '');

  return fractionPart ? `${wholePart}.${fractionPart}` : wholePart;
}

export function sanitizeSettings(settings = {}) {
  const practiceMode = VALID_PRACTICE_MODES.includes(
    settings.practiceMode ?? settings.trainer_practice_mode
  )
    ? settings.practiceMode ?? settings.trainer_practice_mode
    : PRACTICE_MODES.POSITIVE;

  const requestedOperation = normalizeOperationValue(
    settings.operation ?? settings.trainer_operation
  );
  let operation = VALID_OPERATIONS.includes(requestedOperation)
    ? requestedOperation
    : 'MULTIPLICATION';

  if (
    practiceMode === PRACTICE_MODES.DECIMAL &&
    operation === 'EXPONENTIATION'
  ) {
    operation = 'MULTIPLICATION';
  }

  const leftDigits = clampNumber(parseNumberOrFallback(settings.leftDigits, 2), 1, MAX_DIGITS);
  let rightDigits = clampNumber(
    parseNumberOrFallback(settings.rightDigits, 2),
    1,
    MAX_DIGITS
  );

  if (operationRequiresOrderedDigits(operation)) {
    rightDigits = Math.min(rightDigits, leftDigits);
  }

  const leftDecimalDigits = clampNumber(
    parseNumberOrFallback(
      settings.leftDecimalDigits ?? settings.trainer_left_decimal_digits,
      2
    ),
    1,
    MAX_DIGITS
  );
  const rightDecimalDigits = clampNumber(
    parseNumberOrFallback(
      settings.rightDecimalDigits ?? settings.trainer_right_decimal_digits,
      2
    ),
    1,
    MAX_DIGITS
  );

  const maxBase = clampNumber(parseNumberOrFallback(settings.maxBase, 10), 2, MAX_BASE);

  return {
    practiceMode,
    operation,
    leftDigits,
    rightDigits,
    leftDecimalDigits,
    rightDecimalDigits,
    maxBase,
    roundSize: clampNumber(
      parseNumberOrFallback(settings.roundSize, 10),
      MIN_ROUND_SIZE,
      MAX_ROUND_SIZE
    )
  };
}

export function resolveRoundSizeDraft(settings, roundSizeDraft) {
  const parsedRoundSize = Number.parseInt(roundSizeDraft, 10);
  if (!Number.isInteger(parsedRoundSize)) {
    return {
      nextSettings: settings,
      nextRoundSizeDraft: String(settings.roundSize),
      didChange: false
    };
  }

  const nextSettings = sanitizeSettings({
    ...settings,
    roundSize: parsedRoundSize
  });

  return {
    nextSettings,
    nextRoundSizeDraft: String(nextSettings.roundSize),
    didChange: nextSettings.roundSize !== settings.roundSize
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
