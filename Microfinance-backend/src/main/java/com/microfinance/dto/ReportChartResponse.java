package com.microfinance.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
public class ReportChartResponse {
    private String reportType;
    private List<String> labels = new ArrayList<>();
    private List<Map<String, Object>> datasets = new ArrayList<>();
    private Map<String, Object> kpis = new LinkedHashMap<>();
}
