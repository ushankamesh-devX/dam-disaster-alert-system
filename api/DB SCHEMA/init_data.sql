-- ============================================================================
-- DDAS Database Initialization Script
-- This script creates initial roles and permissions for the system
-- ============================================================================

-- Apply migrations first. Run against the selected database (normally dam_disaster_db).
-- Safe to repeat: existing role/permission records and assignments are retained.
-- The API creates the first admin from DDAS_ADMIN_EMAIL / DDAS_ADMIN_PASSWORD.
-- This file deliberately creates no user accounts.
SET NAMES utf8mb4;
START TRANSACTION;

-- ============================================================================
-- 1. INSERT PERMISSIONS
-- ============================================================================

INSERT INTO permissions (code, name, description, module, action, is_active) VALUES
-- User Management
('users.view', 'View Users', 'View user list and details', 'users', 'view', TRUE),
('users.create', 'Create Users', 'Create new users', 'users', 'create', TRUE),
('users.edit', 'Edit Users', 'Edit user information', 'users', 'edit', TRUE),
('users.delete', 'Delete Users', 'Delete users', 'users', 'delete', TRUE),

-- Dam Management
('dams.view', 'View Dams', 'View dam list and details', 'dams', 'view', TRUE),
('dams.create', 'Create Dams', 'Create new dams', 'dams', 'create', TRUE),
('dams.edit', 'Edit Dams', 'Edit dam information', 'dams', 'edit', TRUE),
('dams.delete', 'Delete Dams', 'Delete dams', 'dams', 'delete', TRUE),

-- Alert Management
('alerts.view', 'View Alerts', 'View alert list and details', 'alerts', 'view', TRUE),
('alerts.create', 'Create Alerts', 'Create new alerts', 'alerts', 'create', TRUE),
('alerts.edit', 'Edit Alerts', 'Edit alert information', 'alerts', 'edit', TRUE),
('alerts.delete', 'Delete Alerts', 'Delete alerts', 'alerts', 'delete', TRUE),

-- Report Management
('reports.view', 'View Reports', 'View reports', 'reports', 'view', TRUE),
('reports.create', 'Create Reports', 'Create reports', 'reports', 'create', TRUE),

-- Settings Management
('settings.view', 'View Settings', 'View system settings', 'settings', 'view', TRUE),
('settings.manage', 'Manage Settings', 'Manage system settings', 'settings', 'manage', TRUE)
ON DUPLICATE KEY UPDATE permissions.id=permissions.id;

-- ============================================================================
-- 2. INSERT ROLES
-- ============================================================================

INSERT INTO roles (code, name, name_si, description, is_system_role, is_default, priority_level, color, is_active) VALUES
('SUPER_ADMIN', 'Super Administrator', 'සුපිරි පරිපාලක', 'Full system access with all permissions', TRUE, FALSE, 100, '#e74c3c', TRUE),
('ADMIN', 'Administrator', 'පරිපාලක', 'System administrator with management permissions', TRUE, FALSE, 90, '#3498db', TRUE),
('DAM_OPERATOR', 'Dam Operator', 'වේලි ක්‍රියාකරු', 'Dam facility operator', TRUE, FALSE, 70, '#f39c12', TRUE),
('NORMAL_USER', 'Normal User', 'සාමාන්‍ය පරිශීලක', 'Regular system user', TRUE, TRUE, 10, '#95a5a6', TRUE)
ON DUPLICATE KEY UPDATE roles.id=roles.id;

-- ============================================================================
-- 3. ASSIGN PERMISSIONS TO ROLES
-- ============================================================================

-- Super Admin - All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'SUPER_ADMIN'
ON DUPLICATE KEY UPDATE role_permissions.role_id=role_permissions.role_id;

-- Admin - Most permissions except some critical ones
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'ADMIN'
AND p.code IN (
    'users.view', 'users.create', 'users.edit',
    'dams.view', 'dams.create', 'dams.edit',
    'alerts.view', 'alerts.create', 'alerts.edit', 'alerts.delete',
    'reports.view', 'reports.create',
    'settings.view'
)
ON DUPLICATE KEY UPDATE role_permissions.role_id=role_permissions.role_id;

-- Dam Operator - Limited permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'DAM_OPERATOR'
AND p.code IN (
    'dams.view', 'dams.edit',
    'alerts.view', 'alerts.create',
    'reports.view', 'reports.create'
)
ON DUPLICATE KEY UPDATE role_permissions.role_id=role_permissions.role_id;

-- Normal User - View only permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'NORMAL_USER'
AND p.code IN (
    'dams.view',
    'alerts.view',
    'reports.view'
)
ON DUPLICATE KEY UPDATE role_permissions.role_id=role_permissions.role_id;

COMMIT;
