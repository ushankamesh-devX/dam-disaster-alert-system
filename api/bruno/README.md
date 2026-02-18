# Bruno API Testing Collection

This folder contains Bruno API test collections for the Dam Disaster Alert System (DDAS) API.

## Prerequisites

1. Install [Bruno](https://www.usebruno.com/) - Open-source API client
2. Ensure the API server is running on `http://localhost:8080`

## Getting Started

### 1. Open Collection in Bruno

1. Open Bruno application
2. Click "Open Collection"
3. Navigate to and select this `bruno` folder
4. The collection "DDAS API" will be loaded

### 2. Select Environment

1. Click on the environment dropdown (top-right)
2. Select "local" environment
3. The `base_url` is set to `http://localhost:8080/api/v1`

## API Endpoints Overview

### Health Check
- **GET** `/health` - Check API health status

### Authentication (Auth)
- **POST** `/auth/register` - Register a new user
- **POST** `/auth/login` - Login user
- **GET** `/auth/test` - Test authentication module

### Users
- **GET** `/users/me` - Get current authenticated user (requires token)
- **GET** `/users` - Get all users (requires token)
- **GET** `/users/{id}` - Get user by ID (requires token)

## Testing Flow

### Step 1: Health Check
Run the "Health Check" request to ensure the API is up and running.

### Step 2: Register a User
1. Open "Auth" → "Register User"
2. Modify the request body if needed
3. Click "Send"
4. The token will be automatically saved to the environment variable `auth_token`

### Step 3: Login
1. Open "Auth" → "Login User"
2. Use the same credentials from registration
3. Click "Send"
4. The token will be automatically saved

### Step 4: Test Protected Endpoints
Now you can test the protected endpoints under "Users" folder:
- Get Current User
- Get All Users
- Get User By ID

The `auth_token` will be automatically included in the Authorization header.

## Environment Variables

- `base_url`: Base URL of the API (default: `http://localhost:8080/api/v1`)
- `auth_token`: JWT token (automatically set after login/register)

## Sample User Data

```json
{
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+94771234567",
  "password": "SecurePass123!",
  "languagePreference": "en"
}
```

## Notes

- All Bruno test requests automatically save the JWT token after successful login/register
- Protected endpoints require authentication token
- Change the sample data in requests as needed
- Tests are included in each request to validate responses

## Folder Structure

```
bruno/
├── bruno.json                     # Collection metadata
├── environments/
│   └── local.bru                  # Local environment variables
├── Health/
│   └── Health Check.bru           # Health check endpoint
├── Auth/
│   ├── Register User.bru          # User registration
│   ├── Login User.bru             # User login
│   └── Auth Test.bru              # Auth test endpoint
└── Users/
    ├── Get Current User.bru       # Get authenticated user
    ├── Get All Users.bru          # Get all users
    └── Get User By ID.bru         # Get user by ID
```

