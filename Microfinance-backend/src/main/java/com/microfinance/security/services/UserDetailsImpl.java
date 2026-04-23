package com.microfinance.security.services;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.microfinance.model.Staff;
import com.microfinance.security.RoleMapper;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.Objects;

@Getter
public class UserDetailsImpl implements UserDetails {
    private final String id;
    private final String email;
    private final String staffUsername;
    private final String fullName;
    private final String role;
    private final String branch;
    private final boolean active;

    @JsonIgnore
    private final String password;

    private final Collection<? extends GrantedAuthority> authorities;

    public UserDetailsImpl(String id,
                           String email,
                           String staffUsername,
                           String fullName,
                           String role,
                           String branch,
                           boolean active,
                           String password,
                           Collection<? extends GrantedAuthority> authorities) {
        this.id = id;
        this.email = email;
        this.staffUsername = staffUsername;
        this.fullName = fullName;
        this.role = role;
        this.branch = branch;
        this.active = active;
        this.password = password;
        this.authorities = authorities;
    }

    public static UserDetailsImpl build(Staff staff) {
        String normalizedRole = RoleMapper.normalize(staff.getRole());
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + normalizedRole));

        return new UserDetailsImpl(
                staff.getId(),
                staff.getEmail(),
                staff.getUsername(),
                staff.getFullName(),
                normalizedRole,
                staff.getBranch(),
                staff.isActive(),
                staff.getPassword(),
                authorities
        );
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return active;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserDetailsImpl user = (UserDetailsImpl) o;
        return Objects.equals(id, user.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
