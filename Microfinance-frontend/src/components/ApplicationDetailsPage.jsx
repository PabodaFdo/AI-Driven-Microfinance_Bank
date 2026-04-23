import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { deleteRiskAssessment } from '../services/riskAssessmentService';
import { getStoredUser } from '../services/authService';
import {
  canMakeApplicationDecision,
  canCreateEditSubmitApplications,
  canRunRiskAndRecommendation,
  normalizeRole,
  validateStatusChangeByRole,
} from '../utils/permissions';
import RiskScoreBar from './RiskScoreBar';

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

function StatusBadge({ status, type = "default", size = "sm" }) {
  const getColors = () => {
    if (type === "risk") {
      switch (status) {
        case "NOT_ASSESSED": return { bg: C.surfaceDeep, color: C.inkLight, border: C.border };
        case "ASSESSING":    return { bg: C.warnSoft, color: C.warn, border: "#FDE68A" };
        case "ASSESSED":     return { bg: C.successSoft, color: C.success, border: "#6EE7B7" };
        case "FAILED":       return { bg: C.dangerSoft, color: C.danger, border: "#FCA5A5" };
        case "LOW":          return { bg: C.successSoft, color: C.success, border: "#6EE7B7" };
        case "MEDIUM":       return { bg: C.warnSoft, color: C.warn, border: "#FDE68A" };
        case "HIGH":         return { bg: C.dangerSoft, color: C.danger, border: "#FCA5A5" };
        default:             return { bg: C.surfaceDeep, color: C.inkMid, border: C.border };
      }
    } else if (type === "recommendation") {
      switch (status) {
        case "NOT_GENERATED": return { bg: C.surfaceDeep, color: C.inkLight, border: C.border };
        case "GENERATING":    return { bg: C.warnSoft, color: C.warn, border: "#FDE68A" };
        case "GENERATED":     return { bg: C.successSoft, color: C.success, border: "#6EE7B7" };
        case "FAILED":        return { bg: C.dangerSoft, color: C.danger, border: "#FCA5A5" };
        default:              return { bg: C.surfaceDeep, color: C.inkMid, border: C.border };
      }
    } else {
      switch (status) {
        case 'PENDING':   return { bg: C.warnSoft, color: C.warn, border: "#FDE68A" };
        case 'REVIEW':    return { bg: C.primarySoft, color: C.primary, border: C.primaryMid };
        case 'APPROVED':  return { bg: C.successSoft, color: C.success, border: "#6EE7B7" };
        case 'REJECTED':  return { bg: C.dangerSoft, color: C.danger, border: "#FCA5A5" };
        case 'CANCELLED': return { bg: C.surfaceDeep, color: C.inkLight, border: C.border };
        default:          return { bg: C.surfaceDeep, color: C.inkMid, border: C.border };
      }
    }
  };

  const colors = getColors();
  const isLg = size === "lg";

  return (
    <span style={{
      backgroundColor: colors.bg,
      color: colors.color,
      border: `1px solid ${colors.border}`,
      padding: isLg ? '5px 12px' : '3px 9px',
      borderRadius: 20,
      fontSize: isLg ? 13 : 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.6px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: isLg ? 7 : 6,
        height: isLg ? 7 : 6,
        borderRadius: '50%',
        background: colors.color,
        display: 'inline-block',
        flexShrink: 0,
      }} />
      {status?.replace(/_/g, ' ') || 'Unknown'}
    </span>
  );
}

function Button({ children, onClick, disabled = false, variant = "primary", style = {}, ...props }) {
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
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        padding: "12px 24px",
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

function CardHeader({ title, icon, badge, subtitle }) {
  return (
    <div style={{
      padding: "20px 24px 16px",
      borderBottom: `1px solid ${C.border}`,
      background: C.surfaceAlt,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {icon && (
          <span style={{
            width: 36, height: 36, borderRadius: 10,
            background: C.primarySoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>{icon}</span>
        )}
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: '-0.01em' }}>
            {title}
          </div>
          {subtitle && <div style={{ fontSize: 12, color: C.inkLight, marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
      {badge}
    </div>
  );
}

function InfoRow({ label, value, highlight, mono }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '140px 1fr',
      alignItems: 'start',
      gap: 12,
      padding: '8px 0',
      borderBottom: `1px solid ${C.surfaceDeep}`,
    }}>
      <span style={{ fontSize: 13, color: C.inkLight, fontWeight: 500, paddingTop: 1 }}>
        {label}
      </span>
      <span style={{
        fontSize: highlight ? 15 : 14,
        fontWeight: highlight ? 700 : 500,
        color: highlight || C.ink,
        fontFamily: mono ? 'monospace' : 'inherit',
        letterSpacing: mono ? '0.5px' : 'inherit',
        lineHeight: 1.5,
      }}>
        {value}
      </span>
    </div>
  );
}

export default function ApplicationDetailsPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deletingAssessment, setDeletingAssessment] = useState(false);
  const userRole = normalizeRole(getStoredUser()?.role);
  const canRunRiskAndReco = canRunRiskAndRecommendation(userRole);
  const canSubmitOrCancel = canCreateEditSubmitApplications(userRole);
  const canDecideByRole = canMakeApplicationDecision(userRole);

  useEffect(() => {
    loadApplicationDetails();
  }, [applicationId]);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadApplicationDetails = async () => {
    try {
      setLoading(true);
      const res = await client.get(`/api/applications/${applicationId}/details`);
      setApplication(res.data.application);
      setApplicant(res.data.applicant);
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to load application details";
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    const statusCheck = validateStatusChangeByRole(userRole, newStatus);
    if (!statusCheck.allowed) {
      showToast(statusCheck.message, 'error');
      return;
    }

    try {
      setUpdating(true);
      await client.put(`/api/applications/${applicationId}/status`, {
        status: newStatus,
        notes: decisionNotes.trim()
      });
      showToast(`Application ${newStatus.toLowerCase()} successfully`, "success");
      setDecisionNotes('');
      await loadApplicationDetails();
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || `Failed to ${newStatus.toLowerCase()} application`;
      showToast(errorMsg, "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAssessment = async () => {
    if (!canRunRiskAndReco) {
      showToast('Only Admin and Bank Manager can archive assessments', 'error');
      return;
    }

    if (!application?.riskAssessmentId) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to archive this risk assessment? This will also clear the recommendation summary."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingAssessment(true);
      await deleteRiskAssessment(application.riskAssessmentId);
      showToast("Risk assessment archived successfully", "success");
      await loadApplicationDetails();
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to archive risk assessment";
      showToast(errorMsg, "error");
    } finally {
      setDeletingAssessment(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-LK', {
    style: 'currency', currency: 'LKR', minimumFractionDigits: 0,
  }).format(amount);

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const isFinalized = application?.status && ['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status);
  const canGoToRisk = canRunRiskAndReco && !isFinalized;
  const canGoToRecommendation = canRunRiskAndReco && application?.riskStatus === 'ASSESSED' && !isFinalized;
  const canMakeDecision = canDecideByRole && application?.recommendationStatus === 'GENERATED' && !isFinalized;
  const showDecisionAccessAlert = !canDecideByRole && !isFinalized;
  const showOperationalAccessNote = canRunRiskAndReco && !canDecideByRole && !isFinalized;
  const roleLabel = userRole === 'LOAN_OFFICER'
    ? 'Loan Officer'
    : userRole?.replace(/_/g, ' ') || 'Current Role';

  const getRiskStatusMessage = () => {
    switch (application?.riskStatus) {
      case "NOT_ASSESSED": case null: case undefined:
        return "No risk assessment has been initiated for this application.";
      case "ASSESSING":  return "Risk assessment is currently in progress.";
      case "ASSESSED":   return "Risk assessment completed successfully.";
      case "FAILED":     return "Risk assessment encountered an error.";
      default:           return "Risk assessment status unknown.";
    }
  };

  const getRecommendationStatusMessage = () => {
    switch (application?.recommendationStatus) {
      case "NOT_GENERATED": case null: case undefined:
        return "AI recommendation has not been generated yet.";
      case "GENERATING":  return "AI recommendation is being generated.";
      case "GENERATED":   return "AI recommendation generated successfully.";
      case "FAILED":      return "Recommendation generation encountered an error.";
      default:            return "Recommendation status unknown.";
    }
  };

  const getButtonDisabledReason = (action) => {
    if (isFinalized) return "Application is already finalized.";
    switch (action) {
      case "recommendation":
        return application?.riskStatus !== 'ASSESSED' ? "Complete risk assessment first to enable recommendation." : null;
      case "decision":
        return application?.recommendationStatus !== 'GENERATED' ? "Generate AI recommendation first to enable final decision." : null;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div style={{ background: C.surfaceDeep, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40,
            border: `3px solid ${C.border}`, borderTop: `3px solid ${C.primary}`,
            borderRadius: "50%", animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }} />
          <p style={{ color: C.inkMid, fontSize: 14 }}>Loading application details…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: C.surfaceDeep, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <p style={{ color: C.danger, fontWeight: 600, marginBottom: 24, fontSize: 15 }}>{error}</p>
          <Button onClick={() => navigate('/applications')}>← Back to Applications</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.surfaceDeep, minHeight: '100vh', padding: '24px 20px' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 48 }}>

        {/* Premium Page Header */}
        <div style={{ marginBottom: 32 }}>
          <button
            onClick={() => navigate('/applications')}
            style={{
              background: C.surface, border: `1px solid ${C.border}`,
              color: C.inkMid, borderRadius: 8, padding: "8px 12px",
              fontWeight: 500, cursor: "pointer", fontSize: 14,
              display: "inline-flex", alignItems: "center", gap: 8,
              marginBottom: 16, transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = C.primary;
              e.target.style.color = 'white';
              e.target.style.borderColor = C.primary;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = C.surface;
              e.target.style.color = C.inkMid;
              e.target.style.borderColor = C.border;
            }}
          >
            ← Back to Applications
          </button>

          <div style={{
            background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDk} 100%)`,
            borderRadius: 16,
            padding: "24px 32px",
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: `0 8px 32px ${C.primary}20`,
          }}>
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                  <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                    Loan Application Details
                  </h1>
                  <div style={{
                    background: "rgba(255,255,255,0.2)",
                    borderRadius: 12,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    backdropFilter: "blur(10px)"
                  }}>
                    {application?.status?.replace(/_/g, ' ') || 'UNKNOWN'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, opacity: 0.8 }}>Application No.</span>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      background: "rgba(255,255,255,0.25)", borderRadius: 6,
                      padding: '3px 8px', fontFamily: 'monospace',
                    }}>
                      #{application?.applicationNumber || applicationId}
                    </span>
                  </div>
                  {applicant && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, opacity: 0.8 }}>Applicant</span>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{applicant.fullName}</span>
                      </div>
                      <div style={{
                        fontSize: 12, fontWeight: 600, opacity: 0.9,
                        background: "rgba(255,255,255,0.15)", borderRadius: 6, padding: '3px 8px',
                      }}>
                        {applicant.nic}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: 12,
                padding: 16,
                textAlign: 'center',
                backdropFilter: "blur(10px)",
                minWidth: 120
              }}>
                <div style={{ fontSize: 11, marginBottom: 4, opacity: 0.8 }}>Last Updated</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>
                  {application?.updatedAt ? formatDate(application.updatedAt) : '—'}
                </div>
              </div>
            </div>
            <div style={{
              position: 'absolute', top: -30, right: -30,
              width: 120, height: 120,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '50%',
            }}></div>
          </div>
        </div>

        {/* Workflow Status Strip */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          marginBottom: 32,
          overflow: 'hidden',
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
        }}>
          {[
            {
              step: '01', label: 'Application Status',
              badge: <StatusBadge status={application?.status} />,
              done: true,
            },
            {
              step: '02', label: 'Risk Assessment',
              badge: <StatusBadge status={application?.riskStatus || 'NOT_ASSESSED'} type="risk" />,
              done: application?.riskStatus === 'ASSESSED',
            },
            {
              step: '03', label: 'AI Recommendation',
              badge: <StatusBadge status={application?.recommendationStatus || 'NOT_GENERATED'} type="recommendation" />,
              done: application?.recommendationStatus === 'GENERATED',
            },
          ].map((item, i, arr) => (
            <div key={i} style={{
              padding: '20px 24px',
              borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
              display: 'flex', flexDirection: 'column', gap: 8,
              background: item.done ? C.surfaceAlt : C.surface,
              position: 'relative',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: item.done ? C.primary : C.border,
                  color: item.done ? '#fff' : C.inkLight,
                  fontSize: 12, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {item.done ? '✓' : item.step}
                </span>
                <span style={{ fontSize: 12, color: C.inkMid, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {item.label}
                </span>
              </div>
              <div style={{ paddingLeft: 40 }}>
                {item.badge}
              </div>
            </div>
          ))}
        </div>

        {/* Information Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>

          {/* Applicant Information */}
          {applicant && (
            <SectionCard>
              <CardHeader
                title="Applicant Information"
                icon="👤"
                subtitle="Personal & employment profile"
              />
              <div style={{ padding: '20px 24px' }}>
                <InfoRow label="Full Name" value={applicant.fullName} highlight={C.ink} />
                <InfoRow label="NIC" value={applicant.nic} mono />
                <InfoRow label="Phone" value={applicant.phone} />
                <InfoRow label="Email" value={applicant.email} />
                <InfoRow label="Address" value={applicant.address || 'Not provided'} />
                <InfoRow label="Job Type" value={applicant.jobType} />
                <InfoRow label="Employment" value={applicant.employmentStatus} />
                <InfoRow
                  label="Monthly Income"
                  value={formatCurrency(applicant.monthlyIncome)}
                  highlight={C.primary}
                />
                <InfoRow label="Dependents" value={applicant.dependents} />
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'start', gap: 12, padding: '8px 0' }}>
                  <span style={{ fontSize: 13, color: C.inkLight, fontWeight: 500, paddingTop: 1 }}>Existing Loans</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: C.ink }}>{applicant.existingLoans}</span>
                </div>
                {applicant.branch && (
                  <InfoRow label="Branch" value={applicant.branch} />
                )}
              </div>
            </SectionCard>
          )}

          {/* Loan Information */}
          {application && (
            <SectionCard>
              <CardHeader
                title="Loan Information"
                icon="📋"
                subtitle="Requested terms & conditions"
              />
              <div style={{ padding: '20px 24px' }}>
                <InfoRow
                  label="Requested Amount"
                  value={formatCurrency(application.amount)}
                  highlight={C.primary}
                />
                <InfoRow label="Term Period" value={application.termMonths ? `${application.termMonths} months` : 'Not specified'} highlight={C.ink} />
                <InfoRow label="Interest Rate" value={application.interestRate ? `${application.interestRate}%` : 'Not specified'} />
                <InfoRow label="Purpose" value={application.purpose || 'Not specified'} />
                <InfoRow label="Co-Signer" value={application.hasCoSigner === null || application.hasCoSigner === undefined ? 'Not specified' : (application.hasCoSigner ? '✓ Yes' : '✗ No')} />

                {(application.recommendedAmount || application.recommendedPeriod || application.recommendedInterestRate) && (
                  <>
                    <div style={{
                      margin: '16px 0 12px',
                      padding: '8px 12px',
                      background: C.successSoft,
                      border: `1px solid #6EE7B7`,
                      borderRadius: 8,
                      fontSize: 12, fontWeight: 700, color: C.success,
                      textTransform: 'uppercase', letterSpacing: '0.6px',
                    }}>
                      ✦ Proposed Terms
                    </div>
                    {application.recommendedAmount && (
                      <InfoRow label="Proposed Amount" value={formatCurrency(application.recommendedAmount)} highlight={C.success} />
                    )}
                    {application.recommendedPeriod && (
                      <InfoRow label="Proposed Period" value={`${application.recommendedPeriod} months`} highlight={C.success} />
                    )}
                    {application.recommendedInterestRate && (
                      <InfoRow label="Proposed Rate" value={`${application.recommendedInterestRate}%`} highlight={C.success} />
                    )}
                  </>
                )}

                <div style={{ margin: '16px 0 12px', height: 1, background: C.border }} />
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: C.inkLight }}>Created</span>
                    <span style={{ fontSize: 12, color: C.inkMid, fontWeight: 500 }}>{formatDate(application.createdAt)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: C.inkLight }}>Updated</span>
                    <span style={{ fontSize: 12, color: C.inkMid, fontWeight: 500 }}>{formatDate(application.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}
        </div>

        {showOperationalAccessNote && (
          <div style={{
            marginBottom: 20,
            padding: '14px 18px',
            borderRadius: 12,
            border: `1px solid ${C.primaryMid}`,
            background: `linear-gradient(90deg, ${C.primarySoft} 0%, ${C.surfaceAlt} 100%)`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: C.primary,
            fontSize: 14,
            fontWeight: 600,
          }}>
            <span style={{ fontSize: 16 }}>ℹ️</span>
            <span>Loan Officers can continue with assessment and recommendation tasks.</span>
          </div>
        )}

        {/* Risk Assessment & Recommendation Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>

          {/* Risk Assessment */}
          <SectionCard>
            <CardHeader
              title="Risk Assessment"
              icon="🛡️"
              subtitle="Automated risk scoring module"
              badge={<StatusBadge status={application?.riskStatus || 'NOT_ASSESSED'} type="risk" />}
            />
            <div style={{ padding: '24px' }}>

              {application?.riskStatus !== 'ASSESSED' ? (
                <div style={{
                  padding: '16px 20px',
                  background: C.surfaceAlt,
                  border: `1px dashed ${C.border}`,
                  borderRadius: 12,
                  marginBottom: 20,
                }}>
                  <p style={{ fontSize: 14, color: C.inkMid, margin: 0, lineHeight: 1.6 }}>
                    {getRiskStatusMessage()}
                  </p>
                </div>
              ) : (
                <div style={{ marginBottom: 20 }}>
                  {/* Risk Score Bar Component */}
                  {application.riskScore !== undefined && application.riskScore !== null && (
                    <div style={{ marginBottom: 20 }}>
                      <RiskScoreBar
                        riskScore={application.riskScore}
                        riskLevel={application.riskLevel}
                        colorVars={C}
                      />
                    </div>
                  )}

                  <div style={{ display: 'grid', gap: 4 }}>
                    {application.riskLevel && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 0', borderBottom: `1px solid ${C.surfaceDeep}`,
                      }}>
                        <span style={{ fontSize: 13, color: C.inkLight, fontWeight: 500 }}>Risk Level</span>
                        <StatusBadge status={application.riskLevel} type="risk" />
                      </div>
                    )}
                    {application.riskAssessmentId && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 0',
                      }}>
                        <span style={{ fontSize: 13, color: C.inkLight, fontWeight: 500 }}>Assessment ID</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: C.inkMid,
                          background: C.surfaceDeep, border: `1px solid ${C.border}`,
                          borderRadius: 6, padding: '3px 8px', fontFamily: 'monospace',
                        }}>
                          #{application.riskAssessmentId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <Button
                  onClick={() => navigate(`/risk-assessment/${applicationId}`)}
                  disabled={!canGoToRisk || deletingAssessment}
                  style={{ flex: 1 }}
                >
                  {application?.riskStatus === 'ASSESSED' ? 'Reassess Risk' : 'Start Assessment'}
                </Button>
                {application?.riskStatus === 'ASSESSED' && (
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/risk-assessment/${applicationId}`)}
                    disabled={deletingAssessment}
                    style={{ flex: 1 }}
                  >
                    View Full Report
                  </Button>
                )}
                {application?.riskAssessmentId && canRunRiskAndReco && (
                  <Button
                    variant="danger"
                    onClick={handleDeleteAssessment}
                    disabled={deletingAssessment}
                    style={{ padding: "12px 16px", whiteSpace: "nowrap" }}
                  >
                    {deletingAssessment ? 'Archiving...' : 'Archive'}
                  </Button>
                )}
              </div>

              {!canGoToRisk && (
                <p style={{ fontSize: 12, color: C.inkLight, marginTop: 12, lineHeight: 1.5 }}>
                  ⚠ {getButtonDisabledReason("risk")}
                </p>
              )}
            </div>
          </SectionCard>

          {/* AI Recommendation */}
          <SectionCard>
            <CardHeader
              title="AI Recommendation"
              icon="🤖"
              subtitle="Intelligent loan recommendation engine"
              badge={<StatusBadge status={application?.recommendationStatus || 'NOT_GENERATED'} type="recommendation" />}
            />
            <div style={{ padding: '24px' }}>

              {application?.recommendationStatus !== 'GENERATED' ? (
                <div style={{
                  padding: '16px 20px',
                  background: C.surfaceAlt,
                  border: `1px dashed ${C.border}`,
                  borderRadius: 12,
                  marginBottom: 20,
                }}>
                  <p style={{ fontSize: 14, color: C.inkMid, margin: 0, lineHeight: 1.6 }}>
                    {getRecommendationStatusMessage()}
                  </p>
                </div>
              ) : (
                <div style={{ marginBottom: 20 }}>
                  <div style={{
                    padding: '12px 16px',
                    background: C.successSoft,
                    border: `1px solid #6EE7B7`,
                    borderRadius: 10,
                    marginBottom: 16,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 16 }}>✅</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.success }}>
                      AI recommendation generated successfully
                    </span>
                  </div>

                  <div style={{ display: 'grid', gap: 4 }}>
                    {application.recommendedAmount && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 0', borderBottom: `1px solid ${C.surfaceDeep}`,
                      }}>
                        <span style={{ fontSize: 13, color: C.inkLight, fontWeight: 500 }}>Recommended Amount</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: C.success }}>
                          {formatCurrency(application.recommendedAmount)}
                        </span>
                      </div>
                    )}
                    {application.recommendedPeriod && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 0', borderBottom: `1px solid ${C.surfaceDeep}`,
                      }}>
                        <span style={{ fontSize: 13, color: C.inkLight, fontWeight: 500 }}>Recommended Period</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.success }}>
                          {application.recommendedPeriod} months
                        </span>
                      </div>
                    )}
                    {application.recommendedInterestRate && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 0', borderBottom: application.recommendationId ? `1px solid ${C.surfaceDeep}` : 'none',
                      }}>
                        <span style={{ fontSize: 13, color: C.inkLight, fontWeight: 500 }}>Interest Rate</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.success }}>
                          {application.recommendedInterestRate}%
                        </span>
                      </div>
                    )}
                    {application.recommendationId && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 0',
                      }}>
                        <span style={{ fontSize: 13, color: C.inkLight, fontWeight: 500 }}>Recommendation ID</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: C.inkMid,
                          background: C.surfaceDeep, border: `1px solid ${C.border}`,
                          borderRadius: 6, padding: '3px 8px', fontFamily: 'monospace',
                        }}>
                          #{application.recommendationId.slice(-8)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Button
                  onClick={() => navigate(`/recommendation-engine/${applicationId}`)}
                  disabled={!canGoToRecommendation}
                  style={{ flex: 1 }}
                >
                  {application?.recommendationStatus === 'GENERATED' ? 'Regenerate' : 'Generate Recommendation'}
                </Button>

                {application?.recommendationStatus === 'GENERATED' && (
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/recommendation-engine/${applicationId}`)}
                    style={{ flex: 1 }}
                  >
                    View Full Report
                  </Button>
                )}

                {application?.status === 'APPROVED' && (
                  <Button
                    variant="success"
                    onClick={() => navigate(`/repayment/${applicationId}`)}
                    style={{ flex: 1 }}
                  >
                    View Repayment Schedule
                  </Button>
                )}
              </div>

              {!canGoToRecommendation && (
                <p style={{ fontSize: 12, color: C.inkLight, marginTop: 12, lineHeight: 1.5 }}>
                  ⚠ {getButtonDisabledReason("recommendation")}
                </p>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Final Decision Section */}
        <SectionCard>
          <CardHeader
            title="Final Decision"
            icon="⚖️"
            subtitle="Approve, reject or cancel this loan application"
            badge={isFinalized
              ? <StatusBadge status={application?.status} size="lg" />
              : canMakeDecision
                ? <span style={{
                  background: C.successSoft, color: C.success,
                  border: `1px solid #6EE7B7`,
                  borderRadius: 20, padding: '6px 12px',
                  fontSize: 12, fontWeight: 700,
                }}>Ready for Decision</span>
                : <span style={{
                  background: C.surfaceDeep, color: C.inkLight,
                  border: `1px solid ${C.border}`,
                  borderRadius: 20, padding: '6px 12px',
                  fontSize: 12, fontWeight: 700,
                }}>Awaiting Prerequisites</span>
            }
          />
          <div style={{ padding: '24px 32px' }}>
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 10, fontSize: 14, fontWeight: 600, color: C.ink,
              }}>
                Decision Notes
                <span style={{ fontSize: 12, fontWeight: 400, color: C.inkLight }}>(Optional)</span>
              </label>
              <textarea
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder={isFinalized
                  ? "Application is finalized — no further notes can be added."
                  : "Add notes about your approval or rejection decision…"
                }
                disabled={isFinalized || (!canDecideByRole && !canSubmitOrCancel)}
                readOnly={isFinalized || (!canDecideByRole && !canSubmitOrCancel)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: `1px solid ${isFinalized ? C.border : C.borderMid}`,
                  borderRadius: 10,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  background: isFinalized ? C.surfaceAlt : C.surface,
                  color: isFinalized ? C.inkMid : C.ink,
                  cursor: isFinalized ? 'not-allowed' : 'text',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                  lineHeight: 1.6,
                }}
              />
            </div>

            {showDecisionAccessAlert && (
              <div style={{
                marginBottom: 18,
                padding: '16px 18px',
                borderRadius: 12,
                border: '1px solid #F59E0B',
                background: 'linear-gradient(135deg, rgba(245,158,11,0.22) 0%, rgba(217,119,6,0.14) 100%)',
                boxShadow: '0 6px 18px rgba(245,158,11,0.18)',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#FDE68A', marginBottom: 6 }}>
                    Decision Access Restricted
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: '#FEF3C7', fontWeight: 500 }}>
                    You are logged in as {roleLabel}. {roleLabel}s can run risk assessment and recommendation, but only Bank Managers and Admins can approve, reject, or cancel applications.
                  </div>
                </div>
              </div>
            )}

            <div style={{
              display: 'flex', alignItems: 'center', gap: 16,
              paddingTop: 4, flexWrap: 'wrap',
              opacity: showDecisionAccessAlert ? 0.78 : 1,
            }}>
              <Button
                variant="success"
                onClick={() => handleStatusUpdate('APPROVED')}
                disabled={!canMakeDecision || updating}
                style={{ minWidth: 120 }}
              >
                {updating ? '⏳ Processing...' : '✓ Approve'}
              </Button>
              <Button
                variant="danger"
                onClick={() => handleStatusUpdate('REJECTED')}
                disabled={!canMakeDecision || updating}
                style={{ minWidth: 120 }}
              >
                {updating ? '⏳ Processing...' : '✕ Reject'}
              </Button>
              <div style={{ height: 32, width: 1, background: C.border, margin: '0 4px' }} />
              <Button
                variant="secondary"
                onClick={() => handleStatusUpdate('CANCELLED')}
                // CHANGED: Cancel is final decision -> ADMIN/BANK_MANAGER only
                disabled={isFinalized || updating || !canDecideByRole}
                style={{ minWidth: 120 }}
              >
                {updating ? '⏳ Processing...' : 'Cancel Application'}
              </Button>
            </div>

            {!showDecisionAccessAlert && !canMakeDecision && !isFinalized && (
              <div style={{
                marginTop: 16, padding: '12px 16px',
                background: C.warnSoft, border: `1px solid #FDE68A`,
                borderRadius: 10, fontSize: 13, color: C.warn,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span>⚠</span>
                <span>{getButtonDisabledReason("decision")}</span>
              </div>
            )}

            {isFinalized && (
              <div style={{
                marginTop: 16, padding: '12px 16px',
                background: C.surfaceAlt, border: `1px solid ${C.border}`,
                borderRadius: 10, fontSize: 13, color: C.inkMid,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span>✓</span>
                <span>Application has been finalized. No further actions are available.</span>
              </div>
            )}
          </div>
        </SectionCard>

      </div>
    </div>
  );
}
