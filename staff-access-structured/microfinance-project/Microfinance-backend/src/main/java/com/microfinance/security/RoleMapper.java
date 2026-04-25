package com.microfinance.security;

public final class RoleMapper {

    public static final String ADMIN = "ADMIN";
    public static final String LOAN_OFFICER = "LOAN_OFFICER";
    public static final String BANK_MANAGER = "BANK_MANAGER";

    private RoleMapper() {
    }

    public static String normalize(String rawRole) {
        if (rawRole == null || rawRole.isBlank()) {
            return LOAN_OFFICER;
        }

        String value = rawRole.trim().toUpperCase();
        if (value.startsWith("ROLE_")) {
            value = value.substring(5);
        }

        return switch (value) {
            case "ADMIN" -> ADMIN;
            case "OFFICER", "LOAN_OFFICER" -> LOAN_OFFICER;
            case "MANAGER", "BANK_MANAGER", "BRANCH_MANAGER" -> BANK_MANAGER; // CHANGED: normalize branch manager alias
            default -> LOAN_OFFICER;
        };
    }

    public static boolean isAdmin(String role) {
        return ADMIN.equals(normalize(role));
    }

    public static boolean isLoanOfficer(String role) {
        return LOAN_OFFICER.equals(normalize(role));
    }

    public static boolean isBankManager(String role) {
        return BANK_MANAGER.equals(normalize(role));
    }

    // CHANGED: ADMIN-only staff management helper
    public static boolean canManageStaff(String role) {
        return isAdmin(role);
    }

    // CHANGED: common operational access for applicants/applications/risk/recommendation/repayments/reports/dashboard
    public static boolean canRunOperationalModules(String role) {
        String normalized = normalize(role);
        return ADMIN.equals(normalized)
                || LOAN_OFFICER.equals(normalized)
                || BANK_MANAGER.equals(normalized);
    }

    // CHANGED: risk & recommendation must include LOAN_OFFICER
    public static boolean canRunRiskAndRecommendation(String role) {
        String normalized = normalize(role);
        return ADMIN.equals(normalized)
                || LOAN_OFFICER.equals(normalized)
                || BANK_MANAGER.equals(normalized);
    }

    // CHANGED: final application decisions restricted to ADMIN/BANK_MANAGER
    public static boolean canMakeApplicationDecision(String role) {
        String normalized = normalize(role);
        return ADMIN.equals(normalized) || BANK_MANAGER.equals(normalized);
    }
}
