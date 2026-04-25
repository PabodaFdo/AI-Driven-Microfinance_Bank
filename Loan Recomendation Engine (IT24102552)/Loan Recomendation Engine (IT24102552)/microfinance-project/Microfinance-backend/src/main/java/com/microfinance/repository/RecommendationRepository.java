package com.microfinance.repository;

import com.microfinance.model.Recommendation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface RecommendationRepository extends MongoRepository<Recommendation, String> {

    // Existing methods
    Optional<Recommendation> findTopByApplicationIdOrderByGeneratedAtDesc(String applicationId);
    List<Recommendation> findByApplicationIdOrderByGeneratedAtDesc(String applicationId);

    // New methods for archive functionality
    Optional<Recommendation> findTopByApplicationIdAndArchivedFalseOrderByGeneratedAtDesc(String applicationId);
    List<Recommendation> findByApplicationIdAndArchivedFalseOrderByGeneratedAtDesc(String applicationId);
    List<Recommendation> findByApplicationIdAndArchivedFalse(String applicationId);
    List<Recommendation> findByApplicationIdAndArchivedTrueOrderByArchivedAtDesc(String applicationId);

    // Find active (non-archived) recommendations
    List<Recommendation> findByArchivedFalseOrderByGeneratedAtDesc();

    // Find archived recommendations
    List<Recommendation> findByArchivedTrueOrderByArchivedAtDesc();

    // Custom query to find recommendations by status excluding archived
    @Query("{ 'status': ?0, 'archived': false }")
    List<Recommendation> findByStatusAndNotArchived(String status);

    // Check if active recommendation exists for application
    @Query("{ 'applicationId': ?0, 'archived': false }")
    boolean existsByApplicationIdAndNotArchived(String applicationId);

    // Friendly ID search methods
    Optional<Recommendation> findByApplicationNumber(String applicationNumber);

    Optional<Recommendation> findByApplicantNumber(String applicantNumber);
}