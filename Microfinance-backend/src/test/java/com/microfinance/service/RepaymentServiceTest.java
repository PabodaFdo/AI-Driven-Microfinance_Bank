package com.microfinance.service;

import com.microfinance.dto.RecordRepaymentRequest;
import com.microfinance.exception.BusinessException;
import com.microfinance.exception.ResourceNotFoundException;
import com.microfinance.model.LoanApplication;
import com.microfinance.model.LoanStatus;
import com.microfinance.model.RepaymentInstallment;
import com.microfinance.model.RepaymentPayment;
import com.microfinance.model.RepaymentStatus;
import com.microfinance.repository.LoanApplicationRepository;
import com.microfinance.repository.RepaymentInstallmentRepository;
import com.microfinance.repository.RepaymentPaymentRepository;
import com.microfinance.util.RepaymentConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Repayment Service Tests")
class RepaymentServiceTest {

    @Mock
    private LoanApplicationRepository loanApplicationRepository;

    @Mock
    private RepaymentInstallmentRepository repaymentInstallmentRepository;

    @Mock
    private RepaymentPaymentRepository repaymentPaymentRepository;

    @InjectMocks
    private RepaymentService repaymentService;

    private LoanApplication testApplication;
    private RepaymentInstallment testInstallment;

    @BeforeEach
    void setUp() {
        testApplication = new LoanApplication();
        testApplication.setId("app-123");
        testApplication.setApplicationNumber("APP-001");
        testApplication.setStatus(LoanStatus.APPROVED);
        testApplication.setAmount(100000.0);
        testApplication.setInterestRate(12.0);
        testApplication.setTermMonths(12);

        testInstallment = new RepaymentInstallment();
        testInstallment.setId("inst-123");
        testInstallment.setApplicationId("app-123");
        testInstallment.setApplicationNumber("APP-001");
        testInstallment.setInstallmentNumber(1);
        testInstallment.setDueDate(LocalDate.now().minusDays(10));
        testInstallment.setInstallmentAmount(new BigDecimal("9000.00"));
        testInstallment.setPaidAmount(BigDecimal.ZERO);
        testInstallment.setRemainingAmount(new BigDecimal("9000.00"));
        testInstallment.setLateFee(BigDecimal.ZERO);
        testInstallment.setStatus(RepaymentStatus.PENDING);
        testInstallment.setArchived(false);
    }

    @Test
    @DisplayName("Should generate repayment schedule for approved application")
    void shouldGenerateRepaymentScheduleForApprovedApplication() {
        // Given
        String applicationId = "app-123";
        when(loanApplicationRepository.findById(applicationId)).thenReturn(Optional.of(testApplication));
        when(repaymentInstallmentRepository.findByApplicationIdOrderByInstallmentNumberAsc(applicationId))
                .thenReturn(List.of());
        when(repaymentInstallmentRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        List<RepaymentInstallment> result = repaymentService.generateScheduleForApprovedApplication(applicationId);

        // Then
        assertNotNull(result);
        assertEquals(12, result.size());
        verify(repaymentInstallmentRepository).saveAll(anyList());

        // Verify first installment
        RepaymentInstallment firstInstallment = result.get(0);
        assertEquals(1, firstInstallment.getInstallmentNumber());
        assertEquals("app-123", firstInstallment.getApplicationId());
        assertEquals("APP-001", firstInstallment.getApplicationNumber());
        assertNotNull(firstInstallment.getDueDate());
        assertTrue(firstInstallment.getInstallmentAmount().compareTo(BigDecimal.ZERO) > 0);
        assertEquals(RepaymentStatus.PENDING, firstInstallment.getStatus());
        assertFalse(firstInstallment.isArchived());
    }

    @Test
    @DisplayName("Should throw exception when generating schedule for non-approved application")
    void shouldThrowExceptionWhenGeneratingScheduleForNonApprovedApplication() {
        // Given
        String applicationId = "app-123";
        testApplication.setStatus(LoanStatus.PENDING);
        when(loanApplicationRepository.findById(applicationId)).thenReturn(Optional.of(testApplication));

        // When & Then
        BusinessException exception = assertThrows(BusinessException.class,
                () -> repaymentService.generateScheduleForApprovedApplication(applicationId));

        assertEquals("Repayment schedule can only be generated for APPROVED applications.", exception.getMessage());
        verify(repaymentInstallmentRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("Should throw exception when application not found")
    void shouldThrowExceptionWhenApplicationNotFound() {
        // Given
        String applicationId = "non-existent";
        when(loanApplicationRepository.findById(applicationId)).thenReturn(Optional.empty());

        // When & Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> repaymentService.generateScheduleForApprovedApplication(applicationId));

        assertEquals("Loan application not found: non-existent", exception.getMessage());
    }

    @Test
    @DisplayName("Should return existing schedule if already generated")
    void shouldReturnExistingScheduleIfAlreadyGenerated() {
        // Given
        String applicationId = "app-123";
        List<RepaymentInstallment> existingInstallments = Arrays.asList(testInstallment);
        when(loanApplicationRepository.findById(applicationId)).thenReturn(Optional.of(testApplication));
        when(repaymentInstallmentRepository.findByApplicationIdOrderByInstallmentNumberAsc(applicationId))
                .thenReturn(existingInstallments);

        // When
        List<RepaymentInstallment> result = repaymentService.generateScheduleForApprovedApplication(applicationId);

        // Then
        assertSame(existingInstallments, result);
        verify(repaymentInstallmentRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("Should record partial payment successfully")
    void shouldRecordPartialPaymentSuccessfully() {
        // Given
        RecordRepaymentRequest request = new RecordRepaymentRequest();
        request.setApplicationId("app-123");
        request.setInstallmentNumber(1);
        request.setAmountPaid(new BigDecimal("5000.00"));
        request.setLateFeePaid(BigDecimal.ZERO);
        request.setPaymentDate(LocalDate.now());
        request.setRecordedBy("officer");
        request.setNotes("Partial payment");

        when(repaymentInstallmentRepository.findByApplicationIdAndInstallmentNumber("app-123", 1))
                .thenReturn(Optional.of(testInstallment));
        when(repaymentInstallmentRepository.save(any(RepaymentInstallment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(repaymentPaymentRepository.save(any(RepaymentPayment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        RepaymentPayment result = repaymentService.recordPayment(request);

        // Then
        assertNotNull(result);
        assertEquals(new BigDecimal("5000.00"), result.getAmountPaid());
        assertEquals("app-123", result.getApplicationId());
        assertEquals(1, result.getInstallmentNumber());
        assertEquals("officer", result.getRecordedBy());

        // Verify installment was updated
        ArgumentCaptor<RepaymentInstallment> installmentCaptor = ArgumentCaptor.forClass(RepaymentInstallment.class);
        verify(repaymentInstallmentRepository).save(installmentCaptor.capture());
        RepaymentInstallment updatedInstallment = installmentCaptor.getValue();

        assertEquals(new BigDecimal("5000.00"), updatedInstallment.getPaidAmount());
        assertEquals(new BigDecimal("4000.00"), updatedInstallment.getRemainingAmount());
        assertEquals(RepaymentStatus.PARTIAL, updatedInstallment.getStatus());
    }

    @Test
    @DisplayName("Should record full payment and mark as PAID")
    void shouldRecordFullPaymentAndMarkAsPaid() {
        // Given
        RecordRepaymentRequest request = new RecordRepaymentRequest();
        request.setApplicationId("app-123");
        request.setInstallmentNumber(1);
        request.setAmountPaid(new BigDecimal("9000.00"));
        request.setLateFeePaid(BigDecimal.ZERO);

        when(repaymentInstallmentRepository.findByApplicationIdAndInstallmentNumber("app-123", 1))
                .thenReturn(Optional.of(testInstallment));
        when(repaymentInstallmentRepository.save(any(RepaymentInstallment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(repaymentPaymentRepository.save(any(RepaymentPayment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        repaymentService.recordPayment(request);

        // Then
        ArgumentCaptor<RepaymentInstallment> installmentCaptor = ArgumentCaptor.forClass(RepaymentInstallment.class);
        verify(repaymentInstallmentRepository).save(installmentCaptor.capture());
        RepaymentInstallment updatedInstallment = installmentCaptor.getValue();

        assertEquals(new BigDecimal("9000.00"), updatedInstallment.getPaidAmount());
        assertEquals(BigDecimal.ZERO, updatedInstallment.getRemainingAmount());
        assertEquals(RepaymentStatus.PAID, updatedInstallment.getStatus());
    }

    @Test
    @DisplayName("Should throw exception when payment exceeds remaining amount")
    void shouldThrowExceptionWhenPaymentExceedsRemainingAmount() {
        // Given
        RecordRepaymentRequest request = new RecordRepaymentRequest();
        request.setApplicationId("app-123");
        request.setInstallmentNumber(1);
        request.setAmountPaid(new BigDecimal("10000.00")); // More than remaining

        when(repaymentInstallmentRepository.findByApplicationIdAndInstallmentNumber("app-123", 1))
                .thenReturn(Optional.of(testInstallment));

        // When & Then
        BusinessException exception = assertThrows(BusinessException.class,
                () -> repaymentService.recordPayment(request));

        assertEquals("Payment amount cannot exceed remaining installment amount.", exception.getMessage());
        verify(repaymentInstallmentRepository, never()).save(any());
        verify(repaymentPaymentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should process overdue installments and add late fees")
    void shouldProcessOverdueInstallmentsAndAddLateFees() {
        // Given
        String applicationId = "app-123";
        testInstallment.setDueDate(LocalDate.now().minusDays(10)); // Past due date
        testInstallment.setStatus(RepaymentStatus.PENDING);
        testInstallment.setRemainingAmount(new BigDecimal("9000.00"));
        testInstallment.setLateFee(BigDecimal.ZERO);

        List<RepaymentInstallment> installments = Arrays.asList(testInstallment);
        when(repaymentInstallmentRepository.findByApplicationIdAndArchivedFalseOrderByInstallmentNumberAsc(applicationId))
                .thenReturn(installments);
        when(repaymentInstallmentRepository.saveAll(anyList()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        repaymentService.processOverduesForApplication(applicationId);

        // Then
        ArgumentCaptor<List<RepaymentInstallment>> captor = ArgumentCaptor.forClass(List.class);
        verify(repaymentInstallmentRepository).saveAll(captor.capture());
        List<RepaymentInstallment> updatedInstallments = captor.getValue();

        assertEquals(1, updatedInstallments.size());
        RepaymentInstallment updatedInstallment = updatedInstallments.get(0);
        assertEquals(RepaymentStatus.OVERDUE, updatedInstallment.getStatus());

        // Verify late fee calculation (should be RepaymentConstants.LATE_FEE_PERCENTAGE * remaining amount)
        BigDecimal expectedLateFee = testInstallment.getRemainingAmount()
                .multiply(RepaymentConstants.LATE_FEE_PERCENTAGE);
        assertEquals(0, expectedLateFee.compareTo(updatedInstallment.getLateFee()));
    }

    @Test
    @DisplayName("Should close repayment schedule when fully paid")
    void shouldCloseRepaymentScheduleWhenFullyPaid() {
        // Given
        String applicationId = "app-123";
        testInstallment.setRemainingAmount(BigDecimal.ZERO);
        testInstallment.setLateFee(BigDecimal.ZERO);
        testInstallment.setStatus(RepaymentStatus.PAID);

        List<RepaymentInstallment> installments = Arrays.asList(testInstallment);
        when(repaymentInstallmentRepository.findByApplicationIdOrderByInstallmentNumberAsc(applicationId))
                .thenReturn(installments);
        when(repaymentInstallmentRepository.saveAll(anyList()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        String result = repaymentService.closeSchedule(applicationId);

        // Then
        assertEquals("Repayment schedule closed successfully for application: app-123", result);

        ArgumentCaptor<List<RepaymentInstallment>> captor = ArgumentCaptor.forClass(List.class);
        verify(repaymentInstallmentRepository).saveAll(captor.capture());
        List<RepaymentInstallment> updatedInstallments = captor.getValue();

        assertEquals(1, updatedInstallments.size());
        RepaymentInstallment closedInstallment = updatedInstallments.get(0);
        assertEquals(RepaymentStatus.CLOSED, closedInstallment.getStatus());
        assertTrue(closedInstallment.isArchived());
    }

    @Test
    @DisplayName("Should throw exception when closing schedule with outstanding amounts")
    void shouldThrowExceptionWhenClosingScheduleWithOutstandingAmounts() {
        // Given
        String applicationId = "app-123";
        testInstallment.setRemainingAmount(new BigDecimal("1000.00")); // Outstanding amount
        testInstallment.setLateFee(BigDecimal.ZERO);

        List<RepaymentInstallment> installments = Arrays.asList(testInstallment);
        when(repaymentInstallmentRepository.findByApplicationIdOrderByInstallmentNumberAsc(applicationId))
                .thenReturn(installments);

        // When & Then
        BusinessException exception = assertThrows(BusinessException.class,
                () -> repaymentService.closeSchedule(applicationId));

        assertEquals("Cannot close repayment schedule because there are unpaid installments or late fees.",
                exception.getMessage());
        verify(repaymentInstallmentRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("Should get paginated payment history")
    void shouldGetPaginatedPaymentHistory() {
        // Given
        String applicationId = "app-123";
        Pageable pageable = Pageable.ofSize(10);
        List<RepaymentPayment> payments = Arrays.asList(new RepaymentPayment(), new RepaymentPayment());
        Page<RepaymentPayment> pagedPayments = new PageImpl<>(payments, pageable, 2);

        when(repaymentPaymentRepository.findByApplicationIdOrderByPaymentDateDesc(applicationId, pageable))
                .thenReturn(pagedPayments);

        // When
        Page<RepaymentPayment> result = repaymentService.getPaymentHistory(applicationId, pageable);

        // Then
        assertNotNull(result);
        assertEquals(2, result.getContent().size());
        assertEquals(2, result.getTotalElements());
        verify(repaymentPaymentRepository).findByApplicationIdOrderByPaymentDateDesc(applicationId, pageable);
    }

    @Test
    @DisplayName("Should get paginated overdue installments")
    void shouldGetPaginatedOverdueInstallments() {
        // Given
        Pageable pageable = Pageable.ofSize(10);
        List<RepaymentInstallment> overdueInstallments = Arrays.asList(testInstallment);
        Page<RepaymentInstallment> pagedOverdue = new PageImpl<>(overdueInstallments, pageable, 1);

        when(repaymentInstallmentRepository.findByStatusInAndArchivedFalse(
                List.of(RepaymentStatus.OVERDUE), pageable))
                .thenReturn(pagedOverdue);
        when(repaymentInstallmentRepository.findByStatusInAndArchivedFalse(anyList()))
                .thenReturn(overdueInstallments);
        when(repaymentInstallmentRepository.saveAll(anyList()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Page<RepaymentInstallment> result = repaymentService.getOverdueInstallments(pageable);

        // Then
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals(1, result.getTotalElements());
    }
}