package com.microfinance.controller;

import com.microfinance.dto.RecordRepaymentRequest;
import com.microfinance.dto.UpdateRepaymentPaymentRequest;
import com.microfinance.dto.VoidRepaymentPaymentRequest;
import com.microfinance.model.RepaymentInstallment;
import com.microfinance.model.RepaymentPayment;
import com.microfinance.service.RepaymentService;
import com.microfinance.util.RepaymentConstants;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/repayments")
@RequiredArgsConstructor
public class RepaymentController {

    private final RepaymentService repaymentService;

    @PostMapping("/{applicationId}/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public List<RepaymentInstallment> generateSchedule(@PathVariable String applicationId) {
        if (applicationId == null || applicationId.trim().isEmpty()) {
            throw new IllegalArgumentException("Application ID is required and cannot be blank");
        }
        return repaymentService.generateScheduleForApprovedApplication(applicationId);
    }

    @GetMapping("/{applicationId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public List<RepaymentInstallment> getSchedule(@PathVariable String applicationId) {
        if (applicationId == null || applicationId.trim().isEmpty()) {
            throw new IllegalArgumentException("Application ID is required and cannot be blank");
        }
        return repaymentService.getSchedule(applicationId);
    }

    @GetMapping("/{applicationId}/history")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public Page<RepaymentPayment> getPaymentHistory(
            @PathVariable String applicationId,
            @PageableDefault(size = 20, sort = "paymentDate") Pageable pageable) {
        if (applicationId == null || applicationId.trim().isEmpty()) {
            throw new IllegalArgumentException("Application ID is required and cannot be blank");
        }
        return repaymentService.getPaymentHistory(applicationId, pageable);
    }

    @PostMapping("/payments")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public RepaymentPayment recordPayment(@Valid @RequestBody RecordRepaymentRequest request) {
        return repaymentService.recordPayment(request);
    }

    @PostMapping("/payments/{paymentId}/void")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<RepaymentPayment> voidPayment(
            @PathVariable String paymentId,
            @Valid @RequestBody VoidRepaymentPaymentRequest request) {
        if (paymentId == null || paymentId.trim().isEmpty()) {
            throw new IllegalArgumentException("Payment ID is required and cannot be blank");
        }
        return ResponseEntity.ok(repaymentService.voidPayment(paymentId, request));
    }

    @GetMapping("/overdue")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public Page<RepaymentInstallment> getOverdueInstallments(
            @PageableDefault(size = 20, sort = "dueDate") Pageable pageable) {
        return repaymentService.getOverdueInstallments(pageable);
    }

    @PostMapping("/{applicationId}/process-overdues")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<Map<String, String>> processOverdues(@PathVariable String applicationId) {
        if (applicationId == null || applicationId.trim().isEmpty()) {
            throw new IllegalArgumentException("Application ID is required and cannot be blank");
        }
        repaymentService.processOverduesForApplication(applicationId);
        return ResponseEntity.ok(Map.of(RepaymentConstants.RESPONSE_MESSAGE_KEY, "Overdue processing completed for application " + applicationId));
    }

    @PostMapping("/{applicationId}/close")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<Map<String, String>> closeSchedule(@PathVariable String applicationId) {
        if (applicationId == null || applicationId.trim().isEmpty()) {
            throw new IllegalArgumentException("Application ID is required and cannot be blank");
        }
        String message = repaymentService.closeSchedule(applicationId);
        return ResponseEntity.ok(Map.of(RepaymentConstants.RESPONSE_MESSAGE_KEY, message));
    }

    @PutMapping("/payments/{paymentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<?> updatePayment(
            @PathVariable String paymentId,
            @Valid @RequestBody UpdateRepaymentPaymentRequest request) {
        return ResponseEntity.badRequest().body(
                Map.of("message", "Direct editing is disabled. Void the payment and create a new one.")
        );
    }

    @DeleteMapping("/payments/{paymentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<?> deletePayment(@PathVariable String paymentId) {
        return ResponseEntity.badRequest().body(
                Map.of("message", "Hard delete is disabled. Void the payment instead.")
        );
    }
}