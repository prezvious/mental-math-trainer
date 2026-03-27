import { MAX_DIGITS } from 'utils/mathEngine';

export const DIGIT_OPTIONS = Array.from({ length: MAX_DIGITS }, (_value, index) => index + 1);

export function getOperandLengths() {
  return DIGIT_OPTIONS;
}
