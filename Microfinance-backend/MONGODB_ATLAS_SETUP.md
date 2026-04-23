# MongoDB Atlas Setup Guide

## Overview
This project is now configured to use MongoDB Atlas instead of a local MongoDB instance. The connection string is externalized via environment variables to prevent credential leakage.

## Configuration

### Current Setup
- **File**: `src/main/resources/application.properties`
- **Property**: `spring.data.mongodb.uri=${MONGODB_URI:mongodb://localhost:27017/microfinance_db}`
- **Fallback**: If `MONGODB_URI` environment variable is not set, falls back to local MongoDB

### How It Works
1. The application reads the `MONGODB_URI` environment variable at startup
2. If the variable is not set, it defaults to local MongoDB (development/testing)
3. No credentials are hardcoded in configuration files

## Setting Up MongoDB Atlas

### Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up or log in with your account
3. Create a new project

### Step 2: Create a Cluster
1. Click "Create" to build a new cluster
2. Choose your tier (M0 Free Tier is sufficient for development)
3. Select your cloud provider and region
4. Create the cluster (takes ~3-5 minutes)

### Step 3: Create Database User
1. Navigate to **Database Access** in the left sidebar
2. Click **Add New Database User**
3. Set **Username**: Choose a secure username (e.g., `microfinance_user`)
4. Set **Password**: MongoDB will auto-generate or you can create one (SAVE THIS!)
5. Click **Add User**

### Step 4: Configure Network Access
1. Navigate to **Network Access** in the left sidebar
2. Click **Add IP Address**
3. Either:
   - Click **Add Current IP Address** (your machine's IP)
   - OR click **Allow Access from Anywhere** (0.0.0.0/0) for development
4. Click **Confirm**

**Note**: For production, always whitelist specific IPs instead of allowing all IPs.

### Step 5: Get Connection String
1. Go to your cluster page
2. Click **Connect**
3. Choose **Drivers** (not MongoDB Compass)
4. Select **Java** if prompted for driver
5. Copy the connection string

**Format**:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database_name?appName=Cluster0
```

### Step 6: Set Environment Variable

#### For Local Development (Linux/macOS):
```bash
export MONGODB_URI="mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/microfinance_db?appName=Cluster0"
```

#### For Local Development (Windows PowerShell):
```powershell
$env:MONGODB_URI = "mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/microfinance_db?appName=Cluster0"
```

#### For Local Development (Windows CMD):
```cmd
set MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/microfinance_db?appName=Cluster0
```

#### For Spring Boot Application (IDE):
1. Open Run Configurations in your IDE
2. Add the environment variable:
   - Key: `MONGODB_URI`
   - Value: Your MongoDB Atlas connection string
3. Run the application

#### For Docker:
```dockerfile
ENV MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/microfinance_db?appName=Cluster0
```

#### For Deployment (e.g., Heroku, AWS, Azure):
Set the environment variable in your deployment platform's configuration.

## Important Notes

### URL Encoding Special Characters
If your password contains special characters, you **must URL-encode** them:
- `@` becomes `%40`
- `#` becomes `%23`
- `:` becomes `%3A`
- `/` becomes `%2F`
- `?` becomes `%3F`

Example:
```
Password: my@pass#word
Encoded: my%40pass%23word
```

### Database Name
The database name in the connection string (e.g., `microfinance_db`) will be created automatically by MongoDB Atlas when the application first connects.

### Compatibility
- All existing MongoDB operations work unchanged
- `@Document` annotations work with Atlas
- Repository methods work as-is
- No code changes required in Java classes

## Verification

### Test the Connection
1. Set the `MONGODB_URI` environment variable
2. Run the Spring Boot application: `mvn spring-boot:run`
3. Check logs for successful connection:
   ```
   Spring Data MongoDB is configured with URL 'mongodb+srv://...'
   ```
4. Test an API endpoint (e.g., GET `/api/staff`)
5. The response should work without errors

### Local Fallback
If you want to test locally without MongoDB Atlas:
- Simply **don't set** the `MONGODB_URI` environment variable
- The application will automatically use `mongodb://localhost:27017/microfinance_db`
- Start local MongoDB: `mongod`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection timeout | Check MongoDB Atlas Network Access - ensure your IP is whitelisted |
| Authentication failed | Verify username/password are correct and not URL-encoded in the wrong place |
| Connection refused | Ensure MONGODB_URI environment variable is set and visible to the application |
| Database not found | Database will auto-create on first connection attempt |
| SSL certificate error | Ensure `?appName=Cluster0` is in your connection string |

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for sensitive configuration
3. **Rotate passwords** regularly through MongoDB Atlas
4. **Whitelist specific IPs** in production (not 0.0.0.0/0)
5. **Use strong passwords** for database users
6. **Enable two-factor authentication** on your MongoDB Atlas account
7. **Review audit logs** in MongoDB Atlas for suspicious activity

## Rolling Back to Local MongoDB

If you need to switch back to local MongoDB:
1. Don't set the `MONGODB_URI` environment variable
2. Ensure local MongoDB (`mongod`) is running
3. The fallback value will automatically use `mongodb://localhost:27017/microfinance_db`
