# Get Report Issue by ID

GET /api/v1/report-issues/{id}

## Description
Retrieve details of a specific issue report by ID.

## Request
**Method:** GET

**Path Parameters:**
- `id` (number, required) - Report issue ID

## Response
**Status:** 200 OK

```json
{
  "id": 123,
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
  "status": "submitted",
  "attachments": [
    {
      "id": 1,
      "filename": "image1.jpg",
      "url": "https://cdn.example.com/uploads/image1.jpg"
    }
  ],
  "createdAt": "2026-05-08T15:30:00Z",
  "updatedAt": "2026-05-08T15:30:00Z"
}
```

## Errors
- **404 Not Found** - Report with given ID does not exist

## Notes
- Public access allowed
