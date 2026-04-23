package com.microfinance.repository;

import com.microfinance.model.PaymentRecordStatus;
import com.microfinance.model.RepaymentPayment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface RepaymentPaymentRepository extends MongoRepository<RepaymentPayment, String> {

    List<RepaymentPayment> findByApplicationId(String applicationId);

    List<RepaymentPayment> findByApplicationIdOrderByPaymentDateDesc(String applicationId);

    List<RepaymentPayment> findByApplicationIdAndInstallmentNumberOrderByPaymentDateDesc(
            String applicationId,
            Integer installmentNumber
    );

    List<RepaymentPayment> findByApplicationIdAndInstallmentNumberAndActiveTrueOrderByPaymentDateDesc(
            String applicationId,
            Integer installmentNumber
    );

    List<RepaymentPayment> findByApplicationIdAndInstallmentNumberAndStatusOrderByPaymentDateDesc(
            String applicationId,
            Integer installmentNumber,
            PaymentRecordStatus status
    );

    // Paginated methods
    Page<RepaymentPayment> findByApplicationIdOrderByPaymentDateDesc(String applicationId, Pageable pageable);
}