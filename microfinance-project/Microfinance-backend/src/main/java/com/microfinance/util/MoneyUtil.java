package com.microfinance.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Utility class for consistent money/currency operations using BigDecimal
 */
public final class MoneyUtil {

    public static final RoundingMode DEFAULT_ROUNDING = RoundingMode.HALF_UP;
    public static final int CURRENCY_SCALE = 2;

    private MoneyUtil() {
        // Utility class - prevent instantiation
    }

    /**
     * Normalizes a BigDecimal to standard currency format (2 decimal places, HALF_UP rounding)
     */
    public static BigDecimal normalize(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(CURRENCY_SCALE, DEFAULT_ROUNDING);
        }
        return value.setScale(CURRENCY_SCALE, DEFAULT_ROUNDING);
    }

    /**
     * Converts Double to normalized BigDecimal for currency operations
     */
    public static BigDecimal fromDouble(Double value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(CURRENCY_SCALE, DEFAULT_ROUNDING);
        }
        return BigDecimal.valueOf(value).setScale(CURRENCY_SCALE, DEFAULT_ROUNDING);
    }

    /**
     * Checks if a BigDecimal value is zero (accounting for scale)
     */
    public static boolean isZero(BigDecimal value) {
        return normalize(value).compareTo(BigDecimal.ZERO) == 0;
    }

    /**
     * Checks if a BigDecimal value is positive (greater than zero)
     */
    public static boolean isPositive(BigDecimal value) {
        return normalize(value).compareTo(BigDecimal.ZERO) > 0;
    }

    /**
     * Checks if a BigDecimal value is negative (less than zero)
     */
    public static boolean isNegative(BigDecimal value) {
        return normalize(value).compareTo(BigDecimal.ZERO) < 0;
    }

    /**
     * Safely adds two BigDecimal values, treating nulls as zero
     */
    public static BigDecimal add(BigDecimal a, BigDecimal b) {
        return normalize(normalize(a).add(normalize(b)));
    }

    /**
     * Safely subtracts second value from first, treating nulls as zero
     */
    public static BigDecimal subtract(BigDecimal a, BigDecimal b) {
        return normalize(normalize(a).subtract(normalize(b)));
    }

    /**
     * Safely multiplies two BigDecimal values, treating nulls as zero
     */
    public static BigDecimal multiply(BigDecimal a, BigDecimal b) {
        return normalize(normalize(a).multiply(normalize(b)));
    }
}