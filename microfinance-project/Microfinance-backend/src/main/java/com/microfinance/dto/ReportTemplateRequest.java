package com.microfinance.dto;

import com.microfinance.model.ReportFilters;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReportTemplateRequest {

    @NotBlank(message = "Title is required")
    @Size(min = 3, max = 100, message = "Title must be between 3 and 100 characters")
    private String title;

    @NotBlank(message = "Type is required")
    private String type;

    @Valid
    private ReportFilters filters = new ReportFilters();
}
