package com.microfinance.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RecommendationUpdateRequest {

    @NotNull(message = "Recommended amount cannot be null")
    @DecimalMin(value = "10000.0", message = "Recommended amount must be at least 10,000")
    @DecimalMax(value = "10000000.0", message = "Recommended amount cannot exceed 10,000,000")
    private Double recommendedAmount;

    @NotNull(message = "Recommended period cannot be null")
    @Min(value = 6, message = "Recommended period must be at least 6 months")
    @Max(value = 120, message = "Recommended period cannot exceed 120 months")
    private Integer recommendedPeriod;

    @NotNull(message = "Recommended interest rate cannot be null")
    @DecimalMin(value = "5.0", message = "Interest rate must be at least 5%")
    @DecimalMax(value = "50.0", message = "Interest rate cannot exceed 50%")
    private Double recommendedInterestRate;

    @NotNull(message = "Feasibility cannot be null")
    @Size(min = 1, max = 10, message = "Feasibility must be a valid value")
    private String feasibility; // HIGH, MEDIUM, LOW (validated in service)

    @Size(max = 500, message = "Reasoning cannot exceed 500 characters")
    private String reasoning;

    @NotNull(message = "Override reason is required for manual updates")
    @Size(min = 1, max = 256, message = "Override reason must be between 1 and 256 characters")
    private String overrideReason; // Required for manual overrides

    @NotNull(message = "Updated by is required")
    @Size(min = 1, max = 100, message = "Updated by must be valid")
    private String updatedBy; // Staff ID making the update
}
