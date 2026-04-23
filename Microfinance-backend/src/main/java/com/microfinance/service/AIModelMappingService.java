package com.microfinance.service;

import com.microfinance.dto.LoanRiskPredictionRequest;
import com.microfinance.model.Applicant;
import com.microfinance.model.LoanApplication;
import com.microfinance.util.NICParser;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Maps website data (Applicant + LoanApplication) to AI Model request schema
 * Handles type conversions, calculations, and safe defaults
 */
@Slf4j
@Service
public class AIModelMappingService {

    /**
     * Convert website Applicant + LoanApplication to AI model request
     * @param applicant Website applicant data
     * @param application Website loan application data
     * @return AI model request DTO
     */
    public LoanRiskPredictionRequest createAIRequest(Applicant applicant, LoanApplication application) {
        LoanRiskPredictionRequest request = new LoanRiskPredictionRequest();

        // ===== REQUIRED NUMERIC FIELDS =====

        // Age: Use pre-calculated from NIC, or extract if missing
        Integer age = applicant.getAge();
        if (age == null || age < 0) {
            age = NICParser.extractAge(applicant.getNic());
            if (age < 0) {
                log.warn("Failed to extract age from NIC: {}. Using default age 40", applicant.getNic());
                age = 40;  // Safe fallback
            }
        }
        request.setAge(age);

        // Income: Convert monthly to annual (multiply by 12)
        Double monthlyIncome = applicant.getMonthlyIncome();
        if (monthlyIncome == null || monthlyIncome <= 0) {
            log.warn("Invalid monthly income for applicant {}: {}. Using default 0", applicant.getId(), monthlyIncome);
            monthlyIncome = 0.0;
        }
        Double annualIncome = monthlyIncome * 12;
        request.setIncome(annualIncome);

        // LoanAmount: From application
        Double loanAmount = application.getAmount();
        if (loanAmount == null || loanAmount <= 0) {
            log.warn("Invalid loan amount for application {}: {}. Using default 0", application.getId(), loanAmount);
            loanAmount = 0.0;
        }
        request.setLoanAmount(loanAmount);

        // CreditScore: Auto-calculated by website
        Integer creditScore = applicant.getCreditScore();
        if (creditScore == null) {
            log.warn("Missing credit score for applicant {}. Using default 400", applicant.getId());
            creditScore = 400;  // Low credit default
        }
        request.setCreditScore(creditScore);

        // MonthsEmployed: Direct from applicant (may be null)
        Integer monthsEmployed = applicant.getEmploymentLengthMonths();
        if (monthsEmployed == null) {
            monthsEmployed = 0;
        }
        request.setMonthsEmployed(monthsEmployed);

        // NumCreditLines: Mapped from existingLoans (MVP proxy - different concept)
        Integer existingLoans = applicant.getExistingLoans();
        if (existingLoans == null) {
            existingLoans = 0;
        }
        request.setNumCreditLines(existingLoans);

        // InterestRate: From application (may be null)
        Double interestRate = application.getInterestRate();
        if (interestRate == null) {
            log.debug("Missing interest rate for application {}. Using default 12.0", application.getId());
            interestRate = 12.0;  // Safe default
        }
        request.setInterestRate(interestRate);

        // LoanTerm: From application (may be null)
        Integer loanTerm = application.getTermMonths();
        if (loanTerm == null) {
            log.debug("Missing loan term for application {}. Using default 24", application.getId());
            loanTerm = 24;  // Standard term
        }
        request.setLoanTerm(loanTerm);

        // DTIRatio: Calculate from monthly debt payment and income
        Double monthlyDebtPayment = applicant.getMonthlyDebtPayment();
        if (monthlyDebtPayment == null) {
            monthlyDebtPayment = 0.0;
        }
        Double dtiRatio = 0.0;
        if (monthlyIncome > 0) {
            dtiRatio = monthlyDebtPayment / monthlyIncome;
        }
        request.setDtiRatio(dtiRatio);

        // ===== CATEGORICAL FIELDS =====

        // Education: From applicant (may be null for old records)
        String education = applicant.getEducation();
        if (education == null || education.isBlank()) {
            log.debug("Missing education for applicant {}. Using default 'High School'", applicant.getId());
            education = "High School";
        }
        request.setEducation(education);

        // EmploymentType: From applicant (already validated as enum)
        String employmentType = applicant.getEmploymentStatus();
        if (employmentType == null || employmentType.isBlank()) {
            log.warn("Missing employment type for applicant {}. Using default 'Full-time'", applicant.getId());
            employmentType = "Full-time";
        }
        request.setEmploymentType(employmentType);

        // MaritalStatus: From applicant (may be null, make optional in website)
        String maritalStatus = applicant.getMaritalStatus();
        if (maritalStatus == null || maritalStatus.isBlank()) {
            log.debug("Missing marital status for applicant {}. Using default 'Single'", applicant.getId());
            maritalStatus = "Single";
        }
        request.setMaritalStatus(maritalStatus);

        // HasMortgage: Already "Yes"/"No" string
        String hasMortgage = applicant.getHasMortgage();
        if (hasMortgage == null || hasMortgage.isBlank()) {
            log.warn("Missing mortgage status for applicant {}. Using default 'No'", applicant.getId());
            hasMortgage = "No";
        }
        request.setHasMortgage(hasMortgage);

        // HasDependent: Convert integer 0/1 to "Yes"/"No"
        Integer dependents = applicant.getDependents();
        if (dependents == null) {
            dependents = 0;
        }
        String hasDependent = dependents > 0 ? "Yes" : "No";
        request.setHasDependent(hasDependent);

        // LoanPurpose: From application
        String loanPurpose = application.getPurpose();
        if (loanPurpose == null || loanPurpose.isBlank()) {
            log.debug("Missing loan purpose for application {}. Using default 'Other'", application.getId());
            loanPurpose = "Other";
        }
        request.setLoanPurpose(loanPurpose);

        // HasCoSigner: Convert boolean to "Yes"/"No"
        Boolean hasCoSigner = application.getHasCoSigner();
        if (hasCoSigner == null) {
            hasCoSigner = false;
        }
        request.setHasCoSigner(hasCoSigner ? "Yes" : "No");

        // ===== OPTIONAL CUSTOM PROPOSAL FIELDS =====
        // These are passed through as-is if present
        // (not implemented in website yet, but prepared for future)

        log.debug("AI Request mapped successfully for application {}", application.getId());
        return request;
    }
}
