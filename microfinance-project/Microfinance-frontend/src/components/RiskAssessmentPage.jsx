import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import client from "../api/client";
import { riskAssessmentsApi, deleteRiskAssessment } from "../services/riskAssessmentService";
import GradientSummaryCard from './shared/GradientSummaryCard';
import { PageHeader } from './PageHeader';
import RiskScoreBar from './RiskScoreBar';
import ShapExplanationChart from './ShapExplanationChart';

const C = {
  primary: "var(--primary)",
  primaryDk: "var(--primary-hover)",
  primarySoft: "var(--primary-soft)",
  accent: "var(--accent)",
  danger: "var(--danger)",
  dangerSoft: "var(--danger-soft)",
  warn: "var(--warning)",
  warnSoft: "var(--warning-soft)",
  success: "var(--success)",
  successSoft: "var(--success-soft)",
  purple: "#7C3AED",
  ink: "var(--text)",
  inkMid: "var(--text-muted)",
  inkLight: "var(--text-light)",
  border: "var(--border)",
  surface: "var(--surface)",
  surfaceAlt: "var(--surface-2)",
  surfaceDeep: "var(--surface-3)",
};

export default function RiskAssessmentPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState(null);
  const [applicant, setApplicant] = useState(null);
  const [error, setError] = useState(null);

  // Risk assessment state
  const [assessment, setAssessment] = useState(null);
  const [runningAssessment, setRunningAssessment] = useState(false);
  const [assessmentError, setAssessmentError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [deletingAssessment, setDeletingAssessment] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteModalError, setDeleteModalError] = useState('');

  // Responsive grid layout
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getGridColumns = () => {
    if (windowWidth >= 1200) return "repeat(5, minmax(0, 1fr))"; // 5 columns for desktop
    if (windowWidth >= 768) return "repeat(3, minmax(0, 1fr))";  // 3 columns for tablet
    if (windowWidth >= 480) return "repeat(2, minmax(0, 1fr))";  // 2 columns for small tablet
    return "1fr"; // 1 column for mobile
  };

  // For Mode B (no applicationId) - application selection
  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [loadingApps, setLoadingApps] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const isDirectMode = !!applicationId;
  const isSelectionMode = !applicationId;

  // ═══════════════════════════════════════════════════════════
  // HELPER: No-cache config and data refresh
  // ═══════════════════════════════════════════════════════════

  const noCacheConfig = () => ({
    params: { _ts: Date.now() },
    headers: { "Cache-Control": "no-cache" }
  });

  const refreshRiskPageData = async (appId) => {
    // Re-fetch application details with no-cache
    const detailsRes = await client.get(`/api/applications/${appId}/details`, noCacheConfig());
    const applicationData = detailsRes.data.application;
    setApplication(applicationData);
    setApplicant(detailsRes.data.applicant);

    // Re-fetch latest assessment with no-cache
    try {
      const latestAssessment = await riskAssessmentsApi.getLatestRiskAssessmentByApplication(appId, noCacheConfig());
      setAssessment(latestAssessment);
    } catch (err) {
      if (err?.response?.status === 404) {
        setAssessment(null);
      } else {
        throw err;
      }
    }
  };

  useEffect(() => {
    if (isDirectMode) {
      loadApplicationDetails(applicationId);
    } else {
      loadAvailableApplications();
    }
  }, [applicationId]);

  const loadAvailableApplications = async () => {
    try {
      setLoadingApps(true);
      const res = await client.get('/api/applications');
      const reviewedApps = (res.data || []).filter(app =>
        app.status === 'REVIEW' || app.status === 'PENDING'
      );
      setApplications(reviewedApps);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load applications"
      );
    } finally {
      setLoadingApps(false);
      setLoading(false);
    }
  };

  const handleApplicationSelect = (appId) => {
    setSelectedAppId(appId);
    setLoading(true);
    loadApplicationDetails(appId);
  };

  const loadApplicationDetails = async (appId) => {
    try {
      setLoading(true);
      setAssessmentError(null);
      // Use no-cache config to always get fresh data
      const res = await client.get(`/api/applications/${appId}/details`, noCacheConfig());
      const applicationData = res.data.application;
      setApplication(applicationData);
      setApplicant(res.data.applicant);

      try {
        const assessmentData = await riskAssessmentsApi.getLatestRiskAssessmentByApplication(appId, noCacheConfig());
        setAssessment(assessmentData);
      } catch (assessmentErr) {
        if (applicationData?.riskAssessmentId) {
          try {
            const fallbackAssessment = await riskAssessmentsApi.getRiskAssessmentById(applicationData.riskAssessmentId, noCacheConfig());
            setAssessment(fallbackAssessment);
          } catch (fallbackErr) {
            if (fallbackErr?.response?.status === 404) {
              setAssessment(null);
            } else {
              console.warn("Fallback assessment loading failed:", fallbackErr);
              setAssessment(null);
            }
          }
        } else if (assessmentErr?.response?.status === 404) {
          setAssessment(null);
        } else {
          console.warn("Latest assessment loading failed:", assessmentErr);
          setAssessment(null);
        }
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load application details"
      );
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    if (riskLevel === "LOW") return C.success;
    if (riskLevel === "MEDIUM") return C.warn;
    if (riskLevel === "HIGH") return C.danger;
    return C.danger;
  };

  const getRiskBg = (riskLevel) => {
    if (riskLevel === "LOW") return C.successSoft;
    if (riskLevel === "MEDIUM") return C.warnSoft;
    if (riskLevel === "HIGH") return C.dangerSoft;
    return C.dangerSoft;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const normalizeRiskScore = (score) => {
    if (score === null || score === undefined || Number.isNaN(score)) return 0;
    let normalized = Number(score);
    // If it's a decimal between 0 and 1, multiply by 100
    if (normalized > 0 && normalized <= 1) {
      normalized = normalized * 100;
    }
    // Clamp between 0 and 100
    return Math.min(100, Math.max(0, Math.round(normalized)));
  };

  const formatRiskScore = (score) => {
    if (score === null || score === undefined || Number.isNaN(score)) return "-";
    const normalized = normalizeRiskScore(score);
    return normalized === 0 ? "N/A" : `${normalized}%`;
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString();
  };

  const formatLabel = (key) => {
    const labels = {
      monthlyIncome: "Monthly Income",
      existingLoans: "Existing Loans",
      dependents: "Dependents",
      employmentStatus: "Employment Status",
      employmentLengthMonths: "Employment Length (Months)",
      monthlyDebtPayment: "Monthly Debt Payment",
      creditScore: "Credit Score",
      applicationAmount: "Application Amount",
      termMonths: "Term (Months)",
      hasCoSigner: "Has Co-Signer"
    };
    return labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const validateAssessmentEligibility = () => {
    // Validate applicationId
    if (!applicationId && !selectedAppId) {
      return "No application selected. Please select an application to assess.";
    }

    const appId = applicationId || selectedAppId;
    if (!appId || appId.trim() === "") {
      return "Application ID is required.";
    }

    // Validate application exists
    if (!application) {
      return "Application data not found. Please reload and try again.";
    }

    // Validate applicant exists
    if (!applicant) {
      return "Applicant data not found. Cannot proceed with assessment.";
    }

    // Validate application status
    const finalized = ['APPROVED', 'REJECTED', 'CANCELLED'].includes(application?.status);
    if (finalized) {
      return `Cannot assess finalized applications. Status: ${application?.status}`;
    }

    // Validate applicant income
    if (!applicant.monthlyIncome) {
      return "Applicant monthly income is required for risk assessment.";
    }
    if (Number(applicant.monthlyIncome) <= 0) {
      return "Applicant monthly income must be greater than zero.";
    }

    // Validate employment status
    if (!applicant.employmentStatus || applicant.employmentStatus.trim() === "") {
      return "Applicant employment status is required for risk assessment.";
    }

    // Validate application amount
    if (!application.amount) {
      return "Loan amount is required for risk assessment.";
    }
    if (Number(application.amount) <= 0) {
      return "Loan amount must be greater than zero.";
    }

    // NOTE: Term months is optional - applications can be created with amount only
    // Risk assessment will proceed with amount and applicant profile
    if (application.termMonths !== null && application.termMonths !== undefined && Number(application.termMonths) <= 0) {
      return "If provided, loan term must be greater than zero.";
    }

    return null; // All validations passed
  };

  const isAssessmentDisabled = () => {
    if (runningAssessment || deletingAssessment) return true;
    if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(application?.status)) return true;
    // Use validation function to check all data requirements
    return validateAssessmentEligibility() !== null;
  };

  const getAssessmentDisabledReason = () => {
    if (runningAssessment) return "Running assessment...";
    if (deletingAssessment) return "Processing...";
    return validateAssessmentEligibility();
  };

  const handleRunAssessment = async (appId) => {
    try {
      setAssessmentError(null);
      setActionSuccess(null);
      setDeleteError(null);

      // Run comprehensive validation
      const validationError = validateAssessmentEligibility();
      if (validationError) {
        setAssessmentError(validationError);
        return;
      }

      setRunningAssessment(true);

      // CRITICAL: Clear stale assessment state BEFORE calling API
      // This shows UI is loading fresh data
      setAssessment(null);

      // Call API to run assessment
      await riskAssessmentsApi.runRiskAssessment(appId, noCacheConfig());

      // Re-fetch ALL fresh data after successful mutation
      await refreshRiskPageData(appId);

      setActionSuccess("Risk assessment completed successfully");
    } catch (err) {
      const errorMessage = err?.response?.data?.message ||
                          err?.response?.data?.error ||
                          err?.message ||
                          "Failed to run risk assessment";
      setAssessmentError(errorMessage);
    } finally {
      setRunningAssessment(false);
    }
  };

  const handleDeleteAssessment = () => {
    // Open delete modal
    setShowDeleteModal(true);
    setDeleteReason('');
    setDeleteModalError('');
  };

  const handlePermanentlyDeleteAssessment = async () => {
    // Validate delete reason
    if (!deleteReason || deleteReason.trim().length < 3) {
      setDeleteModalError("Delete reason must be at least 3 characters");
      return;
    }

    try {
      setDeleteModalError('');
      setDeletingAssessment(true);
      setDeleteError(null);
      setActionSuccess(null);
      setAssessmentError(null);

      const activeApplicationId = applicationId || selectedAppId;
      if (!activeApplicationId || activeApplicationId.trim() === "") {
        setDeleteModalError("Application ID is missing");
        return;
      }

      // Call the delete API with reason
      await deleteRiskAssessment(assessment.id);

      // Show success message
      setActionSuccess("Risk assessment deleted successfully");

      // Close modal and clear form
      setShowDeleteModal(false);
      setDeleteReason('');
      setDeleteModalError('');

      // Clear assessment from state
      setAssessment(null);

      // Redirect to applications page after brief delay
      setTimeout(() => {
        navigate("/applications");
      }, 1500);

    } catch (err) {
      console.error('Delete risk assessment failed:', err);
      const errorMessage = err?.response?.data?.message ||
                          err?.response?.data?.error ||
                          err?.message ||
                          "Failed to delete risk assessment";
      setDeleteModalError(errorMessage);
    } finally {
      setDeletingAssessment(false);
    }
  };

  const getStats = () => {
    if (isDirectMode) {
      return {
        totalReady: application ? 1 : 0,
        pending: application?.status === 'PENDING' ? 1 : 0,
        review: application?.status === 'REVIEW' ? 1 : 0,
        assessed: application?.riskStatus === 'ASSESSED' ? 1 : 0
      };
    } else {
      return {
        totalReady: applications.length,
        pending: applications.filter(app => app.status === 'PENDING').length,
        review: applications.filter(app => app.status === 'REVIEW').length,
        assessed: applications.filter(app => app.riskStatus === 'ASSESSED').length
      };
    }
  };

  const getFilteredApplications = () => {
    let filtered = applications;

    if (searchTerm) {
      filtered = filtered.filter(app =>
        app.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.applicationNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    switch (activeFilter) {
      case 'Pending':
        filtered = filtered.filter(app => app.status === 'PENDING');
        break;
      case 'Review':
        filtered = filtered.filter(app => app.status === 'REVIEW');
        break;
      case 'Assessed':
        filtered = filtered.filter(app => app.riskStatus === 'ASSESSED');
        break;
      case 'High Risk':
        filtered = filtered.filter(app => app.riskLevel === 'HIGH');
        break;
      case 'Medium Risk':
        filtered = filtered.filter(app => app.riskLevel === 'MEDIUM');
        break;
      case 'Low Risk':
        filtered = filtered.filter(app => app.riskLevel === 'LOW');
        break;
    }

    return filtered;
  };

  const stats = getStats();

  const withHash = (value) => {
    if (!value) return null;
    return String(value).startsWith("#") ? String(value) : `#${value}`;
  };

  const buildReadableRiskId = (application, assessment) => {
    if (assessment?.riskAssessmentNumber) return withHash(assessment.riskAssessmentNumber);
    if (assessment?.assessmentNumber) return withHash(assessment.assessmentNumber);
    if (assessment?.riskAssessmentId && /^RA-/i.test(assessment.riskAssessmentId)) return withHash(assessment.riskAssessmentId);
    if (application?.riskAssessmentId && /^RA-/i.test(application.riskAssessmentId)) return withHash(application.riskAssessmentId);

    if (application?.applicationNumber) {
      return withHash(application.applicationNumber.replace(/^APP-/i, "RA-"));
    }

    return null;
  };

  const buildReadableRecommendationId = (application, recommendation) => {
    if (recommendation?.recommendationNumber) return withHash(recommendation.recommendationNumber);
    if (recommendation?.recommendationId && /^REC-/i.test(recommendation.recommendationId)) return withHash(recommendation.recommendationId);
    if (application?.recommendationId && /^REC-/i.test(application.recommendationId)) return withHash(application.recommendationId);

    if (application?.applicationNumber) {
      return withHash(application.applicationNumber.replace(/^APP-/i, "REC-"));
    }

    return null;
  };

  const getApplicationStatusCardTheme = (status) => {
    switch ((status || "").toUpperCase()) {
      case "APPROVED":
        return {
          gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          lineGradient: "linear-gradient(90deg, #10b981, #34d399)",
        };
      case "REVIEW":
        return {
          gradient: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)",
          lineGradient: "linear-gradient(90deg, #9333ea, #c084fc)",
        };
      case "PENDING":
        return {
          gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          lineGradient: "linear-gradient(90deg, #f59e0b, #fbbf24)",
        };
      case "REJECTED":
        return {
          gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          lineGradient: "linear-gradient(90deg, #ef4444, #f87171)",
        };
      default:
        return {
          gradient: "linear-gradient(135deg, #475569 0%, #334155 100%)",
          lineGradient: "linear-gradient(90deg, #64748b, #94a3b8)",
        };
    }
  };

  // Loading state
  if (loading && (isDirectMode || selectedAppId)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.surfaceDeep,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: `4px solid ${C.border}`,
              borderTop: `4px solid ${C.primary}`,
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px",
            }}
          />
          <p style={{ color: C.inkMid, fontSize: 16, fontWeight: 500 }}>Loading application details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.surfaceDeep,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{
          textAlign: "center",
          maxWidth: 500,
          background: C.surface,
          padding: 48,
          borderRadius: 20,
          boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          border: `1px solid ${C.border}`
        }}>
          <div style={{ fontSize: 64, marginBottom: 24, color: C.danger }}>⚠️</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: C.ink, marginBottom: 16 }}>
            Error Loading Application
          </h2>
          <p style={{ color: C.danger, fontWeight: 600, marginBottom: 32, fontSize: 16 }}>{error}</p>
          <button
            onClick={() => navigate("/applications")}
            style={{
              background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDk} 100%)`,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "16px 32px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 16,
              boxShadow: `0 6px 20px ${C.primary}30`,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => e.target.style.transform = "translateY(-2px)"}
            onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
          >
            Back to Applications
          </button>
        </div>
      </div>
    );
  }

  // Mode B: Application Selection Screen
  if (isSelectionMode && !selectedAppId) {
    const filteredApps = getFilteredApplications();

    return (
      <div style={{ minHeight: "100vh", background: C.surfaceDeep, padding: 24 }}>
        <style>{`
          .dark-search-input::placeholder {
            color: var(--text-muted) !important;
            opacity: 1;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <PageHeader
            title="Risk Assessment Dashboard"
            subtitle="Select an application to analyze risk and generate assessment scores"
            actions={
              <button
                onClick={() => navigate("/applications")}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  color: C.inkMid,
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontSize: 14,
                  transition: 'all 0.2s ease'
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
            }
          />

          {/* Summary Stats Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <GradientSummaryCard
              title="Total Ready"
              value={stats.totalReady}
              subtitle="Applications available"
              gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
              lineGradient="linear-gradient(90deg, #3b82f6, #60a5fa)"
              icon="📊"
              index={0}
            />
            <GradientSummaryCard
              title="Pending"
              value={stats.pending}
              subtitle="Awaiting review"
              gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              lineGradient="linear-gradient(90deg, #f59e0b, #fbbf24)"
              icon="⏳"
              index={1}
            />
            <GradientSummaryCard
              title="In Review"
              value={stats.review}
              subtitle="Under evaluation"
              gradient="linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)"
              lineGradient="linear-gradient(90deg, #9333ea, #c084fc)"
              icon="👀"
              index={2}
            />
            <GradientSummaryCard
              title="Assessed"
              value={stats.assessed}
              subtitle="Risk scores generated"
              gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              lineGradient="linear-gradient(90deg, #10b981, #34d399)"
              icon="✅"
              index={3}
            />
          </div>

          {/* Filters and Search */}
          <div style={{
            background: C.surface,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            padding: 24,
            marginBottom: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            {/* Filter Tabs */}
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 20,
              flexWrap: 'wrap'
            }}>
              {['All', 'Pending', 'Review', 'Assessed', 'High Risk', 'Medium Risk', 'Low Risk'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  style={{
                    background: activeFilter === filter ? C.primary : C.surface,
                    color: activeFilter === filter ? 'white' : C.inkMid,
                    border: `1px solid ${activeFilter === filter ? C.primary : C.border}`,
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 14,
                    fontWeight: activeFilter === filter ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (activeFilter !== filter) {
                      e.target.style.background = C.primarySoft;
                      e.target.style.borderColor = C.primary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeFilter !== filter) {
                      e.target.style.background = C.surface;
                      e.target.style.borderColor = C.border;
                    }
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div>
              <input
                type="text"
                className="dark-search-input"
                placeholder="Search by application ID, purpose, or applicant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  transition: 'all 0.2s ease'
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
              <div style={{ marginTop: 12, fontSize: 13, color: C.inkMid }}>
                {filteredApps.length} application{filteredApps.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </div>

          {/* Application List */}
          <div style={{
            background: C.surface,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            overflow: "hidden",
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            {loadingApps ? (
              <div style={{ padding: 60, textAlign: "center" }}>
                <div style={{
                  width: 40,
                  height: 40,
                  border: `3px solid ${C.border}`,
                  borderTop: `3px solid ${C.primary}`,
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 16px",
                }} />
                <p style={{ color: C.inkMid, fontSize: 14, margin: 0 }}>Loading applications...</p>
              </div>
            ) : filteredApps.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: C.ink, marginBottom: 8 }}>
                  No Applications Found
                </h3>
                <p style={{ color: C.inkMid, fontSize: 14, marginBottom: 24 }}>
                  Try adjusting your search criteria or check different status filters.
                </p>
                <button
                  onClick={() => {
                    setActiveFilter('All');
                    setSearchTerm('');
                  }}
                  style={{
                    background: C.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                {filteredApps.map((app, index) => (
                  <div
                    key={app.id}
                    style={{
                      padding: 20,
                      borderBottom: index < filteredApps.length - 1 ? `1px solid ${C.border}` : 'none',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 20,
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = C.surfaceDeep;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                    onClick={() => handleApplicationSelect(app.id)}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>
                          #{app.applicationNumber || app.id}
                        </div>
                        <div style={{
                          backgroundColor: app.status === 'PENDING' ? C.warnSoft : C.primarySoft,
                          color: app.status === 'PENDING' ? C.warn : C.primary,
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                        }}>
                          {app.status}
                        </div>
                        {app.riskStatus === 'ASSESSED' && (
                          <div style={{
                            backgroundColor: app.riskLevel === 'LOW' ? C.successSoft :
                                           app.riskLevel === 'MEDIUM' ? C.warnSoft : C.dangerSoft,
                            color: app.riskLevel === 'LOW' ? C.success :
                                   app.riskLevel === 'MEDIUM' ? C.warn : C.danger,
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                          }}>
                            {app.riskLevel || 'ASSESSED'}
                          </div>
                        )}
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: 12,
                        fontSize: 14,
                        color: C.inkMid,
                        marginBottom: 8
                      }}>
                        <div><strong>Amount:</strong> {formatCurrency(app.amount)}</div>
                        <div><strong>Term:</strong> {app.termMonths} months</div>
                        <div><strong>Rate:</strong> {app.interestRate}%</div>
                      </div>
                      <div style={{ fontSize: 14, color: C.inkMid, marginBottom: 4 }}>
                        <strong>Purpose:</strong> {app.purpose}
                      </div>
                      <div style={{ fontSize: 12, color: C.inkLight }}>
                        Applied: {new Date(app.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div>
                      <button
                        style={{
                          background: C.primary,
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          padding: '10px 20px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: 14,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = `0 4px 12px ${C.primary}40`;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        {app.riskStatus === 'ASSESSED' ? 'View Assessment' : 'Assess Risk'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Risk Assessment Page
  return (
    <div style={{ minHeight: "100vh", background: C.surfaceDeep, padding: 24 }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Simple Page Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <button
              onClick={() => navigate("/applications")}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                color: C.inkMid,
                borderRadius: 8,
                padding: "8px 12px",
                fontWeight: 500,
                cursor: "pointer",
                fontSize: 14,
                transition: 'all 0.2s ease'
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
            {isDirectMode && (
              <>
                {application?.applicationNumber && (
                  <div
                    style={{
                      background: C.primarySoft,
                      color: C.primary,
                      padding: "4px 12px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: "monospace",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {withHash(application.applicationNumber)}
                  </div>
                )}

                {buildReadableRiskId(application, assessment) && (
                  <div
                    style={{
                      background: C.surfaceDeep,
                      color: C.inkMid,
                      padding: "4px 12px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "monospace",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {buildReadableRiskId(application, assessment)}
                  </div>
                )}

                {applicant && (
                  <div
                    style={{
                      background: C.surfaceDeep,
                      color: C.inkMid,
                      padding: "4px 12px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    {applicant.fullName}
                  </div>
                )}
              </>
            )}
          </div>
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            color: C.ink,
            margin: 0,
            marginBottom: 8,
            letterSpacing: '-0.01em'
          }}>
            Risk Assessment
          </h1>
          <p style={{
            fontSize: 16,
            color: C.inkMid,
            margin: 0,
            fontWeight: 500
          }}>
            Manage loan risk analysis and assessment results
          </p>
        </div>

        {/* Summary Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: getGridColumns(),
            gap: windowWidth >= 1200 ? 16 : 20,
            marginBottom: 32,
          }}
        >
          <GradientSummaryCard
            title="Application Number"
            displayValue={application?.applicationNumber || "N/A"}
            format="text"
            subtitle="Selected loan application"
            gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
            lineGradient="linear-gradient(90deg, #3b82f6, #60a5fa)"
            icon="📄"
            index={0}
            valueSize={26}
            minHeight={96}
          />

          <GradientSummaryCard
            title="Requested Amount"
            value={application?.amount || 0}
            format="currency"
            subtitle="Loan amount"
            gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
            lineGradient="linear-gradient(90deg, #3b82f6, #60a5fa)"
            icon="💰"
            index={1}
            valueSize={26}
            minHeight={96}
          />

          <GradientSummaryCard
            title="Term"
            displayValue={application?.termMonths ? `${application.termMonths} months` : 'To be recommended'}
            format="text"
            subtitle="Repayment period"
            gradient="linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)"
            lineGradient="linear-gradient(90deg, #9333ea, #c084fc)"
            icon="📅"
            index={2}
            valueSize={26}
            minHeight={96}
          />

          <GradientSummaryCard
            title="Monthly Income"
            value={applicant?.monthlyIncome || 0}
            format="currency"
            subtitle="Applicant income"
            gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
            lineGradient="linear-gradient(90deg, #10b981, #34d399)"
            icon="📊"
            index={3}
            valueSize={26}
            minHeight={96}
          />

          <GradientSummaryCard
            title="Current Status"
            displayValue={application?.status || "Unknown"}
            format="text"
            subtitle="Application stage"
            icon="⚡"
            index={4}
            valueSize={24}
            minHeight={96}
            {...getApplicationStatusCardTheme(application?.status)}
          />
        </div>

        {/* Assessment Result Card */}
        <div style={{
          background: C.surface,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          padding: 32,
          marginBottom: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          {assessment ? (
            <div>
              <h3 style={{
                fontSize: 18,
                fontWeight: 700,
                color: C.ink,
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                🎯 Risk Assessment Result
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: 32,
                alignItems: 'center'
              }}>
                {/* Risk Score Circle */}
                <div style={{
                  background: `linear-gradient(135deg, ${getRiskBg(assessment.riskLevel)} 0%, ${getRiskBg(assessment.riskLevel)}80 100%)`,
                  borderRadius: '50%',
                  width: 120,
                  height: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `3px solid ${getRiskColor(assessment.riskLevel)}40`,
                  position: 'relative'
                }}>
                  <div style={{
                    fontSize: 32,
                    fontWeight: 900,
                    color: getRiskColor(assessment.riskLevel),
                    lineHeight: 1
                  }}>
                    {formatRiskScore(assessment.riskScore)}
                  </div>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: getRiskColor(assessment.riskLevel),
                    textTransform: 'uppercase',
                    marginTop: 4
                  }}>
                    Risk Score
                  </div>
                </div>

                {/* Assessment Details */}
                <div>
                  <div style={{
                    background: getRiskColor(assessment.riskLevel),
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 700,
                    display: 'inline-block',
                    marginBottom: 16
                  }}>
                    {assessment.riskLevel} RISK
                  </div>

                  <p style={{
                    fontSize: 15,
                    color: C.ink,
                    marginBottom: 20,
                    lineHeight: 1.6,
                    fontWeight: 500
                  }}>
                    {assessment.explanationText}
                  </p>

                  {/* Risk Score Display with Progress Bar */}
                  <RiskScoreBar riskScore={assessment.riskScore} riskLevel={assessment.riskLevel} colorVars={C} />

                  {/* SHAP Explanation Chart - Display feature importance */}
                  {assessment.inputSnapshot?.aiDecision?.shap_explanations && (
                    <ShapExplanationChart
                      shapExplanations={assessment.inputSnapshot.aiDecision.shap_explanations}
                    />
                  )}
                  <div style={{
                    display: 'flex',
                    gap: 24,
                    fontSize: 13,
                    color: C.ink
                  }}>
                    <div>
                      <strong>Model:</strong> {assessment.modelVersion}
                    </div>
                    <div>
                      <strong>Assessed:</strong> {formatDateTime(assessment.assessedAt)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{
                fontSize: 48,
                marginBottom: 16,
                color: C.primary
              }}>
                ⚡
              </div>
              <h3 style={{
                fontSize: 20,
                fontWeight: 700,
                color: C.ink,
                marginBottom: 12
              }}>
                No Risk Assessment Yet
              </h3>
              <p style={{
                fontSize: 15,
                color: C.inkMid,
                marginBottom: 0,
                lineHeight: 1.5
              }}>
                Run the risk assessment to generate a professional score and analysis
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 18,
            alignItems: "center",
            marginTop: 24,
            marginBottom: 8,
          }}
        >
          <button
            onClick={() => handleRunAssessment(applicationId || selectedAppId)}
            disabled={isAssessmentDisabled()}
            title={getAssessmentDisabledReason() || "Click to run risk assessment"}
            style={{
              background: isAssessmentDisabled()
                ? C.inkMid
                : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: "#fff",
              border: "none",
              borderRadius: 18,
              minHeight: 54,
              padding: "0 28px",
              fontWeight: 800,
              cursor: isAssessmentDisabled() ? "not-allowed" : "pointer",
              opacity: isAssessmentDisabled() ? 0.6 : 1,
              fontSize: 15,
              letterSpacing: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: isAssessmentDisabled() ? 'none' : '0 10px 20px rgba(0,0,0,0.12)',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
              filter: 'none',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (!isAssessmentDisabled()) {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.filter = 'brightness(1.04)';
                e.target.style.boxShadow = '0 14px 24px rgba(0,0,0,0.16)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isAssessmentDisabled()) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.filter = 'none';
                e.target.style.boxShadow = '0 10px 20px rgba(0,0,0,0.12)';
              }
            }}
            onMouseDown={(e) => {
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {runningAssessment ? (
              <>
                <span style={{ marginRight: 8 }}>⏳</span>
                Running...
              </>
            ) : (
              <>
                <span style={{ marginRight: 8 }}>⚡</span>
                {assessment ? "Re-run Assessment" : "Run Assessment"}
              </>
            )}
          </button>

          {assessment && (
            <button
              onClick={handleDeleteAssessment}
              disabled={runningAssessment || deletingAssessment}
              style={{
                background: deletingAssessment
                  ? C.inkMid
                  : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 18,
                minHeight: 54,
                padding: '0 28px',
                fontWeight: 800,
                cursor: runningAssessment || deletingAssessment ? "not-allowed" : "pointer",
                opacity: runningAssessment || deletingAssessment ? 0.6 : 1,
                fontSize: 15,
                letterSpacing: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: runningAssessment || deletingAssessment ? 'none' : '0 10px 20px rgba(0,0,0,0.12)',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
                filter: 'none',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (!runningAssessment && !deletingAssessment) {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.filter = 'brightness(1.04)';
                  e.target.style.boxShadow = '0 14px 24px rgba(0,0,0,0.16)';
                }
              }}
              onMouseLeave={(e) => {
                if (!runningAssessment && !deletingAssessment) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.filter = 'none';
                  e.target.style.boxShadow = '0 10px 20px rgba(0,0,0,0.12)';
                }
              }}
              onMouseDown={(e) => {
                e.target.style.transform = 'translateY(0)';
              }}
            >
              {deletingAssessment ? (
                <>
                  <span style={{ marginRight: 8 }}>⏳</span>
                  Deleting...
                </>
              ) : (
                <>
                  <span style={{ marginRight: 8 }}>🗑️</span>
                  Delete Permanently
                </>
              )}
            </button>
          )}

          <button
            onClick={() => navigate(`/recommendation-engine/${applicationId || selectedAppId}`)}
            disabled={application?.riskStatus !== "ASSESSED"}
            style={{
              background: application?.riskStatus === "ASSESSED"
                ? 'linear-gradient(135deg, #14B8A6 0%, #0F9F8F 100%)'
                : C.inkMid,
              color: "#fff",
              border: "none",
              borderRadius: 18,
              minHeight: 54,
              padding: '0 28px',
              fontWeight: 800,
              cursor: application?.riskStatus === "ASSESSED" ? "pointer" : "not-allowed",
              opacity: application?.riskStatus === "ASSESSED" ? 1 : 0.6,
              fontSize: 15,
              letterSpacing: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: application?.riskStatus === "ASSESSED" ? '0 10px 20px rgba(0,0,0,0.12)' : 'none',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
              filter: 'none',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (application?.riskStatus === "ASSESSED") {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.filter = 'brightness(1.04)';
                e.target.style.boxShadow = '0 14px 24px rgba(0,0,0,0.16)';
              }
            }}
            onMouseLeave={(e) => {
              if (application?.riskStatus === "ASSESSED") {
                e.target.style.transform = 'translateY(0)';
                e.target.style.filter = 'none';
                e.target.style.boxShadow = '0 10px 20px rgba(0,0,0,0.12)';
              }
            }}
            onMouseDown={(e) => {
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ marginRight: 8 }}>🎯</span>
            Go to Recommendation
          </button>

          {isDirectMode && (
            <button
              onClick={() => navigate(`/applications/${applicationId}`)}
              style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 18,
                minHeight: 54,
                padding: '0 28px',
                fontWeight: 800,
                cursor: "pointer",
                fontSize: 15,
                letterSpacing: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
                filter: 'none',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.filter = 'brightness(1.04)';
                e.target.style.boxShadow = '0 14px 24px rgba(0,0,0,0.16)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.filter = 'none';
                e.target.style.boxShadow = '0 10px 20px rgba(0,0,0,0.12)';
              }}
              onMouseDown={(e) => {
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ marginRight: 8 }}>📄</span>
              Application Details
            </button>
          )}

          <button
            onClick={() => navigate("/applications")}
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 18,
              minHeight: 54,
              padding: '0 28px',
              fontWeight: 800,
              cursor: "pointer",
              fontSize: 15,
              letterSpacing: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
              filter: 'none',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.filter = 'brightness(1.04)';
              e.target.style.boxShadow = '0 14px 24px rgba(0,0,0,0.16)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.filter = 'none';
              e.target.style.boxShadow = '0 10px 20px rgba(0,0,0,0.12)';
            }}
            onMouseDown={(e) => {
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ marginRight: 8 }}>📋</span>
            Back to Applications
          </button>
        </div>

        {/* Top Risk Factors */}
        {assessment?.topFactors && assessment.topFactors.length > 0 && (
          <div style={{
            background: C.surface,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            padding: 24,
            marginBottom: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{
              fontSize: 18,
              fontWeight: 700,
              color: C.ink,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              🎯 Top Risk Factors
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {assessment.topFactors.map((factor, index) => (
                <div
                  key={index}
                  style={{
                    background: `${C.primary}08`,
                    color: C.primary,
                    padding: "8px 16px",
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    border: `1px solid ${C.primary}20`
                  }}
                >
                  {factor}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Information Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          {/* Applicant Information */}
          {applicant && (
            <div style={{
              background: C.surface,
              borderRadius: 16,
              border: `1px solid ${C.border}`,
              padding: 24,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{
                fontSize: 18,
                fontWeight: 700,
                color: C.ink,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                👤 Applicant Information
              </h3>
              <div style={{ display: "grid", gap: 12 }}>
                {[
                  { label: "Name", value: applicant.fullName, icon: "👤" },
                  { label: "NIC", value: applicant.nic, icon: "🆔" },
                  { label: "Phone", value: applicant.phone, icon: "📞" },
                  { label: "Email", value: applicant.email, icon: "📧" },
                  { label: "Branch", value: applicant.branch, icon: "🏢" },
                  { label: "Monthly Income", value: formatCurrency(applicant.monthlyIncome), icon: "💰" },
                  { label: "Employment", value: `${applicant.employmentStatus} (${applicant.employmentLengthMonths} months)`, icon: "💼" },
                  { label: "Existing Loans", value: applicant.existingLoans, icon: "📋" },
                  { label: "Dependents", value: applicant.dependents, icon: "👥" },
                  { label: "Has Mortgage", value: applicant.hasMortgage ? "Yes" : "No", icon: "🏠" }
                ].map((item) => (
                  <div key={item.label} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    background: C.surfaceDeep,
                    borderRadius: 8,
                    border: `1px solid ${C.border}20`
                  }}>
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12,
                        color: C.inkLight,
                        fontWeight: 500,
                        marginBottom: 2
                      }}>
                        {item.label}
                      </div>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: C.ink,
                        wordBreak: 'break-word'
                      }}>
                        {item.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loan Application Details */}
          {application && (
            <div style={{
              background: C.surface,
              borderRadius: 16,
              border: `1px solid ${C.border}`,
              padding: 24,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{
                fontSize: 18,
                fontWeight: 700,
                color: C.ink,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                📄 Loan Application Details
              </h3>
              <div style={{ display: "grid", gap: 12 }}>
                {[
                  { label: "Application ID", value: application.applicationNumber || "N/A", icon: "🆔" },
                  { label: "Loan Amount", value: formatCurrency(application.amount), icon: "💰", highlight: true },
                  { label: "Term", value: application.termMonths ? `${application.termMonths} months` : "To be recommended", icon: "📅" },
                  { label: "Interest Rate", value: application.interestRate ? `${application.interestRate}%` : "To be recommended", icon: "📊" },
                  { label: "Purpose", value: application.purpose || "Not provided", icon: "🎯" },
                  { label: "Has Co-Signer", value: application.hasCoSigner === null || application.hasCoSigner === undefined ? "Not specified" : (application.hasCoSigner ? "Yes" : "No"), icon: "👥" },
                  { label: "Status", value: application.status, icon: "⚡", badge: true },
                  { label: "Applied", value: new Date(application.createdAt).toLocaleString(), icon: "🕒" }
                ].map((item) => (
                  <div key={item.label} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    background: item.highlight ? `${C.primary}08` : C.surfaceDeep,
                    borderRadius: 8,
                    border: `1px solid ${item.highlight ? C.primary + '20' : C.border + '20'}`
                  }}>
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12,
                        color: C.inkLight,
                        fontWeight: 500,
                        marginBottom: 2
                      }}>
                        {item.label}
                      </div>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: item.highlight ? C.primary : C.ink,
                        wordBreak: 'break-word'
                      }}>
                        {item.badge ? (
                          <span style={{
                            background: `${C.warn}20`,
                            color: C.warn,
                            padding: '2px 8px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600
                          }}>
                            {item.value}
                          </span>
                        ) : item.value}
                      </div>
                    </div>
                  </div>
                ))}
                {application.notes && (
                  <div style={{
                    padding: 12,
                    background: `${C.warn}08`,
                    borderRadius: 8,
                    border: `1px solid ${C.warn}20`,
                    marginTop: 8
                  }}>
                    <div style={{
                      fontSize: 12,
                      color: C.inkLight,
                      fontWeight: 500,
                      marginBottom: 4
                    }}>
                      📝 Notes
                    </div>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: C.inkMid
                    }}>
                      {application.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Assessment Inputs */}
        {assessment?.inputSnapshot && (
          <div style={{
            background: C.surface,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            padding: 24,
            marginBottom: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{
              fontSize: 18,
              fontWeight: 700,
              color: C.ink,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              🔍 Assessment Inputs
            </h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: 16
            }}>
              {Object.entries(assessment.inputSnapshot).map(([key, value]) => {
                // Format AI Decision object nicely
                if (key === 'aiDecision' && typeof value === 'object' && value !== null) {
                  return (
                    <div key={key} style={{
                      background: C.surfaceDeep,
                      padding: 12,
                      borderRadius: 8,
                      border: `1px solid ${C.border}20`
                    }}>
                      <div style={{
                        fontSize: 12,
                        color: C.inkLight,
                        fontWeight: 500,
                        marginBottom: 4
                      }}>
                        {formatLabel(key)}
                      </div>
                      <div style={{
                        fontSize: 13,
                        color: C.ink,
                        lineHeight: 1.6
                      }}>
                        <div>📊 Status: <strong>{value.status}</strong></div>
                        <div>💰 Amount: <strong>{value.plan?.LoanAmount ? formatCurrency(value.plan.LoanAmount) : '-'}</strong></div>
                        <div>📅 Term: <strong>{value.plan?.LoanTerm ? value.plan.LoanTerm + ' months' : '-'}</strong></div>
                        <div>📈 Rate: <strong>{value.plan?.InterestRate ? value.plan.InterestRate + '%' : '-'}</strong></div>
                        <div>⚠️ Risk: <strong>{(value.risk_probability * 100).toFixed(1)}%</strong></div>
                      </div>
                    </div>
                  );
                }
                // Regular fields
                return (
                  <div key={key} style={{
                    background: C.surfaceDeep,
                    padding: 12,
                    borderRadius: 8,
                    border: `1px solid ${C.border}20`
                  }}>
                    <div style={{
                      fontSize: 12,
                      color: C.inkLight,
                      fontWeight: 500,
                      marginBottom: 4
                    }}>
                      {formatLabel(key)}
                    </div>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: C.ink,
                      wordBreak: 'break-word'
                    }}>
                      {value === null || value === undefined
                        ? "-"
                        : typeof value === 'boolean'
                        ? value ? "Yes" : "No"
                        : typeof value === 'object'
                        ? JSON.stringify(value)
                        : (key.toLowerCase().includes('income') || key.toLowerCase().includes('payment') || key.toLowerCase().includes('amount'))
                        ? formatCurrency(value)
                        : value}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Messages */}
        {actionSuccess && (
          <div style={{
            background: `linear-gradient(135deg, ${C.successSoft} 0%, ${C.surface} 100%)`,
            color: C.success,
            padding: "20px 24px",
            borderRadius: 16,
            marginBottom: 24,
            border: `2px solid ${C.success}30`,
            fontSize: 16,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: `0 4px 20px ${C.success}20`
          }}>
            <span style={{ fontSize: 24 }}>✅</span>
            {actionSuccess}
          </div>
        )}

        {assessmentError && (
          <div style={{
            background: `linear-gradient(135deg, #FEE2E2 0%, ${C.surface} 100%)`,
            color: C.danger,
            padding: "20px 24px",
            borderRadius: 16,
            marginBottom: 24,
            border: `2px solid ${C.danger}30`,
            fontSize: 16,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: `0 4px 20px ${C.danger}20`
          }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            {assessmentError}
          </div>
        )}

        {deleteError && (
          <div style={{
            background: `linear-gradient(135deg, #FEE2E2 0%, ${C.surface} 100%)`,
            color: C.danger,
            padding: "20px 24px",
            borderRadius: 16,
            marginBottom: 24,
            border: `2px solid ${C.danger}30`,
            fontSize: 16,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: `0 4px 20px ${C.danger}20`
          }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            {deleteError}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}>
            <div style={{
              background: C.surfaceDeep,
              borderRadius: 16,
              padding: 32,
              maxWidth: 500,
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              border: `1px solid ${C.border}`
            }}>
              <div style={{
                fontSize: 24,
                fontWeight: 700,
                marginBottom: 16,
                color: C.ink
              }}>
                Delete Risk Assessment
              </div>

              <div style={{
                fontSize: 16,
                color: C.inkMid,
                marginBottom: 24,
                lineHeight: '1.5'
              }}>
                Are you sure you want to permanently delete this risk assessment? This action cannot be undone.
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: 8,
                  color: C.ink
                }}>
                  Delete Reason *
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  onFocus={() => setDeleteModalError('')}
                  rows={3}
                  placeholder="Explain why you are deleting this risk assessment..."
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 16,
                    resize: 'vertical',
                    background: C.surface,
                    color: C.ink,
                    border: deleteModalError ? `2px solid ${C.danger}` : `1px solid ${C.border}`,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
                {deleteModalError && (
                  <div style={{
                    fontSize: 13,
                    color: C.danger,
                    marginTop: 6,
                    fontWeight: 500
                  }}>
                    {deleteModalError}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteReason('');
                    setDeleteModalError('');
                  }}
                  disabled={deletingAssessment}
                  style={{
                    background: C.surface,
                    color: C.ink,
                    border: `2px solid ${C.border}`,
                    borderRadius: 18,
                    padding: '12px 24px',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: deletingAssessment ? 'not-allowed' : 'pointer',
                    opacity: deletingAssessment ? 0.6 : 1,
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    if (!deletingAssessment) {
                      e.target.style.background = C.surfaceAlt;
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!deletingAssessment) {
                      e.target.style.background = C.surface;
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={handlePermanentlyDeleteAssessment}
                  disabled={deletingAssessment}
                  style={{
                    background: deletingAssessment
                      ? C.inkMid
                      : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 18,
                    padding: '12px 28px',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: deletingAssessment ? 'not-allowed' : 'pointer',
                    opacity: deletingAssessment ? 0.6 : 1,
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    boxShadow: deletingAssessment ? 'none' : '0 6px 16px rgba(239, 68, 68, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (!deletingAssessment) {
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 10px 24px rgba(239, 68, 68, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!deletingAssessment) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.3)';
                    }
                  }}
                >
                  {deletingAssessment ? (
                    <>
                      <span style={{ marginRight: 6 }}>⏳</span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <span style={{ marginRight: 6 }}>🗑️</span>
                      Delete Permanently
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}