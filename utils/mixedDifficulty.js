import { createProblem } from './mathEngine.js';

export const DIFFICULTY_LEVELS = {
  EXPONENTIATION: ['off', 'warmup', 'easy', 'medium', 'hard'],
  MULTIPLICATION: ['off', 'warmup', 'easy', 'medium', 'hard', 'expert'],
  ADDITION: ['off', 'warmup', 'easy', 'medium', 'hard', 'expert'],
  SUBTRACTION: ['off', 'warmup', 'easy', 'medium', 'hard', 'expert'],
  DIVISION: ['off', 'warmup', 'easy', 'medium', 'hard']
};

export const DIFFICULTY_CONFIG = {
  EXPONENTIATION: {
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
  EXPONENTIATION: { label: 'Exponentiation', symbol: '^', configLabel: 'x\u207f' },
  MULTIPLICATION: { label: 'Multiplication', symbol: '\u00d7', configLabel: '\u00d7' },
  ADDITION: { label: 'Addition', symbol: '+', configLabel: '+' },
  SUBTRACTION: { label: 'Subtraction', symbol: '\u2212', configLabel: '\u2212' },
  DIVISION: { label: 'Division', symbol: '\u00f7', configLabel: '\u00f7' }
};

export const MIXED_OPERATIONS = Object.keys(MIXED_OPERATION_META);

export const RUN_LENGTHS = [3, 7, 21, 55, 111];

export const DEFAULT_MIXED_SETTINGS = Object.freeze({
  exponentiationDifficulty: 'warmup',
  multiplicationDifficulty: 'warmup',
  additionDifficulty: 'warmup',
  subtractionDifficulty: 'warmup',
  divisionDifficulty: 'warmup',
  roundSize: 7,
  rtlInput: false,
  hideTimer: false
});

const SETTING_KEY_TO_OPERATION = {
  exponentiationDifficulty: 'EXPONENTIATION',
  multiplicationDifficulty: 'MULTIPLICATION',
  additionDifficulty: 'ADDITION',
  subtractionDifficulty: 'SUBTRACTION',
  divisionDifficulty: 'DIVISION'
};

const OPERATION_TO_SETTING_KEY = {
  EXPONENTIATION: 'exponentiationDifficulty',
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
    (operation) => getDifficultyForOperation(settings, operation) !== 'off'
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

function createExponentiationProblem(difficulty) {
  const config = DIFFICULTY_CONFIG.EXPONENTIATION[difficulty];
  const effectiveConfig = config || DIFFICULTY_CONFIG.EXPONENTIATION.warmup;
  if (!effectiveConfig) {
    throw new Error('EXPONENTIATION warmup difficulty config is missing.');
  }

  const base = randomIntegerInRange(effectiveConfig.min, effectiveConfig.max);
  const exponent = Math.random() < 0.5 ? 2 : 3;
  const digitsLeft = String(base).length;

  return {
    operation: 'EXPONENTIATION',
    leftOperand: base,
    rightOperand: exponent,
    correctAnswer: BigInt(base) ** BigInt(exponent),
    digitsLeft,
    digitsRight: 1
  };
}

export function createMixedProblem(operation, difficulty) {
  if (operation === 'EXPONENTIATION') {
    return createExponentiationProblem(difficulty);
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
