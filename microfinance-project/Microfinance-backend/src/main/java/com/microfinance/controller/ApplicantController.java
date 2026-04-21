package com.microfinance.controller;

import com.microfinance.dto.ApplicantRequest;
import com.microfinance.dto.ApplicantLookupResponse;
import com.microfinance.dto.ApplicantRegistrationRequest;
import com.microfinance.dto.ApplicantRegistrationResponse;
import com.microfinance.model.Applicant;
import com.microfinance.service.ApplicantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/applicants")
@RequiredArgsConstructor
public class ApplicantController {

    private final ApplicantService applicantService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public List<Applicant> list(@RequestParam(required = false) String q) {
        return applicantService.list(q);
    }

    @GetMapping("/lookup/{nic}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ApplicantLookupResponse lookupByNic(@PathVariable String nic) {
        return applicantService.lookupByNic(nic);
    }

    @GetMapping("/credit-score/{nic}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<?> getCreditScoreByNic(@PathVariable String nic) {
        return applicantService.getCreditScoreByNic(nic);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ApplicantRegistrationResponse register(@Valid @RequestBody ApplicantRegistrationRequest request) {
        return applicantService.registerApplicant(request);
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<Applicant> searchByNic(@RequestParam String nic) {
        String normalizedNic = com.microfinance.util.NICValidator.normalizeNIC(nic);
        return applicantService.findByNic(normalizedNic)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new com.microfinance.exception.ResourceNotFoundException(
                        "No applicant with NIC: " + normalizedNic));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public Applicant getById(@PathVariable String id) {
        return applicantService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public Applicant create(@Valid @RequestBody ApplicantRequest req) {
        return applicantService.create(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public Applicant update(@PathVariable String id,
                            @Valid @RequestBody ApplicantRequest req) {
        return applicantService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LOAN_OFFICER', 'BANK_MANAGER')")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable String id) {
        Map<String, Object> result = applicantService.deleteApplicantWithCascade(id);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/backfill-numbers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> backfillApplicantNumbers() {
        Map<String, Object> result = applicantService.backfillApplicantNumbers();
        return ResponseEntity.ok(result);
    }
}