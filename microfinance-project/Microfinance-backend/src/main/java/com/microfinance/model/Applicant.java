package com.microfinance.model;

import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@Document(collection = "applicants")
public class Applicant {

    @Id
    private String id;

    // User-friendly applicant number for display (e.g., CUS-2026-0001)
    private String applicantNumber;

    @NotBlank(message = "Full name is required")
    @Size(min = 3, max = 100, message = "Full name must be between 3 and 100 characters")
    @Pattern(regexp = "^[a-zA-Z\\s.'\\-]+$", message = "Full name can only contain letters, spaces, dots, apostrophes, and hyphens")
    private String fullName;

    @NotBlank(message = "NIC is required")
    @Indexed(unique = true)
    private String nic;

    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "^0\\d{9}$", message = "Phone must be exactly 10 digits starting with 0")
    private String phone;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    @Indexed(unique = true)
    private String email;

    @Size(max = 255, message = "Address cannot exceed 255 characters")
    private String address;

    @NotBlank(message = "Branch is required")
    private String branch;

    @NotBlank(message = "Job type is required")
    private String jobType;

    @NotNull(message = "Monthly income is required")
    @Min(value = 0, message = "Monthly income must be >= 0")
    private Double monthlyIncome;

    @Min(value = 0, message = "Existing loans must be >= 0")
    private Integer existingLoans;

    @NotNull(message = "Dependents is required")
    @Min(value = 0, message = "Dependents must be >= 0")
    private Integer dependents;

    @NotBlank(message = "Employment status is required")
    @Pattern(
        regexp = "^(Full-time|Part-time|Self-employed|Unemployed)$",
        message = "Employment status must be one of: Full-time, Part-time, Self-employed, Unemployed"
    )
    private String employmentStatus;

    @Min(value = 0, message = "Employment length must be >= 0")
    private Integer employmentLengthMonths;

    @Min(value = 0, message = "Monthly debt payment must be >= 0")
    private Double monthlyDebtPayment;

    @Min(value = 0, message = "Housing cost must be >= 0")
    private Double housingCost;

    @NotBlank(message = "Has mortgage is required")
    @Pattern(regexp = "^(Yes|No)$", message = "Has mortgage must be either 'Yes' or 'No'")
    private String hasMortgage;

    @Pattern(regexp = "^(Single|Married|Divorced)$", message = "Marital status must be one of: Single, Married, Divorced")
    private String maritalStatus;

    @Min(value = 0, message = "Credit score must be >= 0")
    private Integer creditScore;

    private String riskLevel; // Low, Medium, High

    // REMOVED: previousDefaults and creditLines fields - Not used in AI model prediction anymore

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}