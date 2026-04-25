package com.microfinance.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StatusHistoryEntry {
    private String status;
    private Instant at;
    private String actor;
    private String action;
    private String reason;
}