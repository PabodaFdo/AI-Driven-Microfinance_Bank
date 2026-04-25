package com.microfinance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class StatusUpdateRequest {

    @NotBlank(message = "Status is required")
    private String status;

    /** General note / reason */
    private String reason = "";


    private String cancelReason;

    private String note = "";

    private String actor = "staff";

    /** Decision notes for APPROVED/REJECTED/CANCELLED status */
    private String notes;

    public String effectiveReason() {
        if (cancelReason != null && !cancelReason.isBlank()) return cancelReason;
        if (reason      != null && !reason.isBlank())       return reason;
        return note != null ? note : "";
    }
}