# FINAL PROJECT OVERVIEW

## End-to-End System Narrative
This system supports the full microfinance lending lifecycle through a connected frontend, backend, and AI inference service. It begins with secure staff login and continues through applicant onboarding, application creation, risk and recommendation analysis, loan decision support, repayment tracking, and management reporting.

## End-to-End Workflow
### 1. Staff Login
- Staff member logs in through the frontend login page.
- Backend validates credentials and returns JWT token.
- Access permissions are applied based on role.

### 2. Applicant Management
- Staff registers or updates applicant details.
- Applicant profile data is stored in MongoDB.
- Applicant records are searchable for future applications.

### 3. Loan Application
- Staff creates loan application linked to applicant profile.
- Loan amount, purpose, and term details are captured.
- Application status is managed through backend workflow endpoints.

### 4. Risk Assessment
- Backend triggers risk assessment flow for a selected application.
- Backend sends mapped applicant/application features to AI service.
- AI service returns risk probability, risk category, and explanation.

### 5. Recommendation
- Backend requests recommendation from AI service.
- AI returns recommended loan amount, term, and interest guidance.
- Backend stores recommendation for decision support and tracking.

### 6. Approval or Rejection Decision
- Authorized staff (based on role) reviews application plus AI outputs.
- Decision is recorded in system status and history.
- Workflow continues to repayment stage for approved cases.

### 7. Repayment Schedule and Tracking
- Repayment schedule is generated for approved applications.
- Payments are recorded and historical transactions are retained.
- Overdue processing and status updates are handled by repayment module.

### 8. Reporting Dashboard
- Dashboard and reporting module provide summaries and trends.
- Operational users review portfolio health, repayment behavior, and risk distribution.

## Group Member Module Distribution (Template)
| Group Member | Primary Module Responsibility |
|---|---|
| Member 1 | Staff Management and Access Control |
| Member 2 | Applicant and Application Workflow |
| Member 3 | Loan Risk Assessment |
| Member 4 | Loan Recommendation Engine |
| Member 5 | Repayment Schedule and Tracking |
| Member 6 | Reporting and Analytics Dashboard |

Replace member identifiers with actual names according to your submission sheet.

## AI and ML Role in Simple Terms
The AI component acts as a decision-support engine. It analyzes applicant and loan details using trained models and returns risk and recommendation outputs that help staff make more informed decisions. Final authority remains with human staff roles.

## Practical Value for Microfinance Institutions
- Speeds up processing time from application intake to recommendation.
- Improves consistency in risk assessment.
- Supports fairer decisions through standardized analysis.
- Reduces operational risk by highlighting higher-risk applications early.
- Improves repayment monitoring and portfolio visibility.

## Why This System Enables Faster, Fairer, and Safer Lending
- Faster: automated workflows and API integration reduce manual delay.
- Fairer: structured data fields and consistent AI scoring reduce ad hoc judgment.
- Safer: role controls, risk classification, and repayment tracking strengthen governance.
