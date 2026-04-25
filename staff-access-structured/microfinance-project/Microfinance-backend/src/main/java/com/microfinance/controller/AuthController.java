package com.microfinance.controller;

import com.microfinance.dto.ChangePasswordRequest;
import com.microfinance.dto.ForgotPasswordRequest;
import com.microfinance.dto.JwtResponse;
import com.microfinance.dto.LoginRequest;
import com.microfinance.dto.MessageResponse;
import com.microfinance.dto.ResetPasswordRequest;
import com.microfinance.repository.StaffRepository;
import com.microfinance.security.RoleMapper;
import com.microfinance.security.jwt.JwtUtils;
import com.microfinance.security.services.UserDetailsImpl;
import com.microfinance.service.PasswordResetService;
import com.microfinance.service.StaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@Slf4j
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final StaffRepository staffRepository;
    private final PasswordResetService passwordResetService;
    private final StaffService staffService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        staffRepository.findByEmail(userDetails.getEmail()).ifPresent(staff -> {
            staff.setLastLogin(LocalDateTime.now());
            staffRepository.save(staff);
        });

        JwtResponse response = new JwtResponse();
        String normalizedRole = RoleMapper.normalize(userDetails.getRole());
        response.setToken(jwt);
        response.setId(userDetails.getId());
        response.setEmail(userDetails.getEmail());
        response.setUsername(userDetails.getStaffUsername());
        response.setFullName(userDetails.getFullName());
        response.setRole(normalizedRole);
        response.setBranch(userDetails.getBranch());

        JwtResponse.UserPayload userPayload = new JwtResponse.UserPayload();
        userPayload.setId(userDetails.getId());
        userPayload.setEmail(userDetails.getEmail());
        userPayload.setUsername(userDetails.getStaffUsername());
        userPayload.setFullName(userDetails.getFullName());
        userPayload.setRole(normalizedRole);
        userPayload.setBranch(userDetails.getBranch());
        response.setUser(userPayload);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        try {
            passwordResetService.initiatePasswordReset(request.getEmail());
            log.debug("Forgot password request processed for: {}", request.getEmail());
        } catch (Exception e) {
            log.error("Error processing forgot password request: {}", e.getMessage(), e);
            // Silently catch - don't reveal whether email exists
        }

        // Always return generic success message
        return ResponseEntity.ok(new MessageResponse(
                "If an account exists for this email, a password reset link has been sent."
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            passwordResetService.resetPassword(request.getToken(), request.getNewPassword(), request.getConfirmPassword());
            return ResponseEntity.ok(new MessageResponse(
                    "Password reset successfully. Please login with your new password."
            ));
        } catch (IllegalArgumentException e) {
            log.warn("Password reset failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest request, Authentication authentication) {
        try {
            if (!(authentication.getPrincipal() instanceof UserDetailsImpl userDetails)) {
                return ResponseEntity.status(401).body(new MessageResponse("Unauthorized"));
            }

            staffService.changePassword(userDetails.getId(), request, authentication);
            log.info("Password changed for staff: {}", userDetails.getEmail());
            return ResponseEntity.ok(new MessageResponse("Password changed successfully."));
        } catch (IllegalArgumentException e) {
            log.warn("Change password failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@NonNull Authentication authentication) {
        UserDetailsImpl user = (UserDetailsImpl) authentication.getPrincipal();
        return staffRepository.findByEmail(user.getEmail())
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}


