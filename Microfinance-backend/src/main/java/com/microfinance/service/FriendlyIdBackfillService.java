package com.microfinance.service;

import com.microfinance.model.Applicant;
import com.microfinance.model.LoanApplication;
import com.microfinance.model.Recommendation;
import com.microfinance.model.RiskAssessment;
import com.microfinance.repository.ApplicantRepository;
import com.microfinance.repository.LoanApplicationRepository;
import com.microfinance.repository.RecommendationRepository;
import com.microfinance.repository.RiskAssessmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service to backfill friendly IDs (applicationNumber, applicantNumber) for existing
 * RiskAssessment and Recommendation documents that were created before this feature was added.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FriendlyIdBackfillService {

    private final RiskAssessmentRepository riskAssessmentRepository;
    private final RecommendationRepository recommendationRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final ApplicantRepository applicantRepository;

    /**
     * Backfill friendly IDs for all RiskAssessment documents missing these fields.
     * Returns the count of records updated.
     */
    public int backfillRiskAssessmentIds() {
        log.info("Starting backfill of friendly IDs for RiskAssessment documents...");

        int updated = 0;
        List<RiskAssessment> assessments = riskAssessmentRepository.findAll();

        for (RiskAssessment assessment : assessments) {
            if (assessment.getApplicationNumber() == null || assessment.getApplicantNumber() == null) {
                try {
                    // Load the referenced loan application
                    LoanApplication application = loanApplicationRepository.findById(assessment.getApplicationId())
                            .orElse(null);

                    if (application != null) {
                        assessment.setApplicationNumber(application.getApplicationNumber());
                    } else {
                        log.warn("RiskAssessment {} references non-existent LoanApplication {}",
                            assessment.getId(), assessment.getApplicationId());
                    }

                    // Load the referenced applicant
                    Applicant applicant = applicantRepository.findById(assessment.getApplicantId())
                            .orElse(null);

                    if (applicant != null) {
                        assessment.setApplicantNumber(applicant.getApplicantNumber());
                    } else {
                        log.warn("RiskAssessment {} references non-existent Applicant {}",
                            assessment.getId(), assessment.getApplicantId());
                    }

                    // Save the updated assessment
                    riskAssessmentRepository.save(assessment);
                    updated++;

                } catch (Exception e) {
                    log.error("Error backfilling RiskAssessment {}: {}", assessment.getId(), e.getMessage());
                }
            }
        }

        log.info("Completed backfill of RiskAssessment IDs. Updated {} records.", updated);
        return updated;
    }

    /**
     * Backfill friendly IDs for all Recommendation documents missing these fields.
     * Returns the count of records updated.
     */
    public int backfillRecommendationIds() {
        log.info("Starting backfill of friendly IDs for Recommendation documents...");

        int updated = 0;
        List<Recommendation> recommendations = recommendationRepository.findAll();

        for (Recommendation recommendation : recommendations) {
            if (recommendation.getApplicationNumber() == null || recommendation.getApplicantNumber() == null) {
                try {
                    // Load the referenced loan application
                    LoanApplication application = loanApplicationRepository.findById(recommendation.getApplicationId())
                            .orElse(null);

                    if (application != null) {
                        recommendation.setApplicationNumber(application.getApplicationNumber());
                    } else {
                        log.warn("Recommendation {} references non-existent LoanApplication {}",
                            recommendation.getId(), recommendation.getApplicationId());
                    }

                    // Load the referenced applicant
                    Applicant applicant = applicantRepository.findById(recommendation.getApplicantId())
                            .orElse(null);

                    if (applicant != null) {
                        recommendation.setApplicantNumber(applicant.getApplicantNumber());
                    } else {
                        log.warn("Recommendation {} references non-existent Applicant {}",
                            recommendation.getId(), recommendation.getApplicantId());
                    }

                    // Save the updated recommendation
                    recommendationRepository.save(recommendation);
                    updated++;

                } catch (Exception e) {
                    log.error("Error backfilling Recommendation {}: {}", recommendation.getId(), e.getMessage());
                }
            }
        }

        log.info("Completed backfill of Recommendation IDs. Updated {} records.", updated);
        return updated;
    }

    /**
     * Run backfill for both RiskAssessment and Recommendation documents.
     */
    public void backfillAllFriendlyIds() {
        log.info("Starting complete friendly ID backfill process...");
        int riskUpdated = backfillRiskAssessmentIds();
        int recUpdated = backfillRecommendationIds();
        log.info("Backfill complete. Updated {} RiskAssessments and {} Recommendations.",
            riskUpdated, recUpdated);
    }
}
