package com.microfinance.service;

public interface EmailService {
    void sendPasswordResetEmail(String email, String resetUrl);
}
