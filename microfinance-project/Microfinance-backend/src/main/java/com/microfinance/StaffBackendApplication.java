package com.microfinance;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class StaffBackendApplication {
    public static void main(String[] args) {
        // Load .env file BEFORE Spring initializes MongoDB
        Dotenv dotenv = Dotenv.configure()
            .ignoreIfMissing()
            .load();

        // Set environment variables from .env file
        dotenv.entries().forEach(entry -> {
            System.setProperty(entry.getKey(), entry.getValue());
        });

        SpringApplication.run(StaffBackendApplication.class, args);
    }
}
