export const PASSWORD_RULES = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasDigit: /\d/,
  hasSpecial: /[!@#$%^&*()_+=\-\[\]{};:'",.<>?/\\|`~]/,
};

export const PASSWORD_STRENGTH_MESSAGES = {
  minLength: 'At least 8 characters',
  hasUppercase: 'At least one uppercase letter (A-Z)',
  hasLowercase: 'At least one lowercase letter (a-z)',
  hasDigit: 'At least one digit (0-9)',
  hasSpecial: 'At least one special character (!@#$%^&*)',
};

export function validatePassword(password) {
  if (!password) {
    return {
      isValid: false,
      errors: [],
      strength: 0,
    };
  }

  const errors = [];
  let strengthScore = 0;

  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(PASSWORD_STRENGTH_MESSAGES.minLength);
  } else {
    strengthScore += 1;
  }

  if (!PASSWORD_RULES.hasUppercase.test(password)) {
    errors.push(PASSWORD_STRENGTH_MESSAGES.hasUppercase);
  } else {
    strengthScore += 1;
  }

  if (!PASSWORD_RULES.hasLowercase.test(password)) {
    errors.push(PASSWORD_STRENGTH_MESSAGES.hasLowercase);
  } else {
    strengthScore += 1;
  }

  if (!PASSWORD_RULES.hasDigit.test(password)) {
    errors.push(PASSWORD_STRENGTH_MESSAGES.hasDigit);
  } else {
    strengthScore += 1;
  }

  if (!PASSWORD_RULES.hasSpecial.test(password)) {
    errors.push(PASSWORD_STRENGTH_MESSAGES.hasSpecial);
  } else {
    strengthScore += 1;
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: strengthScore,
  };
}

export function getPasswordStrengthColor(strength) {
  if (strength <= 1) return 'var(--danger)';
  if (strength <= 2) return 'var(--warning)';
  if (strength <= 3) return 'var(--info)';
  return 'var(--success)';
}

export function getPasswordStrengthLabel(strength) {
  if (strength <= 1) return 'Weak';
  if (strength <= 2) return 'Fair';
  if (strength <= 3) return 'Good';
  return 'Strong';
}
