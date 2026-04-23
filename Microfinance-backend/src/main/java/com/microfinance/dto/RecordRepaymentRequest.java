package com.microfinance.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.microfinance.util.RepaymentConstants;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class RecordRepaymentRequest {

    @NotBlank(message = "Application ID is required")
    @Size(min = 1, max = 100, message = "Application ID must be between 1 and 100 characters")
    private String applicationId;

    // *** IGNORED - Server computes installment automatically ***
    @JsonIgnore
    private Integer installmentNumber; // Ignored - computed server-side based on payment order rules

    @NotNull(message = "Payment amount is required")
    @DecimalMin(value = "0.01", message = "Payment amount must be greater than 0")
    @DecimalMax(value = "999999999.99", message = "Payment amount exceeds maximum allowed value")
    private BigDecimal amountPaid;

    @NotNull(message = "Late fee paid is required")
    @DecimalMin(value = "0", message = "Late fee paid cannot be negative")
    @DecimalMax(value = "999999999.99", message = "Late fee paid exceeds maximum allowed value")
    private BigDecimal lateFeePaid = BigDecimal.ZERO;

    private LocalDate paymentDate;

    @Size(min = 1, max = 100, message = "Recorded by must be between 1 and 100 characters")
    private String recordedBy = RepaymentConstants.DEFAULT_RECORDED_BY;

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes = "";
}