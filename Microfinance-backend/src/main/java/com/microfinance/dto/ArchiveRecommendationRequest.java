package com.microfinance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ArchiveRecommendationRequest {

    @NotBlank(message = "Archive reason is required")
    @Size(min = 5, max = 256, message = "Archive reason must be between 5 and 256 characters")
    private String archiveReason;

    @NotBlank(message = "Archived by is required")
    @Size(min = 1, max = 100, message = "Archived by must be valid")
    private String archivedBy; // Staff ID who is archiving
}
