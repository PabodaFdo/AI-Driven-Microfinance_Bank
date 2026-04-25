# AI Service Quick Start - For Spring Backend Team

## One-Line Start (if models are pre-trained)

```bash
cd microfinance-ai
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

The AI service will be available at **http://localhost:8000**

## Full Setup (first time)

```bash
# 1. Navigate to project
cd microfinance-ai

# 2. Install dependencies
pip install -r requirements.txt

# 3. Train models (first time only)
python run_pipeline.py

# 4. Start API server
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

## Verify Service is Running

```bash
# Health check
curl http://localhost:8000/health

# Should return:
# {"status":"healthy","service":"AI Microfinance Loan Risk Engine","version":"1.0.0"}
```

## Test Both Endpoints

```bash
# Run comprehensive contract validation
python test_api_contract.py
```

Expected output: **All tests passed!**

## API Endpoints

### 1. POST /predict-risk
Predict loan default risk for an applicant

**Request Example:**
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

**Response:**
```json
{
  "risk_probability": 0.0475,
  "risk_category": "LOW",
  "decision": "APPROVE",
  "explanation": "Applicant has low credit risk. Loan is recommended for approval.",
  "shap_explanations": [...]
}
```

### 2. POST /predict-recommendation
Generate recommended loan terms

**Same request format as /predict-risk**

**Response:**
```json
{
  "recommended_amount": 50000.0,
  "recommended_term": 60,
  "recommended_rate": 8.51,
  "feasibility": "MEDIUM",
  "reasoning": "Recommendation available - amount adjusted based on risk profile.",
  "shap_explanations": [...]
}
```

## Integration with Java

```java
// Call from AiServiceClient.java
RestTemplate restTemplate = new RestTemplate();

// Risk prediction
ResponseEntity<RiskPredictionResponse> response = 
    restTemplate.postForEntity(
        "http://localhost:8000/predict-risk",
        loanApplication,
        RiskPredictionResponse.class
    );

// Recommendation
ResponseEntity<RecommendationResponse> response = 
    restTemplate.postForEntity(
        "http://localhost:8000/predict-recommendation",
        loanApplication,
        RecommendationResponse.class
    );
```

## Key Points

- ✅ Service runs on **port 8000** (configurable)
- ✅ All responses use **exact field names** matching the contract
- ✅ Risk categories: **LOW, MEDIUM, HIGH** (uppercase)
- ✅ Decisions: **APPROVE** or **DENY**
- ✅ Feasibility: **HIGH, MEDIUM, LOW** (uppercase)
- ✅ SHAP explanations: Top 5 features influencing predictions
- ✅ Response times: 100-500ms per prediction

## Documentation

For detailed integration guidance, see: **SPRING_BACKEND_INTEGRATION.md**

## Troubleshooting

**Port 8000 already in use?**
```bash
uvicorn api.main:app --port 8001
```

**ModuleNotFoundError?**
```bash
pip install -r requirements.txt
```

**Models not found?**
```bash
python run_pipeline.py
```

---

**Service Status:** Ready for production integration ✓
