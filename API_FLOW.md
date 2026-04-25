# API FLOW

## API Communication Summary
The system follows a layered communication architecture:

1. Frontend sends user-triggered requests to backend.
2. Backend validates authorization and business rules.
3. Backend calls AI service when prediction/recommendation is required.
4. AI service returns inference results to backend.
5. Backend persists and returns formatted response to frontend.

## End-to-End Path
```text
Frontend (React) -> Backend (Spring Boot) -> AI Service (FastAPI)
                                    <-
Frontend (React) <- Backend (Spring Boot) <- AI Response
```

## Example Flow: Risk Assessment
1. User opens risk assessment workflow in frontend.
2. Frontend calls backend risk endpoint (for example under `/api/risk-assessments/*`).
3. Backend loads applicant and application data.
4. Backend posts mapped payload to AI `/predict-risk`.
5. AI returns risk probability, category, decision, and explanation details.
6. Backend stores risk result and returns it to frontend.

## Example Flow: Recommendation
1. User requests recommendation generation in frontend.
2. Frontend calls backend recommendation endpoint (for example under `/api/recommendations/*`).
3. Backend sends request to AI `/predict-recommendation`.
4. AI returns recommended amount, term, rate, feasibility, and reasoning.
5. Backend updates recommendation records and responds to frontend.

## Example Flow: Repayment
1. User triggers repayment schedule generation or payment recording in frontend.
2. Frontend calls backend repayment endpoints under `/api/repayments/*`.
3. Backend updates repayment entities in MongoDB.
4. Backend returns schedule/history/payment status to frontend.

## Important Integration Note
In the current project source structure, frontend modules do not directly call AI service endpoints. AI communication is handled by backend service `AiServiceClient`, which is the recommended architecture for security and contract control.
