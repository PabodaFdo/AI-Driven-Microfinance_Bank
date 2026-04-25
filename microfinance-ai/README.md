# Microfinance AI Service Documentation

## Purpose of the AI Service
`microfinance-ai` provides machine learning support for loan risk prediction and recommendation generation. It serves as an independent API that the Spring backend calls during risk and recommendation workflows.

## What Happens Inside `microfinance-ai`
1. Input payload is received through FastAPI endpoints in `api/main.py`.
2. Request values are transformed with preprocessing logic from `src/utils.py`.
3. Trained artifacts from `models/` are loaded and used for inference.
4. The service returns risk results, recommendation outputs, and SHAP explanation content.

## Dataset and Model Files
### Data Folder (`data/`)
- `Loan_default.csv`
- `cleaned_loans.csv`
- `engineered_loans.csv`
- `preprocessed_data.pkl`

### Model Folder (`models/`)
- `best_risk_classifier.pkl`
- `final_scaler.pkl`
- `selected_features.pkl`
- `recommendation_models.pkl`
- Additional model and tuning artifacts

## Preprocessing and Model Usage Summary
Pipeline source files in `src/` cover:
- Data preparation
- Feature engineering
- Model training
- Hyperparameter tuning
- Model evaluation
- Explainability and recommendation generation

The API layer uses these outputs to perform runtime prediction for backend requests.

## Python Setup Requirements
- Python 3.8+ (project also compatible with newer versions in local environment)
- pip
- Virtual environment (recommended)

## Installation Commands (Windows)
```bash
cd microfinance-ai
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Correct Command to Run AI Service
Because `main.py` is inside the `api` folder, run:

```bash
cd microfinance-ai
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

## Available API Endpoints
From `api/main.py`:
- `GET /health`
- `POST /predict-risk`
- `POST /predict-recommendation`

## How Backend Connects to AI
Backend uses `AiServiceClient` (`Microfinance-backend`) with default AI base URL:
- `http://localhost:8000`

Backend calls:
- `/predict-risk`
- `/predict-recommendation`

## How to Test AI Service
### Health Check
```bash
curl http://localhost:8000/health
```

### API Contract Test Script
```bash
cd microfinance-ai
python test_api_contract.py
```

### Interactive Docs
Open:
- `http://localhost:8000/docs`

## Common Errors and Fixes
### 1. `Error loading ASGI app. Could not import module "main"`
Cause:
- Running `uvicorn main:app` while `main.py` is inside `api/`.

Fix:
```bash
cd microfinance-ai
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Missing dependencies
```bash
cd microfinance-ai
pip install -r requirements.txt
```

### 3. Model file not found errors
- Ensure `models/` artifacts exist.
- If missing, execute:
```bash
cd microfinance-ai
python run_pipeline.py
```

### 4. Port 8000 already in use
```bash
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

## Final Note
AI endpoints are designed for backend integration and should be started before backend to support full risk and recommendation functionality.
