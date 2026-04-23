package com.microfinance.repository;

import com.microfinance.model.ReportTemplate;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ReportTemplateRepository extends MongoRepository<ReportTemplate, String> {
    List<ReportTemplate> findAllByOrderByCreatedAtDesc();
}
