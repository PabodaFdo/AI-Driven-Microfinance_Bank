import http from "./http.js";

function toPayload(data) {
  const num   = (v, def = 0) => (v === "" || v == null) ? def : Number(v);
  const numNullable = (v)    => (v === "" || v == null) ? null : Number(v);
  const bool  = (v)          =>
    v === true  || v === "true"  || v === "YES" ? true  :
    v === false || v === "false" || v === "NO"  ? false : null;

  return {
    fullName:               data.fullName,
    nic:                    data.nic,
    phone:                  data.phone,
    email:                  data.email,
    address:                data.address  || "",
    branch:                 data.branch,
    jobType:                data.jobType,
    monthlyIncome:          num(data.monthlyIncome),
    existingLoans:          num(data.existingLoans),
    dependents:             num(data.dependents),
    employmentStatus:       data.employmentStatus,
    employmentLengthMonths: num(data.employmentLengthMonths),
    monthlyDebtPayment:     num(data.monthlyDebtPayment),
    housingCost:            num(data.housingCost),
    hasMortgage:            data.hasMortgage,
    maritalStatus:          data.maritalStatus || null,
    // REMOVED: creditScore - Backend calculates this, NOT sent from frontend
    // REMOVED: previousDefaults - No longer in backend model
    // REMOVED: creditLines - No longer in backend model
  };
}

function toRegistrationPayload(data) {
  const num = (v, def = 0) => (v === "" || v == null) ? def : Number(v);
  const bool = (v) =>
    v === true || v === "true" || v === "YES" ? true :
    v === false || v === "false" || v === "NO" ? false : v;

  return {
    fullName: data.fullName,
    nic: data.nic,
    phone: data.phone,
    email: data.email,
    address: data.address || "",
    branch: data.branch,
    jobType: data.jobType,
    monthlyIncome: num(data.monthlyIncome),
    existingLoans: num(data.existingLoans),
    dependents: num(data.dependents),
    employmentStatus: data.employmentStatus,
    employmentLengthMonths: num(data.employmentLengthMonths),
    monthlyDebtPayment: num(data.monthlyDebtPayment),
    housingCost: num(data.housingCost),
    hasMortgage: data.hasMortgage,
    maritalStatus: data.maritalStatus || null,
    // REMOVED: previousDefaults - No longer in backend model
    // REMOVED: creditLines - No longer in backend model
  };
}

// ── New Workflow API Functions ──────────────────────────────

/** GET /api/applicants/lookup/{nic} - Look up applicant by NIC */
export function lookupApplicantByNic(nic) {
  return http.get(`/api/applicants/lookup/${nic.trim()}`).then((r) => r.data);
}

/** POST /api/applicants/register - Register new applicant with auto credit score */
export function registerNewApplicant(data) {
  return http.post("/api/applicants/register", toRegistrationPayload(data)).then((r) => r.data);
}

// ── Original API Functions ──────────────────────────────────

/** POST /api/applicants */
export function createApplicant(data) {
  return http.post("/api/applicants", toPayload(data)).then((r) => r.data);
}

/** GET /api/applicants?q= */
export function getApplicants(q) {
  return http
    .get("/api/applicants", { params: q && q.trim() ? { q: q.trim() } : {} })
    .then((r) => r.data);
}

/** GET /api/applicants/:id */
export function getApplicantById(id) {
  return http.get(`/api/applicants/${id}`).then((r) => r.data);
}

/** GET /api/applicants/search?nic=<nic>  — exact NIC match */
export function searchApplicantByNIC(nic) {
  return http
    .get("/api/applicants/search", { params: { nic: nic.trim() } })
    .then((r) => r.data);
}

/** PUT /api/applicants/:id */
export function updateApplicant(id, data) {
  return http.put(`/api/applicants/${id}`, toPayload(data)).then((r) => r.data);
}

/** DELETE /api/applicants/:id */
export function deleteApplicant(id) {
  return http.delete(`/api/applicants/${id}`).then((r) => r.data);
}

export const applicantsApi = {
  // New workflow functions
  lookupByNic: (nic) => lookupApplicantByNic(nic),
  register: (data) => registerNewApplicant(data),

  // Original functions
  /** GET /api/applicants?q=... */
  list: (q) => getApplicants(q),

  /** GET /api/applicants/:id */
  get: (id) => getApplicantById(id),

  /** GET /api/applicants/search?nic=... */
  searchByNIC: (nic) => searchApplicantByNIC(nic),

  /** POST /api/applicants */
  create: (data) => createApplicant(data),

  /** PUT /api/applicants/:id */
  update: (id, data) => updateApplicant(id, data),

  /** DELETE /api/applicants/:id */
  delete: (id) => deleteApplicant(id),
};