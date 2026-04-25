package com.microfinance.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class EmailServiceStartupLogger {

    @Autowired(required = false)
    private SmtpEmailService smtpEmailService;

    @Autowired(required = false)
    private ConsoleEmailService consoleEmailService;

    @EventListener(ApplicationReadyEvent.class)
    public void logEmailServiceStatus() {
        if (smtpEmailService != null) {
            log.info("========================================");
            log.info("✓ SMTP email service enabled");
            log.info("Password reset emails will be sent via Gmail");
            log.info("========================================");
        } else if (consoleEmailService != null) {
            log.info("========================================");
            log.info("✓ Console email service enabled (fallback)");
            log.info("Password reset links will be printed to console");
            log.info("Set MAIL_USERNAME and MAIL_PASSWORD in .env to enable SMTP");
            log.info("========================================");
        } else {
            log.warn("========================================");
            log.warn("⚠ No email service bean found!");
            log.warn("========================================");
        }
    }
}
