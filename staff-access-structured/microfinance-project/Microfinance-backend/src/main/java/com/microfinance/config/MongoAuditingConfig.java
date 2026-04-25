package com.microfinance.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

/**
 * Configuration class to enable MongoDB auditing.
 * This allows @CreatedDate and @LastModifiedDate annotations
 * to work automatically on entities.
 */
@Configuration
@EnableMongoAuditing
public class MongoAuditingConfig {
    // This configuration enables automatic timestamp handling
    // for @CreatedDate and @LastModifiedDate annotated fields
}