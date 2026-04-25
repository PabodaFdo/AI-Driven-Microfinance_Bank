package com.microfinance.config;

import com.microfinance.model.Staff;
import com.microfinance.repository.StaffRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedAdmin(StaffRepository staffRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            var existingAdmin = staffRepository.findByEmail("admin@microfinance.lk");
            if (existingAdmin.isPresent()) {
                Staff admin = existingAdmin.get();
                if (!admin.isActive()) {
                    admin.setActive(true);
                    admin.setDeactivationReason("");
                    staffRepository.save(admin);
                }
                return;
            }

            Staff admin = new Staff();
            admin.setFullName("Ravi Jayawardena");
            admin.setEmail("admin@microfinance.lk");
            admin.setUsername("ravi.j");
            admin.setPassword(passwordEncoder.encode("password123"));
            admin.setRole("ADMIN");
            admin.setBranch("Colombo");
            admin.setAddress("Head Office");
            admin.setActive(true);
            admin.setCreatedAt(LocalDateTime.now());

            staffRepository.save(admin);
        };
    }
}
