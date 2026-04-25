# CONTRIBUTION SUMMARY

## Group Contribution Matrix (Final Report Appendix Template)

| Group Member | Software Module Contribution | AI and ML Contribution | Evidence and Example Work |
|---|---|---|---|
| Member 1 | Staff Management and Access Control | Contributed to role-aware data preparation for secure prediction workflows | Auth endpoints, role mapping, route protection, login flow validation |
| Member 2 | Applicant/Application Workflow | Ensured applicant and application fields align with AI request contract | Applicant registration/update, application lifecycle endpoints and UI pages |
| Member 3 | Loan Risk Assessment | Developed and integrated risk prediction flow and output mapping | Risk assessment module, `/predict-risk` integration, risk category handling |
| Member 4 | Loan Recommendation Engine | Developed recommendation logic integration and interpretation support | Recommendation module, `/predict-recommendation` flow, reasoning display |
| Member 5 | Repayment Schedule and Tracking | Used model outputs to support safer downstream repayment planning | Repayment schedule generation, payment recording, overdue processing |
| Member 6 | Reporting and Analytics Dashboard | Contributed explainability-aware reporting requirements | Dashboard/report pages, analytics endpoints, trend and performance displays |

Replace Member 1-6 with the official student names and IDs before final submission.

## Software Module Contribution Summary
### 1. Staff Management and Access Control
- JWT authentication implementation and usage.
- Role-based API and frontend navigation constraints.
- Password management and profile update support.

### 2. Applicant/Application Workflow
- Applicant registration, search, and profile updates.
- Loan application creation and status management.
- Operational linkage to risk and recommendation workflows.

### 3. Loan Risk Assessment
- Triggering backend risk workflows.
- Mapping backend data to AI risk contract.
- Persisting and presenting risk outputs.

### 4. Loan Recommendation Engine
- Recommendation generation and recalculation.
- Business-level recommendation updates and archival controls.
- UI representation for decision support.

### 5. Repayment Schedule and Tracking
- Schedule generation for approved loans.
- Payment recording and void workflows.
- Overdue and schedule closure operations.

### 6. Reporting and Analytics Dashboard
- Dashboard data retrieval and presentation.
- Template-based and filterable reporting support.
- Operational metrics for decision monitoring.

## AI and ML Contribution Summary
- Data preparation, feature engineering, model training, tuning, and evaluation scripts are present in `microfinance-ai/src`.
- Trained artifacts are maintained in `microfinance-ai/models`.
- FastAPI endpoints in `microfinance-ai/api/main.py` expose risk and recommendation inference.
- Backend AI integration is implemented through `AiServiceClient` in the Spring backend.

## Evidence Examples for Appendix
- Source folders and classes show module ownership boundaries.
- Backend controller/service structure demonstrates software module implementation.
- AI pipeline scripts and saved artifacts demonstrate ML lifecycle completion.
- API communication path confirms integrated end-to-end behavior.

## Final Submission Note
This summary is formatted for report appendix usage. Final member names, registration numbers, and commit/reference evidence should be inserted according to the official group submission record.
