import { useEffect, useMemo, useState, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import { Download, PlayCircle, FileText } from "lucide-react";
import { reportService } from "../services/reportService";
import { exportReportToPDF } from "../utils/reportExport";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const reportTypeOptions = [
  { value: "general", label: "General" },
  { value: "defaults", label: "Defaults" },
  { value: "approvals", label: "Approvals" },
  { value: "repayment_performance", label: "Repayment Performance" }
];

const DEFAULT_BRANCHES = ["All", "Colombo", "Kandy", "Galle", "Matara", "Jaffna", "Kurunegala", "Anuradhapura"];

const DEFAULT_STATUSES = [
  "All",
  "PENDING",
  "REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED"
];

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toLocalDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const sanitizeFilterValue = (name, value) => {
  if (typeof value !== 'string') return value;
  return value.trim();
};

const validateViewerField = (name, value, currentFilters, filterOptions, mergedBranches) => {
  value = String(value ?? '').trim();

  // Type validation
  if (name === 'type') {
    const validTypes = reportTypeOptions.map(t => t.value);
    if (!validTypes.includes(value)) {
      return 'Invalid report type';
    }
  }

  // Branch validation
  if (name === 'branch') {
    const validBranches = ['All', ...mergedBranches];
    if (!validBranches.includes(value)) {
      return 'Invalid branch';
    }
  }

  // Status validation - check against both DEFAULT_STATUSES and backend statuses
  if (name === 'status') {
    const defaultStatusValues = DEFAULT_STATUSES;
    const backendStatuses = filterOptions.statuses || [];
    const validStatuses = Array.from(
      new Set([
        ...defaultStatusValues,
        ...backendStatuses.map(s => String(s).trim().toUpperCase())
      ])
    );
    if (!validStatuses.includes(value)) {
      return 'Invalid status';
    }
  }

  // Date range validation
  if (name === 'startDate' || name === 'endDate') {
    if (value && new Date(value) > new Date()) {
      return 'Cannot select a future date';
    }

    if (name === 'endDate' && currentFilters.startDate && value) {
      const startDate = new Date(currentFilters.startDate);
      const endDate = new Date(value);
      if (startDate > endDate) {
        return 'End date must be on or after start date';
      }
    }
  }

  return '';
};

const validateViewerForm = (filters, filterOptions, mergedBranches) => {
  const errors = {};

  Object.keys(filters).forEach(key => {
    const error = validateViewerField(key, filters[key], filters, filterOptions, mergedBranches);
    if (error) errors[key] = error;
  });

  return errors;
};

export default function ReportViewerTab() {
  const [templates, setTemplates] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ branches: [], statuses: [], reportTypes: [] });
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [filters, setFilters] = useState({
    type: "general",
    branch: "All",
    status: "All",
    startDate: "",
    endDate: ""
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState("");
  const [viewerErrors, setViewerErrors] = useState({});
  
  // Ref for the printable report container
  const printableReportRef = useRef(null);

  const loadInitial = async () => {
    try {
      const [templateData, options] = await Promise.all([
        reportService.getTemplates(),
        reportService.getFilterOptions()
      ]);
      setTemplates(templateData || []);
      setFilterOptions(options || { branches: [], statuses: [], reportTypes: [] });
    } catch (err) {
      setError(err?.message || "Failed to load report options");
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const onTemplateChange = (templateId) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      return;
    }

    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    setFilters({
      type: template.type || "general",
      branch: template.filters?.branch || "All",
      status: template.filters?.status || "All",
      startDate: toLocalDateInput(template.filters?.dateRange?.startDate),
      endDate: toLocalDateInput(template.filters?.dateRange?.endDate)
    });
  };

  const handleFilterChange = (fieldName, value) => {
    const sanitizedValue = sanitizeFilterValue(fieldName, value);
    setFilters(prev => ({ ...prev, [fieldName]: sanitizedValue }));

    // Validate field on change
    const error = validateViewerField(fieldName, sanitizedValue, { ...filters, [fieldName]: sanitizedValue }, filterOptions, mergedBranches);
    setViewerErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  };

  const handleFilterBlur = (fieldName) => {
    const value = filters[fieldName];
    const error = validateViewerField(fieldName, value, filters, filterOptions, mergedBranches);
    setViewerErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  };

  const handleGenerate = async () => {
    try {
      setError("");

      // Validate all fields
      const errors = validateViewerForm(filters, filterOptions, mergedBranches);
      if (Object.keys(errors).length > 0) {
        setViewerErrors(errors);
        setError("Please fix the validation errors below");
        return;
      }

      setLoading(true);
      setViewerErrors({});

      const params = {
        type: filters.type,
        branch: filters.branch && filters.branch.trim() ? filters.branch : undefined,
        status: filters.status && filters.status.trim() ? filters.status : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      };

      const result = await reportService.generateReport(params);
      setReportData(result);
    } catch (err) {
      setError(err?.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    return {
      labels: reportData?.labels || [],
      datasets: reportData?.datasets || []
    };
  }, [reportData]);

  const mergedBranches = useMemo(() => {
    const normalizedDefaults = new Map(
      DEFAULT_BRANCHES.map((branch) => [branch.toLowerCase(), branch])
    );
    const uniqueBranches = new Map();

    [...(filterOptions.branches || []), ...DEFAULT_BRANCHES].forEach((branch) => {
      if (!branch) return;

      const trimmedBranch = String(branch).trim();
      if (!trimmedBranch) return;

      const key = trimmedBranch.toLowerCase();
      const canonicalBranch = normalizedDefaults.get(key) || trimmedBranch;
      if (!uniqueBranches.has(key)) {
        uniqueBranches.set(key, canonicalBranch);
      }
    });

    return Array.from(uniqueBranches.values());
  }, [filterOptions.branches]);

  const mergedStatuses = useMemo(() => {
    const allStatuses = [
      ...DEFAULT_STATUSES.filter(s => s !== "All"),
      ...(filterOptions.statuses || [])
    ];

    // Remove duplicates (case-insensitive) and normalize to uppercase
    const uniqueStatuses = Array.from(
      new Set(
        allStatuses
          .map(s => String(s).trim().toUpperCase())
          .filter(s => s.length > 0)
      )
    );

    return ["All", ...uniqueStatuses];
  }, [filterOptions.statuses]);

  const kpiEntries = useMemo(() => {
    const kpis = reportData?.kpis || {};
    return Object.entries(kpis);
  }, [reportData]);

  // Export handlers
  const handleExportPDF = async () => {
    if (!printableReportRef.current || !reportData) return;
    
    try {
      await exportReportToPDF(printableReportRef.current, {
        fileName: `Report_${new Date().toISOString().slice(0, 10)}.pdf`,
        title: getReportTitle(),
        filterSummary: getFilterSummary()
      });
    } catch (error) {
      console.error('Failed to export PDF:', error);
      setError('Failed to export PDF. Please try again.');
    }
  };

  const getReportTitle = () => {
    const typeLabel = reportTypeOptions.find(opt => opt.value === filters.type)?.label || filters.type;
    return `${typeLabel} Report`;
  };

  const getFilterSummary = () => {
    const summary = [];
    if (filters.type) summary.push(`Type: ${reportTypeOptions.find(opt => opt.value === filters.type)?.label || filters.type}`);
    if (filters.branch && filters.branch !== 'All') summary.push(`Branch: ${filters.branch}`);
    if (filters.status && filters.status !== 'All') summary.push(`Status: ${filters.status}`);
    if (filters.startDate) summary.push(`From: ${filters.startDate}`);
    if (filters.endDate) summary.push(`To: ${filters.endDate}`);
    return summary.join(' • ');
  };

  return (
    <div>
      <div className="reporting-panel">
        <div className="reporting-grid reporting-grid-two">
          <div className="reporting-form-field">
            <label>Template</label>
            <select value={selectedTemplateId} onChange={(e) => onTemplateChange(e.target.value)}>
              <option value="">Custom / No Template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
          </div>
          <div className="reporting-form-field">
            <label>Report Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              onBlur={() => handleFilterBlur('type')}
              style={{ borderColor: viewerErrors.type ? '#dc2626' : '', borderWidth: viewerErrors.type ? '2px' : '' }}
            >
              {reportTypeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {viewerErrors.type && <div style={{ marginTop: 6, color: '#dc2626', fontSize: '0.85rem' }}>{viewerErrors.type}</div>}
          </div>
          <div className="reporting-form-field">
            <label>Branch</label>
            <select
              value={filters.branch}
              onChange={(e) => handleFilterChange('branch', e.target.value)}
              onBlur={() => handleFilterBlur('branch')}
              style={{ borderColor: viewerErrors.branch ? '#dc2626' : '', borderWidth: viewerErrors.branch ? '2px' : '' }}
            >
              {mergedBranches.map((branch) => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
            {viewerErrors.branch && <div style={{ marginTop: 6, color: '#dc2626', fontSize: '0.85rem' }}>{viewerErrors.branch}</div>}
          </div>
          <div className="reporting-form-field">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              onBlur={() => handleFilterBlur('status')}
              style={{ borderColor: viewerErrors.status ? '#dc2626' : '', borderWidth: viewerErrors.status ? '2px' : '' }}
            >
              {mergedStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            {viewerErrors.status && <div style={{ marginTop: 6, color: '#dc2626', fontSize: '0.85rem' }}>{viewerErrors.status}</div>}
          </div>
          <div className="reporting-form-field">
            <label>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              onBlur={() => handleFilterBlur('startDate')}
              max={getTodayDate()}
              style={{ borderColor: viewerErrors.startDate ? '#dc2626' : '', borderWidth: viewerErrors.startDate ? '2px' : '' }}
            />
            {viewerErrors.startDate && <div style={{ marginTop: 6, color: '#dc2626', fontSize: '0.85rem' }}>{viewerErrors.startDate}</div>}
          </div>
          <div className="reporting-form-field">
            <label>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              onBlur={() => handleFilterBlur('endDate')}
              max={getTodayDate()}
              style={{ borderColor: viewerErrors.endDate ? '#dc2626' : '', borderWidth: viewerErrors.endDate ? '2px' : '' }}
            />
            {viewerErrors.endDate && <div style={{ marginTop: 6, color: '#dc2626', fontSize: '0.85rem' }}>{viewerErrors.endDate}</div>}
          </div>
        </div>

        <div className="reporting-actions">
          <button
            className="reporting-btn"
            type="button"
            onClick={handleGenerate}
            disabled={loading || Object.values(viewerErrors).some(e => e)}
          >
            <PlayCircle size={16} />
            {loading ? "Generating..." : "Generate Report"}
          </button>
          <button 
            className="reporting-btn reporting-btn-secondary" 
            type="button" 
            onClick={handleExportPDF} 
            disabled={!reportData}
          >
            <FileText size={16} />
            Export PDF
          </button>
        </div>
      </div>

      {error && <div className="reporting-alert">{error}</div>}

      {!reportData && !loading && <div className="reporting-panel reporting-empty">No report generated yet.</div>}

      {reportData && (
        <div ref={printableReportRef} className="printable-report-content">
          {/* Report Header for Export */}
          <div className="report-header print-only">
            <h1>{getReportTitle()}</h1>
            <p>Generated on: {new Date().toLocaleDateString()}</p>
            {getFilterSummary() && <p>Filters: {getFilterSummary()}</p>}
          </div>

          <div className="reporting-grid reporting-grid-kpi">
            {kpiEntries.length === 0 ? (
              <div className="reporting-kpi-card">No KPI data available for this report.</div>
            ) : (
              kpiEntries.map(([key, value]) => (
                <div className="reporting-kpi-card" key={key}>
                  <div className="reporting-kpi-title">{key.replace(/([A-Z])/g, " $1")}</div>
                  <div className="reporting-kpi-value">{typeof value === "number" ? Number(value).toLocaleString() : String(value)}</div>
                </div>
              ))
            )}
          </div>

          <div className="reporting-grid reporting-grid-two">
            <div className="reporting-panel">
              <h3>Bar Chart</h3>
              <div className="reporting-chart-wrap">
                <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </div>
            <div className="reporting-panel">
              <h3>Pie Chart</h3>
              <div className="reporting-chart-wrap">
                <Pie data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
