package com.microfinance.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Data
@NoArgsConstructor
@Document(collection = "recommendations")
@CompoundIndexes({
    @CompoundIndex(name = "app_archived_idx", def = "{'applicationId': 1, 'archived': 1}"),
    @CompoundIndex(name = "status_archived_idx", def = "{'status': 1, 'archived': 1}"),
    @CompoundIndex(name = "app_generated_idx", def = "{'applicationId': 1, 'generatedAt': -1}")
})
public class Recommendation {

    @Id
    private String id;

    private String applicationId;
    private String applicantId;
    private String applicationNumber; // Friendly ID (e.g., APP-2026-0001)
    private String applicantNumber; // Friendly ID (e.g., CUS-2026-0001)
    private Double recommendedAmount;
    private Integer recommendedPeriod;
    private Double recommendedInterestRate;
    private String feasibility;
    private String reasoning;
    private RecommendationStatus status = RecommendationStatus.GENERATED;
    private String modelVersion = "RULE_BASED_REC_V1";
    private Map<String, Object> inputSnapshot = new HashMap<>();
    private Instant generatedAt;

    // Archive fields
    private boolean archived = false;
    private Instant archivedAt;
    private String archivedBy; // Staff ID who archived
    private String archiveReason;

    // Audit fields for updates
    private String lastUpdatedBy; // Staff ID who last updated
    private String overrideReason; // Reason for manual override
    private Map<String, Object> previousValuesSnapshot = new HashMap<>(); // Store previous values when updated
    private boolean manualOverride = false; // Flag to indicate if manually overridden

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}