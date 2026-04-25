package com.microfinance.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@ConditionalOnMissingBean(SmtpEmailService.class)
public class ConsoleEmailService implements EmailService {

    @Override
    public void sendPasswordResetEmail(String email, String resetUrl) {
        log.info("Console email service - no SMTP configured. Logging reset link to console.");
        System.out.println("=".repeat(80));
        System.out.println("PASSWORD RESET EMAIL (DEV MODE - CONSOLE OUTPUT)");
        System.out.println("=".repeat(80));
        System.out.println("To:       " + email);
        System.out.println("Subject:  Microfinance Password Reset");
        System.out.println("-".repeat(80));
        System.out.println("Hello,");
        System.out.println();
        System.out.println("We received a request to reset your password. Please click the link below");
        System.out.println("to reset your password. This link will expire in 15 minutes.");
        System.out.println();
        System.out.println("Reset Link:");
        System.out.println(resetUrl);
        System.out.println();
        System.out.println("If you did not request a password reset, please ignore this email.");
        System.out.println();
        System.out.println("Best regards,");
        System.out.println("Microfinance Portal Team");
        System.out.println("=".repeat(80));
    }
}

