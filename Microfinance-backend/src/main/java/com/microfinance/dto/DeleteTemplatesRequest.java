package com.microfinance.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class DeleteTemplatesRequest {

    @NotEmpty(message = "At least one template id is required")
    private List<@NotBlank(message = "Template IDs cannot be blank") String> ids = new ArrayList<>();
}
