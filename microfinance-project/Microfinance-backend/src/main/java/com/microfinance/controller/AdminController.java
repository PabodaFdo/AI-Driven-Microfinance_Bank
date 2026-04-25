package com.microfinance.controller;

import com.microfinance.service.FriendlyIdBackfillService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Administrative endpoints for system maintenance tasks.
 * Restricted to ADMIN users only.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final FriendlyIdBackfillService backfillService;

    /**
     * Backfill friendly IDs (applicationNumber, applicantNumber) for existing
     * RiskAssessment and Recommendation documents that lack these fields.
     *
     * This endpoint is useful after upgrading to the friendly ID feature
     * to populate IDs in historical records.
     *
     * @return Response with counts of updated records
     */
    @PostMapping("/backfill/friendly-ids")
    public ResponseEntity<Map<String, Object>> backfillFriendlyIds() {
        Map<String, Object> response = new HashMap<>();

        try {
            backfillService.backfillAllFriendlyIds();
            response.put("status", "success");
            response.put("message", "Friendly ID backfill completed successfully");
            response.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "Backfill failed: " + e.getMessage());
            response.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Backfill friendly IDs for RiskAssessment documents only.
     *
     * @return Response with count of updated records
     */
    @PostMapping("/backfill/risk-assessments")
    public ResponseEntity<Map<String, Object>> backfillRiskAssessmentIds() {
        Map<String, Object> response = new HashMap<>();

        try {
            int updated = backfillService.backfillRiskAssessmentIds();
            response.put("status", "success");
            response.put("message", "Risk assessment backfill completed");
            response.put("updated", updated);
            response.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "Risk assessment backfill failed: " + e.getMessage());
            response.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Backfill friendly IDs for Recommendation documents only.
     *
     * @return Response with count of updated records
     */
    @PostMapping("/backfill/recommendations")
    public ResponseEntity<Map<String, Object>> backfillRecommendationIds() {
        Map<String, Object> response = new HashMap<>();

        try {
            int updated = backfillService.backfillRecommendationIds();
            response.put("status", "success");
            response.put("message", "Recommendation backfill completed");
            response.put("updated", updated);
            response.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "Recommendation backfill failed: " + e.getMessage());
            response.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.internalServerError().body(response);
        }
    }
}
