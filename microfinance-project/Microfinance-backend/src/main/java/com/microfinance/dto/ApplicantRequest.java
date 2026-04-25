package com.microfinance.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ApplicantRequest {

    @NotBlank(message = "Full name is required")
    @Size(min = 3, max = 100, message = "Full name must be between 3 and 100 characters")
    @Pattern(regexp = "^[a-zA-Z\\s.'\\-]+$", message = "Full name can only contain letters, spaces, dots, apostrophes, and hyphens")
    private String fullName;

    @NotBlank(message = "NIC is required")
    private String nic;

    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "^\\d{10}$", message = "Phone number must contain exactly 10 digits")
    private String phone;

    @Email(message = "Valid email is required")
    @NotBlank(message = "Email is required")
    private String email;

    @Size(max = 255, message = "Address cannot exceed 255 characters")
    private String address;

    @NotBlank(message = "Branch is required")
    private String branch;

    @NotBlank(message = "Job type is required")
    private String jobType;

    @NotNull(message = "Monthly income is required")
    @Min(value = 1, message = "Monthly income must be greater than 0")
    @Max(value = 10000000, message = "Monthly income cannot exceed 10,000,000")
    private Double monthlyIncome;

    @NotNull(message = "Existing loans is required")
    @Min(value = 0, message = "Existing loans cannot be negative")
    private Integer existingLoans;

    @NotNull(message = "Dependents is required")
    private Integer dependents = 0;

    // CRITICAL for AI model: Must match dataset exactly (case-sensitive)
    @NotBlank(message = "Employment status is required")
    @Pattern(
        regexp = "^(Full-time|Part-time|Self-employed|Unemployed)$",
        message = "Employment status must be one of: Full-time, Part-time, Self-employed, Unemployed"
    )
    private String employmentStatus;

    @Min(value = 0, message = "Employment length must be >= 0")
    private Integer employmentLengthMonths = 0;

    @Min(value = 0, message = "Monthly debt payment must be >= 0")
    private Double monthlyDebtPayment = 0.0;

    @Min(value = 0, message = "Housing cost must be >= 0")
    private Double housingCost = 0.0;

    @NotBlank(message = "Has mortgage is required")
    @Pattern(regexp = "^(Yes|No)$", message = "Has mortgage must be either 'Yes' or 'No'")
    private String hasMortgage;

    @Pattern(regexp = "^(Single|Married|Divorced)$", message = "Marital status must be one of: Single, Married, Divorced")
    private String maritalStatus;

    // REMOVED: creditScore field - Credit score is calculated by the backend, not accepted from request
    // This ensures compliance with the requirement that creditScore should not come from frontend

    // REMOVED: previousDefaults and creditLines fields - Not used in AI model prediction anymore
}