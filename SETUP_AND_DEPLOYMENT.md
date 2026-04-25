# Project Setup & Deployment Guide

## Quick Start

### Prerequisites
- Java 21+
- Node.js 18+
- MongoDB (local or Atlas)
- Git

### 1. Clone & Install

```bash
# Backend dependencies (automatic with Maven)
cd microfinance-project/Microfinance-backend
mvn clean install

# Frontend dependencies
cd ../Microfinance-frontend
npm install
```

### 2. Environment Setup

Create `.env` file in `microfinance-project/Microfinance-backend/`:

```env
# Use .env.example as template
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/microfinance_db
```

### 3. Run Development Servers

**Backend** (Terminal 1):
```bash
cd microfinance-project/Microfinance-backend
mvn spring-boot:run
# Runs on http://localhost:8080
```

**Frontend** (Terminal 2):
```bash
cd microfinance-project/Microfinance-frontend
npm run dev
# Runs on http://localhost:5173
```

## Build for Production

### Backend
```bash
cd microfinance-project/Microfinance-backend
mvn clean package
java -jar target/staff-backend-0.0.1-SNAPSHOT.jar
```

### Frontend
```bash
cd microfinance-project/Microfinance-frontend
npm run build
# Output: dist/ directory ready for deployment
```

## Project Structure

```
microfinance-project/
├── Microfinance-backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/microfinance/     # Java source
│   │   │   └── resources/                 # Config files
│   │   └── test/                          # Unit & integration tests
│   ├── pom.xml                            # Maven config
│   └── README.md                          # Backend docs
├── Microfinance-frontend/
│   ├── src/
│   │   ├── components/                    # React components
│   │   ├── pages/                         # Page components
│   │   ├── services/                      # API services
│   │   └── utils/                         # Helpers & utilities
│   ├── package.json                       # NPM config
│   └── vite.config.js                     # Vite config
├── setup/                                 # Initialization scripts
└── README.md                              # This project
```

## Key Features

✅ **Authentication**: JWT-based with Spring Security
✅ **Database**: MongoDB with Spring Data
✅ **Frontend**: React 18 with Vite bundler
✅ **AI Integration**: Loan recommendations & risk scoring
✅ **RBAC**: Role-based access control (Admin, Staff, Applicant)
✅ **Analytics**: Charts.js for data visualization
✅ **Responsive**: Works on desktop and mobile

## Testing

### Backend Tests
```bash
cd microfinance-project/Microfinance-backend
mvn test
```

### Frontend Tests
```bash
cd microfinance-project/Microfinance-frontend
npm test  # if configured
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 8080 in use | Change `SERVER_PORT` in `.env` |
| Port 5173 in use | Vite will auto-increment port |
| MongoDB connection fails | Check `.env` URI format and IP whitelisting |
| Frontend build too large | Consider code-splitting in `vite.config.js` |
| Tests fail | Ensure MongoDB test instance is running |

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/description

# Make changes and commit
git add .
git commit -m "Description of changes"

# Push to origin
git push origin feature/description

# Create pull request on GitHub
```

## Performance Notes

- **Frontend Bundle**: ~1.3MB (minified, warnings about size - consider code-splitting)
- **Backend Startup**: ~3-5 seconds
- **Database**: Uses MongoDB Atlas for cloud deployment

## Security Checklist

- [ ] `.env` file is in `.gitignore` (never commit credentials)
- [ ] JWT secret is strong in production
- [ ] MongoDB connections use TLS
- [ ] Frontend CORS configured properly
- [ ] RBAC rules enforced in backend
- [ ] Sensitive data not logged

## Deployment

### Local Development
Both services run on localhost (backend: 8080, frontend: 5173)

### Docker (Optional)
Create `Dockerfile` in root and `docker-compose.yml` for containerization

### Cloud (AWS/GCP/Azure)
- Backend: Deploy JAR to EC2/App Engine/App Service
- Frontend: Deploy `dist/` to S3/Cloud Storage/Static hosting
- MongoDB: Use managed Atlas service

## Support & Resources

- Backend: Spring Boot [docs](https://spring.io/projects/spring-boot)
- Frontend: React [docs](https://react.dev)
- Database: MongoDB [docs](https://docs.mongodb.com)
- Build: Maven [docs](https://maven.apache.org) & Vite [docs](https://vitejs.dev)

## Version Info

- Java: 21
- Spring Boot: 3.5.12
- React: 18.3.1
- Node.js: 18+
- MongoDB: Latest

## License

Proprietary - Microfinance AI Integration Project
