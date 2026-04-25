package com.microfinance.util;

import java.math.BigDecimal;

/**
 * Constants for the repayment module to avoid stringly-typed code
 */
public final class RepaymentConstants {

    private RepaymentConstants() {
        // Utility class - prevent instantiation
    }

    // Business rules
    public static final int GRACE_PERIOD_DAYS = 7;
    public static final BigDecimal LATE_FEE_PERCENTAGE = new BigDecimal("0.05");

    // Default values
    public static final String DEFAULT_RECORDED_BY = "staff";

    // Reference prefixes
    public static final String PAYMENT_REFERENCE_PREFIX = "PAY-";

    // Response message keys
    public static final String RESPONSE_MESSAGE_KEY = "message";

    // API endpoints
    public static final String REPAYMENTS_API_BASE = "/api/repayments";
}