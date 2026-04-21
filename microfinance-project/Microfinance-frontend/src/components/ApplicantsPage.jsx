import { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import GradientSummaryCard from './shared/GradientSummaryCard';
import { PageHeader } from './PageHeader';
import { sanitizePhoneInput, blockInvalidPhoneKeys } from '../utils/validationHelpers';

// ═══════════════════════════════════════════════════════════
// DESIGN TOKENS - THEME AWARE
// ═══════════════════════════════════════════════════════════
const C = {
  primary: "var(--primary)",
  primaryDk: "var(--primary-hover)",
  primaryLt: "var(--primary-light)",
  primarySoft: "var(--primary-soft)",
  primaryMid: "var(--primary-subtle)",
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
  danger: "var(--danger)",
  dangerSoft: "var(--danger-soft)",
  warn: "var(--warning)",
  warnSoft: "var(--warning-soft)",
  success: "var(--success)",
  successSoft: "var(--success-soft)",
  purple: "#7C3AED",
  purpleSoft: "#EDE9FE",
  ink: "var(--text)",
  inkMid: "var(--text-muted)",
  inkLight: "var(--text-light)",
  border: "var(--border)",
  borderMid: "var(--border-strong)",
  surface: "var(--surface)",
  surfaceAlt: "var(--surface-2)",
  surfaceDeep: "var(--surface-3)",
};

const BRANCHES = ["Colombo", "Kandy", "Galle", "Matara", "Jaffna", "Kurunegala", "Anuradhapura"];
const JOB_TYPES = ["Government", "Private", "Business", "Freelancer", "Driver", "Farmer", "Labor", "Other"];
// Updated to match AI dataset exactly (case-sensitive)
const EMPLOYMENT_STATUSES = ["Full-time", "Part-time", "Self-employed", "Unemployed"];
// Updated to match AI dataset - HasMortgage field
const HAS_MORTGAGE_OPTIONS = ["Yes", "No"];
const MARITAL_STATUSES = ["Single", "Married", "Divorced"];
const DEPENDENTS_OPTIONS = ["No", "Yes"];
// Education options for AI model
const EDUCATION_OPTIONS = ["High School", "Bachelor's", "Master's", "PhD"];

// ═══════════════════════════════════════════════════════════
// NUMERIC INPUT HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Sanitize integer input - allows only digits, no negative values
 */
function sanitizeIntegerInput(value) {
  if (!value) return '';
  // Keep only digits
  let sanitized = value.replace(/[^\d]/g, '');
  return sanitized;
}

/**
 * Sanitize decimal input - allows digits and single decimal point, no negative values
 */
function sanitizeDecimalInput(value) {
  if (!value) return '';
  // Remove everything except digits and decimal point
  let sanitized = value.replace(/[^\d.]/g, '');
  // Prevent multiple decimal points - keep only the first one
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('');
  }
  return sanitized;
}

/**
 * Validate that integer is non-negative
 */
function isValidInteger(value) {
  if (!value && value !== '0') return true; // Allow empty while typing
  const num = parseInt(value, 10);
  return !isNaN(num) && num >= 0 && value === sanitizeIntegerInput(value);
}

/**
 * Validate that decimal is non-negative and properly formatted
 */
function isValidDecimal(value) {
  if (!value && value !== '0') return true; // Allow empty while typing
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0 && value === sanitizeDecimalInput(value);
}

/**
 * Validate address field:
 * - Optional if empty
 * - If provided, must not contain meaningless repeated characters
 * - Must contain meaningful structure
 */
function isValidAddress(address) {
  // Address is optional - empty is allowed
  if (!address || !address.trim()) {
    return true;
  }

  const trimmed = address.trim();

  // Must be at least 3 characters after trim
  if (trimmed.length < 3) {
    return false;
  }

  // Check if one character dominates (>60% of text)
  const charFreq = {};
  for (const char of trimmed) {
    charFreq[char] = (charFreq[char] || 0) + 1;
  }
  const maxFreq = Math.max(...Object.values(charFreq));
  if ((maxFreq / trimmed.length) > 0.6) {
    return false; // Same character repeated too much
  }

  // Check for repeated patterns (e.g., "abcabcabc", "121212")
  for (let patternLen = 1; patternLen <= Math.min(4, Math.floor(trimmed.length / 3)); patternLen++) {
    const pattern = trimmed.substring(0, patternLen);
    const matches = (trimmed.match(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (matches > 3 && (matches * patternLen) > (trimmed.length * 0.6)) {
      return false; // Obvious repeated pattern
    }
  }

  // Must contain letters and/or numbers (not just symbols/spaces)
  if (!/[a-zA-Z0-9]/.test(trimmed)) {
    return false;
  }

  // Reject letters-only short addresses without variety
  const hasLetters = /[a-zA-Z]/.test(trimmed);
  const hasNumbers = /[0-9]/.test(trimmed);
  const hasSpaces = trimmed.includes(' ');

  if (hasLetters && !hasNumbers && !hasSpaces && trimmed.length < 10) {
    return false; // Too simple, need more detail
  }

  return true;
}

/**
 * Get detailed error message for invalid address
 */
function getAddressError(address) {
  const trimmed = address?.trim() || '';

  if (!trimmed) {
    return null; // Optional field, empty is OK
  }

  if (trimmed.length < 3) {
    return 'Address must be at least 3 characters';
  }

  if (trimmed.length > 255) {
    return 'Address cannot exceed 255 characters';
  }

  // Check character repetition
  const charFreq = {};
  for (const char of trimmed) {
    charFreq[char] = (charFreq[char] || 0) + 1;
  }
  const maxFreq = Math.max(...Object.values(charFreq));
  if ((maxFreq / trimmed.length) > 0.6) {
    return 'Address cannot contain repeated meaningless characters';
  }

  // Check for patterns
  for (let patternLen = 1; patternLen <= Math.min(4, Math.floor(trimmed.length / 3)); patternLen++) {
    const pattern = trimmed.substring(0, patternLen);
    const matches = (trimmed.match(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (matches > 3 && (matches * patternLen) > (trimmed.length * 0.6)) {
      return 'Address cannot contain repeated patterns';
    }
  }

  if (!/[a-zA-Z0-9]/.test(trimmed)) {
    return 'Address must contain letters or numbers';
  }

  const hasLetters = /[a-zA-Z]/.test(trimmed);
  const hasNumbers = /[0-9]/.test(trimmed);
  const hasSpaces = trimmed.includes(' ');

  if (hasLetters && !hasNumbers && !hasSpaces && trimmed.length < 10) {
    return 'Address must contain more detail (include house number, street, or area)';
  }

  return null;
}

/**
 * Validate monthly income:
 * - Must be positive (> 0)
 * - Cannot exceed realistic max of 10,000,000
 */
function isValidMonthlyIncome(income) {
  if (!income || income === '') return true; // Allow empty while typing

  const num = parseFloat(income);

  // Must be positive
  if (isNaN(num) || num <= 0) {
    return false;
  }

  // Must not exceed max
  if (num > 10000000) {
    return false;
  }

  return true;
}

/**
 * Get detailed error message for invalid monthly income
 */
function getMonthlyIncomeError(income) {
  if (!income || income === '') {
    return null; // Will be caught by required validation
  }

  const num = parseFloat(income);

  if (isNaN(num)) {
    return 'Please enter a valid monthly income';
  }

  if (num <= 0) {
    return 'Monthly income must be greater than 0';
  }

  if (num > 10000000) {
    return 'Monthly income exceeds the allowed range';
  }

  return null;
}

/**
 * Helper: Check if value has repeated digits (e.g., 1111, 88888, 999999)
 */
function isRepeatedDigitNumber(value) {
  if (value === null || value === undefined || value === '') return false;
  const str = String(value).trim();
  if (!str) return false;
  const digitsOnly = str.replace(/\D/g, '');
  if (!digitsOnly) return false;
  // Detect if same digit repeats 5+ times (e.g., 11111, 888888)
  return /^(\d)\1{4,}$/.test(digitsOnly);
}

/**
 * Validate employment length (months):
 * - Must be non-negative integer
 * - Cannot be repeated digits
 * - Cannot exceed 600 months (50 years)
 */
function isValidEmploymentLength(value) {
  if (!value && value !== 0) return true; // Optional field
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 0) return false;
  if (num > 600) return false; // 50 years max
  if (isRepeatedDigitNumber(num.toString())) return false;
  return true;
}

/**
 * Get detailed error message for invalid employment length
 */
function getEmploymentLengthError(value) {
  if (!value && value !== 0) return null; // Optional
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    return 'Please enter a valid employment length.';
  }
  if (num < 0) {
    return 'Employment length cannot be negative.';
  }
  if (num > 600) {
    return 'Employment length cannot exceed 600 months (50 years).';
  }
  if (isRepeatedDigitNumber(num.toString())) {
    return 'Employment length cannot be an unrealistic repeated number.';
  }
  return null;
}

/**
 * Validate monthly debt payment:
 * - Must be non-negative number
 * - Cannot be repeated digits
 * - Cannot exceed 10,000,000 LKR
 */
function isValidMonthlyDebtPayment(value) {
  if (!value && value !== 0) return true; // Optional field
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return false;
  if (num > 10000000) return false;
  if (isRepeatedDigitNumber(Math.floor(num).toString())) return false;
  return true;
}

/**
 * Get detailed error message for invalid monthly debt payment
 */
function getMonthlyDebtPaymentError(value) {
  if (!value && value !== 0) return null; // Optional
  const num = parseFloat(value);
  if (isNaN(num)) {
    return 'Please enter a valid monthly debt payment.';
  }
  if (num < 0) {
    return 'Monthly debt payment cannot be negative.';
  }
  if (num > 10000000) {
    return 'Monthly debt payment cannot exceed 10,000,000 LKR.';
  }
  if (isRepeatedDigitNumber(Math.floor(num).toString())) {
    return 'Monthly debt payment cannot be an unrealistic repeated number.';
  }
  return null;
}

/**
 * Validate housing cost:
 * - Must be non-negative number
 * - Cannot be repeated digits
 * - Cannot exceed 5,000,000 LKR
 */
function isValidHousingCost(value) {
  if (!value && value !== 0) return true; // Optional field
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return false;
  if (num > 5000000) return false;
  if (isRepeatedDigitNumber(Math.floor(num).toString())) return false;
  return true;
}

/**
 * Get detailed error message for invalid housing cost
 */
function getHousingCostError(value) {
  if (!value && value !== 0) return null; // Optional
  const num = parseFloat(value);
  if (isNaN(num)) {
    return 'Please enter a valid housing cost.';
  }
  if (num < 0) {
    return 'Housing cost cannot be negative.';
  }
  if (num > 5000000) {
    return 'Housing cost cannot exceed 5,000,000 LKR.';
  }
  if (isRepeatedDigitNumber(Math.floor(num).toString())) {
    return 'Housing cost cannot be an unrealistic repeated number.';
  }
  return null;
}

/**
 * Validate existing loans count:
 * - Must be non-negative integer
 * - Cannot be repeated digits
 * - Cannot exceed 50 loans
 */
function isValidExistingLoans(value) {
  if (!value && value !== 0) return true; // Optional field
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 0) return false;
  if (num > 50) return false;
  if (isRepeatedDigitNumber(num.toString())) return false;
  return true;
}

/**
 * Get detailed error message for invalid existing loans
 */
function getExistingLoansError(value) {
  // Existing loans is required
  if (!value && value !== 0) {
    return 'Existing Loans is required';
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    return 'Existing Loans must be a whole number';
  }
  if (num < 0) {
    return 'Existing Loans cannot be negative';
  }
  if (num > 50) {
    return 'Existing loans cannot exceed 50';
  }
  if (isRepeatedDigitNumber(num.toString())) {
    return 'Existing loans count cannot be an unrealistic repeated number';
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// SHARED COMPONENTS (Using GradientSummaryCard)
// ═══════════════════════════════════════════════════════════



function Toast({ message, type = "info", onClose }) {
  const bgColor = type === "error" ? C.dangerSoft : type === "success" ? C.successSoft : C.primarySoft;
  const textColor = type === "error" ? C.danger : type === "success" ? C.success : C.primary;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        background: bgColor,
        color: textColor,
        padding: "12px 20px",
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 9999,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: textColor,
          cursor: "pointer",
          fontSize: 18,
          fontWeight: "bold",
        }}
      >
        ×
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VIEW APPLICANT MODAL
// ═══════════════════════════════════════════════════════════

function ViewApplicantModal({ isOpen, onClose, applicant }) {
  if (!isOpen || !applicant) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRiskColor = (riskLevel) => {
    if (riskLevel === "Low") return C.success;
    if (riskLevel === "Medium") return C.warn;
    return C.danger;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: C.surface,
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 800,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: C.ink }}>
            Applicant Details
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: C.inkMid,
              padding: 8,
              borderRadius: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Credit Score Badge */}
        <div style={{
          background: C.primarySoft,
          border: `1px solid ${C.primaryMid}`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, color: C.inkMid, marginBottom: 4 }}>Credit Score</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.primary }}>{applicant.creditScore}</div>
        </div>

        {/* Personal Information */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 16 }}>
            Personal Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <InfoField label="Full Name" value={applicant.fullName} />
            <InfoField label="NIC" value={applicant.nic} />
            <InfoField label="Phone" value={applicant.phone} />
            <InfoField label="Email" value={applicant.email} />
            <InfoField label="Address" value={applicant.address || 'N/A'} span2 />
            <InfoField label="Branch" value={applicant.branch} />
            <InfoField label="Marital Status" value={applicant.maritalStatus} />
          </div>
        </div>

        {/* Employment & Financial */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 16 }}>
            Employment & Financial Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <InfoField label="Job Type" value={applicant.jobType} />
            <InfoField label="Employment Status" value={applicant.employmentStatus} />
            <InfoField label="Monthly Income" value={formatCurrency(applicant.monthlyIncome)} />
            <InfoField label="Employment Length" value={`${applicant.employmentLengthMonths || 0} months`} />
            <InfoField label="Monthly Debt Payment" value={formatCurrency(applicant.monthlyDebtPayment)} />
            <InfoField label="Housing Cost" value={formatCurrency(applicant.housingCost)} />
          </div>
        </div>

        {/* Additional Details */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 16 }}>
            Additional Details
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <InfoField label="Has Mortgage" value={applicant.hasMortgage} />
            <InfoField label="Existing Loans" value={applicant.existingLoans || 0} />
            <InfoField label="Dependents" value={(applicant.dependents && applicant.dependents > 0) ? "Yes" : "No"} />
            <InfoField label="Education" value={applicant.education || 'N/A'} />
          </div>
        </div>

        {/* Timestamps */}
        <div style={{
          background: C.surfaceAlt,
          borderRadius: 8,
          padding: 16,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}>
          <InfoField label="Created At" value={formatDate(applicant.createdAt)} small />
          <InfoField label="Updated At" value={formatDate(applicant.updatedAt)} small />
        </div>

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              background: C.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, valueColor, span2, small }) {
  return (
    <div style={{ gridColumn: span2 ? '1 / -1' : 'auto' }}>
      <div style={{ fontSize: small ? 11 : 12, color: C.inkMid, marginBottom: 4, fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ fontSize: small ? 12 : 14, color: valueColor || C.ink, fontWeight: 500 }}>
        {value}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EDIT APPLICANT MODAL - FIXED VERSION
// ═══════════════════════════════════════════════════════════

function EditApplicantModal({ isOpen, onClose, applicant, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formData, setFormData] = useState({
    fullName: "",
    nic: "",
    phone: "",
    email: "",
    address: "",
    branch: "",
    jobType: "",
    monthlyIncome: "",
    existingLoans: "",
    dependents: "0",
    employmentStatus: "",
    employmentLengthMonths: "0",
    monthlyDebtPayment: "0",
    housingCost: "0",
    hasMortgage: "",
    maritalStatus: "",
    education: "",
  });
  const [customJobType, setCustomJobType] = useState("");

  useEffect(() => {
    if (isOpen && applicant && applicant.id) {
      console.log('Loading applicant data for edit:', applicant);

      const newFormData = {
        fullName: applicant.fullName || "",
        nic: applicant.nic || "",
        phone: applicant.phone || "",
        email: applicant.email || "",
        address: applicant.address || "",
        branch: applicant.branch || "",
        jobType: applicant.jobType || "",
        monthlyIncome: applicant.monthlyIncome?.toString() || "",
        existingLoans: applicant.existingLoans?.toString() || "",
        dependents: (applicant.dependents && applicant.dependents > 0) ? "Yes" : "No",
        employmentStatus: applicant.employmentStatus || "",
        employmentLengthMonths: applicant.employmentLengthMonths?.toString() || "0",
        monthlyDebtPayment: applicant.monthlyDebtPayment?.toString() || "0",
        housingCost: applicant.housingCost?.toString() || "0",
        hasMortgage: applicant.hasMortgage || "",
        maritalStatus: applicant.maritalStatus || "",
        education: applicant.education || "",
      };

      // Handle custom job types
      if (applicant.jobType && !JOB_TYPES.includes(applicant.jobType)) {
        // If the job type is not in the predefined list, treat it as custom
        newFormData.jobType = "Other";
        setCustomJobType(applicant.jobType);
      } else {
        setCustomJobType("");
      }

      console.log('Setting form data to:', newFormData);
      setFormData(newFormData);
      setError('');
      setTouched({});
    } else if (!isOpen) {
      // Reset form when modal is closed to prevent stale data
      console.log('Resetting form data on modal close');
      setFormData({
        fullName: "",
        nic: "",
        phone: "",
        email: "",
        address: "",
        branch: "",
        jobType: "",
        monthlyIncome: "",
        existingLoans: "",
        dependents: "No",
        employmentStatus: "",
        employmentLengthMonths: "0",
        monthlyDebtPayment: "0",
        housingCost: "0",
        hasMortgage: "",
        maritalStatus: "",
        education: "",
      });
      setCustomJobType("");
      setError('');
      setTouched({});
    }
  }, [isOpen, applicant]);

  // ── Client-side validation function ──────────────────────────────────────
  const validateApplicantForm = (formData, customJobType) => {
    const errors = {};

    // Full name validation
    if (!formData.fullName?.trim()) {
      errors.fullName = 'Full Name is required';
    } else if (formData.fullName.trim().length < 3 || formData.fullName.trim().length > 100) {
      errors.fullName = 'Full name must be between 3 and 100 characters';
    } else if (!/^[a-zA-Z\s.'\-]+$/.test(formData.fullName.trim())) {
      errors.fullName = 'Full name can only contain letters, spaces, dots, apostrophes, and hyphens';
    }

    // NIC validation
    if (!formData.nic?.trim()) {
      errors.nic = 'NIC is required';
    } else {
      const nicValue = formData.nic.trim();
      // Sri Lankan NIC format: 9 digits + V or 12 digits (no X format)
      if (!/^(\d{9}V|\d{12})$/.test(nicValue)) {
        errors.nic = 'NIC must be either 9 digits followed by V or 12 digits';
      }
    }

    // Phone validation
    if (!formData.phone?.trim()) {
      errors.phone = 'Phone is required';
    } else {
      const digitsOnly = formData.phone.trim().replace(/\D/g, '');
      if (digitsOnly.length !== 10) {
        errors.phone = 'Phone number must contain exactly 10 digits';
      } else if (/^(\d)\1{9}$/.test(digitsOnly)) {
        errors.phone = 'Phone number cannot contain the same digit repeatedly';
      }
    }

    // Email validation
    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Valid email is required';
    }

    // Address validation (OPTIONAL - but if provided, must be valid)
    if (formData.address?.trim()) {
      const trimmedAddress = formData.address.trim();
      const addressError = getAddressError(trimmedAddress);
      if (addressError) {
        errors.address = addressError;
      }
    }

    // Branch validation
    if (!formData.branch?.trim()) {
      errors.branch = 'Branch is required';
    }

    // Job type validation
    if (!formData.jobType?.trim()) {
      errors.jobType = 'Job type is required';
    } else if (formData.jobType === "Other" && !customJobType?.trim()) {
      errors.jobType = 'Custom job type is required when "Other" is selected';
    }

    // Dependents validation
    if (!formData.dependents?.trim()) {
      errors.dependents = 'Dependents is required';
    }

    // Monthly income validation
    if (!formData.monthlyIncome || formData.monthlyIncome === '') {
      errors.monthlyIncome = 'Monthly income is required';
    } else {
      const income = parseFloat(formData.monthlyIncome);
      if (isNaN(income) || income < 0) {
        errors.monthlyIncome = 'Monthly income must be a positive number';
      }
    }

    // Employment status validation
    if (!formData.employmentStatus?.trim()) {
      errors.employmentStatus = 'Employment status is required';
    } else if (!['Full-time', 'Part-time', 'Self-employed', 'Unemployed'].includes(formData.employmentStatus)) {
      errors.employmentStatus = 'Employment status must be one of: Full-time, Part-time, Self-employed, Unemployed';
    }

    // Has mortgage validation
    if (!formData.hasMortgage?.trim()) {
      errors.hasMortgage = 'Has mortgage is required';
    } else if (!['Yes', 'No'].includes(formData.hasMortgage)) {
      errors.hasMortgage = 'Has mortgage must be either "Yes" or "No"';
    }

    // Marital status validation
    if (formData.maritalStatus && !['Single', 'Married', 'Divorced'].includes(formData.maritalStatus)) {
      errors.maritalStatus = 'Marital status must be one of: Single, Married, Divorced';
    }

    // Education validation
    if (formData.education && !["High School", "Bachelor's", "Master's", "PhD"].includes(formData.education)) {
      errors.education = 'Education must be one of: High School, Bachelor\'s, Master\'s, PhD';
    }

    // Business rule validations
    const income = parseFloat(formData.monthlyIncome) || 0;
    const debtPayment = parseFloat(formData.monthlyDebtPayment) || 0;
    const housingCost = parseFloat(formData.housingCost) || 0;

    if (income > 0 && debtPayment > income) {
      errors.monthlyDebtPayment = 'Monthly debt payment cannot be greater than monthly income';
    }

    if (income > 0 && housingCost > income) {
      errors.housingCost = 'Housing cost cannot be greater than monthly income';
    }

    // Validate employment length for unrealistic values
    const employmentLengthError = getEmploymentLengthError(formData.employmentLengthMonths);
    if (employmentLengthError) {
      errors.employmentLengthMonths = employmentLengthError;
    }

    // Validate monthly debt payment for unrealistic values
    const debtPaymentError = getMonthlyDebtPaymentError(formData.monthlyDebtPayment);
    if (debtPaymentError) {
      errors.monthlyDebtPayment = debtPaymentError;
    }

    // Validate housing cost for unrealistic values
    const housingCostError = getHousingCostError(formData.housingCost);
    if (housingCostError) {
      errors.housingCost = housingCostError;
    }

    // Validate existing loans for unrealistic values
    const existingLoansError = getExistingLoansError(formData.existingLoans);
    if (existingLoansError) {
      errors.existingLoans = existingLoansError;
    }

    return errors;
  };

  // ── Field-level validation for live feedback ──────────────────────────────────────
  const validateField = (fieldName, value, currentFormData = formData, currentCustomJobType = customJobType) => {
    const errors = {};
    const trimmedValue = typeof value === 'string' ? value.trim() : value;

    switch (fieldName) {
      case 'fullName':
        if (!trimmedValue) {
          errors.fullName = 'Full Name is required';
        } else if (trimmedValue.length < 3 || trimmedValue.length > 100) {
          errors.fullName = 'Full name must be between 3 and 100 characters';
        } else if (!/^[a-zA-Z\s.'\-]+$/.test(trimmedValue)) {
          errors.fullName = 'Full name can only contain letters, spaces, dots, apostrophes, and hyphens';
        }
        break;

      case 'phone':
        if (!trimmedValue) {
          errors.phone = 'Phone is required';
        } else if (!/^0\d{9}$/.test(trimmedValue)) {
          errors.phone = 'Phone must be exactly 10 digits starting with 0';
        }
        break;

      case 'email':
        if (!trimmedValue) {
          errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
          errors.email = 'Valid email is required';
        }
        break;

      case 'address':
        // Address is optional, but if provided must be valid
        if (value?.trim()) {
          const addressError = getAddressError(value.trim());
          if (addressError) {
            errors.address = addressError;
          }
        }
        break;

      case 'branch':
        if (!trimmedValue) {
          errors.branch = 'Branch is required';
        }
        break;

      case 'jobType':
        if (!trimmedValue) {
          errors.jobType = 'Job type is required';
        } else if (trimmedValue === "Other" && !currentCustomJobType?.trim()) {
          errors.jobType = 'Custom job type is required when "Other" is selected';
        }
        break;

      case 'customJobType':
        if (currentFormData.jobType === "Other" && !trimmedValue) {
          errors.customJobType = 'Custom job type is required when "Other" is selected';
        }
        break;

      case 'monthlyIncome':
        if (!value && value !== 0) {
          errors.monthlyIncome = 'Monthly income is required';
        } else {
          const incomeError = getMonthlyIncomeError(value);
          if (incomeError) {
            errors.monthlyIncome = incomeError;
          }
        }
        break;

      case 'employmentStatus':
        if (!trimmedValue) {
          errors.employmentStatus = 'Employment status is required';
        } else if (!['Full-time', 'Part-time', 'Self-employed', 'Unemployed'].includes(trimmedValue)) {
          errors.employmentStatus = 'Employment status must be one of: Full-time, Part-time, Self-employed, Unemployed';
        }
        break;

      case 'hasMortgage':
        if (!trimmedValue) {
          errors.hasMortgage = 'Has mortgage is required';
        } else if (!['Yes', 'No'].includes(trimmedValue)) {
          errors.hasMortgage = 'Has mortgage must be either "Yes" or "No"';
        }
        break;

      case 'maritalStatus':
        if (trimmedValue && !['Single', 'Married', 'Divorced'].includes(trimmedValue)) {
          errors.maritalStatus = 'Marital status must be one of: Single, Married, Divorced';
        }
        break;

      case 'education':
        if (trimmedValue && !["High School", "Bachelor's", "Master's", "PhD"].includes(trimmedValue)) {
          errors.education = 'Education must be one of: High School, Bachelor\'s, Master\'s, PhD';
        }
        break;

      case 'employmentLengthMonths':
        {
          const error = getEmploymentLengthError(value);
          if (error) {
            errors.employmentLengthMonths = error;
          }
        }
        break;

      case 'monthlyDebtPayment':
        {
          const debtError = getMonthlyDebtPaymentError(value);
          if (debtError) {
            errors.monthlyDebtPayment = debtError;
          } else {
            // Also check against income
            const income = parseFloat(currentFormData.monthlyIncome) || 0;
            const debtPayment = parseFloat(value) || 0;
            if (income > 0 && debtPayment > income) {
              errors.monthlyDebtPayment = 'Monthly debt payment cannot be greater than monthly income';
            }
          }
        }
        break;

      case 'housingCost':
        {
          const costError = getHousingCostError(value);
          if (costError) {
            errors.housingCost = costError;
          } else {
            // Also check against income
            const income = parseFloat(currentFormData.monthlyIncome) || 0;
            const housingCost = parseFloat(value) || 0;
            if (income > 0 && housingCost > income) {
              errors.housingCost = 'Housing cost cannot be greater than monthly income';
            }
          }
        }
        break;

      case 'existingLoans':
        {
          const error = getExistingLoansError(value);
          if (error) {
            errors.existingLoans = error;
          }
        }
        break;

      default:
        break;
    }

    return errors;
  };

  // ── Handle field change with live validation ──────────────────────────────────────
  const handleFieldChangeWithValidation = (fieldName, value) => {
    // Sanitize numeric inputs
    let sanitizedValue = value;

    // Integer fields - Employment Length, Existing Loans
    if (['employmentLengthMonths', 'existingLoans'].includes(fieldName)) {
      sanitizedValue = sanitizeIntegerInput(value);
    }

    // Decimal fields - Monthly Income, Debt Payment, Housing Cost
    if (['monthlyIncome', 'monthlyDebtPayment', 'housingCost'].includes(fieldName)) {
      sanitizedValue = sanitizeDecimalInput(value);
    }

    // Phone field - sanitize to digits only, max 10
    if (fieldName === 'phone') {
      sanitizedValue = sanitizePhoneInput(value);
    }

    const newFormData = { ...formData, [fieldName]: sanitizedValue };
    setFormData(newFormData);

    // Mark field as touched
    setTouched(prev => ({ ...prev, [fieldName]: true }));

    // Validate this field
    const fieldError = validateField(fieldName, sanitizedValue, newFormData, customJobType);

    // Update field errors
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      if (fieldError[fieldName]) {
        newErrors[fieldName] = fieldError[fieldName];
      } else {
        delete newErrors[fieldName];
      }

      // If this is monthlyIncome, also revalidate dependent fields
      if (fieldName === 'monthlyIncome') {
        const debtError = validateField('monthlyDebtPayment', newFormData.monthlyDebtPayment, newFormData, customJobType);
        const housingError = validateField('housingCost', newFormData.housingCost, newFormData, customJobType);

        if (debtError.monthlyDebtPayment) {
          newErrors.monthlyDebtPayment = debtError.monthlyDebtPayment;
        } else {
          delete newErrors.monthlyDebtPayment;
        }

        if (housingError.housingCost) {
          newErrors.housingCost = housingError.housingCost;
        } else {
          delete newErrors.housingCost;
        }
      }

      return newErrors;
    });
  };

  const getErrorMessage = (error) => {
    return error?.response?.data?.message ||
           error?.response?.data?.error ||
           error?.message ||
           "Failed to update applicant";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      // Validate form data
      const validationErrors = validateApplicantForm(formData, customJobType);
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);

        // Mark all fields as touched on failed validation
        const allFields = {
          fullName: true,
          nic: true,
          phone: true,
          email: true,
          address: true,
          branch: true,
          jobType: true,
          monthlyIncome: true,
          existingLoans: true,
          dependents: true,
          employmentStatus: true,
          employmentLengthMonths: true,
          monthlyDebtPayment: true,
          housingCost: true,
          hasMortgage: true,
          maritalStatus: true,
          education: true,
        };
        setTouched(allFields);
        setLoading(false);
        return;
      }

      const payload = {
        fullName: formData.fullName.trim(),
        nic: formData.nic.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        branch: formData.branch,
        jobType: formData.jobType === "Other" ? customJobType : formData.jobType,
        monthlyIncome: parseFloat(formData.monthlyIncome) || 0,
        existingLoans: parseInt(formData.existingLoans, 10) || 0,
        dependents: formData.dependents === "Yes" ? 1 : 0,
        employmentStatus: formData.employmentStatus,
        employmentLengthMonths: parseInt(formData.employmentLengthMonths, 10) || 0,
        monthlyDebtPayment: parseFloat(formData.monthlyDebtPayment) || 0,
        housingCost: parseFloat(formData.housingCost) || 0,
        hasMortgage: formData.hasMortgage,
        maritalStatus: formData.maritalStatus,
        education: formData.education,
      };

      console.log('Updating applicant:', applicant.id);
      console.log('Update payload:', payload);

      const res = await client.put(`/api/applicants/${applicant.id}`, payload);

      console.log('Update response:', res.data);

      onSuccess(res.data);
      onClose();
    } catch (error) {
      console.error('Failed to update applicant:', error);
      const backendError = error.response?.data;
      if (backendError?.fieldErrors) {
        setFieldErrors(backendError.fieldErrors);
      }
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !applicant || !applicant.id) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: C.surface,
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 700,
          maxHeight: '95vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          position: 'sticky',
          top: 0,
          background: C.surface,
          zIndex: 1,
          paddingBottom: 16,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: C.ink }}>Edit Applicant</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: C.inkMid,
              padding: 8,
              borderRadius: 4,
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{
            background: C.dangerSoft,
            color: C.danger,
            padding: 12,
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 14,
            fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 16 }}>
              Basic Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormInput
                label="Full Name *"
                required
                fieldName="fullName"
                fieldErrors={fieldErrors}
                value={formData.fullName}
                onChange={(e) => handleFieldChangeWithValidation('fullName', e.target.value)}
              />
              <FormInput
                label="NIC * (Read-Only)"
                required
                fieldName="nic"
                fieldErrors={fieldErrors}
                readOnly
                value={formData.nic}
                style={{ background: C.surfaceDeep, color: C.ink, cursor: 'not-allowed' }}
              />
              <FormInput
                label="Phone *"
                required
                fieldName="phone"
                fieldErrors={fieldErrors}
                value={formData.phone}
                onChange={(e) => handleFieldChangeWithValidation('phone', e.target.value)}
                maxLength="10"
                inputMode="numeric"
                onKeyDown={blockInvalidPhoneKeys}
                placeholder="0771234567"
              />
              <FormInput
                label="Email *"
                required
                type="email"
                fieldName="email"
                fieldErrors={fieldErrors}
                value={formData.email}
                onChange={(e) => handleFieldChangeWithValidation('email', e.target.value)}
              />
              <FormInput
                label="Address"
                fieldName="address"
                fieldErrors={fieldErrors}
                value={formData.address}
                onChange={(e) => handleFieldChangeWithValidation('address', e.target.value)}
                span2
              />
            </div>
          </div>

          {/* Employment & Financial */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 16 }}>
              Employment & Financial Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormSelect
                label="Branch *"
                required
                fieldName="branch"
                fieldErrors={fieldErrors}
                value={formData.branch}
                onChange={(e) => handleFieldChangeWithValidation('branch', e.target.value)}
                options={BRANCHES}
              />
              <div>
                <FormSelect
                  label="Job Type *"
                  required
                  fieldName="jobType"
                  fieldErrors={fieldErrors}
                  value={formData.jobType}
                  onChange={(e) => {
                    handleFieldChangeWithValidation('jobType', e.target.value);
                    if (e.target.value !== "Other") {
                      setCustomJobType("");
                    }
                  }}
                  options={JOB_TYPES}
                />
                {formData.jobType === "Other" && (
                  <div style={{ marginTop: '8px' }}>
                    <FormInput
                      label="Custom Job Type *"
                      required
                      fieldName="customJobType"
                      fieldErrors={fieldErrors}
                      value={customJobType}
                      onChange={(e) => {
                        setCustomJobType(e.target.value);
                        // Mark as touched and validate
                        setTouched(prev => ({ ...prev, customJobType: true }));
                        const error = validateField('customJobType', e.target.value, formData, e.target.value);
                        setFieldErrors(prev => ({
                          ...prev,
                          ...error
                        }));
                      }}
                      placeholder="Enter custom job type"
                    />
                  </div>
                )}
              </div>
              <FormInput
                label="Monthly Income (LKR) *"
                required
                type="number"
                step="0.01"
                inputMode="decimal"
                fieldName="monthlyIncome"
                fieldErrors={fieldErrors}
                value={formData.monthlyIncome}
                onChange={(e) => handleFieldChangeWithValidation('monthlyIncome', e.target.value)}
              />
              <FormSelect
                label="Employment Status *"
                required
                fieldName="employmentStatus"
                fieldErrors={fieldErrors}
                value={formData.employmentStatus}
                onChange={(e) => handleFieldChangeWithValidation('employmentStatus', e.target.value)}
                options={EMPLOYMENT_STATUSES}
              />
              <FormInput
                label="Employment Length (Months)"
                type="number"
                inputMode="numeric"
                fieldName="employmentLengthMonths"
                fieldErrors={fieldErrors}
                value={formData.employmentLengthMonths}
                onChange={(e) => handleFieldChangeWithValidation('employmentLengthMonths', e.target.value)}
              />
              <FormInput
                label="Monthly Debt Payment (LKR)"
                type="number"
                step="0.01"
                inputMode="decimal"
                fieldName="monthlyDebtPayment"
                fieldErrors={fieldErrors}
                value={formData.monthlyDebtPayment}
                onChange={(e) => handleFieldChangeWithValidation('monthlyDebtPayment', e.target.value)}
              />
            </div>
          </div>

          {/* Personal Details */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 16 }}>
              Personal Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormInput
                label="Housing Cost (LKR/Month)"
                type="number"
                step="0.01"
                inputMode="decimal"
                fieldName="housingCost"
                fieldErrors={fieldErrors}
                value={formData.housingCost}
                onChange={(e) => handleFieldChangeWithValidation('housingCost', e.target.value)}
              />
              <FormSelect
                label="Has Mortgage *"
                required
                fieldName="hasMortgage"
                fieldErrors={fieldErrors}
                value={formData.hasMortgage}
                onChange={(e) => handleFieldChangeWithValidation('hasMortgage', e.target.value)}
                options={HAS_MORTGAGE_OPTIONS}
              />
              <FormSelect
                label="Marital Status *"
                required
                fieldName="maritalStatus"
                fieldErrors={fieldErrors}
                value={formData.maritalStatus}
                onChange={(e) => handleFieldChangeWithValidation('maritalStatus', e.target.value)}
                options={MARITAL_STATUSES}
              />
              <FormInput
                label="Existing Loans"
                type="number"
                inputMode="numeric"
                required
                fieldName="existingLoans"
                fieldErrors={fieldErrors}
                value={formData.existingLoans}
                onChange={(e) => handleFieldChangeWithValidation('existingLoans', e.target.value)}
              />
              <FormSelect
                label="Dependents *"
                required
                fieldName="dependents"
                fieldErrors={fieldErrors}
                value={formData.dependents}
                onChange={(e) => handleFieldChangeWithValidation('dependents', e.target.value)}
                options={DEPENDENTS_OPTIONS}
              />
              <FormSelect
                label="Education"
                fieldName="education"
                fieldErrors={fieldErrors}
                value={formData.education}
                onChange={(e) => handleFieldChangeWithValidation('education', e.target.value)}
                options={EDUCATION_OPTIONS}
              />
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
            position: 'sticky',
            bottom: 0,
            background: C.surface,
            paddingTop: 16,
            borderTop: `1px solid ${C.border}`,
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                background: C.surfaceAlt,
                color: C.ink,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '12px 24px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? C.inkLight : C.primary,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 24px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14,
                minWidth: 140,
              }}
            >
              {loading ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper function to get input styling based on error state
function getInputStyle(fieldName, fieldErrors, additionalStyle = {}) {
  const hasError = fieldErrors[fieldName];
  return {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${hasError ? C.danger : C.border}`,
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    boxShadow: hasError ? `0 0 0 3px ${C.dangerSoft}` : 'none',
    ...additionalStyle,
  };
}

// Helper function to render field-level error messages
function renderFieldError(fieldName, fieldErrors) {
  const error = fieldErrors[fieldName];
  return error ? (
    <div style={{
      color: C.danger,
      fontSize: 12,
      marginTop: 4,
      fontWeight: 500,
    }}>
      {error}
    </div>
  ) : null;
}

// Helper function to handle field changes and clear specific field errors
function handleFieldChange(fieldName, value, setFormData, formData, setFieldErrors) {
  setFormData({ ...formData, [fieldName]: value });
  // Clear field-specific error when user starts typing
  setFieldErrors(prev => {
    const newErrors = { ...prev };
    delete newErrors[fieldName];
    return newErrors;
  });
}

function FormInput({ label, span2, fieldName, fieldErrors, onChange, ...props }) {
  const hasError = fieldErrors && fieldErrors[fieldName];

  return (
    <div style={{ gridColumn: span2 ? '1 / -1' : 'auto' }}>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: C.ink }}>
        {label}
      </label>
      <input
        {...props}
        onChange={onChange}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: `1px solid ${hasError ? C.danger : C.border}`,
          borderRadius: 8,
          fontSize: 14,
          background: C.surfaceAlt,
          color: C.ink,
          outline: 'none',
          boxShadow: hasError ? `0 0 0 3px ${C.dangerSoft}` : 'none',
          ...props.style,
        }}
      />
      {fieldErrors && renderFieldError(fieldName, fieldErrors)}
    </div>
  );
}

function FormSelect({ label, options, isBoolean, fieldName, fieldErrors, ...props }) {
  const hasError = fieldErrors && fieldErrors[fieldName];

  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: C.ink }}>
        {label}
      </label>
      <select
        {...props}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: `1px solid ${hasError ? C.danger : C.border}`,
          borderRadius: 8,
          fontSize: 14,
          background: C.surfaceAlt,
          color: C.ink,
          outline: 'none',
          boxShadow: hasError ? `0 0 0 3px ${C.dangerSoft}` : 'none',
        }}
      >
        <option value="">Select {label.replace(' *', '')}</option>
        {isBoolean ? (
          options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))
        ) : (
          options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))
        )}
      </select>
      {fieldErrors && renderFieldError(fieldName, fieldErrors)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DELETE CONFIRMATION MODAL
// ═══════════════════════════════════════════════════════════

function DeleteConfirmModal({ isOpen, onClose, applicant, onConfirm, loading }) {
  if (!isOpen || !applicant) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: C.surface,
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 450,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: C.dangerSoft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <span style={{ fontSize: 28, color: C.danger }}>⚠️</span>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 12, color: C.ink }}>
          Delete Applicant?
        </h2>

        <p style={{ fontSize: 14, color: C.inkMid, textAlign: 'center', marginBottom: 8 }}>
          Are you sure you want to delete <strong>{applicant.fullName}</strong>?
        </p>
        <p style={{ fontSize: 13, color: C.inkMid, textAlign: 'center', marginBottom: 24 }}>
          NIC: <strong>{applicant.nic}</strong>
        </p>

        <div style={{
          background: C.warnSoft,
          border: `1px solid ${C.warn}`,
          borderRadius: 8,
          padding: 12,
          marginBottom: 24,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: C.warn, textAlign: 'center' }}>
            ⚠️ This action cannot be undone. All applicant data will be permanently deleted.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              background: C.surfaceAlt,
              color: C.ink,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '10px 24px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1,
              background: loading ? C.inkLight : C.danger,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ADD APPLICANT MODAL
// ═══════════════════════════════════════════════════════════

function AddApplicantModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formData, setFormData] = useState({
    fullName: "",
    nic: "",
    phone: "",
    email: "",
    address: "",
    branch: "",
    jobType: "",
    monthlyIncome: "",
    existingLoans: "",
    dependents: "No",
    employmentStatus: "",
    employmentLengthMonths: "0",
    monthlyDebtPayment: "0",
    housingCost: "0",
    hasMortgage: "",
    maritalStatus: "",
    education: "",
  });
  const [customJobType, setCustomJobType] = useState("");

  const resetForm = () => {
    setFormData({
      fullName: "",
      nic: "",
      phone: "",
      email: "",
      address: "",
      branch: "",
      jobType: "",
      monthlyIncome: "",
      existingLoans: "",
      dependents: "No",
      employmentStatus: "",
      employmentLengthMonths: "0",
      monthlyDebtPayment: "0",
      housingCost: "0",
      hasMortgage: "",
      maritalStatus: "",
      education: "",
    });
    setCustomJobType("");
    setError('');
    setFieldErrors({});
    setTouched({});
  };

  const getErrorMessage = (error) => {
    return error?.response?.data?.message ||
           error?.response?.data?.error ||
           error?.message ||
           "Failed to create applicant";
  };

  const validateApplicantForm = () => {
    const errors = {};

    if (!formData.fullName?.trim()) {
      errors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 3) {
      errors.fullName = "Full name must be at least 3 characters";
    } else if (!/^[A-Za-z .'-]+$/.test(formData.fullName.trim())) {
      errors.fullName = "Full name contains invalid characters";
    }

    const nicRegex = /^(\d{9}[Vv]|\d{12})$/;
    if (!formData.nic?.trim()) {
      errors.nic = "NIC is required";
    } else if (!nicRegex.test(formData.nic.trim())) {
      errors.nic = "Enter a valid NIC";
    }

    const phoneRegex = /^0\d{9}$/;
    if (!formData.phone?.trim()) {
      errors.phone = "Phone is required";
    } else if (!phoneRegex.test(formData.phone.trim())) {
      errors.phone = "Phone must be 10 digits and start with 0";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email?.trim()) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = "Enter a valid email";
    }

    if (!formData.address?.trim()) {
      errors.address = "Address is required";
    } else {
      const addressError = getAddressError(formData.address.trim());
      if (addressError) {
        errors.address = addressError;
      }
    }

    if (!formData.branch?.trim()) {
      errors.branch = "Branch is required";
    }

    if (!formData.jobType?.trim()) {
      errors.jobType = "Job type is required";
    }

    if (
      formData.dependents === "" ||
      formData.dependents === null ||
      formData.dependents === undefined
    ) {
      errors.dependents = "Dependents is required";
    }

    if (!formData.employmentStatus?.trim()) {
      errors.employmentStatus = "Employment status is required";
    }

    if (
      formData.monthlyIncome === "" ||
      formData.monthlyIncome === null ||
      Number(formData.monthlyIncome) < 0
    ) {
      errors.monthlyIncome = "Monthly income must be 0 or more";
    }

    if (
      formData.monthlyDebtPayment !== "" &&
      formData.monthlyDebtPayment !== null &&
      Number(formData.monthlyDebtPayment) < 0
    ) {
      errors.monthlyDebtPayment = "Monthly debt payment cannot be negative";
    }

    if (
      formData.housingCost !== "" &&
      formData.housingCost !== null &&
      Number(formData.housingCost) < 0
    ) {
      errors.housingCost = "Housing cost cannot be negative";
    }

    if (Number(formData.monthlyDebtPayment || 0) > Number(formData.monthlyIncome || 0)) {
      errors.monthlyDebtPayment =
        "Monthly debt payment cannot be greater than monthly income";
    }

    if (Number(formData.housingCost || 0) > Number(formData.monthlyIncome || 0)) {
      errors.housingCost = "Housing cost cannot be greater than monthly income";
    }

    if (!formData.hasMortgage?.trim()) {
      errors.hasMortgage = "Please select mortgage status";
    }

    if (formData.jobType === "Other" && !customJobType?.trim()) {
      errors.customJobType = "Custom job type is required";
    }

    // Validate employment length for unrealistic values
    const employmentLengthError = getEmploymentLengthError(formData.employmentLengthMonths);
    if (employmentLengthError) {
      errors.employmentLengthMonths = employmentLengthError;
    }

    // Validate monthly debt payment for unrealistic values
    const debtPaymentError = getMonthlyDebtPaymentError(formData.monthlyDebtPayment);
    if (debtPaymentError) {
      errors.monthlyDebtPayment = debtPaymentError;
    }

    // Validate housing cost for unrealistic values
    const housingCostError = getHousingCostError(formData.housingCost);
    if (housingCostError) {
      errors.housingCost = housingCostError;
    }

    // Validate existing loans for unrealistic values
    const existingLoansError = getExistingLoansError(formData.existingLoans);
    if (existingLoansError) {
      errors.existingLoans = existingLoansError;
    }

    // Education validation (AddApplicantModal only)
    if (formData.education && !["High School", "Bachelor's", "Master's", "PhD"].includes(formData.education)) {
      errors.education = 'Education must be one of: High School, Bachelor\'s, Master\'s, PhD';
    }

    return errors;
  };

  // ── Field-level validation for live feedback ──────────────────────────────────────
  const validateField = (fieldName, value, currentFormData = formData, currentCustomJobType = customJobType) => {
    const errors = {};
    const trimmedValue = typeof value === 'string' ? value.trim() : value;

    switch (fieldName) {
      case 'fullName':
        if (!trimmedValue) {
          errors.fullName = "Full name is required";
        } else if (trimmedValue.length < 3) {
          errors.fullName = "Full name must be at least 3 characters";
        } else if (!/^[A-Za-z .'-]+$/.test(trimmedValue)) {
          errors.fullName = "Full name contains invalid characters";
        }
        break;

      case 'nic':
        const nicRegex = /^(\d{9}[Vv]|\d{12})$/;
        if (!trimmedValue) {
          errors.nic = "NIC is required";
        } else if (!nicRegex.test(trimmedValue)) {
          errors.nic = "Enter a valid NIC";
        }
        break;

      case 'phone':
        const phoneRegex = /^0\d{9}$/;
        if (!trimmedValue) {
          errors.phone = "Phone is required";
        } else if (!phoneRegex.test(trimmedValue)) {
          errors.phone = "Phone must be 10 digits and start with 0";
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!trimmedValue) {
          errors.email = "Email is required";
        } else if (!emailRegex.test(trimmedValue)) {
          errors.email = "Enter a valid email";
        }
        break;

      case 'address':
        // Address is required in AddApplicantModal, so must be meaningful
        if (!trimmedValue) {
          errors.address = "Address is required";
        } else {
          const addressError = getAddressError(trimmedValue);
          if (addressError) {
            errors.address = addressError;
          }
        }
        break;

      case 'branch':
        if (!trimmedValue) {
          errors.branch = "Branch is required";
        }
        break;

      case 'jobType':
        if (!trimmedValue) {
          errors.jobType = "Job type is required";
        }
        break;

      case 'customJobType':
        if (currentFormData.jobType === "Other" && !trimmedValue) {
          errors.customJobType = "Custom job type is required";
        }
        break;

      case 'monthlyIncome':
        if (value === "" || value === null) {
          errors.monthlyIncome = "Monthly income is required";
        } else {
          const incomeError = getMonthlyIncomeError(value);
          if (incomeError) {
            errors.monthlyIncome = incomeError;
          }
        }
        break;

      case 'employmentStatus':
        if (!trimmedValue) {
          errors.employmentStatus = "Employment status is required";
        }
        break;

      case 'hasMortgage':
        if (!trimmedValue) {
          errors.hasMortgage = "Please select mortgage status";
        }
        break;

      case 'dependents':
        if (value === "" || value === null || value === undefined) {
          errors.dependents = "Dependents is required";
        }
        break;

      case 'employmentLengthMonths':
        {
          const error = getEmploymentLengthError(value);
          if (error) {
            errors.employmentLengthMonths = error;
          }
        }
        break;

      case 'monthlyDebtPayment':
        {
          const debtError = getMonthlyDebtPaymentError(value);
          if (debtError) {
            errors.monthlyDebtPayment = debtError;
          } else {
            // Also check against income
            const income = Number(currentFormData.monthlyIncome || 0);
            const debtPayment = Number(value || 0);
            if (income > 0 && debtPayment > income) {
              errors.monthlyDebtPayment = "Monthly debt payment cannot be greater than monthly income";
            }
          }
        }
        break;

      case 'housingCost':
        {
          const costError = getHousingCostError(value);
          if (costError) {
            errors.housingCost = costError;
          } else {
            // Also check against income
            const income = Number(currentFormData.monthlyIncome || 0);
            const housingCost = Number(value || 0);
            if (income > 0 && housingCost > income) {
              errors.housingCost = "Housing cost cannot be greater than monthly income";
            }
          }
        }
        break;

      case 'existingLoans':
        {
          const error = getExistingLoansError(value);
          if (error) {
            errors.existingLoans = error;
          }
        }
        break;

      case 'education':
        if (trimmedValue && !["High School", "Bachelor's", "Master's", "PhD"].includes(trimmedValue)) {
          errors.education = 'Education must be one of: High School, Bachelor\'s, Master\'s, PhD';
        }
        break;

      default:
        break;
    }

    return errors;
  };

  // ── Handle field change with live validation ──────────────────────────────────────
  const handleFieldChangeWithValidation = (fieldName, value) => {
    // Sanitize numeric inputs
    let sanitizedValue = value;

    // Integer fields - Employment Length, Existing Loans
    if (['employmentLengthMonths', 'existingLoans'].includes(fieldName)) {
      sanitizedValue = sanitizeIntegerInput(value);
    }

    // Decimal fields - Monthly Income, Debt Payment, Housing Cost
    if (['monthlyIncome', 'monthlyDebtPayment', 'housingCost'].includes(fieldName)) {
      sanitizedValue = sanitizeDecimalInput(value);
    }

    // Phone field - sanitize to digits only, max 10
    if (fieldName === 'phone') {
      sanitizedValue = sanitizePhoneInput(value);
    }

    const newFormData = { ...formData, [fieldName]: sanitizedValue };
    setFormData(newFormData);

    // Mark field as touched
    setTouched(prev => ({ ...prev, [fieldName]: true }));

    // Validate this field
    const fieldError = validateField(fieldName, sanitizedValue, newFormData, customJobType);

    // Update field errors
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      if (fieldError[fieldName]) {
        newErrors[fieldName] = fieldError[fieldName];
      } else {
        delete newErrors[fieldName];
      }

      // If this is monthlyIncome, also revalidate dependent fields
      if (fieldName === 'monthlyIncome') {
        const debtError = validateField('monthlyDebtPayment', newFormData.monthlyDebtPayment, newFormData, customJobType);
        const housingError = validateField('housingCost', newFormData.housingCost, newFormData, customJobType);

        if (debtError.monthlyDebtPayment) {
          newErrors.monthlyDebtPayment = debtError.monthlyDebtPayment;
        } else {
          delete newErrors.monthlyDebtPayment;
        }

        if (housingError.housingCost) {
          newErrors.housingCost = housingError.housingCost;
        } else {
          delete newErrors.housingCost;
        }
      }

      return newErrors;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('=== FORM SUBMISSION DEBUG ===');
    console.log('Form data:', formData);
    console.log('Custom job type:', customJobType);

    const errors = validateApplicantForm();
    console.log('Validation errors:', errors);
    console.log('Number of errors:', Object.keys(errors).length);
    console.log('Error details:', JSON.stringify(errors, null, 2));

    setFieldErrors(errors);

    // Mark all fields as touched on submit
    const allFields = {
      fullName: true,
      nic: true,
      phone: true,
      email: true,
      address: true,
      branch: true,
      jobType: true,
      monthlyIncome: true,
      existingLoans: true,
      dependents: true,
      employmentStatus: true,
      employmentLengthMonths: true,
      monthlyDebtPayment: true,
      housingCost: true,
      hasMortgage: true,
      maritalStatus: true,
      education: true,
    };
    setTouched(allFields);

    if (Object.keys(errors).length > 0) {
      console.log('❌ Validation failed! Errors found:');
      Object.entries(errors).forEach(([field, message]) => {
        console.log(`  - ${field}: ${message}`);
      });
      return;
    }

    console.log('✅ Validation passed! Proceeding with API call...');
    setLoading(true);
    setError('');

    try {

      const payload = {
        fullName: formData.fullName.trim(),
        nic: formData.nic.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        branch: formData.branch,
        jobType: formData.jobType === "Other" ? customJobType : formData.jobType,
        monthlyIncome: parseFloat(formData.monthlyIncome),
        existingLoans: parseInt(formData.existingLoans, 10) || 0,
        dependents: formData.dependents === "Yes" ? 1 : 0,
        employmentStatus: formData.employmentStatus,
        employmentLengthMonths: parseInt(formData.employmentLengthMonths, 10) || 0,
        monthlyDebtPayment: parseFloat(formData.monthlyDebtPayment) || 0,
        housingCost: parseFloat(formData.housingCost) || 0,
        hasMortgage: formData.hasMortgage,
        maritalStatus: formData.maritalStatus,
        education: formData.education,
      };

      console.log('Sending payload to API:', payload);

      const res = await client.post("/api/applicants/register", payload);

      console.log('API response:', res.data);

      onSuccess(res.data);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create applicant:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      const backendError = error.response?.data;
      if (backendError?.fieldErrors) {
        setFieldErrors(backendError.fieldErrors);
      }
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        style={{
          background: C.surface,
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 700,
          maxHeight: '95vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          position: 'sticky',
          top: 0,
          background: C.surface,
          zIndex: 1,
          paddingBottom: 16,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: C.ink }}>Add New Applicant</h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: C.inkMid,
              padding: 8,
              borderRadius: 4,
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{
            background: C.dangerSoft,
            color: C.danger,
            padding: 12,
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 14,
            fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 16 }}>
              Basic Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormInput
                label="Full Name *"
                required
                fieldName="fullName"
                fieldErrors={fieldErrors}
                value={formData.fullName}
                placeholder="Enter full name"
                onChange={(e) => handleFieldChangeWithValidation('fullName', e.target.value)}
              />
              <FormInput
                label="NIC *"
                required
                fieldName="nic"
                fieldErrors={fieldErrors}
                value={formData.nic}
                placeholder="199232181960 or 891234567V"
                onChange={(e) => handleFieldChangeWithValidation('nic', e.target.value)}
              />
              <FormInput
                label="Phone *"
                required
                fieldName="phone"
                fieldErrors={fieldErrors}
                value={formData.phone}
                placeholder="0771234567"
                onChange={(e) => handleFieldChangeWithValidation('phone', e.target.value)}
                maxLength="10"
                inputMode="numeric"
                onKeyDown={blockInvalidPhoneKeys}
              />
              <FormInput
                label="Email *"
                required
                type="email"
                fieldName="email"
                fieldErrors={fieldErrors}
                value={formData.email}
                placeholder="saman.perera@example.com"
                onChange={(e) => handleFieldChangeWithValidation('email', e.target.value)}
              />
              <FormInput
                label="Address"
                fieldName="address"
                fieldErrors={fieldErrors}
                value={formData.address}
                placeholder="28, High Level Road, Kadawatha"
                onChange={(e) => handleFieldChangeWithValidation('address', e.target.value)}
                span2
              />
            </div>
          </div>

          {/* Employment & Financial */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 16 }}>
              Employment & Financial Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormSelect
                label="Branch *"
                required
                fieldName="branch"
                fieldErrors={fieldErrors}
                value={formData.branch}
                onChange={(e) => handleFieldChangeWithValidation('branch', e.target.value)}
                options={BRANCHES}
              />
              <div>
                <FormSelect
                  label="Job Type *"
                  required
                  fieldName="jobType"
                  fieldErrors={fieldErrors}
                  value={formData.jobType}
                  onChange={(e) => {
                    handleFieldChangeWithValidation('jobType', e.target.value);
                    if (e.target.value !== "Other") {
                      setCustomJobType("");
                    }
                  }}
                  options={JOB_TYPES}
                />
                {formData.jobType === "Other" && (
                  <div style={{ marginTop: '8px' }}>
                    <FormInput
                      label="Custom Job Type *"
                      required
                      fieldName="customJobType"
                      fieldErrors={fieldErrors}
                      value={customJobType}
                      onChange={(e) => {
                        setCustomJobType(e.target.value);
                        // Mark as touched and validate
                        setTouched(prev => ({ ...prev, customJobType: true }));
                        const error = validateField('customJobType', e.target.value, formData, e.target.value);
                        setFieldErrors(prev => ({
                          ...prev,
                          ...error
                        }));
                      }}
                      placeholder="Enter custom job type"
                    />
                  </div>
                )}
              </div>
              <FormInput
                label="Monthly Income (LKR) *"
                required
                type="number"
                inputMode="decimal"
                fieldName="monthlyIncome"
                fieldErrors={fieldErrors}
                value={formData.monthlyIncome}
                placeholder="45000"
                onChange={(e) => handleFieldChangeWithValidation('monthlyIncome', e.target.value)}
              />
              <FormSelect
                label="Employment Status *"
                required
                fieldName="employmentStatus"
                fieldErrors={fieldErrors}
                value={formData.employmentStatus}
                onChange={(e) => handleFieldChangeWithValidation('employmentStatus', e.target.value)}
                options={EMPLOYMENT_STATUSES}
              />
              <FormInput
                label="Employment Length (Months)"
                type="number"
                inputMode="numeric"
                fieldName="employmentLengthMonths"
                fieldErrors={fieldErrors}
                value={formData.employmentLengthMonths}
                placeholder="26"
                onChange={(e) => handleFieldChangeWithValidation('employmentLengthMonths', e.target.value)}
              />
              <FormInput
                label="Monthly Debt Payment (LKR)"
                type="number"
                inputMode="decimal"
                fieldName="monthlyDebtPayment"
                fieldErrors={fieldErrors}
                value={formData.monthlyDebtPayment}
                placeholder="869"
                onChange={(e) => handleFieldChangeWithValidation('monthlyDebtPayment', e.target.value)}
              />
            </div>
          </div>

          {/* Personal Details */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 16 }}>
              Personal Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormInput
                label="Housing Cost (LKR/Month)"
                type="number"
                inputMode="decimal"
                fieldName="housingCost"
                fieldErrors={fieldErrors}
                value={formData.housingCost}
                placeholder="56925"
                onChange={(e) => handleFieldChangeWithValidation('housingCost', e.target.value)}
              />
              <FormSelect
                label="Has Mortgage *"
                required
                fieldName="hasMortgage"
                fieldErrors={fieldErrors}
                value={formData.hasMortgage}
                onChange={(e) => handleFieldChangeWithValidation('hasMortgage', e.target.value)}
                options={HAS_MORTGAGE_OPTIONS}
              />
              <FormSelect
                label="Marital Status *"
                required
                fieldName="maritalStatus"
                fieldErrors={fieldErrors}
                value={formData.maritalStatus}
                onChange={(e) => handleFieldChangeWithValidation('maritalStatus', e.target.value)}
                options={MARITAL_STATUSES}
              />
              <FormInput
                label="Existing Loans"
                type="number"
                inputMode="numeric"
                required
                fieldName="existingLoans"
                fieldErrors={fieldErrors}
                value={formData.existingLoans}
                onChange={(e) => handleFieldChangeWithValidation('existingLoans', e.target.value)}
              />
              <FormSelect
                label="Dependents *"
                required
                fieldName="dependents"
                fieldErrors={fieldErrors}
                value={formData.dependents}
                onChange={(e) => handleFieldChangeWithValidation('dependents', e.target.value)}
                options={DEPENDENTS_OPTIONS}
              />
              <FormSelect
                label="Education"
                fieldName="education"
                fieldErrors={fieldErrors}
                value={formData.education}
                onChange={(e) => handleFieldChangeWithValidation('education', e.target.value)}
                options={EDUCATION_OPTIONS}
              />
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
            position: 'sticky',
            bottom: 0,
            background: C.surface,
            paddingTop: 16,
            borderTop: `1px solid ${C.border}`,
          }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                background: C.surfaceAlt,
                color: C.ink,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '12px 24px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? C.inkLight : C.primary,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 24px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14,
                minWidth: 120,
              }}
            >
              {loading ? 'Creating...' : 'Add Applicant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN APPLICANTS PAGE
// ═══════════════════════════════════════════════════════════

export default function ApplicantsPage() {
  const [applicants, setApplicants] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState('all'); // For card click filtering
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Add global CSS for Inter font
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [applicantsRes, applicationsRes] = await Promise.all([
        client.get('/api/applicants'),
        client.get('/api/applications')
      ]);
      setApplicants(applicantsRes.data);
      setApplications(applicationsRes.data);
    } catch (error) {
      showToast(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to load data',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadApplicants = async () => {
    try {
      setLoading(true);
      const res = await client.get('/api/applicants');
      setApplicants(res.data);
    } catch (error) {
      showToast(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to load applicants',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = async (newApplicant) => {
    // Reload full applicants list instead of appending partial registration response
    await loadApplicants();
    showToast(`Applicant ${newApplicant.fullName} added successfully! Credit Score: ${newApplicant.creditScore}`, 'success');
  };

  const handleUpdateSuccess = (updatedApplicant) => {
    console.log('Update success, refreshing list with:', updatedApplicant);

    // Update applicant in the state
    setApplicants(prev => prev.map(app => app.id === updatedApplicant.id ? updatedApplicant : app));

    // IMPORTANT: Update selectedApplicant so edit modal shows new credit score
    setSelectedApplicant(updatedApplicant);

    showToast(`${updatedApplicant.fullName} updated successfully! New Credit Score: ${updatedApplicant.creditScore}`, 'success');
  };

  const handleDelete = async () => {
    if (!selectedApplicant) return;

    setDeleteLoading(true);
    try {
      const result = await client.delete(`/api/applicants/${selectedApplicant.id}`);

      // Remove applicant from list
      setApplicants(prev => prev.filter(app => app.id !== selectedApplicant.id));

      // Show success message with cascade deletion details
      const caseDeleteMessage = result.data?.totalRelatedRecordsUpdated
        ? `Applicant and ${result.data.totalRelatedRecordsUpdated} related records deleted successfully! (${result.data.applicationsDeleted} applications, ${result.data.riskAssessmentsArchived} risk assessments, ${result.data.recommendationsArchived} recommendations, ${result.data.repaymentInstallmentsArchived} repayment installments, ${result.data.repaymentPaymentsDeleted} payments)`
        : `Applicant ${selectedApplicant.fullName} deleted successfully!`;

      showToast(caseDeleteMessage, 'success');
      setShowDeleteModal(false);
      setSelectedApplicant(null);
    } catch (error) {
      showToast(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to delete applicant',
        'error'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleViewClick = (applicant) => {
    setSelectedApplicant(applicant);
    setShowViewModal(true);
  };

  const handleEditClick = (applicant) => {
    console.log('Opening edit modal for:', applicant);
    setSelectedApplicant(applicant);
    // Use setTimeout to ensure the state is updated before opening the modal
    setTimeout(() => {
      setShowEditModal(true);
    }, 0);
  };

  const handleDeleteClick = (applicant) => {
    setSelectedApplicant(applicant);
    setShowDeleteModal(true);
  };

  // Calculate stats for all 5 dashboard cards
  const stats = {
    total: applicants.length,
    avgCreditScore: applicants.length > 0 ? Math.round(applicants.reduce((sum, app) => sum + (app.creditScore || 0), 0) / applicants.length) : 0,
    highRisk: applicants.filter(app => app.riskLevel === 'High').length,
    lowRisk: applicants.filter(app => app.riskLevel === 'Low').length,
    withActiveLoans: applications.length > 0 ?
      applicants.filter(applicant =>
        applications.some(app => app.applicantId === applicant.id && !['REJECTED', 'CANCELLED'].includes(app.status))
      ).length : 0,
  };

  // Filter applicants based on active filter
  const getFilteredApplicants = () => {
    let filtered = applicants;

    // Apply card-based filters
    switch (activeFilter) {
      case 'high-risk':
        filtered = applicants.filter(app => app.riskLevel === 'High');
        break;
      case 'low-risk':
        filtered = applicants.filter(app => app.riskLevel === 'Low');
        break;
      case 'with-loans':
        filtered = applications.length > 0 ?
          applicants.filter(applicant =>
            applications.some(app => app.applicantId === applicant.id && !['REJECTED', 'CANCELLED'].includes(app.status))
          ) : [];
        break;
      default:
        // 'all' case - no additional filtering
        break;
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(applicant =>
        applicant.fullName?.toLowerCase().includes(query) ||
        applicant.nic?.toLowerCase().includes(query) ||
        applicant.email?.toLowerCase().includes(query) ||
        applicant.applicantNumber?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredApplicants = getFilteredApplicants();

  // Card click handlers
  const handleCardClick = (filterType) => {
    setActiveFilter(activeFilter === filterType ? 'all' : filterType);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div style={{ background: C.surfaceDeep, minHeight: '100vh', padding: 24 }}>
      <style>{`
        .dark-search-input::placeholder {
          color: var(--text-muted) !important;
          opacity: 1;
        }
      `}</style>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <PageHeader
          title="Applicants"
          subtitle="Manage loan applicants and view credit assessments"
        />

        {/* Enhanced Gradient Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}>
          <GradientSummaryCard
            title="Total Applicants"
            value={stats.total}
            subtitle="All registered"
            gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
            lineGradient="linear-gradient(90deg, #3b82f6, #60a5fa)"
            icon={(
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            )}
            onClick={() => handleCardClick('all')}
            clickable={true}
            isActive={activeFilter === 'all'}
            index={0}
          />
          <GradientSummaryCard
            title="Avg Credit Score"
            value={stats.avgCreditScore}
            subtitle="Overall average"
            gradient="linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)"
            lineGradient="linear-gradient(90deg, #9333ea, #c084fc)"
            icon={(
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            )}
            clickable={false}
            index={1}
          />
          <GradientSummaryCard
            title="High Risk Applicants"
            value={stats.highRisk}
            subtitle="Need careful review"
            gradient="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
            lineGradient="linear-gradient(90deg, #ef4444, #f87171)"
            icon={(
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            )}
            onClick={() => handleCardClick('high-risk')}
            clickable={true}
            isActive={activeFilter === 'high-risk'}
            index={2}
          />
          <GradientSummaryCard
            title="Low Risk Applicants"
            value={stats.lowRisk}
            subtitle="Good profile range"
            gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
            lineGradient="linear-gradient(90deg, #10b981, #34d399)"
            icon={(
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            )}
            onClick={() => handleCardClick('low-risk')}
            clickable={true}
            isActive={activeFilter === 'low-risk'}
            index={3}
          />
          <GradientSummaryCard
            title="Applicants with Active Loans"
            value={stats.withActiveLoans}
            subtitle="Linked to applications"
            gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            lineGradient="linear-gradient(90deg, #f59e0b, #fbbf24)"
            icon={(
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            )}
            onClick={() => handleCardClick('with-loans')}
            clickable={true}
            isActive={activeFilter === 'with-loans'}
            index={4}
          />
        </div>

        {/* Active Filter Indicator */}
        {activeFilter !== 'all' && (
          <div style={{
            marginBottom: 16,
            fontSize: 14,
            color: C.inkMid,
          }}>
            <span style={{ fontWeight: 500 }}>Active Filter:</span> {
              activeFilter === 'high-risk' ? 'High Risk Applicants' :
              activeFilter === 'low-risk' ? 'Low Risk Applicants' :
              activeFilter === 'with-loans' ? 'Applicants with Active Loans' : 'All'
            } ({filteredApplicants.length} {filteredApplicants.length === 1 ? 'applicant' : 'applicants'})
            <button
              onClick={() => setActiveFilter('all')}
              style={{
                background: 'transparent',
                border: 'none',
                color: C.primary,
                marginLeft: 8,
                cursor: 'pointer',
                fontSize: 12,
                textDecoration: 'underline',
              }}
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Search and Add */}
        <div
          style={{
            background: C.surface,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            padding: 20,
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: 1, marginRight: 16 }}>
            <input
              type="text"
              className="dark-search-input"
              placeholder="Search applicants by name, NIC, or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Reset filter when searching to show search results
                if (activeFilter !== 'all') {
                  setActiveFilter('all');
                }
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: C.surfaceAlt,
                color: C.ink,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                fontSize: 14,
                minHeight: 48,
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'all 0.2s ease',
                '::placeholder': {
                  color: C.inkMid
                }
              }}
              onFocus={(e) => {
                e.target.style.borderColor = C.primary;
                e.target.style.boxShadow = '0 0 0 3px rgba(110,168,255,0.18)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = C.border;
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: C.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            + Add Applicant
          </button>
        </div>

        {/* Applicants Table */}
        <div
          style={{
            background: C.surface,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>Loading applicants...</div>
          ) : filteredApplicants.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.inkMid }}>
              {searchQuery ? 'No applicants found matching your search.' : 'No applicants yet.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              {/* Table Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 2fr 1fr 1fr 1fr 1fr 1fr 180px',
                  gap: 16,
                  padding: '16px 20px',
                  borderBottom: `1px solid ${C.border}`,
                  background: C.surfaceAlt,
                  fontWeight: 600,
                  fontSize: 12,
                  color: C.inkMid,
                  textTransform: 'uppercase',
                  minWidth: 1080,
                }}
              >
                <div>No.</div>
                <div>Applicant</div>
                <div>NIC</div>
                <div>Branch</div>
                <div>Job Type</div>
                <div>Income</div>
                <div>Credit Score</div>
                <div style={{ textAlign: 'center' }}>Actions</div>
              </div>

              {/* Table Body */}
              {filteredApplicants.map((applicant) => (
                <div
                  key={applicant.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 2fr 1fr 1fr 1fr 1fr 1fr 180px',
                    gap: 16,
                    padding: '16px 20px',
                    borderBottom: `1px solid ${C.border}`,
                    alignItems: 'center',
                    minWidth: 1080,
                  }}
                >
                  <div style={{
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: C.inkMid,
                    fontWeight: 500,
                    cursor: 'help'
                  }}
                  title={`Applicant No: ${applicant.applicantNumber || 'Not assigned'}`}
                  >
                    {applicant.applicantNumber || 'Not assigned'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: C.ink }}>{applicant.fullName}</div>
                    <div style={{ fontSize: 12, color: C.inkMid }}>{applicant.email}</div>
                  </div>
                  <div style={{ fontSize: 13, fontFamily: 'monospace' }}>{applicant.nic}</div>
                  <div style={{ fontSize: 13 }}>{applicant.branch}</div>
                  <div style={{ fontSize: 13 }}>{applicant.jobType}</div>
                  <div style={{ fontSize: 13 }}>{formatCurrency(applicant.monthlyIncome)}</div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: applicant.creditScore >= 750 ? C.success : applicant.creditScore >= 600 ? C.warn : C.danger,
                    }}
                  >
                    {applicant.creditScore}
                  </div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button
                      onClick={() => handleViewClick(applicant)}
                      style={{
                        background: C.primarySoft,
                        color: C.primary,
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                      title="View Details"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEditClick(applicant)}
                      style={{
                        background: 'transparent',
                        color: C.warn,
                        border: `1px solid ${C.warn}`,
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                      title="Edit Applicant"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(applicant)}
                      style={{
                        background: C.dangerSoft,
                        color: C.danger,
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                      title="Delete Applicant"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddApplicantModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />

      <ViewApplicantModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedApplicant(null);
        }}
        applicant={selectedApplicant}
      />

      <EditApplicantModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedApplicant(null);
        }}
        applicant={selectedApplicant}
        onSuccess={handleUpdateSuccess}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedApplicant(null);
        }}
        applicant={selectedApplicant}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
