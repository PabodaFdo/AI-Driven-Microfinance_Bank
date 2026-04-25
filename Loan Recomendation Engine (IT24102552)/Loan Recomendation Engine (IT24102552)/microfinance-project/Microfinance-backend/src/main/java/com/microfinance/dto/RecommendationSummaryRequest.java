package com.microfinance.dto;

import lombok.Data;

@Data
public class RecommendationSummaryRequest {
    private String recommendationId;
    private Double recommendedAmount;
    private Integer recommendedPeriod;
    private Double recommendedInterestRate;
}