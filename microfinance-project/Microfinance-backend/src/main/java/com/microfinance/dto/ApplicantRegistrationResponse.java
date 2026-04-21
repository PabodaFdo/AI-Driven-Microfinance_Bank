package com.microfinance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApplicantRegistrationResponse {
    private String id;
    private String applicantNumber;
    private String fullName;
    private String nic;
    private String email;
    private String phone;
    private String branch;
    private Integer creditScore;
    private String riskLevel;
    private String message;
    private Instant createdAt;
}