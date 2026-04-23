package com.microfinance.service;

import com.microfinance.dto.CreditScoreResponse;
import com.microfinance.exception.BusinessException;
import com.microfinance.exception.ResourceNotFoundException;
import com.microfinance.model.SampleApplicant;
import com.microfinance.repository.SampleApplicantRepository;
import com.microfinance.util.NICValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CreditScoreService {

    private final SampleApplicantRepository sampleApplicantRepository;

    /**
     * Get credit score for a given NIC from sample_applicants collection only.
     *
     * @param nic The National Identity Card number
     * @return CreditScoreResponse containing NIC and credit score
     * @throws BusinessException if NIC format is invalid
     * @throws ResourceNotFoundException if NIC is not found in sample_applicants collection
     */
    public CreditScoreResponse getCreditScore(String nic) {
        // Step 1: Validate NIC format
        if (!NICValidator.isValidNIC(nic)) {
            throw new BusinessException("Invalid NIC format. Please provide a valid Sri Lankan NIC (9 digits + V or 12 digits).");
        }

        // Step 2: Normalize NIC
        String normalizedNic = NICValidator.normalizeNIC(nic);

        // Step 3: Search only in sample_applicants collection
        Optional<SampleApplicant> sampleApplicant = sampleApplicantRepository.findByNic(normalizedNic);

        // Step 4: Return credit score if found, otherwise throw exception
        if (sampleApplicant.isPresent()) {
            return new CreditScoreResponse(normalizedNic, sampleApplicant.get().getCreditScore());
        }

        // Step 5: NIC not found in sample_applicants
        throw new ResourceNotFoundException(
                "Credit score not available for NIC: " + normalizedNic +
                ". This NIC is not found in the sample applicants database."
        );
    }
}