# Update Report Issue

PUT /api/v1/report-issues/{id}

## Description
Update an existing issue report. Intended for admin panel or authorized users to update status and other fields.

## Request
**Method:** PUT  
**Content-Type:** application/json

**Path Parameters:**
- `id` (number, required) - Report issue ID

**Body (all fields optional):**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "in_progress",
  "severity": "medium",
  "category": "erosion"
}
```

## Response
**Status:** 200 OK

```json
{
  "id": 123,
  "title": "Updated title",
  "status": "in_progress",
  "updatedAt": "2026-05-08T16:00:00Z"
}
```

## Errors
- **404 Not Found** - Report not found
- **400 Bad Request** - Invalid status or category
- **403 Forbidden** - Insufficient permissions (if auth required)

## Notes
- Authentication may be required (depends on backend security config)
- Only allow status updates for authorized users
