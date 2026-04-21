import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { reportService } from "../services/reportService";

const defaultForm = {
  title: "",
  type: "general",
  filters: {
    branch: "All",
    status: "All",
    dateRange: {
      startDate: "",
      endDate: ""
    }
  }
};

const DEFAULT_BRANCHES = [
  "All",
  "Colombo",
  "Kandy",
  "Kurunegala",
  "Matara",
  "Galle",
  "Jaffna",
  "Anuradhapura"
];

const DEFAULT_STATUSES = [
  "All",
  "PENDING",
  "REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED"
];

const reportTypeOptions = [
  { value: "general", label: "General" },
  { value: "defaults", label: "Defaults" },
  { value: "approvals", label: "Approvals" },
  { value: "repayment_performance", label: "Repayment Performance" }
];

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeTitle = (value) => {
  return String(value ?? '').trim();
};

const toDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const validateTemplateField = (fieldName, value, form, filterOptions, templates, editingId, mergedBranches = [], mergedStatuses = []) => {
  value = String(value ?? '').trim();

  if (fieldName === 'title') {
    if (!value) {
      return 'Title is required';
    }
    if (value.length < 3) {
      return 'Title must be at least 3 characters';
    }
    if (value.length > 100) {
      return 'Title cannot exceed 100 characters';
    }

    // Check for duplicate titles (case-insensitive) excluding current template
    const isDuplicate = templates.some(t =>
      t.title.toLowerCase() === value.toLowerCase() && t.id !== editingId
    );
    if (isDuplicate) {
      return 'A template with this title already exists';
    }
  }

  if (fieldName === 'type') {
    const validTypes = reportTypeOptions.map(t => t.value);
    if (!validTypes.includes(value)) {
      return 'Invalid report type';
    }
  }

  if (fieldName === 'branch') {
    const validBranches = mergedBranches.length > 0 ? mergedBranches : ['All', ...(filterOptions.branches || [])];
    if (!validBranches.includes(value)) {
      return 'Invalid branch';
    }
  }

  if (fieldName === 'status') {
    const validStatuses = mergedStatuses.length > 0 ? mergedStatuses : DEFAULT_STATUSES;
    if (!validStatuses.includes(value)) {
      return 'Invalid status';
    }
  }

  if (fieldName === 'startDate' || fieldName === 'endDate') {
    if (value && new Date(value) > new Date()) {
      return 'Cannot select a future date';
    }

    if (fieldName === 'endDate' && form.filters.dateRange.startDate && value) {
      const startDate = new Date(form.filters.dateRange.startDate);
      const endDate = new Date(value);
      if (startDate > endDate) {
        return 'End date must be on or after start date';
      }
    }
  }

  return '';
};

const validateTemplateForm = (form, filterOptions, templates, editingId, mergedBranches = [], mergedStatuses = []) => {
  const errors = {};

  // Validate title
  const titleError = validateTemplateField('title', form.title, form, filterOptions, templates, editingId, mergedBranches, mergedStatuses);
  if (titleError) errors.title = titleError;

  // Validate type
  const typeError = validateTemplateField('type', form.type, form, filterOptions, templates, editingId, mergedBranches, mergedStatuses);
  if (typeError) errors.type = typeError;

  // Validate branch
  const branchError = validateTemplateField('branch', form.filters.branch, form, filterOptions, templates, editingId, mergedBranches, mergedStatuses);
  if (branchError) errors.branch = branchError;

  // Validate status
  const statusError = validateTemplateField('status', form.filters.status, form, filterOptions, templates, editingId, mergedBranches, mergedStatuses);
  if (statusError) errors.status = statusError;

  // Validate dates
  const startDateError = validateTemplateField('startDate', form.filters.dateRange.startDate, form, filterOptions, templates, editingId, mergedBranches, mergedStatuses);
  if (startDateError) errors.startDate = startDateError;

  const endDateError = validateTemplateField('endDate', form.filters.dateRange.endDate, form, filterOptions, templates, editingId, mergedBranches, mergedStatuses);
  if (endDateError) errors.endDate = endDateError;

  return errors;
};

export default function ReportTemplatesTab() {
  const [templates, setTemplates] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ branches: [], statuses: [] });
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [templateFormErrors, setTemplateFormErrors] = useState({});

  const loadData = async () => {
    try {
      setError("");
      const [templateData, options] = await Promise.all([
        reportService.getTemplates(),
        reportService.getFilterOptions()
      ]);
      setTemplates(templateData || []);
      setFilterOptions(options || { branches: [], statuses: [] });
    } catch (err) {
      setError(err?.message || "Failed to load templates");
    }
  };

  const mergedBranches = useMemo(() => {
    const allBranches = [
      ...DEFAULT_BRANCHES,
      ...(filterOptions?.branches || [])
    ];

    // Remove duplicates (case-insensitive) and trim
    const uniqueBranches = Array.from(
      new Map(
        allBranches
          .map(b => String(b).trim())
          .filter(b => b.length > 0)
          .map(b => [b.toLowerCase(), b])
      ).values()
    );

    return uniqueBranches;
  }, [filterOptions?.branches]);

  const mergedStatuses = useMemo(() => {
    const allStatuses = [
      ...DEFAULT_STATUSES.filter(s => s !== "All"),
      ...(filterOptions?.statuses || [])
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
  }, [filterOptions?.statuses]);

  useEffect(() => {
    loadData();
  }, []);

  const selectedCount = selectedIds.length;

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId("");
    setShowForm(false);
    setTemplateFormErrors({});
  };

  const onCreateClick = () => {
    setMessage("");
    setError("");
    setEditingId("");
    setForm(defaultForm);
    setTemplateFormErrors({});
    setShowForm(true);
  };

  const onEdit = (template) => {
    setMessage("");
    setError("");
    setEditingId(template.id);
    setForm({
      title: template.title || "",
      type: template.type || "general",
      filters: {
        branch: template.filters?.branch || "All",
        status: template.filters?.status || "All",
        dateRange: {
          startDate: toDateInput(template.filters?.dateRange?.startDate),
          endDate: toDateInput(template.filters?.dateRange?.endDate)
        }
      }
    });
    setTemplateFormErrors({});
    setShowForm(true);
  };

  const onSave = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    // Validate form
    const errors = validateTemplateForm(form, filterOptions, templates, editingId, mergedBranches, mergedStatuses);
    if (Object.keys(errors).length > 0) {
      setTemplateFormErrors(errors);
      setError("Please fix the validation errors below");
      return;
    }

    const payload = {
      title: normalizeTitle(form.title),
      type: form.type,
      filters: {
        branch: form.filters.branch,
        status: form.filters.status,
        dateRange: {
          startDate: form.filters.dateRange.startDate || null,
          endDate: form.filters.dateRange.endDate || null
        }
      }
    };

    try {
      setTemplateFormErrors({});
      if (editingId) {
        await reportService.updateTemplate(editingId, payload);
        setMessage("Template updated successfully.");
      } else {
        await reportService.createTemplate(payload);
        setMessage("Template created successfully.");
      }
      await loadData();
      resetForm();
    } catch (err) {
      const fieldErrors = err?.response?.data?.fieldErrors;
      if (fieldErrors && typeof fieldErrors === "object") {
        setTemplateFormErrors(fieldErrors);
        setError(Object.values(fieldErrors).join(" "));
      } else {
        setError(err?.message || "Failed to save template");
      }
    }
  };

  const onToggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const allSelected = useMemo(() => templates.length > 0 && selectedIds.length === templates.length, [templates, selectedIds]);

  const onDelete = async (ids) => {
    if (!ids.length) return;
    const confirmed = window.confirm(`Delete ${ids.length} template(s)?`);
    if (!confirmed) return;

    try {
      setError("");
      setMessage("");
      await reportService.deleteTemplates(ids);
      setSelectedIds([]);
      setMessage("Template(s) deleted successfully.");
      await loadData();
    } catch (err) {
      setError(err?.message || "Failed to delete templates");
    }
  };

  return (
    <div>
      <div className="reporting-actions" style={{ marginBottom: 12 }}>
        <button className="reporting-btn" type="button" onClick={onCreateClick}>
          <Plus size={16} />
          New Template
        </button>
        <button
          className="reporting-btn reporting-btn-danger"
          type="button"
          onClick={() => onDelete(selectedIds)}
          disabled={!selectedCount}
        >
          <Trash2 size={16} />
          Delete Selected ({selectedCount})
        </button>
      </div>

      {message && <div className="reporting-success">{message}</div>}
      {error && <div className="reporting-alert">{error}</div>}

      {showForm && (
        <form className="reporting-panel" onSubmit={onSave}>
          <h3>{editingId ? "Edit Template" : "Create Template"}</h3>
          <div className="reporting-grid reporting-grid-two">
            <div className="reporting-form-field">
              <label>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({ ...prev, title: value }));
                  const error = validateTemplateField('title', value, { ...form, title: value }, filterOptions, templates, editingId, mergedBranches, mergedStatuses);
                  setTemplateFormErrors(prev => ({ ...prev, title: error }));
                }}
                onBlur={(e) => {
                  const error = validateTemplateField('title', e.target.value, form, filterOptions, templates, editingId, mergedBranches, mergedStatuses);
                  setTemplateFormErrors(prev => ({ ...prev, title: error }));
                }}
                placeholder="Template title"
                style={{ borderColor: templateFormErrors.title ? '#dc2626' : '', borderWidth: templateFormErrors.title ? '2px' : '' }}
              />
              {templateFormErrors.title && <div style={{ marginTop: 6, color: '#dc2626', fontSize: '0.85rem' }}>{templateFormErrors.title}</div>}
            </div>
            <div className="reporting-form-field">
              <label>Report Type</label>
              <select
                value={form.type}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({ ...prev, type: value }));
                  const error = validateTemplateField('type', value, { ...form, type: value }, filterOptions, templates, editingId, mergedBranches);
                  setTemplateFormErrors(prev => ({ ...prev, type: error }));
                }}
                onBlur={(e) => {
                  const error = validateTemplateField('type', e.target.value, form, filterOptions, templates, editingId, mergedBranches);
                  setTemplateFormErrors(prev => ({ ...prev, type: error }));
                }}
                style={{ borderColor: templateFormErrors.type ? '#dc2626' : '', borderWidth: templateFormErrors.type ? '2px' : '' }}
              >
                {reportTypeOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              {templateFormErrors.type && <div style={{ marginTop: 6, color: '#dc2626', fontSize: '0.85rem' }}>{templateFormErrors.type}</div>}
            </div>
            <div className="reporting-form-field">
              <label>Branch</label>
              <select
                value={form.filters.branch}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({ ...prev, filters: { ...prev.filters, branch: value } }));
                  const error = validateTemplateField('branch', value, { ...form, filters: { ...form.filters, branch: value } }, filterOptions, templates, editingId, mergedBranches);
                  setTemplateFormErrors(prev => ({ ...prev, branch: error }));
                }}
                onBlur={(e) => {
                  const error = validateTemplateField('branch', e.target.value, form, filterOptions, templates, editingId, mergedBranches);
                  setTemplateFormErrors(prev => ({ ...prev, branch: error }));
                }}
                style={{ borderColor: templateFormErrors.branch ? '#dc2626' : '', borderWidth: templateFormErrors.branch ? '2px' : '' }}
              >
                {mergedBranches.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
              {templateFormErrors.branch && <div style={{ marginTop: 6, color: '#dc2626', fontSize: '0.85rem' }}>{templateFormErrors.branch}</div>}
            </div>
            <div className="reporting-form-field">
              <label>Status</label>
              <select
                value={form.filters.status}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({ ...prev, filters: { ...prev.filters, status: value } }));
                  const error = validateTemplateField('status', value, { ...form, filters: { ...form.filters, status: value } }, filterOptions, templates, editingId, mergedBranches, mergedStatuses);
                  setTemplateFormErrors(prev => ({ ...prev, status: error }));
                }}
                onBlur={(e) => {
                  const error = validateTemplateField('status', e.target.value, form, filterOptions, templates, editingId, mergedBranches, mergedStatuses);
                  setTemplateFormErrors(prev => ({ ...prev, status: error }));
                }}
                style={{ borderColor: templateFormErrors.status ? '#dc2626' : '', borderWidth: templateFormErrors.status ? '2px' : '' }}
              >
                {mergedStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              {templateFormErrors.status && <div style={{ marginTop: 6, color: '#dc2626', fontSize: '0.85rem' }}>{templateFormErrors.status}</div>}
            </div>
            <div className="reporting-form-field">
              <label>Start Date</label>
              <input
                type="date"
                value={form.filters.dateRange.startDate}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    filters: {
                      ...prev.filters,
                      dateRange: { ...prev.filters.dateRange, startDate: value }
                    }
                  }));
                  const error = validateTemplateField('startDate', value, { ...form, filters: { ...form.filters, dateRange: { ...form.filters.dateRange, startDate: value } } }, filterOptions, templates, editingId, mergedBranches);
                  setTemplateFormErrors(prev => ({ ...prev, startDate: error }));
                }}
                onBlur={(e) => {
                  const error = validateTemplateField('startDate', e.target.value, form, filterOptions, templates, editingId, mergedBranches);
                  setTemplateFormErrors(prev => ({ ...prev, startDate: error }));
                }}
                max={getTodayDate()}
                style={{ borderColor: templateFormErrors.startDate ? '#dc2626' : '', borderWidth: templateFormErrors.startDate ? '2px' : '' }}
              />
              {templateFormErrors.startDate && <div style={{ marginTop: 6, color: '#dc2626', fontSize: '0.85rem' }}>{templateFormErrors.startDate}</div>}
            </div>
            <div className="reporting-form-field">
              <label>End Date</label>
              <input
                type="date"
                value={form.filters.dateRange.endDate}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    filters: {
                      ...prev.filters,
                      dateRange: { ...prev.filters.dateRange, endDate: value }
                    }
                  }));
                  const error = validateTemplateField('endDate', value, { ...form, filters: { ...form.filters, dateRange: { ...form.filters.dateRange, endDate: value } } }, filterOptions, templates, editingId, mergedBranches);
                  setTemplateFormErrors(prev => ({ ...prev, endDate: error }));
                }}
                onBlur={(e) => {
                  const error = validateTemplateField('endDate', e.target.value, form, filterOptions, templates, editingId, mergedBranches);
                  setTemplateFormErrors(prev => ({ ...prev, endDate: error }));
                }}
                max={getTodayDate()}
                style={{ borderColor: templateFormErrors.endDate ? '#dc2626' : '', borderWidth: templateFormErrors.endDate ? '2px' : '' }}
              />
              {templateFormErrors.endDate && <div style={{ marginTop: 6, color: '#dc2626', fontSize: '0.85rem' }}>{templateFormErrors.endDate}</div>}
            </div>
          </div>

          <div className="reporting-actions">
            <button
              className="reporting-btn"
              type="submit"
              disabled={Object.values(templateFormErrors).some(e => e)}
            >
              {editingId ? "Update Template" : "Save Template"}
            </button>
            <button className="reporting-btn reporting-btn-secondary" type="button" onClick={resetForm}>
              <X size={16} />
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="reporting-panel">
        <h3>Saved Templates</h3>
        {templates.length === 0 ? (
          <div className="reporting-empty">No report templates yet.</div>
        ) : (
          <div className="reporting-table-wrap">
            <table className="reporting-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => setSelectedIds(e.target.checked ? templates.map((item) => item.id) : [])}
                    />
                  </th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(template.id)}
                        onChange={() => onToggleSelect(template.id)}
                      />
                    </td>
                    <td>{template.title}</td>
                    <td><span className="reporting-badge">{template.type}</span></td>
                    <td>{template.filters?.branch || "All"}</td>
                    <td>{template.filters?.status || "All"}</td>
                    <td>{template.updatedAt ? new Date(template.updatedAt).toLocaleString() : "-"}</td>
                    <td>
                      <div className="reporting-row-actions">
                        <button className="reporting-icon-btn" type="button" onClick={() => onEdit(template)}>
                          <Pencil size={14} />
                        </button>
                        <button className="reporting-icon-btn danger" type="button" onClick={() => onDelete([template.id])}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
