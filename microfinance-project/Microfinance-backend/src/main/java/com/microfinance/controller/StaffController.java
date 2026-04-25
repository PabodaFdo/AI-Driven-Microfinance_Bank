package com.microfinance.controller;

import com.microfinance.dto.ChangePasswordRequest;
import com.microfinance.dto.CreateStaffRequest;
import com.microfinance.dto.MessageResponse;
import com.microfinance.dto.ProfileUpdateRequest;
import com.microfinance.dto.UpdateStaffRequest;
import com.microfinance.model.Staff;
import com.microfinance.service.PasswordResetService;
import com.microfinance.service.StaffService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/staff")
public class StaffController {

    @Autowired
    private StaffService staffService;

    @Autowired
    private PasswordResetService passwordResetService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Staff>> getAllStaff() {
        return ResponseEntity.ok(staffService.getAllStaff());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Staff> createStaff(@Valid @RequestBody CreateStaffRequest request) {
        return ResponseEntity.ok(staffService.createStaff(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Staff> updateStaff(@PathVariable @NonNull String id,
                                             @Valid @RequestBody @NonNull UpdateStaffRequest request) {
        return ResponseEntity.ok(staffService.updateStaff(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Staff> deactivateStaff(@PathVariable @NonNull String id,
                                                 @RequestParam(required = false) String reason,
                                                 Authentication authentication) {
        return ResponseEntity.ok(staffService.deactivateStaff(id, reason, authentication));
    }

    @DeleteMapping("/{id}/remove")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteStaffPermanently(@PathVariable @NonNull String id) {
        staffService.deleteStaffPermanently(id);
        return ResponseEntity.ok(Map.of("message", "Staff removed permanently"));
    }

    @PutMapping("/me")
    public ResponseEntity<Staff> updateMyProfile(@Valid @RequestBody @NonNull ProfileUpdateRequest request,
                                                 Authentication authentication) {
        return ResponseEntity.ok(staffService.updateMyProfile(request, authentication));
    }

    @PutMapping("/{id}/password")
    public ResponseEntity<Map<String, String>> changePassword(@PathVariable @NonNull String id,
                                                              @Valid @RequestBody @NonNull ChangePasswordRequest request,
                                                              Authentication authentication) {
        staffService.changePassword(id, request, authentication);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    @PostMapping("/{staffId}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> adminResetPassword(@PathVariable @NonNull String staffId) {
        try {
            Staff staff = staffService.getStaffById(staffId);
            passwordResetService.initiatePasswordReset(staff.getEmail());
            return ResponseEntity.ok(new MessageResponse(
                    "Password reset link has been sent to the staff member."
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }
}
