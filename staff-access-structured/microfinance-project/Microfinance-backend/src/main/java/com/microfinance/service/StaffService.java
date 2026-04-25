package com.microfinance.service;

import com.microfinance.dto.ChangePasswordRequest;
import com.microfinance.dto.CreateStaffRequest;
import com.microfinance.dto.ProfileUpdateRequest;
import com.microfinance.dto.UpdateStaffRequest;
import com.microfinance.model.Staff;
import com.microfinance.repository.StaffRepository;
import com.microfinance.security.RoleMapper;
import com.microfinance.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
public class StaffService {

    @Autowired
    private StaffRepository staffRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final List<String> VALID_ROLES = Arrays.asList("ADMIN", "BANK_MANAGER", "LOAN_OFFICER");
    private static final List<String> VALID_BRANCHES = Arrays.asList(
        "Colombo", "Kandy", "Galle", "Matara", "Jaffna", "Kurunegala", "Anuradhapura"
    );

    public List<Staff> getAllStaff() {
        return staffRepository.findAll();
    }

    public Staff createStaff(CreateStaffRequest request) {
        // Validate role
        String normalizedRole = RoleMapper.normalize(request.getRole());
        if (!VALID_ROLES.contains(normalizedRole)) {
            throw new IllegalArgumentException("Invalid role. Allowed roles: " + String.join(", ", VALID_ROLES));
        }

        // Validate branch
        String trimmedBranch = request.getBranch().trim();
        if (!VALID_BRANCHES.contains(trimmedBranch)) {
            throw new IllegalArgumentException("Invalid branch. Allowed branches: " + String.join(", ", VALID_BRANCHES));
        }

        // Validate phone if provided
        if (request.getPhone() != null && !request.getPhone().trim().isEmpty()) {
            validatePhone(request.getPhone());
        }

        // Validate email uniqueness
        if (staffRepository.existsByEmail(request.getEmail().trim().toLowerCase())) {
            throw new IllegalArgumentException("Email already exists");
        }

        // Validate username uniqueness
        if (staffRepository.existsByUsername(request.getUsername().trim())) {
            throw new IllegalArgumentException("Username already exists");
        }

        // Validate phone uniqueness if phone is provided
        if (request.getPhone() != null && !request.getPhone().trim().isEmpty()) {
            String trimmedPhone = request.getPhone().trim();
            if (staffRepository.existsByPhone(trimmedPhone)) {
                throw new IllegalArgumentException("This phone number is already registered");
            }
        }

        // Validate password strength
        validatePasswordStrength(request.getPassword());

        Staff staff = new Staff();
        staff.setFullName(request.getFullName().trim());
        staff.setEmail(request.getEmail().trim().toLowerCase());
        staff.setUsername(request.getUsername().trim());
        staff.setPassword(passwordEncoder.encode(request.getPassword()));
        staff.setRole(normalizedRole);
        staff.setBranch(trimmedBranch);
        staff.setAddress(request.getAddress() == null ? "" : request.getAddress().trim());
        staff.setPhone(request.getPhone() == null ? "" : request.getPhone().trim());
        staff.setActive(true);
        staff.setCreatedAt(LocalDateTime.now());

        return staffRepository.save(staff);
    }

    public Staff updateStaff(@NonNull String id, @NonNull UpdateStaffRequest request) {
        // Validate role
        String normalizedRole = RoleMapper.normalize(request.getRole());
        if (!VALID_ROLES.contains(normalizedRole)) {
            throw new IllegalArgumentException("Invalid role. Allowed roles: " + String.join(", ", VALID_ROLES));
        }

        // Validate branch
        String trimmedBranch = request.getBranch().trim();
        if (!VALID_BRANCHES.contains(trimmedBranch)) {
            throw new IllegalArgumentException("Invalid branch. Allowed branches: " + String.join(", ", VALID_BRANCHES));
        }

        // Validate phone if provided
        if (request.getPhone() != null && !request.getPhone().trim().isEmpty()) {
            validatePhone(request.getPhone());
        }

        Staff staff = getStaffById(id);

        // Validate and update username
        String trimmedUsername = request.getUsername().trim();
        if (trimmedUsername.isEmpty() || trimmedUsername.matches("^\\s+$")) {
            throw new IllegalArgumentException("Username cannot be empty or whitespace");
        }
        // Check username uniqueness (excluding current staff)
        if (!staff.getUsername().equals(trimmedUsername) && staffRepository.existsByUsername(trimmedUsername)) {
            throw new IllegalArgumentException("Username already exists");
        }

        // Validate and update email
        String trimmedEmail = request.getEmail().trim().toLowerCase();
        if (trimmedEmail.isEmpty() || trimmedEmail.matches("^\\s+$")) {
            throw new IllegalArgumentException("Email cannot be empty or whitespace");
        }
        // Check email uniqueness (excluding current staff)
        if (!staff.getEmail().equals(trimmedEmail) && staffRepository.existsByEmail(trimmedEmail)) {
            throw new IllegalArgumentException("Email already exists");
        }

        // Check phone uniqueness (excluding current staff)
        if (request.getPhone() != null && !request.getPhone().trim().isEmpty()) {
            String trimmedPhone = request.getPhone().trim();
            String currentPhone = staff.getPhone() == null ? "" : staff.getPhone();
            // Allow same phone only for the same staff member
            if (!currentPhone.equals(trimmedPhone) && staffRepository.existsByPhone(trimmedPhone)) {
                throw new IllegalArgumentException("This phone number is already registered");
            }
        }

        // Update all fields
        staff.setFullName(request.getFullName().trim());
        staff.setEmail(trimmedEmail);
        staff.setUsername(trimmedUsername);
        staff.setRole(normalizedRole);
        staff.setBranch(trimmedBranch);
        staff.setAddress(request.getAddress() == null ? "" : request.getAddress().trim());
        staff.setPhone(request.getPhone() == null ? "" : request.getPhone().trim());

        return staffRepository.save(staff);
    }

    public Staff deactivateStaff(@NonNull String id, String reason, Authentication authentication) {
        // Check self-deactivation
        if (authentication != null && authentication.getPrincipal() instanceof UserDetailsImpl currentUser) {
            if (id.equals(currentUser.getId())) {
                throw new IllegalArgumentException("You cannot deactivate your own account");
            }
        }

        Staff staff = getStaffById(id);

        // Prevent deactivating last active admin
        if ("ADMIN".equals(staff.getRole()) && staff.isActive()) {
            long activeAdminCount = staffRepository.findAll().stream()
                .filter(s -> s.isActive() && "ADMIN".equals(s.getRole()))
                .count();
            if (activeAdminCount == 1) {
                throw new IllegalArgumentException("Cannot deactivate the last active administrator");
            }
        }

        // Validate deactivation reason (not empty or whitespace)
        String trimmedReason = reason == null ? "" : reason.trim();
        if (trimmedReason.isEmpty()) {
            throw new IllegalArgumentException("Deactivation reason is required");
        }
        if (trimmedReason.length() > 500) {
            throw new IllegalArgumentException("Deactivation reason must not exceed 500 characters");
        }

        staff.setActive(false);
        staff.setDeactivationReason(trimmedReason);
        staff.setDeactivatedAt(LocalDateTime.now());
        return staffRepository.save(staff);
    }

    public void deleteStaffPermanently(@NonNull String id) {
        getStaffById(id);
        staffRepository.deleteById(id);
    }

    public Staff updateMyProfile(@NonNull ProfileUpdateRequest request, Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof UserDetailsImpl currentUser)) {
            throw new IllegalArgumentException("Invalid authentication");
        }

        Staff staff = getStaffById(currentUser.getId());
        staff.setFullName(request.getFullName().trim());
        staff.setAddress(request.getAddress() == null ? "" : request.getAddress().trim());
        staff.setPhone(request.getPhone() == null ? "" : request.getPhone().trim());
        return staffRepository.save(staff);
    }

    public void changePassword(@NonNull String id, @NonNull ChangePasswordRequest request, Authentication authentication) {
        if (!(authentication != null && authentication.getPrincipal() instanceof UserDetailsImpl currentUser)) {
            throw new IllegalArgumentException("Invalid authentication");
        }

        boolean isSelf = id.equals(currentUser.getId());
        boolean isAdmin = RoleMapper.isAdmin(currentUser.getRole());
        if (!isSelf && !isAdmin) {
            throw new IllegalArgumentException("You can only change your own password");
        }

        Staff staff = getStaffById(id);

        // Verify current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), staff.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        // Check confirm password matches new password
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        // Validate new password strength
        validatePasswordStrength(request.getNewPassword());

        // Check new password is different from current
        if (passwordEncoder.matches(request.getNewPassword(), staff.getPassword())) {
            throw new IllegalArgumentException("New password must be different from current password");
        }

        staff.setPassword(passwordEncoder.encode(request.getNewPassword()));
        staff.setPasswordChangedAt(LocalDateTime.now());
        staffRepository.save(staff);
    }

    public Staff getStaffById(@NonNull String id) {
        return staffRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Staff not found with id: " + id));
    }

    /**
     * Validates password strength.
     * Requirements: min 8 chars, uppercase, lowercase, digit, special char
     */
    private void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters");
        }

        if (password.length() > 100) {
            throw new IllegalArgumentException("Password must not exceed 100 characters");
        }

        if (!password.matches(".*[A-Z].*")) {
            throw new IllegalArgumentException("Password must contain at least one uppercase letter");
        }

        if (!password.matches(".*[a-z].*")) {
            throw new IllegalArgumentException("Password must contain at least one lowercase letter");
        }

        if (!password.matches(".*\\d.*")) {
            throw new IllegalArgumentException("Password must contain at least one digit");
        }

        if (!password.matches(".*[!@#$%^&*()_+=\\-\\[\\]{};:'\",.<>?/\\\\|`~].*")) {
            throw new IllegalArgumentException("Password must contain at least one special character (!@#$%^&*()_+=)");
        }
    }

    /**
     * Validate phone number format and content
     * - Must be exactly 10 digits
     * - Cannot contain the same digit repeated 10 times (e.g., 0000000000, 1111111111, etc.)
     */
    private void validatePhone(String phone) {
        if (phone == null) {
            return;  // Phone is optional
        }

        String trimmed = phone.trim();
        if (trimmed.isEmpty()) {
            return;  // Empty is allowed (optional field)
        }

        // Extract only digits
        String digitsOnly = trimmed.replaceAll("\\D", "");

        // Check for exactly 10 digits
        if (!digitsOnly.matches("^\\d{10}$")) {
            throw new IllegalArgumentException("Phone number must contain exactly 10 digits");
        }

        // Reject phone numbers with all same repeated digits (e.g., 0000000000, 1111111111, etc.)
        if (digitsOnly.matches("^(\\d)\\1{9}$")) {
            throw new IllegalArgumentException("Phone number cannot contain the same digit repeatedly");
        }
    }
}
