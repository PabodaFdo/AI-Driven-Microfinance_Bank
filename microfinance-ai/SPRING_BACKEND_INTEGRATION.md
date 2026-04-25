# AI Service Integration Guide for Spring Backend

This document describes how to integrate the AI Microfinance Loan Risk Engine with your Spring Boot backend via `AiServiceClient.java`.

## Overview

The AI service runs on **http://localhost:8000** and provides two endpoints:

- **POST /predict-risk** - Analyzes loan risk for an applicant
- **POST /predict-recommendation** - Generates recommended loan terms

## Starting the AI Service

### Prerequisites

- Python 3.8+
- All dependencies installed from `requirements.txt`
- Models already trained (from running `python run_pipeline.py`)

### Quick Start

```bash
# Navigate to project root
cd microfinance-ai

# Start the API server
cd api
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The service will be available at **http://localhost:8000**

### Verify Service is Running

```bash
# Health check
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","service":"AI Microfinance Loan Risk Engine","version":"1.0.0"}
```

---

## API Contract Specification

### POST /predict-risk

**Purpose:** Predict loan default risk for an applicant

**Request Body:**

```json
{
  "Age": 35,
  "Income": 75000,
  "LoanAmount": 50000,
  "CreditScore": 720,
  "MonthsEmployed": 60,
  "NumCreditLines": 3,
  "InterestRate": 8.5,
  "LoanTerm": 36,
  "DTIRatio": 0.35,
  "Education": "Bachelor",
  "EmploymentType": "Full-time",
  "MaritalStatus": "Married",
  "HasMortgage": "Yes",
  "HasDependents": "Yes",
  "LoanPurpose": "Home Improvement",
  "HasCoSigner": "No"
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| Age | int | Applicant age in years |
| Income | float | Annual income in currency units |
| LoanAmount | float | Requested loan amount |
| CreditScore | int | Credit score (e.g., 300-850) |
| MonthsEmployed | int | Months at current employment |
| NumCreditLines | int | Number of active credit lines |
| InterestRate | float | Proposed interest rate (%) |
| LoanTerm | int | Loan term in months |
| DTIRatio | float | Debt-to-income ratio (0.0-1.0) |
| Education | str | "High School", "Bachelor", "Master", etc. |
| EmploymentType | str | "Full-time", "Self-employed", "Part-time", etc. |
| MaritalStatus | str | "Single", "Married", "Divorced", etc. |
| HasMortgage | str | "Yes" or "No" |
| HasDependents | str | "Yes" or "No" |
| LoanPurpose | str | "Home Improvement", "Debt Consolidation", etc. |
| HasCoSigner | str | "Yes" or "No" |

**Response Body:**

```json
{
  "risk_probability": 0.0531,
  "risk_category": "LOW",
  "decision": "APPROVE",
  "explanation": "Applicant has low credit risk. Loan is recommended for approval.",
  "shap_explanations": [
    {
      "feature": "CreditScore",
      "shap_value": -0.23,
      "contribution": "negative"
    },
    {
      "feature": "DTIRatio",
      "shap_value": -0.18,
      "contribution": "negative"
    }
  ]
}
```

**Response Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| risk_probability | float | Risk score 0-1 (0=no risk, 1=high risk) |
| risk_category | str | "LOW", "MEDIUM", or "HIGH" |
| decision | str | "APPROVE" or "DENY" |
| explanation | str | Human-readable reasoning |
| shap_explanations | array | Top 5 features influencing the prediction |

**SHAP Explanation Format:**

```json
{
  "feature": "CreditScore",
  "shap_value": -0.23,
  "contribution": "negative"
}
```

- **feature**: Feature name
- **shap_value**: SHAP value (impact on prediction, -1 to +1)
- **contribution**: "negative" (reduces risk) or "positive" (increases risk)

---

### POST /predict-recommendation

**Purpose:** Generate recommended loan terms based on applicant profile

**Request Body:**

Same as `/predict-risk`, plus optional fields:

```json
{
  "Age": 35,
  "Income": 75000,
  "LoanAmount": 50000,
  "CreditScore": 720,
  "MonthsEmployed": 60,
  "NumCreditLines": 3,
  "InterestRate": 8.5,
  "LoanTerm": 36,
  "DTIRatio": 0.35,
  "Education": "Bachelor",
  "EmploymentType": "Full-time",
  "MaritalStatus": "Married",
  "HasMortgage": "Yes",
  "HasDependents": "Yes",
  "LoanPurpose": "Home Improvement",
  "HasCoSigner": "No",
  "RiskScore": 0.15,
  "RiskLevel": "LOW"
}
```

Optional fields:
- **RiskScore** (float): Pre-computed risk score if already calculated
- **RiskLevel** (str): Pre-computed risk level ("LOW", "MEDIUM", "HIGH")

**Response Body:**

```json
{
  "recommended_amount": 45000,
  "recommended_term": 36,
  "recommended_rate": 8.2,
  "feasibility": "HIGH",
  "reasoning": "Full recommendation approved - applicant qualifies for requested amount. Applicant profile indicates low risk.",
  "shap_explanations": [
    {
      "feature": "LoanAmount",
      "shap_value": -0.12,
      "contribution": "negative"
    }
  ]
}
```

**Response Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| recommended_amount | float | Recommended loan amount in currency units |
| recommended_term | int | Recommended term in months (6, 12, 18, 24, 36, 48, 60) |
| recommended_rate | float | Recommended interest rate (%) |
| feasibility | str | "HIGH", "MEDIUM", or "LOW" |
| reasoning | str | Human-readable explanation |
| shap_explanations | array | Top 5 features influencing the recommendation |

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success - prediction/recommendation generated |
| 400 | Bad Request - invalid input data |
| 500 | Server Error - internal service error |

**Error Response Format:**

```json
{
  "detail": "Prediction failed: [error message]"
}
```

---

## Integration with AiServiceClient.java

### Example Java Code

```java
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AiServiceClient {
    
    private static final String AI_SERVICE_URL = "http://localhost:8000";
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public AiServiceClient(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public RiskPredictionResponse predictRisk(LoanApplicationRequest request) {
        String url = AI_SERVICE_URL + "/predict-risk";
        HttpEntity<LoanApplicationRequest> entity = new HttpEntity<>(request);
        
        try {
            ResponseEntity<RiskPredictionResponse> response = 
                restTemplate.postForEntity(url, entity, RiskPredictionResponse.class);
            return response.getBody();
        } catch (HttpClientErrorException e) {
            throw new AIServiceException("AI service prediction failed: " + e.getMessage(), e);
        }
    }

    public RecommendationResponse getRecommendation(LoanApplicationRequest request) {
        String url = AI_SERVICE_URL + "/predict-recommendation";
        HttpEntity<LoanApplicationRequest> entity = new HttpEntity<>(request);
        
        try {
            ResponseEntity<RecommendationResponse> response = 
                restTemplate.postForEntity(url, entity, RecommendationResponse.class);
            return response.getBody();
        } catch (HttpClientErrorException e) {
            throw new AIServiceException("AI service recommendation failed: " + e.getMessage(), e);
        }
    }

    public boolean isHealthy() {
        try {
            ResponseEntity<Map> response = 
                restTemplate.getForEntity(AI_SERVICE_URL + "/health", Map.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            return false;
        }
    }
}
```

### Data Model Classes

```java
// Request model
public class LoanApplicationRequest {
    public int age;
    public double income;
    public double loanAmount;
    public int creditScore;
    public int monthsEmployed;
    public int numCreditLines;
    public double interestRate;
    public int loanTerm;
    public double dtiRatio;
    public String education;
    public String employmentType;
    public String maritalStatus;
    public String hasMortgage;
    public String hasDependents;
    public String loanPurpose;
    public String hasCoSigner;
    
    // Optional fields
    public Double riskScore;
    public String riskLevel;
}

// Risk prediction response
public class RiskPredictionResponse {
    public double risk_probability;
    public String risk_category;      // "LOW", "MEDIUM", "HIGH"
    public String decision;            // "APPROVE", "DENY"
    public String explanation;
    public List<ShapExplanation> shap_explanations;
}

// Recommendation response
public class RecommendationResponse {
    public double recommended_amount;
    public int recommended_term;
    public double recommended_rate;
    public String feasibility;         // "HIGH", "MEDIUM", "LOW"
    public String reasoning;
    public List<ShapExplanation> shap_explanations;
}

// SHAP explanation
public class ShapExplanation {
    public String feature;
    public double shap_value;
    public String contribution;        // "positive", "negative"
}
```

---

## Testing the Integration

### Using cURL

**Test /predict-risk:**

```bash
curl -X POST http://localhost:8000/predict-risk \
  -H "Content-Type: application/json" \
  -d '{
    "Age": 35,
    "Income": 75000,
    "LoanAmount": 50000,
    "CreditScore": 720,
    "MonthsEmployed": 60,
    "NumCreditLines": 3,
    "InterestRate": 8.5,
    "LoanTerm": 36,
    "DTIRatio": 0.35,
    "Education": "Bachelor",
    "EmploymentType": "Full-time",
    "MaritalStatus": "Married",
    "HasMortgage": "Yes",
    "HasDependents": "Yes",
    "LoanPurpose": "Home Improvement",
    "HasCoSigner": "No"
  }'
```

**Test /predict-recommendation:**

```bash
curl -X POST http://localhost:8000/predict-recommendation \
  -H "Content-Type: application/json" \
  -d '{
    "Age": 35,
    "Income": 75000,
    "LoanAmount": 50000,
    "CreditScore": 720,
    "MonthsEmployed": 60,
    "NumCreditLines": 3,
    "InterestRate": 8.5,
    "LoanTerm": 36,
    "DTIRatio": 0.35,
    "Education": "Bachelor",
    "EmploymentType": "Full-time",
    "MaritalStatus": "Married",
    "HasMortgage": "Yes",
    "HasDependents": "Yes",
    "LoanPurpose": "Home Improvement",
    "HasCoSigner": "No"
  }'
```

### Using Python Test Script

```bash
python test_api_contract.py
```

This validates the API contract matches Spring backend expectations.

---

## Environment Setup

### Development (localhost)

```
AI_SERVICE_URL=http://localhost:8000
```

### Production Deployment

If deploying to a server:

```bash
# Use production ASGI server (e.g., Gunicorn)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 api.main:app
```

---

## Troubleshooting

### Issue: "Connection refused" when calling AI service

**Solution:** Make sure the AI service is running:

```bash
cd api
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Issue: "Port 8000 already in use"

**Solution:** Use a different port:

```bash
uvicorn main:app --reload --port 8001
```

Then update your Spring backend to use the new port.

### Issue: Invalid request data returns 400 error

**Solution:** Verify all required fields are present and have correct types:

- String fields: "Education", "EmploymentType", etc. must match expected values
- Numeric fields: Age, Income, LoanAmount must be valid numbers
- Boolean-like fields: "Yes"/"No" must be exact strings

### Issue: Predictions seem incorrect

**Possible causes:**

1. Models haven't been trained - run `python run_pipeline.py`
2. Data preprocessing mismatch - check that feature names exactly match the contract
3. Model files corrupted - retrain models: `python run_pipeline.py`

### Issue: SHAP explanations are empty

**Solution:** This is normal if the model hasn't computed SHAP values. SHAP values are computed on-demand for each prediction. If empty, verify the model is loaded correctly.

---

## Performance Considerations

- **Response time:** Expect 100-500ms per prediction (includes feature engineering + model inference + SHAP computation)
- **Concurrency:** The API supports multiple concurrent requests
- **Scalability:** For production, use a load balancer and multiple workers (Gunicorn with 4+ workers)

---

## Support

For issues with the AI service:

1. Check logs during API startup
2. Verify models exist in `models/` directory
3. Run `python run_pipeline.py` to retrain models if needed
4. Use `test_api_contract.py` to validate the service

---

**Last Updated:** 2026-04-22
**Service Version:** 1.0.0
