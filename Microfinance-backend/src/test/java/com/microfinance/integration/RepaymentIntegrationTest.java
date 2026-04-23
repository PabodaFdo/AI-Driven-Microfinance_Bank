package com.microfinance.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.microfinance.config.TestMongoConfig;
import com.microfinance.dto.RecordRepaymentRequest;
import com.microfinance.model.LoanApplication;
import com.microfinance.model.LoanStatus;
import com.microfinance.model.RepaymentInstallment;
import com.microfinance.model.RepaymentStatus;
import com.microfinance.repository.LoanApplicationRepository;
import com.microfinance.repository.RepaymentInstallmentRepository;
import com.microfinance.util.RepaymentConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext
@Import(TestMongoConfig.class)
@DisplayName("Repayment Integration Tests")
class RepaymentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private LoanApplicationRepository loanApplicationRepository;

    @Autowired
    private RepaymentInstallmentRepository repaymentInstallmentRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private LoanApplication testApplication;

    @BeforeEach
    void setUp() {
        // Create test application (@DirtiesContext handles cleanup)
        testApplication = new LoanApplication();
        testApplication.setApplicationNumber("APP-INT-001");
        testApplication.setStatus(LoanStatus.APPROVED);
        testApplication.setAmount(120000.0);
        testApplication.setInterestRate(12.0);
        testApplication.setTermMonths(12);
        testApplication.setApplicantId("applicant-123");
        testApplication = loanApplicationRepository.save(testApplication);
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    @DisplayName("Should complete full repayment lifecycle")
    void shouldCompleteFullRepaymentLifecycle() throws Exception {
        // Step 1: Generate repayment schedule
        mockMvc.perform(post("/api/repayments/{applicationId}/generate", testApplication.getId())
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(12));

        // Verify schedule was created in database
        List<RepaymentInstallment> installments = repaymentInstallmentRepository
                .findByApplicationIdOrderByInstallmentNumberAsc(testApplication.getId());
        assertEquals(12, installments.size());

        RepaymentInstallment firstInstallment = installments.get(0);
        assertEquals(1, firstInstallment.getInstallmentNumber());
        assertEquals(RepaymentStatus.PENDING, firstInstallment.getStatus());
        assertTrue(firstInstallment.getInstallmentAmount().compareTo(BigDecimal.ZERO) > 0);
        assertFalse(firstInstallment.isArchived());

        // Step 2: Make partial payment
        RecordRepaymentRequest partialPayment = new RecordRepaymentRequest();
        partialPayment.setApplicationId(testApplication.getId());
        partialPayment.setInstallmentNumber(1);
        partialPayment.setAmountPaid(new BigDecimal("5000.00"));
        partialPayment.setLateFeePaid(BigDecimal.ZERO);
        partialPayment.setPaymentDate(LocalDate.now());
        partialPayment.setRecordedBy("test-officer");
        partialPayment.setNotes("Integration test partial payment");

        mockMvc.perform(post("/api/repayments/payments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(partialPayment)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amountPaid").value(5000.00));

        // Verify partial payment was processed
        RepaymentInstallment updatedInstallment = repaymentInstallmentRepository
                .findByApplicationIdAndInstallmentNumber(testApplication.getId(), 1)
                .orElseThrow();
        assertEquals(new BigDecimal("5000.00"), updatedInstallment.getPaidAmount());
        assertEquals(RepaymentStatus.PARTIAL, updatedInstallment.getStatus());
        assertTrue(updatedInstallment.getRemainingAmount().compareTo(BigDecimal.ZERO) > 0);

        // Step 3: Complete the payment
        BigDecimal remainingAmount = updatedInstallment.getRemainingAmount();
        RecordRepaymentRequest fullPayment = new RecordRepaymentRequest();
        fullPayment.setApplicationId(testApplication.getId());
        fullPayment.setInstallmentNumber(1);
        fullPayment.setAmountPaid(remainingAmount);
        fullPayment.setLateFeePaid(BigDecimal.ZERO);
        fullPayment.setPaymentDate(LocalDate.now());
        fullPayment.setRecordedBy("test-officer");
        fullPayment.setNotes("Integration test full payment");

        mockMvc.perform(post("/api/repayments/payments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fullPayment)))
                .andExpect(status().isOk());

        // Verify full payment was processed
        RepaymentInstallment fullyPaidInstallment = repaymentInstallmentRepository
                .findByApplicationIdAndInstallmentNumber(testApplication.getId(), 1)
                .orElseThrow();
        assertEquals(RepaymentStatus.PAID, fullyPaidInstallment.getStatus());
        assertEquals(BigDecimal.ZERO, fullyPaidInstallment.getRemainingAmount());

        // Step 4: Verify payment history
        mockMvc.perform(get("/api/repayments/{applicationId}/history", testApplication.getId())
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(2)) // Two payments made
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    @DisplayName("Should handle overdue payments and late fees")
    void shouldHandleOverduePaymentsAndLateFees() throws Exception {
        // Step 1: Generate schedule
        mockMvc.perform(post("/api/repayments/{applicationId}/generate", testApplication.getId())
                        .with(csrf()))
                .andExpect(status().isOk());

        // Step 2: Manually set due date to past to simulate overdue
        List<RepaymentInstallment> installments = repaymentInstallmentRepository
                .findByApplicationIdOrderByInstallmentNumberAsc(testApplication.getId());
        RepaymentInstallment firstInstallment = installments.get(0);

        // Set due date to be past the grace period
        LocalDate overdueDate = LocalDate.now().minusDays(RepaymentConstants.GRACE_PERIOD_DAYS + 1);
        firstInstallment.setDueDate(overdueDate);
        repaymentInstallmentRepository.save(firstInstallment);

        // Step 3: Process overdues
        mockMvc.perform(post("/api/repayments/{applicationId}/process-overdues", testApplication.getId())
                        .with(csrf()))
                .andExpect(status().isOk());

        // Step 4: Verify overdue status and late fee
        RepaymentInstallment overdueInstallment = repaymentInstallmentRepository
                .findByApplicationIdAndInstallmentNumber(testApplication.getId(), 1)
                .orElseThrow();
        assertEquals(RepaymentStatus.OVERDUE, overdueInstallment.getStatus());
        assertTrue(overdueInstallment.getLateFee().compareTo(BigDecimal.ZERO) > 0);

        // Verify late fee calculation
        BigDecimal expectedLateFee = overdueInstallment.getRemainingAmount()
                .multiply(RepaymentConstants.LATE_FEE_PERCENTAGE);
        assertEquals(0, expectedLateFee.compareTo(overdueInstallment.getLateFee()));

        // Step 5: Get overdue installments
        mockMvc.perform(get("/api/repayments/overdue")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].status").value("OVERDUE"));
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    @DisplayName("Should close repayment schedule when fully paid")
    void shouldCloseRepaymentScheduleWhenFullyPaid() throws Exception {
        // Step 1: Generate schedule with single installment for easier testing
        testApplication.setTermMonths(1); // Single installment
        testApplication = loanApplicationRepository.save(testApplication);

        mockMvc.perform(post("/api/repayments/{applicationId}/generate", testApplication.getId())
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        // Step 2: Pay the installment fully
        RepaymentInstallment installment = repaymentInstallmentRepository
                .findByApplicationIdOrderByInstallmentNumberAsc(testApplication.getId())
                .get(0);

        RecordRepaymentRequest fullPayment = new RecordRepaymentRequest();
        fullPayment.setApplicationId(testApplication.getId());
        fullPayment.setInstallmentNumber(1);
        fullPayment.setAmountPaid(installment.getInstallmentAmount());
        fullPayment.setLateFeePaid(BigDecimal.ZERO);
        fullPayment.setPaymentDate(LocalDate.now());
        fullPayment.setRecordedBy("test-officer");

        mockMvc.perform(post("/api/repayments/payments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fullPayment)))
                .andExpect(status().isOk());

        // Step 3: Close the schedule
        mockMvc.perform(post("/api/repayments/{applicationId}/close", testApplication.getId())
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());

        // Step 4: Verify schedule is closed
        RepaymentInstallment closedInstallment = repaymentInstallmentRepository
                .findByApplicationIdAndInstallmentNumber(testApplication.getId(), 1)
                .orElseThrow();
        assertEquals(RepaymentStatus.CLOSED, closedInstallment.getStatus());
        assertTrue(closedInstallment.isArchived());
    }

    @Test
    @WithMockUser(roles = {"USER"})
    @DisplayName("Should deny access to unauthorized user roles")
    void shouldDenyAccessToUnauthorizedUserRoles() throws Exception {
        // Test various endpoints with unauthorized role
        mockMvc.perform(post("/api/repayments/{applicationId}/generate", testApplication.getId())
                        .with(csrf()))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/repayments/{applicationId}", testApplication.getId()))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/repayments/{applicationId}/history", testApplication.getId()))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/repayments/overdue"))
                .andExpect(status().isForbidden());

        RecordRepaymentRequest request = new RecordRepaymentRequest();
        request.setApplicationId(testApplication.getId());
        request.setInstallmentNumber(1);
        request.setAmountPaid(new BigDecimal("1000.00"));

        mockMvc.perform(post("/api/repayments/payments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should deny access to unauthenticated users")
    void shouldDenyAccessToUnauthenticatedUsers() throws Exception {
        // Test without any authentication
        mockMvc.perform(post("/api/repayments/{applicationId}/generate", testApplication.getId())
                        .with(csrf()))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/repayments/{applicationId}", testApplication.getId()))
                .andExpect(status().isUnauthorized());
    }
}