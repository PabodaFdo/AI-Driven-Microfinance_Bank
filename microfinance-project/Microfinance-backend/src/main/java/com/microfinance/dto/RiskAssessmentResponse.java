package com.microfinance.dto;

import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
public class RiskAssessmentResponse {
    private String id;
    private String applicationId;
    private String applicantId;
    private String applicationNumber;
    private String applicantNumber;
    private Double riskScore;
    private String riskLevel;
    private String status;
    private String modelVersion;
    private List<String> topFactors;
    private String explanationText;
    private Map<String, Object> inputSnapshot;
    private Instant assessedAt;
    private Instant createdAt;
    private Instant updatedAt;
}