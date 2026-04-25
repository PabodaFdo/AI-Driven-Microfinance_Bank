package com.microfinance.service;

import com.microfinance.model.Applicant;
import com.microfinance.model.LoanApplication;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class AiServiceClient {

    private final WebClient webClient;

    public AiServiceClient(@Value("${ai.service.url:http://localhost:8000}") String aiServiceUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(aiServiceUrl)
                .build();
    }

    /**
     * Calls the Python AI model with applicant + loan data for risk prediction.
     * Returns null safely if the AI service is unavailable.
     */
    public Map<String, Object> predictRisk(Applicant applicant, LoanApplication application) {
        try {
            Map<String, Object> body = buildRequestBody(applicant, application);

            Map<String, Object> result = webClient.post()
                    .uri("/predict-risk")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(Duration.ofSeconds(30));

            log.info("AI model response received for application: {}", application.getId());
            return result;

        } catch (WebClientResponseException e) {
            log.warn("AI service returned error for application {}: {}", application.getId(), e.getMessage());
            return null;
        } catch (Exception e) {
            log.warn("AI service unavailable for application {}: {}", application.getId(), e.getMessage());
            return null;
        }
    }

    /**
     * Calls the Python AI model to generate loan recommendations.
     * Returns null safely if the AI service is unavailable.
     * Expected AI response format:
     * {
     *   "recommended_amount": 1500000,
     *   "recommended_term": 36,
     *   "recommended_rate": 10.5,
     *   "feasibility": "HIGH",
     *   "reasoning": "..."
     * }
     */
    public Map<String, Object> predictRecommendation(Applicant applicant, LoanApplication application) {
        try {
            Map<String, Object> body = buildRequestBody(applicant, application);

            // Add risk-related data if available
            if (application.getRiskScore() != null) {
                body.put("RiskScore", application.getRiskScore());
            }
            if (application.getRiskLevel() != null) {
                body.put("RiskLevel", application.getRiskLevel());
            }

            Map<String, Object> result = webClient.post()
                    .uri("/predict-recommendation")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(Duration.ofSeconds(30));

            log.info("AI recommendation response received for application: {}", application.getId());
            return result;

        } catch (WebClientResponseException e) {
            log.warn("AI service returned error generating recommendation for application {}: {}", application.getId(), e.getMessage());
            return null;
        } catch (Exception e) {
            log.warn("AI service unavailable for generating recommendation for application {}: {}", application.getId(), e.getMessage());
            return null;
        }
    }

    private Map<String, Object> buildRequestBody(Applicant applicant, LoanApplication application) {
        Map<String, Object> body = new HashMap<>();

        // Personal / financial fields
        body.put("Age", 30); // Default age (no age field in Applicant model)
        body.put("Income", applicant.getMonthlyIncome() != null ? applicant.getMonthlyIncome() * 12 : 0);
        body.put("LoanAmount", application.getAmount() != null ? application.getAmount() : 0);
        body.put("CreditScore", applicant.getCreditScore() != null ? applicant.getCreditScore() : 600);
        body.put("MonthsEmployed", applicant.getEmploymentLengthMonths() != null ? applicant.getEmploymentLengthMonths() : 0);
        body.put("NumCreditLines", applicant.getExistingLoans() != null ? applicant.getExistingLoans() : 0);
        body.put("InterestRate", application.getInterestRate() != null ? application.getInterestRate() : 10.0);
        body.put("LoanTerm", application.getTermMonths() != null ? application.getTermMonths() : 24);

        // DTI ratio — calculate from available data
        double monthlyIncome = applicant.getMonthlyIncome() != null ? applicant.getMonthlyIncome() : 1;
        double monthlyDebt = applicant.getMonthlyDebtPayment() != null ? applicant.getMonthlyDebtPayment() : 0;
        double dti = monthlyIncome > 0 ? monthlyDebt / monthlyIncome : 0;
        body.put("DTIRatio", Math.min(dti, 1.0));

        // Categorical fields — map your existing values to what the AI model expects
        body.put("Education", "Bachelor's"); // Default education (no educationLevel field in Applicant)
        body.put("EmploymentType", mapEmploymentType(applicant.getEmploymentStatus()));
        body.put("MaritalStatus", mapMaritalStatus(applicant.getMaritalStatus()));
        body.put("HasMortgage", applicant.getHasMortgage() != null ? applicant.getHasMortgage() : "No");
        body.put("HasDependents", applicant.getDependents() != null && applicant.getDependents() > 0 ? "Yes" : "No");
        body.put("LoanPurpose", mapLoanPurpose(application.getPurpose()));
        body.put("HasCoSigner", application.getHasCoSigner() != null && application.getHasCoSigner() ? "Yes" : "No");

        return body;
    }

    private String mapEmploymentType(String value) {
        if (value == null) return "Full-time";
        return switch (value.toUpperCase().trim()) {
            case "UNEMPLOYED" -> "Unemployed";
            case "SELF-EMPLOYED" -> "Self-Employed";
            case "PART-TIME" -> "Part-time";
            default -> "Full-time";
        };
    }

    private String mapMaritalStatus(String value) {
        if (value == null) return "Single";
        return switch (value.toUpperCase().trim()) {
            case "MARRIED" -> "Married";
            case "DIVORCED", "SEPARATED" -> "Divorced";
            default -> "Single";
        };
    }

    private String mapLoanPurpose(String value) {
        if (value == null) return "Other";
        return switch (value.toUpperCase().trim()) {
            case "HOME", "MORTGAGE", "HOUSING" -> "Home";
            case "AUTO", "CAR", "VEHICLE" -> "Auto";
            case "EDUCATION", "STUDY" -> "Education";
            case "BUSINESS" -> "Business";
            default -> "Other";
        };
    }
}