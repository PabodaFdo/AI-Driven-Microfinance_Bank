# Microfinance Frontend Documentation

## Frontend Purpose
`Microfinance-frontend` provides the user interface for staff to perform day-to-day loan operations, including authentication, applicant/application management, risk and recommendation views, repayment handling, and reporting.

## Technology Stack (Detected from `package.json`)
- React 18.3.1
- Vite 5.4.8
- Axios 1.13.5
- React Router DOM 6.26.2
- Chart.js 4.4.7 + react-chartjs-2 5.2.0
- Lucide React
- jsPDF + html2canvas

## React and Vite Architecture
- App entry and route structure is managed in `src/App.jsx`.
- Development server is configured in `vite.config.js` on port `5173`.
- API calls are sent to backend endpoints on `http://localhost:8080` using Axios clients and service modules.

## Main Pages and Modules
- Login, forgot-password, reset-password, change-password
- Dashboard page
- Applicants and applications pages
- Application details view
- Risk assessment page
- Recommendation engine page
- Repayment and payment history pages
- Reports page (including templates and viewers)
- Staff management (role-restricted)
- Profile and unauthorized pages

## Role-Based Navigation
Navigation in `App.jsx` applies role filtering for:
- `ADMIN`
- `LOAN_OFFICER`
- `BANK_MANAGER`

`ProtectedRoute` is used to enforce authenticated access and role constraints for sensitive modules.

## API Connection Setup
### Current Source Behavior
Frontend service files use backend base addresses such as:
- `http://localhost:8080`
- `http://localhost:8080/api/v1`

### Recommended Environment Configuration
If your local environment requires different URLs, configure according to local environment and update frontend API configuration consistently.

## How to Run Frontend Locally
### Prerequisites
- Node.js (18+ recommended)
- npm
- Backend service running on port 8080

### Commands (Windows)
```bash
cd microfinance-project/Microfinance-frontend
npm install
npm run dev
```

### Runtime URL
- Frontend: `http://localhost:5173`

## Common Frontend Errors and Fixes
### 1. Dependency installation issues
```bash
cd microfinance-project/Microfinance-frontend
npm cache clean --force
rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
npm install
```

### 2. `node_modules` corruption
- Remove `node_modules` and reinstall packages as shown above.

### 3. Port conflict on 5173
- Check process with `netstat -ano | findstr :5173`
- Stop conflicting process: `taskkill /PID <PID> /F`
- Restart with `npm run dev`

### 4. Backend API connection errors
- Confirm backend is running at `http://localhost:8080`
- Confirm login token is present after authentication
- Re-login if token expired

### 5. CORS or network errors
- Ensure backend CORS configuration is active
- Ensure frontend and backend are both running
- Verify endpoint path consistency (`/api/v1/*` and `/api/*` usage)

## Build and Preview
```bash
cd microfinance-project/Microfinance-frontend
npm run build
npm run preview
```

## Notes for Final Submission
Frontend UI and modules are designed to work through backend APIs. AI behavior is accessed through backend endpoints and is not directly invoked by frontend source in the current project structure.
