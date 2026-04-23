package com.microfinance.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@Document(collection = "loan_applications")
public class LoanApplication {

    @Id
    private String id;

    private String applicantId;

    // RBAC ownership metadata
    private String createdByUserId;
    private String createdByName;
    private String createdByRole;

    // User-friendly application number for display (e.g., APP-2026-0001)
    private String applicationNumber;

    private Double amount;
    private Integer termMonths;
    private Double interestRate;
    private String purpose;
    private Boolean hasCoSigner;
    private String notes;

    private LoanStatus status = LoanStatus.PENDING;
    private String cancelReason;

    // ── Hybrid Workflow Fields ────────────────────────────────────────

    // Risk Assessment Summary
    private RiskStatus riskStatus = RiskStatus.NOT_ASSESSED;
    private String riskAssessmentId;
    private Double riskScore;
    private String riskLevel;

    // Recommendation Summary
    private RecommendationStatus recommendationStatus = RecommendationStatus.NOT_GENERATED;
    private String recommendationId;
    private Double recommendedAmount;
    private Integer recommendedPeriod;
    private Double recommendedInterestRate;

    // Final Decision Notes
    private String decisionNotes;

    private List<StatusHistoryEntry> statusHistory = new ArrayList<>();

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}