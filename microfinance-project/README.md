# Loan Application Management Component

## Student Details

- **Name:** Fernando W.P.S.
- **IT Number:** IT24103815
- **Project:** AI-Driven Microfinance Loan Risk Prediction and Recommendation System

---

## Responsible Component

**Applicant and Loan Application Workflow Management**

This branch contains the individual contribution for the **Loan Application Management Component** of the larger microfinance system. This component is responsible for managing the complete lifecycle of applicants and their loan applications.

---

## Module/Workflow Scope

This component covers the following functionalities:

### Core Features
- **Applicant Management**
  - Register new applicants
  - View applicant details and profiles
  - Update applicant information
  - Soft-delete applicants (logical deletion)

- **Loan Application Management**
  - Create new loan applications
  - View all applications with comprehensive details
  - Edit loan application information
  - Cancel loan applications
  - Status tracking throughout the application lifecycle

- **Workflow Management**
  - Application status transitions (Pending → Approved → Active → Completed/Cancelled)
  - Status history tracking (audit trail of all status changes)
  - Optional custom loan proposal generation
  - Search, filter, and pagination for applications and applicants

---

## Included Backend Areas

### Controllers
- `LoanApplicationController` - REST API endpoints for loan application CRUD and status management
- `ApplicantController` - REST API endpoints for applicant registration and management
- `RepaymentController` - REST API endpoints for repayment tracking and payment recording

### Services
- `LoanApplicationService` - Business logic for loan application workflows
- `ApplicantService` - Business logic for applicant management and lifecycle
- `RepaymentService` - Business logic for repayment schedules and payment processing

### Models/Entities
- `LoanApplication` - Core entity representing a loan application
- `Applicant` - Core entity representing an applicant
- `RepaymentInstallment` - Repayment schedule entity
- `RepaymentPayment` - Individual payment records
- `StatusHistoryEntry` - Status change audit trail
- `LoanStatus` (Enum) - Application status values
- `RepaymentStatus` (Enum) - Payment status values
- `PaymentRecordStatus` (Enum) - Payment record states

### Repositories (Data Access Layer)
- `LoanApplicationRepository` - Database queries for loan applications
- `ApplicantRepository` - Database queries for applicants
- `RepaymentInstallmentRepository` - Database queries for repayment schedules
- `RepaymentPaymentRepository` - Database queries for payment records

### Data Transfer Objects (DTOs)
- **Request DTOs:** `LoanApplicationRequest`, `ApplicantRequest`, `ApplicantRegistrationRequest`, `StatusUpdateRequest`, `RecordRepaymentRequest`, `LoanRiskPredictionRequest`
- **Response DTOs:** `ApplicationDetailsResponse`, `ApplicantRegistrationResponse`, `ApplicantLookupResponse`, `LoanRiskPredictionResponse`, `UpdateRepaymentPaymentRequest`, `VoidRepaymentPaymentRequest`

### Utilities & Configuration
- `RepaymentConstants` - Shared constants for repayment calculations
- `application.properties` - Database and server configuration

### Tests
- `RepaymentServiceTest` - Unit tests for repayment service
- `RepaymentControllerTest` - Integration tests for repayment API endpoints

---

## Included Frontend Areas

### Pages/Components
- `ApplicantsPage.jsx` - Display list of applicants with search, filter, and pagination
- `ApplicationsPage.jsx` - Display list of loan applications with status and filters
- `ApplicationDetailsPage.jsx` - Detailed view and editing of loan application information
- `RepaymentPage.jsx` - Repayment tracking and payment recording interface
- `PaymentHistoryPage.jsx` - Payment transaction history display

### Services
- `repaymentService.js` - Frontend business logic for repayment operations
- `profileService.js` - Frontend business logic for applicant profile management
- `apiService.js` - Core API communication and HTTP utilities

### API Clients
- `applicationsApi.js` - API client for loan application endpoints
- `applicantsApi.js` - API client for applicant endpoints
- `http.js` - HTTP client configuration
- `client.js` - Axios/HTTP client setup

### Shared Components
- `GradientSummaryCard.jsx` - Reusable UI component for displaying summary information
- `AuthContext.jsx` - Authentication context for role-based access

---

## Important Note

⚠️ **This branch represents an individual contribution only and is NOT a standalone runnable system.**

This component is part of a larger AI-Driven Microfinance system and depends on:
- Shared authentication and configuration
- Database connectivity
- REST API infrastructure
- Other system modules for complete functionality

**The full, runnable system resides in the main group project repository.**

---

## Branch Purpose

This branch is created for:
- ✅ Demonstrating individual responsibility and contribution
- ✅ Code review and evaluation of the Loan Application Management Component
- ✅ Version control of component-specific changes
- ✅ Clear separation of individual work within the team project

---

## Integration Note

When integrated into the main system, this component works alongside:
- Risk Assessment Module (credit scoring and risk analysis)
- Recommendation Engine (loan proposals and recommendations)
- Reporting Module (analytics and reports)
- Staff Management Module (internal user administration)
- Payment Processing Module (full repayment lifecycle)

---

## Files Included

**Total Files:** 52 (39 Backend + 13 Frontend)

See `files-to-commit.txt` for the complete file listing.

---

## Development Information

- **Backend Framework:** Spring Boot (Java)
- **Frontend Framework:** React with Vite
- **Database:** MongoDB
- **Architecture:** Layered Architecture (Controller → Service → Repository → Entity)

---

*This README represents the scope and responsibility of the Loan Application Management Component within the AI-Driven Microfinance system.*
