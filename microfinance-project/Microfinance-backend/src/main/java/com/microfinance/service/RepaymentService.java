package com.microfinance.service;

import com.microfinance.dto.RecordRepaymentRequest;
import com.microfinance.dto.UpdateRepaymentPaymentRequest;
import com.microfinance.dto.VoidRepaymentPaymentRequest;
import com.microfinance.exception.BusinessException;
import com.microfinance.exception.ResourceNotFoundException;
import com.microfinance.model.LoanApplication;
import com.microfinance.model.LoanStatus;
import com.microfinance.model.PaymentRecordStatus;
import com.microfinance.model.RepaymentInstallment;
import com.microfinance.model.RepaymentPayment;
import com.microfinance.model.RepaymentStatus;
import com.microfinance.repository.LoanApplicationRepository;
import com.microfinance.repository.RepaymentInstallmentRepository;
import com.microfinance.repository.RepaymentPaymentRepository;
import com.microfinance.util.MoneyUtil;
import com.microfinance.util.RepaymentConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RepaymentService {

    private final LoanApplicationRepository loanApplicationRepository;
    private final RepaymentInstallmentRepository repaymentInstallmentRepository;
    private final RepaymentPaymentRepository repaymentPaymentRepository;

    public List<RepaymentInstallment> generateScheduleForApprovedApplication(String applicationId) {
        LoanApplication application = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan application not found: " + applicationId));

        if (application.getStatus() != LoanStatus.APPROVED) {
            throw new BusinessException("Repayment schedule can only be generated for APPROVED applications.");
        }

        // Check if installments already exist - if so, return them directly
        List<RepaymentInstallment> existingInstallments = repaymentInstallmentRepository.findByApplicationIdOrderByInstallmentNumberAsc(applicationId);
        if (!existingInstallments.isEmpty()) {
            return existingInstallments;
        }

        BigDecimal principal = MoneyUtil.fromDouble(resolveApprovedAmount(application));
        int months = resolveApprovedTerm(application);
        BigDecimal annualRate = MoneyUtil.fromDouble(resolveApprovedRate(application));

        if (!MoneyUtil.isPositive(principal)) {
            throw new BusinessException("Approved amount must be greater than 0.");
        }
        if (months <= 0) {
            throw new BusinessException("Approved repayment period must be greater than 0.");
        }
        if (MoneyUtil.isNegative(annualRate)) {
            throw new BusinessException("Approved interest rate cannot be negative.");
        }

        BigDecimal monthlyRate = annualRate
                .divide(new BigDecimal("1200"), 10, RoundingMode.HALF_UP);

        BigDecimal installmentAmount = calculateInstallmentAmount(principal, monthlyRate, months);

        BigDecimal balance = principal;
        LocalDate dueDate = LocalDate.now().plusMonths(1);

        // Collect installments for batch save - more efficient than individual saves
        List<RepaymentInstallment> installmentsToSave = new ArrayList<>();

        for (int i = 1; i <= months; i++) {
            BigDecimal openingBalance = balance;

            BigDecimal interestPortion = MoneyUtil.normalize(
                    openingBalance.multiply(monthlyRate)
            );

            BigDecimal principalPortion = MoneyUtil.normalize(
                    installmentAmount.subtract(interestPortion)
            );

            BigDecimal currentInstallmentAmount = installmentAmount;

            if (i == months || principalPortion.compareTo(openingBalance) > 0) {
                principalPortion = MoneyUtil.normalize(openingBalance);
                currentInstallmentAmount = MoneyUtil.normalize(principalPortion.add(interestPortion));
            }

            BigDecimal remainingBalance = MoneyUtil.normalize(
                    openingBalance.subtract(principalPortion)
            );

            if (MoneyUtil.isNegative(remainingBalance)) {
                remainingBalance = MoneyUtil.normalize(BigDecimal.ZERO);
            }

            RepaymentInstallment installment = new RepaymentInstallment();
            installment.setApplicationId(application.getId());
            installment.setApplicationNumber(application.getApplicationNumber());
            installment.setInstallmentNumber(i);
            installment.setDueDate(dueDate);
            installment.setOpeningBalance(MoneyUtil.normalize(openingBalance));
            installment.setPrincipalPortion(principalPortion);
            installment.setInterestPortion(interestPortion);
            installment.setInstallmentAmount(currentInstallmentAmount);
            installment.setPaidAmount(MoneyUtil.normalize(BigDecimal.ZERO));
            installment.setRemainingAmount(currentInstallmentAmount);
            installment.setLateFee(MoneyUtil.normalize(BigDecimal.ZERO));
            installment.setStatus(RepaymentStatus.PENDING);
            installment.setArchived(false);
            // Timestamps handled automatically by @CreatedDate and @LastModifiedDate

            installmentsToSave.add(installment);

            balance = remainingBalance;
            dueDate = dueDate.plusMonths(1);
        }

        // Batch save for efficiency - single database round-trip instead of N
        return repaymentInstallmentRepository.saveAll(installmentsToSave);
    }

    public List<RepaymentInstallment> getSchedule(String applicationId) {
        // Only process overdues when specifically needed, not on every read
        // Overdue processing should be handled by scheduled job or explicit endpoint calls
        return repaymentInstallmentRepository.findByApplicationIdAndArchivedFalseOrderByInstallmentNumberAsc(applicationId);
    }

    public List<RepaymentPayment> getPaymentHistory(String applicationId) {
        return repaymentPaymentRepository.findByApplicationIdOrderByPaymentDateDesc(applicationId);
    }

    public Page<RepaymentPayment> getPaymentHistory(String applicationId, Pageable pageable) {
        return repaymentPaymentRepository.findByApplicationIdOrderByPaymentDateDesc(applicationId, pageable);
    }

    public RepaymentPayment recordPayment(RecordRepaymentRequest request) {
        // Validate request parameters exist and are sensible
        validatePaymentRequest(request);

        // *** AUTO-SELECT NEXT PAYABLE INSTALLMENT (SERVER-SIDE) ***
        List<RepaymentInstallment> installments = repaymentInstallmentRepository
                .findByApplicationIdAndArchivedFalseOrderByInstallmentNumberAsc(request.getApplicationId());

        // Step 1: Find oldest overdue installment with remaining balance
        RepaymentInstallment installment = installments.stream()
                .filter(i -> i.getStatus() == RepaymentStatus.OVERDUE && i.getRemainingAmount().compareTo(BigDecimal.ZERO) > 0)
                .min(Comparator.comparing(RepaymentInstallment::getInstallmentNumber))
                .orElse(null);

        // Step 2: If no overdue, find next pending installment with remaining balance
        if (installment == null) {
            installment = installments.stream()
                    .filter(i -> i.getRemainingAmount().compareTo(BigDecimal.ZERO) > 0)
                    .min(Comparator.comparing(RepaymentInstallment::getInstallmentNumber))
                    .orElseThrow(() -> new BusinessException("No payable installment found for application " + request.getApplicationId()));
        }

        // Log the selected installment for auditing
        System.out.println("✓ Server auto-selected installment: " + installment.getInstallmentNumber() 
                + " (Status: " + installment.getStatus() + ", Remaining: " + installment.getRemainingAmount() + ")");

        // Ensure installment is not closed or archived already
        if (installment.isArchived() || installment.getStatus() == RepaymentStatus.CLOSED) {
            throw new BusinessException("This repayment installment is already closed and cannot accept payments.");
        }

        // Normalize payment amounts
        BigDecimal amountPaid = MoneyUtil.normalize(request.getAmountPaid());

        // Use the late fee provided by frontend (validated to not exceed installment's lateFee)
        BigDecimal lateFeePaid = MoneyUtil.normalize(request.getLateFeePaid() != null ? request.getLateFeePaid() : BigDecimal.ZERO);

        // Validate late fee does not exceed the installment's maximum late fee
        if (lateFeePaid.compareTo(installment.getLateFee()) > 0) {
            throw new BusinessException("Late fee paid cannot exceed the installment's maximum late fee of "
                + installment.getLateFee() + ".");
        }

        // Validate at least one payment amount is > 0
        if (!MoneyUtil.isPositive(amountPaid) && !MoneyUtil.isPositive(lateFeePaid)) {
            throw new BusinessException("At least one payment amount must be greater than 0.");
        }

        // Validate overpayment - cannot pay more than remaining amount
        if (amountPaid.compareTo(installment.getRemainingAmount()) > 0) {
            throw new BusinessException("Payment amount cannot exceed remaining installment amount of "
                + installment.getRemainingAmount() + ".");
        }

        // Validate recordedBy field is not blank after trim
        String recordedBy = request.getRecordedBy();
        if (recordedBy != null && !recordedBy.trim().isEmpty()) {
            recordedBy = recordedBy.trim();
        } else {
            recordedBy = RepaymentConstants.DEFAULT_RECORDED_BY;
        }

        // Sanitize notes field - trim and cap length
        String notes = request.getNotes();
        if (notes != null && !notes.trim().isEmpty()) {
            notes = notes.trim();
            if (notes.length() > 500) {
                notes = notes.substring(0, 500);
            }
        } else {
            notes = "";
        }

        // Validate payment date if provided (defensive)
        LocalDate paymentDate = request.getPaymentDate() != null ? request.getPaymentDate() : LocalDate.now();
        // Future dates are not allowed (optional business rule check)
        if (paymentDate.isAfter(LocalDate.now())) {
            throw new BusinessException("Payment date cannot be in the future.");
        }

        // Update installment payment records
        installment.setPaidAmount(MoneyUtil.add(installment.getPaidAmount(), amountPaid));
        installment.setRemainingAmount(MoneyUtil.subtract(installment.getRemainingAmount(), amountPaid));
        installment.setLateFee(MoneyUtil.subtract(installment.getLateFee(), lateFeePaid));

        // Update status based on new remaining amount
        updateInstallmentStatus(installment);

        // Save updated installment
        repaymentInstallmentRepository.save(installment);

        // Create payment record
        RepaymentPayment payment = new RepaymentPayment();
        payment.setPaymentReference(generatePaymentReference());
        payment.setApplicationId(installment.getApplicationId());
        payment.setApplicationNumber(installment.getApplicationNumber());
        payment.setInstallmentNumber(installment.getInstallmentNumber());
        payment.setAmountPaid(amountPaid);
        payment.setLateFeePaid(lateFeePaid);
        payment.setPaymentDate(paymentDate);
        payment.setRecordedBy(recordedBy);
        payment.setNotes(notes);
        
        // Set audit-safe fields
        payment.setStatus(PaymentRecordStatus.RECORDED);
        payment.setActive(true);
        payment.setVoidedAt(null);
        payment.setVoidedBy(null);
        payment.setVoidReason(null);

        return repaymentPaymentRepository.save(payment);
    }

    /**
     * Validate payment request has all required fields and sensible values
     */
    private void validatePaymentRequest(RecordRepaymentRequest request) {
        if (request == null) {
            throw new BusinessException("Payment request cannot be null.");
        }

        if (request.getApplicationId() == null || request.getApplicationId().trim().isEmpty()) {
            throw new BusinessException("Application ID is required and cannot be blank.");
        }

        // *** REMOVED installmentNumber validation - now computed server-side ***

        if (request.getAmountPaid() == null) {
            throw new BusinessException("Payment amount is required.");
        }
    }

    public List<RepaymentInstallment> getOverdueInstallments() {
        // Legacy method - consider marking as deprecated
        processOverduesForAllApplications();
        return repaymentInstallmentRepository.findByStatusInAndArchivedFalse(List.of(RepaymentStatus.OVERDUE));
    }

    public Page<RepaymentInstallment> getOverdueInstallments(Pageable pageable) {
        // Process overdues first, but only for the specific page being requested
        processOverduesForAllApplications();
        return repaymentInstallmentRepository.findByStatusInAndArchivedFalse(List.of(RepaymentStatus.OVERDUE), pageable);
    }

    public String closeSchedule(String applicationId) {
        List<RepaymentInstallment> installments =
                repaymentInstallmentRepository.findByApplicationIdOrderByInstallmentNumberAsc(applicationId);

        if (installments.isEmpty()) {
            throw new ResourceNotFoundException("No repayment schedule found for application: " + applicationId);
        }

        boolean hasOutstanding = installments.stream().anyMatch(i ->
                MoneyUtil.isPositive(i.getRemainingAmount())
                        || MoneyUtil.isPositive(i.getLateFee())
        );

        if (hasOutstanding) {
            throw new BusinessException("Cannot close repayment schedule because there are unpaid installments or late fees.");
        }

        for (RepaymentInstallment installment : installments) {
            installment.setStatus(RepaymentStatus.CLOSED);
            installment.setArchived(true);
            // updatedAt timestamp handled automatically by @LastModifiedDate
        }

        repaymentInstallmentRepository.saveAll(installments);
        return "Repayment schedule closed successfully for application: " + applicationId;
    }

    public void processOverduesForApplication(String applicationId) {
        List<RepaymentInstallment> installments =
                repaymentInstallmentRepository.findByApplicationIdAndArchivedFalseOrderByInstallmentNumberAsc(applicationId);

        processOverdueInstallments(installments);
    }

    public void processOverduesForAllApplications() {
        List<RepaymentInstallment> installments =
                repaymentInstallmentRepository.findByStatusInAndArchivedFalse(
                        List.of(RepaymentStatus.PENDING, RepaymentStatus.PARTIAL, RepaymentStatus.OVERDUE)
                );

        processOverdueInstallments(installments);
    }

    private void processOverdueInstallments(List<RepaymentInstallment> installments) {
        if (installments.isEmpty()) {
            return;
        }

        List<RepaymentInstallment> updatedInstallments = new ArrayList<>();
        LocalDate overdueThreshold = LocalDate.now().minusDays(RepaymentConstants.GRACE_PERIOD_DAYS);

        for (RepaymentInstallment installment : installments) {
            if (installment.getStatus() == RepaymentStatus.CLOSED || installment.getStatus() == RepaymentStatus.PAID) {
                continue;
            }

            if (installment.getDueDate() != null
                    && installment.getDueDate().isBefore(overdueThreshold)
                    && MoneyUtil.isPositive(installment.getRemainingAmount())) {

                installment.setStatus(RepaymentStatus.OVERDUE);

                if (MoneyUtil.isZero(installment.getLateFee())) {
                    BigDecimal lateFee = MoneyUtil.multiply(
                            installment.getRemainingAmount(), RepaymentConstants.LATE_FEE_PERCENTAGE
                    );
                    installment.setLateFee(lateFee);
                }

                // updatedAt timestamp handled automatically by @LastModifiedDate
                updatedInstallments.add(installment);
            }
        }

        // Batch update for efficiency
        if (!updatedInstallments.isEmpty()) {
            repaymentInstallmentRepository.saveAll(updatedInstallments);
        }
    }

    private void updateInstallmentStatus(RepaymentInstallment installment) {
        BigDecimal remaining = MoneyUtil.normalize(installment.getRemainingAmount());
        BigDecimal lateFee = MoneyUtil.normalize(installment.getLateFee());
        LocalDate overdueThreshold = LocalDate.now().minusDays(RepaymentConstants.GRACE_PERIOD_DAYS);

        if (MoneyUtil.isZero(remaining) && MoneyUtil.isZero(lateFee)) {
            installment.setStatus(RepaymentStatus.PAID);
            return;
        }

        if (installment.getDueDate() != null
                && installment.getDueDate().isBefore(overdueThreshold)
                && MoneyUtil.isPositive(remaining)) {
            installment.setStatus(RepaymentStatus.OVERDUE);
            return;
        }

        if (MoneyUtil.isPositive(installment.getPaidAmount())) {
            installment.setStatus(RepaymentStatus.PARTIAL);
        } else {
            installment.setStatus(RepaymentStatus.PENDING);
        }
    }

    private BigDecimal calculateInstallmentAmount(BigDecimal principal, BigDecimal monthlyRate, int months) {
        if (MoneyUtil.isZero(monthlyRate)) {
            return principal.divide(BigDecimal.valueOf(months), 2, RoundingMode.HALF_UP);
        }

        double p = principal.doubleValue();
        double r = monthlyRate.doubleValue();
        int n = months;

        double emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        return MoneyUtil.normalize(BigDecimal.valueOf(emi));
    }

    private Double resolveApprovedAmount(LoanApplication application) {
        return resolveValue(application.getRecommendedAmount(), application.getAmount(), val -> val > 0);
    }

    private int resolveApprovedTerm(LoanApplication application) {
        Integer recommendedPeriod = application.getRecommendedPeriod();
        Integer termMonths = application.getTermMonths();
        return resolveValue(recommendedPeriod, termMonths != null ? termMonths : 0, val -> val > 0);
    }

    private Double resolveApprovedRate(LoanApplication application) {
        return resolveValue(application.getRecommendedInterestRate(), application.getInterestRate(), val -> val >= 0);
    }

    /**
     * Generic utility to resolve approved vs original values with validation
     */
    private <T> T resolveValue(T recommendedValue, T originalValue, java.util.function.Predicate<T> isValid) {
        if (recommendedValue != null && isValid.test(recommendedValue)) {
            return recommendedValue;
        }
        return originalValue;
    }

    private String generatePaymentReference() {
        return RepaymentConstants.PAYMENT_REFERENCE_PREFIX + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    /**
     * Void a payment for audit trail purposes - does not delete but marks as voided
     */
    public RepaymentPayment voidPayment(String paymentId, VoidRepaymentPaymentRequest request) {
        RepaymentPayment payment = repaymentPaymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found: " + paymentId));

        if (payment.getStatus() == PaymentRecordStatus.VOIDED || !payment.isActive()) {
            throw new BusinessException("Payment is already voided");
        }

        payment.setStatus(PaymentRecordStatus.VOIDED);
        payment.setActive(false);
        payment.setVoidedAt(Instant.now());
        payment.setVoidedBy(request.getVoidedBy().trim());
        payment.setVoidReason(request.getVoidReason().trim());

        RepaymentPayment saved = repaymentPaymentRepository.save(payment);

        // Recalculate installment from only active payments
        recalculateInstallmentFromActivePayments(
                payment.getApplicationId(),
                payment.getInstallmentNumber()
        );

        return saved;
    }

    /**
     * Update an existing payment and recalculate installment totals
     * @deprecated Direct editing of payments is disabled. Void the payment and create a new one.
     */
    @Deprecated
    public RepaymentPayment updatePayment(String paymentId, UpdateRepaymentPaymentRequest request) {
        throw new UnsupportedOperationException("Direct editing of recorded payments is not allowed. Void the payment and record a new one.");
    }

    /**
     * Validate UpdateRepaymentPaymentRequest fields with detailed error messages
     */
    private void validateUpdatePaymentRequest(UpdateRepaymentPaymentRequest request) {
        // Validate amount
        if (request.getAmountPaid() == null) {
            throw new BusinessException("Payment amount is required.");
        }

        // Check amount is positive
        BigDecimal amount = request.getAmountPaid();
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Payment amount must be greater than 0. Received: " + amount);
        }

        // Check reasonable upper bound
        if (amount.compareTo(new BigDecimal("999999999.99")) > 0) {
            throw new BusinessException("Payment amount exceeds maximum allowed value.");
        }

        // Validate payment date is provided
        if (request.getPaymentDate() == null) {
            throw new BusinessException("Payment date is required.");
        }

        // Validate recordedBy
        if (request.getRecordedBy() == null || request.getRecordedBy().trim().isEmpty()) {
            throw new BusinessException("Recorded by is required and cannot be blank.");
        }

        if (request.getRecordedBy().trim().length() > 100) {
            throw new BusinessException("Recorded by cannot exceed 100 characters.");
        }

        // Validate notes length (optional but check if provided)
        if (request.getNotes() != null && request.getNotes().length() > 500) {
            throw new BusinessException("Notes cannot exceed 500 characters.");
        }
    }

    /**
     * Calculate total of all payments for an installment EXCEPT the given payment ID
     * Used to validate that new payment amount won't cause overpayment
     */
    private BigDecimal calculateOtherPaymentsTotal(String applicationId, Integer installmentNumber, String excludePaymentId) {
        List<RepaymentPayment> payments = repaymentPaymentRepository
                .findByApplicationIdAndInstallmentNumberOrderByPaymentDateDesc(applicationId, installmentNumber);

        BigDecimal total = BigDecimal.ZERO;
        for (RepaymentPayment p : payments) {
            if (!p.getId().equals(excludePaymentId)) {
                total = MoneyUtil.add(total, p.getAmountPaid());
            }
        }

        return MoneyUtil.normalize(total);
    }

    /**
     * Delete a payment and recalculate installment totals
     * @deprecated Hard delete of payments is disabled. Void the payment instead.
     */
    @Deprecated
    public void deletePayment(String paymentId) {
        throw new UnsupportedOperationException("Hard delete of recorded payments is not allowed. Void the payment instead.");
    }

    /**
     * Recalculate installment totals based on ONLY active (not voided) stored payments
     * This ensures consistency by treating active payments as source of truth
     */
    private void recalculateInstallmentFromActivePayments(String applicationId, Integer installmentNumber) {
        // Find installment
        RepaymentInstallment installment = repaymentInstallmentRepository
                .findByApplicationIdAndInstallmentNumber(applicationId, installmentNumber)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Repayment installment not found for application " + applicationId
                                + " installment " + installmentNumber
                ));

        // Get all ACTIVE payments for this installment (excludes voided payments)
        List<RepaymentPayment> activePayments = repaymentPaymentRepository
                .findByApplicationIdAndInstallmentNumberAndActiveTrueOrderByPaymentDateDesc(applicationId, installmentNumber);

        // Recalculate paid amount and late fee paid from ONLY active payments
        BigDecimal totalAmountPaid = activePayments.stream()
                .map(RepaymentPayment::getAmountPaid)
                .filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalLateFeePaid = activePayments.stream()
                .map(RepaymentPayment::getLateFeePaid)
                .filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Normalize values
        totalAmountPaid = MoneyUtil.normalize(totalAmountPaid);
        totalLateFeePaid = MoneyUtil.normalize(totalLateFeePaid);

        // Calculate remaining amount (installment amount minus paid principal)
        BigDecimal installmentAmount = installment.getInstallmentAmount() == null
                ? BigDecimal.ZERO : installment.getInstallmentAmount();
        BigDecimal recalculatedRemaining = MoneyUtil.normalize(
                installmentAmount.subtract(totalAmountPaid)
        );

        // Ensure no negative remaining amount
        if (recalculatedRemaining.compareTo(BigDecimal.ZERO) < 0) {
            recalculatedRemaining = BigDecimal.ZERO;
        }

        // Reassess late fee based on current remaining amount and overdue status
        LocalDate today = LocalDate.now();
        boolean overdue = installment.getDueDate() != null
                && installment.getDueDate().plusDays(RepaymentConstants.GRACE_PERIOD_DAYS).isBefore(today)
                && recalculatedRemaining.compareTo(BigDecimal.ZERO) > 0;

        BigDecimal reassessedLateFee = BigDecimal.ZERO;
        if (overdue) {
            reassessedLateFee = recalculatedRemaining
                    .multiply(RepaymentConstants.LATE_FEE_PERCENTAGE)
                    .setScale(2, java.math.RoundingMode.HALF_UP);
        }

        BigDecimal remainingLateFee = MoneyUtil.normalize(reassessedLateFee.subtract(totalLateFeePaid));
        if (remainingLateFee.compareTo(BigDecimal.ZERO) < 0) {
            remainingLateFee = BigDecimal.ZERO;
        }

        // Update installment with recalculated values
        installment.setPaidAmount(totalAmountPaid);
        installment.setRemainingAmount(recalculatedRemaining);
        installment.setLateFee(remainingLateFee);

        updateInstallmentStatus(installment);
        repaymentInstallmentRepository.save(installment);
    }

}