package com.microfinance.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@Document(collection = "risk_assessments")
public class RiskAssessment {

    @Id
    private String id;

    private String applicationId;
    private String applicantId;
    private String applicationNumber; // Friendly ID (e.g., APP-2026-0001)
    private String applicantNumber; // Friendly ID (e.g., CUS-2026-0001)
    private Double riskScore;
    private String riskLevel;
    private RiskStatus status = RiskStatus.ASSESSED;
    private String modelVersion;
    private List<String> topFactors = new ArrayList<>();
    private String explanationText;
    private Map<String, Object> inputSnapshot = new HashMap<>();
    private Instant assessedAt;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    // Soft delete fields
    private Boolean deleted = false;
    private Instant deletedAt;
    private String deletedBy;
    private String deleteReason;
}