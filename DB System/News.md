# Dam Disaster Alert System - News Module Database Schema

## Overview
This document defines the complete MySQL database schema for the News module of the Dam Disaster Alert System. The schema supports managing news articles, categories, user interactions, and news distribution.

---

## Database Tables

### 1. **news_categories** - News Article Categories
Stores all available news categories for organization and filtering.

```sql
CREATE TABLE news_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_path VARCHAR(255),
    filter_key VARCHAR(50) NOT NULL UNIQUE,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Columns:**
- `id`: Unique category identifier
- `name`: Category name (e.g., "Weather Alert", "Dam Status")
- `description`: Category description
- `icon_path`: Path to category icon image
- `filter_key`: Key used for filtering (all, weather-alerts, dam-status, emergency)
- `display_order`: Order of display in UI
- `is_active`: Whether category is active
- `created_at`: Timestamp of creation
- `updated_at`: Last update timestamp

**Sample Data:**
```sql
INSERT INTO news_categories (name, description, filter_key, display_order) VALUES
('Weather Alert', 'Weather warnings and updates', 'weather-alerts', 2),
('Dam Status', 'Dam water levels and operations', 'dam-status', 1),
('Landslide Warning', 'Landslide risk alerts', 'emergency', 3),
('Community Welfare', 'Community support and relief', 'all', 4),
('Emergency Response', 'Emergency preparedness', 'emergency', 5),
('Lightning Warning', 'Lightning and thunderstorm alerts', 'emergency', 6),
('Community Support', 'Community assistance programs', 'all', 7);
```

---

### 2. **news_articles** - Main News Articles Table
Stores all news articles with detailed information.

```sql
CREATE TABLE news_articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    external_id VARCHAR(50) UNIQUE,
    category_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    full_content LONGTEXT NOT NULL,
    featured_image_url VARCHAR(500),
    featured_image_alt_text VARCHAR(255),
    author_id INT,
    source VARCHAR(100),
    priority_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    is_featured BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    publish_date TIMESTAMP,
    expiry_date TIMESTAMP NULL,
    view_count INT DEFAULT 0,
    is_geo_tagged BOOLEAN DEFAULT FALSE,
    affected_regions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (category_id) REFERENCES news_categories(id),
    FOREIGN KEY (author_id) REFERENCES users(id),
    INDEX idx_category (category_id),
    INDEX idx_published (is_published),
    INDEX idx_publish_date (publish_date),
    INDEX idx_priority (priority_level),
    FULLTEXT INDEX idx_search (title, description, full_content)
);
```

**Columns:**
- `id`: Unique article identifier
- `external_id`: External reference ID for API sync
- `category_id`: Reference to news_categories
- `title`: Article title
- `description`: Short description (for preview)
- `full_content`: Complete article content
- `featured_image_url`: Image URL/path
- `featured_image_alt_text`: Alt text for accessibility
- `author_id`: Reference to users (news author/publisher)
- `source`: News source (Government, Meteorology Dept, etc.)
- `priority_level`: News priority for ordering
- `is_featured`: Whether article should be featured
- `is_published`: Publication status
- `publish_date`: When article was published
- `expiry_date`: When article becomes outdated
- `view_count`: Number of views
- `is_geo_tagged`: Whether article is location-specific
- `affected_regions`: JSON array of affected region codes
- `created_at`, `updated_at`, `deleted_at`: Timestamps

**Sample Data:**
```sql
INSERT INTO news_articles (external_id, category_id, title, description, full_content, featured_image_url, priority_level, is_featured, publish_date) VALUES
('news_001', 1, 'Heavy Rainfall Warning for Western Province', 
'Meteorology Department issues heavy rainfall warning for Western Province including Colombo, Gampaha, and Kalutara districts. Expected rainfall: 150-200mm over next 48 hours.',
'The Department of Meteorology has released a Level 2 (Orange) weather alert...',
'data:image/webp;base64,...',
'high', TRUE, NOW()),

('news_002', 3, 'Victoria Dam Water Level Approaching Spill Level',
'Mahaweli Authority announces Victoria Dam water level at 95% capacity. Controlled water release planned to manage reservoir levels safely.',
'The Mahaweli Authority of Sri Lanka reports that Victoria Dam has reached 95% of its storage capacity...',
'data:image/webp;base64,...',
'critical', FALSE, NOW());
```

---

### 3. **news_tags** - Tags for Articles
Supports flexible tagging for better news organization and search.

```sql
CREATE TABLE news_tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color_code VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_slug (slug)
);
```

**Columns:**
- `id`: Unique tag identifier
- `name`: Tag name (e.g., "monsoon", "flooding", "evacuation")
- `slug`: URL-friendly version of tag name
- `description`: Tag description
- `color_code`: Hex color code for UI display

---

### 4. **news_article_tags** - Linking Articles to Tags
Many-to-many relationship between articles and tags.

```sql
CREATE TABLE news_article_tags (
    article_id INT NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (article_id, tag_id),
    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES news_tags(id) ON DELETE CASCADE,
    INDEX idx_tag (tag_id)
);
```

---

### 5. **news_user_interactions** - User Engagement Data
Tracks user interactions with news articles.

```sql
CREATE TABLE news_user_interactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    article_id INT NOT NULL,
    interaction_type ENUM('view', 'like', 'share', 'save', 'report') NOT NULL,
    interaction_count INT DEFAULT 1,
    share_platform VARCHAR(50),
    report_reason VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_article (article_id),
    INDEX idx_interaction_type (interaction_type),
    UNIQUE KEY unique_interaction (user_id, article_id, interaction_type)
);
```

**Columns:**
- `id`: Unique interaction record ID
- `user_id`: Reference to user
- `article_id`: Reference to article
- `interaction_type`: Type of engagement (view, like, share, save, report)
- `interaction_count`: Number of times user interacted
- `share_platform`: Platform where shared (facebook, whatsapp, twitter, etc.)
- `report_reason`: Reason for reporting if applicable
- `ip_address`: User's IP address
- `user_agent`: Browsing device information
- `created_at`, `updated_at`: Timestamps

---

### 6. **news_comments** - User Comments on Articles
Supports community discussion on news items.

```sql
CREATE TABLE news_comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    article_id INT NOT NULL,
    user_id INT NOT NULL,
    parent_comment_id INT,
    comment_text TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    like_count INT DEFAULT 0,
    helpful_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES news_comments(id) ON DELETE CASCADE,
    INDEX idx_article (article_id),
    INDEX idx_user (user_id),
    INDEX idx_approved (is_approved),
    INDEX idx_parent (parent_comment_id)
);
```

**Columns:**
- `id`: Unique comment ID
- `article_id`: Reference to article
- `user_id`: Reference to commenting user
- `parent_comment_id`: For nested comments/replies
- `comment_text`: The comment content
- `is_approved`: Moderation status
- `is_deleted`: Soft delete flag
- `like_count`: Number of likes on comment
- `helpful_count`: Marked as helpful count
- `created_at`, `updated_at`: Timestamps

---

### 7. **news_subscriptions** - User Subscriptions to News Alerts
Manages user preferences for news notifications.

```sql
CREATE TABLE news_subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    category_id INT,
    region_code VARCHAR(50),
    priority_level ENUM('all', 'high', 'critical') DEFAULT 'all',
    notification_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    push_enabled BOOLEAN DEFAULT TRUE,
    frequency ENUM('real-time', 'daily', 'weekly') DEFAULT 'real-time',
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES news_categories(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_category (category_id),
    INDEX idx_region (region_code),
    UNIQUE KEY unique_subscription (user_id, category_id, region_code)
);
```

**Columns:**
- `id`: Unique subscription ID
- `user_id`: Reference to user
- `category_id`: News category subscription (null = all categories)
- `region_code`: Specific region code for geo-targeted news
- `priority_level`: Minimum priority to receive alerts
- `notification_enabled`, `email_enabled`, `sms_enabled`, `push_enabled`: Channel preferences
- `frequency`: How often to receive notifications
- `subscribed_at`: When subscription started
- `unsubscribed_at`: When user unsubscribed
- `is_active`: Current subscription status

---

### 8. **news_attachment_files** - Media Attachments for Articles
Stores information about additional media files.

```sql
CREATE TABLE news_attachment_files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    article_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size INT,
    file_path VARCHAR(500) NOT NULL,
    display_order INT DEFAULT 0,
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_article (article_id)
);
```

**Columns:**
- `id`: Unique file ID
- `article_id`: Reference to article
- `file_name`: Original file name
- `file_type`: MIME type (image/jpeg, image/webp, etc.)
- `file_size`: File size in bytes
- `file_path`: Storage path/URL
- `display_order`: Order of display in article
- `uploaded_by`: User who uploaded
- `created_at`: Upload timestamp

---

### 9. **news_distribution_logs** - News Distribution Tracking
Logs for tracking news distribution to users.

```sql
CREATE TABLE news_distribution_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    article_id INT NOT NULL,
    distribution_type ENUM('push', 'email', 'sms', 'in-app') NOT NULL,
    recipient_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    failure_count INT DEFAULT 0,
    pending_count INT DEFAULT 0,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE,
    INDEX idx_article (article_id),
    INDEX idx_sent_at (sent_at)
);
```

**Columns:**
- `id`: Unique log entry ID
- `article_id`: Reference to article
- `distribution_type`: Channel used
- `recipient_count`: Total recipients
- `success_count`: Successfully delivered
- `failure_count`: Delivery failures
- `pending_count`: Still pending delivery
- `sent_at`: When distribution started

---

### 10. **news_analytics** - Analytics and Performance Data
Stores aggregated analytics data for performance tracking.

```sql
CREATE TABLE news_analytics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    article_id INT NOT NULL,
    date DATE NOT NULL,
    total_views INT DEFAULT 0,
    unique_viewers INT DEFAULT 0,
    click_through_count INT DEFAULT 0,
    share_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    engagement_rate DECIMAL(5, 2),
    average_read_time INT,
    bounce_rate DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE,
    INDEX idx_article (article_id),
    INDEX idx_date (date),
    UNIQUE KEY unique_daily_analytics (article_id, date)
);
```

**Columns:**
- `id`: Unique analytics record ID
- `article_id`: Reference to article
- `date`: Date of measurement
- `total_views`: Total page views
- `unique_viewers`: Unique user count
- `click_through_count`: CTR count
- `share_count`: Number of shares
- `comment_count`: Number of comments
- `engagement_rate`: Calculated engagement percentage
- `average_read_time`: Average reading time in seconds
- `bounce_rate`: Bounce rate percentage
- `created_at`: Record timestamp

---

## Database Views

### View 1: **vw_news_articles_with_category_info**
Convenient view for fetching articles with category details.

```sql
CREATE VIEW vw_news_articles_with_category_info AS
SELECT 
    na.id,
    na.external_id,
    na.title,
    na.description,
    na.featured_image_url,
    na.priority_level,
    na.view_count,
    na.publish_date,
    nc.name as category_name,
    nc.filter_key,
    DATE_FORMAT(na.publish_date, '%i minutes ago') as time_ago,
    COALESCE(
        (SELECT COUNT(*) FROM news_user_interactions 
         WHERE article_id = na.id AND interaction_type = 'like'), 
        0
    ) as like_count,
    COALESCE(
        (SELECT COUNT(*) FROM news_comments 
         WHERE article_id = na.id AND is_deleted = FALSE), 
        0
    ) as comment_count
FROM news_articles na
LEFT JOIN news_categories nc ON na.category_id = nc.id
WHERE na.is_published = TRUE 
  AND (na.expiry_date IS NULL OR na.expiry_date > NOW())
  AND na.deleted_at IS NULL;
```

### View 2: **vw_trending_articles**
View for trending/popular articles based on views.

```sql
CREATE VIEW vw_trending_articles AS
SELECT 
    na.id,
    na.title,
    na.description,
    na.featured_image_url,
    nc.name as category_name,
    na.view_count,
    na.publish_date,
    COUNT(nui.id) as total_interactions,
    ROUND((na.view_count / NULLIF(
        (SELECT SUM(view_count) FROM news_articles 
         WHERE publish_date > DATE_SUB(NOW(), INTERVAL 7 DAY)), 0
    ) * 100), 2) as views_percentage
FROM news_articles na
LEFT JOIN news_categories nc ON na.category_id = nc.id
LEFT JOIN news_user_interactions nui ON na.id = nui.article_id
WHERE na.is_published = TRUE 
  AND na.publish_date > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY na.id, na.title, na.description, na.featured_image_url, 
         nc.name, na.view_count, na.publish_date
ORDER BY na.view_count DESC;
```

---

## Stored Procedures

### Procedure 1: **sp_get_latest_news_by_category**
Retrieves latest news articles by category with pagination.

```sql
DELIMITER $$

CREATE PROCEDURE sp_get_latest_news_by_category(
    IN p_category_id INT,
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SELECT 
        id,
        external_id,
        title,
        description,
        featured_image_url,
        category_id,
        priority_level,
        view_count,
        CONCAT(TIMESTAMPDIFF(MINUTE, publish_date, NOW()), ' minutes ago') as time_ago
    FROM news_articles
    WHERE category_id = p_category_id 
      AND is_published = TRUE
      AND (expiry_date IS NULL OR expiry_date > NOW())
      AND deleted_at IS NULL
    ORDER BY priority_level = 'critical' DESC, 
             priority_level = 'high' DESC,
             publish_date DESC
    LIMIT p_limit OFFSET p_offset;
END$$

DELIMITER ;
```

### Procedure 2: **sp_record_user_interaction**
Records user interaction with news articles.

```sql
DELIMITER $$

CREATE PROCEDURE sp_record_user_interaction(
    IN p_user_id INT,
    IN p_article_id INT,
    IN p_interaction_type VARCHAR(50)
)
BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
    END;
    
    START TRANSACTION;
    
    -- Increment view count
    IF p_interaction_type = 'view' THEN
        UPDATE news_articles SET view_count = view_count + 1 
        WHERE id = p_article_id;
    END IF;
    
    -- Record or update interaction
    INSERT INTO news_user_interactions 
    (user_id, article_id, interaction_type, interaction_count)
    VALUES (p_user_id, p_article_id, p_interaction_type, 1)
    ON DUPLICATE KEY UPDATE 
    interaction_count = interaction_count + 1,
    updated_at = NOW();
    
    COMMIT;
END$$

DELIMITER ;
```

### Procedure 3: **sp_send_news_notification**
Sends notifications for new critical news items.

```sql
DELIMITER $$

CREATE PROCEDURE sp_send_news_notification(
    IN p_article_id INT
)
BEGIN
    DECLARE v_category_id INT;
    DECLARE v_priority_level VARCHAR(20);
    
    -- Get article details
    SELECT category_id, priority_level 
    INTO v_category_id, v_priority_level
    FROM news_articles WHERE id = p_article_id;
    
    -- Insert distribution logs for each notification channel
    INSERT INTO news_distribution_logs 
    (article_id, distribution_type, recipient_count, pending_count)
    SELECT 
        p_article_id,
        'push' as distribution_type,
        COUNT(*) as recipient_count,
        COUNT(*) as pending_count
    FROM news_subscriptions
    WHERE (category_id = v_category_id OR category_id IS NULL)
      AND push_enabled = TRUE
      AND is_active = TRUE
      AND FIND_IN_SET(p_priority_level, CONCAT(priority_level, ',all')) > 0;
    
    -- Repeat for email, sms channels as needed
END$$

DELIMITER ;
```

---

## Indexes Summary

```sql
-- Performance Indexes
CREATE INDEX idx_news_published_date ON news_articles(is_published, publish_date DESC);
CREATE INDEX idx_news_category_published ON news_articles(category_id, is_published, publish_date DESC);
CREATE INDEX idx_interactions_user_article ON news_user_interactions(user_id, article_id);
CREATE INDEX idx_subscriptions_user_active ON news_subscriptions(user_id, is_active);
```

---

## Data Insert Examples

### Insert Categories
```sql
INSERT INTO news_categories (name, filter_key, display_order) VALUES
('Weather Alert', 'weather-alerts', 1),
('Dam Status', 'dam-status', 2),
('Landslide Warning', 'emergency', 3),
('Community Welfare', 'all', 4);
```

### Insert Sample News Articles
```sql
INSERT INTO news_articles 
(category_id, title, description, full_content, featured_image_url, priority_level, publish_date) 
VALUES
(1, 'Heavy Rainfall Warning for Western Province', 
'Meteorology warns of 150-200mm rainfall in next 48 hours',
'Full content here...',
'image_url_here',
'high',
NOW());
```

---

## Key Features & Relationships

1. **Hierarchical Structure**: Categories > Articles > Comments > Interactions
2. **Soft Deletes**: Articles can be soft-deleted (deleted_at timestamp)
3. **Geo-Tagging**: Support for region-specific news
4. **User Engagement**: Likes, comments, shares, saves tracking
5. **Subscriptions**: Flexible notification preferences by category/region
6. **Performance**: Full-text search on articles, optimized indexes
7. **Analytics**: Daily aggregated metrics for trend analysis
8. **Audit Trail**: All timestamps for creation, updates, and deletes

---

## Queries for Common Operations

### Get Latest News Feed
```sql
SELECT * FROM vw_news_articles_with_category_info
WHERE category_name NOT IN ('Archived')
ORDER BY priority_level IN ('critical', 'high') DESC, publish_date DESC
LIMIT 10;
```

### Get User's Personalized News
```sql
SELECT na.* 
FROM news_articles na
INNER JOIN news_categories nc ON na.category_id = nc.id
INNER JOIN news_subscriptions ns ON nc.id = ns.category_id
WHERE ns.user_id = ? AND ns.is_active = TRUE
ORDER BY na.publish_date DESC;
```

### Get News Search Results
```sql
SELECT * FROM news_articles
WHERE MATCH(title, description, full_content) 
AGAINST(? IN BOOLEAN MODE)
AND is_published = TRUE
ORDER BY publish_date DESC;
```

---

## Database Optimization Tips

1. Regularly archive old articles (> 6 months)
2. Maintain FULLTEXT indexes for search performance
3. Run analytics aggregation job daily
4. Clean up soft-deleted records periodically
5. Monitor view_count and prioritize high-engagement content
6. Use read replicas for analytics queries
7. Cache frequently accessed categories and trending news

---

## Access Control Recommendations

```sql
-- Create database user for application
CREATE USER 'news_app'@'localhost' IDENTIFIED BY 'secure_password';
GRANT SELECT, INSERT, UPDATE ON dam_alert_db.news_* TO 'news_app'@'localhost';
GRANT SELECT ON dam_alert_db.users TO 'news_app'@'localhost';
FLUSH PRIVILEGES;
```

---

**Database Version**: MySQL 8.0+
**Last Updated**: February 2026
**Schema Version**: 1.0
