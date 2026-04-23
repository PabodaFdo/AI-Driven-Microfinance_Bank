package com.microfinance.util;

public class NICValidator {

    /**
     * Validates NIC format for both old and new Sri Lankan NIC formats
     * Old format: 9 digits + V only (e.g., 645276696V)
     * New format: 12 digits (e.g., 200112345678)
     * Note: X endings are not supported
     *
     * @param nic the NIC to validate
     * @return true if valid format, false otherwise
     */
    public static boolean isValidNIC(String nic) {
        if (nic == null || nic.trim().isEmpty()) {
            return false;
        }

        String cleanNic = nic.trim().toUpperCase();

        // Check old format: 9 digits + V only (no X)
        if (cleanNic.matches("\\d{9}V")) {
            return true;
        }

        // Check new format: 12 digits
        if (cleanNic.matches("\\d{12}")) {
            return true;
        }

        return false;
    }

    /**
     * Normalizes NIC by trimming and converting to uppercase
     *
     * @param nic the NIC to normalize
     * @return normalized NIC
     */
    public static String normalizeNIC(String nic) {
        if (nic == null) {
            return null;
        }
        return nic.trim().toUpperCase();
    }

    /**
     * Get NIC format type for logging/debugging
     *
     * @param nic the NIC to check
     * @return format description
     */
    public static String getNICFormat(String nic) {
        if (!isValidNIC(nic)) {
            return "Invalid";
        }

        String cleanNic = nic.trim().toUpperCase();

        if (cleanNic.matches("\\d{9}V")) {
            return "Old Format (9 digits + V)";
        } else if (cleanNic.matches("\\d{12}")) {
            return "New Format (12 digits)";
        }

        return "Unknown";
    }
}