import client from '../api/client';

// ═══════════════════════════════════════════════════════════
// RECOMMENDATIONS API
// ═══════════════════════════════════════════════════════════

export const recommendationsApi = {

  // ═══════════════════════════════════════════════════════════
  // CREATE OPERATIONS (Existing)
  // ═══════════════════════════════════════════════════════════

  // Generate recommendation for an application
  generateRecommendation(applicationId, config = {}) {
    if (!applicationId || applicationId.trim() === '') {
      throw new Error('Application ID is required');
    }
    return client.post(`/api/recommendations/generate/${applicationId}`, null, config)
      .then(r => r.data);
  },

  // Recalculate recommendation with updated data
  recalculateRecommendation(applicationId, config = {}) {
    if (!applicationId || applicationId.trim() === '') {
      throw new Error('Application ID is required');
    }
    return client.post(`/api/recommendations/recalculate/${applicationId}`, null, config)
      .then(r => r.data);
  },

  // ═══════════════════════════════════════════════════════════
  // READ OPERATIONS (Existing)
  // ═══════════════════════════════════════════════════════════

  // Get latest recommendation by application ID
  getLatestRecommendationByApplication(applicationId, config = {}) {
    if (!applicationId || applicationId.trim() === '') {
      throw new Error('Application ID is required');
    }
    return client.get(`/api/recommendations/by-application/${applicationId}`, config)
      .then(r => r.data);
  },

  // Get recommendation by ID
  getRecommendationById(id, config = {}) {
    if (!id || id.trim() === '') {
      throw new Error('Recommendation ID is required');
    }
    return client.get(`/api/recommendations/${id}`, config)
      .then(r => r.data);
  },

  // ═══════════════════════════════════════════════════════════
  // UPDATE OPERATIONS (New)
  // ═══════════════════════════════════════════════════════════

  // Update recommendation (full update)
  updateRecommendation(id, payload) {
    if (!id || id.trim() === '') {
      throw new Error('Recommendation ID is required');
    }
    if (!payload) {
      throw new Error('Update payload is required');
    }
    return client.put(`/api/recommendations/${id}`, payload)
      .then(r => r.data)
      .catch(error => {
        throw error; // Re-throw to let caller handle
      });
  },

  // Patch recommendation (partial update)
  patchRecommendation(id, payload) {
    if (!id || id.trim() === '') {
      throw new Error('Recommendation ID is required');
    }
    if (!payload || Object.keys(payload).length === 0) {
      throw new Error('Patch payload with at least one field is required');
    }
    return client.patch(`/api/recommendations/${id}`, payload)
      .then(r => r.data)
      .catch(error => {
        throw error; // Re-throw to let caller handle
      });
  },

  // ═══════════════════════════════════════════════════════════
  // DELETE OPERATIONS (New)
  // ═══════════════════════════════════════════════════════════

  // Archive recommendation (soft delete)
  archiveRecommendation(id, payload) {
    if (!id || id.trim() === '') {
      throw new Error('Recommendation ID is required');
    }
    if (!payload || !payload.archiveReason || payload.archiveReason.trim() === '') {
      throw new Error('Archive reason is required');
    }
    if (!payload.archivedBy || payload.archivedBy.trim() === '') {
      throw new Error('Archived by is required');
    }
    return client.patch(`/api/recommendations/${id}/archive`, payload)
      .then(r => r.data)
      .catch(error => {
        throw error; // Re-throw to let caller handle
      });
  },

  // Delete recommendation (permanent delete)
  deleteRecommendation(id) {
    if (!id || id.trim() === '') {
      throw new Error('Recommendation ID is required');
    }
    return client.delete(`/api/recommendations/${id}`)
      .then(r => r.data)
      .catch(error => {
        throw error; // Re-throw to let caller handle
      });
  },
};

// Named exports for direct use
export const generateRecommendation = recommendationsApi.generateRecommendation;
export const recalculateRecommendation = recommendationsApi.recalculateRecommendation;
export const getLatestRecommendationByApplication = recommendationsApi.getLatestRecommendationByApplication;
export const getRecommendationById = recommendationsApi.getRecommendationById;
export const updateRecommendation = recommendationsApi.updateRecommendation;
export const patchRecommendation = recommendationsApi.patchRecommendation;
export const archiveRecommendation = recommendationsApi.archiveRecommendation;
export const deleteRecommendation = recommendationsApi.deleteRecommendation;

export default { recommendationsApi };