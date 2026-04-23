package com.microfinance.dto;

import lombok.Data;

import java.time.Instant;
import java.util.Map;

@Data
public class RecommendationResponse {
    private String id;
    private String applicationId;
    private String applicantId;
    private String applicationNumber;
    private String applicantNumber;
    private Double recommendedAmount;
    private Integer recommendedPeriod;
    private Double recommendedInterestRate;
    private String feasibility;
    private String reasoning;
    private String status;
    private String modelVersion;
    private Map<String, Object> inputSnapshot;
    private Instant generatedAt;
    private Instant createdAt;
    private Instant updatedAt;

    // Archive fields
    private boolean archived;
    private Instant archivedAt;
    private String archivedBy;
    private String archiveReason;

    // Audit fields
    private String lastUpdatedBy;
    private String overrideReason;
    private Map<String, Object> previousValuesSnapshot;
    private boolean manualOverride;
}