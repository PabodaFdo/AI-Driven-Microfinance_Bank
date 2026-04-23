package com.microfinance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApplicantLookupResponse {
    private String id;
    private String applicantNumber;
    private String fullName;
    private String nic;
    private Integer creditScore;
    private String riskLevel;
    private String phone;
    private String email;
    private String branch;
    private boolean found;
    private String message;
}