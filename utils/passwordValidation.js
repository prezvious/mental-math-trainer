const SPECIAL_CHARACTER_REGEX = /[^A-Za-z0-9]/;

export function checkUppercase(password) {
  return /[A-Z]/.test(password);
}

export function checkLowercase(password) {
  return /[a-z]/.test(password);
}

export function checkNumber(password) {
  return /\d/.test(password);
}

export function checkSpecialCharacter(password) {
  return SPECIAL_CHARACTER_REGEX.test(password);
}

export function checkMinLength(password, minLength = 8) {
  return password.length >= minLength;
}

export function validatePassword(password) {
  return {
    uppercase: checkUppercase(password),
    lowercase: checkLowercase(password),
    number: checkNumber(password),
    special: checkSpecialCharacter(password),
    minLength: checkMinLength(password, 8)
  };
}

export function calculateStrength(validationResult) {
  const checks = Object.values(validationResult);
  const passedCount = checks.filter(Boolean).length;

  let label = 'Very weak';
  if (passedCount === 2) {
    label = 'Weak';
  } else if (passedCount === 3) {
    label = 'Medium';
  } else if (passedCount === 4) {
    label = 'Strong';
  } else if (passedCount === 5) {
    label = 'Very strong';
  }

  return {
    score: passedCount,
    maxScore: checks.length,
    label
  };
}

export function isPasswordValid(validationResult) {
  return Object.values(validationResult).every(Boolean);
}
