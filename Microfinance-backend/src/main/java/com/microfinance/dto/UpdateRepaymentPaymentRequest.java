package com.microfinance.dto;

import com.microfinance.util.RepaymentConstants;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class UpdateRepaymentPaymentRequest {

    @NotNull(message = "Payment amount is required")
    @DecimalMin(value = "0.01", inclusive = true, message = "Payment amount must be greater than 0")
    @DecimalMax(value = "999999999.99", message = "Payment amount exceeds maximum allowed value")
    private BigDecimal amountPaid;

    @NotNull(message = "Payment date is required")
    private LocalDate paymentDate;

    @NotBlank(message = "Recorded by is required and cannot be blank")
    @Size(min = 1, max = 100, message = "Recorded by must be between 1 and 100 characters")
    private String recordedBy;

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes = "";
}
