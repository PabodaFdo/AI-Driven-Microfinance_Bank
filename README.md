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

Access to every API endpoint and frontend page is restricted by role, so each staff member only sees and performs the operations that belong to their responsibilities.

## Key Features and Modules

### 1. Staff Management and Access Control
Staff members authenticate with a username and password, and the backend issues a signed JWT token that the frontend attaches to every later request. Role-based access control (RBAC) then decides which endpoints and pages each role can use. Admins can create, update, and deactivate staff accounts, and every staff member can view their own profile and change their password.

### 2. Applicant and Application Workflow
Loan officers register applicants and store their personal, financial, and employment details in one central place. Each applicant can have one or more loan applications, and every application moves through a defined lifecycle (for example submitted, under review, approved, or rejected). Status updates are recorded so the history of each application can be traced.

### 3. Loan Risk Assessment
For each application, the backend sends the applicant and loan attributes to the AI service and receives a risk probability and a risk category. The result is stored with the application, so officers and managers can review the assessment later without recalculating it. This replaces inconsistent manual judgment with a repeatable, data-driven score.

### 4. Recommendation Engine
Alongside the risk score, the system suggests a safer loan configuration: a recommended loan amount, repayment term, and interest rate. Officers and managers can compare the requested terms against the recommended ones and use the difference to negotiate or adjust an offer before a decision is made.

### 5. Repayment Management
When a loan is approved, the system generates a repayment schedule with installment dates and amounts. Staff record payments as they are received, and the system updates the balance of each installment. Installments that pass their due date without payment are flagged as overdue, giving the institution early visibility into late-paying borrowers.

### 6. Reporting and Analytics Dashboard
The dashboard shows key portfolio and operational metrics through charts and summary cards (built with Chart.js). Managers can also use report templates and apply filters, such as date range or status, to produce focused reports on applications, risk levels, repayments, and overdue loans.

## AI and ML Component
The AI service in `microfinance-ai` is a FastAPI application served by Uvicorn. Its pipeline for each request is:

1. **Receive:** A REST endpoint accepts applicant and loan attributes from the backend as JSON.
2. **Preprocess:** The request is validated and transformed into the same feature format used during training (encoding, scaling, and feature preparation with Pandas and NumPy).
3. **Predict:** Trained model artifacts from `microfinance-ai/models` are loaded with Joblib and applied to the prepared data. The models are built with Scikit-learn and XGBoost.
4. **Explain:** SHAP is used to calculate how much each input feature pushed the prediction up or down, so the result is not a black box.
5. **Respond:** The service returns:
   - Risk probability and risk category
   - AI-supported approval/denial guidance
   - Recommendation values (amount, term, rate)
   - SHAP-based explanation items for interpretability

The explanation items let loan officers and managers see *why* an application was rated risky (for example, a high debt-to-income ratio or a short employment history), which supports transparent and defensible lending decisions. The AI output is decision support only; the final decision remains with the bank manager.

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
1. **Login:** Staff logs in through the frontend.
2. **Authentication:** Backend validates credentials and issues a JWT token, which the frontend sends with all later requests.
3. **Data entry:** Loan officer manages applicant and application data.
4. **Risk assessment:** Backend triggers risk assessment by calling the AI endpoints with the application details.
5. **Storage:** Backend stores risk results and generates recommendation records linked to the application.
6. **Decision:** Manager/officer uses the risk score, explanation, and recommendation output in the decision workflow, then approves or rejects the application.
7. **Repayment setup:** Repayment schedules are generated for approved loans.
8. **Tracking:** Payment history and overdue states are tracked as payments are recorded.
9. **Reporting:** Reporting dashboards present portfolio and operational metrics for management.

## Communication Flow: Frontend, Backend, and AI
```text
Frontend (React, Vite)  --HTTP/JSON, JWT-->  Backend (Spring Boot, :8080)  --HTTP/JSON-->  AI Service (FastAPI, :8000)
                                                      |
                                                      v
                                                  MongoDB
```
- Frontend communicates with backend APIs on port 8080 using Axios, sending the JWT token with each request.
- Backend communicates with AI service on port 8000 through `AiServiceClient`.
- AI outputs return to backend, where they are persisted in MongoDB and served back to frontend.
- Frontend does not directly call AI endpoints in the current source structure. Keeping the AI service behind the backend means authentication, role checks, and data storage are handled in one place, and the AI service is never exposed to end users directly.

## Local Running Overview
- AI Service: `uvicorn api.main:app --reload --host 0.0.0.0 --port 8000`
- Backend: `mvn spring-boot:run`
- Frontend: `npm run dev`
- Recommended startup order: AI service -> backend -> frontend

The AI service should start first because the backend depends on it when running risk assessments, and the frontend depends on the backend for all data.

## Testing Summary
- Backend test sources are available under `Microfinance-backend/src/test/java` (including repayment unit/integration/controller tests).
- AI contract test file exists as `microfinance-ai/test_api_contract.py`, which checks that the AI endpoints accept the expected request format and return the expected response fields.
- Frontend validation is mainly functional/manual through application pages and API integration.

## Future Improvements
- Centralize frontend API base URL through environment variables for all service files.
- Add full automated frontend test suite.
- Add model versioning and monitoring for AI drift.
- Add CI pipeline for integrated backend-frontend-AI verification.
- Add deployment profiles for staging and production.

## GitHub and Submission Note
This repository structure and documentation are prepared for final university submission. Environment-specific values such as database credentials and email account secrets should be configured according to local environment and must not be committed to version control.
