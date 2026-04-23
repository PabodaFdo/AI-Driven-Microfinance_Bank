package com.microfinance.client;

import com.microfinance.dto.LoanRiskPredictionRequest;
import com.microfinance.dto.LoanRiskPredictionResponse;
import com.microfinance.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * HTTP client to call microfinance-ai FastAPI endpoint
 * Handles request/response serialization and error handling
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AIModelClient {

    @Value("${app.ai-model.api-url:http://localhost:8000}")
    private String aiApiUrl;

    @Value("${app.ai-model.predict-risk-path:/predict-risk}")
    private String predictRiskPath;

    @Value("${app.ai-model.timeout-seconds:30}")
    private long timeoutSeconds;

    private RestTemplate restTemplate;

    /**
     * Lazy initialize RestTemplate with timeout
     */
    private RestTemplate getRestTemplate() {
        if (restTemplate == null) {
            restTemplate = new RestTemplateBuilder()
                    .setConnectTimeout(Duration.ofSeconds(timeoutSeconds))
                    .setReadTimeout(Duration.ofSeconds(timeoutSeconds))
                    .build();
        }
        return restTemplate;
    }

    /**
     * Call AI model predict-risk endpoint
     * @param request AI model request
     * @return AI model response
     * @throws BusinessException if API call fails
     */
    public LoanRiskPredictionResponse predictRisk(LoanRiskPredictionRequest request) {
        try {
            String url = aiApiUrl + predictRiskPath;
            log.info("Calling AI model: POST {}", url);

            // Prepare request headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Create HTTP entity
            HttpEntity<LoanRiskPredictionRequest> httpRequest = new HttpEntity<>(request, headers);

            // Make the call
            ResponseEntity<LoanRiskPredictionResponse> response = getRestTemplate()
                    .postForEntity(url, httpRequest, LoanRiskPredictionResponse.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new BusinessException("AI API returned error status: " + response.getStatusCode());
            }

            LoanRiskPredictionResponse result = response.getBody();
            if (result == null) {
                throw new BusinessException("AI API returned empty response");
            }

            log.info("AI prediction successful. Risk category: {}, Probability: {}",
                    result.getRiskCategory(), result.getRiskProbability());

            return result;

        } catch (RestClientException e) {
            log.error("Failed to call AI API: {}", e.getMessage(), e);
            throw new BusinessException("AI model service unavailable: " + e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error calling AI API: {}", e.getMessage(), e);
            throw new BusinessException("Error calling AI model: " + e.getMessage());
        }
    }
}
