import client from "../api/client";

const VALID_REPORT_TYPES = ["general", "defaults", "approvals", "repayment_performance"];

export const reportService = {
  async getDashboardAnalytics() {
    const { data } = await client.get("/api/reports/dashboard");
    return data;
  },

  async generateReport(params = {}) {
    // Client-side validation
    if (params.type && !VALID_REPORT_TYPES.includes(params.type)) {
      throw new Error("Invalid report type");
    }

    if (params.startDate && params.endDate) {
      const startDate = new Date(params.startDate);
      const endDate = new Date(params.endDate);
      if (startDate > endDate) {
        throw new Error("Start date cannot be after end date");
      }
    }

    const { data } = await client.get("/api/reports/generate", { params });
    return data;
  },

  async getTemplates() {
    const { data } = await client.get("/api/reports/templates");
    return data;
  },

  async createTemplate(payload) {
    // Validate payload exists
    if (!payload) {
      throw new Error("Template payload is required");
    }

    // Validate title
    const title = String(payload.title ?? '').trim();
    if (!title) {
      throw new Error("Title is required");
    }
    if (title.length < 3) {
      throw new Error("Title must be at least 3 characters");
    }
    if (title.length > 100) {
      throw new Error("Title cannot exceed 100 characters");
    }

    // Validate type
    if (!VALID_REPORT_TYPES.includes(payload.type)) {
      throw new Error("Invalid report type");
    }

    // Validate date range if provided
    if (payload.filters?.dateRange?.startDate && payload.filters?.dateRange?.endDate) {
      const startDate = new Date(payload.filters.dateRange.startDate);
      const endDate = new Date(payload.filters.dateRange.endDate);
      if (startDate > endDate) {
        throw new Error("Start date cannot be after end date");
      }
    }

    const { data } = await client.post("/api/reports/templates", payload);
    return data;
  },

  async updateTemplate(id, payload) {
    // Validate id
    if (!id || String(id).trim() === '') {
      throw new Error("Template ID is required");
    }

    // Validate payload exists
    if (!payload) {
      throw new Error("Template payload is required");
    }

    // Validate title
    const title = String(payload.title ?? '').trim();
    if (!title) {
      throw new Error("Title is required");
    }
    if (title.length < 3) {
      throw new Error("Title must be at least 3 characters");
    }
    if (title.length > 100) {
      throw new Error("Title cannot exceed 100 characters");
    }

    // Validate type
    if (!VALID_REPORT_TYPES.includes(payload.type)) {
      throw new Error("Invalid report type");
    }

    // Validate date range if provided
    if (payload.filters?.dateRange?.startDate && payload.filters?.dateRange?.endDate) {
      const startDate = new Date(payload.filters.dateRange.startDate);
      const endDate = new Date(payload.filters.dateRange.endDate);
      if (startDate > endDate) {
        throw new Error("Start date cannot be after end date");
      }
    }

    const { data } = await client.put(`/api/reports/templates/${id}`, payload);
    return data;
  },

  async deleteTemplates(ids) {
    // Validate ids is a non-empty array
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("At least one template ID is required");
    }

    // Validate all ids are non-blank strings
    const invalidIds = ids.filter(id => !id || String(id).trim() === '');
    if (invalidIds.length > 0) {
      throw new Error("All template IDs must be non-empty strings");
    }

    const { data } = await client.delete("/api/reports/templates", { data: { ids } });
    return data;
  },

  async getFilterOptions() {
    const { data } = await client.get("/api/reports/filter-options");
    return data;
  }
};
