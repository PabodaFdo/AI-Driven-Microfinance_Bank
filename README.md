# AI-Driven Microfinance Loan Risk Prediction and Recommendation System

## Project Overview
This project delivers an integrated microfinance platform that combines a React frontend, a Spring Boot backend, and a Python AI service to support loan processing, risk evaluation, recommendation generation, repayment tracking, and reporting.

## Problem Statement
Microfinance institutions often rely on manual, time-consuming loan review methods. This creates delays, inconsistent risk judgments, and limited visibility into portfolio-level trends. The project addresses these issues by introducing a structured digital workflow with AI-assisted decision support.

## Main Objectives
1. Centralize applicant and loan application management.
2. Improve loan risk analysis using machine learning predictions.
3. Provide recommendation support for safer lending decisions.
4. Enforce role-based access control for staff operations.
5. Track repayments and overdue behavior systematically.
6. Generate operational and analytical reports for management.

## System Users and Roles
| Role | Purpose in System |
|---|---|
| ADMIN | Manages staff and full platform configuration |
| LOAN_OFFICER | Manages applicants, applications, risk/recommendation workflows |
| BANK_MANAGER | Reviews outcomes and supports approval decisions |

## Key Features and Modules
- Staff Management and Access Control (JWT authentication, RBAC, profile/password operations)
- Applicant and Application Workflow (registration, application lifecycle, status updates)
- Loan Risk Assessment (risk scoring and classification support)
- Recommendation Engine (loan term/amount/rate suggestions)
- Repayment Management (schedule generation, payment recording, overdue handling)
- Reporting and Analytics Dashboard (dashboard metrics, report templates, filtered reports)

## AI and ML Component
The AI service in `microfinance-ai` exposes REST endpoints that receive applicant and loan attributes, preprocess the request, apply trained model artifacts from `microfinance-ai/models`, and return:
- Risk probability and risk category
- AI-supported approval/denial guidance
- Recommendation values (amount, term, rate)
- SHAP-based explanation items for interpretability

## Technology Stack
### Frontend
- React 18.3.1
- Vite 5.4.8
- React Router DOM 6.26.2
- Axios 1.13.5
- Chart.js + react-chartjs-2

### Backend
- Java 21
- Spring Boot 3.5.12
- Spring Security + JWT (JJWT 0.11.5)
- Spring Data MongoDB
- Spring Web + WebFlux
- Maven

### AI Service
- Python (FastAPI + Uvicorn)
- Scikit-learn, XGBoost, SHAP, Pandas, NumPy
- Joblib model loading

## Workspace Folder Structure
```text
AIML Integrated/
├── README.md
├── RUNNING_GUIDE.md
├── FINAL_PROJECT_OVERVIEW.md
├── CONTRIBUTION_SUMMARY.md
├── API_FLOW.md
├── TROUBLESHOOTING.md
├── SETUP_AND_DEPLOYMENT.md
├── microfinance-project/
│   ├── README.md
│   ├── Microfinance-backend/
│   ├── Microfinance-frontend/
│   └── setup/
└── microfinance-ai/
    ├── api/main.py
    ├── src/
    ├── data/
    ├── models/
    └── requirements.txt
```

## Complete System Workflow
1. Staff logs in through the frontend.
2. Backend validates credentials and issues JWT token.
3. Loan officer manages applicant and application data.
4. Backend triggers risk assessment using AI endpoints.
5. Backend stores risk results and generates recommendation records.
6. Manager/officer uses recommendation output in decision workflow.
7. Repayment schedules are generated for approved loans.
8. Payment history and overdue states are tracked.
9. Reporting dashboards present portfolio and operational metrics.

## Communication Flow: Frontend, Backend, and AI
- Frontend communicates with backend APIs on port 8080.
- Backend communicates with AI service on port 8000 through `AiServiceClient`.
- AI outputs return to backend and are persisted/served back to frontend.
- Frontend does not directly call AI endpoints in the current source structure.

## Local Running Overview
- AI Service: `uvicorn api.main:app --reload --host 0.0.0.0 --port 8000`
- Backend: `mvn spring-boot:run`
- Frontend: `npm run dev`
- Recommended startup order: AI service -> backend -> frontend

## Testing Summary
- Backend test sources are available under `Microfinance-backend/src/test/java` (including repayment unit/integration/controller tests).
- AI contract test file exists as `microfinance-ai/test_api_contract.py`.
- Frontend validation is mainly functional/manual through application pages and API integration.

## Future Improvements
- Centralize frontend API base URL through environment variables for all service files.
- Add full automated frontend test suite.
- Add model versioning and monitoring for AI drift.
- Add CI pipeline for integrated backend-frontend-AI verification.
- Add deployment profiles for staging and production.

## GitHub and Submission Note
This repository structure and documentation are prepared for final university submission. Environment-specific values such as database credentials and email account secrets should be configured according to local environment and must not be committed to version control.
