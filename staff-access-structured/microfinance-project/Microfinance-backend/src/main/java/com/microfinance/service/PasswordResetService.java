package com.microfinance.service;

import com.microfinance.model.PasswordResetToken;
import com.microfinance.model.Staff;
import com.microfinance.repository.PasswordResetTokenRepository;
import com.microfinance.repository.StaffRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final StaffRepository staffRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${app.reset-token-expiry-minutes:15}")
    private int resetTokenExpiryMinutes;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    private static final SecureRandom random = new SecureRandom();
    private static final int TOKEN_LENGTH = 32;

    /**
     * Generate a reset token for the given email and return the reset URL
     */
    public String initiatePasswordReset(String email) {
        Optional<Staff> staffOpt = staffRepository.findByEmail(email.toLowerCase().trim());

        if (staffOpt.isEmpty() || !staffOpt.get().isActive()) {
            // Generic response - don't reveal whether email exists
            log.debug("Password reset requested for non-existent or inactive account: {}", email);
            return null;
        }

        Staff staff = staffOpt.get();
        String rawToken = generateSecureToken();
        String tokenHash = passwordEncoder.encode(rawToken);

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setStaffId(staff.getId());
        resetToken.setTokenHash(tokenHash);
        resetToken.setExpiresAt(LocalDateTime.now().plusMinutes(resetTokenExpiryMinutes));
        resetToken.setCreatedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(resetToken);

        String resetUrl = frontendUrl + "/reset-password?token=" + rawToken;
        
        try {
            emailService.sendPasswordResetEmail(email, resetUrl);
            log.info("Password reset email sent to: {}", email);
        } catch (Exception e) {
            log.error("Error sending password reset email to {}: {}", email, e.getMessage());
            // Console service will handle fallback logging
        }

        return rawToken;
    }

    /**
     * Validate reset token and return the Staff if valid
     */
    public Staff validateResetToken(String rawToken) {
        if (rawToken == null || rawToken.trim().isEmpty()) {
            throw new IllegalArgumentException("Invalid reset token");
        }

        // Find all tokens for this token (we need to match the raw token against hashed tokens)
        var allTokens = passwordResetTokenRepository.findAll();
        PasswordResetToken validToken = null;

        for (PasswordResetToken token : allTokens) {
            if (token.isValid() && passwordEncoder.matches(rawToken, token.getTokenHash())) {
                validToken = token;
                break;
            }
        }

        if (validToken == null) {
            throw new IllegalArgumentException("Invalid or expired reset token");
        }

        if (validToken.isExpired()) {
            throw new IllegalArgumentException("Reset token has expired");
        }

        if (validToken.isUsed()) {
            throw new IllegalArgumentException("Reset token has already been used");
        }

        return staffRepository.findById(validToken.getStaffId())
                .orElseThrow(() -> new IllegalArgumentException("Staff not found"));
    }

    /**
     * Reset password using token
     */
    public void resetPassword(String rawToken, String newPassword, String confirmPassword) {
        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        Staff staff = validateResetToken(rawToken);

        // Validate password strength
        validatePasswordStrength(newPassword);

        // Check new password is different from current
        if (passwordEncoder.matches(newPassword, staff.getPassword())) {
            throw new IllegalArgumentException("New password must be different from current password");
        }

        // Find and mark token as used
        var allTokens = passwordResetTokenRepository.findAll();
        for (PasswordResetToken token : allTokens) {
            if (token.isValid() && passwordEncoder.matches(rawToken, token.getTokenHash())) {
                token.setUsedAt(LocalDateTime.now());
                passwordResetTokenRepository.save(token);
                break;
            }
        }

        // Update password
        staff.setPassword(passwordEncoder.encode(newPassword));
        staff.setPasswordChangedAt(LocalDateTime.now());
        staffRepository.save(staff);
        
        log.info("Password successfully reset for staff: {}", staff.getEmail());
    }

    /**
     * Validates password strength.
     * Requirements: min 8 chars, uppercase, lowercase, digit, special char
     */
    private void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters");
        }

        if (password.length() > 100) {
            throw new IllegalArgumentException("Password must not exceed 100 characters");
        }

        if (!password.matches(".*[A-Z].*")) {
            throw new IllegalArgumentException("Password must contain at least one uppercase letter");
        }

        if (!password.matches(".*[a-z].*")) {
            throw new IllegalArgumentException("Password must contain at least one lowercase letter");
        }

        if (!password.matches(".*\\d.*")) {
            throw new IllegalArgumentException("Password must contain at least one digit");
        }

        if (!password.matches(".*[!@#$%^&*()_+=\\-\\[\\]{};:'\",.<>?/\\\\|`~].*")) {
            throw new IllegalArgumentException("Password must contain at least one special character (!@#$%^&*()_+=)");
        }
    }

    /**
     * Generate a secure random token
     */
    private String generateSecureToken() {
        byte[] randomBytes = new byte[TOKEN_LENGTH];
        random.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }
}

