package com.microfinance.model;

import lombok.Data;

import java.time.LocalDate;

@Data
public class ReportDateRange {
    private LocalDate startDate;
    private LocalDate endDate;

    public boolean isValid() {
        if (startDate == null && endDate == null) {
            return true;
        }

        if (startDate != null && endDate != null) {
            return !startDate.isAfter(endDate);
        }

        return true;
    }

    public String getValidationMessage() {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            return "Start date must not be after end date";
        }
        return "";
    }
}
