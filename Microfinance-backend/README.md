# Staff Backend (Spring Boot + MongoDB)

This backend is built to match your staff frontend API calls.

## Tech Stack
- Spring Boot 3.5.x
- Spring Security + JWT
- Spring Data MongoDB
- Maven

## Project Path
- `staff-backend`

## Default Configuration
File: `src/main/resources/application.properties`

- MongoDB URI: `mongodb://localhost:27017/microfinance_db`
- Port: `8080`
- JWT secret and expiry configured with:
  - `app.jwt.secret`
  - `app.jwt.expiration-ms`

## Seeded Login User
On first run, an admin account is created automatically:

- Email: `admin@microfinance.lk`
- Password: `password123`
- Role: `admin`

## API Endpoints
### Auth
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

### Staff
- `GET /api/v1/staff`
- `POST /api/v1/staff`
- `PUT /api/v1/staff/{id}`
- `DELETE /api/v1/staff/{id}?reason=...`
- `DELETE /api/v1/staff/{id}/remove`
- `PUT /api/v1/staff/{id}/password`

All staff endpoints require `Authorization: Bearer <token>`.

## Run
1. Make sure MongoDB is running locally.
2. Install Maven (or use Maven Wrapper if you add it).
3. Run:

```bash
mvn spring-boot:run
```

If Maven is not installed on your machine, install Maven first and restart terminal.

## Frontend Connection
In frontend API base, use:

- `http://localhost:8080/api/v1/staff`

For login, call:

- `POST http://localhost:8080/api/v1/auth/login`
