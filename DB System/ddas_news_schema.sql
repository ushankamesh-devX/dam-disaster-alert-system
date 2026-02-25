-- ============================================================================
-- DAM DISASTER ALERT SYSTEM (DDAS) - News Module Schema
-- ============================================================================
-- SQL Dialect : MySQL 8+
-- Charset     : utf8mb4_unicode_ci
-- Engine      : InnoDB
--
-- SAFE TO RUN: All statements use CREATE TABLE IF NOT EXISTS.
--              This file ONLY adds new tables and does NOT modify or drop
--              any tables from ddas_complete_schema.sql.
--
-- PRE-REQUISITE: ddas_complete_schema.sql must already be imported so that
--                the following tables exist:
--                  users, regions, dams, permissions
--
-- IMPORT ORDER (5 tables):
--   1. news_categories
--   2. news_articles          (depends on news_categories, regions, dams, users)
--   3. news_user_interactions (depends on news_articles, users)
--   4. news_subscriptions     (depends on news_categories, regions, users)
--   5. news_push_logs         (depends on news_articles)
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- TABLE 1: news_categories
-- Category lookup with multi-language support (EN / SI / TA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS news_categories (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code           VARCHAR(50)  UNIQUE NOT NULL,
    name           VARCHAR(100) NOT NULL,
    name_si        VARCHAR(100) NULL,
    name_ta        VARCHAR(100) NULL,
    description    TEXT         NULL,
    icon           VARCHAR(100) NULL    COMMENT 'Icon name for mobile app',
    color          VARCHAR(20)  NULL,
    filter_key     VARCHAR(50)  NOT NULL COMMENT 'all | weather | dam-status | emergency',
    display_order  INT          DEFAULT 0,
    is_active      BOOLEAN      DEFAULT TRUE,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nc_filter (filter_key),
    INDEX idx_nc_active (is_active),
    INDEX idx_nc_order  (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 2: news_articles
-- Main news / alert content table
-- ============================================================================
CREATE TABLE IF NOT EXISTS news_articles (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid             VARCHAR(36)  UNIQUE NOT NULL,
    category_id      BIGINT UNSIGNED NOT NULL,

    -- Content (EN + SI multi-language)
    title            VARCHAR(255) NOT NULL,
    title_si         VARCHAR(255) NULL,
    title_ta         VARCHAR(255) NULL,
    summary          TEXT         NOT NULL COMMENT 'Short preview text',
    summary_si       TEXT         NULL,
    content          LONGTEXT     NOT NULL COMMENT 'Full article content',
    content_si       LONGTEXT     NULL,

    -- Media
    image_url        VARCHAR(500) NULL,
    image_alt        VARCHAR(255) NULL,
    gallery_urls     JSON         NULL COMMENT 'Array of additional image URLs',

    -- Classification
    priority_level   ENUM('low','medium','high','critical') DEFAULT 'medium',
    source           VARCHAR(100) NULL COMMENT 'Meteorology Dept, Mahaweli Authority, etc.',

    -- Geographic scope
    is_nationwide    BOOLEAN         DEFAULT FALSE,
    region_id        BIGINT UNSIGNED NULL,
    dam_id           BIGINT UNSIGNED NULL,
    affected_regions JSON            NULL COMMENT 'Array of region IDs',

    -- Publishing
    status           ENUM('draft','published','archived') DEFAULT 'draft',
    is_featured      BOOLEAN      DEFAULT FALSE,
    publish_date     TIMESTAMP    NULL,
    expiry_date      TIMESTAMP    NULL,

    -- Engagement stats (denormalized for performance)
    view_count       INT          DEFAULT 0,
    save_count       INT          DEFAULT 0,
    share_count      INT          DEFAULT 0,

    -- Push notification flags
    push_sent        BOOLEAN      DEFAULT FALSE,
    push_sent_at     TIMESTAMP    NULL,

    metadata         JSON         NULL,

    -- Audit
    author_id        BIGINT UNSIGNED NULL,
    created_by       BIGINT UNSIGNED NULL,
    updated_by       BIGINT UNSIGNED NULL,
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP    NULL,

    FOREIGN KEY (category_id) REFERENCES news_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (region_id)   REFERENCES regions(id)          ON DELETE SET NULL,
    FOREIGN KEY (dam_id)      REFERENCES dams(id)             ON DELETE SET NULL,
    FOREIGN KEY (author_id)   REFERENCES users(id)            ON DELETE SET NULL,
    FOREIGN KEY (created_by)  REFERENCES users(id)            ON DELETE SET NULL,
    FOREIGN KEY (updated_by)  REFERENCES users(id)            ON DELETE SET NULL,

    INDEX idx_na_category  (category_id),
    INDEX idx_na_status    (status),
    INDEX idx_na_priority  (priority_level),
    INDEX idx_na_publish   (status, publish_date DESC),
    INDEX idx_na_region    (region_id),
    INDEX idx_na_dam       (dam_id),
    INDEX idx_na_featured  (is_featured, publish_date DESC),
    INDEX idx_na_deleted   (deleted_at),
    FULLTEXT INDEX idx_na_search (title, summary, content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 3: news_user_interactions
-- Tracks user engagement: views, saves, shares per article (one row per user+article)
-- ============================================================================
CREATE TABLE IF NOT EXISTS news_user_interactions (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT UNSIGNED NOT NULL,
    article_id          BIGINT UNSIGNED NOT NULL,

    -- Interaction flags
    has_viewed          BOOLEAN      DEFAULT FALSE,
    has_saved           BOOLEAN      DEFAULT FALSE,
    has_shared          BOOLEAN      DEFAULT FALSE,

    -- Timestamps
    viewed_at           TIMESTAMP    NULL,
    saved_at            TIMESTAMP    NULL,
    shared_at           TIMESTAMP    NULL,
    share_platform      VARCHAR(50)  NULL COMMENT 'whatsapp | facebook | copy_link',

    -- Reading progress
    read_progress       INT          DEFAULT 0 COMMENT 'Percentage read 0-100',
    read_time_seconds   INT          DEFAULT 0,

    created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)    REFERENCES users(id)         ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE,

    UNIQUE KEY uk_user_article (user_id, article_id),
    INDEX idx_nui_user    (user_id),
    INDEX idx_nui_article (article_id),
    INDEX idx_nui_saved   (user_id, has_saved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 4: news_subscriptions
-- User preferences for news notification alerts
-- ============================================================================
CREATE TABLE IF NOT EXISTS news_subscriptions (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT UNSIGNED NOT NULL,

    -- Subscription scope (NULL = subscribe to all)
    category_id     BIGINT UNSIGNED NULL COMMENT 'NULL = all categories',
    region_id       BIGINT UNSIGNED NULL COMMENT 'NULL = all regions',

    -- Notification channel preferences
    min_priority    ENUM('low','medium','high','critical') DEFAULT 'medium',
    push_enabled    BOOLEAN      DEFAULT TRUE,
    email_enabled   BOOLEAN      DEFAULT FALSE,
    sms_enabled     BOOLEAN      DEFAULT FALSE,

    is_active       BOOLEAN      DEFAULT TRUE,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)     REFERENCES users(id)            ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES news_categories(id)  ON DELETE CASCADE,
    FOREIGN KEY (region_id)   REFERENCES regions(id)          ON DELETE CASCADE,

    UNIQUE KEY uk_subscription (user_id, category_id, region_id),
    INDEX idx_ns_user   (user_id),
    INDEX idx_ns_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 5: news_push_logs
-- Tracks push-notification delivery statistics per article
-- ============================================================================
CREATE TABLE IF NOT EXISTS news_push_logs (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    article_id        BIGINT UNSIGNED NOT NULL,

    -- Delivery stats
    total_recipients  INT          DEFAULT 0,
    sent_count        INT          DEFAULT 0,
    delivered_count   INT          DEFAULT 0,
    failed_count      INT          DEFAULT 0,
    opened_count      INT          DEFAULT 0,

    -- Provider info
    provider          VARCHAR(50)  NULL COMMENT 'firebase | expo | etc.',
    batch_id          VARCHAR(100) NULL,

    sent_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    completed_at      TIMESTAMP    NULL,
    error_summary     JSON         NULL,

    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE,

    INDEX idx_npl_article (article_id),
    INDEX idx_npl_sent    (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- DEFAULT DATA: Seed news categories
-- ============================================================================
INSERT IGNORE INTO news_categories
    (code, name, name_si, name_ta, filter_key, icon, color, display_order)
VALUES
    ('weather_alert',      'Weather Alert',       'කාලගුණ අනතුරු ඇඟවීම',   NULL, 'weather',    'weather-partly-cloudy', '#3B82F6', 1),
    ('dam_status',         'Dam Status',          'වේල්ල තත්ත්වය',           NULL, 'dam-status', 'water',                 '#06B6D4', 2),
    ('flood_warning',      'Flood Warning',       'ගංවතුර අනතුරු ඇඟවීම',   NULL, 'emergency',  'waves',                 '#EF4444', 3),
    ('landslide_warning',  'Landslide Warning',   'නායයෑම් අනතුරු ඇඟවීම',  NULL, 'emergency',  'terrain',               '#F59E0B', 4),
    ('evacuation',         'Evacuation Notice',   'ඉවත් කිරීමේ දැනුම්දීම', NULL, 'emergency',  'run-fast',              '#DC2626', 5),
    ('general',            'General News',        'සාමාන්‍ය පුවත්',        NULL, 'all',        'newspaper',             '#6B7280', 10);


-- ============================================================================
-- DEFAULT DATA: Add news permissions to the existing permissions table
-- (uses INSERT IGNORE so it won't fail if already present)
-- ============================================================================
INSERT IGNORE INTO permissions (code, name, module, action, description) VALUES
    ('news.view',       'View News',                'news', 'view',   'Can view published news articles'),
    ('news.create',     'Create News',              'news', 'create', 'Can create news articles'),
    ('news.edit',       'Edit News',                'news', 'edit',   'Can edit news articles'),
    ('news.delete',     'Delete News',              'news', 'delete', 'Can delete news articles'),
    ('news.publish',    'Publish News',             'news', 'manage', 'Can publish / unpublish articles'),
    ('news.send_push',  'Send Push Notifications',  'news', 'manage', 'Can trigger push notifications for articles');


-- ============================================================================
-- VIEWS (optional but recommended — re-run safe with CREATE OR REPLACE)
-- ============================================================================

-- View: Published news feed ordered by priority then recency
CREATE OR REPLACE VIEW v_news_feed AS
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
    nc.id        AS category_id,
    nc.code      AS category_code,
    nc.name      AS category_name,
    nc.name_si   AS category_name_si,
    nc.icon      AS category_icon,
    nc.color     AS category_color,
    nc.filter_key,
    r.name       AS region_name,
    d.name       AS dam_name,
    TIMESTAMPDIFF(MINUTE, na.publish_date, NOW()) AS minutes_ago
FROM news_articles na
JOIN  news_categories nc ON na.category_id = nc.id
LEFT JOIN regions r       ON na.region_id  = r.id
LEFT JOIN dams    d       ON na.dam_id     = d.id
WHERE na.status     = 'published'
  AND na.deleted_at IS NULL
  AND (na.expiry_date IS NULL OR na.expiry_date > NOW())
ORDER BY
    (na.priority_level = 'critical') DESC,
    (na.priority_level = 'high')     DESC,
    na.publish_date DESC;


-- View: Articles saved by each user
CREATE OR REPLACE VIEW v_user_saved_news AS
SELECT
    nui.user_id,
    na.id            AS article_id,
    na.uuid,
    na.title,
    na.summary,
    na.image_url,
    na.priority_level,
    nc.name          AS category_name,
    nc.icon          AS category_icon,
    nui.saved_at
FROM news_user_interactions nui
JOIN news_articles   na  ON nui.article_id  = na.id
JOIN news_categories nc  ON na.category_id  = nc.id
WHERE nui.has_saved  = TRUE
  AND na.deleted_at IS NULL
ORDER BY nui.saved_at DESC;


SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- END OF ddas_news_schema.sql
-- ============================================================================
