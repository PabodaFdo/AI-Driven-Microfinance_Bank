import client from '../api/client';

// ═══════════════════════════════════════════════════════════
// RISK ASSESSMENTS API
// ═══════════════════════════════════════════════════════════

export const riskAssessmentsApi = {
  // Run risk assessment for an application
  runRiskAssessment(applicationId, config = {}) {
    if (!applicationId || applicationId.trim() === '') {
      throw new Error('Application ID is required');
    }
    return client.post(`/api/risk-assessments/run/${applicationId}`, null, config)
      .then(r => r.data);
  },

  // Get latest risk assessment by application ID
  getLatestRiskAssessmentByApplication(applicationId, config = {}) {
    if (!applicationId || applicationId.trim() === '') {
      throw new Error('Application ID is required');
    }
    return client.get(`/api/risk-assessments/by-application/${applicationId}`, config)
      .then(r => r.data);
  },

  // Get risk assessment by ID
  getRiskAssessmentById(id, config = {}) {
    if (!id || id.trim() === '') {
      throw new Error('Risk assessment ID is required');
    }
    return client.get(`/api/risk-assessments/${id}`, config)
      .then(r => r.data);
  },

  // Delete risk assessment by ID
  deleteRiskAssessment(id) {
    if (!id || id.trim() === '') {
      throw new Error('Risk assessment ID is required');
    }
    return client.delete(`/api/risk-assessments/${id}`)
      .then(() => true);
  },
};

// Named exports
export const runRiskAssessment = riskAssessmentsApi.runRiskAssessment;
export const getLatestRiskAssessmentByApplication = riskAssessmentsApi.getLatestRiskAssessmentByApplication;
export const getRiskAssessmentById = riskAssessmentsApi.getRiskAssessmentById;
export const deleteRiskAssessment = riskAssessmentsApi.deleteRiskAssessment;

export default { riskAssessmentsApi };