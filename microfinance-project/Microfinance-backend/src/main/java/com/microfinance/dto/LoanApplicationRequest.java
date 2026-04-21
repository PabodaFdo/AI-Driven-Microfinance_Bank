package com.microfinance.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class LoanApplicationRequest {

    @NotBlank(message = "Applicant ID is required")
    private String applicantId;

    @NotNull(message = "Loan amount is required")
    @Min(value = 1000, message = "Loan amount must be at least 1,000")
    @Max(value = 10000000, message = "Loan amount cannot exceed 10,000,000")
    private Double amount;

    // OPTIONAL: Term can be filled by recommendation engine later
    @Min(value = 1, message = "Term must be at least 1 month")
    @Max(value = 60, message = "Term cannot exceed 60 months")
    private Integer termMonths;

    // OPTIONAL: Interest rate can be filled by recommendation engine later
    @DecimalMin(value = "0.1", message = "Interest rate must be at least 0.1%")
    @DecimalMax(value = "50.0", message = "Interest rate cannot exceed 50%")
    private Double interestRate;

    // OPTIONAL: Purpose can be filled by recommendation engine later
    @Pattern(regexp = "^(Auto|Business|Education|Home|Other)$", message = "Purpose must be one of: Auto, Business, Education, Home, Other")
    private String purpose;

    // OPTIONAL: Co-signer info can be decided later
    private Boolean hasCoSigner;

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes;
}