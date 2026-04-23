import client from '../api/client';

// ═══════════════════════════════════════════════════════════
// APPLICANTS API
// ═══════════════════════════════════════════════════════════

export const applicantsApi = {
  // Get all applicants
  list(query) {
    return client.get('/api/applicants', { params: query ? { q: query } : {} })
      .then(r => r.data);
  },

  // Lookup applicant by NIC
  lookupByNic(nic) {
    return client.get(`/api/applicants/lookup/${nic}`)
      .then(r => r.data);
  },

  // Register new applicant (auto calculates credit score)
  register(data) {
    return client.post('/api/applicants/register', data)
      .then(r => r.data);
  },

  // Get applicant by ID
  getById(id) {
    return client.get(`/api/applicants/${id}`)
      .then(r => r.data);
  },

  // Update applicant
  update(id, data) {
    return client.put(`/api/applicants/${id}`, data)
      .then(r => r.data);
  },

  // Delete applicant
  delete(id) {
    return client.delete(`/api/applicants/${id}`)
      .then(r => r.data);
  },
};

// ═══════════════════════════════════════════════════════════
// APPLICATIONS API
// ═══════════════════════════════════════════════════════════

export const applicationsApi = {
  // Get all applications with optional status filter
  list(status) {
    return client.get('/api/applications', { params: status ? { status } : {} })
      .then(r => r.data);
  },

  // Get application by ID
  getById(id) {
    return client.get(`/api/applications/${id}`)
      .then(r => r.data);
  },

  // Get application details (with applicant info)
  getDetails(id) {
    return client.get(`/api/applications/${id}/details`)
      .then(r => r.data);
  },

  // Get applications by applicant ID
  getByApplicant(applicantId) {
    return client.get(`/api/applications/by-applicant/${applicantId}`)
      .then(r => r.data);
  },

  // Create new application
  create(data) {
    return client.post('/api/applications', data)
      .then(r => r.data);
  },

  // Update application
  update(id, data) {
    return client.put(`/api/applications/${id}`, data)
      .then(r => r.data);
  },

  // Delete application
  delete(id) {
    return client.delete(`/api/applications/${id}`)
      .then(r => r.data);
  },

  // Update application status
  updateStatus(id, status, reason = '', actor = 'staff') {
    return client.patch(`/api/applications/${id}/status`, {
      status,
      reason,
      actor,
    }).then(r => r.data);
  },
};

// ═══════════════════════════════════════════════════════════
// CREDIT SCORE API
// ═══════════════════════════════════════════════════════════

export const creditScoreApi = {
  // Get credit score by NIC (from sample data)
  getByNic(nic) {
    return client.get(`/api/credit-score/${nic}`)
      .then(r => r.data);
  },
};

export default { applicantsApi, applicationsApi, creditScoreApi };
