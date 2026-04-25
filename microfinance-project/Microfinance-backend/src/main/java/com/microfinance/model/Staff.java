package com.microfinance.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "staff")
public class Staff {

    @Id
    private String id;

    private String fullName;
    private String email;
    private String username;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;

    private String role;
    private String branch;
    private String address;

    @Indexed(unique = true, sparse = true)
    private String phone;

    private boolean active = true;

    private LocalDateTime createdAt;
    private LocalDateTime lastLogin;
    private LocalDateTime passwordChangedAt;
    private String createdBy;
    private LocalDateTime deactivatedAt;
    private String deactivationReason;
}
