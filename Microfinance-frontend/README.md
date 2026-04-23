# Microfinance Staff Management Frontend

This is a React + Vite frontend for the **Staff Management & Access Control** module.

## Included features
- Create staff account
- View all staff from Spring Boot API
- Update role / branch / address
- Deactivate staff account
- Permanently delete staff account
- Change password
- Search staff directory
- Manual API base URL + JWT token input
- Manual current UI role selector for button visibility testing

## Project structure
- `src/components/StaffManagement.jsx` - main page
- `src/services/staffService.js` - API calls
- `src/App.jsx` - app entry
- `src/main.jsx` - React bootstrap

## Run locally
```bash
npm install
npm run dev
```

## Default backend URL
```text
http://localhost:8080/api/v1/staff
```

You can change it from the settings section at the top of the page.

## Important backend note
Your backend password endpoint currently requires:
```json
{
  "currentPassword": "...",
  "newPassword": "..."
}
```
That works for self-password change, but for admin reset you should later add a dedicated reset-password endpoint.

## Recommended backend DTO
```java
@Data
public class PasswordUpdateRequest {
    @NotBlank
    private String currentPassword;

    @NotBlank
    @Size(min = 6)
    private String newPassword;
}
```
