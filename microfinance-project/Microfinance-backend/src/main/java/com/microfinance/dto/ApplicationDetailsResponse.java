package com.microfinance.dto;

import com.microfinance.model.Applicant;
import com.microfinance.model.LoanApplication;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationDetailsResponse {
    private LoanApplication application;
    private Applicant applicant;
}