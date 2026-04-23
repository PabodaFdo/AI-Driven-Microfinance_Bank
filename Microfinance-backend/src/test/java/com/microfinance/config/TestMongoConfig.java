package com.microfinance.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

/**
 * Test configuration for MongoDB in integration tests.
 * Uses embedded MongoDB provided by de.flapdoodle.embed.mongo.
 */
@TestConfiguration
@EnableMongoAuditing
public class TestMongoConfig {
    // Embedded MongoDB is automatically configured by Spring Boot Test
    // when de.flapdoodle.embed.mongo is on the classpath
}