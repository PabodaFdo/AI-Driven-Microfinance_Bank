package com.microfinance.controller;

import com.microfinance.client.AIModelClient;
import com.microfinance.dto.LoanRiskPredictionRequest;
import com.microfinance.dto.LoanRiskPredictionResponse;
import com.microfinance.exception.ResourceNotFoundException;
import com.microfinance.model.Applicant;
import com.microfinance.model.LoanApplication;
import com.microfinance.repository.ApplicantRepository;
import com.microfinance.repository.LoanApplicationRepository;
import com.microfinance.service.AIModelMappingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller for AI model predictions
 * Endpoint to call microfinance-ai risk prediction service
 * Phase 1: Read-only, side-by-side with rule-based predictions
 */
@Slf4j
@RestController
@RequestMapping("/api/predictions")
@RequiredArgsConstructor
public class AIPredictionController {

    private final ApplicantRepository applicantRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final AIModelMappingService mappingService;
    private final AIModelClient aiModelClient;

    /**
     * Get AI risk prediction for a loan application
     * POST /api/predictions/ai-risk/{applicationId}
     *
     * @param applicationId Loan application ID
     * @return AI prediction response
     */
    @PostMapping("/ai-risk/{applicationId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<?> predictAIRisk(@PathVariable String applicationId) {
        try {
            // Validate input
            if (applicationId == null || applicationId.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Application ID is required"
                ));
            }

            // Fetch application
            LoanApplication application = loanApplicationRepository.findById(applicationId)
                    .orElseThrow(() -> new ResourceNotFoundException("Loan application not found: " + applicationId));

            // Fetch applicant
            Applicant applicant = applicantRepository.findById(application.getApplicantId())
                    .orElseThrow(() -> new ResourceNotFoundException("Applicant not found: " + application.getApplicantId()));

            log.info("Processing AI prediction for application {}", applicationId);

            // Map to AI schema
            LoanRiskPredictionRequest aiRequest = mappingService.createAIRequest(applicant, application);

            // Call AI model
            LoanRiskPredictionResponse aiResponse = aiModelClient.predictRisk(aiRequest);

            // Return response
            Map<String, Object> response = new HashMap<>();
            response.put("applicationId", applicationId);
            response.put("applicantId", applicant.getId());
            response.put("prediction", aiResponse);
            response.put("timestamp", System.currentTimeMillis());
            response.put("note", "Phase 1: AI prediction for comparison with rule-based assessment");

            return ResponseEntity.ok(response);

        } catch (ResourceNotFoundException e) {
            log.error("Resource not found: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Error calling AI model: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "AI prediction failed: " + e.getMessage()
            ));
        }
    }

    /**
     * Health check for AI model connectivity
     * GET /api/predictions/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "OK",
                "message", "AI prediction service is ready",
                "timestamp", String.valueOf(System.currentTimeMillis())
        ));
    }
}
