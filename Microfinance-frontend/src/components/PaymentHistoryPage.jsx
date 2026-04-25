import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { applicationsApi } from '../services/apiService';
import {
  getPaymentHistory,
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
      onClick={onClick}
      disabled={disabled}
      style={{
        ...getStyles(),
        padding: "12px 20px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s",
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
      overflow: "hidden",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, icon, action }) {
  return (
    <div style={{
      padding: "20px 24px",
      borderBottom: `1px solid ${C.border}`,
      background: C.surfaceDeep,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.ink }}>{title}</h3>
          {subtitle && <p style={{ margin: 0, fontSize: 13, color: C.inkMid, marginTop: 2 }}>{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function PaginationControls({ label, current, total, onPrevious, onNext, totalElements }) {
  const hasResults = totalElements > 0;
  const showPagination = total > 1;

  if (!hasResults && !showPagination) return null;

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px 0",
      borderTop: `1px solid ${C.border}`,
      marginTop: 16,
    }}>
      <span style={{
        fontSize: 13,
        color: C.inkMid,
        fontWeight: 600,
      }}>
        {hasResults ? `${label}: ${totalElements} records` : `No ${label.toLowerCase()} found`}
      </span>
      
      {showPagination && (
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="secondary"
            onClick={onPrevious}
            disabled={current <= 1}
            style={{ padding: "8px 12px", fontSize: 12 }}
          >
            Previous
          </Button>
          <span style={{
            display: "flex",
            alignItems: "center",
            fontSize: 13,
            color: C.inkMid,
            fontWeight: 600,
            padding: "0 12px",
          }}>
            Page {current} of {total}
          </span>
          <Button
            variant="secondary"
            onClick={onNext}
            disabled={current >= total}
            style={{ padding: "8px 12px", fontSize: 12 }}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, value = status }) {
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

// Helper to get current logged-in user display name
function getCurrentUserDisplayName() {
  const user = getStoredUser();
  if (!user) return 'staff';
  
  return user.fullName || user.name || user.username || user.staffName || user.email || 'staff';
}

// CSV Helper Functions
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Input Style Helper
function inputStyle(readOnly = false) {
  return {
    width: '100%',
    padding: '12px 16px',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 14,
    background: C.surface,
    color: C.ink,
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'all 0.2s',
    ...(readOnly && { 
      background: C.surfaceDeep,
      color: C.inkMid,
      cursor: 'default',
    }),
  };
}

export default function PaymentHistoryPage() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    totalPages: 1,
    totalElements: 0,
  });
  
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [paymentToVoid, setPaymentToVoid] = useState(null);
  const [voidForm, setVoidForm] = useState({ voidedBy: '', voidReason: '' });
  const [voidErrors, setVoidErrors] = useState({});
  const [updatingPayment, setUpdatingPayment] = useState(false);
  
  const [toast, setToast] = useState(null);

  // Fetch application data
  useEffect(() => {
    const fetchApplication = async () => {
      if (!applicationId) return;
      
      try {
        const response = await applicationsApi.getDetails(applicationId);
        setApplication(response?.application || response);
      } catch (error) {
        console.error('Error fetching application:', error);
        showToast('Failed to load application details', 'error');
      }
    };

    fetchApplication();
  }, [applicationId]);

  // Fetch payment history
  useEffect(() => {
    const fetchPaymentHistory = async () => {
      if (!applicationId) return;
      
      setLoading(true);
      try {
        const response = await getPaymentHistory(applicationId, historyPagination.page - 1);
        setHistory(response.content || []);
        setHistoryPagination({
          page: response.number + 1,
          totalPages: response.totalPages,
          totalElements: response.totalElements,
        });
      } catch (error) {
        console.error('Error fetching payment history:', error);
        showToast('Failed to load payment history', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentHistory();
  }, [applicationId, historyPagination.page]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const exportPaymentHistoryCSV = () => {
    if (history.length === 0) return;

    const csvContent = [
      ['Reference', 'Installment No', 'Payment Date', 'Amount Paid', 'Late Fee Paid', 'Status', 'Recorded By', 'Voided By', 'Void Reason', 'Notes'],
      ...history.map(item => [
        escapeCSV(item.paymentReference),
        escapeCSV(item.installmentNumber),
        escapeCSV(formatDate(item.paymentDate)),
        escapeCSV(item.amountPaid),
        escapeCSV(item.lateFeePaid),
        escapeCSV(item.status || 'RECORDED'),
        escapeCSV(item.recordedBy || 'staff'),
        escapeCSV(item.voidedBy || ''),
        escapeCSV(item.voidReason || ''),
        escapeCSV(item.notes || ''),
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payment_history_${applicationId}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Void Payment Handlers
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
    setVoidForm({ voidedBy: '', voidReason: '' });
    setVoidErrors({});
  };

  const validateVoidForm = () => {
    const errors = {};
    
    if (!voidForm.voidedBy.trim()) {
      errors.voidedBy = 'Voided by is required';
    }
    
    if (!voidForm.voidReason.trim()) {
      errors.voidReason = 'Void reason is required';
    }
    
    setVoidErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleVoidPayment = async (e) => {
    e.preventDefault();

    if (!paymentToVoid) return;
    if (!validateVoidForm()) return;

    setUpdatingPayment(true);
    try {
      await voidRepaymentPayment(paymentToVoid.id, {
        voidedBy: voidForm.voidedBy.trim(),
        voidReason: voidForm.voidReason.trim(),
      });

      showToast('Payment voided successfully', 'success');
      closeVoidModal();
      
      // Refresh payment history
      const response = await getPaymentHistory(applicationId, historyPagination.page - 1);
      setHistory(response.content || []);
    } catch (error) {
      console.error('Error voiding payment:', error);
      showToast('Failed to void payment', 'error');
    } finally {
      setUpdatingPayment(false);
    }
  };

  // Pagination handlers
  const handleHistoryPrevious = () => {
    if (historyPagination.page > 1) {
      setHistoryPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  };

  const handleHistoryNext = () => {
    if (historyPagination.page < historyPagination.totalPages) {
      setHistoryPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const goBack = () => {
    navigate(`/repayment/${applicationId}`);
  };

  if (loading) {
    return (
      <div style={{ 
        padding: 24, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '400px',
      }}>
        <div style={{ color: C.inkMid, fontSize: 16 }}>Loading payment history...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', minHeight: '100vh' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <PageHeader
        title="Payment History"
        subtitle={application ? `Application #${application.applicationNumber}` : `Application ID: ${applicationId}`}
        breadcrumb={[
          { label: 'Repayment', path: '/repayment' },
          { label: application?.applicationNumber || applicationId, path: `/repayment/${applicationId}` },
          { label: 'Payment History' }
        ]}
        action={
          <Button
            variant="secondary"
            onClick={goBack}
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            ← Back to Repayment
          </Button>
        }
      />

      <div style={{ marginTop: 24 }}>
        <SectionCard>
          <CardHeader
            title="Payment History"
            icon="🧾"
            subtitle="Complete record of repayment transactions"
            action={
              <Button
                variant="secondary"
                onClick={exportPaymentHistoryCSV}
                disabled={history.length === 0}
                style={{ padding: '8px 12px', fontSize: 12 }}
              >
                Export CSV
              </Button>
            }
          />
          <div style={{ padding: 24 }}>
            {history.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: C.surfaceDeep,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                color: C.inkMid,
                fontWeight: 600,
              }}>
                No payments recorded yet for this application.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 950 }}>
                  <thead>
                    <tr style={{ background: C.surfaceDeep }}>
                      {['Reference', 'Installment', 'Payment Date', 'Amount Paid', 'Late Fee Paid', 'Status', 'Recorded By', 'Notes', 'Actions'].map((head) => (
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
                    {history.map((item) => (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                          opacity: item.status === 'VOIDED' ? 0.72 : 1,
                          background: item.status === 'VOIDED' ? C.surfaceAlt : C.surface,
                        }}
                      >
                        <td style={{ padding: '14px 12px', fontWeight: 700, color: C.primary }}>
                          {item.paymentReference}
                        </td>
                        <td style={{ padding: '14px 12px', color: C.inkMid }}>
                          #{item.installmentNumber}
                        </td>
                        <td style={{ padding: '14px 12px', color: C.inkMid }}>
                          {formatDate(item.paymentDate)}
                        </td>
                        <td style={{ padding: '14px 12px', color: C.success, fontWeight: 700 }}>
                          {formatCurrency(item.amountPaid)}
                        </td>
                        <td style={{ padding: '14px 12px', color: C.warn, fontWeight: 700 }}>
                          {formatCurrency(item.lateFeePaid)}
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <StatusBadge status={item.status || 'RECORDED'} />
                        </td>
                        <td style={{ padding: '14px 12px', color: C.inkMid }}>
                          {item.recordedBy || 'staff'}
                        </td>
                        <td style={{ padding: '14px 12px', color: C.inkMid }}>
                          {item.status === 'VOIDED'
                            ? `VOIDED: ${item.voidReason || 'No reason provided'}`
                            : (item.notes || '—')}
                        </td>
                        <td style={{ padding: '14px 12px', display: 'flex', gap: 8 }}>
                          {item.status !== 'VOIDED' ? (
                            <Button
                              variant="danger"
                              onClick={() => openVoidModal(item)}
                              style={{ padding: '6px 10px', fontSize: 11 }}
                            >
                              Void
                            </Button>
                          ) : (
                            <span style={{ fontSize: 12, color: C.inkLight, fontWeight: 600 }}>
                              {item.voidedBy ? `Voided by ${item.voidedBy}` : 'Already voided'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <PaginationControls
              label="Payment History"
              current={historyPagination.page}
              total={historyPagination.totalPages}
              onPrevious={handleHistoryPrevious}
              onNext={handleHistoryNext}
              totalElements={historyPagination.totalElements}
            />
          </div>
        </SectionCard>
      </div>

      {/* Void Payment Modal */}
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
              title="Void Payment"
              icon="⚠️"
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
                  value={voidForm.voidedBy}
                  onChange={(e) => setVoidForm(prev => ({ ...prev, voidedBy: e.target.value }))}
                  style={inputStyle()}
                  readOnly
                />
                {voidErrors.voidedBy && (
                  <div style={{ color: C.danger, fontSize: 12, marginTop: 4 }}>
                    {voidErrors.voidedBy}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.inkMid }}>
                  Void Reason *
                </label>
                <textarea
                  value={voidForm.voidReason}
                  onChange={(e) => setVoidForm(prev => ({ ...prev, voidReason: e.target.value }))}
                  placeholder="Enter reason for voiding this payment..."
                  rows={3}
                  style={{
                    ...inputStyle(),
                    resize: 'vertical',
                    minHeight: 80,
                  }}
                />
                {voidErrors.voidReason && (
                  <div style={{ color: C.danger, fontSize: 12, marginTop: 4 }}>
                    {voidErrors.voidReason}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeVoidModal}
                  disabled={updatingPayment}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  disabled={updatingPayment}
                >
                  {updatingPayment ? 'Voiding...' : 'Void Payment'}
                </Button>
              </div>
            </form>
          </SectionCard>
        </div>
      )}
    </div>
  );
}