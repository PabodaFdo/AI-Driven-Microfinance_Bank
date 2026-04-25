package com.microfinance.controller;

import com.microfinance.dto.CreditScoreResponse;
import com.microfinance.service.CreditScoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/credit-score")
@RequiredArgsConstructor
public class CreditScoreController {

    private final CreditScoreService creditScoreService;

    /**
     * Fetch credit score for a given NIC from MongoDB collections.
     * Uses sample_applicants collection first, then falls back to calculated score from main applicants collection.
     *
     * @param nic National Identity Card number
     * @return CreditScoreResponse containing NIC and credit score
     * @throws BusinessException (400) if NIC format is invalid
     * @throws ResourceNotFoundException (404) if NIC not found in any collection
     */
    @GetMapping("/{nic}")
    public CreditScoreResponse getCreditScore(@PathVariable String nic) {
        return creditScoreService.getCreditScore(nic);
    }
}