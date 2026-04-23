import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import GradientSummaryCard from './shared/GradientSummaryCard';
import { PageHeader } from './PageHeader';
import { getStoredUser } from '../services/authService';
import {
  canMakeApplicationDecision,
  canCreateEditSubmitApplications,
  canRunRiskAndRecommendation,
  normalizeRole,
  validateStatusChangeByRole,
} from '../utils/permissions';

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

// Application form constants
const LOAN_TERMS = [6, 12, 18, 24, 36, 48, 60];
const LOAN_PURPOSES = ["Auto", "Business", "Education", "Home", "Other"];
const HAS_COSIGNER_OPTIONS = ["No", "Yes"];

// ═══════════════════════════════════════════════════════════
// NUMERIC INPUT HELPERS
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// SHARED VALIDATION FOR APPLICATIONS
// ═══════════════════════════════════════════════════════════

/**
 * Validates loan application form data.
 * Used by both Create and Edit modals.
 *
 * @param {Object} formData - The form data to validate
 * @param {boolean} isEditMode - If true, skips applicantId validation (read-only in edit)
 * @returns {Object} - Field errors object
 */
function validateApplicationForm(formData, isEditMode = false) {
  const errors = {};

  // Applicant ID validation (required in CREATE mode only)
  if (!isEditMode && !formData.applicantId?.trim()) {
    errors.applicantId = 'Please select an applicant';
  }

  // Amount validation (REQUIRED)
  if (!formData.amount || formData.amount === '') {
    errors.amount = 'Loan amount is required';
  } else {
    const amount = parseFloat(formData.amount);
    if (isNaN(amount)) {
      errors.amount = 'Loan amount must be a valid number';
    } else if (amount < 1000) {
      errors.amount = 'Loan amount must be at least 1,000';
    } else if (amount > 10000000) {
      errors.amount = 'Loan amount cannot exceed 10,000,000';
    }
  }

  // Term months validation - OPTIONAL
  if (formData.termMonths && formData.termMonths !== '') {
    const term = parseInt(formData.termMonths);
    const allowedTerms = [6, 12, 18, 24, 36, 48, 60];
    if (isNaN(term)) {
      errors.termMonths = 'Term must be a valid number';
    } else if (!allowedTerms.includes(term)) {
      errors.termMonths = 'Term must be one of: 6, 12, 18, 24, 36, 48, 60 months';
    }
  }

  // Interest rate validation - OPTIONAL
  if (formData.interestRate && formData.interestRate !== '') {
    const rate = parseFloat(formData.interestRate);
    if (isNaN(rate)) {
      errors.interestRate = 'Interest rate must be a valid number';
    } else if (rate < 0.1) {
      errors.interestRate = 'Interest rate must be at least 0.1%';
    } else if (rate > 50) {
      errors.interestRate = 'Interest rate cannot exceed 50%';
    }
  }

  // Purpose validation - OPTIONAL
  if (formData.purpose?.trim()) {
    if (!['Auto', 'Business', 'Education', 'Home', 'Other'].includes(formData.purpose)) {
      errors.purpose = 'Purpose must be one of: Auto, Business, Education, Home, Other';
    }
  }

  // Has co-signer validation - OPTIONAL
  // (no validation needed if empty - can be decided later)

  // Notes validation
  if (formData.notes && formData.notes.length > 500) {
    errors.notes = 'Notes cannot exceed 500 characters';
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// UTILITY COMPONENTS
// ═══════════════════════════════════════════════════════════

// Using shared GradientSummaryCard component

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
// FORM COMPONENTS
// ═══════════════════════════════════════════════════════════

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

function FormInput({ label, type = "text", value, onChange, required = false, readOnly = false, style = {}, fieldName, fieldErrors, ...props }) {
  const hasError = fieldErrors && fieldErrors[fieldName];

  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: C.ink }}>
        {label}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={onChange}
        required={required}
        readOnly={readOnly}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: `1px solid ${hasError ? C.danger : C.border}`,
          borderRadius: 8,
          fontSize: 14,
          background: readOnly ? C.surfaceAlt : C.surface,
          cursor: readOnly ? 'not-allowed' : 'text',
          color: readOnly ? C.inkMid : C.ink,
          boxShadow: hasError ? `0 0 0 3px ${C.dangerSoft}` : 'none',
          ...style,
        }}
        {...props}
      />
      {fieldErrors && renderFieldError(fieldName, fieldErrors)}
    </div>
  );
}

function FormSelect({ label, value, onChange, options, required = false, isBoolean = false, fieldName, fieldErrors }) {
  const hasError = fieldErrors && fieldErrors[fieldName];

  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: C.ink }}>
        {label}
      </label>
      <select
        value={value || ''}
        onChange={onChange}
        required={required}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: `1px solid ${hasError ? C.danger : C.border}`,
          borderRadius: 8,
          fontSize: 14,
          background: C.surface,
          color: C.ink,
          boxShadow: hasError ? `0 0 0 3px ${C.dangerSoft}` : 'none',
        }}
      >
        <option value="">Select {label.replace(' *', '')}</option>
        {isBoolean ? (
          options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))
        ) : (
          options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))
        )}
      </select>
      {fieldErrors && renderFieldError(fieldName, fieldErrors)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CRUD MODALS
// ═══════════════════════════════════════════════════════════

// CREATE APPLICATION MODAL
function CreateApplicationModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [applicants, setApplicants] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formData, setFormData] = useState({
    applicantId: '',
    amount: '',
    termMonths: '',
    interestRate: '',
    purpose: '',
    hasCoSigner: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadApplicants();
      setFormData({
        applicantId: '', amount: '', termMonths: '', interestRate: '', purpose: '', hasCoSigner: '', notes: '',
      });
      setSelectedApplicant(null);
      setError('');
      setFieldErrors({});
      setTouched({});
    }
  }, [isOpen]);

  const loadApplicants = async () => {
    try {
      const res = await client.get('/api/applicants');
      setApplicants(res.data);
    } catch (error) {
      console.error('Failed to load applicants:', error);
      setError('Failed to load applicants');
    }
  };

  const handleApplicantChange = (applicantId) => {
    const newFormData = { ...formData, applicantId };
    setFormData(newFormData);
    setTouched(prev => ({ ...prev, applicantId: true }));

    // Validate applicantId field
    const error = validateApplicationField('applicantId', applicantId);
    setFieldErrors(prev => ({
      ...prev,
      ...(error.applicantId ? { applicantId: error.applicantId } : {}),
      ...(prev.applicantId && !error.applicantId ? { applicantId: undefined } : {})
    }));

    const applicant = applicants.find(a => a.id === applicantId);
    setSelectedApplicant(applicant);
  };

  // ── Field-level validation for live feedback ──────────────────────────────────────
  const validateApplicationField = (fieldName, value, currentFormData = formData) => {
    const errors = {};

    switch (fieldName) {
      case 'applicantId':
        if (!value?.trim()) {
          errors.applicantId = 'Please select an applicant';
        }
        break;

      case 'amount':
        if (!value || value === '') {
          errors.amount = 'Loan amount is required';
        } else {
          const amount = parseFloat(value);
          if (isNaN(amount)) {
            errors.amount = 'Loan amount must be a valid number';
          } else if (amount < 1000) {
            errors.amount = 'Loan amount must be at least 1,000';
          } else if (amount > 10000000) {
            errors.amount = 'Loan amount cannot exceed 10,000,000';
          }
        }
        break;

      case 'termMonths':
        if (!value || value === '') {
          errors.termMonths = 'Term is required';
        } else {
          const term = parseInt(value);
          const allowedTerms = [6, 12, 18, 24, 36, 48, 60];
          if (isNaN(term)) {
            errors.termMonths = 'Term must be a valid number';
          } else if (!allowedTerms.includes(term)) {
            errors.termMonths = 'Term must be one of: 6, 12, 18, 24, 36, 48, 60 months';
          }
        }
        break;

      case 'interestRate':
        if (!value || value === '') {
          errors.interestRate = 'Interest rate is required';
        } else {
          const rate = parseFloat(value);
          if (isNaN(rate)) {
            errors.interestRate = 'Interest rate must be a valid number';
          } else if (rate < 0.1) {
            errors.interestRate = 'Interest rate must be at least 0.1%';
          } else if (rate > 50) {
            errors.interestRate = 'Interest rate cannot exceed 50%';
          }
        }
        break;

      case 'purpose':
        if (!value?.trim()) {
          errors.purpose = 'Purpose is required';
        } else if (!['Auto', 'Business', 'Education', 'Home', 'Other'].includes(value)) {
          errors.purpose = 'Purpose must be one of: Auto, Business, Education, Home, Other';
        }
        break;

      case 'hasCoSigner':
        if (value === '' || value === null || value === undefined) {
          errors.hasCoSigner = 'Please indicate if there is a co-signer';
        }
        break;

      case 'notes':
        if (value && value.length > 500) {
          errors.notes = 'Notes cannot exceed 500 characters';
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

    // Decimal fields - Amount, Interest Rate
    if (['amount', 'interestRate'].includes(fieldName)) {
      sanitizedValue = sanitizeDecimalInput(value);
    }

    const newFormData = { ...formData, [fieldName]: sanitizedValue };
    setFormData(newFormData);

    // Mark field as touched
    setTouched(prev => ({ ...prev, [fieldName]: true }));

    // Validate this field
    const fieldError = validateApplicationField(fieldName, sanitizedValue, newFormData);

    // Update field errors
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      if (fieldError[fieldName]) {
        newErrors[fieldName] = fieldError[fieldName];
      } else {
        delete newErrors[fieldName];
      }
      return newErrors;
    });
  };

  // Form submission ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      // Validate form data (not in edit mode, applicant is required)
      const validationErrors = validateApplicationForm(formData, false);
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);

        // Mark all fields as touched on failed validation
        const allFields = {
          applicantId: true,
          amount: true,
          termMonths: true,
          interestRate: true,
          purpose: true,
          hasCoSigner: true,
          notes: true,
        };
        setTouched(allFields);

        setLoading(false);
        return;
      }

      const payload = {
        applicantId: formData.applicantId,
        amount: parseFloat(formData.amount),
        termMonths: formData.termMonths ? parseInt(formData.termMonths, 10) : null,
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : null,
        purpose: formData.purpose || null,
        hasCoSigner: formData.hasCoSigner === "Yes" ? true : formData.hasCoSigner === "No" ? false : null,
        notes: formData.notes?.trim() || null,
      };

      const res = await client.post("/api/applications", payload);
      onSuccess(res.data);
      onClose();
    } catch (error) {
      console.error('Failed to create application:', error);

      // Handle backend field validation errors
      if (error.response?.data?.fieldErrors) {
        setFieldErrors(error.response.data.fieldErrors);
      } else {
        setError(error.response?.data?.message || error.message || 'Failed to create application');
      }
    } finally {
      setLoading(false);
    }
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
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: C.surface,
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 700,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: C.ink }}>Create New Application</h2>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
            {/* Applicant Selection */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: C.ink }}>
                Select Applicant *
              </label>
              <select
                required
                value={formData.applicantId}
                onChange={(e) => {
                  handleApplicantChange(e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${fieldErrors.applicantId ? C.danger : C.border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  background: C.surface,
                  color: C.ink,
                  boxShadow: fieldErrors.applicantId ? `0 0 0 3px ${C.dangerSoft}` : 'none',
                }}
              >
                <option value="">Choose an applicant...</option>
                {applicants.map(applicant => (
                  <option key={applicant.id} value={applicant.id}>
                    {applicant.applicantNumber || 'N/A'} - {applicant.fullName} ({applicant.nic})
                  </option>
                ))}
              </select>
              {fieldErrors && renderFieldError('applicantId', fieldErrors)}
            </div>

            {/* Credit Score Display */}
            {selectedApplicant && (
              <div style={{
                background: C.primarySoft,
                border: `1px solid ${C.primaryMid}`,
                borderRadius: 12,
                padding: 16,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 13, color: C.inkMid, marginBottom: 6 }}>
                  Selected Applicant's Credit Score
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.primary }}>
                  {selectedApplicant.creditScore}
                </div>
                <div style={{ fontSize: 12, color: C.inkMid, marginTop: 4 }}>
                  Risk Level: {selectedApplicant.riskLevel || 'Unknown'}
                </div>
              </div>
            )}

            {/* Loan Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormInput
                label="Loan Amount (LKR) *"
                type="number"
                step="0.01"
                min="1000"
                inputMode="decimal"
                fieldName="amount"
                fieldErrors={fieldErrors}
                value={formData.amount}
                onChange={(e) => handleFieldChangeWithValidation('amount', e.target.value)}
                required
                placeholder="e.g., 500000"
              />
              <FormSelect
                label="Term (Months)"
                fieldName="termMonths"
                fieldErrors={fieldErrors}
                value={formData.termMonths}
                onChange={(e) => handleFieldChangeWithValidation('termMonths', e.target.value)}
                options={LOAN_TERMS}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <FormInput
                label="Interest Rate (%)"
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                fieldName="interestRate"
                fieldErrors={fieldErrors}
                value={formData.interestRate}
                onChange={(e) => handleFieldChangeWithValidation('interestRate', e.target.value)}
                placeholder="e.g., 12.5"
              />
              <FormSelect
                label="Purpose"
                fieldName="purpose"
                fieldErrors={fieldErrors}
                value={formData.purpose}
                onChange={(e) => handleFieldChangeWithValidation('purpose', e.target.value)}
                options={LOAN_PURPOSES}
              />
              <FormSelect
                label="Has Co-Signer"
                fieldName="hasCoSigner"
                fieldErrors={fieldErrors}
                value={formData.hasCoSigner}
                onChange={(e) => handleFieldChangeWithValidation('hasCoSigner', e.target.value)}
                options={HAS_COSIGNER_OPTIONS}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: C.ink }}>
                Additional Notes
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => handleFieldChangeWithValidation('notes', e.target.value)}
                placeholder="Any additional information..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${fieldErrors.notes ? C.danger : C.border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  background: C.surface,
                  color: C.ink,
                  resize: 'vertical',
                  boxShadow: fieldErrors.notes ? `0 0 0 3px ${C.dangerSoft}` : 'none',
                }}
              />
              {fieldErrors && renderFieldError('notes', fieldErrors)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
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
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Creating...' : 'Create Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// VIEW APPLICATION MODAL
function ViewApplicationModal({ isOpen, onClose, application, applicants }) {
  if (!isOpen || !application) return null;

  const applicant = applicants.find(a => a.id === application.applicantId);
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: C.warn,
      REVIEW: C.primary,
      APPROVED: C.success,
      REJECTED: C.danger,
      CANCELLED: C.inkMid,
    };
    return colors[status] || C.inkMid;
  };

  const getStatusBg = (status) => {
    const colors = {
      PENDING: C.warnSoft,
      REVIEW: C.primarySoft,
      APPROVED: C.successSoft,
      REJECTED: C.dangerSoft,
      CANCELLED: C.surfaceAlt,
    };
    return colors[status] || C.surfaceAlt;
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
          maxWidth: 700,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: C.ink }}>Application Details</h2>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Application Status */}
          <div style={{
            background: getStatusBg(application.status),
            border: `1px solid ${getStatusColor(application.status)}40`,
            borderRadius: 12,
            padding: 16,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, color: C.inkMid, marginBottom: 6 }}>
              Application Status
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: getStatusColor(application.status),
              textTransform: 'uppercase',
            }}>
              {application.status}
            </div>
          </div>

          {/* Applicant Information */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
              Applicant Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 4 }}>Applicant Number</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, fontFamily: 'monospace' }}>{applicant?.applicantNumber || 'Not assigned'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 4 }}>Full Name</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{applicant?.fullName || 'Unknown'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 4 }}>NIC</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{applicant?.nic || 'Unknown'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 4 }}>Credit Score</div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: applicant?.creditScore >= 750 ? C.success :
                         applicant?.creditScore >= 600 ? C.warn : C.danger,
                }}>
                  {applicant?.creditScore || 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 4 }}>Branch</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{applicant?.branch || 'Unknown'}</div>
              </div>
            </div>
          </div>

          {/* Loan Details */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
              Loan Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 4 }}>Loan Amount</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.primary }}>{formatCurrency(application.amount)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 4 }}>Term</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{application.termMonths} months</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 4 }}>Interest Rate</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{application.interestRate}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 4 }}>Purpose</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{application.purpose}</div>
              </div>
            </div>
            {application.notes && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 4 }}>Notes</div>
                <div style={{
                  fontSize: 14,
                  color: C.ink,
                  background: C.surfaceAlt,
                  padding: 12,
                  borderRadius: 8,
                  lineHeight: 1.5,
                }}>
                  {application.notes}
                </div>
              </div>
            )}
          </div>

          {/* Application Metadata */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
              Application Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 4 }}>Application Number</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, fontFamily: 'monospace', background: C.surfaceAlt, padding: '4px 8px', borderRadius: 4 }}>
                  {application.applicationNumber || 'Not assigned'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 4 }}>Applied Date</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>
                  {new Date(application.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              {application.updatedAt !== application.createdAt && (
                <div>
                  <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 4 }}>Last Updated</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>
                    {new Date(application.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <button
            onClick={onClose}
            style={{
              background: C.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
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

// EDIT APPLICATION MODAL
function EditApplicationModal({ isOpen, onClose, application, applicants, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formData, setFormData] = useState({
    amount: '',
    termMonths: '',
    interestRate: '',
    purpose: '',
    hasCoSigner: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen && application) {
      setFormData({
        amount: application.amount?.toString() || '',
        termMonths: application.termMonths?.toString() || '',
        interestRate: application.interestRate || '',
        purpose: application.purpose || '',
        hasCoSigner: application.hasCoSigner === true ? 'Yes' : application.hasCoSigner === false ? 'No' : '',
        notes: application.notes || '',
      });
      setError('');
      setFieldErrors({});
      setTouched({});
    }
  }, [isOpen, application]);

  // ── Field-level validation for live feedback ──────────────────────────────────────
  const validateApplicationField = (fieldName, value, currentFormData = formData) => {
    const errors = {};

    switch (fieldName) {
      case 'amount':
        if (!value || value === '') {
          errors.amount = 'Loan amount is required';
        } else {
          const amount = parseFloat(value);
          if (isNaN(amount)) {
            errors.amount = 'Loan amount must be a valid number';
          } else if (amount < 1000) {
            errors.amount = 'Loan amount must be at least 1,000';
          } else if (amount > 10000000) {
            errors.amount = 'Loan amount cannot exceed 10,000,000';
          }
        }
        break;

      case 'termMonths':
        // OPTIONAL - only validate if provided
        if (value && value !== '') {
          const term = parseInt(value);
          const allowedTerms = [6, 12, 18, 24, 36, 48, 60];
          if (isNaN(term)) {
            errors.termMonths = 'Term must be a valid number';
          } else if (!allowedTerms.includes(term)) {
            errors.termMonths = 'Term must be one of: 6, 12, 18, 24, 36, 48, 60 months';
          }
        }
        break;

      case 'interestRate':
        // OPTIONAL - only validate if provided
        if (value && value !== '') {
          const rate = parseFloat(value);
          if (isNaN(rate)) {
            errors.interestRate = 'Interest rate must be a valid number';
          } else if (rate < 0.1) {
            errors.interestRate = 'Interest rate must be at least 0.1%';
          } else if (rate > 50) {
            errors.interestRate = 'Interest rate cannot exceed 50%';
          }
        }
        break;

      case 'purpose':
        // OPTIONAL - only validate if provided
        if (value?.trim()) {
          if (!['Auto', 'Business', 'Education', 'Home', 'Other'].includes(value)) {
            errors.purpose = 'Purpose must be one of: Auto, Business, Education, Home, Other';
          }
        }
        break;

      case 'hasCoSigner':
        // OPTIONAL - can be decided later
        // No validation needed if empty
        break;

      case 'notes':
        if (value && value.length > 500) {
          errors.notes = 'Notes cannot exceed 500 characters';
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

    // Decimal fields - Amount, Interest Rate
    if (['amount', 'interestRate'].includes(fieldName)) {
      sanitizedValue = sanitizeDecimalInput(value);
    }

    const newFormData = { ...formData, [fieldName]: sanitizedValue };
    setFormData(newFormData);

    // Mark field as touched
    setTouched(prev => ({ ...prev, [fieldName]: true }));

    // Validate this field
    const fieldError = validateApplicationField(fieldName, sanitizedValue, newFormData);

    // Update field errors
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      if (fieldError[fieldName]) {
        newErrors[fieldName] = fieldError[fieldName];
      } else {
        delete newErrors[fieldName];
      }
      return newErrors;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      // Validate form data (in edit mode, applicant is read-only, so skip that validation)
      const validationErrors = validateApplicationForm(formData, true);
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);

        // Mark all fields as touched on failed validation
        const allFields = {
          amount: true,
          termMonths: true,
          interestRate: true,
          purpose: true,
          hasCoSigner: true,
          notes: true,
        };
        setTouched(allFields);

        setLoading(false);
        return;
      }

      const payload = {
        applicantId: application.applicantId, // Keep same applicant
        amount: parseFloat(formData.amount),
        termMonths: formData.termMonths ? parseInt(formData.termMonths, 10) : null,
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : null,
        purpose: formData.purpose?.trim() || null,
        hasCoSigner: formData.hasCoSigner === 'Yes' ? true : formData.hasCoSigner === 'No' ? false : null,
        notes: formData.notes?.trim() || null,
      };

      const res = await client.put(`/api/applications/${application.id}`, payload);
      onSuccess(res.data);
      onClose();
    } catch (error) {
      console.error('Failed to update application:', error);

      // Handle backend field validation errors
      if (error.response?.data?.fieldErrors) {
        setFieldErrors(error.response.data.fieldErrors);
      } else {
        setError(error.response?.data?.message || error.message || 'Failed to update application');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !application) return null;

  const applicant = applicants.find(a => a.id === application.applicantId);

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
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: C.ink }}>Edit Application</h2>
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

        {/* Read-Only Applicant Info */}
        <div style={{
          background: C.primarySoft,
          border: `1px solid ${C.primaryMid}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, color: C.inkMid, marginBottom: 8 }}>
            Applicant (Read-Only)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>{applicant?.applicantNumber || 'Not assigned'} - {applicant?.fullName || 'Unknown'}</div>
              <div style={{ fontSize: 12, color: C.inkMid }}>{applicant?.nic || 'Unknown'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 2 }}>Credit Score</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.primary }}>{applicant?.creditScore || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 2 }}>Risk Level</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{applicant?.riskLevel || 'Unknown'}</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormInput
                label="Loan Amount (LKR) *"
                type="number"
                step="0.01"
                min="1000"
                inputMode="decimal"
                fieldName="amount"
                fieldErrors={fieldErrors}
                value={formData.amount}
                onChange={(e) => handleFieldChangeWithValidation('amount', e.target.value)}
                required
              />
              <FormSelect
                label="Term (Months)"
                fieldName="termMonths"
                fieldErrors={fieldErrors}
                value={formData.termMonths}
                onChange={(e) => handleFieldChangeWithValidation('termMonths', e.target.value)}
                options={LOAN_TERMS}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 16 }}>
              <FormInput
                label="Interest Rate"
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                fieldName="interestRate"
                fieldErrors={fieldErrors}
                value={formData.interestRate}
                onChange={(e) => handleFieldChangeWithValidation('interestRate', e.target.value)}
                placeholder="e.g., 12.5%"
              />
              <FormSelect
                label="Purpose"
                fieldName="purpose"
                fieldErrors={fieldErrors}
                value={formData.purpose}
                onChange={(e) => handleFieldChangeWithValidation('purpose', e.target.value)}
                options={LOAN_PURPOSES}
              />
              <FormSelect
                label="Has Co-Signer"
                fieldName="hasCoSigner"
                fieldErrors={fieldErrors}
                value={formData.hasCoSigner}
                onChange={(e) => handleFieldChangeWithValidation('hasCoSigner', e.target.value)}
                options={HAS_COSIGNER_OPTIONS}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: 6,
                fontWeight: 500,
                fontSize: 14,
                color: fieldErrors.notes ? C.danger : C.ink
              }}>
                Notes {fieldErrors.notes && <span style={{ color: C.danger }}>*</span>}
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => handleFieldChangeWithValidation('notes', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${fieldErrors.notes ? C.danger : C.border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  background: C.surface,
                  color: C.ink,
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
              {fieldErrors.notes && (
                <div style={{ fontSize: 12, color: C.danger, marginTop: 4 }}>
                  {fieldErrors.notes}
                </div>
              )}
              <div style={{ fontSize: 12, color: C.inkMid, marginTop: 4 }}>
                {formData.notes.length}/500 characters
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
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
                opacity: loading ? 0.6 : 1,
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

// DELETE CONFIRMATION MODAL
function DeleteConfirmModal({ isOpen, onClose, application, applicants, onConfirm, loading }) {
  if (!isOpen || !application) return null;

  const applicant = applicants.find(a => a.id === application.applicantId);
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
    }).format(amount);
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
          maxWidth: 500,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: C.dangerSoft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 28,
          }}>
            ⚠️
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, marginBottom: 8, color: C.ink }}>
            Delete Application
          </h2>
          <p style={{ fontSize: 14, color: C.inkMid, margin: 0 }}>
            Are you sure you want to delete this loan application? This action cannot be undone.
          </p>
        </div>

        {/* Application Summary */}
        <div style={{
          background: C.surfaceAlt,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
            Application Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
            <div>
              <span style={{ color: C.inkMid }}>Applicant:</span>
              <span style={{ fontWeight: 600, color: C.ink, marginLeft: 4 }}>{applicant?.applicantNumber || 'N/A'} - {applicant?.fullName || 'Unknown'}</span>
            </div>
            <div>
              <span style={{ color: C.inkMid }}>Amount:</span>
              <span style={{ fontWeight: 600, color: C.ink, marginLeft: 4 }}>{formatCurrency(application.amount)}</span>
            </div>
            <div>
              <span style={{ color: C.inkMid }}>Status:</span>
              <span style={{ fontWeight: 600, color: C.ink, marginLeft: 4, textTransform: 'capitalize' }}>{application.status.toLowerCase()}</span>
            </div>
            <div>
              <span style={{ color: C.inkMid }}>Purpose:</span>
              <span style={{ fontWeight: 600, color: C.ink, marginLeft: 4 }}>{application.purpose}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
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
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: loading ? C.inkLight : C.danger,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Deleting...' : 'Delete Application'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN APPLICATIONS PAGE
// ═══════════════════════════════════════════════════════════

export default function ApplicationsPage() {
  const navigate = useNavigate();
  const userRole = normalizeRole(getStoredUser()?.role);
  const canCreateEditSubmit = canCreateEditSubmitApplications(userRole);
  const canRunRiskAndReco = canRunRiskAndRecommendation(userRole);
  const canDecide = canMakeApplicationDecision(userRole);

  // State Management
  const [applications, setApplications] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [toast, setToast] = useState(null);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Utility Functions
  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: C.warn,
      REVIEW: C.primary,
      APPROVED: C.success,
      REJECTED: C.danger,
      CANCELLED: C.inkMid,
    };
    return colors[status] || C.inkMid;
  };

  const getStatusBg = (status) => {
    const colors = {
      PENDING: C.warnSoft,
      REVIEW: C.primarySoft,
      APPROVED: C.successSoft,
      REJECTED: C.dangerSoft,
      CANCELLED: C.surfaceAlt,
    };
    return colors[status] || C.surfaceAlt;
  };

  const getApplicantName = (applicantId) => {
    const applicant = applicants.find(a => a.id === applicantId);
    return applicant ? applicant.fullName : 'Unknown';
  };

  const getApplicantCredit = (applicantId) => {
    const applicant = applicants.find(a => a.id === applicantId);
    return applicant ? applicant.creditScore : 0;
  };

  const getApplicantNic = (applicantId) => {
    const applicant = applicants.find(a => a.id === applicantId);
    return applicant ? applicant.nic : '';
  };

  const isFinalized = (application) => {
    return ['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status);
  };

  // Data Loading
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [appsRes, applicantsRes] = await Promise.all([
        client.get('/api/applications'),
        client.get('/api/applicants')
      ]);
      setApplications(appsRes.data);
      setApplicants(applicantsRes.data);
    } catch (error) {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Event Handlers
  const handleCreateSuccess = (newApplication) => {
    setApplications(prev => [...prev, newApplication]);
    showToast('Application created successfully!', 'success');
  };

  const handleViewApplication = (application) => {
    navigate(`/applications/${application.id}`);
  };

  const handleEditApplication = (application) => {
    if (!canCreateEditSubmit) {
      showToast('Only Admin, Loan Officer, and Bank Manager can edit applications', 'error');
      return;
    }
    setSelectedApplication(application);
    setShowEditModal(true);
  };

  const handleDeleteApplication = (application) => {
    if (!canCreateEditSubmit) {
      showToast('Only Admin, Loan Officer, and Bank Manager can delete applications', 'error');
      return;
    }
    setSelectedApplication(application);
    setShowDeleteModal(true);
  };

  const handleEditSuccess = (updatedApplication) => {
    setApplications(prev => prev.map(app => app.id === updatedApplication.id ? updatedApplication : app));
    showToast(`Application updated successfully!`, 'success');
  };

  const handleConfirmDelete = async () => {
    if (!selectedApplication) return;

    setDeleteLoading(true);
    try {
      const result = await client.delete(`/api/applications/${selectedApplication.id}`);
      setApplications(prev => prev.filter(app => app.id !== selectedApplication.id));

      // Show success message with cascade deletion details
      const cascadeDeleteMessage = result.data?.totalRelatedRecordsUpdated
        ? `Application and ${result.data.totalRelatedRecordsUpdated} related records deleted successfully! (${result.data.riskAssessmentsArchived} risk assessments, ${result.data.recommendationsArchived} recommendations, ${result.data.repaymentInstallmentsArchived} repayment installments, ${result.data.repaymentPaymentsDeleted} payments)`
        : 'Application deleted successfully!';

      showToast(cascadeDeleteMessage, 'success');
      setShowDeleteModal(false);
      setSelectedApplication(null);
    } catch (error) {
      showToast(
        error?.response?.data?.message || 'Failed to delete application',
        'error'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus, reason = '') => {
    const statusCheck = validateStatusChangeByRole(userRole, newStatus);
    if (!statusCheck.allowed) {
      showToast(statusCheck.message, 'error');
      return;
    }

    try {
      await client.patch(`/api/applications/${id}/status`, {
        status: newStatus,
        reason: reason || `Status changed to ${newStatus}`,
        actor: 'staff'
      });
      await loadData(); // Reload to get fresh data
      showToast(`Application ${newStatus.toLowerCase()} successfully!`, 'success');
    } catch (error) {
      showToast('Failed to update status', 'error');
    }
  };

  // Computed Values
  const filteredApplications = applications.filter(app => {
    // Filter by status tab
    const statusMatch = activeTab === 'All' ? true : app.status === activeTab.toUpperCase();

    // Filter by search text
    if (!statusMatch) return false;

    const searchLower = searchText.trim().toLowerCase();
    if (!searchLower) return true;

    const applicantName = getApplicantName(app.applicantId).toLowerCase();
    const applicantNic = getApplicantNic(app.applicantId).toLowerCase();
    const applicationNumber = (app.applicationNumber || '').toLowerCase();
    const purpose = (app.purpose || '').toLowerCase();
    const status = app.status.toLowerCase();

    return (
      applicantName.includes(searchLower) ||
      applicantNic.includes(searchLower) ||
      applicationNumber.includes(searchLower) ||
      purpose.includes(searchLower) ||
      status.includes(searchLower)
    );
  });

  const statusTabs = ['All', 'Pending', 'Review', 'Approved', 'Rejected', 'Cancelled'];

  const stats = {
    total: applications.length,
    pending: applications.filter(app => app.status === 'PENDING').length,
    approved: applications.filter(app => app.status === 'APPROVED').length,
    rejected: applications.filter(app => app.status === 'REJECTED').length,
    totalValue: applications
      .filter(app => app.status === 'APPROVED')
      .reduce((sum, app) => sum + (app.amount || 0), 0),
  };

  return (
    <div style={{ background: C.surfaceDeep, minHeight: '100vh', padding: 24 }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <PageHeader
          title="Loan Applications"
          subtitle="Track, review, and manage loan applications across all processing stages."
        />

        {/* Compact Dashboard Summary Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <GradientSummaryCard
            title="Total Applications"
            value={stats.total}
            subtitle="Applications received"
            gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
            lineGradient="linear-gradient(90deg, #3b82f6, #60a5fa)"
            icon="📊"
            index={0}
          />
          <GradientSummaryCard
            title="Pending Review"
            value={stats.pending}
            subtitle="Awaiting review"
            gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            lineGradient="linear-gradient(90deg, #f59e0b, #fbbf24)"
            icon="⏱️"
            index={1}
          />
          <GradientSummaryCard
            title="Approved"
            value={stats.approved}
            subtitle="Ready for disbursement"
            gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
            lineGradient="linear-gradient(90deg, #10b981, #34d399)"
            icon="✅"
            index={2}
          />
          <GradientSummaryCard
            title="Rejected"
            value={stats.rejected}
            subtitle="Applications declined"
            gradient="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
            lineGradient="linear-gradient(90deg, #ef4444, #f87171)"
            icon="⚠️"
            index={3}
          />
          <GradientSummaryCard
            title="Total Approved Value"
            value={stats.totalValue}
            subtitle="Total disbursement"
            format="currency"
            gradient="linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)"
            lineGradient="linear-gradient(90deg, #9333ea, #c084fc)"
            icon="💎"
            index={4}
            valueSize={24}
          />
        </div>

        {/* Tabs and Add Button */}
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
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {statusTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? C.primary : 'transparent',
                  color: activeTab === tab ? '#fff' : C.inkMid,
                  border: activeTab === tab ? 'none' : `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                {tab}
                {tab !== 'All' && (
                  <span style={{ marginLeft: 6, opacity: 0.7 }}>
                    ({applications.filter(app => app.status === tab.toUpperCase()).length})
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!canCreateEditSubmit}
            style={{
              background: canCreateEditSubmit ? C.primary : C.inkLight,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontWeight: 600,
              cursor: canCreateEditSubmit ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: canCreateEditSubmit ? 1 : 0.6,
            }}
            title={canCreateEditSubmit ? 'Create new application' : 'Only Admin, Loan Officer, and Bank Manager can create applications'}
          >
            + New Application
          </button>
        </div>

        {/* Search Bar */}
        <div
          style={{
            background: C.surface,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            padding: 16,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: C.surfaceAlt,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              padding: '10px 14px',
            }}
          >
            <span style={{ color: C.inkMid, fontSize: 18 }}>🔍</span>
            <input
              type="text"
              placeholder="Search by applicant, application no, NIC, purpose, or status"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: C.ink,
                fontSize: 14,
                fontFamily: 'inherit',
              }}
            />
            {searchText && (
              <button
                onClick={() => setSearchText('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: C.inkMid,
                  cursor: 'pointer',
                  fontSize: 18,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Applications Table */}
        <div
          style={{
            background: C.surface,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>Loading applications...</div>
          ) : filteredApplications.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.inkMid }}>
              {searchText.trim() ? (
                <>
                  <div style={{ fontSize: 16, marginBottom: 8 }}>No loan applications found</div>
                  <div style={{ fontSize: 14, color: C.inkLight }}>Try searching with a different keyword</div>
                </>
              ) : activeTab === 'All' ? (
                'No applications yet.'
              ) : (
                `No ${activeTab.toLowerCase()} applications found.`
              )}
            </div>
          ) : (
            <div>
              {/* Table Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 2fr',
                  gap: 16,
                  padding: '16px 20px',
                  borderBottom: `1px solid ${C.border}`,
                  background: C.surfaceAlt,
                  fontWeight: 600,
                  fontSize: 12,
                  color: C.inkMid,
                  textTransform: 'uppercase',
                }}
              >
                <div>Applicant</div>
                <div>Amount</div>
                <div>Term</div>
                <div>Interest Rate</div>
                <div>Credit Score</div>
                <div>Status</div>
                <div>Actions</div>
              </div>

              {/* Table Body */}
              {filteredApplications.map((app) => (
                <div
                  key={app.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 2fr',
                    gap: 16,
                    padding: '16px 20px',
                    borderBottom: `1px solid ${C.border}`,
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: C.ink }}>{getApplicantName(app.applicantId)}</div>
                    <div style={{ fontSize: 12, color: C.inkMid, fontFamily: 'monospace', marginBottom: 4 }}>
                      {app.applicationNumber || '-'}
                    </div>
                    <div style={{ fontSize: 12, color: C.inkMid }}>{app.purpose}</div>
                    <div style={{ fontSize: 11, color: C.inkLight }}>
                      Applied: {new Date(app.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, color: C.ink }}>{formatCurrency(app.amount)}</div>
                  <div style={{ fontSize: 13 }}>{app.termMonths}m</div>
                  <div style={{ fontSize: 13 }}>{app.interestRate}</div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: getApplicantCredit(app.applicantId) >= 750 ? C.success :
                             getApplicantCredit(app.applicantId) >= 600 ? C.warn : C.danger,
                    }}
                  >
                    {getApplicantCredit(app.applicantId)}
                  </div>
                  <div>
                    <span
                      style={{
                        background: getStatusBg(app.status),
                        color: getStatusColor(app.status),
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    >
                      {app.status}
                    </span>
                  </div>

                  {/* ACTIONS COLUMN - CRUD Operations */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {/* View Button - Always available */}
                    <button
                      onClick={() => handleViewApplication(app)}
                      style={{
                        background: C.primarySoft,
                        color: C.primary,
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                      title="View Application Details"
                    >
                      Details
                    </button>

                    {/* Edit Button - Disabled for finalized applications */}
                    <button
                      onClick={() => handleEditApplication(app)}
                      disabled={isFinalized(app) || !canCreateEditSubmit}
                      style={{
                        background: (isFinalized(app) || !canCreateEditSubmit) ? C.surfaceAlt : C.warnSoft,
                        color: (isFinalized(app) || !canCreateEditSubmit) ? C.inkLight : C.warn,
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 11,
                        cursor: (isFinalized(app) || !canCreateEditSubmit) ? 'not-allowed' : 'pointer',
                        fontWeight: 500,
                        opacity: (isFinalized(app) || !canCreateEditSubmit) ? 0.5 : 1,
                      }}
                      title={isFinalized(app) ? "Finalized applications cannot be edited" : !canCreateEditSubmit ? "Only Admin, Loan Officer, and Bank Manager can edit" : "Edit Application"}
                    >
                      Edit
                    </button>

                    {/* Delete Button - Disabled for finalized applications */}
                    <button
                      onClick={() => handleDeleteApplication(app)}
                      disabled={isFinalized(app) || !canCreateEditSubmit}
                      style={{
                        background: (isFinalized(app) || !canCreateEditSubmit) ? C.surfaceAlt : C.dangerSoft,
                        color: (isFinalized(app) || !canCreateEditSubmit) ? C.inkLight : C.danger,
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 11,
                        cursor: (isFinalized(app) || !canCreateEditSubmit) ? 'not-allowed' : 'pointer',
                        fontWeight: 500,
                        opacity: (isFinalized(app) || !canCreateEditSubmit) ? 0.5 : 1,
                      }}
                      title={isFinalized(app) ? "Finalized applications cannot be deleted" : !canCreateEditSubmit ? "Only Admin, Loan Officer, and Bank Manager can delete" : "Delete Application"}
                    >
                      Delete
                    </button>

                    {/* Workflow-Based Action Buttons - Only for non-finalized applications */}

                    {/* Risk Assessment Button - Show if not finalized and risk not assessed */}
                    {!isFinalized(app) && canRunRiskAndReco &&
                     (app.riskStatus === 'NOT_ASSESSED' || app.riskStatus === null) && (
                      <button
                        onClick={() => navigate(`/risk-assessment/${app.id}`)}
                        style={{
                          background: C.warnSoft,
                          color: C.warn,
                          border: 'none',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 11,
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        Risk Assessment
                      </button>
                    )}

                    {/* Recommendation Button - Show if not finalized and risk assessed but recommendation not generated */}
                    {!isFinalized(app) && canRunRiskAndReco &&
                     app.riskStatus === 'ASSESSED' &&
                     (app.recommendationStatus === 'NOT_GENERATED' || app.recommendationStatus === null) && (
                      <button
                        onClick={() => navigate(`/recommendation-engine/${app.id}`)}
                        style={{
                          background: C.primarySoft,
                          color: C.primary,
                          border: 'none',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 11,
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        Recommendation
                      </button>
                    )}

                    {/* Recommendation Ready Indicator - Show when recommendation is generated */}
                    {app.recommendationStatus === 'GENERATED' && (
                      <span
                        style={{
                          background: C.successSoft,
                          color: C.success,
                          border: 'none',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                        title="AI recommendation has been generated and is ready for review"
                      >
                        Recommendation Ready
                      </span>
                    )}

                    {/* CHANGED: Cancel is final decision -> ADMIN/BANK_MANAGER only */}
                    {!isFinalized(app) && canDecide && (
                      <button
                        onClick={() => handleStatusUpdate(app.id, 'CANCELLED', 'Application cancelled')}
                        style={{
                          background: C.inkLight + "20",
                          color: C.inkMid,
                          border: 'none',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 11,
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        Cancel
                      </button>
                    )}

                    {/* Finalized Status Indicator */}
                    {isFinalized(app) && (
                      <span
                        style={{
                          background: C.surfaceAlt,
                          color: C.inkMid,
                          border: `1px solid ${C.border}`,
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 10,
                          fontWeight: 500,
                          fontStyle: 'italic',
                        }}
                        title="This application is finalized and read-only"
                      >
                        Read-Only
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CRUD MODALS */}

      {/* Create Application Modal */}
      <CreateApplicationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* View Application Modal */}
      <ViewApplicationModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedApplication(null);
        }}
        application={selectedApplication}
        applicants={applicants}
      />

      {/* Edit Application Modal */}
      <EditApplicationModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedApplication(null);
        }}
        application={selectedApplication}
        applicants={applicants}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedApplication(null);
        }}
        application={selectedApplication}
        applicants={applicants}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
