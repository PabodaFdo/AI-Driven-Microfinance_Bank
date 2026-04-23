package com.microfinance.controller;

import com.microfinance.model.SampleApplicant;
import com.microfinance.repository.SampleApplicantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Test controller for debugging sample_applicants collection.
 * Remove this after testing if not needed.
 */
@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class TestController {

    private final SampleApplicantRepository sampleApplicantRepo;

    /**
     * Get all sample applicants - for debugging
     * GET /api/test/sample-applicants
     */
    @GetMapping("/sample-applicants")
    public ResponseEntity<List<SampleApplicant>> getAllSampleApplicants() {
        return ResponseEntity.ok(sampleApplicantRepo.findAll());
    }

    /**
     * Add a sample applicant - for testing
     * POST /api/test/sample-applicants
     */
    @PostMapping("/sample-applicants")
    public ResponseEntity<SampleApplicant> addSampleApplicant(@RequestBody SampleApplicant sampleApplicant) {
        SampleApplicant saved = sampleApplicantRepo.save(sampleApplicant);
        return ResponseEntity.ok(saved);
    }

    /**
     * Get sample applicant by NIC - for debugging
     * GET /api/test/sample-applicants/{nic}
     */
    @GetMapping("/sample-applicants/{nic}")
    public ResponseEntity<?> getSampleApplicantByNic(@PathVariable String nic) {
        return sampleApplicantRepo.findByNic(nic.trim().toUpperCase())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}