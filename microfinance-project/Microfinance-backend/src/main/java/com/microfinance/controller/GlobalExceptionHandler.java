package com.microfinance.controller;

import com.microfinance.exception.AccessDeniedException;
import com.microfinance.exception.BusinessException;
import com.microfinance.exception.ResourceNotFoundException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return error(HttpStatus.FORBIDDEN, "Access Denied: " + ex.getMessage());
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, Object>> handleBusiness(BusinessException ex) {
        String message = safeMessage(ex.getMessage(), "Business rule violated");
        if (isPermissionRelated(message)) {
            return error(HttpStatus.FORBIDDEN, message);
        }
        return error(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicateKey(DuplicateKeyException ex) {
        return error(HttpStatus.CONFLICT, "A record with this value already exists (duplicate key).");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("message", "Validation failed");
        body.put("timestamp", Instant.now().toString());

        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                fieldErrors.put(error.getField(), safeMessage(error.getDefaultMessage(), "Invalid value")));
        body.put("fieldErrors", fieldErrors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected server error");
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status.value());
        body.put("message", safeMessage(message, status.getReasonPhrase()));
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.status(status).body(body);
    }

    private boolean isPermissionRelated(String message) {
        String normalized = message.toLowerCase();
        return (normalized.contains("only") && normalized.contains("can"))
                || normalized.contains("not permitted")
                || normalized.contains("access denied")
                || normalized.contains("forbidden");
    }

    private String safeMessage(String message, String fallback) {
        if (message == null || message.trim().isEmpty()) {
            return fallback;
        }
        return message;
    }
}
