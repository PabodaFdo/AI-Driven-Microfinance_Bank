package com.microfinance.repository;

import com.microfinance.model.RepaymentInstallment;
import com.microfinance.model.RepaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RepaymentInstallmentRepository extends MongoRepository<RepaymentInstallment, String> {

    boolean existsByApplicationId(String applicationId);

    List<RepaymentInstallment> findByApplicationIdOrderByInstallmentNumberAsc(String applicationId);

    List<RepaymentInstallment> findByApplicationIdAndArchivedFalseOrderByInstallmentNumberAsc(String applicationId);

    Optional<RepaymentInstallment> findByApplicationIdAndInstallmentNumber(String applicationId, Integer installmentNumber);

    List<RepaymentInstallment> findByStatusInAndArchivedFalse(Collection<RepaymentStatus> statuses);

    // Paginated methods
    Page<RepaymentInstallment> findByStatusInAndArchivedFalse(Collection<RepaymentStatus> statuses, Pageable pageable);
}