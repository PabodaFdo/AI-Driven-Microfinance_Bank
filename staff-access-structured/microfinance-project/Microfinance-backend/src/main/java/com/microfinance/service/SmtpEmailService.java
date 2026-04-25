package com.microfinance.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@ConditionalOnProperty(
    name = "spring.mail.username",
    matchIfMissing = false
)
@RequiredArgsConstructor
public class SmtpEmailService implements EmailService {

    private final JavaMailSender mailSender;

    @Override
    public void sendPasswordResetEmail(String email, String resetUrl) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject("Microfinance Password Reset");
            message.setText(buildEmailContent(resetUrl));

            mailSender.send(message);
            log.info("Password reset email sent to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}. Error: {}", email, e.getMessage(), e);
            // If email fails, log the reset URL to console for development
            logResetUrlToConsole(email, resetUrl);
        }
    }

    private String buildEmailContent(String resetUrl) {
        return "Hello,\n\n" +
                "We received a request to reset your password. Please click the link below to reset your password.\n" +
                "This link will expire in 15 minutes.\n\n" +
                "Reset Link:\n" +
                resetUrl + "\n\n" +
                "If you did not request a password reset, please ignore this email.\n\n" +
                "Best regards,\n" +
                "Microfinance Portal Team";
    }

    private void logResetUrlToConsole(String email, String resetUrl) {
        System.out.println("=".repeat(80));
        System.out.println("PASSWORD RESET EMAIL FAILED - CONSOLE FALLBACK");
        System.out.println("=".repeat(80));
        System.out.println("To:       " + email);
        System.out.println("Subject:  Microfinance Password Reset");
        System.out.println("-".repeat(80));
        System.out.println("Reset Link:");
        System.out.println(resetUrl);
        System.out.println("=".repeat(80));
    }
}
