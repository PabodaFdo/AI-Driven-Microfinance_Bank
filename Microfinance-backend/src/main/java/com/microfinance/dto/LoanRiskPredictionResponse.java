package com.microfinance.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO from AI Model Risk Prediction API
 * Maps from microfinance-ai FastAPI response
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanRiskPredictionResponse {

    @JsonProperty("risk_probability")
    private Double riskProbability;

    @JsonProperty("risk_category")
    private String riskCategory;  // "Low", "Medium", or "High"

    private DecisionResult decision;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DecisionResult {
        private String status;  // "APPROVED", "RECOMMENDED", "RECOMMENDED_SAFER"
        private RecommendationPlan plan;

        @JsonProperty("risk_probability")
        private Double riskProbability;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendationPlan {
        @JsonProperty("LoanAmount")
        private Double loanAmount;

        @JsonProperty("InterestRate")
        private Double interestRate;

        @JsonProperty("LoanTerm")
        private Integer loanTerm;
    }
}
