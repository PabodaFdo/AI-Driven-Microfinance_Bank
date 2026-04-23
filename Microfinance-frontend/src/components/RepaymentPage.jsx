import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { applicationsApi } from '../services/apiService';
import {
  generateRepaymentSchedule,
  getRepaymentSchedule,
  recordRepaymentPayment,
  getOverdueRepayments,
  processOverdues,
  closeRepaymentSchedule,
  voidRepaymentPayment,
} from '../services/repaymentService';
import { getStoredUser } from '../services/authService';
import { StatCard } from './StatCard';
import { PageHeader } from './PageHeader';

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

function Toast({ message, type = "info", onClose }) {
  const bgColor = type === "error" ? C.dangerSoft : type === "success" ? C.successSoft : C.primarySoft;
  const textColor = type === "error" ? C.danger : type === "success" ? C.success : C.primary;
  const borderColor = type === "error" ? C.danger : type === "success" ? C.success : C.primary;

  return (
    <div style={{
      position: "fixed", top: 24, right: 24,
      background: C.surface,
      color: textColor,
      padding: "14px 20px",
      borderRadius: 12,
      boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
      zIndex: 9999,
      fontWeight: 500,
      fontSize: 14,
      display: "flex", alignItems: "center", gap: 12,
      borderLeft: `4px solid ${borderColor}`,
      minWidth: 280,
    }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{
        background: "none", border: "none", color: C.inkLight,
        cursor: "pointer", fontSize: 18, fontWeight: "bold", lineHeight: 1,
        padding: "0 2px",
      }}>×</button>
    </div>
  );
}

function Button({ children, onClick, disabled = false, variant = "primary", type = "button", style = {}, ...props }) {
  const getStyles = () => {
    if (disabled) return {
      background: C.surfaceDeep, color: C.inkLight,
      border: `1px solid ${C.border}`, cursor: "not-allowed", opacity: 0.65,
    };
    switch (variant) {
      case "secondary": return {
        background: C.surface, color: C.inkMid,
        border: `1px solid ${C.borderMid}`,
      };
      case "danger": return {
        background: C.danger, color: "#fff", border: "none",
        boxShadow: "0 2px 8px rgba(220,38,38,0.25)",
      };
      case "success": return {
        background: C.success, color: "#fff", border: "none",
        boxShadow: "0 2px 8px rgba(5,150,105,0.25)",
      };
      default: return {
        background: C.primary, color: "#fff", border: "none",
        boxShadow: "0 2px 8px rgba(19,88,255,0.25)",
      };
    }
  };

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        padding: "12px 20px",
        borderRadius: 12,
        fontWeight: 600,
        fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        lineHeight: 1.4,
        ...getStyles(),
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

function SectionCard({ children, style = {} }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ title, icon, subtitle, action }) {
  return (
    <div style={{
      padding: "20px 24px 16px",
      borderBottom: `1px solid ${C.border}`,
      background: C.surfaceAlt,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {icon && (
          <span style={{
            width: 36, height: 36, borderRadius: 10,
            background: C.primarySoft,
            color: C.primary,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
          }}>
            {icon}
          </span>
        )}
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 13, color: C.inkLight, marginTop: 3 }}>{subtitle}</div>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}


function StatusBadge({ status }) {
  const value = (status || '').toUpperCase();

  const getColors = () => {
    switch (value) {
      case 'PAID':
      case 'CLOSED':
      case 'RECORDED':
        return { bg: C.successSoft, color: C.success, border: "#6EE7B7" };
      case 'PARTIAL':
        return { bg: C.primarySoft, color: C.primary, border: C.primaryMid };
      case 'OVERDUE':
        return { bg: C.danger, color: '#fff', border: C.danger };
      case 'VOIDED':
        return { bg: C.surfaceDeep, color: C.inkMid, border: C.borderMid };
      default:
        return { bg: C.warnSoft, color: C.warn, border: "#FDE68A" };
    }
  };

  const colors = getColors();

  return (
    <span style={{
      backgroundColor: colors.bg,
      color: colors.color,
      border: `1px solid ${colors.border}`,
      padding: '4px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.6px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: colors.color,
        display: 'inline-block',
      }} />
      {value || 'UNKNOWN'}
    </span>
  );
}

function formatCurrency(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
  }).format(num);
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

// Helper function to get the current logged-in user's display name
function getCurrentUserDisplayName() {
  const user = getStoredUser();
  if (!user) return 'Staff User'; // Fallback if no user found
  
  // Priority order: fullName > name > username > email
  return user.fullName || user.name || user.username || user.email || 'Staff User';
}

function emptyPaymentForm(applicationId = '', installmentNumber = '', applicationNumber = '', lateFee = 0) {
  return {
    applicationId,
    applicationNumber,
    installmentNumber: installmentNumber || '',
    amountPaid: '',
    lateFeeDue: lateFee ? lateFee.toString() : '0',
    paymentDate: new Date().toISOString().split('T')[0],
    recordedBy: getCurrentUserDisplayName(),
    notes: '',
  };
}

// ═══════════════════════════════════════════════════════════
// PAYMENT FORM VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const blockInvalidNumberKeys = (e, fieldName) => {
  const invalidKeys = ["e", "E", "+", "-"];

  if (invalidKeys.includes(e.key)) {
    e.preventDefault();
    return;
  }

  // Period field (installmentNumber) should not allow decimal point
  if (fieldName === "installmentNumber" && e.key === ".") {
    e.preventDefault();
  }
};

const sanitizeNumericInput = (fieldName, value) => {
  if (value === "") return "";

  // For installment number, only allow digits
  if (fieldName === "installmentNumber") {
    return value.replace(/[^\d]/g, "");
  }

  // For amount fields, allow digits and at most one decimal point
  let sanitized = value.replace(/[^\d.]/g, "");
  const parts = sanitized.split(".");

  if (parts.length > 2) {
    sanitized = `${parts[0]}.${parts.slice(1).join("")}`;
  }

  return sanitized;
};

const validateNumberField = (fieldName, value, selectedInstallment = null) => {
  const trimmed = String(value ?? "").trim();

  if (trimmed === "") return "This field is required";
  if (isNaN(trimmed)) return "Must be a valid number";

  const num = Number(trimmed);

  if (num < 0) return "Cannot be negative";

  // Allow 0 for lateFeeDue, but require > 0 for other fields
  if (fieldName !== "lateFeeDue" && num === 0) return "Must be greater than 0";

  if (fieldName === "installmentNumber") {
    if (!Number.isInteger(num)) return "Installment number must be a whole number";
    if (num < 1) return "Installment number must be at least 1";
  }

  if (fieldName === "amountPaid") {
    if (num < 0.01) return "Amount must be at least 0.01";
    if (selectedInstallment && num > Number(selectedInstallment.remainingAmount)) {
      return `Cannot exceed remaining amount of ${formatCurrency(selectedInstallment.remainingAmount)}`;
    }
  }

  if (fieldName === "lateFeeDue") {
    if (selectedInstallment && num > Number(selectedInstallment.lateFee)) {
      return `Cannot exceed installment late fee of ${formatCurrency(selectedInstallment.lateFee)}`;
    }
  }

  return "";
};

const validatePaymentField = (fieldName, value, selectedInstallment = null) => {
  let error = "";

  if (fieldName === "installmentNumber" || fieldName === "amountPaid" || fieldName === "lateFeeDue") {
    error = validateNumberField(fieldName, value, selectedInstallment);
  }

  if (fieldName === "recordedBy") {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) {
      error = "Recorded by is required";
    }
  }

  if (fieldName === "paymentDate") {
    if (!value) {
      error = "Payment date is required";
    } else {
      const selectedDate = new Date(value);
      const today = new Date();
      // Set time to midnight for fair comparison
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        error = "Payment date cannot be in the future";
      }
    }
  }

  return error;
};

const isPaymentFormValid = (form, selectedInstallment) => {
  // Check required fields
  const amountError = validateNumberField("amountPaid", form.amountPaid, selectedInstallment);
  const lateFeeError = validateNumberField("lateFeeDue", form.lateFeeDue, selectedInstallment);
  const installmentError = validateNumberField("installmentNumber", form.installmentNumber);
  const recordedByTrimmed = String(form.recordedBy ?? "").trim();
  const paymentDateError = validatePaymentField("paymentDate", form.paymentDate, selectedInstallment);

  return !amountError && !lateFeeError && !installmentError && recordedByTrimmed.length > 0 && !paymentDateError;
};

// ═══════════════════════════════════════════════════════════
// AUTO-INSTALLMENT SELECTION HELPER
// ═══════════════════════════════════════════════════════════

function getNextPayableInstallment(schedule) {
  if (!schedule || schedule.length === 0) return null;
  
  // Step 1: Check for overdue installments with remaining balance
  const overdue = schedule
    .filter(i => i.status === 'OVERDUE' && parseFloat(i.remainingAmount || 0) > 0)
    .sort((a, b) => a.installmentNumber - b.installmentNumber);

  if (overdue.length > 0) {
    console.log("✓ Found overdue installment:", overdue[0]);
    return overdue[0];
  }

  // Step 2: Check for next pending installment with remaining balance
  const pending = schedule
    .filter(i => parseFloat(i.remainingAmount || 0) > 0)
    .sort((a, b) => a.installmentNumber - b.installmentNumber);

  if (pending.length > 0) {
    console.log("✓ Found next pending installment:", pending[0]);
    return pending[0];
  }

  console.log("ℹ No payable installments found");
  return null;
}

export default function RepaymentPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [schedule, setSchedule] = useState([]);
  const [overdues, setOverdues] = useState([]);
  const [approvedApplications, setApprovedApplications] = useState([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [loading, setLoading] = useState(Boolean(applicationId));
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [needsGeneration, setNeedsGeneration] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm(applicationId || ''));
  const [paymentFormErrors, setPaymentFormErrors] = useState({});

  // Edit/Delete payment state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editPaymentForm, setEditPaymentForm] = useState({
    amountPaid: '',
    paymentDate: '',
    recordedBy: '',
    notes: '',
  });
  const [editPaymentErrors, setEditPaymentErrors] = useState({});
  
  // Void payment state
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [paymentToVoid, setPaymentToVoid] = useState(null);
  const [voidForm, setVoidForm] = useState({
    voidedBy: '',
    voidReason: '',
  });
  const [voidErrors, setVoidErrors] = useState({});
  const [updatingPayment, setUpdatingPayment] = useState(false);
  
  // Pagination state
  const [overduePagination, setOverduePagination] = useState({ page: 0, size: 10, totalPages: 0, totalElements: 0 });

  // Application details and selected installment state
  const [applicationDetails, setApplicationDetails] = useState(null);
  const [selectedInstallment, setSelectedInstallment] = useState(null);

  // New improvement states
  const [applicationSearch, setApplicationSearch] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });

  const loadOverdues = async (page = 0, size = 10) => {
    try {
      const data = await getOverdueRepayments(page, size);
      setOverdues(Array.isArray(data) ? data : (data?.content || []));

      // Handle pagination metadata
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setOverduePagination({
          page: data.pageable?.pageNumber || 0,
          size: data.size || size,
          totalPages: data.totalPages || 0,
          totalElements: data.totalElements || 0,
        });
      } else {
        setOverduePagination({ page: 0, size, totalPages: 1, totalElements: Array.isArray(data) ? data.length : 0 });
      }
    } catch (err) {
      setOverdues([]);
      setOverduePagination({ page: 0, size, totalPages: 0, totalElements: 0 });
    }
  };

  const loadApprovedApplications = async () => {
    try {
      const data = await applicationsApi.list();
      const apps = Array.isArray(data) ? data : (data?.content || []);
      const approvedOnly = apps.filter(app => app.status === 'APPROVED');
      setApprovedApplications(approvedOnly);
    } catch (err) {
      setApprovedApplications([]);
    }
  };

  const loadApplicationDetails = async (id) => {
    try {
      const details = await applicationsApi.getDetails(id);
      setApplicationDetails(details?.application || details);
    } catch (err) {
      setApplicationDetails(null);
    }
  };

  const loadApplicationData = async (id) => {
    setLoading(true);
    try {
      const scheduleData = await getRepaymentSchedule(id);
      const scheduleArray = Array.isArray(scheduleData) ? scheduleData : (scheduleData?.content || []);

      // Update schedule (this will show the recalculated installment statuses)
      setSchedule(scheduleArray);
      
      // *** AUTO-SELECT NEXT PAYABLE INSTALLMENT ***
      const nextPayableInstallment = getNextPayableInstallment(scheduleArray);
      if (nextPayableInstallment) {
        setPaymentForm(prev => ({
          ...prev,
          installmentNumber: nextPayableInstallment.installmentNumber || '',
          lateFeeDue: nextPayableInstallment.lateFee ? nextPayableInstallment.lateFee.toString() : '0'
        }));
        setSelectedInstallment(nextPayableInstallment);
        console.log("✓ Auto-selected installment:", nextPayableInstallment.installmentNumber);
      }
      
      setNeedsGeneration(scheduleArray.length === 0);

    } catch (err) {
      // Check if this is a "not found" error (schedule doesn't exist yet)
      const isNotFound = err?.response?.status === 404 || err.message?.includes('not found') || err.message?.includes('404');

      if (isNotFound) {
        // No schedule exists yet - this is expected for old approved applications
        setSchedule([]);
        setNeedsGeneration(true);
      } else {
        // This is a real error
        setToast({ type: 'error', message: err.message || 'Failed to load repayment data.' });
        setSchedule([]);
        setNeedsGeneration(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverdues(0, 10); // Use fixed initial values to avoid stale pagination

    if (applicationId) {
      loadApplicationDetails(applicationId);
      loadApplicationData(applicationId);
      setPaymentForm(emptyPaymentForm(applicationId, '', applicationDetails?.applicationNumber || ''));
    } else {
      loadApprovedApplications();
    }
  }, [applicationId]); // Remove overduePagination from dependencies to avoid stale values

  // Sync payment form recordedBy field with current logged-in user
  useEffect(() => {
    const currentUser = getCurrentUserDisplayName();
    setPaymentForm(prev => ({
      ...prev,
      recordedBy: currentUser
    }));
  }, []); // Run once on component mount

  // *** AUTO-SYNC LATE FEE WITH SELECTED INSTALLMENT ***
  useEffect(() => {
    if (selectedInstallment) {
      setPaymentForm(prev => ({
        ...prev,
        lateFeeDue: selectedInstallment.lateFee ? selectedInstallment.lateFee.toString() : '0'
      }));
      console.log("✓ Late fee synced with installment:", selectedInstallment.lateFee || 0);
    }
  }, [selectedInstallment]); // Run when selectedInstallment changes

  const summary = useMemo(() => {
    const totalInstallments = schedule.length;
    const totalPaid = schedule.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
    const totalRemaining = schedule.reduce((sum, item) => sum + Number(item.remainingAmount || 0), 0);
    const totalLateFee = schedule.reduce((sum, item) => sum + Number(item.lateFee || 0), 0);
    const overdueCount = schedule.filter(item => item.status === 'OVERDUE').length;

    // Improved summary fallback - use applicationDetails.applicationNumber when schedule is empty
    const applicationNumber = schedule[0]?.applicationNumber || applicationDetails?.applicationNumber || '—';

    // Find next due installment (PENDING with earliest due date)
    const nextDueInstallment = schedule
      .filter(item => item.status === 'PENDING' || item.status === 'PARTIAL')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

    return {
      applicationNumber,
      totalInstallments,
      totalPaid,
      totalRemaining,
      totalLateFee,
      overdueCount,
      nextDueInstallment,
      canClose: totalInstallments > 0 && totalRemaining <= 0 && totalLateFee <= 0,
    };
  }, [schedule, applicationDetails]);

  // Filtered applications for search
  const filteredApplications = useMemo(() => {
    if (!applicationSearch.trim()) return approvedApplications;
    const searchLower = applicationSearch.toLowerCase();
    return approvedApplications.filter(app =>
      (app.applicationNumber || '').toLowerCase().includes(searchLower) ||
      (app.fullName || app.applicantName || '').toLowerCase().includes(searchLower) ||
      (app.nic || '').toLowerCase().includes(searchLower)
    );
  }, [approvedApplications, applicationSearch]);

  // Selected application for preview
  const selectedApplication = useMemo(() => {
    return approvedApplications.find(app => app.id === selectedApplicationId);
  }, [approvedApplications, selectedApplicationId]);

  // Filtered schedule for installment filters
  const filteredSchedule = useMemo(() => {
    let filtered = scheduleFilter === 'All' ? schedule : schedule.filter(item => {
      switch (scheduleFilter) {
        case 'Pending': return item.status === 'PENDING';
        case 'Partial': return item.status === 'PARTIAL';
        case 'Paid': return item.status === 'PAID';
        case 'Overdue': return item.status === 'OVERDUE';
        case 'Closed': return item.status === 'CLOSED';
        default: return true;
      }
    });

    // Apply sorting
    if (sortConfig.field) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a[sortConfig.field];
        let bValue = b[sortConfig.field];

        // Handle different field types
        if (sortConfig.field === 'installmentNumber' || sortConfig.field === 'remainingAmount') {
          aValue = Number(aValue);
          bValue = Number(bValue);
        } else if (sortConfig.field === 'dueDate') {
          aValue = new Date(aValue || 0).getTime();
          bValue = new Date(bValue || 0).getTime();
        } else if (sortConfig.field === 'status') {
          // Sort status by priority: OVERDUE > PARTIAL > PENDING > PAID > CLOSED
          const statusPriority = { OVERDUE: 5, PARTIAL: 4, PENDING: 3, PAID: 2, CLOSED: 1 };
          aValue = statusPriority[aValue] || 0;
          bValue = statusPriority[bValue] || 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [schedule, scheduleFilter, sortConfig]);

  // Enhanced summary with completion percentage, last payment, total interest
  const enhancedSummary = useMemo(() => {
    const totalInstallments = schedule.length;
    const paidInstallments = schedule.filter(item => item.status === 'PAID' || item.status === 'CLOSED').length;
    const completionPercentage = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;

    const totalInterest = schedule.reduce((sum, item) => sum + Number(item.interestPortion || 0), 0);

    // Note: Payment history moved to PaymentHistoryPage, no longer available here
    const lastPaymentDate = null;

    return {
      completionPercentage,
      totalInterest,
      lastPaymentDate,
    };
  }, [schedule]);

  const openPaymentForm = (installment = null) => {
    // *** ALWAYS AUTO-SELECT NEXT PAYABLE INSTALLMENT ***
    const nextPayableInstallment = getNextPayableInstallment(schedule);
    
    if (!nextPayableInstallment) {
      setToast({ type: 'error', message: 'No payable installments found. All installments may be fully paid.' });
      return;
    }

    console.log("✓ Payment Form Opened - Auto-Selected Next Payable Installment:");
    console.log("  - Application ID:", nextPayableInstallment.applicationId || applicationId);
    console.log("  - Application Number:", nextPayableInstallment.applicationNumber || applicationDetails?.applicationNumber);
    console.log("  - Installment #:", nextPayableInstallment.installmentNumber);
    console.log("  - Status:", nextPayableInstallment.status);
    console.log("  - Due Date:", nextPayableInstallment.dueDate);
    console.log("  - Remaining Amount:", nextPayableInstallment.remainingAmount);
    console.log("  - Late Fee Due:", nextPayableInstallment.lateFee);

    setSelectedInstallment(nextPayableInstallment);
    setPaymentForm(emptyPaymentForm(
      nextPayableInstallment.applicationId || applicationId || '',
      nextPayableInstallment.installmentNumber || '',
      nextPayableInstallment.applicationNumber || applicationDetails?.applicationNumber || '',
      nextPayableInstallment.lateFee || 0
    ));
    
    setPaymentFormErrors({});
    setShowPaymentForm(true);
  };

  const refreshCurrent = async () => {
    if (!applicationId) {
      await loadOverdues(overduePagination.page, overduePagination.size);
      return;
    }
    try {
      await processOverdues(applicationId);
    } catch (_) {
    }
    await loadApplicationData(applicationId);
    await loadOverdues(overduePagination.page, overduePagination.size);
  };

  const handleGenerateSchedule = async () => {
    if (!applicationId) return;
    setGenerating(true);
    try {
      await generateRepaymentSchedule(applicationId);
      setToast({ type: 'success', message: 'Repayment schedule generated successfully.' });
      await loadApplicationData(applicationId);
      setNeedsGeneration(false);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to generate repayment schedule.' });
    } finally {
      setGenerating(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    // Validate all form fields before submission
    const fieldsToCheck = ['installmentNumber', 'amountPaid', 'lateFeeDue', 'paymentDate', 'recordedBy'];
    const errors = {};
    let hasErrors = false;

    fieldsToCheck.forEach((field) => {
      const error = validatePaymentField(field, paymentForm[field], selectedInstallment);
      if (error) {
        errors[field] = error;
        hasErrors = true;
      }
    });

    setPaymentFormErrors(errors);

    if (hasErrors) {
      setToast({
        type: 'error',
        message: 'Please fix the form errors below before submitting.',
      });
      return;
    }

    // Additional validation when selected installment exists
    if (selectedInstallment) {
      const amountPaid = Number(paymentForm.amountPaid);
      const remainingAmount = Number(selectedInstallment.remainingAmount);
      const lateFeeDue = Number(paymentForm.lateFeeDue);
      const lateFeeMax = Number(selectedInstallment.lateFee);

      if (amountPaid > remainingAmount) {
        setToast({
          type: 'error',
          message: `Payment amount cannot exceed remaining amount of ${formatCurrency(remainingAmount)}.`
        });
        return;
      }

      if (lateFeeDue > lateFeeMax) {
        setToast({
          type: 'error',
          message: `Late fee cannot exceed ${formatCurrency(lateFeeMax)}.`
        });
        return;
      }
    }

    setSaving(true);
    try {
      // Log payment information being submitted
      if (selectedInstallment) {
        console.log("📤 Submitting Payment:");
        console.log("  - Installment #:", paymentForm.installmentNumber);
        console.log("  - Amount Paid:", paymentForm.amountPaid);
        console.log("  - Late Fee Due:", paymentForm.lateFeeDue);
        console.log("  - Installment Late Fee Max:", selectedInstallment.lateFee);
        console.log("  - Payment Date:", paymentForm.paymentDate);
        console.log("  - Recorded By:", paymentForm.recordedBy);
      }

      const paymentResult = await recordRepaymentPayment({
        applicationId: paymentForm.applicationId,
        installmentNumber: Number(paymentForm.installmentNumber),
        amountPaid: Number(paymentForm.amountPaid),
        lateFeePaid: Number(paymentForm.lateFeeDue),
        paymentDate: paymentForm.paymentDate,
        recordedBy: paymentForm.recordedBy || 'staff',
        notes: paymentForm.notes || '',
      });

      // Payment success summary
      const successMessage = `Payment recorded successfully! Reference: ${paymentResult.paymentReference || 'N/A'}, Installment: #${paymentForm.installmentNumber}, Amount: ${formatCurrency(paymentForm.amountPaid)}, Late Fee: ${formatCurrency(paymentForm.lateFeeDue)}, Date: ${formatDate(paymentForm.paymentDate)}`;

      console.log("✅ Payment Recorded:", successMessage);
      setToast({ type: 'success', message: successMessage });
      setShowPaymentForm(false);
      setPaymentFormErrors({});
      setSelectedInstallment(null);
      await refreshCurrent();
      
      // *** AUTO-SELECT NEXT PAYABLE INSTALLMENT AFTER REFRESH ***
      // Wait a moment for the refreshCurrent to complete and update the schedule
      setTimeout(() => {
        const updatedSchedule = schedule; // This should be updated by refreshCurrent
        const nextPayableInstallment = getNextPayableInstallment(updatedSchedule);
        if (nextPayableInstallment) {
          setPaymentForm(emptyPaymentForm(
            applicationId, 
            nextPayableInstallment.installmentNumber, 
            applicationDetails?.applicationNumber || '',
            nextPayableInstallment.lateFee || 0
          ));
          setSelectedInstallment(nextPayableInstallment);
          console.log("✓ Auto-selected next installment after payment:", nextPayableInstallment.installmentNumber);
        }
      }, 500);
    } catch (err) {
      console.error("❌ Payment Recording Failed:", err);
      setToast({ type: 'error', message: err.message || 'Failed to record payment.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSchedule = async () => {
    // Add close confirmation with window.confirm
    if (!summary.canClose) {
      setToast({
        type: 'error',
        message: 'Cannot close repayment schedule because there are unpaid installments or late fees.'
      });
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to close this repayment schedule? This action will mark all installments as closed and archive the schedule.'
    );

    if (!confirmed) return;

    if (!applicationId) return;
    setClosing(true);
    try {
      await closeRepaymentSchedule(applicationId);
      setToast({ type: 'success', message: 'Repayment schedule closed successfully.' });
      await refreshCurrent();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to close repayment schedule.' });
    } finally {
      setClosing(false);
    }
  };

  // Pagination handlers
  const handleOverduePrevious = () => {
    if (overduePagination.page > 0) {
      loadOverdues(overduePagination.page - 1, overduePagination.size);
    }
  };

  const handleOverdueNext = () => {
    if (overduePagination.page < overduePagination.totalPages - 1) {
      loadOverdues(overduePagination.page + 1, overduePagination.size);
    }
  };

  // Payment form convenience functions
  const handlePayFullInstallment = () => {
    if (selectedInstallment) {
      setPaymentForm(prev => ({
        ...prev,
        amountPaid: selectedInstallment.remainingAmount.toString(),
      }));
    }
  };

  const handlePayLateFeeOnly = () => {
    if (selectedInstallment) {
      console.log("📌 Pay Late Fee Only - Selected Installment:");
      console.log("  - Installment #:", selectedInstallment.installmentNumber);
      console.log("  - Late Fee Due:", selectedInstallment.lateFee);
      console.log("  - Status:", selectedInstallment.status);
      setPaymentForm(prev => ({
        ...prev,
        amountPaid: selectedInstallment.lateFee ? selectedInstallment.lateFee.toString() : '0',
        lateFeeDue: selectedInstallment.lateFee ? selectedInstallment.lateFee.toString() : '0'
      }));
    }
  };

  const handlePayRemainingBalance = () => {
    if (selectedInstallment) {
      setPaymentForm(prev => ({
        ...prev,
        amountPaid: selectedInstallment.remainingAmount.toString(),
      }));
    }
  };

  const handleClosePaymentForm = () => {
    setShowPaymentForm(false);
    setSelectedInstallment(null);
    setPaymentFormErrors({});
    
    // *** AUTO-SELECT NEXT PAYABLE INSTALLMENT ON CLOSE ***
    const nextPayableInstallment = getNextPayableInstallment(schedule);
    if (nextPayableInstallment) {
      setPaymentForm(emptyPaymentForm(
        applicationId, 
        nextPayableInstallment.installmentNumber, 
        applicationDetails?.applicationNumber || '',
        nextPayableInstallment.lateFee || 0
      ));
      setSelectedInstallment(nextPayableInstallment);
    } else {
      setPaymentForm(emptyPaymentForm(applicationId, '', applicationDetails?.applicationNumber || ''));
    }
  };

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    // Sanitize numeric inputs
    if (name === "installmentNumber" || name === "amountPaid" || name === "lateFeeDue") {
      newValue = sanitizeNumericInput(name, value);
    }

    setPaymentForm((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // CRITICAL: When installment number is entered, find and load that installment's data
    if (name === "installmentNumber" && newValue.trim() !== "") {
      const installmentNum = Number(newValue);
      const foundInstallment = schedule.find(item => item.installmentNumber === installmentNum);

      if (foundInstallment) {
        console.log("✓ Selected installment found:", foundInstallment);
        console.log("  - Installment Number:", foundInstallment.installmentNumber);
        console.log("  - Status:", foundInstallment.status);
        console.log("  - Due Date:", foundInstallment.dueDate);
        console.log("  - Remaining Amount:", foundInstallment.remainingAmount);
        console.log("  - Late Fee Due:", foundInstallment.lateFee);

        // Update selectedInstallment with the found installment (includes lateFee)
        setSelectedInstallment(foundInstallment);

        // Auto-populate lateFeeDue field with the installment's late fee
        setPaymentForm((prev) => ({
          ...prev,
          lateFeeDue: foundInstallment.lateFee > 0 ? foundInstallment.lateFee.toString() : '0',
        }));
      } else {
        console.warn("⚠ Installment number not found in schedule:", installmentNum);
        setSelectedInstallment(null);
        setPaymentForm((prev) => ({
          ...prev,
          lateFeeDue: '',
        }));
      }
    }

    // Validate on change
    const error = validatePaymentField(name, newValue, selectedInstallment);
    setPaymentFormErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const handlePaymentBlur = (e) => {
    const { name, value } = e.target;

    // CRITICAL: When installment number loses focus, ensure the installment is loaded
    if (name === "installmentNumber" && value.trim() !== "") {
      const installmentNum = Number(value);
      const foundInstallment = schedule.find(item => item.installmentNumber === installmentNum);

      if (foundInstallment && !selectedInstallment) {
        console.log("ⓘ Installment loaded on blur:", foundInstallment.installmentNumber);
        console.log("  - Late Fee Due:", foundInstallment.lateFee);
        setSelectedInstallment(foundInstallment);
      }
    }

    const error = validatePaymentField(name, value, selectedInstallment);
    setPaymentFormErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  // Sorting functionality
  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // CSV escape function for safer exports
  const escapeCSV = (value) => {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Export functions
  const exportScheduleCSV = () => {
    if (schedule.length === 0) return;

    const csvContent = [
      ['Installment No', 'Due Date', 'Installment Amount', 'Principal', 'Interest', 'Paid Amount', 'Remaining', 'Late Fee', 'Status'],
      ...schedule.map(item => [
        escapeCSV(item.installmentNumber),
        escapeCSV(formatDate(item.dueDate)),
        escapeCSV(item.installmentAmount),
        escapeCSV(item.principalPortion),
        escapeCSV(item.interestPortion),
        escapeCSV(item.paidAmount),
        escapeCSV(item.remainingAmount),
        escapeCSV(item.lateFee),
        escapeCSV(item.status)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `repayment-schedule-${summary.applicationNumber}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // === REMOVED: Export Payment History CSV - Moved to PaymentHistoryPage ===

  // Void Payment Handlers (Audit-Safe Approach)
  const openVoidModal = (payment) => {
    setPaymentToVoid(payment);
    setVoidForm({
      voidedBy: getCurrentUserDisplayName(),
      voidReason: '',
    });
    setVoidErrors({});
    setShowVoidModal(true);
  };

  const closeVoidModal = () => {
    setShowVoidModal(false);
    setPaymentToVoid(null);
    setVoidForm({
      voidedBy: getCurrentUserDisplayName(),
      voidReason: '',
    });
    setVoidErrors({});
  };

  const validateVoidForm = () => {
    // Amount Paid validation
    if (fieldName === 'amountPaid') {
      if (value === '' || value === null || value === undefined) {
        return 'Amount paid is required';
      }
      const amount = Number(value);
      if (isNaN(amount)) {
        return 'Amount must be a valid number';
      }
      if (amount <= 0) {
        return 'Amount must be greater than 0';
      }
      if (amount < 0.01) {
        return 'Amount must be at least 0.01';
      }
      if (amount > 999999999.99) {
        return 'Amount exceeds maximum allowed value';
      }
      // Additional check: if we have editingPaymentRef and installment info, validate max
      if (editingPaymentRef && editingPaymentRef.maxAmount && amount > editingPaymentRef.maxAmount) {
        return `Cannot exceed maximum of ${formatCurrency(editingPaymentRef.maxAmount)}`;
      }
    }

    // Payment Date validation
    if (fieldName === 'paymentDate') {
      if (!value) {
        return 'Payment date is required';
      }
      const selectedDate = new Date(value);
      const today = new Date();
      // Midnight comparison for fair date check
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        return 'Payment date cannot be in the future';
      }
    }

    // Recorded By validation
    if (fieldName === 'recordedBy') {
      const trimmed = String(value || '').trim();
      if (!trimmed) {
        return 'Recorded by is required and cannot be blank';
      }
      if (trimmed.length > 100) {
        return 'Recorded by cannot exceed 100 characters';
      }
    }

    // Notes validation (optional but max length)
    if (fieldName === 'notes') {
      const trimmed = String(value || '').trim();
      if (trimmed.length > 500) {
        return 'Notes cannot exceed 500 characters';
      }
    }

    return '';
  };

  // Void Payment Handlers - Replace the edit/delete functionality
  const validateVoidFormReplacement = () => {
    const errors = {};

    // voidedBy validation removed - it's auto-filled from logged-in user and read-only

    if (!String(voidForm.voidReason || '').trim()) {
      errors.voidReason = 'Void reason is required';
    }

    if (String(voidForm.voidReason || '').trim().length > 500) {
      errors.voidReason = 'Void reason cannot exceed 500 characters';
    }

    setVoidErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleVoidPayment = async (e) => {
    e.preventDefault();

    if (!paymentToVoid) return;
    if (!validateVoidFormReplacement()) return;

    setUpdatingPayment(true);
    try {
      await voidRepaymentPayment(paymentToVoid.id, {
        voidedBy: voidForm.voidedBy.trim(),
        voidReason: voidForm.voidReason.trim(),
      });

      setToast({
        type: 'success',
        message: `Payment ${paymentToVoid.paymentReference} was voided successfully.`,
      });

      closeVoidModal();
      await refreshCurrent();
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to void payment.',
      });
    } finally {
      setUpdatingPayment(false);
    }
  };

  // Edit Payment Handlers (DISABLED FOR AUDIT-SAFE APPROACH)
  const closeEditPaymentModal = () => {
    // Stub function - edit functionality disabled for audit safety
  };

  const validateEditPaymentField = (fieldName, value, payment = null) => {
    // Stub function - edit functionality disabled for audit safety
    return '';
  };

  const updateRepaymentPayment = async (paymentId, payload) => {
    // Stub function - edit functionality disabled for audit safety
    throw new Error('Edit functionality is disabled for audit safety');
  };

  // Helper to map backend field errors to form errors
  const mapBackendFieldErrors = (errorResponse) => {
    const fieldErrors = {};

    // If backend returns fieldErrors object
    if (errorResponse?.fieldErrors && typeof errorResponse.fieldErrors === 'object') {
      Object.keys(errorResponse.fieldErrors).forEach(fieldName => {
        fieldErrors[fieldName] = errorResponse.fieldErrors[fieldName];
      });
    }
    // If error message contains field info, try to extract
    else if (errorResponse?.message) {
      const msg = errorResponse.message;
      if (msg.toLowerCase().includes('amount')) {
        fieldErrors.amountPaid = msg;
      } else if (msg.toLowerCase().includes('date')) {
        fieldErrors.paymentDate = msg;
      } else if (msg.toLowerCase().includes('recorded')) {
        fieldErrors.recordedBy = msg;
      } else if (msg.toLowerCase().includes('note')) {
        fieldErrors.notes = msg;
      }
    }

    return fieldErrors;
  };

  const handleEditPaymentInputChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    // Sanitize based on field type
    if (name === 'amountPaid') {
      // Only allow digits and one decimal point
      newValue = sanitizeNumericInput('amountPaid', value);
    } else if (name === 'recordedBy') {
      // Trim excessive whitespace but keep reasonable field length
      newValue = value; // Keep as-is, trim on submit
    } else if (name === 'notes') {
      // Notes can have any characters, just limit length
      if (newValue.length > 500) {
        newValue = newValue.substring(0, 500);
      }
    }

    // Update form state
    setEditPaymentForm(prev => ({ ...prev, [name]: newValue }));

    // Validate on change
    const error = validateEditPaymentField(name, newValue, editingPayment);
    setEditPaymentErrors(prev => ({ ...prev, [name]: error }));
  };

  // Handler for number input keydown - block invalid keys
  const handleEditPaymentKeyDown = (e, fieldName) => {
    blockInvalidNumberKeys(e, fieldName);
  };

  // Blur handler for additional validation
  const handleEditPaymentBlur = (fieldName) => {
    let value = editPaymentForm[fieldName];

    // Trim whitespace for text fields
    if ((fieldName === 'recordedBy' || fieldName === 'notes') && value) {
      value = value.trim();
      setEditPaymentForm(prev => ({ ...prev, [fieldName]: value }));
    }

    // Validate after blur
    const error = validateEditPaymentField(fieldName, value, editingPayment);
    setEditPaymentErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const validateEditPaymentFormComplete = () => {
    const requiredFields = ['amountPaid', 'paymentDate', 'recordedBy'];
    const errors = {};
    let hasErrors = false;

    requiredFields.forEach(field => {
      const error = validateEditPaymentField(field, editPaymentForm[field], editingPayment);
      if (error) {
        errors[field] = error;
        hasErrors = true;
      }
    });

    // Validate notes length if provided
    if (editPaymentForm.notes) {
      const notesError = validateEditPaymentField('notes', editPaymentForm.notes);
      if (notesError) {
        errors.notes = notesError;
        hasErrors = true;
      }
    }

    return { hasErrors, errors };
  };

  const handleEditPaymentSubmit = async (e) => {
    e.preventDefault();

    // Comprehensive validation
    const { hasErrors, errors } = validateEditPaymentFormComplete();
    setEditPaymentErrors(errors);

    if (hasErrors) {
      setToast({ type: 'error', message: 'Please fix all form errors before saving.' });
      return;
    }

    setUpdatingPayment(true);
    try {
      // Trim fields before sending
      const payload = {
        amountPaid: Number(editPaymentForm.amountPaid),
        paymentDate: editPaymentForm.paymentDate,
        recordedBy: (editPaymentForm.recordedBy || '').trim(),
        notes: (editPaymentForm.notes || '').trim(),
      };

      await updateRepaymentPayment(editingPayment.id, payload);

      setToast({
        type: 'success',
        message: `Payment updated successfully! Installment #${editingPayment.installmentNumber}, New Amount: ${formatCurrency(payload.amountPaid)}`,
      });
      closeEditPaymentModal();
      await refreshCurrent();
    } catch (err) {
      // Map backend errors to form fields if available
      const backendErrors = mapBackendFieldErrors(err.response?.data);
      if (Object.keys(backendErrors).length > 0) {
        setEditPaymentErrors(backendErrors);
        setToast({
          type: 'error',
          message: err.message || 'Payment update failed. Please check the form errors.',
        });
      } else {
        setToast({
          type: 'error',
          message: err.message || 'Failed to update payment. Please try again.',
        });
      }
    } finally {
      setUpdatingPayment(false);
    }
  };

  const openDeleteConfirm = (payment) => {
    setPaymentToDelete(payment);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setPaymentToDelete(null);
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;

    setUpdatingPayment(true);
    try {
      // Delete the payment
      await deleteRepaymentPayment(paymentToDelete.id);

      setToast({
        type: 'success',
        message: `Payment deleted successfully! Installment #${paymentToDelete.installmentNumber}, Amount: ${formatCurrency(paymentToDelete.amountPaid)}`,
      });

      closeDeleteConfirm();

      // Refresh all data to reflect changes
      // This includes:
      // 1. Re-evaluate overdue status and recalculate late fees
      // 2. Load updated schedule (with recalculated paid/remaining/status)
      // 3. Load updated payment history
      // 4. Update overdue section
      await refreshCurrent();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to delete payment.' });
    } finally {
      setUpdatingPayment(false);
    }
  };

  // Pagination Controls Component
  function PaginationControls({ label, current, total, onPrevious, onNext, totalElements }) {
    if (total <= 1) return null;

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        padding: '12px 16px',
        background: C.surfaceAlt,
        borderRadius: 10,
        border: `1px solid ${C.border}`,
      }}>
        <div style={{ fontSize: 13, color: C.inkMid, fontWeight: 500 }}>
          {label}: Page {current + 1} of {total} ({totalElements} total)
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="secondary"
            disabled={current <= 0}
            onClick={onPrevious}
            style={{ padding: '8px 12px', fontSize: 12 }}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={current >= total - 1}
            onClick={onNext}
            style={{ padding: '8px 12px', fontSize: 12 }}
          >
            Next
          </Button>
        </div>
      </div>
    );
  }

  // Progress Bar Component for installment visualization
  function InstallmentProgressBar({ paid, total }) {
    const percentage = total > 0 ? (paid / total) * 100 : 0;
    const cappedPercentage = Math.min(percentage, 100);

    return (
      <div style={{
        width: '100%',
        height: 6,
        background: C.surfaceDeep,
        borderRadius: 3,
        overflow: 'hidden',
        marginTop: 2,
      }}>
        <div
          style={{
            width: `${cappedPercentage}%`,
            height: '100%',
            background: cappedPercentage === 100 ? C.success :
                       cappedPercentage > 0 ? C.primary : C.surfaceDeep,
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px 36px', background: C.surfaceAlt, minHeight: '100vh' }}>
      <style>{`
        .dark-search-input::placeholder {
          color: var(--text-muted) !important;
          opacity: 1;
        }
      `}</style>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24,
      }}>
        <PageHeader
          title="Repayment Schedule & Tracking"
          subtitle="Monitor installments, overdue payments, late fees, and repayment history."
          actions={
            <div style={{ display: 'flex', gap: 12 }}>
              <Button variant="secondary" onClick={() => navigate('/applications')}>
                ← Back to Applications
              </Button>
              {applicationId && (
                <Button variant="secondary" onClick={refreshCurrent}>
                  Refresh
                </Button>
              )}
            </div>
          }
        />
      </div>

      {!applicationId ? (
        <>
          <SectionCard style={{ marginBottom: 24 }}>
            <CardHeader
              title="Select Approved Application"
              icon="📂"
              subtitle="Choose an approved application to manage its repayment schedule"
            />
            <div style={{ padding: 24 }}>
              {approvedApplications.length === 0 ? (
                <div style={{
                  padding: '18px 20px',
                  background: C.warnSoft,
                  border: '1px solid #FDE68A',
                  borderRadius: 12,
                  color: C.warn,
                  fontWeight: 600,
                }}>
                  No approved applications available. Please ensure loan applications are approved before generating repayment schedules.
                </div>
              ) : (
                <>
                  {/* Approved application search */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{
                      display: 'block',
                      marginBottom: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      color: C.inkMid
                    }}>
                      Search Applications
                    </label>
                    <input
                      type="text"
                      className="dark-search-input"
                      placeholder="Search by application number, name, or NIC..."
                      value={applicationSearch}
                      onChange={(e) => setApplicationSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: C.surfaceAlt,
                        color: C.ink,
                        border: `1px solid ${C.border}`,
                        borderRadius: 14,
                        fontSize: 14,
                        minHeight: 48,
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
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

                  <div style={{ marginBottom: 16 }}>
                    <label style={{
                      display: 'block',
                      marginBottom: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      color: C.inkMid
                    }}>
                      Approved Applications
                    </label>

                    <select
                      value={selectedApplicationId}
                      onChange={(e) => setSelectedApplicationId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: `1px solid ${C.borderMid}`,
                        borderRadius: 10,
                        fontSize: 14,
                        background: C.surface,
                        color: C.ink,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">Select an approved application</option>
                      {filteredApplications.map((app) => (
                        <option key={app.id} value={app.id}>
                          {app.applicationNumber || app.id} - {app.fullName || app.applicantName || 'Applicant'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected application preview */}
                  {selectedApplication && (
                    <div style={{
                      padding: '16px 20px',
                      background: C.primarySoft,
                      border: `1px solid ${C.primaryMid}`,
                      borderRadius: 12,
                      marginBottom: 16,
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.primary, marginBottom: 12 }}>
                        Application Preview
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 12,
                        fontSize: 13,
                      }}>
                        <div>
                          <span style={{ color: C.inkMid }}>Application Number:</span>{' '}
                          <span style={{ fontWeight: 600, color: C.ink }}>{selectedApplication.applicationNumber}</span>
                        </div>
                        <div>
                          <span style={{ color: C.inkMid }}>Applicant Name:</span>{' '}
                          <span style={{ fontWeight: 600, color: C.ink }}>{selectedApplication.fullName || selectedApplication.applicantName}</span>
                        </div>
                        <div>
                          <span style={{ color: C.inkMid }}>NIC:</span>{' '}
                          <span style={{ fontWeight: 600, color: C.ink }}>{selectedApplication.nic || 'N/A'}</span>
                        </div>
                        <div>
                          <span style={{ color: C.inkMid }}>Requested Amount:</span>{' '}
                          <span style={{ fontWeight: 600, color: C.ink }}>{formatCurrency(selectedApplication.amount)}</span>
                        </div>
                        <div>
                          <span style={{ color: C.inkMid }}>Recommended Amount:</span>{' '}
                          <span style={{ fontWeight: 600, color: C.ink }}>
                            {selectedApplication.recommendedAmount ? formatCurrency(selectedApplication.recommendedAmount) : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: C.inkMid }}>Status:</span>{' '}
                          <StatusBadge status={selectedApplication.status} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12 }}>
                    <Button
                      variant="primary"
                      disabled={!selectedApplicationId}
                      onClick={() => navigate(`/repayment/${selectedApplicationId}`)}
                    >
                      Open Repayment Schedule
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => navigate('/applications')}
                    >
                      Go to Applications
                    </Button>
                  </div>
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard>
            <CardHeader
              title="Overdue Repayments"
              icon="⏰"
              subtitle="Global view of all overdue installments"
            />
            <div style={{ padding: 24 }}>
              {overdues.length === 0 ? (
                <div style={{
                  padding: '18px 20px',
                  background: C.successSoft,
                  border: '1px solid #6EE7B7',
                  borderRadius: 12,
                  color: C.success,
                  fontWeight: 600,
                }}>
                  No overdue repayments found.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                    <thead>
                      <tr style={{ background: C.surfaceDeep }}>
                        {['Application No', 'Installment', 'Due Date', 'Installment Amount', 'Remaining', 'Late Fee', 'Status', 'Action'].map((head) => (
                          <th key={head} style={{
                            padding: '14px 12px',
                            textAlign: 'left',
                            fontSize: 12,
                            fontWeight: 800,
                            color: C.inkMid,
                            textTransform: 'uppercase',
                            borderBottom: `1px solid ${C.border}`,
                          }}>
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {overdues.map((item) => (
                        <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '14px 12px', fontWeight: 700, color: C.ink }}>{item.applicationNumber}</td>
                          <td style={{ padding: '14px 12px', color: C.inkMid }}>{item.installmentNumber}</td>
                          <td style={{ padding: '14px 12px', color: C.inkMid }}>{formatDate(item.dueDate)}</td>
                          <td style={{ padding: '14px 12px', color: C.inkMid }}>{formatCurrency(item.installmentAmount)}</td>
                          <td style={{ padding: '14px 12px', color: C.danger, fontWeight: 700 }}>{formatCurrency(item.remainingAmount)}</td>
                          <td style={{ padding: '14px 12px', color: C.warn, fontWeight: 700 }}>{formatCurrency(item.lateFee)}</td>
                          <td style={{ padding: '14px 12px' }}><StatusBadge status={item.status} /></td>
                          <td style={{ padding: '14px 12px' }}>
                            <Button
                              variant="secondary"
                              onClick={() => navigate(`/repayment/${item.applicationId}`)}
                              style={{ padding: '8px 12px', fontSize: 12 }}
                            >
                              Open Schedule
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <PaginationControls
                label="Overdue Payments"
                current={overduePagination.page}
                total={overduePagination.totalPages}
                onPrevious={handleOverduePrevious}
                onNext={handleOverdueNext}
                totalElements={overduePagination.totalElements}
              />
            </div>
          </SectionCard>
        </>
      ) : (
        <>
          {/* Main Summary Cards - Top 5 KPIs Only */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 24,
          }}>
            <StatCard
              title="Application Number"
              displayValue={summary.applicationNumber}
              subtitle="Approved loan application"
              gradient="blue"
              animate={false}
              valueType="text"
              index={0}
              icon={(
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              )}
            />

            <StatCard
              title="Total Installments"
              value={summary.totalInstallments}
              subtitle="Scheduled monthly payments"
              gradient="purple"
              valueType="number"
              index={1}
              icon={(
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              )}
            />

            <StatCard
              title="Total Paid"
              value={summary.totalPaid}
              subtitle="Recorded payments"
              gradient="green"
              valueType="currency"
              index={2}
              icon={(
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22,4 12,14.01 9,11.01"/>
                </svg>
              )}
            />

            <StatCard
              title="Remaining Balance"
              value={summary.totalRemaining}
              subtitle="Unpaid installment balance"
              gradient="amber"
              valueType="currency"
              index={3}
              icon={(
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              )}
            />

            <StatCard
              title="Overdue Count"
              value={summary.overdueCount}
              subtitle="Installments past due + 7 days"
              gradient={summary.overdueCount > 0 ? "red" : "teal"}
              valueType="number"
              index={4}
              icon={(
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              )}
            />
          </div>

          {/* Performance Overview - Compact Metrics */}
          <SectionCard style={{ marginBottom: 24 }}>
            <CardHeader
              title="Repayment Insights"
              icon="📊"
              subtitle="Performance and payment information"
            />
            <div style={{ padding: 24 }}>
              {/* Completion Progress Bar */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Completion Progress</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>
                    {enhancedSummary.completionPercentage.toFixed(1)}%
                  </div>
                </div>
                <div style={{
                  height: 8,
                  background: C.surfaceAlt,
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{
                    height: '100%',
                    background: enhancedSummary.completionPercentage === 100 ? C.success :
                               enhancedSummary.completionPercentage >= 50 ? C.primary : C.warn,
                    width: `${enhancedSummary.completionPercentage}%`,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <div style={{ fontSize: 12, color: C.inkMid, marginTop: 8 }}>
                  {schedule.filter(item => item.status === 'PAID' || item.status === 'CLOSED').length} of {schedule.length} installments paid
                </div>
              </div>

              {/* Compact Metric Cards Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16,
              }}>
                {/* Total Late Fees */}
                <div style={{
                  padding: 16,
                  background: C.surfaceAlt,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 18,
                      display: 'inline-flex',
                    }}>⚠️</span>
                    <div style={{ fontSize: 12, color: C.inkMid, fontWeight: 500 }}>Total Late Fees</div>
                  </div>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: summary.totalLateFee > 0 ? C.danger : C.success,
                  }}>
                    {formatCurrency(summary.totalLateFee)}
                  </div>
                </div>

                {/* Total Interest */}
                <div style={{
                  padding: 16,
                  background: C.surfaceAlt,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 18,
                      display: 'inline-flex',
                    }}>💰</span>
                    <div style={{ fontSize: 12, color: C.inkMid, fontWeight: 500 }}>Total Interest</div>
                  </div>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: C.primary,
                  }}>
                    {formatCurrency(enhancedSummary.totalInterest)}
                  </div>
                </div>

                {/* Last Payment */}
                <div style={{
                  padding: 16,
                  background: C.surfaceAlt,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 18,
                      display: 'inline-flex',
                    }}>📅</span>
                    <div style={{ fontSize: 12, color: C.inkMid, fontWeight: 500 }}>Last Payment</div>
                  </div>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: C.ink,
                  }}>
                    {enhancedSummary.lastPaymentDate ? formatDate(enhancedSummary.lastPaymentDate) : 'No payments'}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Next Due Payment - Compact Highlight Card */}
          {summary.nextDueInstallment && (
            <SectionCard style={{ marginBottom: 24, background: C.primarySoft, border: `2px solid ${C.primary}` }}>
              <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
                {/* Left: Header + Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Next Due Payment</div>
                    <div style={{ fontSize: 12, color: C.inkMid, marginTop: 2 }}>Upcoming installment to be paid</div>
                  </div>

                  {/* Compact Details Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 16,
                  }}>
                    {/* Installment Number */}
                    <div>
                      <div style={{ fontSize: 11, color: C.inkMid, fontWeight: 500, marginBottom: 4 }}>
                        Installment
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>
                        #{summary.nextDueInstallment.installmentNumber}
                      </div>
                    </div>

                    {/* Due Date */}
                    <div>
                      <div style={{ fontSize: 11, color: C.inkMid, fontWeight: 500, marginBottom: 4 }}>
                        Due Date
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>
                        {formatDate(summary.nextDueInstallment.dueDate)}
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <div style={{ fontSize: 11, color: C.inkMid, fontWeight: 500, marginBottom: 4 }}>
                        Status
                      </div>
                      <StatusBadge status={summary.nextDueInstallment.status} />
                    </div>
                  </div>
                </div>

                {/* Right: Amount Highlight */}
                <div style={{
                  padding: '16px 20px',
                  background: C.primary,
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  minWidth: 160,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11, color: '#fff', fontWeight: 500, opacity: 0.9 }}>
                    Amount Due
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                    {formatCurrency(summary.nextDueInstallment.remainingAmount)}
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {showPaymentForm && (
            <SectionCard style={{ marginBottom: 24 }}>
              <CardHeader
                title="Record Payment"
                icon="💳"
                subtitle="Add a partial or full repayment entry"
                action={
                  <Button variant="secondary" onClick={handleClosePaymentForm}>
                    Close
                  </Button>
                }
              />
              <form onSubmit={handlePaymentSubmit} style={{ padding: 24 }}>
                {/* Payment form convenience buttons */}
                {selectedInstallment && (
                  <div style={{
                    padding: '16px 20px',
                    background: C.accentSoft,
                    border: `1px solid #6EE7B7`,
                    borderRadius: 12,
                    marginBottom: 20,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginBottom: 12 }}>
                      Quick Actions for Installment #{selectedInstallment.installmentNumber}
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handlePayFullInstallment}
                        style={{ padding: '8px 12px', fontSize: 12 }}
                      >
                        Pay Full Installment ({formatCurrency(Number(selectedInstallment.remainingAmount) + Number(selectedInstallment.lateFee))})
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handlePayLateFeeOnly}
                        disabled={Number(selectedInstallment.lateFee) === 0}
                        style={{ padding: '8px 12px', fontSize: 12 }}
                      >
                        Pay Only Amount ({formatCurrency(selectedInstallment.remainingAmount)})
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handlePayRemainingBalance}
                        style={{ padding: '8px 12px', fontSize: 12 }}
                      >
                        Pay Remaining Balance ({formatCurrency(selectedInstallment.remainingAmount)})
                      </Button>
                    </div>
                  </div>
                )}

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.inkMid }}>
                      Application Number
                    </label>
                    <input
                      value={paymentForm.applicationNumber || 'N/A'}
                      readOnly
                      style={inputStyle(true)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.inkMid }}>
                      Installment Number (Auto-Selected)
                    </label>
                    <input
                      type="text"
                      name="installmentNumber"
                      value={paymentForm.installmentNumber || 'Auto-selecting...'}
                      readOnly
                      style={{
                        ...inputStyle(true),
                        borderColor: paymentFormErrors.installmentNumber ? C.danger : undefined,
                        borderWidth: paymentFormErrors.installmentNumber ? '2px' : undefined,
                      }}
                    />
                    {paymentFormErrors.installmentNumber && (
                      <div style={{ marginTop: 6, color: C.danger, fontSize: '0.85rem', lineHeight: 1.3 }}>
                        {paymentFormErrors.installmentNumber}
                      </div>
                    )}
                    {selectedInstallment && (
                      <div style={{ 
                        marginTop: 6, 
                        padding: '8px 12px',
                        backgroundColor: selectedInstallment.status === 'OVERDUE' ? C.dangerSoft : C.primarySoft,
                        borderRadius: 6,
                        fontSize: '0.85rem', 
                        color: selectedInstallment.status === 'OVERDUE' ? C.danger : C.primary,
                        border: `1px solid ${selectedInstallment.status === 'OVERDUE' ? C.danger : C.primary}`,
                      }}>
                        {selectedInstallment.status === 'OVERDUE' 
                          ? `⚠️ Overdue installment automatically selected (Due: ${formatDate(selectedInstallment.dueDate)})`
                          : `✓ Next payable installment automatically selected`
                        }
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.inkMid }}>
                      Amount Paid
                    </label>
                    <input
                      type="number"
                      name="amountPaid"
                      step="0.01"
                      min="0.01"
                      value={paymentForm.amountPaid}
                      onChange={handlePaymentInputChange}
                      onBlur={handlePaymentBlur}
                      onKeyDown={(e) => blockInvalidNumberKeys(e, "amountPaid")}
                      required
                      style={{
                        ...inputStyle(),
                        borderColor: paymentFormErrors.amountPaid ? C.danger : undefined,
                        borderWidth: paymentFormErrors.amountPaid ? '2px' : undefined,
                      }}
                    />
                    {paymentFormErrors.amountPaid && (
                      <div style={{ marginTop: 6, color: C.danger, fontSize: '0.85rem', lineHeight: 1.3 }}>
                        {paymentFormErrors.amountPaid}
                      </div>
                    )}
                    {selectedInstallment && (
                      <div style={{ fontSize: 12, color: C.inkMid, marginTop: 4 }}>
                        Remaining Amount: {formatCurrency(selectedInstallment.remainingAmount)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.inkMid }}>
                      Late Fee Due
                    </label>
                    <input
                      type="number"
                      name="lateFeeDue"
                      step="0.01"
                      min="0"
                      value={paymentForm.lateFeeDue}
                      onChange={handlePaymentInputChange}
                      onBlur={handlePaymentBlur}
                      onKeyDown={(e) => blockInvalidNumberKeys(e, "lateFeeDue")}
                      style={{
                        ...inputStyle(),
                        borderColor: paymentFormErrors.lateFeeDue ? C.danger : undefined,
                        borderWidth: paymentFormErrors.lateFeeDue ? '2px' : undefined,
                      }}
                    />
                    {paymentFormErrors.lateFeeDue && (
                      <div style={{ marginTop: 6, color: C.danger, fontSize: '0.85rem', lineHeight: 1.3 }}>
                        {paymentFormErrors.lateFeeDue}
                      </div>
                    )}
                    {selectedInstallment && (
                      <div style={{ fontSize: 12, color: C.inkMid, marginTop: 4 }}>
                        {Number(selectedInstallment.lateFee) === 0
                          ? 'No late fee for this installment'
                          : `Late fee from installment: ${formatCurrency(selectedInstallment.lateFee)}`}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.inkMid }}>
                      Payment Date
                    </label>
                    <input
                      type="date"
                      name="paymentDate"
                      value={paymentForm.paymentDate}
                      onChange={handlePaymentInputChange}
                      onBlur={handlePaymentBlur}
                      max={getTodayDate()}
                      required
                      style={{
                        ...inputStyle(),
                        borderColor: paymentFormErrors.paymentDate ? C.danger : undefined,
                        borderWidth: paymentFormErrors.paymentDate ? '2px' : undefined,
                      }}
                    />
                    {paymentFormErrors.paymentDate && (
                      <div style={{ marginTop: 6, color: C.danger, fontSize: '0.85rem', lineHeight: 1.3 }}>
                        {paymentFormErrors.paymentDate}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.inkMid }}>
                      Recorded By
                    </label>
                    <input
                      type="text"
                      name="recordedBy"
                      value={paymentForm.recordedBy}
                      readOnly
                      placeholder="Recorded By (auto-filled)"
                      style={{
                        ...inputStyle(true),
                        borderColor: paymentFormErrors.recordedBy ? C.danger : undefined,
                        borderWidth: paymentFormErrors.recordedBy ? '2px' : undefined,
                        cursor: 'not-allowed',
                      }}
                    />
                    {paymentFormErrors.recordedBy && (
                      <div style={{ marginTop: 6, color: C.danger, fontSize: '0.85rem', lineHeight: 1.3 }}>
                        {paymentFormErrors.recordedBy}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.inkMid }}>
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                    style={{
                      ...inputStyle(),
                      resize: 'vertical',
                      minHeight: 90,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <Button
                    type="submit"
                    variant="success"
                    disabled={saving || !isPaymentFormValid(paymentForm, selectedInstallment)}
                  >
                    {saving ? 'Saving...' : 'Save Payment'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleClosePaymentForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </SectionCard>
          )}

          <SectionCard style={{ marginBottom: 24 }}>
            <CardHeader
              title="Repayment Schedule"
              icon="📅"
              subtitle="Installment-level repayment monitoring"
              action={
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button
                    variant="secondary"
                    onClick={() => openPaymentForm(null)}
                    disabled={schedule.length === 0}
                  >
                    Record Payment
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={exportScheduleCSV}
                    disabled={schedule.length === 0}
                    style={{ padding: '8px 12px', fontSize: 12 }}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="success"
                    onClick={handleCloseSchedule}
                    disabled={!summary.canClose || closing}
                  >
                    {closing ? 'Closing...' : 'Close Schedule'}
                  </Button>
                </div>
              }
            />
            <div style={{ padding: 24 }}>
              {loading ? (
                <div style={{ padding: '12px 0', color: C.inkMid }}>Loading repayment schedule...</div>
              ) : schedule.length === 0 ? (
                <div>
                  {/* Improved missing schedule state */}
                  {applicationDetails && (
                    <div style={{
                      padding: '20px 24px',
                      background: C.surfaceAlt,
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      marginBottom: 16,
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 12 }}>
                        Application Details
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 12,
                        fontSize: 13,
                      }}>
                        <div>
                          <span style={{ color: C.inkMid }}>Application Number:</span>{' '}
                          <span style={{ fontWeight: 600, color: C.ink }}>{applicationDetails.applicationNumber}</span>
                        </div>
                        <div>
                          <span style={{ color: C.inkMid }}>Status:</span>{' '}
                          <StatusBadge status={applicationDetails.status} />
                        </div>
                        <div>
                          <span style={{ color: C.inkMid }}>Requested Amount:</span>{' '}
                          <span style={{ fontWeight: 600, color: C.ink }}>{formatCurrency(applicationDetails.amount)}</span>
                        </div>
                        <div>
                          <span style={{ color: C.inkMid }}>Recommended Amount:</span>{' '}
                          <span style={{ fontWeight: 600, color: C.ink }}>
                            {applicationDetails.recommendedAmount ? formatCurrency(applicationDetails.recommendedAmount) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{
                    padding: '18px 20px',
                    background: C.warnSoft,
                    border: '1px solid #FDE68A',
                    borderRadius: 12,
                    color: C.warn,
                    fontWeight: 600,
                    marginBottom: 16,
                  }}>
                    No repayment schedule found for this application.
                  </div>
                  {needsGeneration && (
                    <div style={{ textAlign: 'center' }}>
                      <Button
                        variant="primary"
                        onClick={handleGenerateSchedule}
                        disabled={generating || !applicationDetails || applicationDetails.status !== 'APPROVED'}
                      >
                        {generating ? 'Generating Schedule...' :
                         !applicationDetails ? 'Loading Application...' :
                         applicationDetails.status !== 'APPROVED' ? 'Application Not Approved' :
                         'Generate Repayment Schedule'}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Installment table filters */}
                  <div style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 20,
                    padding: '4px',
                    background: C.surfaceDeep,
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                  }}>
                    {['All', 'Pending', 'Partial', 'Paid', 'Overdue', 'Closed'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setScheduleFilter(filter)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          border: 'none',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: scheduleFilter === filter ? C.primary : 'transparent',
                          color: scheduleFilter === filter ? '#fff' : C.inkMid,
                          transition: 'all 0.2s',
                        }}
                      >
                        {filter} ({filter === 'All' ? schedule.length : schedule.filter(item => {
                          switch (filter) {
                            case 'Pending': return item.status === 'PENDING';
                            case 'Partial': return item.status === 'PARTIAL';
                            case 'Paid': return item.status === 'PAID';
                            case 'Overdue': return item.status === 'OVERDUE';
                            case 'Closed': return item.status === 'CLOSED';
                            default: return true;
                          }
                        }).length})
                      </button>
                    ))}
                  </div>

                  {/* Installment table sorting controls */}
                  <div style={{
                    display: 'flex',
                    gap: 12,
                    marginBottom: 16,
                    padding: '12px 16px',
                    background: C.surfaceAlt,
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.inkMid }}>Sort by:</span>
                    {[
                      { field: 'installmentNumber', label: 'Installment #' },
                      { field: 'dueDate', label: 'Due Date' },
                      { field: 'remainingAmount', label: 'Remaining Amount' },
                      { field: 'status', label: 'Status' }
                    ].map(({ field, label }) => (
                      <button
                        key={field}
                        onClick={() => handleSort(field)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: `1px solid ${sortConfig.field === field ? C.primary : C.borderMid}`,
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                          background: sortConfig.field === field ? C.primarySoft : C.surface,
                          color: sortConfig.field === field ? C.primary : C.inkMid,
                          transition: 'all 0.2s',
                        }}
                      >
                        {label} {sortConfig.field === field && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </button>
                    ))}
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1300 }}>
                      <thead>
                        <tr style={{ background: C.surfaceDeep }}>
                          {['Inst. No', 'Due Date', 'Installment', 'Principal', 'Interest', 'Paid', 'Remaining', 'Late Fee', 'Status', 'Action'].map((head) => (
                            <th key={head} style={{
                              padding: '14px 12px',
                              textAlign: 'left',
                              fontSize: 12,
                              fontWeight: 800,
                              color: C.inkMid,
                              textTransform: 'uppercase',
                              borderBottom: `1px solid ${C.border}`,
                            }}>
                              {head}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSchedule.map((item) => {
                          const overdueRow = item.status === 'OVERDUE';
                          const paidAmount = Number(item.paidAmount || 0);
                          const installmentAmount = Number(item.installmentAmount || 0);

                          return (
                            <tr
                              key={item.id}
                              style={{
                                borderBottom: `1px solid ${C.border}`,
                                background: overdueRow ? 
                                  `linear-gradient(90deg, ${C.dangerSoft} 0%, ${C.surfaceAlt} 100%)` : 
                                  C.surface,
                                borderLeft: overdueRow ? `4px solid ${C.danger}` : 'none',
                                position: 'relative',
                                ...(overdueRow && {
                                  boxShadow: `inset 0 0 0 1px ${C.danger}15`,
                                }),
                              }}
                            >
                              <td style={{ padding: '14px 12px', fontWeight: 700, color: overdueRow ? C.ink : C.ink }}>
                                #{item.installmentNumber}
                              </td>
                              <td style={{ padding: '14px 12px', color: overdueRow ? C.ink : C.inkMid }}>
                                {formatDate(item.dueDate)}
                              </td>
                              <td style={{ padding: '14px 12px', color: overdueRow ? C.ink : C.inkMid, fontWeight: 700 }}>
                                <div>{formatCurrency(item.installmentAmount)}</div>
                                <InstallmentProgressBar
                                  paid={paidAmount}
                                  total={installmentAmount}
                                />
                                {installmentAmount > 0 && (
                                  <div style={{ fontSize: 10, color: overdueRow ? C.inkMid : C.inkLight, marginTop: 2 }}>
                                    {((paidAmount / installmentAmount) * 100).toFixed(1)}% paid
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '14px 12px', color: overdueRow ? C.ink : C.inkMid }}>
                                {formatCurrency(item.principalPortion)}
                              </td>
                              <td style={{ padding: '14px 12px', color: overdueRow ? C.ink : C.inkMid }}>
                                {formatCurrency(item.interestPortion)}
                              </td>
                              <td style={{ padding: '14px 12px', color: C.success, fontWeight: 700 }}>
                                {formatCurrency(item.paidAmount)}
                              </td>
                              <td style={{ padding: '14px 12px', color: overdueRow ? C.danger : C.warn, fontWeight: 700 }}>
                                {formatCurrency(item.remainingAmount)}
                              </td>
                              <td style={{ padding: '14px 12px', color: overdueRow ? C.danger : C.warn, fontWeight: 700 }}>
                                {formatCurrency(item.lateFee)}
                              </td>
                              <td style={{ padding: '14px 12px' }}>
                                <StatusBadge status={item.status} />
                              </td>
                              <td style={{ padding: '14px 12px' }}>
                                <Button
                                  variant="secondary"
                                  onClick={() => openPaymentForm(item)}
                                  disabled={item.status === 'PAID' || item.status === 'CLOSED'}
                                  style={{ padding: '8px 12px', fontSize: 12 }}
                                >
                                  Pay
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard>
            <CardHeader
              title="Payment History"
              icon="🧾"
              subtitle="View complete payment transaction records"
              action={
                <Button
                  variant="primary"
                  onClick={() => applicationId && navigate(`/repayment/${applicationId}/history`)}
                  disabled={!applicationId}
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  View Payment History
                </Button>
              }
            />
            <div style={{ padding: 24 }}>
              <div style={{
                padding: '24px',
                textAlign: 'center',
                background: C.surfaceDeep,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                color: C.inkMid,
              }}>
                <div style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>
                  📊 Payment Records Available
                </div>
                <div style={{ marginBottom: 16, fontSize: 14 }}>
                  View detailed payment history, void transactions, and export records on the dedicated history page.
                </div>
                <Button
                  variant="secondary"
                  onClick={() => applicationId && navigate(`/repayment/${applicationId}/history`)}
                  disabled={!applicationId}
                  style={{ padding: '10px 20px', fontSize: 14 }}
                >
                  Open Payment History →
                </Button>
              </div>
            </div>
          </SectionCard>
        </>
      )}

      {/* Edit Payment Modal removed - using void-only approach for audit safety */}

      {/* Duplicate void modal removed - using correct one below */}
      {false && showVoidModal && paymentToVoid && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <SectionCard style={{ width: '100%', maxWidth: 500, margin: '20px' }}>
            <CardHeader
              title="Edit Repayment Payment"
              icon="✏️"
              subtitle={`Installment #${editingPayment.installmentNumber}`}
              action={
                <Button variant="secondary" onClick={closeEditPaymentModal} disabled={updatingPayment}>
                  Close
                </Button>
              }
            />
            <form onSubmit={handleEditPaymentSubmit} style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.inkMid }}>
                    Payment Reference
                  </label>
                  <input
                    value={editingPayment.paymentReference}
                    readOnly
                    style={inputStyle(true)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.inkMid }}>
                    Installment Number
                  </label>
                  <input
                    value={editingPayment.installmentNumber}
                    readOnly
                    style={inputStyle(true)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.inkMid }}>
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    name="amountPaid"
                    step="0.01"
                    min="0.01"
                    value={editPaymentForm.amountPaid}
                    onChange={handleEditPaymentInputChange}
                    onKeyDown={(e) => handleEditPaymentKeyDown(e, 'amountPaid')}
                    onBlur={() => handleEditPaymentBlur('amountPaid')}
                    style={{
                      ...inputStyle(),
                      borderColor: editPaymentErrors.amountPaid ? C.danger : undefined,
                      borderWidth: editPaymentErrors.amountPaid ? '2px' : undefined,
                    }}
                  />
                  {editPaymentErrors.amountPaid && (
                    <div style={{ marginTop: 6, color: C.danger, fontSize: '0.85rem' }}>
                      {editPaymentErrors.amountPaid}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.inkMid }}>
                    Payment Date
                  </label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={editPaymentForm.paymentDate}
                    onChange={handleEditPaymentInputChange}
                    onBlur={() => handleEditPaymentBlur('paymentDate')}
                    max={getTodayDate()}
                    style={{
                      ...inputStyle(),
                      borderColor: editPaymentErrors.paymentDate ? C.danger : undefined,
                      borderWidth: editPaymentErrors.paymentDate ? '2px' : undefined,
                    }}
                  />
                  {editPaymentErrors.paymentDate && (
                    <div style={{ marginTop: 6, color: C.danger, fontSize: '0.85rem' }}>
                      {editPaymentErrors.paymentDate}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.inkMid }}>
                  Recorded By
                </label>
                <input
                  type="text"
                  name="recordedBy"
                  value={editPaymentForm.recordedBy}
                  readOnly
                  placeholder="Recorded By (auto-filled)"
                  maxLength={100}
                  style={{
                    ...inputStyle(true),
                    borderColor: editPaymentErrors.recordedBy ? C.danger : undefined,
                    borderWidth: editPaymentErrors.recordedBy ? '2px' : undefined,
                    cursor: 'not-allowed',
                  }}
                />
                {editPaymentErrors.recordedBy && (
                  <div style={{ marginTop: 6, color: C.danger, fontSize: '0.85rem' }}>
                    {editPaymentErrors.recordedBy}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.inkMid }}>
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  maxLength={500}
                  value={editPaymentForm.notes}
                  onChange={handleEditPaymentInputChange}
                  onBlur={() => handleEditPaymentBlur('notes')}
                  style={{
                    ...inputStyle(),
                    resize: 'vertical',
                    minHeight: 70,
                    borderColor: editPaymentErrors.notes ? C.danger : undefined,
                    borderWidth: editPaymentErrors.notes ? '2px' : undefined,
                  }}
                />
                <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    {editPaymentErrors.notes && (
                      <span style={{ color: C.danger, fontSize: '0.85rem' }}>
                        {editPaymentErrors.notes}
                      </span>
                    )}
                  </div>
                  <span style={{ color: C.inkMid, fontSize: '0.85rem' }}>
                    {(editPaymentForm.notes || '').length} / 500
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <Button
                  type="submit"
                  variant="success"
                  disabled={updatingPayment || Object.values(editPaymentErrors).some(err => err)}
                >
                  {updatingPayment ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeEditPaymentModal}
                  disabled={updatingPayment}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </SectionCard>
        </div>
      )}

      {/* Void Payment Modal - Audit-Safe Approach */}
      {showVoidModal && paymentToVoid && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <SectionCard style={{ width: '100%', maxWidth: 500, margin: '20px' }}>
            <CardHeader
              title="Void Repayment Payment"
              icon="🚫"
              subtitle={`Reference: ${paymentToVoid.paymentReference}`}
              action={
                <Button variant="secondary" onClick={closeVoidModal} disabled={updatingPayment}>
                  Close
                </Button>
              }
            />
            <form onSubmit={handleVoidPayment} style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.inkMid }}>
                  Payment Reference
                </label>
                <input value={paymentToVoid.paymentReference} readOnly style={inputStyle(true)} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.inkMid }}>
                  Voided By
                </label>
                <input
                  type="text"
                  value={voidForm.voidedBy}
                  readOnly
                  style={inputStyle(true)}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.inkMid }}>
                  Void Reason
                </label>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={voidForm.voidReason}
                  onChange={(e) => setVoidForm(prev => ({ ...prev, voidReason: e.target.value }))}
                  style={{
                    ...inputStyle(),
                    resize: 'vertical',
                    minHeight: 100,
                    borderColor: voidErrors.voidReason ? C.danger : undefined,
                    borderWidth: voidErrors.voidReason ? '2px' : undefined,
                  }}
                />
                {voidErrors.voidReason && (
                  <div style={{ marginTop: 6, color: C.danger, fontSize: '0.85rem' }}>
                    {voidErrors.voidReason}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <Button type="submit" variant="danger" disabled={updatingPayment}>
                  {updatingPayment ? 'Voiding...' : 'Void Payment'}
                </Button>
                <Button type="button" variant="secondary" onClick={closeVoidModal} disabled={updatingPayment}>
                  Cancel
                </Button>
              </div>
            </form>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function inputStyle(readOnly = false) {
  return {
    width: '100%',
    padding: '12px 14px',
    border: `1px solid ${readOnly ? C.border : C.borderMid}`,
    borderRadius: 10,
    fontSize: 14,
    background: readOnly ? C.surfaceAlt : C.surface,
    color: C.ink,
    outline: 'none',
    boxSizing: 'border-box',
  };
}