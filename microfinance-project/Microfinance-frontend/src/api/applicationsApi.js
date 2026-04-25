import http from "./http.js";

function toPayload(data) {
  return {
    applicantId:  data.applicantId,
    amount:       Number(data.amount),
    termMonths:   Number(data.termMonths),
    interestRate: data.interestRate,
    purpose:      data.purpose,
    hasCoSigner:  data.hasCoSigner,
    notes:        data.notes || "",
  };
}

export const applicationsApi = {
  /** GET /api/applications?status=... */
  list(status) {
    return http
      .get("/api/applications", { params: status ? { status } : {} })
      .then((r) => r.data);
  },

  /** GET /api/applications/:id */
  get(id) {
    return http.get(`/api/applications/${id}`).then((r) => r.data);
  },

  /**
   * GET /api/applications/:id/details
   * Returns { application: {...}, applicant: {...} }
   */
  details(id) {
    return http.get(`/api/applications/${id}/details`).then((r) => r.data);
  },

  /** GET /api/applications/by-applicant/:applicantId */
  byApplicant(applicantId) {
    return http
      .get(`/api/applications/by-applicant/${applicantId}`)
      .then((r) => r.data);
  },

  /** POST /api/applications */
  create(data) {
    return http.post("/api/applications", toPayload(data)).then((r) => r.data);
  },

  /** PUT /api/applications/:id */
  update(id, data) {
    return http.put(`/api/applications/${id}`, toPayload(data)).then((r) => r.data);
  },

  /** DELETE /api/applications/:id */
  delete(id) {
    return http.delete(`/api/applications/${id}`).then((r) => r.data);
  },

  /**
   * PATCH /api/applications/:id/status
   * Body: { status, reason, actor, cancelReason?, note? }
   */
  updateStatus(id, status, reason = "", actor = "staff") {
    return http
      .patch(`/api/applications/${id}/status`, { status, reason, actor })
      .then((r) => r.data);
  },
};