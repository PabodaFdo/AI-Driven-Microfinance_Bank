package com.microfinance.repository;

import com.microfinance.model.Staff;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface StaffRepository extends MongoRepository<Staff, String> {
    Optional<Staff> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    Optional<Staff> findByPhone(String phone);

    boolean existsByPhone(String phone);
}
