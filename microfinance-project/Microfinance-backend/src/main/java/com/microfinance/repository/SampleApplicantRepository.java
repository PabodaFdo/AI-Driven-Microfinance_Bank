package com.microfinance.repository;

import com.microfinance.model.SampleApplicant;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for SampleApplicant entities in the sample_applicants collection.
 * This collection is used for READ-ONLY credit score lookups by NIC.
 */
@Repository
public interface SampleApplicantRepository extends MongoRepository<SampleApplicant, String> {

    /**
     * Find a sample applicant by their NIC for credit score lookup.
     * NIC should be normalized before calling this method.
     *
     * @param nic the normalized NIC (trimmed and uppercased)
     * @return Optional containing the SampleApplicant if found
     */
    Optional<SampleApplicant> findByNic(String nic);

    /**
     * Check if a sample applicant exists with the given NIC.
     *
     * @param nic the normalized NIC
     * @return true if exists, false otherwise
     */
    boolean existsByNic(String nic);

    /**
     * Custom query to find by NIC with case-insensitive search
     * (backup method in case normalization is inconsistent)
     *
     * @param nic the NIC to search for
     * @return Optional containing the SampleApplicant if found
     */
    @Query("{ 'nic': { $regex: ?0, $options: 'i' } }")
    Optional<SampleApplicant> findByNicIgnoreCase(String nic);
}