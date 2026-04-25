package com.microfinance.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApplicantRegistrationRequest {

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
    @DecimalMin(value = "0", message = "Monthly income must be positive")
    private Double monthlyIncome;

    @Min(value = 0, message = "Existing loans must be non-negative")
    private Integer existingLoans = 0;

    @Min(value = 0, message = "Dependents must be non-negative")
    private Integer dependents = 0;

    // CRITICAL for AI model: Must match dataset exactly (case-sensitive)
    @NotBlank(message = "Employment status is required")
    @Pattern(
        regexp = "^(Full-time|Part-time|Self-employed|Unemployed)$",
        message = "Employment status must be one of: Full-time, Part-time, Self-employed, Unemployed"
    )
    private String employmentStatus;

    @Min(value = 0, message = "Employment length must be non-negative")
    private Integer employmentLengthMonths = 0;

    @DecimalMin(value = "0", message = "Monthly debt payment must be non-negative")
    private Double monthlyDebtPayment = 0.0;

    @DecimalMin(value = "0", message = "Housing cost must be non-negative")
    private Double housingCost = 0.0;

    @NotBlank(message = "Has mortgage is required")
    @Pattern(regexp = "^(Yes|No)$", message = "Has mortgage must be either 'Yes' or 'No'")
    private String hasMortgage;

    @Pattern(regexp = "^(Single|Married|Divorced)$", message = "Marital status must be one of: Single, Married, Divorced")
    private String maritalStatus;

    // REMOVED: previousDefaults and creditLines fields - Not used in AI model prediction anymore
}