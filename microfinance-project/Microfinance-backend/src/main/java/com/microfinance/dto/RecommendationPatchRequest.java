package com.microfinance.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO for partial updates (PATCH) of recommendations.
 * All fields are optional to support partial updates.
 * Individual field validation applies only when field is present.
 */
@Data
public class RecommendationPatchRequest {

    @DecimalMin(value = "10000.0", message = "Recommended amount must be at least 10,000")
    @DecimalMax(value = "10000000.0", message = "Recommended amount cannot exceed 10,000,000")
    private Double recommendedAmount;

    @Min(value = 6, message = "Recommended period must be at least 6 months")
    @Max(value = 120, message = "Recommended period cannot exceed 120 months")
    private Integer recommendedPeriod;

    @DecimalMin(value = "5.0", message = "Interest rate must be at least 5%")
    @DecimalMax(value = "50.0", message = "Interest rate cannot exceed 50%")
    private Double recommendedInterestRate;

    @Size(min = 1, max = 10, message = "Feasibility must be a valid value")
    private String feasibility; // HIGH, MEDIUM, LOW (validated in service)

    @Size(max = 500, message = "Reasoning cannot exceed 500 characters")
    private String reasoning;

    @Size(min = 1, max = 256, message = "Override reason must be between 1 and 256 characters")
    private String overrideReason; // Required when making manual changes

    @Size(min = 1, max = 100, message = "Updated by must be valid")
    private String updatedBy; // Staff ID making the update
}
