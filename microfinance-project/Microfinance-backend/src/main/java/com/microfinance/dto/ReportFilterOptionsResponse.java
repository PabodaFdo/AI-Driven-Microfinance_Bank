package com.microfinance.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class ReportFilterOptionsResponse {
    private List<String> branches = new ArrayList<>();
    private List<String> statuses = new ArrayList<>();
    private List<String> reportTypes = new ArrayList<>();
}
