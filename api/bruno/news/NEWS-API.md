# News API Endpoints

This document describes the public API endpoints for the News section of the mobile app.

## Base URL
```
http://157.245.159.17:8080/api/v1
```

---

## 1. Get All News Articles (Public)

### Endpoint
```
GET /news-articles/public
```

### Description
Retrieve a paginated list of published news articles. **Public access** — no authentication required.

### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 0 | Page number (0-indexed) |
| size | int | 20 | Number of articles per page |
| status | string | published | Filter by status (e.g., 'published') |

### Example Request
```
GET /news-articles/public?page=0&size=20&status=published
```

### Response (200 OK)
```json
{
  "content": [
    {
      "id": 1,
      "title": "Heavy Rainfall Warning",
      "summary": "Warning issued for Western Province",
      "description": "Water levels rising...",
      "content": "Full article content...",
      "imageUrl": "https://cdn.example.com/image.jpg",
      "category": {
        "id": 5,
        "name": "Weather Alert"
      },
      "status": "published",
      "severity": "high",
      "priorityLevel": "1",
      "publishedAt": "2026-05-08T13:00:00Z",
      "createdAt": "2026-05-08T12:30:00Z"
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

### Error Responses
- **400 Bad Request** - Invalid page or size parameter
- **401 Unauthorized** - (Should not occur for public endpoint)

---

## 2. Get Featured News Articles (Public)

### Endpoint
```
GET /news-articles/featured/public
```

### Description
Retrieve featured/highlighted news articles. **Public access** — no authentication required.

### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 0 | Page number (0-indexed) |
| size | int | 10 | Number of articles per page |

### Example Request
```
GET /news-articles/featured/public?page=0&size=10
```

### Response (200 OK)
```json
{
  "content": [
    {
      "id": 1,
      "title": "Heavy Rainfall Warning",
      "summary": "Warning issued for Western Province",
      "category": {
        "name": "Weather Alert"
      },
      "isFeatured": true,
      "priorityLevel": "1",
      "publishedAt": "2026-05-08T13:00:00Z"
    }
  ],
  "pageable": {
    "page": 0,
    "size": 10,
    "totalPages": 1,
    "totalElements": 5
  }
}
```

---

## 3. Get Single News Article

### Endpoint
```
GET /news-articles/{id}
```

### Description
Retrieve a single news article by ID.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | Article ID |

### Example Request
```
GET /news-articles/1
```

### Response (200 OK)
```json
{
  "id": 1,
  "title": "Heavy Rainfall Warning",
  "titleSi": "බරපත් වැසි අවවාදය",
  "summary": "Warning issued for Western Province",
  "content": "Full article content with HTML formatting",
  "imageUrl": "https://cdn.example.com/image.jpg",
  "imageAlt": "Heavy rain over Colombo",
  "category": {
    "id": 5,
    "name": "Weather Alert",
    "slug": "weather-alert"
  },
  "status": "published",
  "isFeatured": true,
  "severity": "high",
  "priorityLevel": "1",
  "isNationwide": true,
  "source": "Department of Meteorology",
  "publishedAt": "2026-05-08T13:00:00Z",
  "createdAt": "2026-05-08T12:30:00Z",
  "updatedAt": "2026-05-08T12:45:00Z"
}
```

### Error Responses
- **404 Not Found** - Article with given ID does not exist

---

## 4. Get News Categories (Public)

### Endpoint
```
GET /news-categories/public
```

### Description
Retrieve all available news categories. **Public access** — no authentication required.

### Example Request
```
GET /news-categories/public
```

### Response (200 OK)
```json
[
  {
    "id": 1,
    "name": "Weather Alert",
    "slug": "weather-alert",
    "description": "Weather warnings and updates",
    "icon": "cloud-alert"
  },
  {
    "id": 2,
    "name": "Emergency",
    "slug": "emergency",
    "description": "Emergency alerts and critical warnings",
    "icon": "alert-circle"
  },
  {
    "id": 3,
    "name": "Community Support",
    "slug": "community-support",
    "description": "Community relief and support news",
    "icon": "users"
  }
]
```

---

## Data Models

### NewsArticleResponse
```json
{
  "id": "number",
  "title": "string",
  "summary": "string (optional)",
  "description": "string (optional)",
  "content": "string (HTML content)",
  "fullContent": "string",
  "imageUrl": "string (URL)",
  "imageAlt": "string (optional)",
  "category": {
    "id": "number",
    "name": "string"
  },
  "categoryName": "string",
  "status": "string (published|draft|archived)",
  "isFeatured": "boolean",
  "severity": "string (low|medium|high|optional)",
  "priorityLevel": "string (1|2|3|optional)",
  "isNationwide": "boolean",
  "source": "string (optional)",
  "publishedAt": "ISO8601 timestamp",
  "createdAt": "ISO8601 timestamp",
  "updatedAt": "ISO8601 timestamp"
}
```

### CategoryResponse
```json
{
  "id": "number",
  "name": "string",
  "slug": "string",
  "description": "string (optional)",
  "icon": "string (optional)"
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "path": "/api/v1/news-articles/public",
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message",
  "status": 400,
  "timestamp": "2026-05-08T15:30:00Z"
}
```

### Common Status Codes
| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad Request (invalid parameters) |
| 404 | Not Found (resource does not exist) |
| 500 | Internal Server Error |

---

## Usage Notes

- **Public Endpoints**: `/news-articles/public` and `/news-articles/featured/public` do not require authentication.
- **Response Format**: All endpoints return `application/json`.
- **Pagination**: Use `page` and `size` parameters for pagination. Default page size is 20.
- **Article Status**: Only published articles are returned by public endpoints.
- **Timestamp Format**: All timestamps are in ISO 8601 format (UTC).
- **Rate Limiting**: No rate limiting enforced for public endpoints.

---

## Integration in Mobile App

The mobile app (Expo React Native) calls these endpoints via the `newsService`:

- `newsService.getAllPublic(params)` → GET /news-articles/public
- `newsService.getFeaturedPublic()` → GET /news-articles/featured/public
- `newsService.getArticleById(id)` → GET /news-articles/{id}

### Example Usage

```typescript
// Fetch all published articles
const articles = await newsService.getAllPublic({ page: 0, size: 20, status: 'published' });
console.log(articles.data.content);

// Fetch featured articles
const featured = await newsService.getFeaturedPublic();
console.log(featured.data.content);

// Fetch single article
const article = await newsService.getArticleById(1);
console.log(article.data);
```

---

**Last Updated:** May 8, 2026  
**Version:** 1.0
