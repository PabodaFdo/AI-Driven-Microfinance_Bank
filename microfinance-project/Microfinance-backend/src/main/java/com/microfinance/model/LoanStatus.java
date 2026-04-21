package com.microfinance.model;

public enum LoanStatus {
    DRAFT,           // Initial state - can be edited
    SUBMITTED,       // Submitted for review - cannot be edited
    RETURNED,        // Returned for corrections - can be edited
    PENDING,         // Under review
    REVIEW,          // In active review
    APPROVED,        // Final approval
    REJECTED,        // Final rejection
    CANCELLED        // Cancelled by user/admin
}