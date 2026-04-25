package com.microfinance.repository;

import com.microfinance.model.Applicant;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ApplicantRepository extends MongoRepository<Applicant, String> {

    Optional<Applicant> findByNic(String nic);

    Optional<Applicant> findByEmailIgnoreCase(String email);

    /** Case-insensitive search on NIC or fullName */
    @Query("{ '$or': [ { 'nic': { '$regex': ?0, '$options': 'i' } }," +
                      "{ 'fullName': { '$regex': ?0, '$options': 'i' } } ] }")
    List<Applicant> searchByNicOrName(String query);
}