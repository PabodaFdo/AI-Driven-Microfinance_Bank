import client from '../api/client';

// ═══════════════════════════════════════════════════════════
// REPAYMENT API WITH VALIDATION
// ═══════════════════════════════════════════════════════════

export const repaymentApi = {
  generateRepaymentSchedule(applicationId) {
    if (!applicationId || typeof applicationId !== 'string' || applicationId.trim() === '') {
      return Promise.reject(new Error('Application ID is required and must be a non-empty string'));
    }
    return client.post(`/api/repayments/${applicationId.trim()}/generate`)
      .then(r => r.data);
  },

  getRepaymentSchedule(applicationId) {
    if (!applicationId || typeof applicationId !== 'string' || applicationId.trim() === '') {
      return Promise.reject(new Error('Application ID is required and must be a non-empty string'));
    }
    return client.get(`/api/repayments/${applicationId.trim()}`)
      .then(r => r.data);
  },

  getPaymentHistory(applicationId, page = 0, size = 20) {
    if (!applicationId || typeof applicationId !== 'string' || applicationId.trim() === '') {
      return Promise.reject(new Error('Application ID is required and must be a non-empty string'));
    }
    if (typeof page !== 'number' || page < 0) {
      page = 0;
    }
    if (typeof size !== 'number' || size < 1) {
      size = 20;
    }
    return client.get(`/api/repayments/${applicationId.trim()}/history?page=${page}&size=${size}`)
      .then(r => r.data);
  },

  recordRepaymentPayment(payload) {
    if (!payload || typeof payload !== 'object') {
      return Promise.reject(new Error('Payment request payload is required and must be an object'));
    }
    if (!payload.applicationId || typeof payload.applicationId !== 'string' || payload.applicationId.trim() === '') {
      return Promise.reject(new Error('Application ID is required in payment request'));
    }
    if (payload.installmentNumber === undefined || payload.installmentNumber === null) {
      return Promise.reject(new Error('Installment number is required in payment request'));
    }
    if (!payload.amountPaid || isNaN(Number(payload.amountPaid)) || Number(payload.amountPaid) <= 0) {
      return Promise.reject(new Error('Payment amount must be a positive number'));
    }
    return client.post('/api/repayments/payments', payload)
      .then(r => r.data);
  },

  getOverdueRepayments(page = 0, size = 20) {
    if (typeof page !== 'number' || page < 0) {
      page = 0;
    }
    if (typeof size !== 'number' || size < 1) {
      size = 20;
    }
    return client.get(`/api/repayments/overdue?page=${page}&size=${size}`)
      .then(r => r.data);
  },

  processOverdues(applicationId) {
    if (!applicationId || typeof applicationId !== 'string' || applicationId.trim() === '') {
      return Promise.reject(new Error('Application ID is required and must be a non-empty string'));
    }
    return client.post(`/api/repayments/${applicationId.trim()}/process-overdues`)
      .then(r => r.data);
  },

  closeRepaymentSchedule(applicationId) {
    if (!applicationId || typeof applicationId !== 'string' || applicationId.trim() === '') {
      return Promise.reject(new Error('Application ID is required and must be a non-empty string'));
    }
    return client.post(`/api/repayments/${applicationId.trim()}/close`)
      .then(r => r.data);
  },

  updateRepaymentPayment(paymentId, payload) {
    if (!paymentId || typeof paymentId !== 'string' || paymentId.trim() === '') {
      return Promise.reject(new Error('Payment ID is required and must be a non-empty string'));
    }
    if (!payload || typeof payload !== 'object') {
      return Promise.reject(new Error('Payment request payload is required and must be an object'));
    }
    if (!payload.amountPaid || isNaN(Number(payload.amountPaid)) || Number(payload.amountPaid) <= 0) {
      return Promise.reject(new Error('Payment amount must be a positive number'));
    }
    return client.put(`/api/repayments/payments/${paymentId.trim()}`, payload)
      .then(r => r.data);
  },

  deleteRepaymentPayment(paymentId) {
    if (!paymentId || typeof paymentId !== 'string' || paymentId.trim() === '') {
      return Promise.reject(new Error('Payment ID is required and must be a non-empty string'));
    }
    return client.delete(`/api/repayments/payments/${paymentId.trim()}`)
      .then(r => r.data);
  },

  voidRepaymentPayment(paymentId, payload) {
    if (!paymentId || typeof paymentId !== 'string' || paymentId.trim() === '') {
      return Promise.reject(new Error('Payment ID is required and must be a non-empty string'));
    }
    if (!payload || typeof payload !== 'object') {
      return Promise.reject(new Error('Void request payload is required and must be an object'));
    }
    if (!payload.voidedBy || typeof payload.voidedBy !== 'string' || payload.voidedBy.trim() === '') {
      return Promise.reject(new Error('Voided by is required in void request'));
    }
    if (!payload.voidReason || typeof payload.voidReason !== 'string' || payload.voidReason.trim() === '') {
      return Promise.reject(new Error('Void reason is required in void request'));
    }
    return client.post(`/api/repayments/payments/${paymentId.trim()}/void`, payload)
      .then(r => r.data);
  },
};

export const generateRepaymentSchedule = repaymentApi.generateRepaymentSchedule;
export const getRepaymentSchedule = repaymentApi.getRepaymentSchedule;
export const getPaymentHistory = repaymentApi.getPaymentHistory;
export const recordRepaymentPayment = repaymentApi.recordRepaymentPayment;
export const voidRepaymentPayment = repaymentApi.voidRepaymentPayment;
export const getOverdueRepayments = repaymentApi.getOverdueRepayments;
export const processOverdues = repaymentApi.processOverdues;
export const closeRepaymentSchedule = repaymentApi.closeRepaymentSchedule;

export default { repaymentApi };