# Upload Report Attachment

POST /api/v1/report-issues/{id}/attachments

## Description
Upload a file attachment (image/video) to an existing report issue.

## Request
**Method:** POST  
**Content-Type:** multipart/form-data

**Path Parameters:**
- `id` (number, required) - Report issue ID

**Form Fields:**
- `file` (binary, required) - The file to upload (image or video)

**Supported file types:**
- Images: jpg, jpeg, png, gif (max 5MB)
- Videos: mp4, mov, webm (max 20MB)

## Response
**Status:** 201 Created

```json
{
  "id": 456,
  "filename": "report_123_image1.jpg",
  "url": "https://cdn.example.com/uploads/report_123_image1.jpg",
  "size": 2048576,
  "uploadedAt": "2026-05-08T15:45:00Z"
}
```

## Errors
- **404 Not Found** - Report not found
- **400 Bad Request** - No file provided or invalid file type
- **413 Payload Too Large** - File exceeds size limit

## Notes
- No authentication required (public)
- Server stores file and returns URL for use in reports
