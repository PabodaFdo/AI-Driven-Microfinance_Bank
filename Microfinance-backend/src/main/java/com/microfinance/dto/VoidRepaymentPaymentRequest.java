package com.microfinance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class VoidRepaymentPaymentRequest {

    @NotBlank(message = "Voided by is required")
    @Size(max = 100, message = "Voided by cannot exceed 100 characters")
    private String voidedBy;

    @NotBlank(message = "Void reason is required")
    @Size(max = 500, message = "Void reason cannot exceed 500 characters")
    private String voidReason;
}
