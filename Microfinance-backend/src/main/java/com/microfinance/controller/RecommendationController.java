package com.microfinance.controller;

import com.microfinance.dto.ArchiveRecommendationRequest;
import com.microfinance.dto.RecommendationManualUpdateRequest;
import com.microfinance.dto.RecommendationPatchRequest;
import com.microfinance.dto.RecommendationResponse;
import com.microfinance.dto.RecommendationUpdateRequest;
import com.microfinance.service.RecommendationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    // ═══════════════════════════════════════════════════════════
    // CREATE OPERATIONS (Existing)
    // ═══════════════════════════════════════════════════════════

    @PostMapping("/generate/{applicationId}")
    // CHANGED: allow LOAN_OFFICER to run operational recommendation workflow
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<RecommendationResponse> generateRecommendation(@PathVariable String applicationId) {
        if (applicationId == null || applicationId.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        RecommendationResponse response = recommendationService.generateRecommendation(applicationId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/recalculate/{applicationId}")
    // CHANGED: allow LOAN_OFFICER to run operational recommendation workflow
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<RecommendationResponse> recalculateRecommendation(@PathVariable String applicationId) {
        if (applicationId == null || applicationId.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        RecommendationResponse response = recommendationService.recalculateRecommendation(applicationId);
        return ResponseEntity.ok(response);
    }

    // ═══════════════════════════════════════════════════════════
    // READ OPERATIONS (Existing)
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/by-application/{applicationId}")
    // CHANGED: allow LOAN_OFFICER to read recommendation workflow outputs
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<RecommendationResponse> getLatestByApplicationId(@PathVariable String applicationId) {
        if (applicationId == null || applicationId.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        RecommendationResponse response = recommendationService.getLatestByApplicationId(applicationId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    // CHANGED: allow LOAN_OFFICER to read recommendation workflow outputs
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<RecommendationResponse> getById(@PathVariable String id) {
        if (id == null || id.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        RecommendationResponse response = recommendationService.getById(id);
        return ResponseEntity.ok(response);
    }

    // ═══════════════════════════════════════════════════════════
    // UPDATE OPERATIONS (New)
    // ═══════════════════════════════════════════════════════════

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BANK_MANAGER')")
    public ResponseEntity<RecommendationResponse> updateRecommendation(
            @PathVariable String id,
            @Valid @RequestBody RecommendationManualUpdateRequest request) {
        if (id == null || id.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        RecommendationResponse response = recommendationService.updateRecommendationManually(id, request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BANK_MANAGER')")
    public ResponseEntity<RecommendationResponse> patchRecommendation(
            @PathVariable String id,
            @Valid @RequestBody RecommendationPatchRequest request) {
        if (id == null || id.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        RecommendationResponse response = recommendationService.patchRecommendation(id, request);
        return ResponseEntity.ok(response);
    }

    // ═══════════════════════════════════════════════════════════
    // DELETE OPERATIONS (New)
    // ═══════════════════════════════════════════════════════════

    @PatchMapping("/{id}/archive")
    @PreAuthorize("hasAnyRole('ADMIN', 'BANK_MANAGER')")
    public ResponseEntity<RecommendationResponse> archiveRecommendation(
            @PathVariable String id,
            @Valid @RequestBody ArchiveRecommendationRequest request) {
        if (id == null || id.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        RecommendationResponse response = recommendationService.archiveRecommendation(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteRecommendation(@PathVariable String id) {
        if (id == null || id.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        recommendationService.deleteRecommendation(id);
        return ResponseEntity.noContent().build();
    }
}
