# Alerts Module — Database Schema

## Overview

This schema provides a comprehensive alert/notification system for the Dam Disaster Alert System:
- **Alert types** with configurable severity and actions
- **Alerts** triggered by dam conditions, weather, or manual broadcast
- **User alert delivery** with multi-channel tracking
- **User acknowledgments** and responses
- **Geofenced alerts** based on hazard zones

> SQL dialect: **MySQL 8+** (InnoDB, `utf8mb4`).

---

## Dependencies (existing tables)

- `users`, `roles` (from `users_rbac_schema.md`)
- `regions`, `dams`, `dam_hazard_zones`, `hazard_levels` (from `dams_schema.md`)

---

## Tables

### 1. Alert Types (Lookup Table)

Configurable alert types with severity levels and default actions.

```sql
CREATE TABLE alert_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_si VARCHAR(100) NULL,
    name_ta VARCHAR(100) NULL,
    description TEXT NULL,
    
    -- Classification
    category ENUM('dam', 'weather', 'flood', 'evacuation', 'system', 'general') NOT NULL,
    severity ENUM('info', 'warning', 'critical', 'emergency') DEFAULT 'warning',
    
    -- Display
    icon VARCHAR(100) NULL COMMENT 'Icon name for mobile app',
    color VARCHAR(20) NULL COMMENT 'Hex color',
    sound VARCHAR(100) NULL COMMENT 'Notification sound',
    
    -- Default Behavior
    requires_acknowledgment BOOLEAN DEFAULT FALSE,
    auto_expire_hours INT NULL COMMENT 'Auto-expire after X hours',
    default_channels JSON NULL COMMENT '["push", "sms", "email"]',
    
    -- Templates
    title_template VARCHAR(255) NULL COMMENT 'Template with {dam_name}, {level}',
    title_template_si VARCHAR(255) NULL,
    body_template TEXT NULL,
    body_template_si TEXT NULL,
    
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_at_category (category),
    INDEX idx_at_severity (severity),
    INDEX idx_at_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2. Alerts

Main alerts table - system-generated or manual broadcasts.

```sql
CREATE TABLE alerts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    alert_type_id BIGINT UNSIGNED NOT NULL,
    
    -- Content
    title VARCHAR(255) NOT NULL,
    title_si VARCHAR(255) NULL,
    title_ta VARCHAR(255) NULL,
    message TEXT NOT NULL,
    message_si TEXT NULL,
    message_ta TEXT NULL,
    
    -- Severity (can override type default)
    severity ENUM('info', 'warning', 'critical', 'emergency') NOT NULL,
    
    -- Source
    source ENUM('automatic', 'manual', 'scheduled', 'external') DEFAULT 'manual',
    source_system VARCHAR(100) NULL COMMENT 'sensor, weather_api, admin_panel',
    
    -- Geographic Scope
    scope ENUM('nationwide', 'regional', 'dam_specific', 'zone_specific') DEFAULT 'regional',
    region_id BIGINT UNSIGNED NULL,
    dam_id BIGINT UNSIGNED NULL,
    hazard_zone_id BIGINT UNSIGNED NULL,
    affected_zones JSON NULL COMMENT 'Array of zone IDs',
    affected_regions JSON NULL COMMENT 'Array of region IDs',
    
    -- Location for map display
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    radius_km DECIMAL(8, 2) NULL COMMENT 'Alert radius from lat/lng',
    
    -- Hazard Context
    hazard_level_id BIGINT UNSIGNED NULL,
    risk_score DECIMAL(5, 2) NULL,
    
    -- Trigger Info (for automatic alerts)
    triggered_by_assessment_id BIGINT UNSIGNED NULL,
    triggered_by_sensor_id BIGINT UNSIGNED NULL,
    trigger_value DECIMAL(12, 4) NULL,
    trigger_threshold DECIMAL(12, 4) NULL,
    
    -- Media
    image_url VARCHAR(500) NULL,
    
    -- Instructions
    action_required VARCHAR(255) NULL COMMENT 'Evacuate, Shelter in place, etc.',
    action_required_si VARCHAR(255) NULL,
    instructions TEXT NULL,
    instructions_si TEXT NULL,
    safe_location_ids JSON NULL COMMENT 'Recommended evacuation points',
    
    -- Status
    status ENUM('draft', 'active', 'escalated', 'resolved', 'expired', 'cancelled') DEFAULT 'draft',
    
    -- Timing
    issued_at TIMESTAMP NULL,
    effective_from TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    
    -- Resolution
    resolution_notes TEXT NULL,
    resolved_by BIGINT UNSIGNED NULL,
    
    -- Stats (denormalized)
    recipient_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    read_count INT DEFAULT 0,
    acknowledged_count INT DEFAULT 0,
    
    metadata JSON NULL,
    
    -- Audit
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (alert_type_id) REFERENCES alert_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE SET NULL,
    FOREIGN KEY (hazard_zone_id) REFERENCES dam_hazard_zones(id) ON DELETE SET NULL,
    FOREIGN KEY (hazard_level_id) REFERENCES hazard_levels(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_alerts_type (alert_type_id),
    INDEX idx_alerts_severity (severity),
    INDEX idx_alerts_status (status),
    INDEX idx_alerts_dam (dam_id),
    INDEX idx_alerts_region (region_id),
    INDEX idx_alerts_zone (hazard_zone_id),
    INDEX idx_alerts_issued (issued_at DESC),
    INDEX idx_alerts_active (status, issued_at DESC),
    INDEX idx_alerts_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3. Alert User Deliveries

Tracks delivery to individual users across channels.

```sql
CREATE TABLE alert_user_deliveries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    alert_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    
    -- Delivery Channels
    push_status ENUM('pending', 'sent', 'delivered', 'failed', 'disabled') DEFAULT 'pending',
    push_sent_at TIMESTAMP NULL,
    push_delivered_at TIMESTAMP NULL,
    push_error VARCHAR(500) NULL,
    
    sms_status ENUM('pending', 'sent', 'delivered', 'failed', 'disabled') DEFAULT 'disabled',
    sms_sent_at TIMESTAMP NULL,
    sms_delivered_at TIMESTAMP NULL,
    sms_error VARCHAR(500) NULL,
    
    email_status ENUM('pending', 'sent', 'delivered', 'failed', 'disabled') DEFAULT 'disabled',
    email_sent_at TIMESTAMP NULL,
    email_delivered_at TIMESTAMP NULL,
    email_error VARCHAR(500) NULL,
    
    -- User Engagement
    read_at TIMESTAMP NULL,
    
    -- User Location at Delivery
    user_latitude DECIMAL(10, 8) NULL,
    user_longitude DECIMAL(11, 8) NULL,
    distance_to_alert_km DECIMAL(8, 2) NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY uk_alert_user (alert_id, user_id),
    INDEX idx_aud_alert (alert_id),
    INDEX idx_aud_user (user_id),
    INDEX idx_aud_push (push_status),
    INDEX idx_aud_unread (user_id, read_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 4. Alert Acknowledgments

User responses and acknowledgments to alerts.

```sql
CREATE TABLE alert_acknowledgments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    alert_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    
    -- Response Type
    response_type ENUM('acknowledged', 'safe', 'need_help', 'evacuating', 'evacuated') NOT NULL,
    
    -- Location at Response
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    
    -- Additional Info
    notes TEXT NULL,
    
    responded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY uk_ack_alert_user (alert_id, user_id),
    INDEX idx_ack_alert (alert_id),
    INDEX idx_ack_user (user_id),
    INDEX idx_ack_response (response_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 5. Alert Escalations

Tracks alert escalation history.

```sql
CREATE TABLE alert_escalations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    alert_id BIGINT UNSIGNED NOT NULL,
    
    -- Escalation Details
    previous_severity ENUM('info', 'warning', 'critical', 'emergency') NOT NULL,
    new_severity ENUM('info', 'warning', 'critical', 'emergency') NOT NULL,
    
    reason TEXT NULL,
    
    -- Trigger
    escalated_by ENUM('automatic', 'manual') DEFAULT 'manual',
    escalated_by_user_id BIGINT UNSIGNED NULL,
    
    escalated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
    FOREIGN KEY (escalated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_esc_alert (alert_id),
    INDEX idx_esc_date (escalated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 6. User Alert Preferences

User preferences for receiving alerts.

```sql
CREATE TABLE user_alert_preferences (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    
    -- Global Settings
    alerts_enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME NULL COMMENT 'e.g., 22:00',
    quiet_hours_end TIME NULL COMMENT 'e.g., 07:00',
    override_quiet_for_emergency BOOLEAN DEFAULT TRUE,
    
    -- Channel Preferences
    push_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    email_enabled BOOLEAN DEFAULT FALSE,
    
    -- Severity Filter
    min_severity ENUM('info', 'warning', 'critical', 'emergency') DEFAULT 'warning',
    
    -- Location-based Alerts
    location_alerts_enabled BOOLEAN DEFAULT TRUE,
    home_region_id BIGINT UNSIGNED NULL,
    alert_radius_km DECIMAL(8, 2) DEFAULT 50.00,
    
    -- Language Preference
    preferred_language ENUM('en', 'si', 'ta') DEFAULT 'en',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (home_region_id) REFERENCES regions(id) ON DELETE SET NULL,
    
    UNIQUE KEY uk_user_prefs (user_id),
    INDEX idx_uap_region (home_region_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Default Data

### Default Alert Types

```sql
INSERT INTO alert_types (code, name, name_si, category, severity, icon, color, requires_acknowledgment, title_template, display_order) VALUES
-- Dam Alerts
('dam_water_high', 'High Water Level', 'ඉහළ ජල මට්ටම', 'dam', 'warning', 'water-alert', '#F59E0B', FALSE, 'High Water Level at {dam_name}', 1),
('dam_water_critical', 'Critical Water Level', 'ආන්තික ජල මට්ටම', 'dam', 'critical', 'water-alert', '#EF4444', TRUE, 'CRITICAL: Water Level at {dam_name}', 2),
('dam_spillway_open', 'Spillway Gates Opening', 'වාන් දොරටු විවෘත කිරීම', 'dam', 'warning', 'gate', '#3B82F6', FALSE, 'Spillway Opening at {dam_name}', 3),
('dam_emergency_release', 'Emergency Water Release', 'හදිසි ජල මුදා හැරීම', 'dam', 'emergency', 'waves', '#DC2626', TRUE, 'EMERGENCY: Water Release at {dam_name}', 4),

-- Flood Alerts
('flood_warning', 'Flood Warning', 'ගංවතුර අනතුරු ඇඟවීම', 'flood', 'warning', 'waves', '#F59E0B', FALSE, 'Flood Warning for {region_name}', 10),
('flood_critical', 'Severe Flood Alert', 'දරුණු ගංවතුර අනතුර', 'flood', 'critical', 'waves', '#EF4444', TRUE, 'SEVERE FLOOD: {region_name}', 11),

-- Weather Alerts
('weather_heavy_rain', 'Heavy Rainfall Warning', 'අධික වර්ෂාපතන අනතුරු ඇඟවීම', 'weather', 'warning', 'weather-pouring', '#3B82F6', FALSE, 'Heavy Rain Expected in {region_name}', 20),
('weather_storm', 'Storm Warning', 'කුණාටු අනතුරු ඇඟවීම', 'weather', 'critical', 'weather-lightning', '#7C3AED', FALSE, 'Storm Warning for {region_name}', 21),

-- Evacuation
('evacuation_advisory', 'Evacuation Advisory', 'ඉවත්වීමේ උපදේශනය', 'evacuation', 'warning', 'run', '#F59E0B', FALSE, 'Evacuation Advisory: {zone_name}', 30),
('evacuation_order', 'Evacuation Order', 'ඉවත්වීමේ නියෝගය', 'evacuation', 'emergency', 'run-fast', '#DC2626', TRUE, 'EVACUATE NOW: {zone_name}', 31),

-- System
('system_test', 'System Test Alert', 'පද්ධති පරීක්ෂණ අනතුරු ඇඟවීම', 'system', 'info', 'bell-ring', '#6B7280', FALSE, 'Test Alert - Please Ignore', 99);
```

---

## Views

### View: Active Alerts Feed

```sql
CREATE VIEW v_active_alerts AS
SELECT 
    a.id,
    a.uuid,
    a.title,
    a.title_si,
    a.message,
    a.severity,
    a.status,
    a.issued_at,
    a.expires_at,
    a.latitude,
    a.longitude,
    a.image_url,
    a.action_required,
    a.recipient_count,
    a.read_count,
    a.acknowledged_count,
    at.code AS alert_type_code,
    at.name AS alert_type_name,
    at.icon AS alert_type_icon,
    at.color AS alert_type_color,
    at.category,
    r.name AS region_name,
    d.name AS dam_name,
    hl.name AS hazard_level_name,
    hl.color AS hazard_level_color
FROM alerts a
JOIN alert_types at ON a.alert_type_id = at.id
LEFT JOIN regions r ON a.region_id = r.id
LEFT JOIN dams d ON a.dam_id = d.id
LEFT JOIN hazard_levels hl ON a.hazard_level_id = hl.id
WHERE a.status = 'active'
  AND (a.expires_at IS NULL OR a.expires_at > NOW())
ORDER BY 
    a.severity = 'emergency' DESC,
    a.severity = 'critical' DESC,
    a.issued_at DESC;
```

### View: User Alert Inbox

```sql
CREATE VIEW v_user_alert_inbox AS
SELECT 
    aud.user_id,
    a.id AS alert_id,
    a.uuid,
    a.title,
    a.title_si,
    a.message,
    a.severity,
    a.issued_at,
    a.image_url,
    at.icon AS alert_type_icon,
    at.color AS alert_type_color,
    at.category,
    d.name AS dam_name,
    r.name AS region_name,
    aud.read_at,
    aud.push_delivered_at,
    CASE WHEN aud.read_at IS NULL THEN TRUE ELSE FALSE END AS is_unread,
    aa.response_type AS user_response
FROM alert_user_deliveries aud
JOIN alerts a ON aud.alert_id = a.id
JOIN alert_types at ON a.alert_type_id = at.id
LEFT JOIN dams d ON a.dam_id = d.id
LEFT JOIN regions r ON a.region_id = r.id
LEFT JOIN alert_acknowledgments aa ON a.id = aa.alert_id AND aud.user_id = aa.user_id
WHERE a.status IN ('active', 'resolved')
ORDER BY a.issued_at DESC;
```

### View: Alert Response Summary

```sql
CREATE VIEW v_alert_response_summary AS
SELECT 
    a.id AS alert_id,
    a.title,
    a.severity,
    a.issued_at,
    a.recipient_count,
    a.delivered_count,
    a.read_count,
    a.acknowledged_count,
    COUNT(CASE WHEN aa.response_type = 'safe' THEN 1 END) AS safe_count,
    COUNT(CASE WHEN aa.response_type = 'need_help' THEN 1 END) AS need_help_count,
    COUNT(CASE WHEN aa.response_type = 'evacuating' THEN 1 END) AS evacuating_count,
    COUNT(CASE WHEN aa.response_type = 'evacuated' THEN 1 END) AS evacuated_count,
    ROUND(a.read_count * 100.0 / NULLIF(a.recipient_count, 0), 2) AS read_rate,
    ROUND(a.acknowledged_count * 100.0 / NULLIF(a.recipient_count, 0), 2) AS ack_rate
FROM alerts a
LEFT JOIN alert_acknowledgments aa ON a.id = aa.alert_id
WHERE a.status IN ('active', 'resolved')
GROUP BY a.id, a.title, a.severity, a.issued_at, 
         a.recipient_count, a.delivered_count, a.read_count, a.acknowledged_count;
```

---

## Sample Queries

### Get User's Unread Alerts

```sql
SELECT * FROM v_user_alert_inbox
WHERE user_id = ? AND is_unread = TRUE
ORDER BY issued_at DESC;
```

### Create Alert and Queue Deliveries

```sql
-- Insert alert
INSERT INTO alerts (uuid, alert_type_id, title, message, severity, source, scope, dam_id, region_id, status, issued_at)
VALUES (UUID(), ?, ?, ?, ?, 'automatic', 'dam_specific', ?, ?, 'active', NOW());

-- Queue deliveries to users in affected region
INSERT INTO alert_user_deliveries (alert_id, user_id, push_status)
SELECT 
    @alert_id,
    u.id,
    CASE WHEN uap.push_enabled = TRUE THEN 'pending' ELSE 'disabled' END
FROM users u
LEFT JOIN user_alert_preferences uap ON u.id = uap.user_id
WHERE u.status = 'active'
  AND (uap.alerts_enabled IS NULL OR uap.alerts_enabled = TRUE)
  AND (u.last_known_latitude IS NOT NULL 
       OR EXISTS (SELECT 1 FROM user_safe_locations usl 
                  WHERE usl.user_id = u.id AND usl.region_id = ?));
```

### Mark Alert as Read

```sql
UPDATE alert_user_deliveries 
SET read_at = NOW(), updated_at = NOW()
WHERE alert_id = ? AND user_id = ? AND read_at IS NULL;

UPDATE alerts SET read_count = read_count + 1 WHERE id = ?;
```

### Acknowledge Alert

```sql
INSERT INTO alert_acknowledgments (alert_id, user_id, response_type, latitude, longitude)
VALUES (?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE 
    response_type = VALUES(response_type),
    latitude = VALUES(latitude),
    longitude = VALUES(longitude),
    responded_at = NOW();

UPDATE alerts SET acknowledged_count = acknowledged_count + 1 WHERE id = ?;
```

### Get Alerts Near Location

```sql
SELECT 
    a.*,
    (6371 * ACOS(
        COS(RADIANS(?)) * COS(RADIANS(a.latitude)) *
        COS(RADIANS(a.longitude) - RADIANS(?)) +
        SIN(RADIANS(?)) * SIN(RADIANS(a.latitude))
    )) AS distance_km
FROM alerts a
WHERE a.status = 'active'
  AND a.latitude IS NOT NULL
  AND (a.expires_at IS NULL OR a.expires_at > NOW())
HAVING distance_km <= COALESCE(a.radius_km, 50)
ORDER BY a.severity = 'emergency' DESC, distance_km ASC;
```

---

## API Permissions

```sql
INSERT INTO permissions (code, name, module, action, description) VALUES
('alerts.view', 'View Alerts', 'alerts', 'view', 'Can view alerts'),
('alerts.create', 'Create Alerts', 'alerts', 'create', 'Can create new alerts'),
('alerts.edit', 'Edit Alerts', 'alerts', 'edit', 'Can edit alerts'),
('alerts.delete', 'Delete Alerts', 'alerts', 'delete', 'Can delete alerts'),
('alerts.broadcast', 'Broadcast Alerts', 'alerts', 'manage', 'Can send alerts to all users'),
('alerts.escalate', 'Escalate Alerts', 'alerts', 'manage', 'Can escalate alert severity'),
('alerts.resolve', 'Resolve Alerts', 'alerts', 'manage', 'Can resolve/close alerts'),
('alerts.view_responses', 'View Alert Responses', 'alerts', 'view', 'Can view user acknowledgments');
```

---

## Schema Summary

| Table | Purpose |
|-------|---------|
| `alert_types` | Lookup table for alert categories |
| `alerts` | Main alerts content |
| `alert_user_deliveries` | Per-user delivery tracking |
| `alert_acknowledgments` | User responses to alerts |
| `alert_escalations` | Escalation history |
| `user_alert_preferences` | User notification settings |

**Total: 6 tables**

---

## Integration Notes

### Trigger from Dam Assessment

When `dam_hazard_assessments` detects a level change:

```sql
-- In application logic or trigger
IF new_status IN ('high', 'severe', 'critical') THEN
    INSERT INTO alerts (...)
    SELECT appropriate alert_type based on severity;
END IF;
```

### Link to Emergency Module

- When alert severity = 'emergency', can auto-trigger SOS notifications
- `safe_location_ids` links to `system_safe_locations` from emergency schema

### Link to News Module

- Critical alerts can auto-generate news articles
- `news_articles.affected_regions` can reference same regions as alerts
