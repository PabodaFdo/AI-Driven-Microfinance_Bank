package com.microfinance.repository;

import com.microfinance.model.PasswordResetToken;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends MongoRepository<PasswordResetToken, String> {

    Optional<PasswordResetToken> findByTokenHashAndUsedAtNull(String tokenHash);

    Optional<PasswordResetToken> findByStaffIdOrderByCreatedAtDesc(String staffId);

}
