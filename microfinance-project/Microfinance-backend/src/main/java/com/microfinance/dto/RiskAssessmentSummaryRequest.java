package com.microfinance.dto;

import lombok.Data;

@Data
public class RiskAssessmentSummaryRequest {
    private String riskAssessmentId;
    private Double riskScore;
    private String riskLevel;
}