import {
  buildMixedExponentiationOperandPool,
  createMixedProblem,
  DIFFICULTY_CONFIG,
  getEnabledOperations,
  getDifficultyForOperation,
  pickRandomOperation
} from './mixedDifficulty.js';

export { shouldAutoSubmitAnswer } from './trainerRound.js';

export function createMixedActiveRound(
  settings,
  firstProblem,
  questionStartedAt,
  sessionId = null
) {
  return {
    sessionId,
    settings,
    attempts: [],
    currentProblem: firstProblem,
    questionStartedAt,
    questionId: 1
  };
}

function createMixedAttempt(
  currentProblem,
  submittedAnswer,
  responseMs,
  createdAt = new Date().toISOString()
) {
  return {
    operation: currentProblem.operation,
    leftOperand: currentProblem.leftOperand,
    rightOperand: currentProblem.rightOperand,
    correctAnswer: currentProblem.correctAnswer,
    submittedAnswer,
    isCorrect: submittedAnswer === currentProblem.correctAnswer,
    responseMs,
    digitsLeft: currentProblem.digitsLeft,
    digitsRight: currentProblem.digitsRight,
    createdAt
  };
}

function getMixedProblemKey(problem) {
  return `${problem.operation}:${problem.leftOperand}:${problem.rightOperand}`;
}

function getMixedExponentiationProblemKey(base, exponent) {
  return `EXPONENTIATION:${base}:${exponent}`;
}

function buildUsedProblemKeys(activeRound, attempts = activeRound.attempts) {
  const problemKeys = new Set(attempts.map(getMixedProblemKey));
  if (activeRound.currentProblem) {
    problemKeys.add(getMixedProblemKey(activeRound.currentProblem));
  }

  return problemKeys;
}

function buildMixedExponentiationProblem(base, exponent) {
  return {
    operation: 'EXPONENTIATION',
    leftOperand: base,
    rightOperand: exponent,
    correctAnswer: BigInt(base) ** BigInt(exponent),
    digitsLeft: String(base).length,
    digitsRight: 1
  };
}

function getMixedPositiveCorrectAnswer(operation, leftOperand, rightOperand) {
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

function buildMixedPositiveProblem(
  operation,
  leftOperand,
  rightOperand,
  digitsLeft,
  digitsRight
) {
  return {
    operation,
    leftOperand,
    rightOperand,
    correctAnswer: getMixedPositiveCorrectAnswer(operation, leftOperand, rightOperand),
    digitsLeft,
    digitsRight
  };
}

function getMixedDifficultyConfig(operation, difficulty) {
  const config = DIFFICULTY_CONFIG[operation]?.[difficulty];
  if (config) {
    return config;
  }

  const fallback = DIFFICULTY_CONFIG[operation]?.warmup;
  if (!fallback) {
    throw new Error(`${operation} warmup difficulty config is missing.`);
  }

  return fallback;
}

function getPositiveDigitBounds(digits) {
  const min = digits === 1 ? 1 : Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;

  return {
    min,
    max,
    count: max - min + 1
  };
}

function getAdditionMultiplicationDigitBounds(digits) {
  if (digits === 1) {
    return { min: 2, max: 9, count: 8 };
  }

  return getPositiveDigitBounds(digits);
}

function buildRectangularMixedProblem(operation, config, rank, leftBounds, rightBounds) {
  const leftIndex = Math.floor(rank / rightBounds.count);
  const rightIndex = rank % rightBounds.count;
  const leftOperand = leftBounds.min + leftIndex;
  const rightOperand = rightBounds.min + rightIndex;

  return buildMixedPositiveProblem(
    operation,
    leftOperand,
    rightOperand,
    config.leftDigits,
    config.rightDigits
  );
}

function getDivisionDivisorEntries(config) {
  const { leftDigits, rightDigits } = config;
  const dividendMin = Math.pow(10, leftDigits - 1);
  const dividendMax = Math.pow(10, leftDigits) - 1;
  let divisorMin;
  let divisorMax;

  if (leftDigits === rightDigits) {
    if (leftDigits === 1) {
      divisorMin = 2;
      divisorMax = 4;
    } else {
      divisorMin = Math.pow(10, leftDigits - 1);
      divisorMax = Math.floor(Math.pow(10, leftDigits) / 2) - 1;
    }
  } else if (rightDigits === 1) {
    divisorMin = 2;
    divisorMax = 9;
  } else {
    divisorMin = Math.pow(10, rightDigits - 1);
    divisorMax = Math.pow(10, rightDigits) - 1;
  }

  const entries = [];

  for (let divisor = divisorMin; divisor <= divisorMax; divisor += 1) {
    const quotientMin =
      leftDigits === rightDigits ? 2 : Math.ceil(dividendMin / divisor);
    const quotientMax = Math.floor(dividendMax / divisor);

    if (quotientMax < quotientMin) {
      continue;
    }

    entries.push({
      divisor,
      quotientMin,
      count: quotientMax - quotientMin + 1
    });
  }

  return entries;
}

function getMixedOperationProblemCount(operation, difficulty) {
  const config = getMixedDifficultyConfig(operation, difficulty);

  switch (operation) {
    case 'ADDITION':
    case 'MULTIPLICATION': {
      const leftBounds = getAdditionMultiplicationDigitBounds(config.leftDigits);
      const rightBounds = getAdditionMultiplicationDigitBounds(config.rightDigits);
      return leftBounds.count * rightBounds.count;
    }
    case 'SUBTRACTION': {
      if (config.leftDigits !== config.rightDigits) {
        const leftBounds = getPositiveDigitBounds(config.leftDigits);
        const rightBounds = getPositiveDigitBounds(config.rightDigits);
        return leftBounds.count * rightBounds.count;
      }

      const rightBounds = getPositiveDigitBounds(config.rightDigits);
      const span = Math.pow(10, config.leftDigits) - 1 - rightBounds.min;
      return (span * (span + 1)) / 2;
    }
    case 'DIVISION':
      return getDivisionDivisorEntries(config).reduce(
        (total, entry) => total + entry.count,
        0
      );
    default:
      return 0;
  }
}

function buildMixedProblemByRank(operation, difficulty, rank) {
  const config = getMixedDifficultyConfig(operation, difficulty);

  switch (operation) {
    case 'ADDITION':
    case 'MULTIPLICATION': {
      const leftBounds = getAdditionMultiplicationDigitBounds(config.leftDigits);
      const rightBounds = getAdditionMultiplicationDigitBounds(config.rightDigits);
      return buildRectangularMixedProblem(operation, config, rank, leftBounds, rightBounds);
    }
    case 'SUBTRACTION': {
      if (config.leftDigits !== config.rightDigits) {
        const leftBounds = getPositiveDigitBounds(config.leftDigits);
        const rightBounds = getPositiveDigitBounds(config.rightDigits);
        return buildRectangularMixedProblem(
          operation,
          config,
          rank,
          leftBounds,
          rightBounds
        );
      }

      const rightBounds = getPositiveDigitBounds(config.rightDigits);
      const leftOffset = Math.floor((Math.sqrt(8 * rank + 1) - 1) / 2) + 1;
      const previousRowCount = ((leftOffset - 1) * leftOffset) / 2;
      const rightOffset = rank - previousRowCount;
      const leftOperand = rightBounds.min + leftOffset;
      const rightOperand = rightBounds.min + rightOffset;

      return buildMixedPositiveProblem(
        operation,
        leftOperand,
        rightOperand,
        config.leftDigits,
        config.rightDigits
      );
    }
    case 'DIVISION': {
      let remainingRank = rank;

      for (const entry of getDivisionDivisorEntries(config)) {
        if (remainingRank < entry.count) {
          const quotient = entry.quotientMin + remainingRank;
          return buildMixedPositiveProblem(
            operation,
            entry.divisor * quotient,
            entry.divisor,
            config.leftDigits,
            config.rightDigits
          );
        }

        remainingRank -= entry.count;
      }

      return null;
    }
    default:
      return null;
  }
}

function buildRandomOperationOrder(enabledOperations) {
  const remaining = [...enabledOperations];
  const ordered = [];

  while (remaining.length) {
    const operation = pickRandomOperation(remaining);
    ordered.push(operation);
    remaining.splice(remaining.indexOf(operation), 1);
  }

  return ordered;
}

function tryCreateUniqueMixedProblem(operation, difficulty, excludedProblemKeys) {
  if (operation === 'EXPONENTIATION') {
    const availableOperands = buildMixedExponentiationOperandPool(difficulty).filter(
      ([base, exponent]) =>
        !excludedProblemKeys.has(getMixedExponentiationProblemKey(base, exponent))
    );

    if (!availableOperands.length) {
      return null;
    }

    const [base, exponent] =
      availableOperands[Math.floor(Math.random() * availableOperands.length)] || [2, 2];

    return buildMixedExponentiationProblem(base, exponent);
  }

  const totalCount = getMixedOperationProblemCount(operation, difficulty);
  if (!totalCount) {
    return null;
  }

  const startRank = Math.floor(Math.random() * totalCount);
  const maxChecks = Math.min(totalCount, excludedProblemKeys.size + 1);

  for (let offset = 0; offset < maxChecks; offset += 1) {
    const rank = (startRank + offset) % totalCount;
    const candidate = buildMixedProblemByRank(operation, difficulty, rank);

    if (candidate && !excludedProblemKeys.has(getMixedProblemKey(candidate))) {
      return candidate;
    }
  }

  return null;
}

function generateNextMixedProblem(settings, excludedProblemKeys) {
  const enabled = getEnabledOperations(settings);
  const operationOrder = buildRandomOperationOrder(enabled);

  for (const operation of operationOrder) {
    const difficulty = getDifficultyForOperation(settings, operation);
    const uniqueProblem = tryCreateUniqueMixedProblem(
      operation,
      difficulty,
      excludedProblemKeys
    );

    if (uniqueProblem) {
      return uniqueProblem;
    }
  }

  const operation = pickRandomOperation(enabled);
  const difficulty = getDifficultyForOperation(settings, operation);
  return createMixedProblem(operation, difficulty);
}

function resolveMixedRoundSubmission(
  activeRound,
  submittedAnswer,
  responseMs,
  createdAt = new Date().toISOString()
) {
  const attempt = createMixedAttempt(
    activeRound.currentProblem,
    submittedAnswer,
    responseMs,
    createdAt
  );
  const attempts = [...activeRound.attempts, attempt];
  const isComplete = attempts.length >= activeRound.settings.roundSize;

  if (isComplete) {
    return { attempt, attempts, isComplete, nextActiveRound: null };
  }

  const excludedProblemKeys = buildUsedProblemKeys(activeRound, attempts);
  const nextProblem = generateNextMixedProblem(activeRound.settings, excludedProblemKeys);

  return {
    attempt,
    attempts,
    isComplete,
    nextActiveRound: {
      ...activeRound,
      attempts,
      currentProblem: nextProblem,
      questionStartedAt: null,
      questionId: activeRound.questionId + 1
    }
  };
}

export function processMixedRoundSubmission(
  activeRound,
  submittedAnswer,
  submittedAt,
  handledQuestionId
) {
  if (!activeRound) {
    return { ignored: true, handledQuestionId };
  }

  const questionId = activeRound.questionId;
  if (handledQuestionId === questionId) {
    return { ignored: true, handledQuestionId };
  }

  const responseMs = Math.max(1, submittedAt - activeRound.questionStartedAt);
  return {
    ignored: false,
    handledQuestionId: questionId,
    responseMs,
    ...resolveMixedRoundSubmission(
      activeRound,
      submittedAnswer,
      responseMs,
      new Date(submittedAt).toISOString()
    )
  };
}

export function buildMixedProgressLogRows(attempts, userId, sessionId) {
  return attempts.map((attempt, index) =>
    buildMixedProgressLogRow(attempt, userId, sessionId, index + 1)
  );
}

export function buildMixedProgressLogRow(attempt, userId, sessionId, questionIndex) {
  return {
    user_id: userId,
    session_id: sessionId,
    question_index: questionIndex,
    operation: attempt.operation,
    digits_left: attempt.digitsLeft,
    digits_right: attempt.digitsRight,
    left_operand: attempt.leftOperand,
    right_operand: attempt.rightOperand,
    correct_answer: attempt.correctAnswer.toString(),
    submitted_answer: attempt.submittedAnswer.toString(),
    is_correct: attempt.isCorrect,
    response_ms: attempt.responseMs
  };
}
