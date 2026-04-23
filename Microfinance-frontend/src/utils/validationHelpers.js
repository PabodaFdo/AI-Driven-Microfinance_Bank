/**
 * Validation helper functions for staff management and profile
 */

// Regex patterns
const PATTERNS = {
  fullName: /^[a-zA-Z\s'-]+$/,
  username: /^[a-zA-Z0-9_]+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\d{10}$/,  // Updated: exactly 10 digits
};

const CONSTRAINTS = {
  fullName: { min: 3, max: 100 },
  username: { min: 4, max: 50 },
  email: { max: 150 },
  password: { min: 6, max: 100 },
  branch: { min: 2, max: 100 },
  address: { max: 500 },
  phone: { digits: 10 },  // Updated: exactly 10 digits
  deactivationReason: { max: 500 },
};

const VALID_BRANCHES = [
  'Colombo', 'Kandy', 'Galle', 'Matara', 'Jaffna', 'Kurunegala', 'Anuradhapura'
];

const VALID_ROLES = ['admin', 'manager', 'officer'];

export const validateFullName = (value) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'Full name is required';
  if (trimmed.length < CONSTRAINTS.fullName.min) {
    return `Full name must be at least ${CONSTRAINTS.fullName.min} characters`;
  }
  if (trimmed.length > CONSTRAINTS.fullName.max) {
    return `Full name must not exceed ${CONSTRAINTS.fullName.max} characters`;
  }
  if (!PATTERNS.fullName.test(trimmed)) {
    return 'Full name can only contain letters, spaces, hyphens, and apostrophes';
  }
  return '';
};

export const validateUsername = (value) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'Username is required';
  if (trimmed.length < CONSTRAINTS.username.min) {
    return `Username must be at least ${CONSTRAINTS.username.min} characters`;
  }
  if (trimmed.length > CONSTRAINTS.username.max) {
    return `Username must not exceed ${CONSTRAINTS.username.max} characters`;
  }
  if (!PATTERNS.username.test(trimmed)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  return '';
};

export const validateEmail = (value) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'Email is required';
  if (trimmed.length > CONSTRAINTS.email.max) {
    return `Email must not exceed ${CONSTRAINTS.email.max} characters`;
  }
  if (!PATTERNS.email.test(trimmed)) {
    return 'Email must be valid (e.g., user@example.com)';
  }
  return '';
};

export const validatePassword = (value) => {
  if (!value) return 'Password is required';
  if (value.length < CONSTRAINTS.password.min) {
    return `Password must be at least ${CONSTRAINTS.password.min} characters`;
  }
  if (value.length > CONSTRAINTS.password.max) {
    return `Password must not exceed ${CONSTRAINTS.password.max} characters`;
  }
  if (!/[a-zA-Z]/.test(value)) {
    return 'Password must contain at least one letter';
  }
  if (!/\d/.test(value)) {
    return 'Password must contain at least one digit';
  }
  return '';
};

export const validatePasswordMatch = (newPassword, confirmPassword) => {
  if (newPassword !== confirmPassword) {
    return 'Passwords do not match';
  }
  return '';
};

export const validateNewPasswordDifferent = (newPassword, currentPassword) => {
  if (newPassword === currentPassword) {
    return 'New password must be different from current password';
  }
  return '';
};

export const validateBranch = (value) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'Branch is required';
  if (!VALID_BRANCHES.includes(trimmed)) {
    return `Invalid branch. Allowed: ${VALID_BRANCHES.join(', ')}`;
  }
  return '';
};

export const validateRole = (value) => {
  const raw = (value || '').trim();
  if (!raw) return 'Role is required';

  const normalized = raw.toLowerCase();

  const valid = [
    'admin',
    'manager',
    'officer',
    'bank_manager',
    'loan_officer',
  ];

  if (!valid.includes(normalized)) {
    return 'Invalid role. Allowed: admin, manager, officer';
  }

  return '';
};

export const validatePhone = (value) => {
  if (!value) return '';
  const trimmed = value.trim();
  // Remove all non-digit characters for validation
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (digitsOnly.length !== CONSTRAINTS.phone.digits) {
    return `Phone number must contain exactly ${CONSTRAINTS.phone.digits} digits`;
  }

  // Reject phone numbers with all same repeated digits (e.g., 0000000000, 1111111111, etc.)
  if (/^(\d)\1{9}$/.test(digitsOnly)) {
    return 'Phone number cannot contain the same digit repeatedly';
  }

  return '';
};

/**
 * Sanitize phone input - keep only digits, max 10
 */
export const sanitizePhoneInput = (value) => {
  // Remove all non-digit characters
  let sanitized = (value || '').replace(/\D/g, '');
  // Limit to 10 digits
  if (sanitized.length > CONSTRAINTS.phone.digits) {
    sanitized = sanitized.substring(0, CONSTRAINTS.phone.digits);
  }
  return sanitized;
};

/**
 * Block invalid keys for phone input
 */
export const blockInvalidPhoneKeys = (e) => {
  // Block: e, E, +, -, ., space, and any non-numeric character
  const invalidKeys = ['e', 'E', '+', '-', '.', ' ', 'ArrowUp', 'ArrowDown'];

  if (invalidKeys.includes(e.key)) {
    e.preventDefault();
    return;
  }

  // Also block if it's not a digit and not a control key
  if (!/^\d$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
    e.preventDefault();
  }
};

export const validateAddress = (value) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.length > CONSTRAINTS.address.max) {
    return `Address must not exceed ${CONSTRAINTS.address.max} characters`;
  }
  return '';
};

export const validateDeactivationReason = (value) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'Deactivation reason is required';
  if (trimmed.length > CONSTRAINTS.deactivationReason.max) {
    return `Reason must not exceed ${CONSTRAINTS.deactivationReason.max} characters`;
  }
  return '';
};

export const validateCurrentPassword = (value) => {
  if (!value) return 'Current password is required';
  return '';
};

export const getPasswordStrength = (password) => {
  if (!password) return { level: 'empty', label: 'No password', color: '#999' };
  if (password.length < 6) return { level: 'weak', label: 'Too short', color: '#ef4444' };
  if (password.length >= 10 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password)) {
    return { level: 'strong', label: 'Strong', color: '#16a34a' };
  }
  return { level: 'moderate', label: 'Moderate', color: '#f59e0b' };
};

/**
 * Display helper functions for application fields in amount-only mode
 */

/**
 * Safely display term months - shows fallback if null
 * Used for: Applications, Risk Assessments, Recommendations
 */
export const displayTermMonths = (value) => {
  return value ? `${value} months` : 'To be recommended';
};

/**
 * Safely display interest rate - shows fallback if null
 * Used for: Applications, Risk Assessments, Recommendations
 */
export const displayInterestRate = (value) => {
  return value ? `${value}%` : 'To be recommended';
};

/**
 * Safely display purpose - shows fallback if null
 * Used for: Applications, Risk Assessments, Recommendations
 */
export const displayPurpose = (value) => {
  return value || 'Not provided';
};

/**
 * Safely display co-signer status - shows fallback if null
 * Used for: Applications, Risk Assessments, Recommendations
 */
export const displayCoSigner = (value) => {
  if (value === null || value === undefined) {
    return 'Not specified';
  }
  return value ? 'Yes' : 'No';
};

/**
 * Determine if application is in amount-only mode
 * Amount-only: has amount but no custom proposal fields
 */
export const isAmountOnlyMode = (application) => {
  return !application.termMonths &&
         !application.interestRate &&
         (!application.purpose || application.purpose.trim() === '');
};

/**
 * Determine if application has a custom proposal
 * Custom: at least one proposal field is provided
 */
export const hasCustomProposal = (application) => {
  return application.termMonths ||
         application.interestRate ||
         (application.purpose && application.purpose.trim() !== '');
};

export const VALID_BRANCHES_LIST = VALID_BRANCHES;