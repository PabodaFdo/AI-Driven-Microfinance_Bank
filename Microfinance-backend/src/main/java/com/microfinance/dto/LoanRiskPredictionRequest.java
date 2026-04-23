package com.microfinance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for AI Model Risk Prediction API
 * Maps to microfinance-ai FastAPI LoanRequest schema
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanRiskPredictionRequest {
    // Required fields
    private Integer age;
    private Double income;  // Annual income in LKR
    private Double loanAmount;
    private Integer creditScore;
    private Integer monthsEmployed;
    private Integer numCreditLines;
    private Double interestRate;
    private Integer loanTerm;
    private Double dtiRatio;

    // Categorical fields (required)
    private String education;
    private String employmentType;
    private String maritalStatus;
    private String hasMortgage;  // "Yes" or "No"
    private String hasDependent;  // "Yes" or "No"
    private String loanPurpose;
    private String hasCoSigner;  // "Yes" or "No"

    // Optional custom proposal fields
    private Double customLoanAmount;
    private Double customInterestRate;
    private Integer customLoanTerm;
}
