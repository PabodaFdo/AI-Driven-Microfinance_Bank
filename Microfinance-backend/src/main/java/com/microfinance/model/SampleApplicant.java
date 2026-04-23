package com.microfinance.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * SampleApplicant model for the sample_applicants collection.
 * This is a READ-ONLY reference collection used for credit score lookup by NIC.
 * New applicants are NOT saved to this collection.
 */
@Data
@NoArgsConstructor
@Document(collection = "sample_applicants")
public class SampleApplicant {

    @Id
    private String id;

    /**
     * NIC field - used for lookup matching
     * Must be normalized (trimmed and uppercased)
     */
    @Indexed(unique = true)
    private String nic;

    /**
     * Credit score value from the sample/reference data
     * This is the authoritative credit score for this NIC
     */
    private Integer creditScore;

    /**
     * Optional: Full name for reference/debugging purposes
     */
    private String fullName;

    /**
     * Optional: Risk level for reference/debugging purposes
     */
    private String riskLevel;

    public SampleApplicant(String nic, Integer creditScore) {
        this.nic = nic;
        this.creditScore = creditScore;
    }

    public SampleApplicant(String nic, Integer creditScore, String fullName) {
        this.nic = nic;
        this.creditScore = creditScore;
        this.fullName = fullName;
    }
}