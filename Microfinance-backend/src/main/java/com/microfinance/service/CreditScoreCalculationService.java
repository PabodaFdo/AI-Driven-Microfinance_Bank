package com.microfinance.service;

import com.microfinance.model.Applicant;
import org.springframework.stereotype.Service;

@Service
public class CreditScoreCalculationService {

    /**
     * Calculate credit score based on applicant data using rule-based scoring.
     * Score range: 250-900, Starting base: 300
     *
     * @param applicant the applicant data
     * @return calculated credit score
     */
    public int calculateCreditScore(Applicant applicant) {
        int baseScore = 300; // Starting base score

        // Income scoring
        baseScore += getIncomeScore(applicant.getMonthlyIncome());

        // Employment length scoring
        baseScore += getEmploymentLengthScore(applicant.getEmploymentLengthMonths());

        // Existing loans scoring
        baseScore += getExistingLoansScore(applicant.getExistingLoans());

        // Debt ratio scoring
        baseScore += getDebtRatioScore(applicant.getMonthlyDebtPayment(), applicant.getMonthlyIncome());

        // Has mortgage scoring
        baseScore += getHasMortgageScore(applicant.getHasMortgage());

        // Dependents scoring
        baseScore += getDependentsScore(applicant.getDependents());

        // Employment status scoring
        baseScore += getEmploymentStatusScore(applicant.getEmploymentStatus());

        // REMOVED: Previous defaults and credit lines scoring - Not used in AI model anymore

        // Clamp score between 250 and 900
        return Math.max(250, Math.min(900, baseScore));
    }

    /**
     * Calculate risk level based on credit score
     * >= 750 -> Low, >= 600 and < 750 -> Medium, < 600 -> High
     */
    public String calculateRiskLevel(int creditScore) {
        if (creditScore >= 750) {
            return "Low";
        } else if (creditScore >= 600) {
            return "Medium";
        } else {
            return "High";
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PRIVATE SCORING METHODS
    // ═══════════════════════════════════════════════════════════

    private int getIncomeScore(Double monthlyIncome) {
        if (monthlyIncome == null) return 0;

        if (monthlyIncome > 150000) {
            return 100;
        } else if (monthlyIncome >= 75000) {
            return 70;
        } else {
            return 40;
        }
    }

    private int getEmploymentLengthScore(Integer employmentLengthMonths) {
        if (employmentLengthMonths == null) return 0;

        if (employmentLengthMonths > 36) {
            return 80;
        } else if (employmentLengthMonths >= 12) {
            return 50;
        } else {
            return 20;
        }
    }

    private int getExistingLoansScore(Integer existingLoans) {
        if (existingLoans == null) return 0;

        if (existingLoans == 0) {
            return 80;
        } else if (existingLoans <= 2) {
            return 40;
        } else {
            return -20;
        }
    }

    private int getDebtRatioScore(Double monthlyDebtPayment, Double monthlyIncome) {
        if (monthlyDebtPayment == null || monthlyIncome == null || monthlyIncome == 0) {
            return 0;
        }

        double debtRatio = monthlyDebtPayment / monthlyIncome;

        if (debtRatio < 0.3) {
            return 80;
        } else if (debtRatio < 0.6) {
            return 40;
        } else {
            return -50;
        }
    }

    private int getHasMortgageScore(String hasMortgage) {
        if (hasMortgage == null) return 0;

        return switch (hasMortgage) {
            case "Yes" -> 30;   // Has mortgage - indicates ownership but with debt burden
            case "No" -> 50;    // No mortgage - indicates either full ownership or rental (balanced score)
            default -> 0;
        };
    }

    private int getDependentsScore(Integer dependents) {
        if (dependents == null) return 0;

        return dependents <= 2 ? 40 : 10;
    }

    private int getEmploymentStatusScore(String employmentStatus) {
        if (employmentStatus == null) return 0;

        // Updated to match AI dataset exactly: Full-time, Part-time, Self-employed, Unemployed
        return switch (employmentStatus) {
            case "Full-time" -> 40;      // Highest score for stable full-time employment
            case "Part-time" -> 20;      // Medium score for part-time employment
            case "Self-employed" -> 10;  // Lower score due to income variability
            case "Unemployed" -> -30;    // Negative score for unemployed
            default -> 0;               // Unknown employment status
        };
    }

    // REMOVED: getPreviousDefaultsScore and getCreditLinesScore methods - Not used in AI model anymore
}
