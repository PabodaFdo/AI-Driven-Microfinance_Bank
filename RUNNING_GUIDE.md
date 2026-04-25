# RUNNING GUIDE (Windows)

## Required Software
Install the following before running the system:
- Java 21 (JDK)
- Maven 3.9+
- Node.js 18+ and npm
- Python 3.8+
- MongoDB (local installation) or MongoDB Atlas connection

## Recommended Startup Order
1. AI service
2. Backend
3. Frontend

## Step-by-Step Local Run

### Step 1: Start AI Service
Open Terminal 1:
```bash
cd "c:\Users\saths\Desktop\Sliit\2nd year\2nd 2nd sem\IT2021-AIML\AIML Integrated\microfinance-ai"
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Expected:
- Service available on `http://localhost:8000`
- Health endpoint: `http://localhost:8000/health`

### Step 2: Start Backend
Open Terminal 2:
```bash
cd "c:\Users\saths\Desktop\Sliit\2nd year\2nd 2nd sem\IT2021-AIML\AIML Integrated\microfinance-project\Microfinance-backend"
copy .env.example .env
mvn clean install
mvn spring-boot:run
```

Expected:
- Backend available on `http://localhost:8080`

Database note:
- Set `MONGODB_URI` in `.env` according to local environment.

### Step 3: Start Frontend
Open Terminal 3:
```bash
cd "c:\Users\saths\Desktop\Sliit\2nd year\2nd 2nd sem\IT2021-AIML\AIML Integrated\microfinance-project\Microfinance-frontend"
npm install
npm run dev
```

Expected:
- Frontend available on `http://localhost:5173`

## Ports Used
- AI service: `8000`
- Backend: `8080`
- Frontend: `5173`

## How to Confirm Each Service Is Running
### AI
```bash
curl http://localhost:8000/health
```

### Backend
```bash
curl http://localhost:8080/api/v1/auth/me
```
Expected: unauthorized response if no token, which confirms backend is running.

### Frontend
- Open browser at `http://localhost:5173`
- Login page should load.

## Functional Test Sequence
1. Login to frontend.
2. Open applicants/applications pages.
3. Trigger risk assessment from application workflow.
4. Trigger recommendation generation.
5. Create repayment schedule and record a payment.
6. Open reports page and verify dashboard responses.

## Troubleshooting Quick Actions
- If dependency installation fails, rerun package installs with clean cache.
- If a port is busy, identify and stop conflicting process.
- If backend cannot connect to MongoDB, verify `.env` credentials.
- If risk/recommendation fails, verify AI service is active on port 8000.
- If API calls fail from frontend, verify backend availability and token status.
