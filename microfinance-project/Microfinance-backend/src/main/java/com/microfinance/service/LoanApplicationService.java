package com.microfinance.service;

import com.microfinance.dto.ApplicationDetailsResponse;
import com.microfinance.dto.LoanApplicationRequest;
import com.microfinance.dto.RecommendationSummaryRequest;
import com.microfinance.dto.RiskAssessmentSummaryRequest;
import com.microfinance.dto.StatusUpdateRequest;
import com.microfinance.exception.BusinessException;
import com.microfinance.exception.ResourceNotFoundException;
import com.microfinance.model.Applicant;
import com.microfinance.model.LoanApplication;
import com.microfinance.model.LoanStatus;
import com.microfinance.model.RecommendationStatus;
import com.microfinance.model.RiskStatus;
import com.microfinance.model.StatusHistoryEntry;
import com.microfinance.repository.ApplicantRepository;
import com.microfinance.repository.LoanApplicationRepository;
import com.microfinance.repository.RiskAssessmentRepository;
import com.microfinance.repository.RecommendationRepository;
import com.microfinance.repository.RepaymentInstallmentRepository;
import com.microfinance.repository.RepaymentPaymentRepository;
import com.microfinance.security.RoleMapper;
import com.microfinance.security.services.UserDetailsImpl;
import com.microfinance.service.RepaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class LoanApplicationService {

    private final LoanApplicationRepository loanApplicationRepo;
    private final ApplicantRepository applicantRepo;
    private final RepaymentService repaymentService;
    private final RiskAssessmentRepository riskAssessmentRepo;
    private final RecommendationRepository recommendationRepo;
    private final RepaymentInstallmentRepository repaymentInstallmentRepo;
    private final RepaymentPaymentRepository repaymentPaymentRepo;

    // ── List ──────────────────────────────────────────────────

    public List<LoanApplication> list(String statusStr) {
        if (statusStr == null || statusStr.isBlank()) {
            return loanApplicationRepo.findAll();
        }
        LoanStatus status = parseStatus(statusStr);
        return loanApplicationRepo.findByStatus(status);
    }

    // ── Get ───────────────────────────────────────────────────

    public LoanApplication getById(String id) {
        return loanApplicationRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + id));
    }

    /** Returns combined { application, applicant } used by the Review page */
    public ApplicationDetailsResponse getDetails(String id) {
        LoanApplication app = getById(id);
        Applicant applicant = applicantRepo.findById(app.getApplicantId())
                .orElse(null);
        return new ApplicationDetailsResponse(app, applicant);
    }

    public List<LoanApplication> getByApplicant(String applicantId) {
        return loanApplicationRepo.findByApplicantId(applicantId);
    }

    // ── Create ────────────────────────────────────────────────

    public LoanApplication create(LoanApplicationRequest req) {
        UserDetailsImpl currentUser = getCurrentUser();
        String currentRole = RoleMapper.normalize(currentUser.getRole());
        if (!RoleMapper.isAdmin(currentRole) && !RoleMapper.isLoanOfficer(currentRole) && !RoleMapper.isBankManager(currentRole)) {
            throw new BusinessException("Only ADMIN, LOAN_OFFICER, and BANK_MANAGER can create applications");
        }

        // Verify applicant exists
        if (!applicantRepo.existsById(req.getApplicantId())) {
            throw new ResourceNotFoundException("Applicant not found: " + req.getApplicantId());
        }

        // Validate business rules
        validateLoanBusinessRules(req);

        LoanApplication app = new LoanApplication();
        mapToEntity(req, app);
        app.setStatus(LoanStatus.PENDING);
        app.setCreatedByUserId(currentUser.getId());
        app.setCreatedByName(currentUser.getFullName());
        app.setCreatedByRole(currentRole);

        // Generate user-friendly application number
        app.setApplicationNumber(generateApplicationNumber());

        // Initialize hybrid workflow fields with default values
        app.setRiskStatus(RiskStatus.NOT_ASSESSED);
        app.setRecommendationStatus(RecommendationStatus.NOT_GENERATED);

        // ** FIX: Manually set timestamps **
        Instant now = Instant.now();
        app.setCreatedAt(now);
        app.setUpdatedAt(now);

        // Seed history
        StatusHistoryEntry entry = new StatusHistoryEntry(
                "PENDING", now, "staff", "Created", "");
        app.getStatusHistory().add(entry);

        return loanApplicationRepo.save(app);
    }

    // ── Update ────────────────────────────────────────────────

    public LoanApplication update(String id, LoanApplicationRequest req) {
        LoanApplication existing = getById(id);
        ensureCanEditApplication(existing);

        // Prevent updating finalized applications
        if (isFinalized(existing)) {
            throw new BusinessException("Finalized applications cannot be edited. Current status: " + existing.getStatus());
        }

        // Verify applicant exists
        if (!applicantRepo.existsById(req.getApplicantId())) {
            throw new ResourceNotFoundException("Applicant not found: " + req.getApplicantId());
        }

        // Validate business rules
        validateLoanBusinessRules(req);

        mapToEntity(req, existing);

        // ** FIX: Manually set updated timestamp **
        existing.setUpdatedAt(Instant.now());

        return loanApplicationRepo.save(existing);
    }

    // ── Delete ────────────────────────────────────────────────

    /**
     * Delete loan application and cascade-archive/delete all related data
     * - Soft-delete RiskAssessments
     * - Archive Recommendations
     * - Archive RepaymentInstallments
     * - Delete RepaymentPayments
     * - Delete LoanApplication
     *
     * Uses @Transactional to ensure all-or-nothing behavior
     */
    @Transactional
    public Map<String, Object> deleteApplicationWithCascade(String id) {
        if (!loanApplicationRepo.existsById(id)) {
            throw new ResourceNotFoundException("Application not found: " + id);
        }

        LoanApplication app = getById(id);

        UserDetailsImpl currentUser = getCurrentUser();
        String currentRole = RoleMapper.normalize(currentUser.getRole());

        // CHANGED: delete is stronger than cancel -> ADMIN or BANK_MANAGER only
        if (!RoleMapper.isAdmin(currentRole) && !RoleMapper.isBankManager(currentRole)) {
            throw new BusinessException("Only ADMIN or BANK_MANAGER can delete applications");
        }

        // CHANGED: keep maker-checker for manager
        if (!RoleMapper.isAdmin(currentRole) && Objects.equals(currentUser.getId(), app.getCreatedByUserId())) {
            throw new BusinessException("BANK_MANAGER cannot delete an application created by themselves");
        }

        // Prevent deleting finalized applications
        if (isFinalized(app)) {
            throw new BusinessException("Finalized applications cannot be deleted. Current status: " + app.getStatus());
        }

        // Cascade delete related data
        int riskAssessmentsArchived = archiveRiskAssessmentsByApplicationId(id);
        int recommendationsArchived = archiveRecommendationsByApplicationId(id);
        int repaymentInstallmentsArchived = archiveRepaymentInstallmentsByApplicationId(id);
        int repaymentPaymentsDeleted = removeRepaymentPaymentsByApplicationId(id);

        // Delete the application itself
        loanApplicationRepo.deleteById(id);

        // Build response
        Map<String, Object> result = new HashMap<>();
        result.put("applicationId", id);
        result.put("riskAssessmentsArchived", riskAssessmentsArchived);
        result.put("recommendationsArchived", recommendationsArchived);
        result.put("repaymentInstallmentsArchived", repaymentInstallmentsArchived);
        result.put("repaymentPaymentsDeleted", repaymentPaymentsDeleted);
        result.put("totalRelatedRecordsUpdated", riskAssessmentsArchived + recommendationsArchived +
                repaymentInstallmentsArchived + repaymentPaymentsDeleted);
        result.put("message", "Application and all related records have been successfully deleted");

        return result;
    }

    // ── Helper Methods for Cascade Deletion ────────────────────

    /**
     * Soft-delete all RiskAssessments for an application
     */
    private int archiveRiskAssessmentsByApplicationId(String applicationId) {
        List<com.microfinance.model.RiskAssessment> riskAssessments =
                riskAssessmentRepo.findByApplicationIdOrderByAssessedAtDesc(applicationId);

        int count = 0;
        for (com.microfinance.model.RiskAssessment ra : riskAssessments) {
            if (!ra.getDeleted()) {
                ra.setDeleted(true);
                ra.setDeletedAt(Instant.now());
                ra.setDeleteReason("Deleted due to parent application deletion");
                riskAssessmentRepo.save(ra);
                count++;
            }
        }
        return count;
    }

    /**
     * Archive all Recommendations for an application
     */
    private int archiveRecommendationsByApplicationId(String applicationId) {
        List<com.microfinance.model.Recommendation> recommendations =
                recommendationRepo.findByApplicationIdOrderByGeneratedAtDesc(applicationId);

        int count = 0;
        for (com.microfinance.model.Recommendation rec : recommendations) {
            if (!rec.isArchived()) {
                rec.setArchived(true);
                rec.setArchivedAt(Instant.now());
                rec.setArchiveReason("Archived due to parent application deletion");
                recommendationRepo.save(rec);
                count++;
            }
        }
        return count;
    }

    /**
     * Archive all RepaymentInstallments for an application
     */
    private int archiveRepaymentInstallmentsByApplicationId(String applicationId) {
        List<com.microfinance.model.RepaymentInstallment> installments =
                repaymentInstallmentRepo.findByApplicationIdOrderByInstallmentNumberAsc(applicationId);

        int count = 0;
        for (com.microfinance.model.RepaymentInstallment installment : installments) {
            if (!installment.isArchived()) {
                installment.setArchived(true);
                repaymentInstallmentRepo.save(installment);
                count++;
            }
        }
        return count;
    }

    /**
     * Delete all RepaymentPayments for an application
     */
    private int removeRepaymentPaymentsByApplicationId(String applicationId) {
        List<com.microfinance.model.RepaymentPayment> payments =
                repaymentPaymentRepo.findByApplicationId(applicationId);

        int count = payments.size();
        if (count > 0) {
            repaymentPaymentRepo.deleteAll(payments);
        }
        return count;
    }

    // ── Status Transition ─────────────────────────────────────

    public LoanApplication updateStatus(String id, StatusUpdateRequest req) {
        LoanApplication app = getById(id);
        ensureCanChangeStatus(app, req.getStatus());
        LoanStatus oldStatus = app.getStatus();
        LoanStatus newStatus = parseStatus(req.getStatus());

        // Prevent status updates on finalized applications
        if (isFinalized(app)) {
            throw new BusinessException("Cannot update status of a finalized application. Current status: " + app.getStatus());
        }

        // Resolve effective reason (cancelReason > reason > note)
        String effectiveReason = req.effectiveReason();

        // Business rules for cancel / reject reason
        if ((newStatus == LoanStatus.CANCELLED || newStatus == LoanStatus.REJECTED)
                && effectiveReason.isBlank()) {
            throw new BusinessException("Reason is required when cancelling or rejecting an application.");
        }

        // Workflow validation for APPROVED/REJECTED status
        if (newStatus == LoanStatus.APPROVED || newStatus == LoanStatus.REJECTED) {
            if (app.getRiskStatus() != RiskStatus.ASSESSED) {
                throw new BusinessException("Risk assessment must be completed before approval or rejection. Current risk status: " + app.getRiskStatus());
            }
            if (app.getRecommendationStatus() != RecommendationStatus.GENERATED) {
                throw new BusinessException("Recommendation must be generated before approval or rejection. Current recommendation status: " + app.getRecommendationStatus());
            }
        }

        // Validate allowed transitions
        validateTransition(app.getStatus(), newStatus);

        app.setStatus(newStatus);
        if (newStatus == LoanStatus.CANCELLED || newStatus == LoanStatus.REJECTED) {
            app.setCancelReason(effectiveReason);
        }

        // Store decision notes for final status changes
        if (newStatus == LoanStatus.APPROVED || newStatus == LoanStatus.REJECTED || newStatus == LoanStatus.CANCELLED) {
            if (req.getNotes() != null && !req.getNotes().isBlank()) {
                app.setDecisionNotes(req.getNotes());
            }
        }

        UserDetailsImpl currentUser = getCurrentUser();
        String actor = (req.getActor() != null && !req.getActor().isBlank()) ? req.getActor() : currentUser.getFullName();
        String actionLabel = "Moved to " + newStatus.name();

        StatusHistoryEntry entry = new StatusHistoryEntry(
                newStatus.name(),
                Instant.now(),
                actor,
                actionLabel,
                effectiveReason
        );
        app.getStatusHistory().add(entry);

        LoanApplication saved = loanApplicationRepo.save(app);

        if (newStatus == LoanStatus.APPROVED && oldStatus != LoanStatus.APPROVED) {
            repaymentService.generateScheduleForApprovedApplication(saved.getId());
        }

        return saved;
    }

    // ── Helpers ───────────────────────────────────────────────

    private boolean isFinalized(LoanApplication application) {
        return application != null && application.getStatus() != null &&
               (application.getStatus() == LoanStatus.APPROVED ||
                application.getStatus() == LoanStatus.REJECTED ||
                application.getStatus() == LoanStatus.CANCELLED);
    }

    /**
     * Generates a unique application number in format APP-YYYY-NNNN
     * Optimized to avoid loading all applications into memory
     */
    private String generateApplicationNumber() {
        int currentYear = java.time.Year.now().getValue();

        // Use repository count + 1 as a simple, memory-efficient approach
        // This works for sequential generation and avoids OOM issues
        long count = loanApplicationRepo.count();
        int nextNumber = (int) (count + 1);

        return String.format("APP-%d-%04d", currentYear, nextNumber);
    }

    private void mapToEntity(LoanApplicationRequest req, LoanApplication app) {
        app.setApplicantId(req.getApplicantId());
        app.setAmount(req.getAmount());
        app.setTermMonths(req.getTermMonths());
        app.setInterestRate(req.getInterestRate());
        app.setPurpose(req.getPurpose());
        app.setHasCoSigner(req.getHasCoSigner());
        app.setNotes(req.getNotes() != null ? req.getNotes() : "");
    }

    private LoanStatus parseStatus(String s) {
        try {
            return LoanStatus.valueOf(s.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid status value: " + s +
                    ". Allowed: DRAFT, SUBMITTED, RETURNED, PENDING, REVIEW, APPROVED, REJECTED, CANCELLED");
        }
    }

    private void validateTransition(LoanStatus current, LoanStatus next) {
        // CANCELLED is always allowed as an exit
        if (next == LoanStatus.CANCELLED) return;

        boolean valid = switch (current) {
            case DRAFT      -> next == LoanStatus.SUBMITTED;  // Legacy: DRAFT applications can move to SUBMITTED
            case SUBMITTED  -> next == LoanStatus.REVIEW || next == LoanStatus.RETURNED;
            case RETURNED   -> next == LoanStatus.SUBMITTED;
            case PENDING    -> next == LoanStatus.REVIEW || next == LoanStatus.SUBMITTED;
            case REVIEW     -> next == LoanStatus.APPROVED || next == LoanStatus.REJECTED;
            case APPROVED, REJECTED -> false;
            case CANCELLED  -> false;
        };

        if (!valid) {
            throw new BusinessException(
                    "Cannot transition from " + current + " to " + next +
                    ". Allowed flow: PENDING → REVIEW → APPROVED/REJECTED (+ CANCEL anytime, RETURNED for corrections)");
        }
    }

    // ── Hybrid Workflow Methods ──────────────────────────────────

    /**
     * Updates the application with risk assessment summary data.
     * Automatically transitions from SUBMITTED to REVIEW if risk assessment is completed.
     */
    public LoanApplication updateRiskAssessmentSummary(String applicationId, RiskAssessmentSummaryRequest req) {
        LoanApplication app = getById(applicationId);
        ensureCanManageRiskAndRecommendation();

        // Prevent updates to finalized applications
        if (isFinalized(app)) {
            throw new BusinessException("Cannot update risk assessment for finalized applications. Current status: " + app.getStatus());
        }

        // Update risk assessment fields
        app.setRiskStatus(RiskStatus.ASSESSED);
        app.setRiskAssessmentId(req.getRiskAssessmentId());
        app.setRiskScore(req.getRiskScore());
        app.setRiskLevel(req.getRiskLevel());

        // Auto-transition from SUBMITTED or PENDING to REVIEW when risk assessment is completed
        if (app.getStatus() == LoanStatus.SUBMITTED || app.getStatus() == LoanStatus.PENDING) {
            app.setStatus(LoanStatus.REVIEW);

            // Add to status history
            StatusHistoryEntry entry = new StatusHistoryEntry(
                    LoanStatus.REVIEW.name(),
                    Instant.now(),
                    "system",
                    "Moved to Review (Risk Assessment Completed)",
                    "Risk assessment completed with score: " + req.getRiskScore()
            );
            app.getStatusHistory().add(entry);
        }

        app.setUpdatedAt(Instant.now());
        return loanApplicationRepo.save(app);
    }

    /**
     * Updates the application with recommendation engine summary data.
     */
    public LoanApplication updateRecommendationSummary(String applicationId, RecommendationSummaryRequest req) {
        LoanApplication app = getById(applicationId);
        ensureCanManageRiskAndRecommendation();

        // Prevent updates to finalized applications
        if (isFinalized(app)) {
            throw new BusinessException("Cannot update recommendation for finalized applications. Current status: " + app.getStatus());
        }

        // Validate that risk assessment is completed
        if (app.getRiskStatus() != RiskStatus.ASSESSED) {
            throw new BusinessException("Risk assessment must be completed before generating recommendations");
        }

        // Update recommendation fields
        app.setRecommendationStatus(RecommendationStatus.GENERATED);
        app.setRecommendationId(req.getRecommendationId());
        app.setRecommendedAmount(req.getRecommendedAmount());
        app.setRecommendedPeriod(req.getRecommendedPeriod());
        app.setRecommendedInterestRate(req.getRecommendedInterestRate());

        app.setUpdatedAt(Instant.now());
        return loanApplicationRepo.save(app);
    }

    /**
     * Sets risk assessment status to ASSESSING (when processing starts)
     */
    public LoanApplication setRiskAssessmentInProgress(String applicationId) {
        LoanApplication app = getById(applicationId);
        ensureCanManageRiskAndRecommendation();

        // Prevent updates to finalized applications
        if (isFinalized(app)) {
            throw new BusinessException("Cannot update risk assessment for finalized applications. Current status: " + app.getStatus());
        }

        app.setRiskStatus(RiskStatus.ASSESSING);
        app.setUpdatedAt(Instant.now());
        return loanApplicationRepo.save(app);
    }

    /**
     * Sets risk assessment status to FAILED
     */
    public LoanApplication setRiskAssessmentFailed(String applicationId, String reason) {
        LoanApplication app = getById(applicationId);
        ensureCanManageRiskAndRecommendation();

        // Prevent updates to finalized applications
        if (isFinalized(app)) {
            throw new BusinessException("Cannot update risk assessment for finalized applications. Current status: " + app.getStatus());
        }

        app.setRiskStatus(RiskStatus.FAILED);
        app.setUpdatedAt(Instant.now());
        return loanApplicationRepo.save(app);
    }

    /**
     * Sets recommendation status to GENERATING (when processing starts)
     */
    public LoanApplication setRecommendationInProgress(String applicationId) {
        LoanApplication app = getById(applicationId);
        ensureCanManageRiskAndRecommendation();

        // Prevent updates to finalized applications
        if (isFinalized(app)) {
            throw new BusinessException("Cannot update recommendation for finalized applications. Current status: " + app.getStatus());
        }

        // Validate that risk assessment is completed
        if (app.getRiskStatus() != RiskStatus.ASSESSED) {
            throw new BusinessException("Risk assessment must be completed before generating recommendations");
        }

        app.setRecommendationStatus(RecommendationStatus.GENERATING);
        app.setUpdatedAt(Instant.now());
        return loanApplicationRepo.save(app);
    }

    /**
     * Sets recommendation status to FAILED
     */
    public LoanApplication setRecommendationFailed(String applicationId, String reason) {
        LoanApplication app = getById(applicationId);
        ensureCanManageRiskAndRecommendation();

        // Prevent updates to finalized applications
        if (isFinalized(app)) {
            throw new BusinessException("Cannot update recommendation for finalized applications. Current status: " + app.getStatus());
        }

        app.setRecommendationStatus(RecommendationStatus.FAILED);
        app.setUpdatedAt(Instant.now());
        return loanApplicationRepo.save(app);
    }

    // ── Business Validation Rules ─────────────────────────────

    /**
     * Validates business rules for loan application data
     * Enforces term, rate, amount, and purpose constraints
     */
    private void validateLoanBusinessRules(LoanApplicationRequest req) {
        // VALIDATION 1: Amount must be within acceptable bounds (REQUIRED)
        if (req.getAmount() == null) {
            throw new BusinessException("Loan amount is required");
        }
        if (req.getAmount() < 1000 || req.getAmount() > 10000000) {
            throw new BusinessException("Loan amount must be between 1,000 and 10,000,000. Current value: " + req.getAmount());
        }

        // VALIDATION 2: Term months must only allow specific values (OPTIONAL)
        if (req.getTermMonths() != null) {
            List<Integer> allowedTerms = List.of(6, 12, 18, 24, 36, 48, 60);
            if (!allowedTerms.contains(req.getTermMonths())) {
                throw new BusinessException("Term must be one of: 6, 12, 18, 24, 36, 48, 60 months. Current value: " + req.getTermMonths());
            }
        }

        // VALIDATION 3: Interest rate must be between 0.1 and 50 (OPTIONAL)
        if (req.getInterestRate() != null) {
            if (req.getInterestRate() < 0.1 || req.getInterestRate() > 50.0) {
                throw new BusinessException("Interest rate must be between 0.1% and 50%. Current value: " + req.getInterestRate() + "%");
            }
        }

        // VALIDATION 4: Purpose must be valid enum value (OPTIONAL)
        if (req.getPurpose() != null && !req.getPurpose().trim().isEmpty()) {
            List<String> validPurposes = List.of("Auto", "Business", "Education", "Home", "Other");
            if (!validPurposes.contains(req.getPurpose())) {
                throw new BusinessException("Invalid loan purpose. Must be one of: Auto, Business, Education, Home, Other. Current value: " + req.getPurpose());
            }
        }

        // VALIDATION 5: HasCoSigner is optional (OPTIONAL)
        // If null => valid (not specified). If provided as true/false => valid by type system
    }

    private UserDetailsImpl getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserDetailsImpl user)) {
            throw new BusinessException("Unauthorized: no authenticated user context");
        }
        return user;
    }

    private void ensureCanEditApplication(LoanApplication app) {
        UserDetailsImpl currentUser = getCurrentUser();
        String currentRole = RoleMapper.normalize(currentUser.getRole());

        if (RoleMapper.isAdmin(currentRole)) {
            return;
        }

        boolean isOfficerLike = RoleMapper.isLoanOfficer(currentRole) || RoleMapper.isBankManager(currentRole);
        if (!isOfficerLike) {
            throw new BusinessException("Only ADMIN, LOAN_OFFICER, or BANK_MANAGER can edit this application");
        }

        if (!Objects.equals(currentUser.getId(), app.getCreatedByUserId())) {
            throw new BusinessException("You can only edit applications created by yourself");
        }

        if (app.getStatus() != LoanStatus.PENDING && app.getStatus() != LoanStatus.RETURNED) {
            throw new BusinessException("Only PENDING or RETURNED applications can be edited");
        }
    }

    private void ensureCanChangeStatus(LoanApplication app, String requestedStatus) {
        UserDetailsImpl currentUser = getCurrentUser();
        String currentRole = RoleMapper.normalize(currentUser.getRole());
        LoanStatus nextStatus = parseStatus(requestedStatus);

        // CHANGED: final decisions (APPROVED/REJECTED/CANCELLED) are ADMIN/BANK_MANAGER only
        if (nextStatus == LoanStatus.APPROVED
                || nextStatus == LoanStatus.REJECTED
                || nextStatus == LoanStatus.CANCELLED) {
            if (!RoleMapper.canMakeApplicationDecision(currentRole)) {
                throw new BusinessException("Only ADMIN or BANK_MANAGER can approve, reject, or cancel applications");
            }

            if (!RoleMapper.isAdmin(currentRole) && Objects.equals(currentUser.getId(), app.getCreatedByUserId())) {
                throw new BusinessException("BANK_MANAGER cannot approve, reject, or cancel an application created by themselves");
            }

            return;
        }

        // CHANGED: non-final transitions can be done by ADMIN or owner LOAN_OFFICER/BANK_MANAGER
        if (RoleMapper.isAdmin(currentRole)) {
            return;
        }

        boolean isOfficerLike = RoleMapper.isLoanOfficer(currentRole) || RoleMapper.isBankManager(currentRole);
        if (!isOfficerLike) {
            throw new BusinessException("Only ADMIN, LOAN_OFFICER, or BANK_MANAGER can change application status");
        }

        if (!Objects.equals(currentUser.getId(), app.getCreatedByUserId())) {
            throw new BusinessException("You can only update non-final status for applications created by yourself");
        }
    }

    private void ensureCanManageRiskAndRecommendation() {
        UserDetailsImpl currentUser = getCurrentUser();
        // CHANGED: LOAN_OFFICER is now allowed
        if (!RoleMapper.canRunRiskAndRecommendation(currentUser.getRole())) {
            throw new BusinessException("Only ADMIN, LOAN_OFFICER, or BANK_MANAGER can manage risk assessments and recommendations");
        }
    }
}
