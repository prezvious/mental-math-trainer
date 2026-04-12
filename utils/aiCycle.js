import { sanitizeSettings } from './mathEngine.js';

export const AI_AUTO_CYCLE_OPERATION_ORDER = Object.freeze([
  'ADDITION',
  'SUBTRACTION',
  'MULTIPLICATION',
  'DIVISION',
  'EXPONENTIATION'
]);

export const AI_AUTO_CYCLE_DIGIT_MAX = 8;
export const AI_AUTO_CYCLE_TRANSITION_MS = 2000;

const OPERATION_LABELS = Object.freeze({
  ADDITION: 'Addition',
  SUBTRACTION: 'Subtraction',
  MULTIPLICATION: 'Multiplication',
  DIVISION: 'Division',
  EXPONENTIATION: 'Exponentiation'
});

function buildDigitSweepBlueprints(operation, roundSize, maxBase) {
  const blueprints = [];

  for (let leftDigits = 1; leftDigits <= AI_AUTO_CYCLE_DIGIT_MAX; leftDigits += 1) {
    const rightDigitLimit =
      operation === 'SUBTRACTION' || operation === 'DIVISION'
        ? leftDigits
        : AI_AUTO_CYCLE_DIGIT_MAX;

    for (let rightDigits = 1; rightDigits <= rightDigitLimit; rightDigits += 1) {
      blueprints.push({
        operation,
        leftDigits,
        rightDigits,
        maxBase,
        roundSize
      });
    }
  }

  return blueprints;
}

function buildExponentiationBlueprints(roundSize, maxBaseCeiling) {
  const blueprints = [];

  for (let maxBase = 2; maxBase <= maxBaseCeiling; maxBase += 1) {
    blueprints.push({
      operation: 'EXPONENTIATION',
      leftDigits: 1,
      rightDigits: 1,
      maxBase,
      roundSize
    });
  }

  return blueprints;
}

export function buildAiCycleBlueprints(settings) {
  const sanitizedSettings = sanitizeSettings(settings);
  const blueprints = [];

  AI_AUTO_CYCLE_OPERATION_ORDER.forEach((operation) => {
    if (operation === 'EXPONENTIATION') {
      blueprints.push(
        ...buildExponentiationBlueprints(
          sanitizedSettings.roundSize,
          sanitizedSettings.maxBase
        )
      );
      return;
    }

    blueprints.push(
      ...buildDigitSweepBlueprints(
        operation,
        sanitizedSettings.roundSize,
        sanitizedSettings.maxBase
      )
    );
  });

  return blueprints;
}

export function formatAiCycleBlueprintLabel(settings) {
  const sanitizedSettings = sanitizeSettings(settings);

  if (sanitizedSettings.operation === 'EXPONENTIATION') {
    return `${OPERATION_LABELS.EXPONENTIATION} · Max base ${sanitizedSettings.maxBase}`;
  }

  return `${OPERATION_LABELS[sanitizedSettings.operation]} · ${sanitizedSettings.leftDigits}x${sanitizedSettings.rightDigits} digits`;
}
