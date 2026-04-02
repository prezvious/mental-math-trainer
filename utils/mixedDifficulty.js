import { createProblem } from './mathEngine.js';

export const DIFFICULTY_LEVELS = {
  SQUARES: ['off', 'warmup', 'easy', 'medium', 'hard'],
  MULTIPLICATION: ['off', 'warmup', 'easy', 'medium', 'hard', 'expert'],
  ADDITION: ['off', 'warmup', 'easy', 'medium', 'hard', 'expert'],
  SUBTRACTION: ['off', 'warmup', 'easy', 'medium', 'hard', 'expert'],
  DIVISION: ['off', 'warmup', 'easy', 'medium', 'hard']
};

export const DIFFICULTY_CONFIG = {
  SQUARES: {
    warmup: { min: 2, max: 15 },
    easy: { min: 2, max: 30 },
    medium: { min: 10, max: 60 },
    hard: { min: 20, max: 100 }
  },
  MULTIPLICATION: {
    warmup: { leftDigits: 1, rightDigits: 1 },
    easy: { leftDigits: 2, rightDigits: 1 },
    medium: { leftDigits: 2, rightDigits: 2 },
    hard: { leftDigits: 3, rightDigits: 2 },
    expert: { leftDigits: 3, rightDigits: 3 }
  },
  ADDITION: {
    warmup: { leftDigits: 1, rightDigits: 1 },
    easy: { leftDigits: 2, rightDigits: 2 },
    medium: { leftDigits: 3, rightDigits: 3 },
    hard: { leftDigits: 4, rightDigits: 4 },
    expert: { leftDigits: 5, rightDigits: 5 }
  },
  SUBTRACTION: {
    warmup: { leftDigits: 1, rightDigits: 1 },
    easy: { leftDigits: 2, rightDigits: 2 },
    medium: { leftDigits: 3, rightDigits: 3 },
    hard: { leftDigits: 4, rightDigits: 4 },
    expert: { leftDigits: 5, rightDigits: 5 }
  },
  DIVISION: {
    warmup: { leftDigits: 1, rightDigits: 1 },
    easy: { leftDigits: 2, rightDigits: 1 },
    medium: { leftDigits: 3, rightDigits: 1 },
    hard: { leftDigits: 3, rightDigits: 2 }
  }
};

export const MIXED_OPERATION_META = {
  SQUARES: { label: 'Squares', symbol: '²', configLabel: '( )²' },
  MULTIPLICATION: { label: 'Multiplication', symbol: '×', configLabel: '×' },
  ADDITION: { label: 'Addition', symbol: '+', configLabel: '+' },
  SUBTRACTION: { label: 'Subtraction', symbol: '−', configLabel: '−' },
  DIVISION: { label: 'Division', symbol: '÷', configLabel: '÷' }
};

export const MIXED_OPERATIONS = Object.keys(MIXED_OPERATION_META);

export const RUN_LENGTHS = [3, 7, 21, 55, 111];

export const DEFAULT_MIXED_SETTINGS = Object.freeze({
  squaresDifficulty: 'warmup',
  multiplicationDifficulty: 'warmup',
  additionDifficulty: 'warmup',
  subtractionDifficulty: 'warmup',
  divisionDifficulty: 'warmup',
  roundSize: 7,
  rtlInput: false,
  hideTimer: false
});

const SETTING_KEY_TO_OPERATION = {
  squaresDifficulty: 'SQUARES',
  multiplicationDifficulty: 'MULTIPLICATION',
  additionDifficulty: 'ADDITION',
  subtractionDifficulty: 'SUBTRACTION',
  divisionDifficulty: 'DIVISION'
};

const OPERATION_TO_SETTING_KEY = {
  SQUARES: 'squaresDifficulty',
  MULTIPLICATION: 'multiplicationDifficulty',
  ADDITION: 'additionDifficulty',
  SUBTRACTION: 'subtractionDifficulty',
  DIVISION: 'divisionDifficulty'
};

export function getDifficultyForOperation(settings, operation) {
  return settings[OPERATION_TO_SETTING_KEY[operation]] || 'off';
}

export function getEnabledOperations(settings) {
  return MIXED_OPERATIONS.filter(
    (op) => getDifficultyForOperation(settings, op) !== 'off'
  );
}

export function pickRandomOperation(enabledOperations) {
  return enabledOperations[Math.floor(Math.random() * enabledOperations.length)];
}

function randomIntegerInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function parseBooleanOrFallback(value, fallback) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  if (value === 1 || value === '1') {
    return true;
  }

  if (value === 0 || value === '0') {
    return false;
  }

  return fallback;
}

function createSquaresProblem(difficulty) {
  const config = DIFFICULTY_CONFIG.SQUARES[difficulty];
  if (!config) {
    const fallbackConfig = DIFFICULTY_CONFIG.SQUARES.warmup;
    if (!fallbackConfig) {
      throw new Error('SQUARES warmup difficulty config is missing.');
    }
    const n = randomIntegerInRange(fallbackConfig.min, fallbackConfig.max);
    const digitsLeft = String(n).length;
    return {
      operation: 'SQUARES',
      leftOperand: n,
      rightOperand: n,
      correctAnswer: BigInt(n) * BigInt(n),
      digitsLeft,
      digitsRight: digitsLeft
    };
  }

  const n = randomIntegerInRange(config.min, config.max);
  const digitsLeft = String(n).length;

  return {
    operation: 'SQUARES',
    leftOperand: n,
    rightOperand: n,
    correctAnswer: BigInt(n) * BigInt(n),
    digitsLeft,
    digitsRight: digitsLeft
  };
}

export function createMixedProblem(operation, difficulty) {
  if (operation === 'SQUARES') {
    return createSquaresProblem(difficulty);
  }

  const config = DIFFICULTY_CONFIG[operation]?.[difficulty];
  if (!config) {
    return createMixedProblem(operation, 'warmup');
  }

  const problem = createProblem(operation, config.leftDigits, config.rightDigits);
  return {
    ...problem,
    digitsLeft: config.leftDigits,
    digitsRight: config.rightDigits
  };
}

export function sanitizeMixedSettings(settings = {}) {
  const sanitized = {};

  for (const [key, operation] of Object.entries(SETTING_KEY_TO_OPERATION)) {
    const value = settings[key];
    const allowed = DIFFICULTY_LEVELS[operation];
    sanitized[key] = allowed.includes(value) ? value : DEFAULT_MIXED_SETTINGS[key];
  }

  sanitized.roundSize = RUN_LENGTHS.includes(Number(settings.roundSize))
    ? Number(settings.roundSize)
    : DEFAULT_MIXED_SETTINGS.roundSize;
  sanitized.rtlInput = parseBooleanOrFallback(
    settings.rtlInput,
    DEFAULT_MIXED_SETTINGS.rtlInput
  );
  sanitized.hideTimer = parseBooleanOrFallback(
    settings.hideTimer,
    DEFAULT_MIXED_SETTINGS.hideTimer
  );

  return sanitized;
}
