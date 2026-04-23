package com.microfinance.service;

import com.microfinance.dto.ArchiveRecommendationRequest;
import com.microfinance.dto.RecommendationManualUpdateRequest;
import com.microfinance.dto.RecommendationPatchRequest;
import com.microfinance.dto.RecommendationResponse;
import com.microfinance.dto.RecommendationSummaryRequest;
import com.microfinance.dto.RecommendationUpdateRequest;
import com.microfinance.exception.BusinessException;
import com.microfinance.exception.ResourceNotFoundException;
import com.microfinance.model.Applicant;
import com.microfinance.model.LoanApplication;
import com.microfinance.model.LoanStatus;
import com.microfinance.model.Recommendation;
import com.microfinance.model.RecommendationStatus;
import com.microfinance.model.RiskAssessment;
import com.microfinance.model.RiskStatus;
import com.microfinance.repository.ApplicantRepository;
import com.microfinance.repository.LoanApplicationRepository;
import com.microfinance.repository.RecommendationRepository;
import com.microfinance.repository.RiskAssessmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final RecommendationRepository recommendationRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final ApplicantRepository applicantRepository;
    private final RiskAssessmentRepository riskAssessmentRepository;
    private final LoanApplicationService loanApplicationService;

    // ═══════════════════════════════════════════════════════════
    // HELPER METHOD: Get latest active risk assessment
    // ═══════════════════════════════════════════════════════════

    private RiskAssessment getLatestActiveRiskAssessmentOrThrow(String applicationId) {
        return riskAssessmentRepository
                .findTopByApplicationIdAndDeletedFalseOrderByAssessedAtDesc(applicationId)
                .orElseThrow(() -> new BusinessException(
                        "Latest active risk assessment not found for application: " + applicationId
                ));
    }

    public RecommendationResponse generateRecommendation(String applicationId) {
        // Validate input parameters
        if (applicationId == null || applicationId.trim().isEmpty()) {
            throw new IllegalArgumentException("Application ID cannot be null or empty");
        }

        // Load and validate application
        LoanApplication application = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + applicationId));

        // Check if application is finalized
        if (isFinalized(application)) {
            throw new BusinessException("Cannot generate recommendation for finalized applications. Current status: " + application.getStatus());
        }

        // Check if risk assessment is completed
        if (application.getRiskStatus() != RiskStatus.ASSESSED) {
            throw new BusinessException("Risk assessment must be completed before generating recommendations. Current risk status: " + application.getRiskStatus());
        }

        // Validate applicant ID
        String applicantId = application.getApplicantId();
        if (applicantId == null || applicantId.trim().isEmpty()) {
            throw new BusinessException("Application does not have a valid applicant ID");
        }

        // Load applicant
        Applicant applicant = applicantRepository.findById(applicantId)
                .orElseThrow(() -> new ResourceNotFoundException("Applicant not found: " + applicantId));

        // Validate required fields
        validateRequiredFields(application, applicant);

        try {
            // CRITICAL: Always fetch the latest ACTIVE risk assessment, NOT stale app summary
            RiskAssessment latestAssessment = getLatestActiveRiskAssessmentOrThrow(applicationId);

            // Override stale summary values in application with fresh assessment data
            application.setRiskScore(latestAssessment.getRiskScore());
            application.setRiskLevel(latestAssessment.getRiskLevel());

            // IMPORTANT: Archive any existing active recommendations BEFORE generating a new one
            archiveExistingRecommendations(applicationId);

            // Generate recommendation with FRESH current data and latest assessment
            Recommendation recommendation = generateRecommendationLogic(application, applicant);

            // Validate recommendation before saving
            if (recommendation == null) {
                throw new BusinessException("Failed to generate recommendation");
            }

            // Save recommendation
            recommendation = recommendationRepository.save(recommendation);

            // Validate that recommendation was saved successfully
            if (recommendation == null || recommendation.getId() == null) {
                throw new BusinessException("Failed to save recommendation");
            }

            // Update application summary (point to NEW recommendation)
            RecommendationSummaryRequest summaryRequest = new RecommendationSummaryRequest();
            summaryRequest.setRecommendationId(recommendation.getId());
            summaryRequest.setRecommendedAmount(recommendation.getRecommendedAmount());
            summaryRequest.setRecommendedPeriod(recommendation.getRecommendedPeriod());
            summaryRequest.setRecommendedInterestRate(recommendation.getRecommendedInterestRate());

            loanApplicationService.updateRecommendationSummary(applicationId, summaryRequest);

            System.out.println("✓ Recommendation generated for application " + applicationId +
                    ". New recommendation ID: " + recommendation.getId() +
                    ", Amount: " + recommendation.getRecommendedAmount() +
                    ", Period: " + recommendation.getRecommendedPeriod() + " months" +
                    ", Rate: " + recommendation.getRecommendedInterestRate() + "%" +
                    ", Using latest risk assessment: " + latestAssessment.getId());

            return toResponse(recommendation);

        } catch (Exception e) {
            // Set recommendation failed if exception occurs after processing starts
            loanApplicationService.setRecommendationFailed(applicationId, e.getMessage());
            throw e;
        }
    }

    /**
     * Archive all existing active recommendations for an application.
     * This ensures clean re-generation: old recommendations don't interfere with new ones.
     */
    private void archiveExistingRecommendations(String applicationId) {
        try {
            // Find all non-archived recommendations for this application
            List<Recommendation> existingRecs = recommendationRepository
                    .findByApplicationIdAndArchivedFalse(applicationId);

            for (Recommendation existing : existingRecs) {
                // Archive instead of deleting
                existing.setArchived(true);
                existing.setArchivedAt(Instant.now());
                existing.setArchivedBy("SYSTEM");
                existing.setArchiveReason("Archived due to new recommendation generation");
                recommendationRepository.save(existing);

                System.out.println("  ℹ Archived previous recommendation: " + existing.getId());
            }
        } catch (Exception e) {
            System.err.println("Warning: Failed to archive existing recommendations for " + applicationId + ": " + e.getMessage());
            // Don't throw - let the new recommendation proceed anyway
        }
    }

    // NEW METHOD: Recalculate recommendation with updated data
    public RecommendationResponse recalculateRecommendation(String applicationId) {
        // Validate input parameters
        if (applicationId == null || applicationId.trim().isEmpty()) {
            throw new IllegalArgumentException("Application ID cannot be null or empty");
        }

        // Load application
        LoanApplication application = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + applicationId));

        // Check if application is finalized
        if (isFinalized(application)) {
            throw new BusinessException("Cannot recalculate recommendation for finalized applications. Current status: " + application.getStatus());
        }

        // CRITICAL: Archive existing active recommendation FIRST
        recommendationRepository.findTopByApplicationIdAndArchivedFalseOrderByGeneratedAtDesc(applicationId)
                .ifPresent(existing -> {
                    existing.setArchived(true);
                    existing.setArchivedAt(Instant.now());
                    existing.setArchivedBy("SYSTEM");
                    existing.setArchiveReason("Archived due to recalculation");
                    recommendationRepository.save(existing);
                    System.out.println("  ℹ Archived previous recommendation due to recalculation: " + existing.getId());
                });

        // Then generate fresh recommendation using latest data
        return generateRecommendation(applicationId);
    }

    // ═══════════════════════════════════════════════════════════
    // READ OPERATIONS (Existing - Updated to handle archived items)
    // ═══════════════════════════════════════════════════════════

    public RecommendationResponse getLatestByApplicationId(String applicationId) {
        if (applicationId == null || applicationId.trim().isEmpty()) {
            throw new IllegalArgumentException("Application ID cannot be null or empty");
        }

        // Get latest non-archived recommendation
        Recommendation recommendation = recommendationRepository.findTopByApplicationIdAndArchivedFalseOrderByGeneratedAtDesc(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("No active recommendations found for application: " + applicationId));
        return toResponse(recommendation);
    }

    public RecommendationResponse getById(String id) {
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("Recommendation ID cannot be null or empty");
        }

        Recommendation recommendation = recommendationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recommendation not found: " + id));
        return toResponse(recommendation);
    }

    // ═══════════════════════════════════════════════════════════
    // UPDATE OPERATIONS (New)
    // ═══════════════════════════════════════════════════════════

    public RecommendationResponse updateRecommendation(String id, RecommendationUpdateRequest request) {
        // Validate input
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("Recommendation ID cannot be null or empty");
        }
        if (request == null) {
            throw new IllegalArgumentException("Update request cannot be null");
        }

        // Validate update rules
        validateRecommendationUpdateRules(request);

        // Load existing recommendation
        Recommendation recommendation = recommendationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recommendation not found: " + id));

        // Check if archived
        if (recommendation.isArchived()) {
            throw new BusinessException("Cannot update archived recommendation");
        }

        // Load application to check if finalized
        String applicationId = recommendation.getApplicationId();
        LoanApplication application = loanApplicationRepository.findById(applicationId)
            .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + applicationId));

        if (isFinalized(application)) {
            throw new BusinessException("Cannot update recommendation for finalized applications. Current status: " + application.getStatus());
        }

        // Store previous values for audit
        Map<String, Object> previousValues = new HashMap<>();
        previousValues.put("recommendedAmount", recommendation.getRecommendedAmount());
        previousValues.put("recommendedPeriod", recommendation.getRecommendedPeriod());
        previousValues.put("recommendedInterestRate", recommendation.getRecommendedInterestRate());
        previousValues.put("feasibility", recommendation.getFeasibility());
        previousValues.put("reasoning", recommendation.getReasoning());

        // Update fields with validated and sanitized values
        recommendation.setRecommendedAmount(request.getRecommendedAmount());
        recommendation.setRecommendedPeriod(request.getRecommendedPeriod());
        recommendation.setRecommendedInterestRate(request.getRecommendedInterestRate());

        String feasibility = validateFeasibility(request.getFeasibility());
        recommendation.setFeasibility(feasibility);

        String reasoning = sanitizeText(request.getReasoning(), 500);
        recommendation.setReasoning(reasoning);

        // Set audit fields with sanitized values
        String overrideReason = sanitizeText(request.getOverrideReason(), 256);
        String updatedBy = sanitizeText(request.getUpdatedBy(), 100);

        recommendation.setPreviousValuesSnapshot(previousValues);
        recommendation.setLastUpdatedBy(updatedBy);
        recommendation.setOverrideReason(overrideReason);
        recommendation.setManualOverride(true);

        // Save updated recommendation
        recommendation = recommendationRepository.save(recommendation);

        // Update application summary
        RecommendationSummaryRequest summaryRequest = new RecommendationSummaryRequest();
        summaryRequest.setRecommendationId(recommendation.getId());
        summaryRequest.setRecommendedAmount(recommendation.getRecommendedAmount());
        summaryRequest.setRecommendedPeriod(recommendation.getRecommendedPeriod());
        summaryRequest.setRecommendedInterestRate(recommendation.getRecommendedInterestRate());

        loanApplicationService.updateRecommendationSummary(applicationId, summaryRequest);

        return toResponse(recommendation);
    }

    /**
     * Manual update of recommendation (excludes feasibility from user input)
     * Feasibility remains system-generated and is preserved from original recommendation
     */
    public RecommendationResponse updateRecommendationManually(String id, RecommendationManualUpdateRequest request) {
        // Validate input
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("Recommendation ID cannot be null or empty");
        }
        if (request == null) {
            throw new IllegalArgumentException("Update request cannot be null");
        }

        // Validate update rules (excluding feasibility)
        validateRecommendationManualUpdateRules(request);

        // Load existing recommendation
        Recommendation recommendation = recommendationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recommendation not found: " + id));

        // Check if archived
        if (recommendation.isArchived()) {
            throw new BusinessException("Cannot update archived recommendation");
        }

        // Load application to check if finalized
        String applicationId = recommendation.getApplicationId();
        LoanApplication application = loanApplicationRepository.findById(applicationId)
            .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + applicationId));

        if (isFinalized(application)) {
            throw new BusinessException("Cannot update recommendation for finalized applications. Current status: " + application.getStatus());
        }

        // Store previous values for audit (excluding feasibility)
        Map<String, Object> previousValues = new HashMap<>();
        previousValues.put("recommendedAmount", recommendation.getRecommendedAmount());
        previousValues.put("recommendedPeriod", recommendation.getRecommendedPeriod());
        previousValues.put("recommendedInterestRate", recommendation.getRecommendedInterestRate());
        previousValues.put("reasoning", recommendation.getReasoning());
        // NOTE: feasibility is intentionally NOT included in previousValues as it shouldn't change

        // Update only business-adjustable fields (feasibility is preserved as system-generated)
        recommendation.setRecommendedAmount(request.getRecommendedAmount());
        recommendation.setRecommendedPeriod(request.getRecommendedPeriod());
        recommendation.setRecommendedInterestRate(request.getRecommendedInterestRate());

        // feasibility is intentionally NOT updated - remains system-generated
        
        String reasoning = sanitizeText(request.getReasoning(), 500);
        recommendation.setReasoning(reasoning);

        // Set audit fields with sanitized values
        String overrideReason = sanitizeText(request.getOverrideReason(), 256);
        String updatedBy = sanitizeText(request.getUpdatedBy(), 100);

        recommendation.setPreviousValuesSnapshot(previousValues);
        recommendation.setLastUpdatedBy(updatedBy);
        recommendation.setOverrideReason(overrideReason);
        recommendation.setManualOverride(true);

        // Save updated recommendation
        recommendation = recommendationRepository.save(recommendation);

        // Update application summary
        RecommendationSummaryRequest summaryRequest = new RecommendationSummaryRequest();
        summaryRequest.setRecommendationId(recommendation.getId());
        summaryRequest.setRecommendedAmount(recommendation.getRecommendedAmount());
        summaryRequest.setRecommendedPeriod(recommendation.getRecommendedPeriod());
        summaryRequest.setRecommendedInterestRate(recommendation.getRecommendedInterestRate());

        loanApplicationService.updateRecommendationSummary(applicationId, summaryRequest);

        return toResponse(recommendation);
    }

    public RecommendationResponse patchRecommendation(String id, RecommendationPatchRequest request) {
        // Validate input
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("Recommendation ID cannot be null or empty");
        }
        if (request == null) {
            throw new IllegalArgumentException("Patch request cannot be null");
        }

        // Load existing recommendation
        Recommendation recommendation = recommendationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recommendation not found: " + id));

        // Check if archived
        if (recommendation.isArchived()) {
            throw new BusinessException("Cannot update archived recommendation");
        }

        // Load application to check if finalized
        String applicationId = recommendation.getApplicationId();
        LoanApplication application = loanApplicationRepository.findById(applicationId)
            .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + applicationId));

        if (isFinalized(application)) {
            throw new BusinessException("Cannot update recommendation for finalized applications. Current status: " + application.getStatus());
        }

        // Store previous values for audit (only for fields that are being changed)
        Map<String, Object> previousValues = new HashMap<>();
        boolean hasChanges = false;

        // Validate and apply updates only for fields that are provided (partial update)
        if (request.getRecommendedAmount() != null) {
            if (request.getRecommendedAmount() < 10000 || request.getRecommendedAmount() > 10000000) {
                throw new BusinessException("Recommended amount must be between 10,000 and 10,000,000");
            }
            previousValues.put("recommendedAmount", recommendation.getRecommendedAmount());
            recommendation.setRecommendedAmount(request.getRecommendedAmount());
            hasChanges = true;
        }
        if (request.getRecommendedPeriod() != null) {
            if (request.getRecommendedPeriod() < 6 || request.getRecommendedPeriod() > 120) {
                throw new BusinessException("Recommended period must be between 6 and 120 months");
            }
            previousValues.put("recommendedPeriod", recommendation.getRecommendedPeriod());
            recommendation.setRecommendedPeriod(request.getRecommendedPeriod());
            hasChanges = true;
        }
        if (request.getRecommendedInterestRate() != null) {
            if (request.getRecommendedInterestRate() < 5 || request.getRecommendedInterestRate() > 50) {
                throw new BusinessException("Recommended interest rate must be between 5% and 50%");
            }
            previousValues.put("recommendedInterestRate", recommendation.getRecommendedInterestRate());
            recommendation.setRecommendedInterestRate(request.getRecommendedInterestRate());
            hasChanges = true;
        }
        // IMPORTANT: feasibility is now ignored in PATCH requests to prevent manual editing
        // if (request.getFeasibility() != null) {
        //     String feasibility = validateFeasibility(request.getFeasibility());
        //     previousValues.put("feasibility", recommendation.getFeasibility());
        //     recommendation.setFeasibility(feasibility);
        //     hasChanges = true;
        // }
        // Feasibility remains system-generated and cannot be manually changed via PATCH
        if (request.getReasoning() != null) {
            String reasoning = sanitizeText(request.getReasoning(), 500);
            previousValues.put("reasoning", recommendation.getReasoning());
            recommendation.setReasoning(reasoning);
            hasChanges = true;
        }

        if (!hasChanges) {
            throw new BusinessException("No valid fields provided for update");
        }

        // Trim and set audit fields
        String overrideReason = request.getOverrideReason() != null ? sanitizeText(request.getOverrideReason(), 256) : null;
        String updatedBy = request.getUpdatedBy() != null ? sanitizeText(request.getUpdatedBy(), 100) : null;

        recommendation.setPreviousValuesSnapshot(previousValues);
        recommendation.setLastUpdatedBy(updatedBy);
        recommendation.setOverrideReason(overrideReason);
        recommendation.setManualOverride(true);

        // Save updated recommendation
        recommendation = recommendationRepository.save(recommendation);

        // Update application summary if core values changed
        if (previousValues.containsKey("recommendedAmount") ||
            previousValues.containsKey("recommendedPeriod") ||
            previousValues.containsKey("recommendedInterestRate")) {

            RecommendationSummaryRequest summaryRequest = new RecommendationSummaryRequest();
            summaryRequest.setRecommendationId(recommendation.getId());
            summaryRequest.setRecommendedAmount(recommendation.getRecommendedAmount());
            summaryRequest.setRecommendedPeriod(recommendation.getRecommendedPeriod());
            summaryRequest.setRecommendedInterestRate(recommendation.getRecommendedInterestRate());

            loanApplicationService.updateRecommendationSummary(applicationId, summaryRequest);
        }

        return toResponse(recommendation);
    }

    // ═══════════════════════════════════════════════════════════
    // DELETE OPERATIONS (New)
    // ═══════════════════════════════════════════════════════════

    public RecommendationResponse archiveRecommendation(String id, ArchiveRecommendationRequest request) {
        // Validate input
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("Recommendation ID cannot be null or empty");
        }
        if (request == null) {
            throw new IllegalArgumentException("Archive request cannot be null");
        }

        // Sanitize and validate required fields
        String archiveReason = sanitizeText(request.getArchiveReason(), 256);
        if (archiveReason == null || archiveReason.isEmpty()) {
            throw new BusinessException("Archive reason cannot be empty");
        }

        String archivedBy = sanitizeText(request.getArchivedBy(), 100);
        if (archivedBy == null || archivedBy.isEmpty()) {
            throw new BusinessException("Archived by field is required");
        }

        // Load existing recommendation
        Recommendation recommendation = recommendationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recommendation not found: " + id));

        // Check if already archived
        if (recommendation.isArchived()) {
            throw new BusinessException("Recommendation is already archived");
        }

        // Load application to check if finalized
        String applicationId = recommendation.getApplicationId();
        LoanApplication application = loanApplicationRepository.findById(applicationId)
            .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + applicationId));

        if (isFinalized(application)) {
            throw new BusinessException("Cannot archive recommendation for finalized applications. Current status: " + application.getStatus());
        }

        // Archive the recommendation
        recommendation.setArchived(true);
        recommendation.setArchivedAt(Instant.now());
        recommendation.setArchivedBy(archivedBy);
        recommendation.setArchiveReason(archiveReason);

        // Save archived recommendation
        recommendation = recommendationRepository.save(recommendation);

        // Clear recommendation from application summary
        RecommendationSummaryRequest summaryRequest = new RecommendationSummaryRequest();
        summaryRequest.setRecommendationId(null);
        summaryRequest.setRecommendedAmount(null);
        summaryRequest.setRecommendedPeriod(null);
        summaryRequest.setRecommendedInterestRate(null);

        loanApplicationService.updateRecommendationSummary(applicationId, summaryRequest);

        return toResponse(recommendation);
    }

    public void deleteRecommendation(String id) {
        // Validate input
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("Recommendation ID cannot be null or empty");
        }

        // Load existing recommendation
        Recommendation recommendation = recommendationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recommendation not found: " + id));

        // Load application to check if finalized
        String applicationId = recommendation.getApplicationId();
        LoanApplication application = loanApplicationRepository.findById(applicationId)
            .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + applicationId));

        if (isFinalized(application)) {
            throw new BusinessException("Cannot delete recommendation for finalized applications. Current status: " + application.getStatus());
        }

        // Only allow deletion of archived recommendations or failed ones
        if (!recommendation.isArchived() && recommendation.getStatus() != RecommendationStatus.FAILED) {
            throw new BusinessException("Only archived or failed recommendations can be permanently deleted. Please archive first.");
        }

        // Delete the recommendation
        recommendationRepository.delete(recommendation);

        // Clear recommendation from application summary if this was the active one
        if (application.getRecommendationId() != null && application.getRecommendationId().equals(id)) {
            RecommendationSummaryRequest summaryRequest = new RecommendationSummaryRequest();
            summaryRequest.setRecommendationId(null);
            summaryRequest.setRecommendedAmount(null);
            summaryRequest.setRecommendedPeriod(null);
            summaryRequest.setRecommendedInterestRate(null);

            loanApplicationService.updateRecommendationSummary(applicationId, summaryRequest);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PRIVATE HELPER METHODS (Existing + Enhanced)
    // ═══════════════════════════════════════════════════════════

    /**
     * Validates and normalizes feasibility value to uppercase.
     * Only allows: HIGH, MEDIUM, LOW
     *
     * @param feasibility the feasibility value to validate
     * @return normalized feasibility (uppercase)
     * @throws BusinessException if value is not valid
     */
    private String validateFeasibility(String feasibility) {
        if (feasibility == null || feasibility.trim().isEmpty()) {
            throw new BusinessException("Feasibility cannot be empty");
        }

        String normalized = feasibility.trim().toUpperCase();

        if (!normalized.equals("HIGH") && !normalized.equals("MEDIUM") && !normalized.equals("LOW")) {
            throw new BusinessException("Feasibility must be HIGH, MEDIUM, or LOW. Received: " + feasibility);
        }

        return normalized;
    }

    /**
     * Sanitizes and trims text input, enforcing max length.
     *
     * @param text the text to sanitize
     * @param maxLength maximum allowed length
     * @return trimmed text
     * @throws BusinessException if text exceeds max length after trimming
     */
    private String sanitizeText(String text, int maxLength) {
        if (text == null) {
            return null;
        }

        String trimmed = text.trim();

        if (trimmed.isEmpty()) {
            return null; // Treat empty strings as null
        }

        if (trimmed.length() > maxLength) {
            throw new BusinessException("Text cannot exceed " + maxLength + " characters. Received: " + trimmed.length() + " characters");
        }

        return trimmed;
    }

    /**
     * Validates recommendation update rules.
     * Ensures values are sensible and meet business requirements.
     */
    private void validateRecommendationUpdateRules(RecommendationUpdateRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Update request cannot be null");
        }

        // Validate feasibility if provided
        if (request.getFeasibility() != null && !request.getFeasibility().trim().isEmpty()) {
            validateFeasibility(request.getFeasibility());
        }

        // Validate amount, period, and rate are sensible numbers
        if (request.getRecommendedAmount() != null &&
            (request.getRecommendedAmount() < 10000 || request.getRecommendedAmount() > 10000000)) {
            throw new BusinessException("Recommended amount must be between 10,000 and 10,000,000");
        }

        if (request.getRecommendedPeriod() != null &&
            (request.getRecommendedPeriod() < 6 || request.getRecommendedPeriod() > 120)) {
            throw new BusinessException("Recommended period must be between 6 and 120 months");
        }

        if (request.getRecommendedInterestRate() != null &&
            (request.getRecommendedInterestRate() < 5 || request.getRecommendedInterestRate() > 50)) {
            throw new BusinessException("Recommended interest rate must be between 5% and 50%");
        }

        // Override reason is required when doing manual updates
        if (request.getOverrideReason() == null || request.getOverrideReason().trim().isEmpty()) {
            throw new BusinessException("Override reason is required for manual updates");
        }
    }

    /**
     * Validates recommendation eligibility for generation.
     * Checks if required applicant and application data is available.
     */
    private void validateRecommendationEligibility(Applicant applicant, LoanApplication application) {
        if (application.getAmount() == null || application.getAmount() <= 0) {
            throw new BusinessException("Loan amount must be valid and positive");
        }

        // NOTE: termMonths is OPTIONAL - can be null for amount-only applications
        // If missing, recommendation engine will generate it
        if (application.getTermMonths() != null && application.getTermMonths() <= 0) {
            throw new BusinessException("If provided, loan term must be greater than zero");
        }

        if (applicant.getMonthlyIncome() == null || applicant.getMonthlyIncome() <= 0) {
            throw new BusinessException("Applicant monthly income must be valid and positive");
        }

        if (applicant.getEmploymentStatus() == null || applicant.getEmploymentStatus().trim().isEmpty()) {
            throw new BusinessException("Applicant employment status is required");
        }

        if (application.getRiskScore() == null) {
            throw new BusinessException("Risk score is required for recommendation generation");
        }

        if (application.getRiskLevel() == null || application.getRiskLevel().trim().isEmpty()) {
            throw new BusinessException("Risk level is required for recommendation generation");
        }
    }

    private Recommendation generateRecommendationLogic(LoanApplication application, Applicant applicant) {
        // Base values from loan application
        Double requestedAmount = application.getAmount();
        Integer requestedTerm = application.getTermMonths();
        Double baseRate = parseInterestRate(application.getInterestRate());

        // Risk values
        Double riskScore = application.getRiskScore();
        String riskLevel = application.getRiskLevel();

        // Ensure riskLevel is not null (should be validated earlier, but adding defensive check)
        if (riskLevel == null) {
            throw new BusinessException("Risk level cannot be null");
        }

        // Determine if this is amount-only mode (no custom proposal)
        boolean isAmountOnlyMode = requestedTerm == null && application.getInterestRate() == null;

        // Initial recommendation based on risk level
        double recommendedAmount = requestedAmount;
        int recommendedPeriod;
        double recommendedInterestRate = baseRate;
        String feasibility;

        // If termMonths was not provided, generate safe default based on risk level
        if (requestedTerm == null) {
            requestedTerm = switch (riskLevel.trim().toUpperCase()) {
                case "LOW" -> 24;      // 24 months for low risk
                case "MEDIUM" -> 18;   // 18 months for medium risk
                case "HIGH" -> 12;     // 12 months for high risk
                default -> throw new BusinessException("Invalid risk level: " + riskLevel);
            };
        }

        switch (riskLevel.trim().toUpperCase()) {
            case "LOW":
                feasibility = "HIGH";
                recommendedAmount = requestedAmount;
                recommendedPeriod = requestedTerm;
                recommendedInterestRate = Math.max(baseRate - 1.0, 8.0);
                break;
            case "MEDIUM":
                feasibility = "MEDIUM";
                recommendedAmount = requestedAmount * 0.85;
                recommendedPeriod = Math.min(requestedTerm + 6, 60);
                recommendedInterestRate = baseRate + 1.5;
                break;
            case "HIGH":
                feasibility = "LOW";
                recommendedAmount = requestedAmount * 0.60;
                recommendedPeriod = Math.min(requestedTerm + 12, 72);
                recommendedInterestRate = baseRate + 3.0;
                break;
            default:
                throw new BusinessException("Invalid risk level: " + riskLevel);
        }

        // Additional adjustments
        if (applicant.getMonthlyIncome() < 50000) {
            recommendedAmount = recommendedAmount * 0.90; // Reduce by 10%
        }

        if (application.getHasCoSigner() != null && application.getHasCoSigner()) {
            recommendedAmount = recommendedAmount * 1.05; // Increase by 5%
        }

        if (applicant.getCreditScore() != null && applicant.getCreditScore() > 700) {
            recommendedInterestRate = recommendedInterestRate - 0.5;
        }

        if (applicant.getExistingLoans() != null && applicant.getExistingLoans() >= 3) {
            recommendedAmount = recommendedAmount * 0.90; // Reduce by 10%
        }

        // Ensure minimum amount
        recommendedAmount = Math.max(recommendedAmount, 50000);

        // Round values
        recommendedAmount = roundToTwoDecimals(recommendedAmount);
        recommendedInterestRate = roundToTwoDecimals(recommendedInterestRate);

        // Create reasoning that reflects whether this was amount-only or custom proposal
        String reasoning = createReasoning(riskLevel, feasibility, isAmountOnlyMode, application.getTermMonths() != null);

        // Create input snapshot
        Map<String, Object> inputSnapshot = createInputSnapshot(
                requestedAmount, application.getTermMonths(), baseRate, riskScore, riskLevel,
                applicant.getMonthlyIncome(), applicant.getEmploymentStatus(),
                applicant.getCreditScore(), applicant.getExistingLoans(),
                application.getHasCoSigner());

        // Create recommendation entity
        Recommendation recommendation = new Recommendation();
        recommendation.setApplicationId(application.getId());
        recommendation.setApplicantId(application.getApplicantId());
        recommendation.setApplicationNumber(application.getApplicationNumber());
        recommendation.setApplicantNumber(applicant.getApplicantNumber());
        recommendation.setRecommendedAmount(recommendedAmount);
        recommendation.setRecommendedPeriod(recommendedPeriod);
        recommendation.setRecommendedInterestRate(recommendedInterestRate);
        recommendation.setFeasibility(feasibility);
        recommendation.setReasoning(reasoning);
        recommendation.setStatus(RecommendationStatus.GENERATED);
        recommendation.setModelVersion("RULE_BASED_REC_V1");
        recommendation.setInputSnapshot(inputSnapshot);

        Instant now = Instant.now();
        recommendation.setGeneratedAt(now);
        recommendation.setCreatedAt(now);
        recommendation.setUpdatedAt(now);

        return recommendation;
    }

    private void validateRequiredFields(LoanApplication application, Applicant applicant) {
        validateRecommendationEligibility(applicant, application);
    }

    private boolean isFinalized(LoanApplication application) {
        return application.getStatus() == LoanStatus.APPROVED ||
               application.getStatus() == LoanStatus.REJECTED ||
               application.getStatus() == LoanStatus.CANCELLED;
    }

    private Double parseInterestRate(Double interestRate) {
        if (interestRate == null) {
            return 12.0; // Default rate
        }
        return interestRate;
    }

    private double roundToTwoDecimals(double value) {
        return BigDecimal.valueOf(value)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private String createReasoning(String riskLevel, String feasibility, boolean isAmountOnlyMode, boolean hasCustomProposal) {
        if (isAmountOnlyMode) {
            return String.format("Application was submitted with amount only. Based on the assessed %s risk level and applicant profile, " +
                    "the system recommends repayment terms and interest rate at %s feasibility level to balance affordability and risk mitigation.",
                    riskLevel, feasibility.toLowerCase());
        } else if (hasCustomProposal) {
            return String.format("Custom loan proposal was evaluated against the assessed %s risk level. " +
                    "The system recommends adjusted terms and interest rate at %s feasibility level based on risk assessment results.",
                    riskLevel, feasibility.toLowerCase());
        } else {
            return String.format("Based on the assessed %s risk level, the system recommends a %s feasibility loan with adjusted terms and interest rate according to the risk assessment.",
                    riskLevel, feasibility.toLowerCase());
        }
    }

    private Map<String, Object> createInputSnapshot(Double requestedAmount, Integer requestedTerm, Double baseRate,
                                                  Double riskScore, String riskLevel, Double monthlyIncome,
                                                  String employmentStatus, Integer creditScore, Integer existingLoans,
                                                  Boolean hasCoSigner) {
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("requestedAmount", requestedAmount);
        snapshot.put("requestedTerm", requestedTerm);
        snapshot.put("baseRate", baseRate);
        snapshot.put("riskScore", riskScore);
        snapshot.put("riskLevel", riskLevel);
        snapshot.put("monthlyIncome", monthlyIncome);
        snapshot.put("employmentStatus", employmentStatus);
        snapshot.put("creditScore", creditScore);
        snapshot.put("existingLoans", existingLoans);
        snapshot.put("hasCoSigner", hasCoSigner);
        return snapshot;
    }

    private RecommendationResponse toResponse(Recommendation recommendation) {
        if (recommendation == null) {
            throw new IllegalArgumentException("Recommendation cannot be null");
        }

        RecommendationResponse response = new RecommendationResponse();
        response.setId(recommendation.getId());
        response.setApplicationId(recommendation.getApplicationId());
        response.setApplicantId(recommendation.getApplicantId());
        response.setApplicationNumber(recommendation.getApplicationNumber());
        response.setApplicantNumber(recommendation.getApplicantNumber());
        response.setRecommendedAmount(recommendation.getRecommendedAmount());
        response.setRecommendedPeriod(recommendation.getRecommendedPeriod());
        response.setRecommendedInterestRate(recommendation.getRecommendedInterestRate());
        response.setFeasibility(recommendation.getFeasibility());
        response.setReasoning(recommendation.getReasoning());
        response.setStatus(recommendation.getStatus() != null ? recommendation.getStatus().name() : "UNKNOWN");
        response.setModelVersion(recommendation.getModelVersion());
        response.setInputSnapshot(recommendation.getInputSnapshot());
        response.setGeneratedAt(recommendation.getGeneratedAt());
        response.setCreatedAt(recommendation.getCreatedAt());
        response.setUpdatedAt(recommendation.getUpdatedAt());

        // Set new fields
        response.setArchived(recommendation.isArchived());
        response.setArchivedAt(recommendation.getArchivedAt());
        response.setArchivedBy(recommendation.getArchivedBy());
        response.setArchiveReason(recommendation.getArchiveReason());
        response.setLastUpdatedBy(recommendation.getLastUpdatedBy());
        response.setOverrideReason(recommendation.getOverrideReason());
        response.setPreviousValuesSnapshot(recommendation.getPreviousValuesSnapshot());
        response.setManualOverride(recommendation.isManualOverride());

        return response;
    }

    /**
     * Helper method: Determines if application is in amount-only mode
     * (no custom proposal fields provided)
     */
    private boolean isAmountOnlyApplication(LoanApplication application) {
        return application.getTermMonths() == null &&
               application.getInterestRate() == null &&
               (application.getPurpose() == null || application.getPurpose().trim().isEmpty());
    }

    /**
     * Helper method: Determines if application has a custom proposal
     * (at least some proposal fields provided)
     */
    private boolean isCustomProposalApplication(LoanApplication application) {
        return application.getTermMonths() != null ||
               application.getInterestRate() != null ||
               (application.getPurpose() != null && !application.getPurpose().trim().isEmpty());
    }

    /**
     * Validation method for manual recommendation updates (excludes feasibility)
     */
    private void validateRecommendationManualUpdateRules(RecommendationManualUpdateRequest request) {
        // Validate recommended amount
        if (request.getRecommendedAmount() == null) {
            throw new BusinessException("Recommended amount is required");
        }
        if (request.getRecommendedAmount() < 10000 || request.getRecommendedAmount() > 10000000) {
            throw new BusinessException("Recommended amount must be between 10,000 and 10,000,000");
        }

        // Validate recommended period
        if (request.getRecommendedPeriod() == null) {
            throw new BusinessException("Recommended period is required");
        }
        if (request.getRecommendedPeriod() < 6 || request.getRecommendedPeriod() > 120) {
            throw new BusinessException("Recommended period must be between 6 and 120 months");
        }

        // Validate recommended interest rate
        if (request.getRecommendedInterestRate() == null) {
            throw new BusinessException("Recommended interest rate is required");
        }
        if (request.getRecommendedInterestRate() < 5 || request.getRecommendedInterestRate() > 50) {
            throw new BusinessException("Recommended interest rate must be between 5% and 50%");
        }

        // Validate override reason (required for manual updates)
        if (request.getOverrideReason() == null || request.getOverrideReason().trim().isEmpty()) {
            throw new BusinessException("Override reason is required for manual updates");
        }
        if (request.getOverrideReason().trim().length() > 256) {
            throw new BusinessException("Override reason cannot exceed 256 characters");
        }

        // Validate updated by
        if (request.getUpdatedBy() == null || request.getUpdatedBy().trim().isEmpty()) {
            throw new BusinessException("Updated by is required");
        }
        if (request.getUpdatedBy().trim().length() > 100) {
            throw new BusinessException("Updated by cannot exceed 100 characters");
        }

        // Validate reasoning if provided
        if (request.getReasoning() != null && request.getReasoning().length() > 500) {
            throw new BusinessException("Reasoning cannot exceed 500 characters");
        }
    }
}