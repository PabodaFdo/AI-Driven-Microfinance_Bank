package com.microfinance.repository;

import com.microfinance.model.LoanApplication;
import com.microfinance.model.LoanStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface LoanApplicationRepository extends MongoRepository<LoanApplication, String> {

    List<LoanApplication> findByStatus(LoanStatus status);

    List<LoanApplication> findByApplicantId(String applicantId);

    /** Used when an applicant is deleted — remove all their applications, returns count */
    long deleteByApplicantId(String applicantId);
}