# Microfinance Backend Documentation

## Backend Purpose
`Microfinance-backend` is the central API layer of the system. It handles authentication, data persistence, loan workflow orchestration, repayment processing, reporting, and integration with the Python AI service.

## Technology Stack (Detected from `pom.xml`)
- Java 21
- Spring Boot 3.5.12 (`spring-boot-starter-parent`)
- Spring Boot Web + WebFlux
- Spring Data MongoDB
- Spring Security
- Spring Validation
- Spring Mail
- JWT: `io.jsonwebtoken` (JJWT 0.11.5)
- Lombok
- Maven build with compiler release 21

## Spring Boot and Java Version
- Spring Boot version: `3.5.12`
- Java version: `21`

## Main Backend Modules
### Controllers
- `AuthController`
- `StaffController`
- `ApplicantController`
- `LoanApplicationController`
- `CreditScoreController`
- `RiskAssessmentController`
- `RecommendationController`
- `RepaymentController`
- `ReportingController`
- `AdminController`

### Services
- `StaffService`, `ApplicantService`, `LoanApplicationService`
- `RiskAssessmentService`, `RecommendationService`
- `RepaymentService`, `ReportingService`
- `AiServiceClient` (AI HTTP client)
- Password reset and email services

### Repositories
Mongo repositories for staff, applicants, applications, risk assessments, recommendations, repayments, report templates, and reset tokens.

## Authentication and Role-Based Access Control
- JWT authentication with stateless session policy
- Password hashing via `BCryptPasswordEncoder`
- Endpoint authorization enforced in `SecurityConfig`
- Operational roles: `ADMIN`, `LOAN_OFFICER`, `BANK_MANAGER`
- Admin-only areas include `/api/v1/staff/**` and `/api/admin/**`

## Database Connection
Configured in `src/main/resources/application.properties`:
- `spring.config.import=optional:file:./.env[.properties]`
- Mongo URI key: `MONGODB_URI`
- Fallback URI: `mongodb://localhost:27017/microfinance_db`

Environment values should be configured according to local environment.

## AI Service Integration
`AiServiceClient` uses Spring WebClient with default base URL:
- `http://localhost:8000` (property: `ai.service.url`)

Calls:
- `POST /predict-risk`
- `POST /predict-recommendation`

Behavior:
- Backend maps applicant/application fields to AI contract payload.
- On AI timeout/unavailability, backend handles failure paths without crashing the full system.

## API Overview
### Auth and Staff
- `/api/v1/auth/*`
- `/api/v1/staff/*`

### Business Modules
- Applicants: `/api/applicants/*`
- Loan applications: `/api/applications/*` and `/api/loan-applications/*`
- Credit score: `/api/credit-score/*`
- Risk assessments: `/api/risk-assessments/*`
- Recommendations: `/api/recommendations/*`
- Repayments: `/api/repayments/*`
- Reports: `/api/reports/*`

## How to Run Backend Locally
### Prerequisites
- Java 21
- Maven 3.9+
- MongoDB (local or Atlas)

### Commands (Windows)
```bash
cd microfinance-project/Microfinance-backend
copy .env.example .env
mvn clean install
mvn spring-boot:run
```

### Default Runtime
- Backend URL: `http://localhost:8080`

## Common Backend Errors and Fixes
### 1. Maven build failure
- Run `mvn clean install -U`
- Confirm Java version with `java -version`
- Confirm `JAVA_HOME` points to JDK 21

### 2. MongoDB connection failure
- Check `MONGODB_URI` in `.env`
- Verify Atlas IP whitelist or local MongoDB status
- Ensure credentials are valid and URL-encoded where required

### 3. Port 8080 already in use
- Inspect with: `netstat -ano | findstr :8080`
- Stop conflicting process: `taskkill /PID <PID> /F`
- Or run with another port using Spring arguments

### 4. AI service unavailable
- Start AI service first on port 8000
- Check backend AI URL configuration (`ai.service.url`)
- Validate AI health endpoint: `http://localhost:8000/health`

### 5. CORS or authentication errors
- Ensure frontend runs from allowed origin and sends bearer token
- Re-login to refresh token when expired

## Testing Notes
Backend test sources include:
- `RepaymentServiceTest`
- `RepaymentControllerTest`
- `RepaymentIntegrationTest`
- `TestMongoConfig`

Run tests:
```bash
cd microfinance-project/Microfinance-backend
mvn test
```
