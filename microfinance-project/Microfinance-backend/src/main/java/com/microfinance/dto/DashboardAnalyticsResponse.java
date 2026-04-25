package com.microfinance.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
public class DashboardAnalyticsResponse {
    private long totalApplications;
    private long approvedApplications;
    private long rejectedApplications;
    private long pendingApplications;
    private long reviewApplications;
    private long totalActiveLoans;
    private double averageRiskScore;
    private long overdueInstallmentsCount;
    private double totalDefaultAmount;
    private long totalInstallments;

    private Map<String, Long> repaymentStatusBreakdown = new LinkedHashMap<>();
    private Map<String, Long> applicationStatusBreakdown = new LinkedHashMap<>();
    private Map<String, Long> riskLevelBreakdown = new LinkedHashMap<>();

    private List<String> monthlyApplicationTrendLabels;
    private List<Long> monthlyApplicationTrendValues;
}
