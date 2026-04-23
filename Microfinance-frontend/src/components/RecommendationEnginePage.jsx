import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import client from "../api/client";
import {
  generateRecommendation,
  getLatestRecommendationByApplication,
  recalculateRecommendation,
  updateRecommendation,
  patchRecommendation,
  archiveRecommendation,
  deleteRecommendation
} from "../services/recommendationService";
import GradientSummaryCard from './shared/GradientSummaryCard';
import { useTheme } from "../context/ThemeContext";
import { PageHeader } from "./PageHeader";
import { getStoredUser } from "../services/authService";

const C = {
  primary: "var(--primary)",
  primaryDk: "var(--primary-hover)",
  primarySoft: "var(--primary-soft)",
  accent: "var(--accent)",
  danger: "var(--danger)",
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

export default function RecommendationEnginePage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState(null);
  const [applicant, setApplicant] = useState(null);
  const [error, setError] = useState(null);

  // Recommendation state
  const [recommendation, setRecommendation] = useState(null);
  const [generatingRecommendation, setGeneratingRecommendation] = useState(false);
  const [recommendationError, setRecommendationError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // NEW: UPDATE/DELETE state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    recommendedAmount: '',
    recommendedPeriod: '',
    recommendedInterestRate: '',
    feasibility: '',
    reasoning: '',
    overrideReason: ''
  });
  const [editFormErrors, setEditFormErrors] = useState({}); // Form field validation errors
  const [updating, setUpdating] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(null); // 'archive' or 'delete'
  const [confirmReason, setConfirmReason] = useState('');
  const [archiveFormErrors, setArchiveFormErrors] = useState({});

  // For Mode B (no applicationId) - application selection
  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [loadingApps, setLoadingApps] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const isDirectMode = !!applicationId; // Mode A: direct access with applicationId
  const isSelectionMode = !applicationId; // Mode B: need to select application first

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

  // ═══════════════════════════════════════════════════════════
  // HELPER: No-cache config and data refresh
  // ═══════════════════════════════════════════════════════════

  const noCacheConfig = () => ({
    params: { _ts: Date.now() },
    headers: { "Cache-Control": "no-cache" }
  });

  // CHANGED: get user via auth service (normalized storage handling)
  const getCurrentUser = () => {
    const user = getStoredUser();
    if (user) {
      return user.id || user.email || user.username || 'Unknown User';
    }
    return 'Unknown User';
  };

  const refreshRecommendationPageData = async (appId) => {
    // Re-fetch application details with no-cache
    const detailsRes = await client.get(`/api/applications/${appId}/details`, noCacheConfig());
    const applicationData = detailsRes.data.application;
    setApplication(applicationData);
    setApplicant(detailsRes.data.applicant);

    // Re-fetch latest recommendation with no-cache
    try {
      const latestRecommendation = await getLatestRecommendationByApplication(appId, noCacheConfig());
      setRecommendation(latestRecommendation);
    } catch (err) {
      if (err?.response?.status === 404) {
        setRecommendation(null);
      } else {
        throw err;
      }
    }
  };

  const validateEditForm = () => {
    const errors = {};
    const form = editForm;

    // Recommended Amount
    if (!form.recommendedAmount || form.recommendedAmount === '') {
      errors.recommendedAmount = 'Recommended amount is required';
    } else {
      const amount = parseFloat(form.recommendedAmount);
      if (isNaN(amount)) {
        errors.recommendedAmount = 'Must be a valid number';
      } else if (amount < 10000) {
        errors.recommendedAmount = 'Minimum amount is 10,000';
      } else if (amount > 10000000) {
        errors.recommendedAmount = 'Maximum amount is 10,000,000';
      }
    }

    // Recommended Period
    if (!form.recommendedPeriod || form.recommendedPeriod === '') {
      errors.recommendedPeriod = 'Period is required';
    } else {
      const period = parseInt(form.recommendedPeriod);
      if (isNaN(period)) {
        errors.recommendedPeriod = 'Must be a valid number';
      } else if (period < 6) {
        errors.recommendedPeriod = 'Minimum period is 6 months';
      } else if (period > 120) {
        errors.recommendedPeriod = 'Maximum period is 120 months';
      }
    }

    // Recommended Interest Rate
    if (!form.recommendedInterestRate || form.recommendedInterestRate === '') {
      errors.recommendedInterestRate = 'Interest rate is required';
    } else {
      const rate = parseFloat(form.recommendedInterestRate);
      if (isNaN(rate)) {
        errors.recommendedInterestRate = 'Must be a valid number';
      } else if (rate < 5) {
        errors.recommendedInterestRate = 'Minimum rate is 5%';
      } else if (rate > 50) {
        errors.recommendedInterestRate = 'Maximum rate is 50%';
      }
    }

    // Feasibility
    if (!form.feasibility || form.feasibility === '') {
      errors.feasibility = 'Feasibility is required';
    } else if (!['HIGH', 'MEDIUM', 'LOW'].includes(form.feasibility.toUpperCase())) {
      errors.feasibility = 'Must be HIGH, MEDIUM, or LOW';
    }

    // Override Reason (required for updates)
    if (!form.overrideReason || form.overrideReason.trim() === '') {
      errors.overrideReason = 'Override reason is required for updates';
    } else if (form.overrideReason.trim().length > 256) {
      errors.overrideReason = 'Override reason cannot exceed 256 characters';
    }

    return errors;
  };

  const validateArchiveForm = () => {
    const errors = {};

    if (!confirmReason || confirmReason.trim() === '') {
      errors.archiveReason = 'Archive reason is required';
    } else if (confirmReason.trim().length < 5) {
      errors.archiveReason = 'Archive reason must be at least 5 characters';
    } else if (confirmReason.trim().length > 256) {
      errors.archiveReason = 'Archive reason cannot exceed 256 characters';
    }

    return errors;
  };

  const mapBackendErrors = (error) => {
    const errors = {};
    if (error?.response?.data?.errors) {
      // Handle field-level validation errors from backend
      Object.assign(errors, error.response.data.errors);
    }
    return errors;
  };

  useEffect(() => {
    if (isDirectMode) {
      loadApplicationDetails(applicationId);
    } else {
      loadAvailableApplications();
    }
  }, [applicationId]);

  // Auto-dismiss success message after 5 seconds
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => {
        setActionSuccess(null);
      }, 5000); // 5 seconds
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  const extractRecommendationFeasibility = (app) => {
    return normalizeFeasibility(
      app?.recommendation?.feasibility ||
      app?.recommendationFeasibility ||
      app?.latestRecommendation?.feasibility ||
      ''
    );
  };

  const enrichApplicationWithRecommendation = async (app) => {
    if (app?.recommendationStatus !== 'GENERATED') {
      return {
        ...app,
        recommendation: app?.recommendation || null,
        recommendationFeasibility: '',
      };
    }

    try {
      const latestRecommendation = await getLatestRecommendationByApplication(app.id);
      return {
        ...app,
        recommendation: latestRecommendation,
        recommendationFeasibility: normalizeFeasibility(latestRecommendation?.feasibility),
      };
    } catch (err) {
      console.warn(`Failed to load recommendation for application ${app.id}`, err);
      return {
        ...app,
        recommendation: null,
        recommendationFeasibility: '',
      };
    }
  };

  const loadAvailableApplications = async () => {
    try {
      setLoadingApps(true);

      const res = await client.get('/api/applications');

      const baseApps = (res.data || []).filter(
        app => app.status === 'REVIEW' || app.status === 'PENDING'
      );

      const enrichedApps = await Promise.all(
        baseApps.map(enrichApplicationWithRecommendation)
      );

      setApplications(enrichedApps);
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
      setRecommendationError(null);
      // Use no-cache config to always get fresh data
      const res = await client.get(`/api/applications/${appId}/details`, noCacheConfig());
      const applicationData = res.data.application;
      setApplication(applicationData);
      setApplicant(res.data.applicant);

      try {
        const recommendationData = await getLatestRecommendationByApplication(appId, noCacheConfig());
        setRecommendation(recommendationData);
      } catch (recommendationErr) {
        if (applicationData?.recommendationId) {
          try {
            const fallbackRecommendation = await client.get(`/api/recommendations/${applicationData.recommendationId}`, noCacheConfig());
            setRecommendation(fallbackRecommendation.data);
          } catch (fallbackErr) {
            if (fallbackErr?.response?.status === 404) {
              setRecommendation(null);
            } else {
              console.warn("Fallback recommendation loading failed:", fallbackErr);
              setRecommendation(null);
            }
          }
        } else if (recommendationErr?.response?.status === 404) {
          setRecommendation(null);
        } else {
          console.warn("Latest recommendation loading failed:", recommendationErr);
          setRecommendation(null);
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

  const handleGenerateRecommendation = async (appId) => {
    try {
      setRecommendationError(null);
      setActionSuccess(null);
      setGeneratingRecommendation(true);

      // CRITICAL: Clear stale recommendation state BEFORE calling API
      setRecommendation(null);

      // Call API to generate recommendation
      await generateRecommendation(appId, noCacheConfig());

      // Re-fetch ALL fresh data after successful mutation
      await refreshRecommendationPageData(appId);

      setActionSuccess("Recommendation generated successfully");
    } catch (err) {
      const errorMsg = err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to generate recommendation";
      setRecommendationError(errorMsg);
    } finally {
      setGeneratingRecommendation(false);
    }
  };

  const handleGoToRiskAssessment = (appId) => {
    navigate(`/risk-assessment/${appId}`);
  };

  // NEW: UPDATE/DELETE handlers
  const handleStartEdit = () => {
    if (!recommendation) return;

    setEditForm({
      recommendedAmount: recommendation.recommendedAmount || '',
      recommendedPeriod: recommendation.recommendedPeriod || '',
      recommendedInterestRate: recommendation.recommendedInterestRate || '',
      feasibility: recommendation.feasibility || '',
      reasoning: recommendation.reasoning || '',
      overrideReason: ''
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      recommendedAmount: '',
      recommendedPeriod: '',
      recommendedInterestRate: '',
      feasibility: '',
      reasoning: '',
      overrideReason: ''
    });
    setEditFormErrors({}); // Clear form errors when canceling
    setRecommendationError(null); // Clear any errors
  };

  const handleSaveEdit = async () => {
    const fieldsToCheck = [
      "recommendedAmount",
      "recommendedPeriod",
      "recommendedInterestRate",
      "overrideReason",
    ];

    let hasErrors = false;

    fieldsToCheck.forEach((field) => {
      const value = editForm[field];
      const error = validateEditField(field, value);
      if (error) hasErrors = true;
    });

    if (hasErrors) {
      setRecommendationError('Please fix the form errors below');
      return;
    }

    try {
      setUpdating(true);
      setRecommendationError(null);
      setActionSuccess(null);
      setEditFormErrors({}); // Clear any field errors

      const payload = {
        recommendedAmount: parseFloat(editForm.recommendedAmount),
        recommendedPeriod: parseInt(editForm.recommendedPeriod),
        recommendedInterestRate: parseFloat(editForm.recommendedInterestRate),
        reasoning: editForm.reasoning.trim() || null,
        overrideReason: editForm.overrideReason.trim(),
        updatedBy: getCurrentUser() // Get actual current user from sessionStorage
      };

      const updatedRecommendation = await updateRecommendation(recommendation.id, payload);

      // Re-fetch fresh data after update
      await refreshRecommendationPageData(updatedRecommendation.applicationId);

      setIsEditing(false);
      setActionSuccess("Recommendation updated successfully");
    } catch (err) {
      const backendErrors = mapBackendErrors(err);
      if (Object.keys(backendErrors).length > 0) {
        setEditFormErrors(backendErrors);
      }
      const errorMsg = err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to update recommendation";
      setRecommendationError(errorMsg);
    } finally {
      setUpdating(false);
    }
  };

  const handleRecalculate = async (appId) => {
    try {
      setRecalculating(true);
      setRecommendationError(null);
      setActionSuccess(null);

      // CRITICAL: Clear stale recommendation state BEFORE calling API
      setRecommendation(null);

      // Call API to recalculate
      await recalculateRecommendation(appId, noCacheConfig());

      // Re-fetch ALL fresh data after successful mutation
      await refreshRecommendationPageData(appId);

      setActionSuccess("Recommendation recalculated successfully");
    } catch (err) {
      const errorMsg = err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to recalculate recommendation";
      setRecommendationError(errorMsg);
    } finally {
      setRecalculating(false);
    }
  };

  const handleArchive = async () => {
    // Validate archive form before submitting
    const errors = validateArchiveForm();
    if (Object.keys(errors).length > 0) {
      setArchiveFormErrors(errors);
      setRecommendationError('Please fix the archive form errors');
      return;
    }

    try {
      setArchiving(true);
      setRecommendationError(null);
      setActionSuccess(null);
      setArchiveFormErrors({}); // Clear any field errors

      const payload = {
        archiveReason: confirmReason.trim(),
        archivedBy: getCurrentUser() // Get actual current user from sessionStorage
      };

      const archivedRecommendation = await archiveRecommendation(recommendation.id, payload);

      // Update local state immediately with the API response (don't wait for refresh)
      setRecommendation(archivedRecommendation);

      // Close modal immediately after success
      setShowConfirmDialog(null);
      setConfirmReason('');

      // Show success message to user
      setActionSuccess("Recommendation archived successfully");

      // Refresh in background for consistency (don't block success UX on this)
      try {
        await refreshRecommendationPageData(archivedRecommendation.applicationId);
      } catch (refreshErr) {
        console.warn('Background refresh failed after archive (non-blocking):', refreshErr);
        // UI already shows success, so don't update error state
      }

    } catch (err) {
      console.error('Archive failed:', err);
      const backendErrors = mapBackendErrors(err);
      if (Object.keys(backendErrors).length > 0) {
        setArchiveFormErrors(backendErrors);
      }
      const errorMsg = err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to archive recommendation";
      setRecommendationError(errorMsg);
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setRecommendationError(null);
      setActionSuccess(null);

      const appId = recommendation.applicationId;

      // Delete the recommendation
      await deleteRecommendation(recommendation.id);

      // Immediately show success and close modal (don't wait for refresh)
      setShowConfirmDialog(null);
      setActionSuccess("Recommendation deleted successfully");

      // Clear recommendation from local state
      setRecommendation(null);

      // Redirect to applications page after brief delay so user sees success message
      setTimeout(() => {
        navigate('/applications');
      }, 1500); // 1.5 seconds - enough time to read success message

    } catch (err) {
      console.error('Delete recommendation failed:', err);
      const errorMsg = err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to delete recommendation";
      setRecommendationError(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString();
  };

  const formatLabel = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const getFeasibilityColor = (feasibility) => {
    switch (feasibility?.toUpperCase()) {
      case 'HIGH': return C.success;
      case 'MEDIUM': return C.warn;
      case 'LOW': return C.danger;
      default: return C.inkMid;
    }
  };

  const getFeasibilityBg = (feasibility) => {
    switch (feasibility?.toUpperCase()) {
      case 'HIGH': return C.successSoft;
      case 'MEDIUM': return C.warnSoft;
      case 'LOW': return '#FEE2E2';
      default: return C.border;
    }
  };

  const getFeasibilityCardTheme = (feasibility) => {
    switch ((feasibility || "").toUpperCase()) {
      case "HIGH":
        return {
          gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          lineGradient: "linear-gradient(90deg, #10b981, #34d399)",
        };
      case "MEDIUM":
        return {
          gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          lineGradient: "linear-gradient(90deg, #f59e0b, #fbbf24)",
        };
      case "LOW":
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

  const getRecommendationStatusCardTheme = (status) => {
    switch ((status || "").toUpperCase()) {
      case "GENERATED":
        return {
          gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          lineGradient: "linear-gradient(90deg, #10b981, #34d399)",
        };
      case "PENDING":
        return {
          gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          lineGradient: "linear-gradient(90deg, #f59e0b, #fbbf24)",
        };
      case "FAILED":
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

  const getModalPanelStyle = (themeValue) => ({
    background: themeValue === "light" ? "var(--surface)" : "var(--modal-bg)",
    color: themeValue === "light" ? "var(--text)" : "#F8FAFC",
    border: `1px solid ${themeValue === "light" ? "var(--border)" : "var(--border-strong)"}`,
    boxShadow: themeValue === "light"
      ? "0 20px 50px rgba(15,23,42,0.15)"
      : "0 20px 45px rgba(0, 0, 0, 0.35)",
  });

  const getModalTitleStyle = (themeValue) => ({
    color: themeValue === "light" ? "var(--text)" : "#F8FAFC",
    fontWeight: 800,
  });

  const getModalLabelStyle = (themeValue) => ({
    color: themeValue === "light" ? "var(--text)" : "#CBD5E1",
    fontWeight: 700,
    opacity: 1,
  });

  const getModalInputStyle = (themeValue) => ({
    width: "100%",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    background: themeValue === "light" ? "#FFFFFF" : "#0F172A",
    color: themeValue === "light" ? "#0F172A" : "#F8FAFC",
    border: `1px solid ${themeValue === "light" ? "#CBD5E1" : "#334155"}`,
    outline: "none",
  });

  const getStats = () => {
    if (isDirectMode) {
      return {
        totalReady: application ? 1 : 0,
        pending: application?.status === 'PENDING' ? 1 : 0,
        review: application?.status === 'REVIEW' ? 1 : 0,
        recommended: application?.recommendationStatus === 'GENERATED' ? 1 : 0
      };
    } else {
      return {
        totalReady: applications.length,
        pending: applications.filter(app => app.status === 'PENDING').length,
        review: applications.filter(app => app.status === 'REVIEW').length,
        recommended: applications.filter(app => app.recommendationStatus === 'GENERATED').length
      };
    }
  };

  const normalizeFeasibility = (value) => {
    if (!value) return '';
    return String(value).toUpperCase().trim();
  };

  // ═══════════════════════════════════════════════════════════
  // LIVE VALIDATION HELPERS FOR EDIT MODAL
  // ═══════════════════════════════════════════════════════════

  const blockInvalidNumberKeys = (e, fieldName) => {
    const invalidKeys = ["e", "E", "+", "-"];

    if (invalidKeys.includes(e.key)) {
      e.preventDefault();
      return;
    }

    if (fieldName === "recommendedPeriod" && e.key === ".") {
      e.preventDefault();
    }
  };

  const sanitizeNumericInput = (fieldName, value) => {
    if (value === "") return "";

    if (fieldName === "recommendedPeriod") {
      return value.replace(/[^\d]/g, "");
    }

    let sanitized = value.replace(/[^\d.]/g, "");
    const parts = sanitized.split(".");

    if (parts.length > 2) {
      sanitized = `${parts[0]}.${parts.slice(1).join("")}`;
    }

    return sanitized;
  };

  const validateNumberField = (fieldName, value) => {
    const trimmed = String(value ?? "").trim();

    if (trimmed === "") return "This field is required";
    if (isNaN(trimmed)) return "Must be a valid number";

    const num = Number(trimmed);

    if (num < 0) return "Cannot be negative";
    if (num === 0) return "Must be greater than 0";

    if (fieldName === "recommendedAmount") {
      if (num < 10000) return "Recommended amount must be at least 10,000";
      if (num > 10000000) return "Recommended amount cannot exceed 10,000,000";
    }

    if (fieldName === "recommendedPeriod") {
      if (!Number.isInteger(num)) return "Recommended period must be a whole number";
      if (num < 6) return "Recommended period must be at least 6 months";
      if (num > 120) return "Recommended period cannot exceed 120 months";
    }

    if (fieldName === "recommendedInterestRate") {
      if (num < 5) return "Interest rate must be at least 5%";
      if (num > 50) return "Interest rate cannot exceed 50%";
    }

    return "";
  };

  const validateEditField = (fieldName, value) => {
    let error = "";

    if (
      fieldName === "recommendedAmount" ||
      fieldName === "recommendedPeriod" ||
      fieldName === "recommendedInterestRate"
    ) {
      error = validateNumberField(fieldName, value);
    }

    if (fieldName === "overrideReason") {
      const trimmed = String(value ?? "").trim();
      if (!trimmed) {
        error = "Override reason is required";
      }
    }

    setEditFormErrors((prev) => ({
      ...prev,
      [fieldName]: error,
    }));

    return error;
  };

  const isEditFormValid = () => {
    const errors = {
      recommendedAmount: validateNumberField("recommendedAmount", editForm.recommendedAmount),
      recommendedPeriod: validateNumberField("recommendedPeriod", editForm.recommendedPeriod),
      recommendedInterestRate: validateNumberField("recommendedInterestRate", editForm.recommendedInterestRate),
      overrideReason: String(editForm.overrideReason ?? "").trim()
        ? ""
        : "Override reason is required",
    };

    return Object.values(errors).every((error) => !error);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (
      name === "recommendedAmount" ||
      name === "recommendedPeriod" ||
      name === "recommendedInterestRate"
    ) {
      newValue = sanitizeNumericInput(name, value);
    }

    setEditForm((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    validateEditField(name, newValue);
  };

  const handleEditBlur = (e) => {
    const { name, value } = e.target;
    validateEditField(name, value);
  };

  const getFilteredApplications = () => {
    let filtered = applications;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(app =>
        app.id?.toLowerCase().includes(search) ||
        app.purpose?.toLowerCase().includes(search) ||
        app.applicationNumber?.toLowerCase().includes(search)
      );
    }

    switch (activeFilter) {
      case 'Pending':
        filtered = filtered.filter(app => app.status === 'PENDING');
        break;

      case 'Review':
        filtered = filtered.filter(app => app.status === 'REVIEW');
        break;

      case 'Recommended':
        filtered = filtered.filter(app => app.recommendationStatus === 'GENERATED');
        break;

      case 'High Feasibility':
        filtered = filtered.filter(app =>
          app.recommendationStatus === 'GENERATED' &&
          extractRecommendationFeasibility(app) === 'HIGH'
        );
        break;

      case 'Medium Feasibility':
        filtered = filtered.filter(app =>
          app.recommendationStatus === 'GENERATED' &&
          extractRecommendationFeasibility(app) === 'MEDIUM'
        );
        break;

      case 'Low Feasibility':
        filtered = filtered.filter(app =>
          app.recommendationStatus === 'GENERATED' &&
          extractRecommendationFeasibility(app) === 'LOW'
        );
        break;

      default:
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
          {/* Header - Same as RiskAssessmentPage */}
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
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: C.ink, margin: 0, marginBottom: 8 }}>
              Recommendation Engine
            </h1>
            <p style={{ fontSize: 16, color: C.inkMid, margin: 0, fontWeight: 500 }}>
              Generate AI-powered loan approval recommendations based on risk assessments
            </p>
          </div>

          {/* Summary Stats Cards - Same structure as RiskAssessmentPage */}
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
              icon="🤖"
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
              title="Recommendations Generated"
              value={stats.recommended}
              subtitle="AI recommendations complete"
              gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              lineGradient="linear-gradient(90deg, #10b981, #34d399)"
              icon="✅"
              index={3}
            />
          </div>

          {/* Filters and Search - Same structure as RiskAssessmentPage */}
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
              {['All', 'Pending', 'Review', 'Recommended', 'High Feasibility', 'Medium Feasibility', 'Low Feasibility'].map(filter => (
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

          {/* Application List - Same structure as RiskAssessmentPage */}
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
                <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
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
                      cursor: 'pointer',
                      background: selectedAppId === app.id ? C.primarySoft : C.surface,
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = C.surfaceDeep;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = selectedAppId === app.id ? C.primarySoft : C.surface;
                    }}
                    onClick={() => handleApplicationSelect(app.id)}
                  >
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 20,
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: 16, color: C.ink }}>
                            {app.applicationNumber || `#${app.id.slice(-6)}`}
                          </div>
                          <span style={{
                            background: app.status === 'REVIEW' ? C.warnSoft : C.primarySoft,
                            color: app.status === 'REVIEW' ? C.warn : C.primary,
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                          }}>
                            {app.status}
                          </span>
                          {app.recommendationStatus === 'GENERATED' && (
                            <>
                              <span style={{
                                background: C.successSoft,
                                color: C.success,
                                padding: '4px 8px',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                              }}>
                                Recommendation Ready
                              </span>

                              {extractRecommendationFeasibility(app) && (
                                <span
                                  style={{
                                    background:
                                      extractRecommendationFeasibility(app) === 'HIGH'
                                        ? C.successSoft
                                        : extractRecommendationFeasibility(app) === 'MEDIUM'
                                          ? C.warnSoft
                                          : '#FEE2E2',
                                    color:
                                      extractRecommendationFeasibility(app) === 'HIGH'
                                        ? C.success
                                        : extractRecommendationFeasibility(app) === 'MEDIUM'
                                          ? C.warn
                                          : C.danger,
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 700,
                                  }}
                                >
                                  {extractRecommendationFeasibility(app)}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <div style={{ fontSize: 14, color: C.inkMid, marginBottom: 4 }}>
                          <strong>Amount:</strong> {formatCurrency(app.amount)} |
                          <strong> Term:</strong> {app.termMonths ? `${app.termMonths} months` : 'To be recommended'} |
                          <strong> Purpose:</strong> {app.purpose || 'Not provided'}
                        </div>
                        <div style={{ fontSize: 12, color: C.inkLight }}>
                          Risk: {app.riskLevel || 'Not Assessed'} |
                          Applied: {new Date(app.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // CHANGED: operational workflow should depend on risk status, not application decision status
                            if (app.riskStatus !== 'ASSESSED') {
                              handleGoToRiskAssessment(app.id);
                            } else {
                              handleApplicationSelect(app.id);
                            }
                          }}
                          style={{
                            background: app.riskStatus !== 'ASSESSED' ? C.warn : C.primary,
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
                            e.target.style.boxShadow = `0 4px 12px ${app.riskStatus !== 'ASSESSED' ? C.warn : C.primary}40`;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = 'none';
                          }}
                        >
                          {app.riskStatus !== 'ASSESSED' ? 'Go to Risk Assessment' :
                           app.recommendationStatus === 'GENERATED' ? 'View Recommendation' : 'Generate Recommendation'}
                        </button>
                      </div>
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

  // Main Recommendation Engine Page - Same structure as RiskAssessmentPage
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

        .recommendation-status-error {
          background: ${theme === "light" ? "#FEF2F2" : "rgba(248, 113, 113, 0.14)"};
          border: 1px solid ${theme === "light" ? "#FCA5A5" : "rgba(248, 113, 113, 0.42)"};
          color: ${theme === "light" ? "#91290F" : "#FECACA"};
        }

        .recommendation-status-success {
          background: ${theme === "light" ? "#EAFBF1" : "rgba(74, 222, 128, 0.14)"};
          border: 1px solid ${theme === "light" ? "#86D7A3" : "rgba(74, 222, 128, 0.42)"};
          color: ${theme === "light" ? "#166534" : "#BBF7D0"};
        }

        .recommendation-modal-overlay {
          backdrop-filter: blur(2px);
        }

        .recommendation-modal-content {
          background: ${theme === "light" ? "var(--surface)" : "var(--modal-bg)"};
          border: 1px solid ${theme === "light" ? "var(--border)" : "var(--border-strong)"};
          color: ${theme === "light" ? "var(--text)" : "#F8FAFC"};
          box-shadow: ${theme === "light" ? "0 20px 50px rgba(15,23,42,0.15)" : "0 20px 45px rgba(0, 0, 0, 0.35)"};
          scrollbar-color: ${theme === "light" ? "#CBD5E1 #FFFFFF" : "#334155 #0F172A"};
        }

        .recommendation-modal-content::-webkit-scrollbar {
          width: 10px;
        }

        .recommendation-modal-content::-webkit-scrollbar-track {
          background: ${theme === "light" ? "#FFFFFF" : "#0F172A"};
          border-radius: 10px;
        }

        .recommendation-modal-content::-webkit-scrollbar-thumb {
          background: ${theme === "light" ? "#CBD5E1" : "#334155"};
          border-radius: 10px;
          border: 2px solid ${theme === "light" ? "#FFFFFF" : "#0F172A"};
        }

        .recommendation-modal-content::-webkit-scrollbar-thumb:hover {
          background: ${theme === "light" ? "#94A3B8" : "#475569"};
        }

        .recommendation-modal-title {
          color: #F8FAFC;
        }

        .recommendation-modal-label {
          color: #CBD5E1;
        }

        .recommendation-modal-input {
          background: #0F172A;
          color: #F8FAFC;
          border: 2px solid #334155;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .recommendation-modal-input::placeholder {
          color: var(--text-muted);
          opacity: 1;
        }

        .recommendation-modal-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.16);
        }

        .recommendation-modal-input:disabled {
          background: #1E293B;
          color: #94A3B8;
          border-color: #334155;
          cursor: not-allowed;
        }

        .recommendation-modal-input option {
          background: ${theme === "light" ? "#FFFFFF" : "#0F172A"};
          color: ${theme === "light" ? "#0F172A" : "#F8FAFC"};
        }

        .recommendation-modal-secondary-btn:disabled,
        .recommendation-modal-primary-btn:disabled,
        .recommendation-modal-danger-btn:disabled {
          color: #E2E8F0 !important;
          opacity: 0.85;
        }
      `}</style>

      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <PageHeader
          title="Recommendation Engine"
          subtitle="Generate AI-powered loan approval recommendations based on risk assessments"
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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

                  {buildReadableRecommendationId(application, recommendation) && (
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
                      {buildReadableRecommendationId(application, recommendation)}
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
          }
        />

        {/* Summary Stats Cards - Same structure as RiskAssessmentPage */}
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
            title="Recommended Amount"
            displayValue={
              recommendation
                ? formatCurrency(recommendation.recommendedAmount)
                : "Not Generated"
            }
            format="text"
            subtitle="AI recommendation"
            gradient="linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)"
            lineGradient="linear-gradient(90deg, #9333ea, #c084fc)"
            icon="🤖"
            index={2}
            valueSize={26}
            minHeight={96}
          />

          <GradientSummaryCard
            title="Feasibility"
            displayValue={recommendation?.feasibility || "Pending"}
            format="text"
            subtitle="Loan viability"
            icon="📊"
            index={3}
            valueSize={26}
            minHeight={96}
            {...getFeasibilityCardTheme(recommendation?.feasibility)}
          />

          <GradientSummaryCard
            title="Status"
            displayValue={
              application?.recommendationStatus === "GENERATED" ? "Generated" : "Pending"
            }
            format="text"
            subtitle="Recommendation stage"
            icon="⚡"
            index={4}
            valueSize={24}
            minHeight={96}
            {...getRecommendationStatusCardTheme(application?.recommendationStatus)}
          />
        </div>

        {/* Check if risk assessment is required */}
        {application?.riskStatus !== 'ASSESSED' && (
          <div style={{
            background: `linear-gradient(135deg, ${C.warnSoft} 0%, ${C.warnSoft}DD 100%)`,
            border: `1px solid ${C.warn}`,
            borderRadius: 16,
            padding: 32,
            marginBottom: 32,
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: C.ink, marginBottom: 12 }}>
              Risk Assessment Required
            </h3>
            <p style={{ fontSize: 16, color: C.inkMid, marginBottom: 24 }}>
              A risk assessment must be completed before generating recommendations.
            </p>
            <button
              onClick={() => navigate(`/risk-assessment/${application.id}`)}
              style={{
                background: `linear-gradient(135deg, ${C.warn} 0%, ${C.warn}DD 100%)`,
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '16px 32px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 16,
                boxShadow: `0 6px 20px ${C.warn}30`,
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
            >
              Go to Risk Assessment
            </button>
          </div>
        )}

        {/* Messages */}
        {recommendationError && (
          <div
            className="recommendation-status-error"
            style={{
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <p style={{ color: 'inherit', fontWeight: 600, fontSize: 16, margin: 0 }}>
              <strong>Error:</strong> {recommendationError}
            </p>
          </div>
        )}

        {actionSuccess && (
          <div
            className="recommendation-status-success"
            style={{
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <p style={{ color: 'inherit', fontWeight: 600, fontSize: 16, margin: 0 }}>
              ✅ {actionSuccess}
            </p>
          </div>
        )}

        {/* Main Result Card */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 32,
          marginBottom: 32,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: C.ink, marginBottom: 24 }}>
            AI Recommendation
          </h2>

          {recommendation ? (
            <div>
              <div style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                border: `2px solid ${getFeasibilityColor(recommendation.feasibility)}`,
                borderRadius: 16,
                padding: 32,
                marginBottom: 24,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Background accent */}
                <div style={{
                  position: 'absolute',
                  top: -40,
                  right: -40,
                  width: 200,
                  height: 200,
                  background: getFeasibilityColor(recommendation.feasibility),
                  borderRadius: '50%',
                  opacity: 0.08
                }}/>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 28,
                  marginBottom: 32,
                  position: 'relative',
                  zIndex: 1
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recommended Amount</div>
                    <div style={{ fontSize: 40, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{formatCurrency(recommendation.recommendedAmount)}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Term Period</div>
                    <div style={{ fontSize: 40, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{recommendation.recommendedPeriod}<span style={{ fontSize: 18, color: '#93c5fd', marginLeft: 4 }}>mo</span></div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Interest Rate</div>
                    <div style={{ fontSize: 40, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{recommendation.recommendedInterestRate}<span style={{ fontSize: 18, color: '#93c5fd', marginLeft: 2 }}>%</span></div>
                  </div>
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Feasibility</div>
                    <div style={{
                      display: 'inline-block',
                      padding: '8px 20px',
                      borderRadius: '24px',
                      background: getFeasibilityColor(recommendation.feasibility),
                      color: '#fff',
                      fontSize: 18,
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      boxShadow: `0 4px 12px ${getFeasibilityColor(recommendation.feasibility)}40`,
                      margin: '0 auto'
                    }}>
                      {recommendation.feasibility}
                    </div>
                  </div>
                </div>

                {/* NEW: Archive Status Display */}
                {recommendation.archived && (
                  <div style={{
                    background: '#fef2f2',
                    border: `2px solid #ef4444`,
                    borderRadius: 12,
                    padding: '16px 20px',
                    marginBottom: 20,
                    boxShadow: '0 2px 8px rgba(239,68,68,0.1)'
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>⚠️</span> Archived Recommendation
                    </div>
                    <div style={{ display: 'grid', gap: 8, fontSize: 13, color: '#64748b' }}>
                      <div><strong style={{ color: '#334155' }}>Archived by:</strong> {recommendation.archivedBy}</div>
                      <div><strong style={{ color: '#334155' }}>Archived at:</strong> {formatDateTime(recommendation.archivedAt)}</div>
                      <div><strong style={{ color: '#334155' }}>Reason:</strong> {recommendation.archiveReason}</div>
                    </div>
                  </div>
                )}

                {/* NEW: Manual Override Display */}
                {recommendation.manualOverride && (
                  <div style={{
                    background: '#fffbeb',
                    border: `2px solid #f59e0b`,
                    borderRadius: 12,
                    padding: '16px 20px',
                    marginBottom: 20,
                    boxShadow: '0 2px 8px rgba(245,158,11,0.1)'
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#d97706', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>✏️</span> Manually Overridden
                    </div>
                    <div style={{ display: 'grid', gap: 8, fontSize: 13, color: '#64748b' }}>
                      <div><strong style={{ color: '#334155' }}>Last updated by:</strong> {recommendation.lastUpdatedBy}</div>
                      <div><strong style={{ color: '#334155' }}>Updated at:</strong> {formatDateTime(recommendation.updatedAt)}</div>
                      <div><strong style={{ color: '#334155' }}>Override reason:</strong> {recommendation.overrideReason}</div>
                    </div>
                  </div>
                )}

                <div style={{
                  background: '#f0f9ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 12,
                  padding: '20px 24px',
                  marginBottom: 24,
                  marginTop: 8
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>📋 Recommendation Reasoning</div>
                  <div style={{ fontSize: 15, color: '#334155', lineHeight: 1.8, letterSpacing: 0.3 }}>
                    {recommendation.reasoning}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 24, fontSize: 12, color: '#64748b', justifyContent: 'center', padding: '16px 0', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>⏰</span> Generated: {formatDateTime(recommendation.generatedAt)}
                  </span>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>🤖</span> Model: {recommendation.modelVersion}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 80, marginBottom: 24 }}>🤖</div>
              <div style={{ fontSize: 20, color: C.ink, marginBottom: 12, fontWeight: 600 }}>No Recommendation Yet</div>
              <p style={{ fontSize: 16, color: C.inkMid, lineHeight: 1.5, maxWidth: 400, margin: '0 auto' }}>
                Generate a recommendation to produce suggested loan terms and decision support.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          {application.riskStatus !== 'ASSESSED' && (
            <div style={{
              background: C.warnSoft,
              border: `1px solid ${C.warn}40`,
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 4 }}>
                  Risk Assessment Required
                </div>
                <div style={{ fontSize: 13, color: C.inkMid }}>
                  This application must complete risk assessment before generating recommendations.
                </div>
              </div>
              <button
                onClick={() => handleGoToRiskAssessment(application.id)}
                style={{
                  background: C.warn,
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 24px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  marginLeft: 16
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = `0 4px 12px ${C.warn}40`;
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Go to Risk Assessment
              </button>
            </div>
          )}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              alignItems: "center",
              marginTop: application.riskStatus !== 'ASSESSED' ? 0 : 24,
              marginBottom: 8,
            }}
          >
            <button
              onClick={() => handleGenerateRecommendation(application.id)}
              disabled={generatingRecommendation || application.riskStatus !== 'ASSESSED' ||
                ['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)}
              style={{
                background: application.riskStatus === 'ASSESSED' && !['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)
                  ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'
                  : C.inkMid,
                color: application.riskStatus === 'ASSESSED' && !['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)
                  ? 'white'
                  : '#FFFFFF',
                border: 'none',
                borderRadius: 18,
                minHeight: 54,
                padding: '0 28px',
                fontWeight: 800,
                cursor: application.riskStatus === 'ASSESSED' && !['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)
                  ? 'pointer'
                  : 'not-allowed',
                fontSize: 15,
                letterSpacing: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                whiteSpace: 'nowrap',
                boxShadow: application.riskStatus === 'ASSESSED' && !['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)
                  ? '0 10px 20px rgba(0,0,0,0.12)'
                  : 'none',
                opacity: application.riskStatus === 'ASSESSED' && !['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)
                  ? 1
                  : 0.6,
                transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
                filter: 'none'
              }}
              onMouseEnter={(e) => {
                if (application.riskStatus === 'ASSESSED' && !['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)) {
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.filter = 'brightness(1.04)';
                  e.target.style.boxShadow = '0 14px 24px rgba(0,0,0,0.16)';
                }
              }}
              onMouseLeave={(e) => {
                if (application.riskStatus === 'ASSESSED' && !['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)) {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.filter = 'none';
                  e.target.style.boxShadow = '0 10px 20px rgba(0,0,0,0.12)';
                }
              }}
              onMouseDown={(e) => {
                e.target.style.transform = 'translateY(0)';
              }}
            >
              {generatingRecommendation ? 'Generating Recommendation...' :
               recommendation ? 'Re-generate Recommendation' : 'Generate Recommendation'}
            </button>

            {/* NEW: Additional action buttons for recommendations */}
            {recommendation && !recommendation.archived && (
              <>
                {/* Recalculate Button */}
                <button
                  onClick={() => handleRecalculate(application.id)}
                  disabled={recalculating || ['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)}
                  style={{
                    background: recalculating ? C.inkMid : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 18,
                    minHeight: 54,
                    padding: '0 28px',
                    fontWeight: 800,
                    cursor: recalculating || ['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)
                      ? 'not-allowed'
                      : 'pointer',
                    fontSize: 15,
                    letterSpacing: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    whiteSpace: 'nowrap',
                    opacity: recalculating || ['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status) ? 0.6 : 1,
                    boxShadow: !recalculating && !['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)
                      ? '0 10px 20px rgba(0,0,0,0.12)'
                      : 'none',
                    transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
                    filter: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!recalculating && !['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)) {
                      e.target.style.transform = "translateY(-1px)";
                      e.target.style.filter = 'brightness(1.04)';
                      e.target.style.boxShadow = '0 14px 24px rgba(0,0,0,0.16)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!recalculating && !['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)) {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.filter = 'none';
                      e.target.style.boxShadow = '0 10px 20px rgba(0,0,0,0.12)';
                    }
                  }}
                  onMouseDown={(e) => {
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  {recalculating ? 'Recalculating...' : 'Recalculate'}
                </button>

                {/* Edit Button */}
                <button
                  onClick={handleStartEdit}
                  disabled={['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)}
                  style={{
                    background: ['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status) ? C.inkMid : 'linear-gradient(135deg, #14B8A6 0%, #0F9F8F 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 18,
                    minHeight: 54,
                    padding: '0 28px',
                    fontWeight: 800,
                    cursor: ['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status) ? 'not-allowed' : 'pointer',
                    fontSize: 15,
                    letterSpacing: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    whiteSpace: 'nowrap',
                    opacity: ['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status) ? 0.6 : 1,
                    boxShadow: !['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)
                      ? '0 10px 20px rgba(0,0,0,0.12)'
                      : 'none',
                    transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
                    filter: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)) {
                      e.target.style.transform = "translateY(-1px)";
                      e.target.style.filter = 'brightness(1.04)';
                      e.target.style.boxShadow = '0 14px 24px rgba(0,0,0,0.16)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)) {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.filter = 'none';
                      e.target.style.boxShadow = '0 10px 20px rgba(0,0,0,0.12)';
                    }
                  }}
                  onMouseDown={(e) => {
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Edit
                </button>

                {/* Archive Button */}
                <button
                  onClick={() => setShowConfirmDialog('archive')}
                  disabled={['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)}
                  style={{
                    background: ['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status) ? C.inkMid : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 18,
                    minHeight: 54,
                    padding: '0 28px',
                    fontWeight: 800,
                    cursor: ['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status) ? 'not-allowed' : 'pointer',
                    fontSize: 15,
                    letterSpacing: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    whiteSpace: 'nowrap',
                    opacity: ['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status) ? 0.6 : 1,
                    boxShadow: !['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)
                      ? '0 10px 20px rgba(0,0,0,0.12)'
                      : 'none',
                    transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
                    filter: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)) {
                      e.target.style.transform = "translateY(-1px)";
                      e.target.style.filter = 'brightness(1.04)';
                      e.target.style.boxShadow = '0 14px 24px rgba(0,0,0,0.16)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status)) {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.filter = 'none';
                      e.target.style.boxShadow = '0 10px 20px rgba(0,0,0,0.12)';
                    }
                  }}
                  onMouseDown={(e) => {
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Archive
                </button>
              </>
            )}

            {/** Show Delete button only for archived recommendations */}
            {recommendation && recommendation.archived && (
              <button
                onClick={() => setShowConfirmDialog('delete')}
                style={{
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 18,
                  minHeight: 54,
                  padding: '0 28px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: 15,
                  letterSpacing: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
                  filter: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.filter = 'brightness(1.04)';
                  e.target.style.boxShadow = '0 14px 24px rgba(0,0,0,0.16)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.filter = 'none';
                  e.target.style.boxShadow = '0 10px 20px rgba(0,0,0,0.12)';
                }}
                onMouseDown={(e) => {
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Delete Permanently
              </button>
            )}

            {isDirectMode && (
              <button
                onClick={() => navigate(`/applications/${application.id}`)}
                style={{
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 18,
                  minHeight: 54,
                  padding: '0 28px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: 15,
                  letterSpacing: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
                  filter: 'none'
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
                Back to Application Details
              </button>
            )}
          </div>
        </div>

        {/* Additional Details (if recommendation exists) */}
        {recommendation && (
          <>
            {/* Recommendation Inputs */}
            {recommendation?.inputSnapshot && (
              <div style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                padding: 32,
                marginTop: 24,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: C.ink, marginBottom: 24 }}>
                  Recommendation Inputs
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                  {Object.entries(recommendation.inputSnapshot).map(([key, value]) => (
                    <div key={key}>
                      <div style={{ fontSize: 13, color: C.inkMid, marginBottom: 6, fontWeight: 500 }}>
                        {formatLabel(key)}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                         typeof value === 'number' && key.toLowerCase().includes('amount') ? formatCurrency(value) :
                         value ?? '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Applicant Information */}
            <div style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 32,
              marginTop: 24,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: C.ink, marginBottom: 24 }}>
                Applicant Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                {[
                  { label: 'Full Name', value: applicant?.fullName },
                  { label: 'NIC', value: applicant?.nic },
                  { label: 'Phone', value: applicant?.phone },
                  { label: 'Email', value: applicant?.email },
                  { label: 'Branch', value: applicant?.branch },
                  { label: 'Monthly Income', value: formatCurrency(applicant?.monthlyIncome) },
                  { label: 'Employment Status', value: applicant?.employmentStatus },
                  { label: 'Employment Length', value: applicant?.employmentLengthMonths ? `${applicant.employmentLengthMonths} months` : '-' },
                  { label: 'Existing Loans', value: applicant?.existingLoans ?? '-' },
                  { label: 'Dependents', value: applicant?.dependents ?? '-' },
                  { label: 'Has Mortgage', value: applicant?.hasMortgage || '-' },
                  { label: 'Credit Score', value: applicant?.creditScore || '-' }
                ].map((item, index) => (
                  <div key={index}>
                    <div style={{ fontSize: 13, color: C.inkMid, marginBottom: 6, fontWeight: 500 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>
                      {item.value || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Loan Application Details */}
            <div style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 32,
              marginTop: 24,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: C.ink, marginBottom: 24 }}>
                Loan Application Details
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                {[
                  { label: 'Application ID', value: application?.applicationNumber || 'N/A' },
                  { label: 'Amount', value: formatCurrency(application?.amount) },
                  { label: 'Term', value: application?.termMonths ? `${application.termMonths} months` : 'To be recommended' },
                  { label: 'Interest Rate', value: application?.interestRate ? `${application.interestRate}%` : 'To be recommended' },
                  { label: 'Purpose', value: application?.purpose || 'Not provided' },
                  { label: 'Has Co-Signer', value: application?.hasCoSigner === null || application?.hasCoSigner === undefined ? 'Not specified' : (application.hasCoSigner ? 'Yes' : 'No') },
                  { label: 'Status', value: application?.status },
                  { label: 'Risk Status', value: application?.riskStatus },
                  { label: 'Risk Level', value: application?.riskLevel },
                  { label: 'Created At', value: formatDateTime(application?.createdAt) }
                ].map((item, index) => (
                  <div key={index}>
                    <div style={{ fontSize: 13, color: C.inkMid, marginBottom: 6, fontWeight: 500 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>
                      {item.value || '-'}
                    </div>
                  </div>
                ))}
              </div>
              {application?.notes && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 13, color: C.inkMid, marginBottom: 8, fontWeight: 500 }}>Notes</div>
                  <div style={{
                    fontSize: 15,
                    color: C.ink,
                    background: C.surfaceDeep,
                    padding: 16,
                    borderRadius: 12,
                    lineHeight: 1.5
                  }}>
                    {application.notes}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* NEW: Edit Modal */}
      {isEditing && (
        <div
          className="recommendation-modal-overlay"
          style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div
            className="recommendation-modal-content"
            style={{
            ...getModalPanelStyle(theme),
            borderRadius: 16,
            padding: 32,
            maxWidth: 600,
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div
              className="recommendation-modal-title"
              style={{
              ...getModalTitleStyle(theme),
              fontSize: 24,
              marginBottom: 24
            }}>
              Edit Recommendation
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="recommendation-modal-label" style={{ ...getModalLabelStyle(theme), fontSize: 14, display: 'block', marginBottom: 8 }}>
                  Recommended Amount (LKR)
                </label>
                <input
                  type="number"
                  name="recommendedAmount"
                  value={editForm.recommendedAmount}
                  onChange={handleEditInputChange}
                  onBlur={handleEditBlur}
                  onKeyDown={(e) => blockInvalidNumberKeys(e, "recommendedAmount")}
                  min="10000"
                  max="10000000"
                  step="0.01"
                  className="recommendation-modal-input"
                  style={{
                    ...getModalInputStyle(theme),
                    borderColor: editFormErrors.recommendedAmount ? C.danger : undefined,
                    borderWidth: editFormErrors.recommendedAmount ? '2px' : undefined
                  }}
                />
                {editFormErrors.recommendedAmount && (
                  <div style={{ marginTop: 6, color: C.danger, fontSize: '0.85rem', lineHeight: 1.3 }}>
                    {editFormErrors.recommendedAmount}
                  </div>
                )}
              </div>

              <div>
                <label className="recommendation-modal-label" style={{ ...getModalLabelStyle(theme), fontSize: 14, display: 'block', marginBottom: 8 }}>
                  Recommended Period (months)
                </label>
                <input
                  type="number"
                  name="recommendedPeriod"
                  value={editForm.recommendedPeriod}
                  onChange={handleEditInputChange}
                  onBlur={handleEditBlur}
                  onKeyDown={(e) => blockInvalidNumberKeys(e, "recommendedPeriod")}
                  min="6"
                  max="120"
                  step="1"
                  className="recommendation-modal-input"
                  style={{
                    ...getModalInputStyle(theme),
                    borderColor: editFormErrors.recommendedPeriod ? C.danger : undefined,
                    borderWidth: editFormErrors.recommendedPeriod ? '2px' : undefined
                  }}
                />
                {editFormErrors.recommendedPeriod && (
                  <div style={{ marginTop: 6, color: C.danger, fontSize: '0.85rem', lineHeight: 1.3 }}>
                    {editFormErrors.recommendedPeriod}
                  </div>
                )}
              </div>

              <div>
                <label className="recommendation-modal-label" style={{ ...getModalLabelStyle(theme), fontSize: 14, display: 'block', marginBottom: 8 }}>
                  Recommended Interest Rate (%)
                </label>
                <input
                  type="number"
                  name="recommendedInterestRate"
                  value={editForm.recommendedInterestRate}
                  onChange={handleEditInputChange}
                  onBlur={handleEditBlur}
                  onKeyDown={(e) => blockInvalidNumberKeys(e, "recommendedInterestRate")}
                  min="5"
                  max="50"
                  step="0.01"
                  className="recommendation-modal-input"
                  style={{
                    ...getModalInputStyle(theme),
                    borderColor: editFormErrors.recommendedInterestRate ? C.danger : undefined,
                    borderWidth: editFormErrors.recommendedInterestRate ? '2px' : undefined
                  }}
                />
                {editFormErrors.recommendedInterestRate && (
                  <div style={{ marginTop: 6, color: C.danger, fontSize: '0.85rem', lineHeight: 1.3 }}>
                    {editFormErrors.recommendedInterestRate}
                  </div>
                )}
              </div>

              <div>
                <label className="recommendation-modal-label" style={{ ...getModalLabelStyle(theme), fontSize: 14, display: 'block', marginBottom: 8 }}>
                  Feasibility
                </label>
                <div
                  style={{
                    ...getModalInputStyle(theme),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'not-allowed',
                    opacity: 0.7,
                    background: theme === 'light' ? '#f8f9fa' : '#1e293b'
                  }}
                >
                  <span style={{ fontWeight: 600, color: C.ink }}>
                    {editForm.feasibility === 'HIGH' ? 'High' : editForm.feasibility === 'MEDIUM' ? 'Medium' : 'Low'}
                  </span>
                  <span style={{ fontSize: 12, color: C.inkMid, fontStyle: 'italic' }}>
                    System Generated
                  </span>
                </div>
                <div style={{ 
                  fontSize: 12, 
                  color: C.inkMid, 
                  marginTop: 4, 
                  fontStyle: 'italic' 
                }}>
                  Feasibility is system-generated and cannot be edited manually.
                </div>
              </div>

              <div>
                <label className="recommendation-modal-label" style={{ ...getModalLabelStyle(theme), fontSize: 14, display: 'block', marginBottom: 8 }}>
                  Reasoning
                </label>
                <textarea
                  className="recommendation-modal-input"
                  value={editForm.reasoning}
                  onChange={(e) => setEditForm({...editForm, reasoning: e.target.value})}
                  rows={3}
                  style={{
                    ...getModalInputStyle(theme),
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label className="recommendation-modal-label" style={{ ...getModalLabelStyle(theme), fontSize: 14, display: 'block', marginBottom: 8 }}>
                  Override Reason *
                </label>
                <textarea
                  className="recommendation-modal-input"
                  name="overrideReason"
                  value={editForm.overrideReason}
                  onChange={handleEditInputChange}
                  onBlur={handleEditBlur}
                  rows={2}
                  placeholder="Explain why you are manually overriding the recommendation..."
                  style={{
                    ...getModalInputStyle(theme),
                    borderColor: editFormErrors.overrideReason ? C.danger : undefined,
                    borderWidth: editFormErrors.overrideReason ? '2px' : undefined,
                    resize: 'vertical'
                  }}
                />
                {editFormErrors.overrideReason && (
                  <div style={{ marginTop: 6, color: C.danger, fontSize: '0.85rem', lineHeight: 1.3 }}>
                    {editFormErrors.overrideReason}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button
                className="recommendation-modal-secondary-btn"
                onClick={handleCancelEdit}
                disabled={updating}
                style={{
                  background: C.surface,
                  color: C.ink,
                  border: `2px solid ${C.border}`,
                  borderRadius: 8,
                  padding: '12px 24px',
                  fontWeight: 600,
                  cursor: updating ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                className="recommendation-modal-primary-btn"
                onClick={handleSaveEdit}
                disabled={updating || !isEditFormValid()}
                style={{
                  background: updating || !isEditFormValid() ? C.inkMid : C.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 24px',
                  fontWeight: 600,
                  cursor: updating || !isEditFormValid() ? 'not-allowed' : 'pointer'
                }}
              >
                {updating ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Confirmation Dialog */}
      {showConfirmDialog && (
        <div
          className="recommendation-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            backdropFilter: 'blur(4px)'
          }}>
          <div
            className="recommendation-modal-card"
            style={{
              background: C.surfaceDeep,
              color: C.ink,
              border: `1px solid ${C.border}`,
              borderRadius: 20,
              padding: 32,
              maxWidth: 520,
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
              opacity: 1
            }}>
            <div
              className="recommendation-modal-title"
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 16,
                color: C.ink
              }}>
              {showConfirmDialog === 'archive' ? 'Archive Recommendation' : 'Delete Recommendation'}
            </div>

            <div style={{
              fontSize: 16,
              color: C.inkMid,
              marginBottom: 24,
              lineHeight: '1.5'
            }}>
              {showConfirmDialog === 'archive'
                ? 'Are you sure you want to archive this recommendation? This action can be undone.'
                : 'Are you sure you want to permanently delete this recommendation? This action cannot be undone.'
              }
            </div>

            {showConfirmDialog === 'archive' && (
              <div style={{ marginBottom: 24 }}>
                <label className="recommendation-modal-label" style={{
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: 8,
                  color: C.ink
                }}>
                  Archive Reason *
                </label>
                <textarea
                  className="recommendation-modal-input"
                  value={confirmReason}
                  onChange={(e) => setConfirmReason(e.target.value)}
                  onFocus={() => setArchiveFormErrors({})}
                  rows={3}
                  placeholder="Explain why you are archiving this recommendation..."
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 12,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    background: C.surface,
                    color: C.ink,
                    border: archiveFormErrors.reason ? `2px solid ${C.danger}` : `1px solid ${C.border}`,
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s ease'
                  }}
                />
                {archiveFormErrors.reason && (
                  <div style={{
                    fontSize: 13,
                    color: C.danger,
                    marginTop: 6,
                    fontWeight: 500
                  }}>
                    {archiveFormErrors.reason}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                className="recommendation-modal-secondary-btn"
                onClick={() => {
                  setShowConfirmDialog(null);
                  setConfirmReason('');
                  setArchiveFormErrors({});
                }}
                disabled={archiving || deleting}
                style={{
                  background: C.surface,
                  color: C.ink,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: archiving || deleting ? 'not-allowed' : 'pointer',
                  opacity: archiving || deleting ? 0.6 : 1,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!archiving && !deleting) {
                    e.target.style.background = C.surfaceAlt;
                    e.target.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!archiving && !deleting) {
                    e.target.style.background = C.surface;
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                Cancel
              </button>
              <button
                className="recommendation-modal-danger-btn"
                onClick={showConfirmDialog === 'archive' ? handleArchive : handleDelete}
                disabled={
                  archiving || deleting ||
                  (showConfirmDialog === 'archive' && !confirmReason.trim())
                }
                style={{
                  background: archiving || deleting || (showConfirmDialog === 'archive' && !confirmReason.trim())
                    ? C.inkMid
                    : C.danger,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: archiving || deleting || (showConfirmDialog === 'archive' && !confirmReason.trim())
                    ? 'not-allowed'
                    : 'pointer',
                  opacity: archiving || deleting || (showConfirmDialog === 'archive' && !confirmReason.trim())
                    ? 0.6
                    : 1,
                  transition: 'all 0.2s ease',
                  boxShadow: archiving || deleting || (showConfirmDialog === 'archive' && !confirmReason.trim())
                    ? 'none'
                    : '0 4px 12px rgba(220, 38, 38, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!archiving && !deleting && (showConfirmDialog !== 'archive' || confirmReason.trim())) {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 8px 20px rgba(220, 38, 38, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!archiving && !deleting && (showConfirmDialog !== 'archive' || confirmReason.trim())) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
                  }
                }}
              >
                {archiving
                  ? 'Archiving...'
                  : deleting
                    ? 'Deleting...'
                    : showConfirmDialog === 'archive'
                      ? 'Archive'
                      : 'Delete Permanently'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
