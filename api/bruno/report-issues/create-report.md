# Create Report Issue

POST /api/v1/report-issues

## Description
Create a new issue report submitted by mobile app users. This is a public endpoint (no authentication required).

## Request
**Method:** POST  
**Content-Type:** application/json

**Body:**
```json
{
  "title": "Flooding near bridge",
  "description": "Water level rising rapidly near bridge X, risk of overflow",
  "location": {
    "latitude": 6.9271,
    "longitude": 79.8612,
    "address": "Near Bridge X, Region Y"
  },
  "reportedBy": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+94712345678"
  },
  "severity": "high",
  "category": "flooding",
  "attachments": []
}
```

## Response
**Status:** 201 Created

```json
{
  "id": 123,
  "title": "Flooding near bridge",
  "status": "submitted",
  "createdAt": "2026-05-08T15:30:00Z",
  "updatedAt": "2026-05-08T15:30:00Z"
}
```

## Errors
- **400 Bad Request** - Missing required fields (title, description, location)
- **422 Unprocessable Entity** - Invalid data format

## Notes
- No authentication required (public)
- Server should validate location coordinates
- Status defaults to "submitted"
