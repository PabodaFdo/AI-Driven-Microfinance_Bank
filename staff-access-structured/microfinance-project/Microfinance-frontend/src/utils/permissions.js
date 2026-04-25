export const ROLES = {
  ADMIN: 'ADMIN',
  LOAN_OFFICER: 'LOAN_OFFICER',
  BANK_MANAGER: 'BANK_MANAGER',
};

export function normalizeRole(rawRole) {
  if (!rawRole) return ROLES.LOAN_OFFICER;
  const value = String(rawRole).trim().toUpperCase().replace(/^ROLE_/, '');

  if (value === 'ADMIN') return ROLES.ADMIN;
  if (value === 'OFFICER' || value === 'LOAN_OFFICER') return ROLES.LOAN_OFFICER;
  if (value === 'MANAGER' || value === 'BANK_MANAGER' || value === 'BRANCH_MANAGER') return ROLES.BANK_MANAGER;
  return ROLES.LOAN_OFFICER;
}

export function hasAnyRole(role, allowedRoles = []) {
  const normalized = normalizeRole(role);
  return allowedRoles.map(normalizeRole).includes(normalized);
}

export function formatRoleLabel(role) {
  const normalized = normalizeRole(role);
  if (normalized === ROLES.ADMIN) return 'Admin';
  if (normalized === ROLES.BANK_MANAGER) return 'Bank Manager';
  return 'Loan Officer';
}

export function canAccessDashboard(role) {
  return hasAnyRole(role, [ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER]);
}

export function canManageApplicants(role) {
  return hasAnyRole(role, [ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER]);
}

export function canManageApplications(role) {
  return hasAnyRole(role, [ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER]);
}

export function canRunRiskAndRecommendation(role) {
  return hasAnyRole(role, [ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER]);
}

export function canHandleRepayments(role) {
  return hasAnyRole(role, [ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER]);
}

export function canViewReports(role) {
  return hasAnyRole(role, [ROLES.ADMIN, ROLES.LOAN_OFFICER, ROLES.BANK_MANAGER]);
}

export function canMakeApplicationDecision(role) {
  return hasAnyRole(role, [ROLES.ADMIN, ROLES.BANK_MANAGER]);
}

export function canManageStaff(role) {
  return hasAnyRole(role, [ROLES.ADMIN]);
}

export function validateStatusChangeByRole(role, nextStatusRaw) {
  const nextStatus = String(nextStatusRaw || '').toUpperCase();
  const isDecision = ['APPROVED', 'REJECTED', 'CANCELLED'].includes(nextStatus);
  if (isDecision && !canMakeApplicationDecision(role)) {
    return {
      allowed: false,
      message: 'Only ADMIN or BANK_MANAGER can approve, reject, or cancel applications.',
    };
  }
  if (!isDecision && !canManageApplications(role)) {
    return {
      allowed: false,
      message: 'Only ADMIN, LOAN_OFFICER, or BANK_MANAGER can change application status.',
    };
  }
  return { allowed: true, message: '' };
}

// Backward-compatible aliases used by existing pages
export const canCreateEditSubmitApplications = canManageApplications;
export const canManageRiskAndRecommendation = canRunRiskAndRecommendation;
export const canApproveReject = canMakeApplicationDecision;
export const canAccessRepayment = canHandleRepayments;
export const canViewGenerateReports = canViewReports;
export const canUseReportTemplates = canViewReports;
export const canManageReportTemplates = canMakeApplicationDecision;
