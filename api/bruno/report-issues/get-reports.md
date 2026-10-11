# Get All Report Issues

GET /api/v1/report-issues

## Description
Retrieve a paginated list of all submitted issue reports. Public endpoint with optional filters.

## Request
**Method:** GET

**Query Parameters:**
- `page` (int, default: 0) - Page number (0-indexed)
- `size` (int, default: 20) - Items per page
- `status` (string, optional) - Filter by status: submitted | in_progress | resolved | closed
- `severity` (string, optional) - Filter by severity: low | medium | high
- `category` (string, optional) - Filter by category: flooding | erosion | infrastructure | other

## Response
**Status:** 200 OK

```json
{
  "content": [
    {
      "id": 123,
      "title": "Flooding near bridge",
      "description": "Water level rising...",
      "location": {
        "latitude": 6.9271,
        "longitude": 79.8612,
        "address": "Near Bridge X"
      },
      "severity": "high",
      "category": "flooding",
      "status": "submitted",
      "reportedBy": {
        "name": "John Doe"
      },
      "createdAt": "2026-05-08T15:30:00Z"
    }
  ],
  "pageable": {
    "page": 0,
    "size": 20,
    "totalPages": 3,
    "totalElements": 42
  }
}
```

## Notes
- Returns public view (sensitive fields excluded)
- Sorted by createdAt (descending)
