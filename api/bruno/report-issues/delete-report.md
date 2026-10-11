# Delete Report Issue

DELETE /api/v1/report-issues/{id}

## Description
Delete (soft-delete) an issue report. Typically admin-only operation.

## Request
**Method:** DELETE

**Path Parameters:**
- `id` (number, required) - Report issue ID

## Response
**Status:** 204 No Content

(No response body)

## Errors
- **404 Not Found** - Report not found
- **403 Forbidden** - Insufficient permissions (if auth required)

## Notes
- Performs soft-delete (marks as deleted, retains audit trail)
- May require admin authentication
