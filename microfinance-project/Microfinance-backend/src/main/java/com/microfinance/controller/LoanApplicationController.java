package com.microfinance.controller;

import com.microfinance.dto.ApplicationDetailsResponse;
import com.microfinance.dto.LoanApplicationRequest;
import com.microfinance.dto.RecommendationSummaryRequest;
import com.microfinance.dto.RiskAssessmentSummaryRequest;
import com.microfinance.dto.StatusUpdateRequest;
import com.microfinance.model.LoanApplication;
import com.microfinance.service.LoanApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RequestMethod;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/applications", "/api/loan-applications"})
@RequiredArgsConstructor
public class LoanApplicationController {

    private final LoanApplicationService loanApplicationService;

    // GET /api/applications?status=
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public List<LoanApplication> list(@RequestParam(required = false) String status) {
        return loanApplicationService.list(status);
    }

    // GET /api/applications/{id}
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public LoanApplication getById(@PathVariable String id) {
        return loanApplicationService.getById(id);
    }

    // GET /api/applications/{id}/details  — used by the Review page
    @GetMapping("/{id}/details")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ApplicationDetailsResponse getDetails(@PathVariable String id) {
        return loanApplicationService.getDetails(id);
    }

    // GET /api/applications/by-applicant/{applicantId}
    @GetMapping("/by-applicant/{applicantId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public List<LoanApplication> getByApplicant(@PathVariable String applicantId) {
        return loanApplicationService.getByApplicant(applicantId);
    }

    // POST /api/applications
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public LoanApplication create(@Valid @RequestBody LoanApplicationRequest req) {
        return loanApplicationService.create(req);
    }

    // PUT /api/applications/{id}
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public LoanApplication update(@PathVariable String id,
                                  @Valid @RequestBody LoanApplicationRequest req) {
        return loanApplicationService.update(id, req);
    }

    // CHANGED: hard delete is stronger than cancel -> ADMIN/BANK_MANAGER only
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BANK_MANAGER')")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable String id) {
        Map<String, Object> result = loanApplicationService.deleteApplicationWithCascade(id);
        return ResponseEntity.ok(result);
    }

    // CHANGED: service-level validation enforces final decision restrictions
    @RequestMapping(value = "/{id}/status",
                    method = { RequestMethod.POST, RequestMethod.PATCH, RequestMethod.PUT })
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public LoanApplication updateStatus(@PathVariable String id,
                                        @Valid @RequestBody StatusUpdateRequest req) {
        return loanApplicationService.updateStatus(id, req);
    }

    // ── Hybrid Workflow Endpoints ────────────────────────────────

    // CHANGED: LOAN_OFFICER must be allowed for risk assessment
    @PutMapping("/{id}/risk-assessment")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public LoanApplication updateRiskAssessment(@PathVariable String id,
                                                  @Valid @RequestBody RiskAssessmentSummaryRequest req) {
        return loanApplicationService.updateRiskAssessmentSummary(id, req);
    }

    // CHANGED: LOAN_OFFICER must be allowed for recommendation
    @PutMapping("/{id}/recommendation")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public LoanApplication updateRecommendation(@PathVariable String id,
                                                @Valid @RequestBody RecommendationSummaryRequest req) {
        return loanApplicationService.updateRecommendationSummary(id, req);
    }

    // CHANGED: LOAN_OFFICER must be allowed for risk assessment workflow
    @PostMapping("/{id}/risk-assessment/start")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public LoanApplication startRiskAssessment(@PathVariable String id) {
        return loanApplicationService.setRiskAssessmentInProgress(id);
    }

    // CHANGED: LOAN_OFFICER must be allowed for risk assessment workflow
    @PostMapping("/{id}/risk-assessment/failed")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public LoanApplication failRiskAssessment(@PathVariable String id,
                                              @RequestParam(required = false) String reason) {
        return loanApplicationService.setRiskAssessmentFailed(id, reason != null ? reason : "");
    }

    // CHANGED: LOAN_OFFICER must be allowed for recommendation workflow
    @PostMapping("/{id}/recommendation/start")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public LoanApplication startRecommendation(@PathVariable String id) {
        return loanApplicationService.setRecommendationInProgress(id);
    }

    // CHANGED: LOAN_OFFICER must be allowed for recommendation workflow
    @PostMapping("/{id}/recommendation/failed")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public LoanApplication failRecommendation(@PathVariable String id,
                                              @RequestParam(required = false) String reason) {
        return loanApplicationService.setRecommendationFailed(id, reason != null ? reason : "");
    }
}
