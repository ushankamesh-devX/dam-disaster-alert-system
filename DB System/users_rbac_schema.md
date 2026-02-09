# Users & RBAC (Role-Based Access Control) Database Schema

## Overview

This schema provides a dynamic role-based access control system where:
- Roles can be created/edited/deleted dynamically from admin panel
- Permissions can be assigned to any role
- User-specific permission overrides are supported
- Full audit trail for role changes

---

## Tables

### 1. Permissions Table

All available system permissions.

```sql
CREATE TABLE permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    module VARCHAR(100) NOT NULL COMMENT 'e.g., users, dams, alerts, reports, settings',
    action VARCHAR(50) NOT NULL COMMENT 'e.g., view, create, edit, delete, manage',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_permission_module (module),
    INDEX idx_permission_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2. Roles Table

Dynamic roles that can be managed from admin panel.

```sql
CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_si VARCHAR(100),
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE COMMENT 'System roles cannot be deleted',
    is_default BOOLEAN DEFAULT FALSE COMMENT 'Default role for new users',
    priority_level INT DEFAULT 0 COMMENT 'Higher = more authority',
    color VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role_code (code),
    INDEX idx_role_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3. Role-Permissions Junction Table

Maps permissions to roles (many-to-many).

```sql
CREATE TABLE role_permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    granted_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE KEY uk_role_permission (role_id, permission_id),
    INDEX idx_rp_role (role_id),
    INDEX idx_rp_permission (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 4. Users Table

All app users and admins with dynamic role reference.

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    role_id BIGINT UNSIGNED NOT NULL,
    status ENUM('active', 'inactive', 'suspended', 'pending_verification') DEFAULT 'pending_verification',
    language_preference ENUM('en', 'si', 'ta') DEFAULT 'en',
    notification_enabled BOOLEAN DEFAULT TRUE,
    push_token VARCHAR(500),
    last_known_latitude DECIMAL(10, 8),
    last_known_longitude DECIMAL(11, 8),
    last_location_update TIMESTAMP,
    email_verified_at TIMESTAMP NULL,
    phone_verified_at TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role_id),
    INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 5. User-Specific Permission Overrides

For special cases where user needs extra or restricted permissions.

```sql
CREATE TABLE user_permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    is_granted BOOLEAN DEFAULT TRUE COMMENT 'TRUE=grant, FALSE=revoke (override role)',
    granted_by BIGINT UNSIGNED,
    reason TEXT,
    expires_at TIMESTAMP NULL COMMENT 'Temporary permission grant',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_user_permission (user_id, permission_id),
    INDEX idx_up_user (user_id),
    INDEX idx_up_permission (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 6. User Role Change History

Audit trail for all role changes.

```sql
CREATE TABLE user_role_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    old_role_id BIGINT UNSIGNED,
    new_role_id BIGINT UNSIGNED NOT NULL,
    changed_by BIGINT UNSIGNED,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (old_role_id) REFERENCES roles(id) ON DELETE SET NULL,
    FOREIGN KEY (new_role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_role_history_user (user_id),
    INDEX idx_role_history_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 7. Admin Sessions

Track admin login sessions.

```sql
CREATE TABLE admin_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token),
    INDEX idx_session_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 8. User Activity Logs

Track user actions for audit.

```sql
CREATE TABLE user_activity_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    activity_type ENUM('login', 'logout', 'password_change', 'profile_update', 'report_submit', 'alert_view', 'location_share', 'emergency_call', 'role_change') NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    device_info VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_activity_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Default Data

### Default Roles

```sql
INSERT INTO roles (code, name, description, is_system_role, is_default, priority_level, color) VALUES
('super_admin', 'Super Administrator', 'Full system access with all permissions', TRUE, FALSE, 100, '#DC2626'),
('admin', 'Administrator', 'Administrative access to manage system', TRUE, FALSE, 80, '#7C3AED'),
('operator', 'Dam Operator', 'Can monitor and operate dam controls', TRUE, FALSE, 60, '#2563EB'),
('moderator', 'Content Moderator', 'Can review reports and manage content', TRUE, FALSE, 40, '#D97706'),
('user', 'Regular User', 'Standard mobile app user', TRUE, TRUE, 10, '#22C55E');
```

### Default Permissions

```sql
-- User Management Permissions
INSERT INTO permissions (code, name, module, action, description) VALUES
('users.view', 'View Users', 'users', 'view', 'Can view user list and details'),
('users.create', 'Create Users', 'users', 'create', 'Can create new users'),
('users.edit', 'Edit Users', 'users', 'edit', 'Can edit user information'),
('users.delete', 'Delete Users', 'users', 'delete', 'Can delete users'),
('users.change_role', 'Change User Role', 'users', 'manage', 'Can change user roles'),
('users.suspend', 'Suspend Users', 'users', 'manage', 'Can suspend/activate users');

-- Role Management Permissions
INSERT INTO permissions (code, name, module, action, description) VALUES
('roles.view', 'View Roles', 'roles', 'view', 'Can view roles'),
('roles.create', 'Create Roles', 'roles', 'create', 'Can create new roles'),
('roles.edit', 'Edit Roles', 'roles', 'edit', 'Can edit role details'),
('roles.delete', 'Delete Roles', 'roles', 'delete', 'Can delete roles'),
('roles.assign_permissions', 'Assign Permissions', 'roles', 'manage', 'Can assign permissions to roles');

-- Dam Management Permissions
INSERT INTO permissions (code, name, module, action, description) VALUES
('dams.view', 'View Dams', 'dams', 'view', 'Can view dam information'),
('dams.create', 'Create Dams', 'dams', 'create', 'Can add new dams'),
('dams.edit', 'Edit Dams', 'dams', 'edit', 'Can edit dam details'),
('dams.delete', 'Delete Dams', 'dams', 'delete', 'Can delete dams'),
('dams.operate_gates', 'Operate Gates', 'dams', 'operate', 'Can open/close dam gates'),
('dams.view_sensors', 'View Sensor Data', 'dams', 'view', 'Can view sensor readings'),
('dams.manage_sensors', 'Manage Sensors', 'dams', 'manage', 'Can add/edit/delete sensors');

-- Alert Management Permissions
INSERT INTO permissions (code, name, module, action, description) VALUES
('alerts.view', 'View Alerts', 'alerts', 'view', 'Can view alerts'),
('alerts.create', 'Create Alerts', 'alerts', 'create', 'Can create new alerts'),
('alerts.edit', 'Edit Alerts', 'alerts', 'edit', 'Can edit alerts'),
('alerts.delete', 'Delete Alerts', 'alerts', 'delete', 'Can delete alerts'),
('alerts.broadcast', 'Broadcast Alerts', 'alerts', 'manage', 'Can send alerts to all users'),
('alerts.acknowledge', 'Acknowledge Alerts', 'alerts', 'manage', 'Can acknowledge alerts');

-- Report Management Permissions
INSERT INTO permissions (code, name, module, action, description) VALUES
('reports.view', 'View Reports', 'reports', 'view', 'Can view user reports'),
('reports.create', 'Create Reports', 'reports', 'create', 'Can submit reports'),
('reports.review', 'Review Reports', 'reports', 'edit', 'Can review and update report status'),
('reports.delete', 'Delete Reports', 'reports', 'delete', 'Can delete reports'),
('reports.assign', 'Assign Reports', 'reports', 'manage', 'Can assign reports to users');

-- News/Content Permissions
INSERT INTO permissions (code, name, module, action, description) VALUES
('news.view', 'View News', 'news', 'view', 'Can view news articles'),
('news.create', 'Create News', 'news', 'create', 'Can create news articles'),
('news.edit', 'Edit News', 'news', 'edit', 'Can edit news articles'),
('news.delete', 'Delete News', 'news', 'delete', 'Can delete news articles'),
('news.publish', 'Publish News', 'news', 'manage', 'Can publish/unpublish news');

-- Safe Locations Permissions
INSERT INTO permissions (code, name, module, action, description) VALUES
('locations.view', 'View Safe Locations', 'locations', 'view', 'Can view safe locations'),
('locations.create', 'Create Safe Locations', 'locations', 'create', 'Can add safe locations'),
('locations.edit', 'Edit Safe Locations', 'locations', 'edit', 'Can edit safe locations'),
('locations.delete', 'Delete Safe Locations', 'locations', 'delete', 'Can delete safe locations');

-- Settings Permissions
INSERT INTO permissions (code, name, module, action, description) VALUES
('settings.view', 'View Settings', 'settings', 'view', 'Can view system settings'),
('settings.edit', 'Edit Settings', 'settings', 'edit', 'Can modify system settings');

-- Audit/Logs Permissions
INSERT INTO permissions (code, name, module, action, description) VALUES
('audit.view', 'View Audit Logs', 'audit', 'view', 'Can view audit logs'),
('audit.export', 'Export Audit Logs', 'audit', 'manage', 'Can export audit data');
```

### Assign Permissions to Roles

```sql
-- Super Admin gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE code = 'super_admin'),
    id
FROM permissions;

-- Admin gets most permissions (except role deletion and settings)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE code = 'admin'),
    id
FROM permissions 
WHERE code NOT IN ('roles.delete', 'settings.edit');

-- Operator gets dam and alert related permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE code = 'operator'),
    id
FROM permissions 
WHERE module IN ('dams', 'alerts') 
   OR code IN ('reports.view', 'reports.create', 'locations.view');

-- Moderator gets report and content permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE code = 'moderator'),
    id
FROM permissions 
WHERE module IN ('reports', 'news') 
   OR code IN ('users.view', 'dams.view', 'alerts.view', 'locations.view');

-- Regular User gets basic view and create permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE code = 'user'),
    id
FROM permissions 
WHERE code IN ('dams.view', 'alerts.view', 'reports.view', 'reports.create', 
               'news.view', 'locations.view');
```

---

## Useful Views

### View: User with Role Details

```sql
CREATE VIEW v_users_with_roles AS
SELECT 
    u.id,
    u.uuid,
    u.full_name,
    u.email,
    u.phone_number,
    u.status,
    r.id AS role_id,
    r.code AS role_code,
    r.name AS role_name,
    r.priority_level,
    u.last_login_at,
    u.created_at
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.deleted_at IS NULL;
```

### View: Role with Permission Count

```sql
CREATE VIEW v_roles_with_permissions AS
SELECT 
    r.id,
    r.code,
    r.name,
    r.description,
    r.priority_level,
    r.is_system_role,
    r.is_active,
    COUNT(rp.permission_id) AS permission_count,
    (SELECT COUNT(*) FROM users WHERE role_id = r.id AND deleted_at IS NULL) AS user_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id;
```

### View: All User Permissions (Role + User-specific)

```sql
CREATE VIEW v_user_permissions AS
SELECT 
    u.id AS user_id,
    u.full_name,
    p.id AS permission_id,
    p.code AS permission_code,
    p.name AS permission_name,
    p.module,
    p.action,
    'role' AS source,
    TRUE AS is_granted
FROM users u
JOIN roles r ON u.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.deleted_at IS NULL

UNION ALL

SELECT 
    u.id AS user_id,
    u.full_name,
    p.id AS permission_id,
    p.code AS permission_code,
    p.name AS permission_name,
    p.module,
    p.action,
    'user_override' AS source,
    up.is_granted
FROM users u
JOIN user_permissions up ON u.id = up.user_id
JOIN permissions p ON up.permission_id = p.id
WHERE u.deleted_at IS NULL
  AND (up.expires_at IS NULL OR up.expires_at > NOW());
```

---

## Stored Procedure: Check User Permission

```sql
DELIMITER //

CREATE PROCEDURE sp_check_user_permission(
    IN p_user_id BIGINT,
    IN p_permission_code VARCHAR(100),
    OUT p_has_permission BOOLEAN
)
BEGIN
    DECLARE v_role_permission INT DEFAULT 0;
    DECLARE v_user_override INT DEFAULT NULL;
    DECLARE v_user_granted BOOLEAN DEFAULT NULL;
    
    -- Check role permission
    SELECT COUNT(*) INTO v_role_permission
    FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN role_permissions rp ON r.id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = p_user_id 
      AND p.code = p_permission_code
      AND u.deleted_at IS NULL
      AND r.is_active = TRUE
      AND p.is_active = TRUE;
    
    -- Check user-specific override
    SELECT up.is_granted INTO v_user_granted
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = p_user_id 
      AND p.code = p_permission_code
      AND (up.expires_at IS NULL OR up.expires_at > NOW())
    LIMIT 1;
    
    -- Determine final permission
    IF v_user_granted IS NOT NULL THEN
        SET p_has_permission = v_user_granted;
    ELSE
        SET p_has_permission = (v_role_permission > 0);
    END IF;
END //

DELIMITER ;

-- Usage: 
-- CALL sp_check_user_permission(1, 'dams.operate_gates', @result); 
-- SELECT @result;
```

---

## Entity Relationship Diagram

```
┌─────────────────┐
│   permissions   │
│─────────────────│
│ id, code, name  │
│ module, action  │
└────────┬────────┘
         │
         │ (many-to-many)
         ▼
┌─────────────────┐      ┌──────────────────┐
│role_permissions │◄────►│      roles       │
│─────────────────│      │──────────────────│
│ role_id         │      │ id, code, name   │
│ permission_id   │      │ priority_level   │
└─────────────────┘      │ is_system_role   │
                         └────────┬─────────┘
                                  │
                                  │ (one-to-many)
                                  ▼
┌─────────────────┐      ┌──────────────────┐
│user_permissions │◄────►│      users       │
│─────────────────│      │──────────────────│
│ user_id         │      │ id, role_id      │
│ permission_id   │      │ email, status    │
│ is_granted      │      └────────┬─────────┘
│ expires_at      │               │
└─────────────────┘               ▼
                         ┌──────────────────┐
                         │user_role_history │
                         │──────────────────│
                         │ old_role_id      │
                         │ new_role_id      │
                         │ changed_by       │
                         └──────────────────┘
```

---

## Summary

| Table | Purpose |
|-------|---------|
| `permissions` | All available system permissions |
| `roles` | Dynamic roles (admin can create/edit) |
| `role_permissions` | Maps permissions to roles |
| `users` | Users with foreign key to roles |
| `user_permissions` | User-specific permission overrides |
| `user_role_history` | Audit trail for role changes |
| `admin_sessions` | Admin login sessions |
| `user_activity_logs` | Track user actions |

**Total: 8 Tables**
