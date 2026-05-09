# API Endpoints Documentation - Dam Disaster Alert System

Complete reference for all API endpoints available in the Dam Disaster Alert System. This document covers authentication, dams, sensors, alerts, users, and other core functionality.

## Table of Contents

1. [Base URL](#base-url)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Error Handling](#error-handling)
5. [Endpoints](#endpoints)
   - [Authentication Endpoints](#authentication-endpoints)
   - [Dam Endpoints](#dam-endpoints)
   - [Sensor Endpoints](#sensor-endpoints)
   - [Alert Endpoints](#alert-endpoints)
   - [User Endpoints](#user-endpoints)
   - [Report Endpoints](#report-endpoints)
   - [System Endpoints](#system-endpoints)

## Base URL

```
http://localhost:8080/api
```

For production environments, replace `localhost:8080` with your deployment domain.

## Authentication

Most API endpoints require authentication using JWT (JSON Web Tokens). Include the token in the request header:

```
Authorization: Bearer <your_jwt_token>
```

### Obtaining a Token

See [Authentication Endpoints](#authentication-endpoints) section for login details.

### Token Expiration

- Default token expiration: 24 hours
- Refresh token expiration: 7 days
- Request a new token using the refresh endpoint when expired

## Response Format

All responses follow a consistent format:

### Success Response (2xx)

```json
{
  "success": true,
  "data": {
    // Response payload
  },
  "message": "Operation completed successfully"
}
```

### Error Response (4xx, 5xx)

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Detailed error message",
    "details": {
      // Additional error details
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 204 | No Content | Request succeeded, no content to return |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required or failed |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists or conflict |
| 500 | Server Error | Internal server error |

### Common Error Codes

- `INVALID_CREDENTIALS` - Wrong username or password
- `TOKEN_EXPIRED` - JWT token has expired
- `UNAUTHORIZED` - Not authenticated
- `FORBIDDEN` - Insufficient permissions
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `VALIDATION_ERROR` - Input validation failed
- `SERVER_ERROR` - Internal server error

## Endpoints

### Authentication Endpoints

#### Login

**POST** `/auth/login`

Authenticate user and receive JWT token.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER"
    }
  }
}
```

**Error** (401 Unauthorized):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

---

#### Register

**POST** `/auth/register`

Create a new user account.

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "+1234567890"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 2,
    "email": "newuser@example.com",
    "name": "John Doe",
    "role": "USER"
  },
  "message": "User created successfully"
}
```

---

#### Refresh Token

**POST** `/auth/refresh`

Get a new access token using refresh token.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

---

#### Logout

**POST** `/auth/logout`

Invalidate user session and tokens.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Dam Endpoints

#### Get All Dams

**GET** `/dams`

Retrieve list of all dams with pagination support.

**Query Parameters**:
- `page`: Page number (default: 0)
- `size`: Results per page (default: 20, max: 100)
- `region`: Filter by region ID
- `status`: Filter by status (ACTIVE, INACTIVE, MAINTENANCE)

**Example**:
```
GET /api/dams?page=0&size=10&region=1&status=ACTIVE
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 1,
        "name": "Grand Canyon Dam",
        "location": "Arizona, USA",
        "latitude": 36.0544,
        "longitude": -112.8783,
        "capacity": 26134000000,
        "currentLevel": 19600000000,
        "status": "ACTIVE",
        "region": {
          "id": 1,
          "name": "Arizona Region"
        },
        "lastUpdated": "2024-01-15T10:30:00Z"
      }
    ],
    "totalElements": 45,
    "totalPages": 5,
    "currentPage": 0
  }
}
```

---

#### Get Dam Details

**GET** `/dams/{damId}`

Retrieve detailed information about a specific dam.

**Path Parameters**:
- `damId`: Dam identifier (e.g., 1)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Grand Canyon Dam",
    "description": "Major hydroelectric facility",
    "location": "Arizona, USA",
    "latitude": 36.0544,
    "longitude": -112.8783,
    "capacity": 26134000000,
    "currentLevel": 19600000000,
    "maxLevel": 26134000000,
    "minLevel": 9000000000,
    "status": "ACTIVE",
    "constructionYear": 1936,
    "region": {
      "id": 1,
      "name": "Arizona Region"
    },
    "sensors": [
      {
        "id": 1,
        "type": "WATER_LEVEL",
        "location": "Main Gate",
        "status": "OPERATIONAL"
      }
    ],
    "alerts": [
      {
        "id": 1,
        "type": "HIGH_WATER_LEVEL",
        "severity": "WARNING",
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

---

#### Create Dam

**POST** `/dams`

Create a new dam record (Admin only).

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "name": "New Dam",
  "location": "Location details",
  "latitude": 35.0,
  "longitude": -110.0,
  "capacity": 20000000000,
  "maxLevel": 20000000000,
  "minLevel": 5000000000,
  "regionId": 1,
  "constructionYear": 2020
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 46,
    "name": "New Dam",
    "status": "ACTIVE"
  },
  "message": "Dam created successfully"
}
```

---

#### Update Dam

**PUT** `/dams/{damId}`

Update dam information (Admin only).

**Request Body**:
```json
{
  "name": "Updated Dam Name",
  "status": "MAINTENANCE"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Updated Dam Name",
    "status": "MAINTENANCE"
  },
  "message": "Dam updated successfully"
}
```

---

#### Delete Dam

**DELETE** `/dams/{damId}`

Remove a dam from the system (Admin only).

**Response** (204 No Content)

---

### Sensor Endpoints

#### Get Dam Sensors

**GET** `/dams/{damId}/sensors`

Retrieve all sensors for a specific dam.

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "damId": 1,
      "type": "WATER_LEVEL",
      "location": "Main Gate",
      "status": "OPERATIONAL",
      "lastReading": 19600000000,
      "lastUpdated": "2024-01-15T10:30:00Z",
      "deviceKey": "SENSOR_001"
    },
    {
      "id": 2,
      "damId": 1,
      "type": "PRESSURE",
      "location": "North Wall",
      "status": "OPERATIONAL",
      "lastReading": 5420,
      "lastUpdated": "2024-01-15T10:30:00Z",
      "deviceKey": "SENSOR_002"
    }
  ]
}
```

---

#### Get Sensor Readings

**GET** `/sensors/{sensorId}/readings`

Retrieve sensor readings with time-based filtering.

**Query Parameters**:
- `startDate`: ISO 8601 format (e.g., 2024-01-01T00:00:00Z)
- `endDate`: ISO 8601 format (e.g., 2024-01-15T23:59:59Z)
- `limit`: Number of readings to return (default: 100, max: 1000)

**Example**:
```
GET /api/sensors/1/readings?startDate=2024-01-01T00:00:00Z&endDate=2024-01-15T23:59:59Z&limit=50
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1001,
      "sensorId": 1,
      "value": 19600000000,
      "unit": "cubic_meters",
      "timestamp": "2024-01-15T10:30:00Z",
      "status": "VALID"
    },
    {
      "id": 1002,
      "sensorId": 1,
      "value": 19602000000,
      "unit": "cubic_meters",
      "timestamp": "2024-01-15T10:35:00Z",
      "status": "VALID"
    }
  ]
}
```

---

#### Submit Sensor Data

**POST** `/sensors/{sensorId}/readings`

Submit new sensor reading (IoT device).

**Headers**:
```
X-Device-Key: <device_key>
Content-Type: application/json
```

**Request Body**:
```json
{
  "value": 19605000000,
  "unit": "cubic_meters",
  "timestamp": "2024-01-15T10:40:00Z"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 1003,
    "sensorId": 1,
    "value": 19605000000,
    "timestamp": "2024-01-15T10:40:00Z"
  },
  "message": "Reading recorded successfully"
}
```

---

### Alert Endpoints

#### Get All Alerts

**GET** `/alerts`

Retrieve system alerts with filtering options.

**Query Parameters**:
- `damId`: Filter by dam ID
- `severity`: Filter by severity (CRITICAL, HIGH, MEDIUM, LOW, INFO)
- `status`: Filter by status (ACTIVE, RESOLVED, DISMISSED)
- `page`: Page number (default: 0)
- `size`: Results per page (default: 20)

**Example**:
```
GET /api/alerts?damId=1&severity=CRITICAL&status=ACTIVE&page=0&size=20
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 1,
        "damId": 1,
        "type": "HIGH_WATER_LEVEL",
        "severity": "CRITICAL",
        "status": "ACTIVE",
        "message": "Water level exceeded critical threshold",
        "threshold": 25000000000,
        "currentValue": 25500000000,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:35:00Z"
      }
    ],
    "totalElements": 23,
    "totalPages": 2,
    "currentPage": 0
  }
}
```

---

#### Get Alert Details

**GET** `/alerts/{alertId}`

Retrieve details of a specific alert.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "damId": 1,
    "type": "HIGH_WATER_LEVEL",
    "severity": "CRITICAL",
    "status": "ACTIVE",
    "message": "Water level exceeded critical threshold",
    "sensorId": 1,
    "threshold": 25000000000,
    "currentValue": 25500000000,
    "triggeredAt": "2024-01-15T10:30:00Z",
    "notifications": [
      {
        "id": 1,
        "type": "EMAIL",
        "recipient": "admin@example.com",
        "sentAt": "2024-01-15T10:31:00Z"
      }
    ]
  }
}
```

---

#### Acknowledge Alert

**PUT** `/alerts/{alertId}/acknowledge`

Mark an alert as acknowledged.

**Request Body**:
```json
{
  "acknowledgedBy": "user@example.com",
  "notes": "Alert acknowledged, investigating issue"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "ACKNOWLEDGED",
    "acknowledgedAt": "2024-01-15T10:45:00Z"
  },
  "message": "Alert acknowledged successfully"
}
```

---

#### Resolve Alert

**PUT** `/alerts/{alertId}/resolve`

Mark alert as resolved.

**Request Body**:
```json
{
  "resolvedBy": "user@example.com",
  "notes": "Issue has been resolved"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "RESOLVED",
    "resolvedAt": "2024-01-15T11:00:00Z"
  },
  "message": "Alert resolved successfully"
}
```

---

### User Endpoints

#### Get Current User

**GET** `/users/me`

Get authenticated user's profile information.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "role": "USER",
    "department": "Operations",
    "region": {
      "id": 1,
      "name": "Arizona Region"
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "lastLogin": "2024-01-15T10:30:00Z"
  }
}
```

---

#### Update User Profile

**PUT** `/users/me`

Update current user's profile information.

**Request Body**:
```json
{
  "name": "Jane Doe",
  "phone": "+0987654321"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "Jane Doe",
    "phone": "+0987654321"
  },
  "message": "Profile updated successfully"
}
```

---

#### Change Password

**POST** `/users/change-password`

Change user's password.

**Request Body**:
```json
{
  "oldPassword": "currentPassword123",
  "newPassword": "newPassword456",
  "confirmPassword": "newPassword456"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

#### Get All Users (Admin Only)

**GET** `/users`

Retrieve list of all system users.

**Query Parameters**:
- `role`: Filter by role (ADMIN, OPERATOR, VIEWER)
- `region`: Filter by region ID
- `page`: Page number (default: 0)
- `size`: Results per page (default: 20)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 1,
        "email": "admin@example.com",
        "name": "Admin User",
        "role": "ADMIN",
        "status": "ACTIVE"
      }
    ],
    "totalElements": 45,
    "totalPages": 3
  }
}
```

---

### Report Endpoints

#### Create Report

**POST** `/reports`

Create a new incident or issue report.

**Request Body**:
```json
{
  "type": "MAINTENANCE_ISSUE",
  "damId": 1,
  "title": "Gate malfunction reported",
  "description": "North gate not responding to control commands",
  "severity": "HIGH",
  "attachments": []
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "reportNumber": "RPT-2024-001",
    "status": "OPEN",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "Report created successfully"
}
```

---

#### Get Reports

**GET** `/reports`

Retrieve reports with filtering.

**Query Parameters**:
- `damId`: Filter by dam
- `type`: Filter by report type
- `status`: Filter by status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
- `severity`: Filter by severity

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 1,
        "reportNumber": "RPT-2024-001",
        "type": "MAINTENANCE_ISSUE",
        "damId": 1,
        "title": "Gate malfunction reported",
        "status": "OPEN",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "totalElements": 15,
    "totalPages": 1
  }
}
```

---

### System Endpoints

#### Health Check

**GET** `/health`

Check if the API is running and database is accessible.

**Response** (200 OK):
```json
{
  "status": "UP",
  "components": {
    "database": {
      "status": "UP"
    },
    "cache": {
      "status": "UP"
    }
  }
}
```

---

#### API Version

**GET** `/version`

Get current API version information.

**Response** (200 OK):
```json
{
  "version": "1.0.0",
  "name": "Dam Disaster Alert System API",
  "buildTime": "2024-01-15T00:00:00Z"
}
```

---

#### System Statistics

**GET** `/statistics`

Get system-wide statistics and metrics.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "totalDams": 45,
    "totalSensors": 234,
    "activeSensors": 230,
    "activeAlerts": 5,
    "totalUsers": 42,
    "systemUptime": "15 days 3 hours"
  }
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General endpoints**: 1000 requests per hour per IP
- **Authentication endpoints**: 10 requests per minute per IP
- **File upload endpoints**: 100 MB per hour per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1234567890
```

## Best Practices

1. **Always use HTTPS** in production
2. **Implement proper error handling** in client applications
3. **Cache responses** where appropriate to reduce API calls
4. **Use pagination** for large datasets
5. **Implement exponential backoff** for retries
6. **Secure tokens** - never expose in logs or version control
7. **Validate input** on both client and server side
8. **Monitor API usage** for anomalies

## Testing Endpoints

Use the Bruno collection in `api/bruno/` folder for testing all endpoints:

```bash
cd api/bruno
# Import into Bruno or use CLI commands
bruno run
```

Or use cURL:

```bash
curl -X GET http://localhost:8080/api/health
```

---

For detailed endpoint specifications and examples, check the Bruno documentation folder.

