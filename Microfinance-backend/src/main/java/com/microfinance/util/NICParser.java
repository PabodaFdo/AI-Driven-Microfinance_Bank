package com.microfinance.util;

import java.time.LocalDate;
import java.time.Period;
import java.time.Year;
import java.time.temporal.ChronoUnit;

/**
 * Utility to extract birth date and age from Sri Lankan NIC
 * Supports both old format (9V) and new format (12 digit)
 */
public class NICParser {

    /**
     * Extract age from NIC
     * @param nic Sri Lankan NIC (e.g., "123456789V" or "123456789012")
     * @return age in years, or null if NIC format invalid or age cannot be derived
     */
    public static Integer extractAge(String nic) {
        LocalDate birthDate = extractBirthDate(nic);
        if (birthDate == null) {
            return null;
        }
        return (int) ChronoUnit.YEARS.between(birthDate, LocalDate.now());
    }

    /**
     * Extract birth date from NIC
     * @param nic Sri Lankan NIC
     * @return LocalDate or null if invalid
     */
    public static LocalDate extractBirthDate(String nic) {
        if (nic == null || nic.isBlank()) {
            return null;
        }

        String nicClean = nic.toUpperCase().replaceAll("[^0-9XV]", "");

        // Old format: 9 digits + V/X (e.g., "123456789V")
        if (nicClean.length() == 10 && (nicClean.endsWith("V") || nicClean.endsWith("X"))) {
            return parseOldFormatNIC(nicClean.substring(0, 9));
        }

        // New format: 12 digits (e.g., "123456789012")
        if (nicClean.length() == 12 && nicClean.matches("\\d{12}")) {
            return parseNewFormatNIC(nicClean);
        }

        // Invalid format
        return null;
    }

    /**
     * Parse old format NIC (YYMMDD + 3-digit day code)
     * Used before 2016
     */
    private static LocalDate parseOldFormatNIC(String nicDigits) {
        try {
            // Extract year and day code
            int year = Integer.parseInt(nicDigits.substring(0, 2));
            int dayCode = Integer.parseInt(nicDigits.substring(2, 5));

            // Adjust year: 00-30 → 2000-2030, 31-99 → 1931-1999
            int fullYear = year <= 30 ? 2000 + year : 1900 + year;

            // Adjust day if > 500 (gender code for females)
            int dayOfYear = dayCode > 500 ? dayCode - 500 : dayCode;

            // Validate day-of-year range
            int maxDay = Year.isLeap(fullYear) ? 366 : 365;
            if (dayOfYear < 1 || dayOfYear > maxDay) {
                return null;
            }

            // Convert day-of-year to LocalDate
            LocalDate birthDate = LocalDate.ofYearDay(fullYear, dayOfYear);

            return birthDate;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Parse new format NIC (YYYYDDD + 3-digit serial/gender code)
     * Format: YYYYDDDSSSGGG (Year + Day-of-year + Serial + Gender)
     * Used from 2016 onwards
     */
    private static LocalDate parseNewFormatNIC(String nicDigits) {
        try {
            // Extract components
            int year = Integer.parseInt(nicDigits.substring(0, 4));      // YYYY
            int dayCode = Integer.parseInt(nicDigits.substring(4, 7));   // DDD (day-of-year)

            // Adjust day if > 500 (gender code for females)
            int dayOfYear = dayCode > 500 ? dayCode - 500 : dayCode;

            // Validate day-of-year range
            int maxDay = java.time.Year.isLeap(year) ? 366 : 365;
            if (dayOfYear < 1 || dayOfYear > maxDay) {
                return null;
            }

            // Convert day-of-year to LocalDate
            LocalDate birthDate = LocalDate.ofYearDay(year, dayOfYear);

            // Sanity check: birth year should not be in future
            if (year > LocalDate.now().getYear()) {
                return null;
            }

            return birthDate;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Format check without parsing
     * Returns true if NIC format looks valid
     */
    public static boolean isValidFormat(String nic) {
        if (nic == null || nic.isBlank()) {
            return false;
        }
        String nicClean = nic.toUpperCase().replaceAll("[^0-9XV]", "");
        return (nicClean.length() == 10 && (nicClean.endsWith("V") || nicClean.endsWith("X")))
                || (nicClean.length() == 12 && nicClean.matches("\\d{12}"));
    }
}
