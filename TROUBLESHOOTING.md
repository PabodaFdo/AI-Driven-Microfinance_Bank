# TROUBLESHOOTING GUIDE

## 1. ZIP Extraction Issues
### Symptom
- Project folders appear incomplete after extraction.
- Missing files such as `pom.xml`, `package.json`, or `api/main.py`.

### Fix
1. Re-download the ZIP file.
2. Extract using a reliable tool (Windows built-in extractor or 7-Zip).
3. Ensure extraction path is short and writable.
4. Confirm required folders exist before running commands.

## 2. `node_modules` Corruption
### Symptom
- Frontend fails with missing package errors.

### Fix (Windows Command Prompt)
```bash
cd microfinance-project\Microfinance-frontend
rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
npm cache clean --force
npm install
```

## 3. Frontend `npm install` Errors
### Common Causes
- Network interruption
- Corrupted npm cache
- Node version mismatch

### Fix
```bash
node -v
npm -v
npm cache clean --force
npm install
```
If version mismatch persists, install a compatible Node.js LTS version and retry.

## 4. Backend Maven Errors
### Symptom
- Dependency resolution or compilation failures.

### Fix
```bash
cd microfinance-project\Microfinance-backend
java -version
mvn -v
mvn clean install -U
```
Ensure Java 21 is active and `JAVA_HOME` points to JDK 21.

## 5. Port Already in Use
### Check and Release Port
```bash
netstat -ano | findstr :8000
netstat -ano | findstr :8080
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```
Then restart the affected service.

## 6. AI Service Uvicorn Import Errors
### Symptom
- `Error loading ASGI app. Could not import module "main"`

### Cause
- Running command from wrong module path.

### Correct Fix
`main.py` is located in `api/`, so run:
```bash
cd microfinance-ai
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

## 7. Database Connection Errors
### Symptom
- Backend cannot connect to MongoDB.

### Fix
1. Verify `.env` exists in backend folder.
2. Set valid `MONGODB_URI`.
3. For Atlas, whitelist your IP and verify credentials.
4. For local MongoDB, ensure local server is running.

## 8. CORS and API Connection Errors
### Symptom
- Browser shows CORS errors or API request failures.

### Fix
1. Ensure backend is running on `http://localhost:8080`.
2. Ensure frontend is running on `http://localhost:5173`.
3. Confirm frontend API base URLs point to backend.
4. Re-login to refresh JWT token if unauthorized.

## 9. Service Startup Order Issues
### Symptom
- Risk and recommendation requests fail while core UI loads.

### Fix
Start services in this order:
1. AI service (`8000`)
2. Backend (`8080`)
3. Frontend (`5173`)

## 10. Environment-Specific Values
If any path, credential, or port differs on your machine, set values according to local environment and restart services after changes.
