# Reports Module — Database Schema

## Overview

This schema provides a community-driven issue reporting system for the Dam Disaster Alert System:
- **Report types** with configurable categories and severity
- **User-submitted reports** with media attachments
- **Report workflow** (pending → reviewing → resolved)
- **Assignment and response tracking** for authorities
- **Verification and follow-up** system

> SQL dialect: **MySQL 8+** (InnoDB, `utf8mb4`).

---

## Dependencies (existing tables)

- `users`, `roles` (from `users_rbac_schema.md`)
- `regions`, `dams` (from `dams_schema.md`)

---

## Tables

### 1. Report Types (Lookup Table)

Configurable issue types matching the app's ISSUE_TYPES.

```sql
CREATE TABLE report_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_si VARCHAR(100) NULL,
    name_ta VARCHAR(100) NULL,
    description TEXT NULL,
    
    -- Display
    icon VARCHAR(100) NULL COMMENT 'Icon name: alert-octagon, waves, terrain, cog',
    color VARCHAR(20) NULL COMMENT 'Hex color',
    
    -- Classification
    category ENUM('structural', 'water', 'environmental', 'equipment', 'safety', 'other') DEFAULT 'other',
    default_priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    
    -- Settings
    requires_photo BOOLEAN DEFAULT FALSE,
    requires_location BOOLEAN DEFAULT TRUE,
    auto_alert_threshold INT NULL COMMENT 'Create alert after X reports of same type',
    
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_rt_category (category),
    INDEX idx_rt_active (is_active),
    INDEX idx_rt_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2. Reports

Main reports table - user-submitted issues.

```sql
CREATE TABLE reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    report_number VARCHAR(20) UNIQUE NOT NULL COMMENT 'Human-readable: RPT-2026-00001',
    
    -- Reporter
    user_id BIGINT UNSIGNED NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    
    -- Classification
    report_type_id BIGINT UNSIGNED NOT NULL,
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    
    -- Location
    dam_id BIGINT UNSIGNED NULL,
    region_id BIGINT UNSIGNED NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    location_description VARCHAR(500) NULL COMMENT 'e.g., Near spillway gate #3',
    location_description_si VARCHAR(500) NULL,
    
    -- Content
    title VARCHAR(255) NULL,
    description TEXT NOT NULL,
    description_si TEXT NULL,
    
    -- Status Workflow
    status ENUM('pending', 'reviewing', 'in_progress', 'resolved', 'rejected', 'duplicate') DEFAULT 'pending',
    
    -- Assignment
    assigned_to BIGINT UNSIGNED NULL COMMENT 'User ID of assigned officer',
    assigned_at TIMESTAMP NULL,
    assigned_by BIGINT UNSIGNED NULL,
    
    -- Resolution
    resolution_notes TEXT NULL,
    resolution_notes_si TEXT NULL,
    resolved_at TIMESTAMP NULL,
    resolved_by BIGINT UNSIGNED NULL,
    rejection_reason TEXT NULL,
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP NULL,
    verified_by BIGINT UNSIGNED NULL,
    verification_notes TEXT NULL,
    
    -- Follow-up
    requires_followup BOOLEAN DEFAULT FALSE,
    followup_date DATE NULL,
    
    -- Related
    duplicate_of_id BIGINT UNSIGNED NULL COMMENT 'If marked as duplicate',
    related_alert_id BIGINT UNSIGNED NULL COMMENT 'If alert was created from this',
    
    -- Stats
    view_count INT DEFAULT 0,
    upvote_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    
    metadata JSON NULL,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (report_type_id) REFERENCES report_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE SET NULL,
    FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (duplicate_of_id) REFERENCES reports(id) ON DELETE SET NULL,
    
    INDEX idx_reports_user (user_id),
    INDEX idx_reports_type (report_type_id),
    INDEX idx_reports_dam (dam_id),
    INDEX idx_reports_region (region_id),
    INDEX idx_reports_status (status),
    INDEX idx_reports_priority (priority),
    INDEX idx_reports_assigned (assigned_to),
    INDEX idx_reports_created (created_at DESC),
    INDEX idx_reports_location (latitude, longitude),
    INDEX idx_reports_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3. Report Media

Media attachments (photos/videos) for reports.

```sql
CREATE TABLE report_media (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    report_id BIGINT UNSIGNED NOT NULL,
    
    -- File Info
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500) NULL COMMENT 'CDN URL if applicable',
    file_type ENUM('image', 'video', 'document') NOT NULL,
    mime_type VARCHAR(100) NULL,
    file_size_bytes BIGINT NULL,
    
    -- Image/Video Metadata
    width INT NULL,
    height INT NULL,
    duration_seconds INT NULL COMMENT 'For videos',
    thumbnail_url VARCHAR(500) NULL,
    
    -- Location from EXIF
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    captured_at TIMESTAMP NULL,
    
    -- Display
    display_order INT DEFAULT 0,
    caption VARCHAR(500) NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Audit
    uploaded_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_rm_report (report_id),
    INDEX idx_rm_type (file_type),
    INDEX idx_rm_primary (report_id, is_primary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 4. Report Status History

Tracks status changes for audit trail.

```sql
CREATE TABLE report_status_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    report_id BIGINT UNSIGNED NOT NULL,
    
    previous_status ENUM('pending', 'reviewing', 'in_progress', 'resolved', 'rejected', 'duplicate') NULL,
    new_status ENUM('pending', 'reviewing', 'in_progress', 'resolved', 'rejected', 'duplicate') NOT NULL,
    
    notes TEXT NULL,
    changed_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_rsh_report (report_id),
    INDEX idx_rsh_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 5. Report Comments

Comments/updates on reports from users and authorities.

```sql
CREATE TABLE report_comments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    report_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    
    -- Comment Content
    comment_text TEXT NOT NULL,
    
    -- Type
    comment_type ENUM('user_comment', 'official_response', 'status_update', 'internal_note') DEFAULT 'user_comment',
    is_internal BOOLEAN DEFAULT FALSE COMMENT 'Only visible to authorities',
    
    -- Engagement
    upvote_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_rc_report (report_id),
    INDEX idx_rc_user (user_id),
    INDEX idx_rc_type (comment_type),
    INDEX idx_rc_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 6. Report Upvotes

User upvotes on reports (confirms issue exists).

```sql
CREATE TABLE report_upvotes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    report_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    
    -- Location when upvoting (for verification)
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY uk_report_user (report_id, user_id),
    INDEX idx_ru_report (report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Default Data

### Default Report Types

```sql
INSERT INTO report_types (code, name, name_si, category, icon, color, default_priority, display_order) VALUES
('structural', 'Structural Damage', 'ව්‍යුහාත්මක හානි', 'structural', 'alert-octagon', '#DC2626', 'high', 1),
('water_level', 'Water Level Issue', 'ජල මට්ටම් ගැටලුව', 'water', 'waves', '#2563EB', 'high', 2),
('erosion', 'Erosion', 'ඛාදනය', 'environmental', 'terrain', '#D97706', 'medium', 3),
('equipment', 'Equipment Malfunction', 'උපකරණ දෝෂය', 'equipment', 'cog', '#7C3AED', 'medium', 4),
('seepage', 'Seepage/Leakage', 'කාන්දුවීම', 'structural', 'water-outline', '#EF4444', 'critical', 5),
('debris', 'Debris Blockage', 'සුන්බුන් අවහිරතා', 'environmental', 'delete-sweep', '#F59E0B', 'medium', 6),
('safety_hazard', 'Safety Hazard', 'ආරක්ෂක අන්තරාය', 'safety', 'alert', '#DC2626', 'high', 7),
('pollution', 'Water Pollution', 'ජල දූෂණය', 'environmental', 'water-off', '#059669', 'medium', 8),
('other', 'Other Issue', 'වෙනත් ගැටලුව', 'other', 'information', '#6B7280', 'low', 99);
```

---

## Views

### View: Reports Feed

```sql
CREATE VIEW v_reports_feed AS
SELECT 
    r.id,
    r.uuid,
    r.report_number,
    r.title,
    r.description,
    r.status,
    r.priority,
    r.created_at,
    r.upvote_count,
    r.comment_count,
    r.is_verified,
    r.latitude,
    r.longitude,
    r.location_description,
    -- Reporter
    r.user_id,
    r.is_anonymous,
    CASE WHEN r.is_anonymous THEN 'Anonymous' ELSE u.full_name END AS user_name,
    CASE WHEN r.is_anonymous THEN NULL ELSE u.avatar_url END AS user_avatar,
    -- Type
    rt.id AS report_type_id,
    rt.code AS report_type_code,
    rt.name AS report_type_name,
    rt.name_si AS report_type_name_si,
    rt.icon AS report_type_icon,
    rt.color AS report_type_color,
    -- Location
    d.id AS dam_id,
    d.name AS dam_name,
    reg.name AS region_name,
    -- Primary Media
    (SELECT rm.thumbnail_url FROM report_media rm 
     WHERE rm.report_id = r.id AND rm.is_primary = TRUE LIMIT 1) AS primary_image_url,
    -- Media Count
    (SELECT COUNT(*) FROM report_media rm WHERE rm.report_id = r.id) AS media_count
FROM reports r
JOIN users u ON r.user_id = u.id
JOIN report_types rt ON r.report_type_id = rt.id
LEFT JOIN dams d ON r.dam_id = d.id
LEFT JOIN regions reg ON r.region_id = reg.id
WHERE r.deleted_at IS NULL
ORDER BY r.created_at DESC;
```

### View: Report Details

```sql
CREATE VIEW v_report_details AS
SELECT 
    r.*,
    u.full_name AS reporter_name,
    u.phone_number AS reporter_phone,
    rt.name AS report_type_name,
    rt.icon AS report_type_icon,
    rt.color AS report_type_color,
    d.name AS dam_name,
    d.latitude AS dam_latitude,
    d.longitude AS dam_longitude,
    reg.name AS region_name,
    assigned_user.full_name AS assigned_to_name,
    resolved_user.full_name AS resolved_by_name,
    verified_user.full_name AS verified_by_name
FROM reports r
JOIN users u ON r.user_id = u.id
JOIN report_types rt ON r.report_type_id = rt.id
LEFT JOIN dams d ON r.dam_id = d.id
LEFT JOIN regions reg ON r.region_id = reg.id
LEFT JOIN users assigned_user ON r.assigned_to = assigned_user.id
LEFT JOIN users resolved_user ON r.resolved_by = resolved_user.id
LEFT JOIN users verified_user ON r.verified_by = verified_user.id
WHERE r.deleted_at IS NULL;
```

### View: Reports by Dam Summary

```sql
CREATE VIEW v_dam_reports_summary AS
SELECT 
    d.id AS dam_id,
    d.name AS dam_name,
    COUNT(r.id) AS total_reports,
    SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN r.status = 'reviewing' THEN 1 ELSE 0 END) AS reviewing_count,
    SUM(CASE WHEN r.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_count,
    SUM(CASE WHEN r.status = 'resolved' THEN 1 ELSE 0 END) AS resolved_count,
    SUM(CASE WHEN r.priority = 'critical' THEN 1 ELSE 0 END) AS critical_count,
    SUM(CASE WHEN r.priority = 'high' THEN 1 ELSE 0 END) AS high_priority_count,
    MAX(r.created_at) AS latest_report_at
FROM dams d
LEFT JOIN reports r ON d.id = r.dam_id AND r.deleted_at IS NULL
GROUP BY d.id, d.name;
```

---

## Sample Queries

### Get Reports Feed with Filters

```sql
SELECT * FROM v_reports_feed
WHERE (dam_id = ? OR ? IS NULL)
  AND (report_type_code = ? OR ? IS NULL)
  AND (status = ? OR ? IS NULL)
ORDER BY created_at DESC
LIMIT 20 OFFSET ?;
```

### Create New Report

```sql
-- Generate report number
SET @report_num = CONCAT('RPT-', YEAR(NOW()), '-', LPAD(
    (SELECT COALESCE(MAX(CAST(SUBSTRING(report_number, 10) AS UNSIGNED)), 0) + 1 
     FROM reports WHERE report_number LIKE CONCAT('RPT-', YEAR(NOW()), '-%')), 
    5, '0'));

INSERT INTO reports (uuid, report_number, user_id, report_type_id, dam_id, description, latitude, longitude, status)
VALUES (UUID(), @report_num, ?, ?, ?, ?, ?, ?, 'pending');
```

### Update Report Status

```sql
-- Record history
INSERT INTO report_status_history (report_id, previous_status, new_status, notes, changed_by)
SELECT id, status, ?, ?, ? FROM reports WHERE id = ?;

-- Update status
UPDATE reports 
SET status = ?, 
    updated_at = NOW(),
    resolved_at = CASE WHEN ? = 'resolved' THEN NOW() ELSE resolved_at END,
    resolved_by = CASE WHEN ? = 'resolved' THEN ? ELSE resolved_by END
WHERE id = ?;
```

### Toggle Upvote

```sql
INSERT INTO report_upvotes (report_id, user_id, latitude, longitude)
VALUES (?, ?, ?, ?)
ON DUPLICATE KEY UPDATE created_at = created_at; -- No-op if exists

-- If inserted, increment count
UPDATE reports SET upvote_count = upvote_count + 1 WHERE id = ?;
```

### Search Reports

```sql
SELECT * FROM v_reports_feed
WHERE (description LIKE CONCAT('%', ?, '%') 
    OR dam_name LIKE CONCAT('%', ?, '%')
    OR user_name LIKE CONCAT('%', ?, '%'))
ORDER BY created_at DESC
LIMIT 20;
```

---

## API Permissions

```sql
INSERT INTO permissions (code, name, module, action, description) VALUES
('reports.view', 'View Reports', 'reports', 'view', 'Can view public reports'),
('reports.create', 'Create Reports', 'reports', 'create', 'Can submit new reports'),
('reports.edit_own', 'Edit Own Reports', 'reports', 'edit', 'Can edit own reports'),
('reports.delete_own', 'Delete Own Reports', 'reports', 'delete', 'Can delete own reports'),
('reports.view_all', 'View All Reports', 'reports', 'view', 'Can view all reports including internal'),
('reports.edit_all', 'Edit All Reports', 'reports', 'edit', 'Can edit any report'),
('reports.delete_all', 'Delete All Reports', 'reports', 'delete', 'Can delete any report'),
('reports.assign', 'Assign Reports', 'reports', 'manage', 'Can assign reports to users'),
('reports.verify', 'Verify Reports', 'reports', 'manage', 'Can verify reports'),
('reports.resolve', 'Resolve Reports', 'reports', 'manage', 'Can resolve/reject reports'),
('reports.comment_internal', 'Add Internal Comments', 'reports', 'manage', 'Can add internal notes');
```

---

## Schema Summary

| Table | Purpose |
|-------|---------|
| `report_types` | Issue type lookup (structural, water-level, etc.) |
| `reports` | Main reports with status workflow |
| `report_media` | Photo/video attachments |
| `report_status_history` | Status change audit trail |
| `report_comments` | User and official comments |
| `report_upvotes` | Community verification via upvotes |

**Total: 6 tables**

---

## App Integration Notes

### Matches App Types

```typescript
// App's IssueType maps to report_types.code
type IssueType = 'structural' | 'water-level' | 'erosion' | 'equipment' | 'other';

// App's status maps to reports.status
type Status = 'pending' | 'reviewing' | 'resolved';
```

### Media Handling

- `report_media` stores multiple images/videos per report
- `MediaItem` from app maps to individual `report_media` rows
- Support for both camera and gallery uploads

### Status Colors (from app)

| Status | Color |
|--------|-------|
| pending | #F59E0B (amber) |
| reviewing | #3B82F6 (blue) |
| resolved | #10B981 (green) |
