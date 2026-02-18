# News Module — Database Schema

## Overview

This schema provides a streamlined news/alerts system for the Dam Disaster Alert System:
- **News categories** with multi-language support
- **News articles** with priority levels and geo-tagging
- **User interactions** (views, saves, shares)
- **Push notification tracking** for alerts

> SQL dialect: **MySQL 8+** (InnoDB, `utf8mb4`).

---

## Dependencies (existing tables)

- `users`, `roles` (from `users_rbac_schema.md`)
- `regions`, `dams` (from `dams_schema.md`)

---

## Tables

### 1. News Categories

```sql
CREATE TABLE news_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_si VARCHAR(100) NULL,
    name_ta VARCHAR(100) NULL,
    description TEXT NULL,
    icon VARCHAR(100) NULL COMMENT 'Icon name for mobile app',
    color VARCHAR(20) NULL,
    filter_key VARCHAR(50) NOT NULL COMMENT 'all, weather, dam-status, emergency',
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nc_filter (filter_key),
    INDEX idx_nc_active (is_active),
    INDEX idx_nc_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2. News Articles

Main news/alerts content table.

```sql
CREATE TABLE news_articles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    
    -- Content
    title VARCHAR(255) NOT NULL,
    title_si VARCHAR(255) NULL,
    title_ta VARCHAR(255) NULL,
    summary TEXT NOT NULL COMMENT 'Short preview text',
    summary_si TEXT NULL,
    content LONGTEXT NOT NULL COMMENT 'Full article content',
    content_si LONGTEXT NULL,
    
    -- Media
    image_url VARCHAR(500) NULL,
    image_alt VARCHAR(255) NULL,
    gallery_urls JSON NULL COMMENT 'Array of additional images',
    
    -- Classification
    priority_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    source VARCHAR(100) NULL COMMENT 'Meteorology Dept, Mahaweli Authority, etc.',
    
    -- Geographic Scope
    is_nationwide BOOLEAN DEFAULT FALSE,
    region_id BIGINT UNSIGNED NULL,
    dam_id BIGINT UNSIGNED NULL,
    affected_regions JSON NULL COMMENT 'Array of region IDs',
    
    -- Publishing
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT FALSE,
    publish_date TIMESTAMP NULL,
    expiry_date TIMESTAMP NULL,
    
    -- Engagement Stats (denormalized for performance)
    view_count INT DEFAULT 0,
    save_count INT DEFAULT 0,
    share_count INT DEFAULT 0,
    
    -- Notifications
    push_sent BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMP NULL,
    
    metadata JSON NULL,
    
    -- Audit
    author_id BIGINT UNSIGNED NULL,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (category_id) REFERENCES news_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE SET NULL,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_na_category (category_id),
    INDEX idx_na_status (status),
    INDEX idx_na_priority (priority_level),
    INDEX idx_na_publish (status, publish_date DESC),
    INDEX idx_na_region (region_id),
    INDEX idx_na_dam (dam_id),
    INDEX idx_na_featured (is_featured, publish_date DESC),
    INDEX idx_na_deleted (deleted_at),
    FULLTEXT INDEX idx_na_search (title, summary, content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3. News User Interactions

Tracks user engagement with articles.

```sql
CREATE TABLE news_user_interactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    article_id BIGINT UNSIGNED NOT NULL,
    
    -- Interaction Flags
    has_viewed BOOLEAN DEFAULT FALSE,
    has_saved BOOLEAN DEFAULT FALSE,
    has_shared BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    viewed_at TIMESTAMP NULL,
    saved_at TIMESTAMP NULL,
    shared_at TIMESTAMP NULL,
    share_platform VARCHAR(50) NULL COMMENT 'whatsapp, facebook, copy_link',
    
    -- Reading Progress
    read_progress INT DEFAULT 0 COMMENT 'Percentage read 0-100',
    read_time_seconds INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE,
    
    UNIQUE KEY uk_user_article (user_id, article_id),
    INDEX idx_nui_user (user_id),
    INDEX idx_nui_article (article_id),
    INDEX idx_nui_saved (user_id, has_saved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 4. News Subscriptions

User preferences for news notifications.

```sql
CREATE TABLE news_subscriptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    
    -- Subscription Scope
    category_id BIGINT UNSIGNED NULL COMMENT 'NULL = all categories',
    region_id BIGINT UNSIGNED NULL COMMENT 'NULL = all regions',
    
    -- Notification Preferences
    min_priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT FALSE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES news_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE,
    
    UNIQUE KEY uk_subscription (user_id, category_id, region_id),
    INDEX idx_ns_user (user_id),
    INDEX idx_ns_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 5. News Push Logs

Tracks push notification delivery for articles.

```sql
CREATE TABLE news_push_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    article_id BIGINT UNSIGNED NOT NULL,
    
    -- Stats
    total_recipients INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    opened_count INT DEFAULT 0,
    
    -- Provider Info
    provider VARCHAR(50) NULL COMMENT 'firebase, expo, etc.',
    batch_id VARCHAR(100) NULL,
    
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    error_summary JSON NULL,
    
    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE,
    
    INDEX idx_npl_article (article_id),
    INDEX idx_npl_sent (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Default Data

### Default Categories

```sql
INSERT INTO news_categories (code, name, name_si, filter_key, icon, color, display_order) VALUES
('weather_alert', 'Weather Alert', 'කාලගුණ අනතුරු ඇඟවීම', 'weather', 'weather-partly-cloudy', '#3B82F6', 1),
('dam_status', 'Dam Status', 'වේල්ල තත්ත්වය', 'dam-status', 'water', '#06B6D4', 2),
('flood_warning', 'Flood Warning', 'ගංවතුර අනතුරු ඇඟවීම', 'emergency', 'waves', '#EF4444', 3),
('landslide_warning', 'Landslide Warning', 'නායයෑම් අනතුරු ඇඟවීම', 'emergency', 'terrain', '#F59E0B', 4),
('evacuation', 'Evacuation Notice', 'ඉවත් කිරීමේ දැනුම්දීම', 'emergency', 'run-fast', '#DC2626', 5),
('general', 'General News', 'සාමාන්‍ය පුවත්', 'all', 'newspaper', '#6B7280', 10);
```

---

## Views

### View: Published News Feed

```sql
CREATE VIEW v_news_feed AS
SELECT 
    na.id,
    na.uuid,
    na.title,
    na.title_si,
    na.summary,
    na.summary_si,
    na.image_url,
    na.priority_level,
    na.source,
    na.publish_date,
    na.view_count,
    na.is_featured,
    nc.id AS category_id,
    nc.code AS category_code,
    nc.name AS category_name,
    nc.name_si AS category_name_si,
    nc.icon AS category_icon,
    nc.color AS category_color,
    nc.filter_key,
    r.name AS region_name,
    d.name AS dam_name,
    TIMESTAMPDIFF(MINUTE, na.publish_date, NOW()) AS minutes_ago
FROM news_articles na
JOIN news_categories nc ON na.category_id = nc.id
LEFT JOIN regions r ON na.region_id = r.id
LEFT JOIN dams d ON na.dam_id = d.id
WHERE na.status = 'published'
  AND na.deleted_at IS NULL
  AND (na.expiry_date IS NULL OR na.expiry_date > NOW())
ORDER BY na.priority_level = 'critical' DESC,
         na.priority_level = 'high' DESC,
         na.publish_date DESC;
```

### View: User Saved News

```sql
CREATE VIEW v_user_saved_news AS
SELECT 
    nui.user_id,
    na.id AS article_id,
    na.uuid,
    na.title,
    na.summary,
    na.image_url,
    na.priority_level,
    nc.name AS category_name,
    nc.icon AS category_icon,
    nui.saved_at
FROM news_user_interactions nui
JOIN news_articles na ON nui.article_id = na.id
JOIN news_categories nc ON na.category_id = nc.id
WHERE nui.has_saved = TRUE
  AND na.deleted_at IS NULL
ORDER BY nui.saved_at DESC;
```

---

## Sample Queries

### Get News Feed by Category

```sql
SELECT * FROM v_news_feed
WHERE filter_key = ? OR filter_key = 'all'
ORDER BY priority_level = 'critical' DESC, publish_date DESC
LIMIT 20 OFFSET ?;
```

### Record Article View

```sql
INSERT INTO news_user_interactions (user_id, article_id, has_viewed, viewed_at)
VALUES (?, ?, TRUE, NOW())
ON DUPLICATE KEY UPDATE 
    has_viewed = TRUE,
    viewed_at = COALESCE(viewed_at, NOW()),
    updated_at = NOW();

UPDATE news_articles SET view_count = view_count + 1 WHERE id = ?;
```

### Toggle Save Article

```sql
INSERT INTO news_user_interactions (user_id, article_id, has_saved, saved_at)
VALUES (?, ?, TRUE, NOW())
ON DUPLICATE KEY UPDATE 
    has_saved = NOT has_saved,
    saved_at = IF(has_saved, NULL, NOW()),
    updated_at = NOW();
```

### Get Critical Alerts for User's Region

```sql
SELECT na.* FROM news_articles na
WHERE na.status = 'published'
  AND na.priority_level IN ('high', 'critical')
  AND na.deleted_at IS NULL
  AND (na.is_nationwide = TRUE OR na.region_id = ? OR JSON_CONTAINS(na.affected_regions, ?))
ORDER BY na.publish_date DESC
LIMIT 10;
```

---

## API Permissions

```sql
INSERT INTO permissions (code, name, module, action, description) VALUES
('news.view', 'View News', 'news', 'view', 'Can view published news'),
('news.create', 'Create News', 'news', 'create', 'Can create news articles'),
('news.edit', 'Edit News', 'news', 'edit', 'Can edit news articles'),
('news.delete', 'Delete News', 'news', 'delete', 'Can delete news articles'),
('news.publish', 'Publish News', 'news', 'manage', 'Can publish/unpublish articles'),
('news.send_push', 'Send Push Notifications', 'news', 'manage', 'Can send push notifications');
```

---

## Schema Summary

| Table | Purpose |
|-------|---------|
| `news_categories` | Category lookup with i18n |
| `news_articles` | Main news content |
| `news_user_interactions` | User views, saves, shares |
| `news_subscriptions` | Notification preferences |
| `news_push_logs` | Push delivery tracking |

**Total: 5 tables** (reduced from 10)

---

## Design Notes

1. **Merged interactions** - Combined view/like/share/save into single table with flags
2. **Removed comments** - Not critical for emergency alerts app
3. **Removed tags** - Categories sufficient for filtering
4. **Removed analytics table** - Stats denormalized into articles
5. **Removed attachments table** - Use JSON `gallery_urls` field
6. **Added multi-language** - Consistent with other schemas (`name_si`, `name_ta`)
7. **Added UUID** - For external API exposure
8. **Added dam/region links** - Integration with existing tables
