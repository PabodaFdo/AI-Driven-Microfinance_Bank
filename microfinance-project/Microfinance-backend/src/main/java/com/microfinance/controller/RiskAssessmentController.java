package com.microfinance.controller;

import com.microfinance.dto.RiskAssessmentResponse;
import com.microfinance.service.RiskAssessmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api/risk-assessments")
@RequiredArgsConstructor
public class RiskAssessmentController {

    private final RiskAssessmentService riskAssessmentService;

    @PostMapping("/run/{applicationId}")
    // CHANGED: allow LOAN_OFFICER to run operational risk workflow
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<RiskAssessmentResponse> runAssessment(@PathVariable String applicationId) {
        if (applicationId == null || applicationId.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        RiskAssessmentResponse response = riskAssessmentService.runAssessment(applicationId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/by-application/{applicationId}")
    // CHANGED: allow LOAN_OFFICER to view operational risk workflow data
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<RiskAssessmentResponse> getLatestByApplicationId(@PathVariable String applicationId) {
        if (applicationId == null || applicationId.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        RiskAssessmentResponse response = riskAssessmentService.getLatestByApplicationId(applicationId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    // CHANGED: allow LOAN_OFFICER to view operational risk assessment details
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<RiskAssessmentResponse> getById(@PathVariable String id) {
        if (id == null || id.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        RiskAssessmentResponse response = riskAssessmentService.getById(id);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BANK_MANAGER')")
    public ResponseEntity<Void> deleteAssessment(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> request) {
        if (id == null || id.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        String reason = request != null ? request.get("reason") : "Deleted by " + (request != null ? request.get("userId") : "user");
        riskAssessmentService.deleteAssessment(id, "SYSTEM", reason != null ? reason : "Deleted by user");
        return ResponseEntity.noContent().build();
    }
}
