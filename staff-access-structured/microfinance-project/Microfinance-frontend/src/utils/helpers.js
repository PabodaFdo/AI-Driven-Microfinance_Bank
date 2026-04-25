// Currency formatting for Sri Lankan Rupees
export const formatCurrency = (amount) => {
  if (amount == null) return 'N/A';

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Date formatting
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';

  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';

  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Risk level color helpers
export const getRiskColor = (riskLevel) => {
  const colors = {
    Low: '#059669',    // Green
    Medium: '#D97706', // Orange
    High: '#DC2626',   // Red
  };
  return colors[riskLevel] || '#6B7280';
};

export const getRiskBgColor = (riskLevel) => {
  const colors = {
    Low: '#D1FAE5',    // Light green
    Medium: '#FEF3C7', // Light orange
    High: '#FEE2E2',   // Light red
  };
  return colors[riskLevel] || '#F3F4F6';
};

// Credit score color based on value
export const getCreditScoreColor = (score) => {
  if (score >= 750) return '#059669'; // Green
  if (score >= 600) return '#D97706'; // Orange
  return '#DC2626'; // Red
};

// Status color helpers
export const getStatusColor = (status) => {
  const colors = {
    PENDING: '#D97706',
    REVIEW: '#1358FF',
    APPROVED: '#059669',
    REJECTED: '#DC2626',
    CANCELLED: '#6B7280',
  };
  return colors[status] || '#6B7280';
};

export const getStatusBgColor = (status) => {
  const colors = {
    PENDING: '#FEF3C7',
    REVIEW: '#EEF2FF',
    APPROVED: '#D1FAE5',
    REJECTED: '#FEE2E2',
    CANCELLED: '#F3F4F6',
  };
  return colors[status] || '#F3F4F6';
};

// NIC validation
export const validateNIC = (nic) => {
  if (!nic || typeof nic !== 'string') return false;

  const cleanNic = nic.trim().toUpperCase();

  // Old format: 9 digits + V
  if (cleanNic.match(/^\d{9}V$/)) return true;

  // New format: 12 digits
  if (cleanNic.match(/^\d{12}$/)) return true;

  return false;
};

// Generate initials from name
export const getInitials = (name) => {
  if (!name) return '?';

  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

// Calculate statistics from arrays
export const calculateStats = (items, getValueFn) => {
  if (!items || items.length === 0) return { min: 0, max: 0, avg: 0, sum: 0 };

  const values = items.map(getValueFn).filter(v => v != null && !isNaN(v));

  if (values.length === 0) return { min: 0, max: 0, avg: 0, sum: 0 };

  const sum = values.reduce((acc, val) => acc + val, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return { min, max, avg: Math.round(avg), sum };
};

// Debounce function for search inputs
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export default {
  formatCurrency,
  formatDate,
  formatDateTime,
  getRiskColor,
  getRiskBgColor,
  getCreditScoreColor,
  getStatusColor,
  getStatusBgColor,
  validateNIC,
  getInitials,
  calculateStats,
  debounce,
};