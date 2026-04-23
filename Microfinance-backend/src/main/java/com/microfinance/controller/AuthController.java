package com.microfinance.controller;

import com.microfinance.dto.JwtResponse;
import com.microfinance.dto.LoginRequest;
import com.microfinance.repository.StaffRepository;
import com.microfinance.security.RoleMapper;
import com.microfinance.security.jwt.JwtUtils;
import com.microfinance.security.services.UserDetailsImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final StaffRepository staffRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        staffRepository.findByEmail(userDetails.getEmail()).ifPresent(staff -> {
            staff.setLastLogin(LocalDateTime.now());
            staffRepository.save(staff);
        });

        JwtResponse response = new JwtResponse();
        String normalizedRole = RoleMapper.normalize(userDetails.getRole());
        response.setToken(jwt);
        response.setId(userDetails.getId());
        response.setEmail(userDetails.getEmail());
        response.setUsername(userDetails.getStaffUsername());
        response.setFullName(userDetails.getFullName());
        response.setRole(normalizedRole);
        response.setBranch(userDetails.getBranch());

        JwtResponse.UserPayload userPayload = new JwtResponse.UserPayload();
        userPayload.setId(userDetails.getId());
        userPayload.setEmail(userDetails.getEmail());
        userPayload.setUsername(userDetails.getStaffUsername());
        userPayload.setFullName(userDetails.getFullName());
        userPayload.setRole(normalizedRole);
        userPayload.setBranch(userDetails.getBranch());
        response.setUser(userPayload);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@NonNull Authentication authentication) {
        UserDetailsImpl user = (UserDetailsImpl) authentication.getPrincipal();
        return staffRepository.findByEmail(user.getEmail())
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}

