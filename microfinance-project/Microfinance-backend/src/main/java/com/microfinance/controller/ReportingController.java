package com.microfinance.controller;

import com.microfinance.dto.DashboardAnalyticsResponse;
import com.microfinance.dto.DeleteTemplatesRequest;
import com.microfinance.dto.ReportChartResponse;
import com.microfinance.dto.ReportFilterOptionsResponse;
import com.microfinance.dto.ReportTemplateRequest;
import com.microfinance.model.ReportTemplate;
import com.microfinance.service.ReportingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportingController {

    private final ReportingService reportingService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<DashboardAnalyticsResponse> getDashboardAnalytics() {
        return ResponseEntity.ok(reportingService.getDashboardAnalytics());
    }

    @GetMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<ReportChartResponse> generateReport(
            @RequestParam(defaultValue = "general") String type,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        return ResponseEntity.ok(reportingService.generateReport(type, branch, status, startDate, endDate));
    }

    @GetMapping("/templates")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<List<ReportTemplate>> getTemplates() {
        return ResponseEntity.ok(reportingService.getTemplates());
    }

    @PostMapping("/templates")
    @PreAuthorize("hasAnyRole('ADMIN', 'BANK_MANAGER')")
    public ResponseEntity<ReportTemplate> createTemplate(@Valid @RequestBody ReportTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reportingService.createTemplate(request));
    }

    @PutMapping("/templates/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'BANK_MANAGER')")
    public ResponseEntity<ReportTemplate> updateTemplate(@PathVariable String id,
                                                         @Valid @RequestBody ReportTemplateRequest request) {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("Template ID is required");
        }
        return ResponseEntity.ok(reportingService.updateTemplate(id, request));
    }

    @DeleteMapping("/templates")
    @PreAuthorize("hasAnyRole('ADMIN', 'BANK_MANAGER')")
    public ResponseEntity<Map<String, Object>> deleteTemplates(@Valid @RequestBody DeleteTemplatesRequest request) {
        reportingService.deleteTemplates(request.getIds());
        return ResponseEntity.ok(Map.of(
                "message", "Templates deleted successfully",
                "deletedCount", request.getIds().size()
        ));
    }

    @GetMapping("/filter-options")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<ReportFilterOptionsResponse> getFilterOptions() {
        return ResponseEntity.ok(reportingService.getFilterOptions());
    }
}
