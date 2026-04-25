package com.microfinance.model;

import lombok.Data;

@Data
public class ReportFilters {
    private String branch = "All";
    private String status = "All";
    private ReportDateRange dateRange = new ReportDateRange();
}
