package com.microfinance.repository;

import com.microfinance.model.RiskAssessment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface RiskAssessmentRepository extends MongoRepository<RiskAssessment, String> {

    Optional<RiskAssessment> findTopByApplicationIdOrderByAssessedAtDesc(String applicationId);

    List<RiskAssessment> findByApplicationIdOrderByAssessedAtDesc(String applicationId);

    // Soft delete queries - exclude deleted records
    Optional<RiskAssessment> findTopByApplicationIdAndDeletedFalseOrderByAssessedAtDesc(String applicationId);

    List<RiskAssessment> findByApplicationIdAndDeletedFalseOrderByAssessedAtDesc(String applicationId);

    // Additional methods needed for fallback logic
    List<RiskAssessment> findByApplicationIdAndDeletedFalseOrderByCreatedAtDesc(String applicationId);

    List<RiskAssessment> findByApplicationIdAndDeletedFalse(String applicationId);

    Optional<RiskAssessment> findByIdAndDeletedFalse(String id);

    // Friendly ID search methods
    Optional<RiskAssessment> findByApplicationNumber(String applicationNumber);

    Optional<RiskAssessment> findByApplicantNumber(String applicantNumber);
}