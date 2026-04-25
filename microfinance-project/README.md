# Microfinance Software System (Frontend + Backend)

## Purpose
This directory contains the core software system for the university project: a Spring Boot backend and React frontend that implement staff operations, loan processing workflows, repayment tracking, and reporting.

## System Scope
The software layer is responsible for:
- User authentication and authorization
- Applicant and application data management
- Loan workflow orchestration
- Persisting and presenting risk/recommendation outcomes
- Repayment operations and reporting

## Backend and Frontend at a Glance
### Backend (`Microfinance-backend`)
- Spring Boot REST API with MongoDB persistence
- Business logic for applicants, applications, risk, recommendations, repayments, and reports
- Security rules and role-based endpoint access

### Frontend (`Microfinance-frontend`)
- React + Vite user interface
- Role-aware navigation and route protection
- API integration for operational workflows and dashboards

## Main Software Modules
- Staff Management and Access Control
- Applicant and Application Workflow
- Loan Risk Assessment
- Loan Recommendation Engine
- Repayment Schedule and Tracking
- Reporting and Analytics Dashboard

## Connection to AI Service
The software integrates AI through backend service-to-service communication:
1. Frontend requests risk/recommendation actions from backend.
2. Backend calls Python AI endpoints (`/predict-risk`, `/predict-recommendation`) via `AiServiceClient`.
3. Backend stores and returns processed results to frontend.

This design keeps AI credentials, contracts, and fallback behavior managed in backend logic.

## Development Workflow
1. Run AI service in `microfinance-ai`.
2. Run backend in `Microfinance-backend`.
3. Run frontend in `Microfinance-frontend`.
4. Validate end-to-end operations from login through risk/recommendation and repayment pages.

## Folder Structure
```text
microfinance-project/
├── README.md
├── FINAL_PROJECT_OVERVIEW.md
├── Microfinance-backend/
│   ├── pom.xml
│   ├── README.md
│   └── src/
├── Microfinance-frontend/
│   ├── package.json
│   ├── README.md
│   └── src/
└── setup/
    ├── README.md
    ├── sample_applicants_data.json
    └── setup-mongodb-data.js
```

## Quick Setup Instructions
### 1. Backend
```bash
cd microfinance-project/Microfinance-backend
copy .env.example .env
mvn clean install
mvn spring-boot:run
```

### 2. Frontend
```bash
cd microfinance-project/Microfinance-frontend
npm install
npm run dev
```

### 3. Access
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`

### 4. AI Dependency
Ensure the AI service is started from `microfinance-ai` before running risk and recommendation workflows.

## Environment Notes
Database URI, email credentials, and other sensitive values should be configured according to local environment.
