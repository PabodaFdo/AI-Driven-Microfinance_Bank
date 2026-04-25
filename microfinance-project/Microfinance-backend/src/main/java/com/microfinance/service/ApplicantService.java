package com.microfinance.service;

import com.microfinance.dto.ApplicantRequest;
import com.microfinance.dto.ApplicantLookupResponse;
import com.microfinance.dto.ApplicantRegistrationRequest;
import com.microfinance.dto.ApplicantRegistrationResponse;
import com.microfinance.exception.BusinessException;
import com.microfinance.exception.ResourceNotFoundException;
import com.microfinance.model.Applicant;
import com.microfinance.model.SampleApplicant;
import com.microfinance.repository.ApplicantRepository;
import com.microfinance.repository.LoanApplicationRepository;
import com.microfinance.repository.SampleApplicantRepository;
import com.microfinance.repository.RiskAssessmentRepository;
import com.microfinance.repository.RecommendationRepository;
import com.microfinance.repository.RepaymentInstallmentRepository;
import com.microfinance.repository.RepaymentPaymentRepository;
import com.microfinance.util.NICValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ApplicantService {

    private final ApplicantRepository applicantRepo;
    private final LoanApplicationRepository loanApplicationRepo;
    private final SampleApplicantRepository sampleApplicantRepo;
    private final RiskAssessmentRepository riskAssessmentRepo;
    private final RecommendationRepository recommendationRepo;
    private final RepaymentInstallmentRepository repaymentInstallmentRepo;
    private final RepaymentPaymentRepository repaymentPaymentRepo;
    private final CreditScoreCalculationService creditScoreCalculationService;

    // ── List / Search ─────────────────────────────────────────

    public List<Applicant> list(String q) {
        if (q == null || q.isBlank()) {
            return applicantRepo.findAll();
        }
        return applicantRepo.searchByNicOrName(q.trim());
    }

    // ── Lookup Applicant by NIC ──────────────────────────────

    public ApplicantLookupResponse lookupByNic(String nic) {
        // Validate NIC format
        if (!NICValidator.isValidNIC(nic)) {
            throw new BusinessException("Invalid NIC format. Please use old format (9 digits + V) or new format (12 digits).");
        }

        String normalizedNic = NICValidator.normalizeNIC(nic);

        // Try to find applicant by NIC
        return applicantRepo.findByNic(normalizedNic)
                .map(applicant -> new ApplicantLookupResponse(
                        applicant.getId(),
                        applicant.getApplicantNumber(),
                        applicant.getFullName(),
                        applicant.getNic(),
                        applicant.getCreditScore(),
                        applicant.getRiskLevel(),
                        applicant.getPhone(),
                        applicant.getEmail(),
                        applicant.getBranch(),
                        true,
                        "Applicant found successfully"
                ))
                .orElse(new ApplicantLookupResponse(
                        null, null, null, normalizedNic, null, null, null, null, null,
                        false,
                        "Applicant not found. Please register a new applicant."
                ));
    }

    // ── Get Credit Score by NIC ──────────────────────────────

    public ResponseEntity<?> getCreditScoreByNic(String nic) {
        // Validate NIC format
        if (!NICValidator.isValidNIC(nic)) {
            return ResponseEntity.badRequest()
                    .body("Invalid NIC format. Please use old format (9 digits + V) or new format (12 digits).");
        }

        String normalizedNic = NICValidator.normalizeNIC(nic);

        // Check sample_applicants collection for credit score
        Optional<SampleApplicant> sampleApplicant = sampleApplicantRepo.findByNic(normalizedNic);

        if (sampleApplicant.isPresent()) {
            // Return credit score from sample_applicants
            Map<String, Object> response = new HashMap<>();
            response.put("creditScore", sampleApplicant.get().getCreditScore());
            response.put("found", true);
            response.put("source", "sample_database");
            return ResponseEntity.ok(response);
        } else {
            // NIC not found in sample_applicants
            return ResponseEntity.status(404)
                    .body("NIC not found in sample database. Credit score will be calculated when saving applicant.");
        }
    }

    // ── Register New Applicant ───────────────────────────────

    public ApplicantRegistrationResponse registerApplicant(ApplicantRegistrationRequest request) {
        // Validate NIC format
        if (!NICValidator.isValidNIC(request.getNic())) {
            throw new BusinessException("Invalid NIC format. Please use old format (9 digits + V) or new format (12 digits).");
        }

        String normalizedNic = NICValidator.normalizeNIC(request.getNic());

        // Check if applicant already exists
        if (applicantRepo.findByNic(normalizedNic).isPresent()) {
            throw new BusinessException("An applicant with NIC '" + normalizedNic + "' already exists.");
        }

        // Email uniqueness check
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        applicantRepo.findByEmailIgnoreCase(normalizedEmail).ifPresent(existing -> {
            throw new BusinessException("An applicant with email '" + normalizedEmail + "' already exists.");
        });

        // Validate phone
        validatePhone(request.getPhone());

        // Validate address
        validateAddress(request.getAddress());

        // Validate monthly income
        validateMonthlyIncome(request.getMonthlyIncome());

        // Validate employment length
        validateEmploymentLength(request.getEmploymentLengthMonths());

        // Validate monthly debt payment
        validateMonthlyDebtPayment(request.getMonthlyDebtPayment());

        // Validate housing cost
        validateHousingCost(request.getHousingCost());

        // Validate existing loans
        validateExistingLoans(request.getExistingLoans());

        // Business validation rules
        validateApplicantBusinessRules(request);

        // Create new applicant
        Applicant applicant = mapRegistrationToEntity(request);
        applicant.setNic(normalizedNic);

        // Generate user-friendly applicant number
        ensureApplicantNumber(applicant);

        // FIXED: Always apply credit score logic after mapping all fields
        applyCreditScore(applicant);

        // Set audit fields
        applicant.setCreatedAt(Instant.now());
        applicant.setUpdatedAt(Instant.now());

        // Save to database
        Applicant savedApplicant = applicantRepo.save(applicant);

        // Return response
        return new ApplicantRegistrationResponse(
                savedApplicant.getId(),
                savedApplicant.getApplicantNumber(),
                savedApplicant.getFullName(),
                savedApplicant.getNic(),
                savedApplicant.getEmail(),
                savedApplicant.getPhone(),
                savedApplicant.getBranch(),
                savedApplicant.getCreditScore(),
                savedApplicant.getRiskLevel(),
                "Applicant registered successfully with credit score: " + savedApplicant.getCreditScore(),
                savedApplicant.getCreatedAt()
        );
    }

    // ── Find by NIC  ───────────────────────────────────

    public Optional<Applicant> findByNic(String nic) {
        return applicantRepo.findByNic(nic);
    }

    // ── Get by ID ─────────────────────────────────────────────

    public Applicant getById(String id) {
        return applicantRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Applicant not found: " + id));
    }

    // ── Create ────────────────────────────────────────────────

    public Applicant create(ApplicantRequest req) {
        // Validate NIC format
        if (!NICValidator.isValidNIC(req.getNic())) {
            throw new BusinessException("Invalid NIC format. Please use old format (9 digits + V) or new format (12 digits).");
        }

        String normalizedNic = NICValidator.normalizeNIC(req.getNic());
        String normalizedEmail = req.getEmail().trim().toLowerCase();

        // Business validation rules
        validateApplicantBusinessRules(req);

        // Validate phone
        validatePhone(req.getPhone());

        // Validate address
        validateAddress(req.getAddress());

        // Validate monthly income
        validateMonthlyIncome(req.getMonthlyIncome());

        // Validate employment length
        validateEmploymentLength(req.getEmploymentLengthMonths());

        // Validate monthly debt payment
        validateMonthlyDebtPayment(req.getMonthlyDebtPayment());

        // Validate housing cost
        validateHousingCost(req.getHousingCost());

        // Validate existing loans
        validateExistingLoans(req.getExistingLoans());

        // NIC uniqueness check
        applicantRepo.findByNic(normalizedNic).ifPresent(existing -> {
            throw new BusinessException("An applicant with NIC '" + normalizedNic + "' already exists.");
        });

        // Email uniqueness check
        applicantRepo.findByEmailIgnoreCase(normalizedEmail).ifPresent(existing -> {
            throw new BusinessException("An applicant with email '" + normalizedEmail + "' already exists.");
        });

        // Create applicant (without creditScore from request)
        Applicant applicant = mapToEntity(req, new Applicant());
        applicant.setNic(normalizedNic);
        applicant.setEmail(normalizedEmail);

        // Generate user-friendly applicant number
        ensureApplicantNumber(applicant);

        // FIXED: Always apply credit score logic after mapping all fields
        applyCreditScore(applicant);

        // Set audit fields
        applicant.setCreatedAt(Instant.now());
        applicant.setUpdatedAt(Instant.now());

        return applicantRepo.save(applicant);
    }

    // ── Update ────────────────────────────────────────────────

    public Applicant update(String id, ApplicantRequest req) {
        Applicant existing = getById(id);

        // Validate NIC format
        if (!NICValidator.isValidNIC(req.getNic())) {
            throw new BusinessException("Invalid NIC format. Please use old format (9 digits + V) or new format (12 digits).");
        }

        String normalizedNic = NICValidator.normalizeNIC(req.getNic());
        String normalizedEmail = req.getEmail().trim().toLowerCase();

        // Business validation rules
        validateApplicantBusinessRules(req);

        // Validate phone
        validatePhone(req.getPhone());

        // Validate address
        validateAddress(req.getAddress());

        // Validate monthly income
        validateMonthlyIncome(req.getMonthlyIncome());

        // Validate employment length
        validateEmploymentLength(req.getEmploymentLengthMonths());

        // Validate monthly debt payment
        validateMonthlyDebtPayment(req.getMonthlyDebtPayment());

        // Validate housing cost
        validateHousingCost(req.getHousingCost());

        // Validate existing loans
        validateExistingLoans(req.getExistingLoans());

        // NIC uniqueness: allow same NIC only if it belongs to this applicant
        applicantRepo.findByNic(normalizedNic).ifPresent(found -> {
            if (!found.getId().equals(id)) {
                throw new BusinessException("NIC '" + normalizedNic + "' is already used by another applicant.");
            }
        });

        // Email uniqueness: allow same email only if it belongs to this applicant
        applicantRepo.findByEmailIgnoreCase(normalizedEmail).ifPresent(found -> {
            if (!found.getId().equals(id)) {
                throw new BusinessException("Email '" + normalizedEmail + "' is already used by another applicant.");
            }
        });

        // FIXED: First update all applicant fields (including financial data)
        mapToEntity(req, existing);
        existing.setNic(normalizedNic);
        existing.setEmail(normalizedEmail);

        // Ensure applicant number is assigned for old records
        ensureApplicantNumber(existing);

        // FIXED: ALWAYS recalculate credit score on update
        // - If NIC found in sample_applicants -> use that score
        // - If NIC not found -> recalculate using UPDATED financial data
        applyCreditScore(existing);

        existing.setUpdatedAt(Instant.now());
        return applicantRepo.save(existing);
    }

    // ── Delete ────────────────────────────────────────────────

    /**
     * Delete applicant and cascade-delete/archive all related data
     * - Soft-delete RiskAssessments
     * - Archive Recommendations
     * - Archive RepaymentInstallments
     * - Delete RepaymentPayments
     * - Delete LoanApplications
     * - Delete Applicant
     *
     * Uses @Transactional to ensure all-or-nothing behavior
     */
    @Transactional
    public Map<String, Object> deleteApplicantWithCascade(String applicantId) {
        if (!applicantRepo.existsById(applicantId)) {
            throw new ResourceNotFoundException("Applicant not found: " + applicantId);
        }

        // Get all loan applications for this applicant
        List<String> applicationIds = loanApplicationRepo.findByApplicantId(applicantId)
                .stream()
                .map(app -> app.getId())
                .toList();

        // Cascade delete related data for each application
        int riskAssessmentsArchived = 0;
        int recommendationsArchived = 0;
        int repaymentInstallmentsArchived = 0;
        int repaymentPaymentsDeleted = 0;

        for (String applicationId : applicationIds) {
            riskAssessmentsArchived += archiveRiskAssessmentsByApplicationId(applicationId);
            recommendationsArchived += archiveRecommendationsByApplicationId(applicationId);
            repaymentInstallmentsArchived += archiveRepaymentInstallmentsByApplicationId(applicationId);
            repaymentPaymentsDeleted += removeRepaymentPaymentsByApplicationId(applicationId);
        }

        // Delete all loan applications
        long applicationsDeleted = loanApplicationRepo.deleteByApplicantId(applicantId);

        // Delete the applicant
        applicantRepo.deleteById(applicantId);

        // Build response
        Map<String, Object> result = new HashMap<>();
        result.put("applicantId", applicantId);
        result.put("applicationsDeleted", applicationsDeleted);
        result.put("riskAssessmentsArchived", riskAssessmentsArchived);
        result.put("recommendationsArchived", recommendationsArchived);
        result.put("repaymentInstallmentsArchived", repaymentInstallmentsArchived);
        result.put("repaymentPaymentsDeleted", repaymentPaymentsDeleted);
        result.put("totalRelatedRecordsUpdated", applicationsDeleted + riskAssessmentsArchived +
                recommendationsArchived + repaymentInstallmentsArchived + repaymentPaymentsDeleted);
        result.put("message", "Applicant and all related records have been successfully deleted");

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

    // ── FIXED: Credit Score Application Logic ────────────────────

    /**
     * Apply credit score logic to an applicant:
     * 1. Check sample_applicants collection by NIC
     * 2. If found -> use that credit score
     * 3. If not found -> calculate using applicant's current financial data
     *
     * IMPORTANT: This method should be called AFTER all applicant fields are set
     */
    private void applyCreditScore(Applicant applicant) {
        String normalizedNic = NICValidator.normalizeNIC(applicant.getNic());

        System.out.println("========== CREDIT SCORE DEBUG ==========");
        System.out.println("Applicant NIC: " + normalizedNic);
        System.out.println("Monthly Income: " + applicant.getMonthlyIncome());
        System.out.println("Existing Loans: " + applicant.getExistingLoans());
        System.out.println("Dependents: " + applicant.getDependents());
        System.out.println("Employment Length: " + applicant.getEmploymentLengthMonths());
        System.out.println("Monthly Debt Payment: " + applicant.getMonthlyDebtPayment());
        System.out.println("Housing Cost: " + applicant.getHousingCost());
        System.out.println("Has Mortgage: " + applicant.getHasMortgage());
        // REMOVED: Previous Defaults and Credit Lines - Not used in AI model anymore

        // Step 1: Check sample_applicants collection first
        Optional<SampleApplicant> sampleApplicant = sampleApplicantRepo.findByNic(normalizedNic);

        int finalCreditScore;
        String creditScoreSource;

        if (sampleApplicant.isPresent()) {
            // Use credit score from sample_applicants
            finalCreditScore = sampleApplicant.get().getCreditScore();
            creditScoreSource = "sample_applicants database";
            System.out.println("✓ NIC found in sample_applicants");
            System.out.println("✓ Using credit score from sample DB: " + finalCreditScore);
        } else {
            // Calculate fallback credit score using applicant's financial data
            finalCreditScore = creditScoreCalculationService.calculateCreditScore(applicant);
            creditScoreSource = "calculated from financial data";
            System.out.println("✗ NIC NOT found in sample_applicants");
            System.out.println("✓ Calculated fallback credit score: " + finalCreditScore);
        }

        String riskLevel = creditScoreCalculationService.calculateRiskLevel(finalCreditScore);

        System.out.println("Final Credit Score: " + finalCreditScore + " (source: " + creditScoreSource + ")");
        System.out.println("Risk Level: " + riskLevel);
        System.out.println("========================================");

        // Set the final values
        applicant.setCreditScore(finalCreditScore);
        applicant.setRiskLevel(riskLevel);
    }

    // ── Helper Methods ────────────────────────────────────────

    /**
     * Generates a unique applicant number in format CUS-YYYY-NNNN
     */
    private String generateApplicantNumber() {
        int currentYear = java.time.Year.now().getValue();
        String yearPrefix = "CUS-" + currentYear + "-";

        // Find highest existing applicant number for current year
        List<Applicant> existingApplicants = applicantRepo.findAll();
        int maxNumber = 0;

        for (Applicant applicant : existingApplicants) {
            String applicantNum = applicant.getApplicantNumber();
            if (applicantNum != null && applicantNum.startsWith(yearPrefix)) {
                try {
                    String numberPart = applicantNum.substring(yearPrefix.length());
                    int number = Integer.parseInt(numberPart);
                    maxNumber = Math.max(maxNumber, number);
                } catch (NumberFormatException e) {
                    // Skip malformed applicant numbers
                }
            }
        }

        // Generate next number with leading zeros
        int nextNumber = maxNumber + 1;
        return yearPrefix + String.format("%04d", nextNumber);
    }

    /**
     * Assigns an applicant number if not already set
     */
    private void ensureApplicantNumber(Applicant applicant) {
        if (applicant.getApplicantNumber() == null || applicant.getApplicantNumber().isBlank()) {
            applicant.setApplicantNumber(generateApplicantNumber());
        }
    }

    private Applicant mapToEntity(ApplicantRequest req, Applicant a) {
        a.setFullName(req.getFullName() != null ? req.getFullName().trim() : null);
        a.setNic(req.getNic() != null ? req.getNic().trim() : null);
        a.setPhone(req.getPhone() != null ? req.getPhone().trim() : null);
        a.setEmail(req.getEmail() != null ? req.getEmail().trim() : null);
        a.setAddress(req.getAddress() != null ? req.getAddress().trim() : null);
        a.setBranch(req.getBranch() != null ? req.getBranch().trim() : null);
        a.setJobType(req.getJobType());
        a.setMonthlyIncome(req.getMonthlyIncome());
        a.setExistingLoans(req.getExistingLoans() != null ? req.getExistingLoans() : 0);
        a.setDependents(req.getDependents() != null ? req.getDependents() : 0);
        a.setEmploymentStatus(req.getEmploymentStatus());
        a.setEmploymentLengthMonths(req.getEmploymentLengthMonths() != null ? req.getEmploymentLengthMonths() : 0);
        a.setMonthlyDebtPayment(req.getMonthlyDebtPayment() != null ? req.getMonthlyDebtPayment() : 0.0);
        a.setHousingCost(req.getHousingCost() != null ? req.getHousingCost() : 0.0);
        a.setHasMortgage(req.getHasMortgage());
        a.setMaritalStatus(req.getMaritalStatus());

        // REMOVED: previousDefaults and creditLines - Not used in AI model anymore
        // CRITICAL: Do NOT set credit score from request - it will be calculated by applyCreditScore()
        // REMOVED: a.setCreditScore(req.getCreditScore());

        return a;
    }

    private Applicant mapRegistrationToEntity(ApplicantRegistrationRequest req) {
        Applicant a = new Applicant();
        a.setFullName(req.getFullName() != null ? req.getFullName().trim() : null);
        a.setPhone(req.getPhone() != null ? req.getPhone().trim() : null);
        a.setEmail(req.getEmail() != null ? req.getEmail().trim() : null);
        a.setAddress(req.getAddress() != null ? req.getAddress().trim() : "");
        a.setBranch(req.getBranch() != null ? req.getBranch().trim() : null);
        a.setJobType(req.getJobType());
        a.setMonthlyIncome(req.getMonthlyIncome());
        a.setExistingLoans(req.getExistingLoans() != null ? req.getExistingLoans() : 0);
        a.setDependents(req.getDependents() != null ? req.getDependents() : 0);
        a.setEmploymentStatus(req.getEmploymentStatus());
        a.setEmploymentLengthMonths(req.getEmploymentLengthMonths() != null ? req.getEmploymentLengthMonths() : 0);
        a.setMonthlyDebtPayment(req.getMonthlyDebtPayment() != null ? req.getMonthlyDebtPayment() : 0.0);
        a.setHousingCost(req.getHousingCost() != null ? req.getHousingCost() : 0.0);
        a.setHasMortgage(req.getHasMortgage());
        a.setMaritalStatus(req.getMaritalStatus());

        // REMOVED: previousDefaults and creditLines - Not used in AI model anymore
        // Note: creditScore and riskLevel will be set by applyCreditScore()

        return a;
    }

    // ── Backfill Method ───────────────────────────────────────

    /**
     * Backfills applicant numbers for old records that don't have them.
     * This method can be called via API to update existing records.
     */
    public Map<String, Object> backfillApplicantNumbers() {
        List<Applicant> applicantsWithoutNumbers = applicantRepo.findAll()
                .stream()
                .filter(a -> a.getApplicantNumber() == null || a.getApplicantNumber().isBlank())
                .toList();

        int updatedCount = 0;
        for (Applicant applicant : applicantsWithoutNumbers) {
            ensureApplicantNumber(applicant);
            applicant.setUpdatedAt(Instant.now());
            applicantRepo.save(applicant);
            updatedCount++;
        }

        Map<String, Object> result = new HashMap<>();
        result.put("totalProcessed", applicantsWithoutNumbers.size());
        result.put("updatedCount", updatedCount);
        result.put("message", updatedCount + " applicant records updated with new applicant numbers");

        return result;
    }

    // ── Business Validation Rules ─────────────────────────────

    /**
     * Validates business rules for applicant data
     */
    private void validateApplicantBusinessRules(ApplicantRequest req) {
        // Business rule: Monthly debt payment cannot exceed monthly income
        if (req.getMonthlyDebtPayment() != null && req.getMonthlyIncome() != null &&
            req.getMonthlyDebtPayment() > req.getMonthlyIncome()) {
            throw new BusinessException("Monthly debt payment cannot be greater than monthly income");
        }

        // Business rule: Housing cost cannot exceed monthly income
        if (req.getHousingCost() != null && req.getMonthlyIncome() != null &&
            req.getHousingCost() > req.getMonthlyIncome()) {
            throw new BusinessException("Housing cost cannot be greater than monthly income");
        }
    }

    /**
     * Validates business rules for registration request data (same rules as ApplicantRequest)
     */
    private void validateApplicantBusinessRules(ApplicantRegistrationRequest req) {
        // Business rule: Monthly debt payment cannot exceed monthly income
        if (req.getMonthlyDebtPayment() != null && req.getMonthlyIncome() != null &&
            req.getMonthlyDebtPayment() > req.getMonthlyIncome()) {
            throw new BusinessException("Monthly debt payment cannot be greater than monthly income");
        }

        // Business rule: Housing cost cannot exceed monthly income
        if (req.getHousingCost() != null && req.getMonthlyIncome() != null &&
            req.getHousingCost() > req.getMonthlyIncome()) {
            throw new BusinessException("Housing cost cannot be greater than monthly income");
        }
    }

    /**
     * Validates phone number format and content
     * - Must be exactly 10 digits
     * - Cannot contain the same digit repeated 10 times (e.g., 0000000000, 1111111111, etc.)
     */
    private void validatePhone(String phone) {
        if (phone == null) {
            return;  // Phone is required but validated by @NotBlank
        }

        String trimmed = phone.trim();

        // Extract only digits
        String digitsOnly = trimmed.replaceAll("\\D", "");

        // Check for exactly 10 digits
        if (!digitsOnly.matches("^\\d{10}$")) {
            throw new BusinessException("Phone number must contain exactly 10 digits");
        }

        // Reject phone numbers with all same repeated digits (e.g., 0000000000, 1111111111, etc.)
        if (digitsOnly.matches("^(\\d)\\1{9}$")) {
            throw new BusinessException("Phone number cannot contain the same digit repeatedly");
        }
    }

    /**
     * Validates address field (optional, but if provided must be meaningful):
     * - Can be null or empty (field is optional)
     * - If provided, must be trimmed of leading/trailing spaces
     * - Cannot be only same character repeated (e.g., "aaaaaaa", "1111111")
     * - Cannot be only repeated patterns (e.g., "abcabcabc", "121212")
     * - Must contain meaningful structure (mix of words, numbers, spaces, valid symbols)
     */
    private void validateAddress(String address) {
        // Address is optional - null or empty is allowed
        if (address == null || address.trim().isEmpty()) {
            return;
        }

        String trimmed = address.trim();

        // Check length (should have already been validated by @Size, but double check)
        if (trimmed.length() > 255) {
            throw new BusinessException("Address cannot exceed 255 characters");
        }

        // Reject if address is too short to be meaningful (after trimming)
        if (trimmed.length() < 3) {
            throw new BusinessException("Address must be at least 3 characters");
        }

        // Check for same character repeated across most of the text
        // Calculate if one character dominates the address (>60% of characters)
        int[] charCount = new int[256];
        for (char c : trimmed.toCharArray()) {
            charCount[c]++;
        }
        int maxCharCount = 0;
        for (int count : charCount) {
            maxCharCount = Math.max(maxCharCount, count);
        }
        if (maxCharCount * 100 / trimmed.length() > 60) {
            throw new BusinessException("Address cannot contain repeated meaningless characters");
        }

        // Reject obvious repeated short patterns (e.g., "abcabcabc", "121212", ".-.-.-")
        // Check for patterns of length 1-4 repeated at least 3 times
        for (int patternLen = 1; patternLen <= Math.min(4, trimmed.length() / 3); patternLen++) {
            String pattern = trimmed.substring(0, patternLen);
            int patternCount = 0;
            for (int i = 0; i <= trimmed.length() - patternLen; i++) {
                if (trimmed.substring(i, i + patternLen).equals(pattern)) {
                    patternCount++;
                }
            }
            // If pattern repeats more than 3 times in the address, it's likely meaningless
            if (patternCount > 3 && patternCount * patternLen > trimmed.length() * 0.6) {
                throw new BusinessException("Address cannot contain repeated patterns");
            }
        }

        // Validate that address contains meaningful structure
        // Must contain at least letters and/or numbers (not just symbols/spaces)
        boolean hasLettersOrNumbers = trimmed.matches(".*[a-zA-Z0-9].*");
        if (!hasLettersOrNumbers) {
            throw new BusinessException("Address must contain letters or numbers");
        }

        // Reject addresses that are only numbers or only letters without variety
        // Allow: "23 Temple Road" (mixed), "No 45, Main Street" (mixed)
        // Block: all same letter repeated, all digits
        boolean hasLetters = trimmed.matches(".*[a-zA-Z].*");
        boolean hasNumbers = trimmed.matches(".*[0-9].*");
        boolean hasSpaces = trimmed.contains(" ");

        // If has both letters and numbers with space, likely valid (e.g., "23 Temple")
        // If has letters only, need at least some variety
        if (hasLetters && !hasNumbers && !hasSpaces && trimmed.length() < 10) {
            // Short address with only letters is suspicious
            throw new BusinessException("Address must contain more detail (include house number, street, or area)");
        }
    }

    /**
     * Validates monthly income field (required):
     * - Must be greater than 0
     * - Cannot exceed realistic maximum of 10,000,000
     */
    private void validateMonthlyIncome(Double monthlyIncome) {
        // Monthly income validation is already done by @NotNull and @Min/@Max annotations
        // But we add basic range checks here for clarity

        if (monthlyIncome == null || monthlyIncome <= 0) {
            // This is already validated by annotations, but check here for safety
            throw new BusinessException("Monthly income must be greater than 0");
        }

        if (monthlyIncome > 10000000) {
            // This is already validated by @Max annotation, but check here for clarity
            throw new BusinessException("Monthly income cannot exceed 10,000,000");
        }
    }

    /**
     * Validates employment length (months) field:
     * - Must be non-negative
     * - Cannot be repeated digits like 9999999, 88888, etc.
     * - Cannot exceed 600 months (50 years)
     */
    private void validateEmploymentLength(Integer employmentLength) {
        // Employment length is optional - null is allowed
        if (employmentLength == null) {
            return;
        }

        if (employmentLength < 0) {
            throw new BusinessException("Employment length cannot be negative");
        }

        if (employmentLength > 600) {
            throw new BusinessException("Employment length cannot exceed 600 months (50 years)");
        }

        // Check for repeated digit patterns
        String lengthStr = employmentLength.toString();
        if (lengthStr.matches("^(\\d)\\1{4,}$")) {
            throw new BusinessException("Employment length cannot be an unrealistic repeated number");
        }
    }

    /**
     * Validates monthly debt payment field:
     * - Must be non-negative
     * - Cannot be repeated digits like 999999999, 1111111, etc.
     * - Cannot exceed 10,000,000 LKR
     */
    private void validateMonthlyDebtPayment(Double monthlyDebtPayment) {
        // Monthly debt payment is optional - null is allowed
        if (monthlyDebtPayment == null) {
            return;
        }

        if (monthlyDebtPayment < 0) {
            throw new BusinessException("Monthly debt payment cannot be negative");
        }

        if (monthlyDebtPayment > 10000000) {
            throw new BusinessException("Monthly debt payment cannot exceed 10,000,000 LKR");
        }

        // Check for repeated digit patterns
        String paymentStr = monthlyDebtPayment.longValue() + "";
        if (paymentStr.matches("^(\\d)\\1{4,}$")) {
            throw new BusinessException("Monthly debt payment cannot be an unrealistic repeated number");
        }
    }

    /**
     * Validates housing cost field:
     * - Must be non-negative
     * - Cannot be repeated digits like 888888888, 444444, etc.
     * - Cannot exceed 5,000,000 LKR
     */
    private void validateHousingCost(Double housingCost) {
        // Housing cost is optional - null is allowed
        if (housingCost == null) {
            return;
        }

        if (housingCost < 0) {
            throw new BusinessException("Housing cost cannot be negative");
        }

        if (housingCost > 5000000) {
            throw new BusinessException("Housing cost cannot exceed 5,000,000 LKR");
        }

        // Check for repeated digit patterns
        String costStr = housingCost.longValue() + "";
        if (costStr.matches("^(\\d)\\1{4,}$")) {
            throw new BusinessException("Housing cost cannot be an unrealistic repeated number");
        }
    }

    /**
     * Validates existing loans count field:
     * - Must be non-negative integer
     * - Cannot be repeated digits like 999999, 11111111, etc.
     * - Cannot exceed 50 loans
     */
    private void validateExistingLoans(Integer existingLoans) {
        // Existing loans is required
        if (existingLoans == null) {
            throw new BusinessException("Existing loans is required");
        }

        if (existingLoans < 0) {
            throw new BusinessException("Existing loans cannot be negative");
        }

        if (existingLoans > 50) {
            throw new BusinessException("Existing loans cannot exceed 50");
        }

        // Check for repeated digit patterns
        String loansStr = existingLoans.toString();
        if (loansStr.matches("^(\\d)\\1{4,}$")) {
            throw new BusinessException("Existing loans count cannot be an unrealistic repeated number");
        }
    }
}