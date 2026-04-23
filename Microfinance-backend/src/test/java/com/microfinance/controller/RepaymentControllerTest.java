package com.microfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.microfinance.dto.RecordRepaymentRequest;
import com.microfinance.model.RepaymentInstallment;
import com.microfinance.model.RepaymentPayment;
import com.microfinance.model.RepaymentStatus;
import com.microfinance.service.RepaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RepaymentController.class)
@DisplayName("Repayment Controller Tests")
class RepaymentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RepaymentService repaymentService;

    @Autowired
    private ObjectMapper objectMapper;

    private RepaymentInstallment testInstallment;
    private RepaymentPayment testPayment;

    @BeforeEach
    void setUp() {
        testInstallment = new RepaymentInstallment();
        testInstallment.setId("inst-123");
        testInstallment.setApplicationId("app-123");
        testInstallment.setApplicationNumber("APP-001");
        testInstallment.setInstallmentNumber(1);
        testInstallment.setDueDate(LocalDate.now().plusDays(30));
        testInstallment.setInstallmentAmount(new BigDecimal("9000.00"));
        testInstallment.setPaidAmount(BigDecimal.ZERO);
        testInstallment.setRemainingAmount(new BigDecimal("9000.00"));
        testInstallment.setLateFee(BigDecimal.ZERO);
        testInstallment.setStatus(RepaymentStatus.PENDING);

        testPayment = new RepaymentPayment();
        testPayment.setId("pay-123");
        testPayment.setPaymentReference("PAY-12345678");
        testPayment.setApplicationId("app-123");
        testPayment.setApplicationNumber("APP-001");
        testPayment.setInstallmentNumber(1);
        testPayment.setAmountPaid(new BigDecimal("5000.00"));
        testPayment.setLateFeePaid(BigDecimal.ZERO);
        testPayment.setPaymentDate(LocalDate.now());
        testPayment.setRecordedBy("officer");
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    @DisplayName("Should generate repayment schedule for authorized admin")
    void shouldGenerateRepaymentScheduleForAuthorizedAdmin() throws Exception {
        // Given
        String applicationId = "app-123";
        List<RepaymentInstallment> schedule = Arrays.asList(testInstallment);
        when(repaymentService.generateScheduleForApprovedApplication(applicationId))
                .thenReturn(schedule);

        // When & Then
        mockMvc.perform(post("/api/repayments/{applicationId}/generate", applicationId)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value("inst-123"))
                .andExpect(jsonPath("$[0].applicationId").value("app-123"))
                .andExpect(jsonPath("$[0].installmentNumber").value(1))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    @WithMockUser(roles = {"MANAGER"})
    @DisplayName("Should generate repayment schedule for authorized manager")
    void shouldGenerateRepaymentScheduleForAuthorizedManager() throws Exception {
        // Given
        String applicationId = "app-123";
        List<RepaymentInstallment> schedule = Arrays.asList(testInstallment);
        when(repaymentService.generateScheduleForApprovedApplication(applicationId))
                .thenReturn(schedule);

        // When & Then
        mockMvc.perform(post("/api/repayments/{applicationId}/generate", applicationId)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser(roles = {"OFFICER"})
    @DisplayName("Should generate repayment schedule for authorized officer")
    void shouldGenerateRepaymentScheduleForAuthorizedOfficer() throws Exception {
        // Given
        String applicationId = "app-123";
        List<RepaymentInstallment> schedule = Arrays.asList(testInstallment);
        when(repaymentService.generateScheduleForApprovedApplication(applicationId))
                .thenReturn(schedule);

        // When & Then
        mockMvc.perform(post("/api/repayments/{applicationId}/generate", applicationId)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser(roles = {"USER"})
    @DisplayName("Should deny access to unauthorized user")
    void shouldDenyAccessToUnauthorizedUser() throws Exception {
        // Given
        String applicationId = "app-123";

        // When & Then
        mockMvc.perform(post("/api/repayments/{applicationId}/generate", applicationId)
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should deny access to unauthenticated user")
    void shouldDenyAccessToUnauthenticatedUser() throws Exception {
        // Given
        String applicationId = "app-123";

        // When & Then
        mockMvc.perform(post("/api/repayments/{applicationId}/generate", applicationId)
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    @DisplayName("Should get repayment schedule")
    void shouldGetRepaymentSchedule() throws Exception {
        // Given
        String applicationId = "app-123";
        List<RepaymentInstallment> schedule = Arrays.asList(testInstallment);
        when(repaymentService.getSchedule(applicationId)).thenReturn(schedule);

        // When & Then
        mockMvc.perform(get("/api/repayments/{applicationId}", applicationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value("inst-123"));
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    @DisplayName("Should get paginated payment history")
    void shouldGetPaginatedPaymentHistory() throws Exception {
        // Given
        String applicationId = "app-123";
        List<RepaymentPayment> payments = Arrays.asList(testPayment);
        Page<RepaymentPayment> pagedPayments = new PageImpl<>(payments, Pageable.ofSize(10), 1);
        when(repaymentService.getPaymentHistory(eq(applicationId), any(Pageable.class)))
                .thenReturn(pagedPayments);

        // When & Then
        mockMvc.perform(get("/api/repayments/{applicationId}/history", applicationId)
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].id").value("pay-123"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1));
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    @DisplayName("Should record payment")
    void shouldRecordPayment() throws Exception {
        // Given
        RecordRepaymentRequest request = new RecordRepaymentRequest();
        request.setApplicationId("app-123");
        request.setInstallmentNumber(1);
        request.setAmountPaid(new BigDecimal("5000.00"));
        request.setLateFeePaid(BigDecimal.ZERO);
        request.setPaymentDate(LocalDate.now());
        request.setRecordedBy("officer");
        request.setNotes("Partial payment");

        when(repaymentService.recordPayment(any(RecordRepaymentRequest.class)))
                .thenReturn(testPayment);

        // When & Then
        mockMvc.perform(post("/api/repayments/payments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("pay-123"))
                .andExpect(jsonPath("$.amountPaid").value(5000.00))
                .andExpect(jsonPath("$.recordedBy").value("officer"));
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    @DisplayName("Should get paginated overdue installments")
    void shouldGetPaginatedOverdueInstallments() throws Exception {
        // Given
        testInstallment.setStatus(RepaymentStatus.OVERDUE);
        List<RepaymentInstallment> overdueInstallments = Arrays.asList(testInstallment);
        Page<RepaymentInstallment> pagedOverdue = new PageImpl<>(overdueInstallments, Pageable.ofSize(10), 1);
        when(repaymentService.getOverdueInstallments(any(Pageable.class)))
                .thenReturn(pagedOverdue);

        // When & Then
        mockMvc.perform(get("/api/repayments/overdue")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].status").value("OVERDUE"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    @DisplayName("Should process overdues for application")
    void shouldProcessOverduesForApplication() throws Exception {
        // Given
        String applicationId = "app-123";

        // When & Then
        mockMvc.perform(post("/api/repayments/{applicationId}/process-overdues", applicationId)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Overdue processing completed for application app-123"));
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    @DisplayName("Should close repayment schedule")
    void shouldCloseRepaymentSchedule() throws Exception {
        // Given
        String applicationId = "app-123";
        String expectedMessage = "Repayment schedule closed successfully for application: app-123";
        when(repaymentService.closeSchedule(applicationId)).thenReturn(expectedMessage);

        // When & Then
        mockMvc.perform(post("/api/repayments/{applicationId}/close", applicationId)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(expectedMessage));
    }
}