package com.microfinance.dto;

import lombok.Data;

@Data
public class JwtResponse {
    private String token;
    private String type = "Bearer";
    private String id;
    private String email;
    private String username;
    private String fullName;
    private String role;
    private String branch;
    private UserPayload user;

    @Data
    public static class UserPayload {
        private String id;
        private String email;
        private String username;
        private String fullName;
        private String role;
        private String branch;
    }
}
