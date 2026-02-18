-- ============================================================================
-- DAM DISASTER ALERT SYSTEM (DDAS) - Complete Database Schema
-- ============================================================================
-- SQL Dialect: MySQL 8+
-- Charset: utf8mb4_unicode_ci
-- Engine: InnoDB
-- 
-- EXECUTION ORDER: This script creates tables in dependency order
-- Run this file to create the complete database schema
-- ============================================================================

-- Create database (uncomment if needed)
-- CREATE DATABASE IF NOT EXISTS ddas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE ddas;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- MODULE 1: USERS & RBAC (Role-Based Access Control)
-- Tables: 8
-- ============================================================================

-- 1.1 Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
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

-- 1.2 Roles Table
CREATE TABLE IF NOT EXISTS roles (
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

-- 1.3 Role-Permissions Junction Table
CREATE TABLE IF NOT EXISTS role_permissions (
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

-- 1.4 Users Table
CREATE TABLE IF NOT EXISTS users (
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
    last_location_update TIMESTAMP NULL,
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

-- 1.5 User-Specific Permission Overrides
CREATE TABLE IF NOT EXISTS user_permissions (
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

-- 1.6 User Role Change History
CREATE TABLE IF NOT EXISTS user_role_history (
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

-- 1.7 Admin Sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
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

-- 1.8 User Activity Logs
CREATE TABLE IF NOT EXISTS user_activity_logs (
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


-- ============================================================================
-- MODULE 2: DAM MANAGEMENT
-- Tables: 18
-- ============================================================================

-- 2.1 Regions Table
CREATE TABLE IF NOT EXISTS regions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_si VARCHAR(100),
    name_ta VARCHAR(100),
    state_province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Sri Lanka',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    boundary_geojson JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.2 Hazard Levels Reference Table
CREATE TABLE IF NOT EXISTS hazard_levels (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    level_number INT UNIQUE NOT NULL COMMENT '1, 2, 3, 4, 5',
    code VARCHAR(20) UNIQUE NOT NULL COMMENT 'LEVEL_1, LEVEL_2, etc.',
    name VARCHAR(100) NOT NULL,
    name_si VARCHAR(100),
    description TEXT,
    description_si TEXT,
    color VARCHAR(20) NOT NULL COMMENT 'Hex color for map display',
    fill_opacity DECIMAL(3, 2) DEFAULT 0.35 COMMENT 'Map polygon opacity 0-1',
    stroke_color VARCHAR(20),
    stroke_width INT DEFAULT 2,
    icon VARCHAR(100),
    risk_score_min DECIMAL(5, 2) COMMENT 'Min risk score for this level',
    risk_score_max DECIMAL(5, 2) COMMENT 'Max risk score for this level',
    evacuation_required BOOLEAN DEFAULT FALSE,
    notification_priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    estimated_flood_time_minutes INT COMMENT 'Estimated time for flood to reach',
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.3 Dams Master Table
CREATE TABLE IF NOT EXISTS dams (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    name_si VARCHAR(150),
    name_ta VARCHAR(150),
    region_id BIGINT UNSIGNED,
    location_description VARCHAR(500),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    dam_type ENUM('earth', 'gravity', 'arch', 'buttress', 'embankment', 'composite') NOT NULL,
    height_meters DECIMAL(8, 2),
    length_meters DECIMAL(10, 2),
    reservoir_capacity_mcm DECIMAL(12, 4) COMMENT 'Million Cubic Meters',
    gross_storage_mcm DECIMAL(12, 4),
    live_storage_mcm DECIMAL(12, 4),
    dead_storage_mcm DECIMAL(12, 4),
    catchment_area_sqkm DECIMAL(10, 2),
    spillway_capacity_cumecs DECIMAL(12, 4),
    year_completed YEAR,
    river_name VARCHAR(100),
    purpose SET('irrigation', 'hydropower', 'flood_control', 'water_supply', 'recreation') NOT NULL,
    operator_organization VARCHAR(200),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    emergency_phone VARCHAR(20),
    overall_hazard_level_id BIGINT UNSIGNED COMMENT 'Current overall hazard level',
    overall_hazard_status ENUM('safe', 'low', 'moderate', 'high', 'severe', 'critical') DEFAULT 'safe',
    hazard_last_assessed_at TIMESTAMP NULL,
    hazard_assessed_by BIGINT UNSIGNED,
    status ENUM('operational', 'under_maintenance', 'under_construction', 'decommissioned') DEFAULT 'operational',
    risk_classification ENUM('low', 'medium', 'high', 'very_high') DEFAULT 'medium',
    last_inspection_date DATE,
    next_inspection_date DATE,
    image_url VARCHAR(500),
    map_center_latitude DECIMAL(10, 8) COMMENT 'Map center for hazard view',
    map_center_longitude DECIMAL(11, 8),
    map_default_zoom INT DEFAULT 12,
    dam_boundary_geojson JSON COMMENT 'Dam structure boundary polygon',
    reservoir_boundary_geojson JSON COMMENT 'Reservoir/water body polygon',
    downstream_river_geojson JSON COMMENT 'Downstream river path line',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL,
    FOREIGN KEY (overall_hazard_level_id) REFERENCES hazard_levels(id) ON DELETE SET NULL,
    INDEX idx_dams_region (region_id),
    INDEX idx_dams_status (status),
    INDEX idx_dams_hazard (overall_hazard_status),
    INDEX idx_dams_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.4 Dam Hazard Zones
CREATE TABLE IF NOT EXISTS dam_hazard_zones (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dam_id BIGINT UNSIGNED NOT NULL,
    hazard_level_id BIGINT UNSIGNED NOT NULL,
    zone_code VARCHAR(50) NOT NULL COMMENT 'Unique code like DAM001_L1_Z1',
    zone_name VARCHAR(200) NOT NULL,
    zone_name_si VARCHAR(200),
    description TEXT,
    description_si TEXT,
    boundary_geojson JSON NOT NULL COMMENT 'Polygon coordinates from map drawing',
    center_latitude DECIMAL(10, 8) COMMENT 'Calculated center of polygon',
    center_longitude DECIMAL(11, 8),
    area_sq_km DECIMAL(12, 4) COMMENT 'Calculated area in sq km',
    perimeter_km DECIMAL(10, 4),
    distance_from_dam_km DECIMAL(8, 2) COMMENT 'Distance from dam to zone start',
    estimated_flood_arrival_minutes INT COMMENT 'Time for flood to reach this zone',
    estimated_water_depth_meters DECIMAL(6, 2) COMMENT 'Expected flood depth',
    flood_velocity_mps DECIMAL(6, 2) COMMENT 'Expected flood velocity m/s',
    fill_color VARCHAR(20) COMMENT 'Override level color if needed',
    fill_opacity DECIMAL(3, 2),
    stroke_color VARCHAR(20),
    stroke_width INT,
    display_order INT DEFAULT 0 COMMENT 'Layer order on map',
    show_label BOOLEAN DEFAULT TRUE,
    label_position JSON COMMENT 'Label lat/lng position',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by BIGINT UNSIGNED,
    verified_at TIMESTAMP NULL,
    created_by BIGINT UNSIGNED,
    updated_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE CASCADE,
    FOREIGN KEY (hazard_level_id) REFERENCES hazard_levels(id) ON DELETE RESTRICT,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_dam_zone_code (dam_id, zone_code),
    INDEX idx_zone_dam (dam_id),
    INDEX idx_zone_level (hazard_level_id),
    INDEX idx_zone_active (is_active),
    INDEX idx_zone_center (center_latitude, center_longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.5 Hazard Zone History
CREATE TABLE IF NOT EXISTS dam_hazard_zone_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    zone_id BIGINT UNSIGNED NOT NULL,
    dam_id BIGINT UNSIGNED NOT NULL,
    change_type ENUM('created', 'boundary_updated', 'level_changed', 'deleted', 'verified') NOT NULL,
    old_hazard_level_id BIGINT UNSIGNED,
    new_hazard_level_id BIGINT UNSIGNED,
    old_boundary_geojson JSON,
    new_boundary_geojson JSON,
    reason TEXT,
    changed_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES dam_hazard_zones(id) ON DELETE CASCADE,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_history_zone (zone_id),
    INDEX idx_history_dam (dam_id),
    INDEX idx_history_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.6 Dam Hazard Assessments
CREATE TABLE IF NOT EXISTS dam_hazard_assessments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dam_id BIGINT UNSIGNED NOT NULL,
    assessment_type ENUM('automatic', 'manual', 'scheduled', 'emergency') NOT NULL,
    water_level_score DECIMAL(5, 2),
    inflow_score DECIMAL(5, 2),
    weather_score DECIMAL(5, 2),
    structural_score DECIMAL(5, 2),
    seismic_score DECIMAL(5, 2),
    overall_risk_score DECIMAL(5, 2) NOT NULL,
    previous_hazard_level_id BIGINT UNSIGNED,
    new_hazard_level_id BIGINT UNSIGNED NOT NULL,
    previous_status ENUM('safe', 'low', 'moderate', 'high', 'severe', 'critical'),
    new_status ENUM('safe', 'low', 'moderate', 'high', 'severe', 'critical') NOT NULL,
    assessment_notes TEXT,
    data_sources JSON COMMENT 'Sensor IDs, weather data used',
    triggered_by_sensor_id BIGINT UNSIGNED,
    triggered_by_value DECIMAL(12, 4),
    alert_triggered BOOLEAN DEFAULT FALSE,
    alert_id BIGINT UNSIGNED,
    zones_activated JSON COMMENT 'List of zone IDs activated',
    assessed_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE CASCADE,
    FOREIGN KEY (previous_hazard_level_id) REFERENCES hazard_levels(id) ON DELETE SET NULL,
    FOREIGN KEY (new_hazard_level_id) REFERENCES hazard_levels(id) ON DELETE RESTRICT,
    FOREIGN KEY (assessed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_assessment_dam (dam_id),
    INDEX idx_assessment_date (created_at),
    INDEX idx_assessment_status (new_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.7 Dam Current Status
CREATE TABLE IF NOT EXISTS dam_current_status (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dam_id BIGINT UNSIGNED UNIQUE NOT NULL,
    water_level_meters DECIMAL(8, 2),
    water_level_percentage DECIMAL(5, 2),
    full_reservoir_level_meters DECIMAL(8, 2),
    danger_level_meters DECIMAL(8, 2),
    inflow_cumecs DECIMAL(10, 2),
    outflow_cumecs DECIMAL(10, 2),
    storage_current_mcm DECIMAL(12, 4),
    storage_percentage DECIMAL(5, 2),
    spillway_gate_status JSON,
    gates_open_count INT DEFAULT 0,
    total_gates_count INT,
    current_hazard_level_id BIGINT UNSIGNED,
    hazard_status ENUM('safe', 'low', 'moderate', 'high', 'severe', 'critical') DEFAULT 'safe',
    hazard_value VARCHAR(50),
    flood_risk_score DECIMAL(5, 2),
    active_hazard_zones JSON COMMENT 'Currently active zone IDs',
    rainfall_last_1hr_mm DECIMAL(8, 2),
    rainfall_last_24hr_mm DECIMAL(8, 2),
    rainfall_forecast_24hr_mm DECIMAL(8, 2),
    last_sensor_reading_at TIMESTAMP NULL,
    last_hazard_assessment_at TIMESTAMP NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE CASCADE,
    FOREIGN KEY (current_hazard_level_id) REFERENCES hazard_levels(id) ON DELETE SET NULL,
    INDEX idx_status_hazard (hazard_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.8 Dam Gates/Spillways
CREATE TABLE IF NOT EXISTS dam_gates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dam_id BIGINT UNSIGNED NOT NULL,
    gate_number VARCHAR(20) NOT NULL,
    gate_type ENUM('radial', 'vertical', 'drum', 'flap', 'sluice') NOT NULL,
    max_opening_meters DECIMAL(6, 2),
    current_opening_meters DECIMAL(6, 2) DEFAULT 0,
    status ENUM('closed', 'partial', 'fully_open', 'maintenance', 'jammed') DEFAULT 'closed',
    last_operation_at TIMESTAMP NULL,
    operated_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE CASCADE,
    FOREIGN KEY (operated_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_dam_gate (dam_id, gate_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.9 Gate Operation Logs
CREATE TABLE IF NOT EXISTS gate_operation_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    gate_id BIGINT UNSIGNED NOT NULL,
    dam_id BIGINT UNSIGNED NOT NULL,
    operation_type ENUM('open', 'close', 'partial_open', 'emergency_release') NOT NULL,
    opening_before DECIMAL(6, 2),
    opening_after DECIMAL(6, 2),
    reason TEXT,
    operated_by BIGINT UNSIGNED,
    operation_mode ENUM('manual', 'automatic', 'remote') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gate_id) REFERENCES dam_gates(id) ON DELETE CASCADE,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE CASCADE,
    FOREIGN KEY (operated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_gate_log_dam (dam_id),
    INDEX idx_gate_log_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.10 Sensor Types Reference
CREATE TABLE IF NOT EXISTS sensor_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL,
    min_threshold DECIMAL(12, 4),
    max_threshold DECIMAL(12, 4),
    critical_threshold DECIMAL(12, 4),
    icon VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.11 Sensors
CREATE TABLE IF NOT EXISTS sensors (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sensor_uid VARCHAR(100) UNIQUE NOT NULL,
    dam_id BIGINT UNSIGNED NOT NULL,
    sensor_type_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    location_on_dam VARCHAR(200),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    elevation_meters DECIMAL(8, 2),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    installation_date DATE,
    calibration_date DATE,
    next_calibration_date DATE,
    min_reading DECIMAL(12, 4),
    max_reading DECIMAL(12, 4),
    warning_threshold DECIMAL(12, 4),
    critical_threshold DECIMAL(12, 4),
    reading_interval_seconds INT DEFAULT 300,
    status ENUM('active', 'inactive', 'maintenance', 'faulty', 'offline') DEFAULT 'active',
    last_reading_at TIMESTAMP NULL,
    battery_level DECIMAL(5, 2),
    signal_strength DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE CASCADE,
    FOREIGN KEY (sensor_type_id) REFERENCES sensor_types(id) ON DELETE RESTRICT,
    INDEX idx_sensor_dam (dam_id),
    INDEX idx_sensor_type (sensor_type_id),
    INDEX idx_sensor_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.12 Sensor Readings (Partitioned)
CREATE TABLE IF NOT EXISTS sensor_readings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sensor_id BIGINT UNSIGNED NOT NULL,
    dam_id BIGINT UNSIGNED NOT NULL,
    reading_value DECIMAL(12, 4) NOT NULL,
    unit VARCHAR(50),
    quality ENUM('good', 'suspect', 'bad') DEFAULT 'good',
    recorded_at TIMESTAMP NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE CASCADE,
    INDEX idx_reading_sensor (sensor_id),
    INDEX idx_reading_dam (dam_id),
    INDEX idx_reading_time (recorded_at),
    INDEX idx_reading_composite (dam_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.13 Sensor Readings Aggregated
CREATE TABLE IF NOT EXISTS sensor_readings_aggregated (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sensor_id BIGINT UNSIGNED NOT NULL,
    dam_id BIGINT UNSIGNED NOT NULL,
    aggregation_type ENUM('hourly', 'daily', 'weekly', 'monthly') NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    min_value DECIMAL(12, 4),
    max_value DECIMAL(12, 4),
    avg_value DECIMAL(12, 4),
    reading_count INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE CASCADE,
    UNIQUE KEY uk_sensor_period (sensor_id, aggregation_type, period_start),
    INDEX idx_agg_dam (dam_id),
    INDEX idx_agg_period (period_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.14 Custom Field Definitions
CREATE TABLE IF NOT EXISTS dam_custom_field_definitions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    field_code VARCHAR(50) UNIQUE NOT NULL COMMENT 'e.g., downstream_villages, power_capacity',
    field_name VARCHAR(100) NOT NULL,
    field_name_si VARCHAR(100),
    description TEXT,
    field_type ENUM('text', 'number', 'decimal', 'boolean', 'date', 'datetime', 'select', 'multi_select', 'json', 'file', 'image', 'url', 'email', 'phone', 'textarea', 'rich_text', 'coordinates') NOT NULL DEFAULT 'text',
    options JSON COMMENT '[{"value": "opt1", "label": "Option 1"}, ...]',
    is_required BOOLEAN DEFAULT FALSE,
    min_value DECIMAL(15, 4),
    max_value DECIMAL(15, 4),
    min_length INT,
    max_length INT,
    regex_pattern VARCHAR(500),
    validation_message VARCHAR(255),
    default_value TEXT,
    field_group VARCHAR(100) COMMENT 'e.g., technical, environmental, historical',
    field_group_order INT DEFAULT 0,
    display_order INT DEFAULT 0,
    display_in_list BOOLEAN DEFAULT FALSE COMMENT 'Show in dam list table',
    display_in_details BOOLEAN DEFAULT TRUE COMMENT 'Show in dam details',
    display_in_map_popup BOOLEAN DEFAULT FALSE,
    icon VARCHAR(100),
    unit VARCHAR(50) COMMENT 'e.g., MW, km², tons',
    visible_to_roles JSON COMMENT '["admin", "operator"]',
    editable_by_roles JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_field_group (field_group),
    INDEX idx_field_type (field_type),
    INDEX idx_field_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.15 Custom Field Values
CREATE TABLE IF NOT EXISTS dam_custom_field_values (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dam_id BIGINT UNSIGNED NOT NULL,
    field_id BIGINT UNSIGNED NOT NULL,
    value_text TEXT,
    value_number DECIMAL(20, 6),
    value_boolean BOOLEAN,
    value_date DATE,
    value_datetime TIMESTAMP NULL,
    value_json JSON,
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size_bytes BIGINT,
    file_mime_type VARCHAR(100),
    notes TEXT,
    source VARCHAR(255) COMMENT 'Where this data came from',
    verified BOOLEAN DEFAULT FALSE,
    verified_by BIGINT UNSIGNED,
    verified_at TIMESTAMP NULL,
    created_by BIGINT UNSIGNED,
    updated_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES dam_custom_field_definitions(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_dam_field (dam_id, field_id),
    INDEX idx_cfv_dam (dam_id),
    INDEX idx_cfv_field (field_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.16 Custom Field History
CREATE TABLE IF NOT EXISTS dam_custom_field_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dam_id BIGINT UNSIGNED NOT NULL,
    field_id BIGINT UNSIGNED NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by BIGINT UNSIGNED,
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES dam_custom_field_definitions(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_cfh_dam (dam_id),
    INDEX idx_cfh_field (field_id),
    INDEX idx_cfh_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.17 Field Templates
CREATE TABLE IF NOT EXISTS dam_field_templates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    template_code VARCHAR(50) UNIQUE NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    description TEXT,
    dam_type ENUM('earth', 'gravity', 'arch', 'buttress', 'embankment', 'composite', 'all') DEFAULT 'all',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.18 Field Template Items
CREATE TABLE IF NOT EXISTS dam_field_template_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    template_id BIGINT UNSIGNED NOT NULL,
    field_id BIGINT UNSIGNED NOT NULL,
    is_required BOOLEAN DEFAULT FALSE COMMENT 'Override field default',
    display_order INT DEFAULT 0,
    FOREIGN KEY (template_id) REFERENCES dam_field_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES dam_custom_field_definitions(id) ON DELETE CASCADE,
    UNIQUE KEY uk_template_field (template_id, field_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- MODULE 3: EMERGENCY CONTACTS & RESPONSE
-- Tables: 14
-- ============================================================================

-- 3.1 Contact Relationship Types (Lookup Table)
CREATE TABLE IF NOT EXISTS contact_relationship_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_si VARCHAR(100) NULL,
    name_ta VARCHAR(100) NULL,
    description TEXT NULL,
    category ENUM('family', 'friend', 'professional', 'emergency_service', 'other') DEFAULT 'other',
    icon VARCHAR(100) NULL COMMENT 'Icon name for mobile app',
    color VARCHAR(20) NULL COMMENT 'Hex color for UI',
    priority_weight INT DEFAULT 0 COMMENT 'Used for auto-sorting contacts',
    is_official BOOLEAN DEFAULT FALSE COMMENT 'TRUE for official emergency services',
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_crt_category (category),
    INDEX idx_crt_active (is_active),
    INDEX idx_crt_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.2 Emergency Contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    contact_name VARCHAR(120) NOT NULL,
    contact_name_si VARCHAR(120) NULL,
    phone_number VARCHAR(20) NOT NULL,
    phone_number_alt VARCHAR(20) NULL COMMENT 'Alternative phone number',
    email VARCHAR(255) NULL,
    relationship_type_id BIGINT UNSIGNED NOT NULL,
    custom_relationship VARCHAR(100) NULL COMMENT 'When relationship is "other"',
    contact_user_id BIGINT UNSIGNED NULL COMMENT 'FK to users if contact is registered',
    priority_order INT DEFAULT 1 COMMENT '1=highest priority',
    is_primary BOOLEAN DEFAULT FALSE,
    can_receive_sms BOOLEAN DEFAULT TRUE,
    can_receive_calls BOOLEAN DEFAULT TRUE,
    can_receive_push BOOLEAN DEFAULT TRUE,
    can_receive_whatsapp BOOLEAN DEFAULT FALSE,
    preferred_language ENUM('en', 'si', 'ta') DEFAULT 'en',
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP NULL,
    verification_code VARCHAR(10) NULL,
    verification_expires_at TIMESTAMP NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    notes VARCHAR(500) NULL,
    metadata JSON NULL COMMENT 'Extra flexible data',
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (relationship_type_id) REFERENCES contact_relationship_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (contact_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_user_phone (user_id, phone_number),
    INDEX idx_ec_user (user_id),
    INDEX idx_ec_phone (phone_number),
    INDEX idx_ec_relationship (relationship_type_id),
    INDEX idx_ec_primary (user_id, is_primary),
    INDEX idx_ec_verified (is_verified),
    INDEX idx_ec_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.3 Location Types (Lookup Table)
CREATE TABLE IF NOT EXISTS location_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_si VARCHAR(100) NULL,
    name_ta VARCHAR(100) NULL,
    description TEXT NULL,
    category ENUM('personal', 'shelter', 'medical', 'emergency_service', 'religious', 'public', 'other') DEFAULT 'other',
    icon VARCHAR(100) NULL COMMENT 'Icon name for mobile app (e.g., MaterialCommunityIcons)',
    marker_color VARCHAR(20) NULL COMMENT 'Map marker color',
    marker_icon VARCHAR(100) NULL COMMENT 'Map marker icon',
    is_evacuation_point BOOLEAN DEFAULT FALSE COMMENT 'Can be used as evacuation destination',
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_lt_category (category),
    INDEX idx_lt_evacuation (is_evacuation_point),
    INDEX idx_lt_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.4 System Safe Locations (Official Evacuation Centers)
CREATE TABLE IF NOT EXISTS system_safe_locations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL COMMENT 'Unique code like EVA_COL_001',
    name VARCHAR(200) NOT NULL,
    name_si VARCHAR(200) NULL,
    name_ta VARCHAR(200) NULL,
    description TEXT NULL,
    description_si TEXT NULL,
    location_type_id BIGINT UNSIGNED NOT NULL,
    region_id BIGINT UNSIGNED NULL,
    address_text VARCHAR(500) NULL,
    address_si VARCHAR(500) NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    elevation_meters DECIMAL(8, 2) NULL COMMENT 'Important for flood safety',
    boundary_geojson JSON NULL COMMENT 'Facility boundary polygon',
    capacity_persons INT NULL COMMENT 'Maximum capacity',
    current_occupancy INT DEFAULT 0,
    has_medical_facility BOOLEAN DEFAULT FALSE,
    has_food_supply BOOLEAN DEFAULT FALSE,
    has_water_supply BOOLEAN DEFAULT FALSE,
    has_power_backup BOOLEAN DEFAULT FALSE,
    has_communication BOOLEAN DEFAULT FALSE,
    has_restrooms BOOLEAN DEFAULT FALSE,
    has_pet_area BOOLEAN DEFAULT FALSE,
    has_accessibility BOOLEAN DEFAULT FALSE COMMENT 'Wheelchair accessible',
    amenities JSON NULL COMMENT 'Flexible amenities list',
    contact_name VARCHAR(120) NULL,
    contact_phone VARCHAR(20) NULL,
    contact_email VARCHAR(255) NULL,
    emergency_phone VARCHAR(20) NULL,
    operating_hours JSON NULL COMMENT '{"mon": "08:00-20:00", "emergency": "24/7"}',
    is_24_hours BOOLEAN DEFAULT FALSE,
    primary_dam_id BIGINT UNSIGNED NULL COMMENT 'Primary dam this shelter serves',
    serves_hazard_zones JSON NULL COMMENT 'List of dam_hazard_zone IDs',
    distance_from_dam_km DECIMAL(8, 2) NULL,
    estimated_travel_time_minutes INT NULL,
    status ENUM('active', 'inactive', 'under_maintenance', 'full', 'closed') DEFAULT 'active',
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by BIGINT UNSIGNED NULL,
    verified_at TIMESTAMP NULL,
    last_inspection_date DATE NULL,
    next_inspection_date DATE NULL,
    show_on_map BOOLEAN DEFAULT TRUE,
    marker_icon VARCHAR(100) NULL,
    marker_color VARCHAR(20) NULL,
    image_url VARCHAR(500) NULL,
    gallery_urls JSON NULL COMMENT 'Array of image URLs',
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (location_type_id) REFERENCES location_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL,
    FOREIGN KEY (primary_dam_id) REFERENCES dams(id) ON DELETE SET NULL,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_ssl_type (location_type_id),
    INDEX idx_ssl_region (region_id),
    INDEX idx_ssl_dam (primary_dam_id),
    INDEX idx_ssl_status (status),
    INDEX idx_ssl_location (latitude, longitude),
    INDEX idx_ssl_map (show_on_map),
    INDEX idx_ssl_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.5 User Safe Locations (Personal Locations + OSM)
CREATE TABLE IF NOT EXISTS user_safe_locations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    label VARCHAR(120) NOT NULL COMMENT 'User-friendly name e.g. Home, School',
    label_si VARCHAR(120) NULL,
    location_type_id BIGINT UNSIGNED NOT NULL,
    address_text VARCHAR(500) NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    elevation_meters DECIMAL(8, 2) NULL,
    nearest_dam_id BIGINT UNSIGNED NULL,
    hazard_zone_id BIGINT UNSIGNED NULL,
    hazard_level_id BIGINT UNSIGNED NULL,
    distance_to_dam_km DECIMAL(8, 2) NULL,
    is_in_hazard_zone BOOLEAN DEFAULT FALSE,
    hazard_last_checked_at TIMESTAMP NULL,
    osm_place_id VARCHAR(64) NULL,
    osm_display_name VARCHAR(800) NULL,
    osm_type VARCHAR(100) NULL COMMENT 'OSM type/category',
    osm_class VARCHAR(100) NULL COMMENT 'OSM class',
    osm_raw_response JSON NULL COMMENT 'Full OSM response for reference',
    source ENUM('manual', 'osm_search', 'osm_reverse_geocode', 'system_import') DEFAULT 'manual',
    is_favorite BOOLEAN DEFAULT FALSE,
    is_home BOOLEAN DEFAULT FALSE COMMENT 'Primary home location',
    is_work BOOLEAN DEFAULT FALSE COMMENT 'Primary work location',
    notify_when_in_danger BOOLEAN DEFAULT TRUE COMMENT 'Send alerts when this location is in hazard zone',
    contact_name VARCHAR(120) NULL,
    contact_phone VARCHAR(20) NULL,
    notes VARCHAR(500) NULL,
    metadata JSON NULL COMMENT 'Extra flexible data',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (location_type_id) REFERENCES location_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (nearest_dam_id) REFERENCES dams(id) ON DELETE SET NULL,
    FOREIGN KEY (hazard_zone_id) REFERENCES dam_hazard_zones(id) ON DELETE SET NULL,
    FOREIGN KEY (hazard_level_id) REFERENCES hazard_levels(id) ON DELETE SET NULL,
    INDEX idx_usl_user (user_id),
    INDEX idx_usl_type (location_type_id),
    INDEX idx_usl_location (latitude, longitude),
    INDEX idx_usl_favorite (user_id, is_favorite),
    INDEX idx_usl_home (user_id, is_home),
    INDEX idx_usl_hazard (is_in_hazard_zone),
    INDEX idx_usl_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.6 Emergency Service Providers
CREATE TABLE IF NOT EXISTS emergency_service_providers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_si VARCHAR(200) NULL,
    name_ta VARCHAR(200) NULL,
    description TEXT NULL,
    service_type ENUM('hospital', 'police', 'fire_brigade', 'ambulance', 'disaster_management', 'military', 'coast_guard', 'other') NOT NULL,
    location_type_id BIGINT UNSIGNED NULL,
    region_id BIGINT UNSIGNED NULL,
    address_text VARCHAR(500) NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    service_area_geojson JSON NULL COMMENT 'Polygon of service coverage area',
    primary_phone VARCHAR(20) NOT NULL,
    secondary_phone VARCHAR(20) NULL,
    emergency_phone VARCHAR(20) NULL COMMENT 'Direct emergency line',
    email VARCHAR(255) NULL,
    website VARCHAR(500) NULL,
    is_24_hours BOOLEAN DEFAULT TRUE,
    operating_hours JSON NULL,
    response_time_minutes INT NULL COMMENT 'Average response time',
    total_beds INT NULL,
    icu_beds INT NULL,
    emergency_beds INT NULL,
    status ENUM('active', 'inactive', 'limited_service') DEFAULT 'active',
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by BIGINT UNSIGNED NULL,
    verified_at TIMESTAMP NULL,
    show_on_map BOOLEAN DEFAULT TRUE,
    marker_icon VARCHAR(100) NULL,
    marker_color VARCHAR(20) NULL,
    image_url VARCHAR(500) NULL,
    metadata JSON NULL,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL,
    FOREIGN KEY (location_type_id) REFERENCES location_types(id) ON DELETE SET NULL,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_esp_type (service_type),
    INDEX idx_esp_region (region_id),
    INDEX idx_esp_status (status),
    INDEX idx_esp_location (latitude, longitude),
    INDEX idx_esp_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.7 OpenStreetMap (Nominatim) Cache
CREATE TABLE IF NOT EXISTS osm_place_cache (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    provider ENUM('nominatim', 'google_places', 'mapbox') DEFAULT 'nominatim',
    query_type ENUM('search', 'reverse', 'details') NOT NULL,
    query_hash CHAR(64) NOT NULL COMMENT 'SHA-256 of normalized query params',
    query_params JSON NOT NULL,
    response_json JSON NOT NULL,
    result_count INT DEFAULT 0,
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    hit_count INT DEFAULT 0 COMMENT 'Number of cache hits',
    last_hit_at TIMESTAMP NULL,
    UNIQUE KEY uk_osm_cache_hash (provider, query_type, query_hash),
    INDEX idx_osm_expires (expires_at),
    INDEX idx_osm_hits (hit_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.8 User Hazard Location Snapshots
CREATE TABLE IF NOT EXISTS user_hazard_location_snapshots (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy_meters DECIMAL(8, 2) NULL COMMENT 'GPS accuracy',
    altitude_meters DECIMAL(8, 2) NULL,
    address_text VARCHAR(500) NULL,
    region_id BIGINT UNSIGNED NULL,
    hazard_level_id BIGINT UNSIGNED NULL,
    dam_id BIGINT UNSIGNED NULL,
    hazard_zone_id BIGINT UNSIGNED NULL,
    distance_to_dam_km DECIMAL(8, 2) NULL,
    distance_to_zone_boundary_km DECIMAL(8, 2) NULL,
    overall_risk_score DECIMAL(5, 2) NULL,
    flood_risk_score DECIMAL(5, 2) NULL,
    proximity_score DECIMAL(5, 2) NULL,
    source ENUM('gps_auto', 'manual', 'sos_trigger', 'background_check', 'scheduled') DEFAULT 'gps_auto',
    trigger_event VARCHAR(100) NULL COMMENT 'What triggered this snapshot',
    context_json JSON NULL COMMENT 'Raw computation data: nearest zones, weather, etc.',
    nearest_safe_location_id BIGINT UNSIGNED NULL,
    distance_to_safe_location_km DECIMAL(8, 2) NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL,
    FOREIGN KEY (hazard_level_id) REFERENCES hazard_levels(id) ON DELETE SET NULL,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE SET NULL,
    FOREIGN KEY (hazard_zone_id) REFERENCES dam_hazard_zones(id) ON DELETE SET NULL,
    FOREIGN KEY (nearest_safe_location_id) REFERENCES system_safe_locations(id) ON DELETE SET NULL,
    INDEX idx_uhls_user_time (user_id, captured_at),
    INDEX idx_uhls_level (hazard_level_id),
    INDEX idx_uhls_dam (dam_id),
    INDEX idx_uhls_location (latitude, longitude),
    INDEX idx_uhls_risk (overall_risk_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.9 SOS Event Types (Lookup Table)
CREATE TABLE IF NOT EXISTS sos_event_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_si VARCHAR(100) NULL,
    name_ta VARCHAR(100) NULL,
    description TEXT NULL,
    icon VARCHAR(100) NULL,
    color VARCHAR(20) NULL,
    severity_level INT DEFAULT 1 COMMENT '1=low, 5=critical',
    auto_notify_authorities BOOLEAN DEFAULT FALSE,
    auto_share_location BOOLEAN DEFAULT TRUE,
    default_message TEXT NULL COMMENT 'Pre-filled emergency message',
    default_message_si TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_set_severity (severity_level),
    INDEX idx_set_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.10 SOS Events
CREATE TABLE IF NOT EXISTS sos_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    sos_type_id BIGINT UNSIGNED NOT NULL,
    custom_message TEXT NULL COMMENT 'User-provided message',
    status ENUM('triggered', 'acknowledged', 'responding', 'resolved', 'cancelled', 'false_alarm') DEFAULT 'triggered',
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP NULL,
    acknowledged_by BIGINT UNSIGNED NULL COMMENT 'Responder who acknowledged',
    responding_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    resolved_by BIGINT UNSIGNED NULL,
    cancelled_at TIMESTAMP NULL,
    cancellation_reason VARCHAR(500) NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy_meters DECIMAL(8, 2) NULL,
    address_text VARCHAR(800) NULL,
    region_id BIGINT UNSIGNED NULL,
    hazard_level_id BIGINT UNSIGNED NULL,
    dam_id BIGINT UNSIGNED NULL,
    hazard_zone_id BIGINT UNSIGNED NULL,
    snapshot_id BIGINT UNSIGNED NULL COMMENT 'Link to user_hazard_location_snapshots',
    risk_score_at_trigger DECIMAL(5, 2) NULL,
    nearest_safe_location_id BIGINT UNSIGNED NULL,
    assigned_responder_id BIGINT UNSIGNED NULL,
    response_notes TEXT NULL,
    resolution_notes TEXT NULL,
    notification_count INT DEFAULT 0,
    successful_notification_count INT DEFAULT 0,
    response_time_seconds INT NULL COMMENT 'Time from trigger to first response',
    device_info JSON NULL COMMENT 'Device model, OS, app version',
    battery_level INT NULL COMMENT 'Battery % at trigger time',
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sos_type_id) REFERENCES sos_event_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL,
    FOREIGN KEY (hazard_level_id) REFERENCES hazard_levels(id) ON DELETE SET NULL,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE SET NULL,
    FOREIGN KEY (hazard_zone_id) REFERENCES dam_hazard_zones(id) ON DELETE SET NULL,
    FOREIGN KEY (snapshot_id) REFERENCES user_hazard_location_snapshots(id) ON DELETE SET NULL,
    FOREIGN KEY (nearest_safe_location_id) REFERENCES system_safe_locations(id) ON DELETE SET NULL,
    FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_responder_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_sos_user_time (user_id, triggered_at),
    INDEX idx_sos_type (sos_type_id),
    INDEX idx_sos_status (status),
    INDEX idx_sos_region (region_id),
    INDEX idx_sos_dam (dam_id),
    INDEX idx_sos_location (latitude, longitude),
    INDEX idx_sos_active (status, triggered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.11 SOS Event Notifications
CREATE TABLE IF NOT EXISTS sos_event_notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    sos_event_id BIGINT UNSIGNED NOT NULL,
    recipient_type ENUM('emergency_contact', 'service_provider', 'authority_user') NOT NULL,
    emergency_contact_id BIGINT UNSIGNED NULL,
    service_provider_id BIGINT UNSIGNED NULL,
    recipient_user_id BIGINT UNSIGNED NULL COMMENT 'For authority users',
    recipient_name VARCHAR(120) NULL,
    recipient_phone VARCHAR(20) NULL,
    recipient_email VARCHAR(255) NULL,
    channel ENUM('push', 'sms', 'call', 'email', 'whatsapp', 'in_app') DEFAULT 'sms',
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'high',
    status ENUM('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'cancelled') DEFAULT 'queued',
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    attempt_count INT DEFAULT 1,
    max_attempts INT DEFAULT 3,
    next_retry_at TIMESTAMP NULL,
    provider VARCHAR(100) NULL COMMENT 'twilio, firebase, smtp, etc.',
    provider_message_id VARCHAR(200) NULL,
    provider_status VARCHAR(100) NULL,
    provider_response JSON NULL,
    error_code VARCHAR(50) NULL,
    error_message VARCHAR(800) NULL,
    message_template VARCHAR(100) NULL COMMENT 'Template used',
    message_content TEXT NULL COMMENT 'Actual message sent',
    cost_amount DECIMAL(10, 4) NULL,
    cost_currency VARCHAR(3) NULL,
    FOREIGN KEY (sos_event_id) REFERENCES sos_events(id) ON DELETE CASCADE,
    FOREIGN KEY (emergency_contact_id) REFERENCES emergency_contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (service_provider_id) REFERENCES emergency_service_providers(id) ON DELETE SET NULL,
    FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_sen_sos (sos_event_id),
    INDEX idx_sen_contact (emergency_contact_id),
    INDEX idx_sen_provider (service_provider_id),
    INDEX idx_sen_channel (channel),
    INDEX idx_sen_status (status),
    INDEX idx_sen_queued (status, queued_at),
    INDEX idx_sen_retry (status, next_retry_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.12 Location Sharing Sessions
CREATE TABLE IF NOT EXISTS location_sharing_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    session_type ENUM('sos', 'manual', 'scheduled', 'family_tracking') DEFAULT 'manual',
    sos_event_id BIGINT UNSIGNED NULL COMMENT 'If triggered by SOS',
    share_token VARCHAR(100) UNIQUE NOT NULL,
    share_url VARCHAR(500) NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP NULL,
    status ENUM('active', 'paused', 'expired', 'ended') DEFAULT 'active',
    update_interval_seconds INT DEFAULT 30,
    share_with_contacts BOOLEAN DEFAULT TRUE,
    share_with_authorities BOOLEAN DEFAULT FALSE,
    allowed_viewer_ids JSON NULL COMMENT 'Specific user IDs allowed to view',
    last_latitude DECIMAL(10, 8) NULL,
    last_longitude DECIMAL(11, 8) NULL,
    last_update_at TIMESTAMP NULL,
    location_update_count INT DEFAULT 0,
    viewer_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sos_event_id) REFERENCES sos_events(id) ON DELETE SET NULL,
    INDEX idx_lss_user (user_id),
    INDEX idx_lss_token (share_token),
    INDEX idx_lss_status (status),
    INDEX idx_lss_active (user_id, status, expires_at),
    INDEX idx_lss_sos (sos_event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.13 Location Sharing Updates
CREATE TABLE IF NOT EXISTS location_sharing_updates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT UNSIGNED NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy_meters DECIMAL(8, 2) NULL,
    altitude_meters DECIMAL(8, 2) NULL,
    speed_mps DECIMAL(8, 2) NULL COMMENT 'Speed in meters per second',
    heading_degrees DECIMAL(5, 2) NULL,
    battery_level INT NULL,
    is_charging BOOLEAN NULL,
    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES location_sharing_sessions(id) ON DELETE CASCADE,
    INDEX idx_lsu_session_time (session_id, captured_at),
    INDEX idx_lsu_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.14 Emergency Activity Logs
CREATE TABLE IF NOT EXISTS emergency_activity_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    activity_type ENUM(
        'contact_added', 'contact_updated', 'contact_deleted', 'contact_verified',
        'safe_location_added', 'safe_location_updated', 'safe_location_deleted',
        'sos_triggered', 'sos_cancelled', 'sos_resolved',
        'location_shared', 'location_share_ended',
        'hazard_alert_received', 'evacuation_started',
        'safe_location_reached', 'check_in'
    ) NOT NULL,
    entity_type VARCHAR(50) NULL COMMENT 'emergency_contacts, sos_events, etc.',
    entity_id BIGINT UNSIGNED NULL,
    description TEXT NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    ip_address VARCHAR(45) NULL,
    device_info JSON NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_eal_user (user_id),
    INDEX idx_eal_type (activity_type),
    INDEX idx_eal_entity (entity_type, entity_id),
    INDEX idx_eal_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- MODULE 4: ALERTS
-- Tables: 6
-- ============================================================================

-- 4.1 Alert Types (Lookup Table)
CREATE TABLE IF NOT EXISTS alert_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_si VARCHAR(100) NULL,
    name_ta VARCHAR(100) NULL,
    description TEXT NULL,
    category ENUM('dam', 'weather', 'flood', 'evacuation', 'system', 'general') NOT NULL,
    severity ENUM('info', 'warning', 'critical', 'emergency') DEFAULT 'warning',
    icon VARCHAR(100) NULL COMMENT 'Icon name for mobile app',
    color VARCHAR(20) NULL COMMENT 'Hex color',
    sound VARCHAR(100) NULL COMMENT 'Notification sound',
    requires_acknowledgment BOOLEAN DEFAULT FALSE,
    auto_expire_hours INT NULL COMMENT 'Auto-expire after X hours',
    default_channels JSON NULL COMMENT '["push", "sms", "email"]',
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

-- 4.2 Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    alert_type_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    title_si VARCHAR(255) NULL,
    title_ta VARCHAR(255) NULL,
    message TEXT NOT NULL,
    message_si TEXT NULL,
    message_ta TEXT NULL,
    severity ENUM('info', 'warning', 'critical', 'emergency') NOT NULL,
    source ENUM('automatic', 'manual', 'scheduled', 'external') DEFAULT 'manual',
    source_system VARCHAR(100) NULL COMMENT 'sensor, weather_api, admin_panel',
    scope ENUM('nationwide', 'regional', 'dam_specific', 'zone_specific') DEFAULT 'regional',
    region_id BIGINT UNSIGNED NULL,
    dam_id BIGINT UNSIGNED NULL,
    hazard_zone_id BIGINT UNSIGNED NULL,
    affected_zones JSON NULL COMMENT 'Array of zone IDs',
    affected_regions JSON NULL COMMENT 'Array of region IDs',
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    radius_km DECIMAL(8, 2) NULL COMMENT 'Alert radius from lat/lng',
    hazard_level_id BIGINT UNSIGNED NULL,
    risk_score DECIMAL(5, 2) NULL,
    triggered_by_assessment_id BIGINT UNSIGNED NULL,
    triggered_by_sensor_id BIGINT UNSIGNED NULL,
    trigger_value DECIMAL(12, 4) NULL,
    trigger_threshold DECIMAL(12, 4) NULL,
    image_url VARCHAR(500) NULL,
    action_required VARCHAR(255) NULL COMMENT 'Evacuate, Shelter in place, etc.',
    action_required_si VARCHAR(255) NULL,
    instructions TEXT NULL,
    instructions_si TEXT NULL,
    safe_location_ids JSON NULL COMMENT 'Recommended evacuation points',
    status ENUM('draft', 'active', 'escalated', 'resolved', 'expired', 'cancelled') DEFAULT 'draft',
    issued_at TIMESTAMP NULL,
    effective_from TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    resolution_notes TEXT NULL,
    resolved_by BIGINT UNSIGNED NULL,
    recipient_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    read_count INT DEFAULT 0,
    acknowledged_count INT DEFAULT 0,
    metadata JSON NULL,
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

-- 4.3 Alert User Deliveries
CREATE TABLE IF NOT EXISTS alert_user_deliveries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    alert_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
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
    read_at TIMESTAMP NULL,
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

-- 4.4 Alert Acknowledgments
CREATE TABLE IF NOT EXISTS alert_acknowledgments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    alert_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    response_type ENUM('acknowledged', 'safe', 'need_help', 'evacuating', 'evacuated') NOT NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    notes TEXT NULL,
    responded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_ack_alert_user (alert_id, user_id),
    INDEX idx_ack_alert (alert_id),
    INDEX idx_ack_user (user_id),
    INDEX idx_ack_response (response_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.5 Alert Escalations
CREATE TABLE IF NOT EXISTS alert_escalations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    alert_id BIGINT UNSIGNED NOT NULL,
    previous_severity ENUM('info', 'warning', 'critical', 'emergency') NOT NULL,
    new_severity ENUM('info', 'warning', 'critical', 'emergency') NOT NULL,
    reason TEXT NULL,
    escalated_by ENUM('automatic', 'manual') DEFAULT 'manual',
    escalated_by_user_id BIGINT UNSIGNED NULL,
    escalated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
    FOREIGN KEY (escalated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_esc_alert (alert_id),
    INDEX idx_esc_date (escalated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.6 User Alert Preferences
CREATE TABLE IF NOT EXISTS user_alert_preferences (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    alerts_enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME NULL COMMENT 'e.g., 22:00',
    quiet_hours_end TIME NULL COMMENT 'e.g., 07:00',
    override_quiet_for_emergency BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    email_enabled BOOLEAN DEFAULT FALSE,
    min_severity ENUM('info', 'warning', 'critical', 'emergency') DEFAULT 'warning',
    location_alerts_enabled BOOLEAN DEFAULT TRUE,
    home_region_id BIGINT UNSIGNED NULL,
    alert_radius_km DECIMAL(8, 2) DEFAULT 50.00,
    preferred_language ENUM('en', 'si', 'ta') DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (home_region_id) REFERENCES regions(id) ON DELETE SET NULL,
    UNIQUE KEY uk_user_prefs (user_id),
    INDEX idx_uap_region (home_region_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- MODULE 5: REPORTS
-- Tables: 6
-- ============================================================================

-- 5.1 Report Types (Lookup Table)
CREATE TABLE IF NOT EXISTS report_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_si VARCHAR(100) NULL,
    name_ta VARCHAR(100) NULL,
    description TEXT NULL,
    icon VARCHAR(100) NULL COMMENT 'Icon name: alert-octagon, waves, terrain, cog',
    color VARCHAR(20) NULL COMMENT 'Hex color',
    category ENUM('structural', 'water', 'environmental', 'equipment', 'safety', 'other') DEFAULT 'other',
    default_priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
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

-- 5.2 Reports
CREATE TABLE IF NOT EXISTS reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    report_number VARCHAR(20) UNIQUE NOT NULL COMMENT 'Human-readable: RPT-2026-00001',
    user_id BIGINT UNSIGNED NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    report_type_id BIGINT UNSIGNED NOT NULL,
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    dam_id BIGINT UNSIGNED NULL,
    region_id BIGINT UNSIGNED NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    location_description VARCHAR(500) NULL COMMENT 'e.g., Near spillway gate #3',
    location_description_si VARCHAR(500) NULL,
    title VARCHAR(255) NULL,
    description TEXT NOT NULL,
    description_si TEXT NULL,
    status ENUM('pending', 'reviewing', 'in_progress', 'resolved', 'rejected', 'duplicate') DEFAULT 'pending',
    assigned_to BIGINT UNSIGNED NULL COMMENT 'User ID of assigned officer',
    assigned_at TIMESTAMP NULL,
    assigned_by BIGINT UNSIGNED NULL,
    resolution_notes TEXT NULL,
    resolution_notes_si TEXT NULL,
    resolved_at TIMESTAMP NULL,
    resolved_by BIGINT UNSIGNED NULL,
    rejection_reason TEXT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP NULL,
    verified_by BIGINT UNSIGNED NULL,
    verification_notes TEXT NULL,
    requires_followup BOOLEAN DEFAULT FALSE,
    followup_date DATE NULL,
    duplicate_of_id BIGINT UNSIGNED NULL COMMENT 'If marked as duplicate',
    related_alert_id BIGINT UNSIGNED NULL COMMENT 'If alert was created from this',
    view_count INT DEFAULT 0,
    upvote_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    metadata JSON NULL,
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

-- 5.3 Report Media
CREATE TABLE IF NOT EXISTS report_media (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    report_id BIGINT UNSIGNED NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500) NULL COMMENT 'CDN URL if applicable',
    file_type ENUM('image', 'video', 'document') NOT NULL,
    mime_type VARCHAR(100) NULL,
    file_size_bytes BIGINT NULL,
    width INT NULL,
    height INT NULL,
    duration_seconds INT NULL COMMENT 'For videos',
    thumbnail_url VARCHAR(500) NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    captured_at TIMESTAMP NULL,
    display_order INT DEFAULT 0,
    caption VARCHAR(500) NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    uploaded_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_rm_report (report_id),
    INDEX idx_rm_type (file_type),
    INDEX idx_rm_primary (report_id, is_primary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5.4 Report Status History
CREATE TABLE IF NOT EXISTS report_status_history (
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

-- 5.5 Report Comments
CREATE TABLE IF NOT EXISTS report_comments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    report_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    comment_text TEXT NOT NULL,
    comment_type ENUM('user_comment', 'official_response', 'status_update', 'internal_note') DEFAULT 'user_comment',
    is_internal BOOLEAN DEFAULT FALSE COMMENT 'Only visible to authorities',
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

-- 5.6 Report Upvotes
CREATE TABLE IF NOT EXISTS report_upvotes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    report_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_report_user (report_id, user_id),
    INDEX idx_ru_report (report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================================
-- DEFAULT DATA INSERTS
-- ============================================================================

-- ============================================================================
-- 1. USERS & RBAC Default Data
-- ============================================================================

-- Default Roles
INSERT INTO roles (code, name, description, is_system_role, is_default, priority_level, color) VALUES
('super_admin', 'Super Administrator', 'Full system access with all permissions', TRUE, FALSE, 100, '#DC2626'),
('admin', 'Administrator', 'Administrative access to manage system', TRUE, FALSE, 80, '#7C3AED'),
('operator', 'Dam Operator', 'Can monitor and operate dam controls', TRUE, FALSE, 60, '#2563EB'),
('moderator', 'Content Moderator', 'Can review reports and manage content', TRUE, FALSE, 40, '#D97706'),
('user', 'Regular User', 'Standard mobile app user', TRUE, TRUE, 10, '#22C55E');

-- Default Permissions
INSERT INTO permissions (code, name, module, action, description) VALUES
-- User Management
('users.view', 'View Users', 'users', 'view', 'Can view user list and details'),
('users.create', 'Create Users', 'users', 'create', 'Can create new users'),
('users.edit', 'Edit Users', 'users', 'edit', 'Can edit user information'),
('users.delete', 'Delete Users', 'users', 'delete', 'Can delete users'),
('users.change_role', 'Change User Role', 'users', 'manage', 'Can change user roles'),
('users.suspend', 'Suspend Users', 'users', 'manage', 'Can suspend/activate users'),

-- Role Management
('roles.view', 'View Roles', 'roles', 'view', 'Can view roles'),
('roles.create', 'Create Roles', 'roles', 'create', 'Can create new roles'),
('roles.edit', 'Edit Roles', 'roles', 'edit', 'Can edit role details'),
('roles.delete', 'Delete Roles', 'roles', 'delete', 'Can delete roles'),
('roles.assign_permissions', 'Assign Permissions', 'roles', 'manage', 'Can assign permissions to roles'),

-- Dam Management
('dams.view', 'View Dams', 'dams', 'view', 'Can view dam information'),
('dams.create', 'Create Dams', 'dams', 'create', 'Can add new dams'),
('dams.edit', 'Edit Dams', 'dams', 'edit', 'Can edit dam details'),
('dams.delete', 'Delete Dams', 'dams', 'delete', 'Can delete dams'),
('dams.operate_gates', 'Operate Gates', 'dams', 'operate', 'Can open/close dam gates'),
('dams.view_sensors', 'View Sensor Data', 'dams', 'view', 'Can view sensor readings'),
('dams.manage_sensors', 'Manage Sensors', 'dams', 'manage', 'Can add/edit/delete sensors'),

-- Alert Management
('alerts.view', 'View Alerts', 'alerts', 'view', 'Can view alerts'),
('alerts.create', 'Create Alerts', 'alerts', 'create', 'Can create new alerts'),
('alerts.edit', 'Edit Alerts', 'alerts', 'edit', 'Can edit alerts'),
('alerts.delete', 'Delete Alerts', 'alerts', 'delete', 'Can delete alerts'),
('alerts.broadcast', 'Broadcast Alerts', 'alerts', 'manage', 'Can send alerts to all users'),
('alerts.acknowledge', 'Acknowledge Alerts', 'alerts', 'manage', 'Can acknowledge alerts'),

-- Report Management
('reports.view', 'View Reports', 'reports', 'view', 'Can view user reports'),
('reports.create', 'Create Reports', 'reports', 'create', 'Can submit reports'),
('reports.review', 'Review Reports', 'reports', 'edit', 'Can review and update report status'),
('reports.delete', 'Delete Reports', 'reports', 'delete', 'Can delete reports'),
('reports.assign', 'Assign Reports', 'reports', 'manage', 'Can assign reports to users'),

-- Safe Locations
('locations.view', 'View Safe Locations', 'locations', 'view', 'Can view safe locations'),
('locations.create', 'Create Safe Locations', 'locations', 'create', 'Can add safe locations'),
('locations.edit', 'Edit Safe Locations', 'locations', 'edit', 'Can edit safe locations'),
('locations.delete', 'Delete Safe Locations', 'locations', 'delete', 'Can delete safe locations'),

-- Settings
('settings.view', 'View Settings', 'settings', 'view', 'Can view system settings'),
('settings.edit', 'Edit Settings', 'settings', 'edit', 'Can modify system settings'),

-- Audit
('audit.view', 'View Audit Logs', 'audit', 'view', 'Can view audit logs'),
('audit.export', 'Export Audit Logs', 'audit', 'manage', 'Can export audit data'),

-- Emergency Module
('emergency.contacts.view', 'View Emergency Contacts', 'emergency', 'view', 'Can view own emergency contacts'),
('emergency.contacts.manage', 'Manage Emergency Contacts', 'emergency', 'manage', 'Can add/edit/delete emergency contacts'),
('emergency.locations.view', 'View Safe Locations', 'emergency', 'view', 'Can view safe locations'),
('emergency.locations.manage', 'Manage Personal Locations', 'emergency', 'manage', 'Can manage personal safe locations'),
('emergency.sos.trigger', 'Trigger SOS', 'emergency', 'create', 'Can trigger SOS events'),
('emergency.sos.view_own', 'View Own SOS History', 'emergency', 'view', 'Can view own SOS history'),
('emergency.sos.view_all', 'View All SOS Events', 'emergency', 'view', 'Can view all SOS events'),
('emergency.sos.respond', 'Respond to SOS', 'emergency', 'manage', 'Can acknowledge and respond to SOS');

-- Assign All Permissions to Super Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'super_admin'), id FROM permissions;

-- Assign Permissions to Admin (excluding role deletion)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'admin'), id
FROM permissions WHERE code NOT IN ('roles.delete', 'settings.edit');

-- Assign Permissions to Operator
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'operator'), id
FROM permissions WHERE module IN ('dams', 'alerts') OR code IN ('reports.view', 'reports.create', 'locations.view');

-- Assign Permissions to Moderator
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'moderator'), id
FROM permissions WHERE module IN ('reports') OR code IN ('users.view', 'dams.view', 'alerts.view', 'locations.view');

-- Assign Permissions to Regular User
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE code = 'user'), id
FROM permissions WHERE code IN ('dams.view', 'alerts.view', 'reports.view', 'reports.create', 'locations.view', 
    'emergency.contacts.view', 'emergency.contacts.manage', 'emergency.locations.view', 'emergency.locations.manage',
    'emergency.sos.trigger', 'emergency.sos.view_own');


-- ============================================================================
-- 2. DAM MANAGEMENT Default Data
-- ============================================================================

-- Default Hazard Levels
INSERT INTO hazard_levels (level_number, code, name, name_si, description, color, fill_opacity, stroke_color, evacuation_required, notification_priority, estimated_flood_time_minutes, display_order) VALUES
(1, 'LEVEL_1', 'Extreme Danger Zone', 'ආන්තික අනතුරු කලාපය', 'Immediate downstream area - Dam to 1km. Highest risk of catastrophic flooding.', '#DC2626', 0.50, '#991B1B', TRUE, 'critical', 5, 1),
(2, 'LEVEL_2', 'High Danger Zone', 'ඉහළ අනතුරු කලාපය', '1km to 5km downstream. High risk with fast-moving flood waters.', '#EA580C', 0.45, '#C2410C', TRUE, 'critical', 15, 2),
(3, 'LEVEL_3', 'Moderate Danger Zone', 'මධ්‍යම අනතුරු කලාපය', '5km to 15km downstream. Moderate risk, evacuation recommended.', '#F59E0B', 0.40, '#D97706', TRUE, 'high', 45, 3),
(4, 'LEVEL_4', 'Low Danger Zone', 'අඩු අනතුරු කලාපය', '15km to 30km downstream. Lower risk but stay alert.', '#EAB308', 0.35, '#CA8A04', FALSE, 'medium', 120, 4),
(5, 'LEVEL_5', 'Watch Zone', 'නිරීක්ෂණ කලාපය', '30km+ downstream. Minimal risk, monitoring required.', '#22C55E', 0.30, '#16A34A', FALSE, 'low', 240, 5);

-- Default Sensor Types
INSERT INTO sensor_types (code, name, description, unit, min_threshold, max_threshold, critical_threshold) VALUES
('WATER_LEVEL', 'Water Level Sensor', 'Measures water level in the reservoir', 'meters', 0, 100, 95),
('WATER_FLOW', 'Water Flow Sensor', 'Measures inflow/outflow rate', 'cumecs', 0, 5000, 4000),
('PRESSURE', 'Pressure Sensor', 'Measures water pressure at dam structure', 'kPa', 0, 1000, 900),
('SEEPAGE', 'Seepage Sensor', 'Monitors water seepage through dam', 'liters/min', 0, 100, 80),
('TILT', 'Tilt/Inclinometer', 'Measures structural tilt/movement', 'degrees', -5, 5, 3),
('VIBRATION', 'Vibration Sensor', 'Monitors structural vibrations', 'mm/s', 0, 50, 40),
('TEMPERATURE', 'Temperature Sensor', 'Measures water/ambient temperature', 'celsius', -10, 50, 45),
('RAINFALL', 'Rain Gauge', 'Measures precipitation', 'mm', 0, 500, 300),
('GATE_POSITION', 'Gate Position Sensor', 'Monitors spillway gate opening', 'percentage', 0, 100, NULL);


-- ============================================================================
-- 3. EMERGENCY MODULE Default Data
-- ============================================================================

-- Default Relationship Types
INSERT INTO contact_relationship_types (code, name, name_si, category, icon, priority_weight, display_order) VALUES
('parent', 'Parent', 'දෙමව්පියෝ', 'family', 'account-child', 100, 1),
('spouse', 'Spouse', 'කලත්‍රයා', 'family', 'heart', 100, 2),
('child', 'Child', 'දරුවා', 'family', 'baby-face', 90, 3),
('sibling', 'Sibling', 'සහෝදරයා/සහෝදරිය', 'family', 'account-multiple', 80, 4),
('relative', 'Relative', 'ඥාතියා', 'family', 'account-group', 70, 5),
('guardian', 'Guardian', 'භාරකරු', 'family', 'shield-account', 95, 6),
('friend', 'Friend', 'මිතුරා', 'friend', 'account-heart', 60, 10),
('neighbor', 'Neighbor', 'අසල්වැසියා', 'friend', 'home-group', 50, 11),
('coworker', 'Coworker', 'සේවක සගයා', 'friend', 'briefcase-account', 40, 12),
('caregiver', 'Caregiver', 'රැකවරණකරු', 'professional', 'hand-heart', 85, 13),
('doctor', 'Doctor', 'වෛද්‍යවරයා', 'professional', 'doctor', 75, 20),
('hospital', 'Hospital', 'රෝහල', 'professional', 'hospital-building', 75, 21),
('police', 'Police', 'පොලිසිය', 'emergency_service', 'police-badge', 100, 30),
('fire_brigade', 'Fire Brigade', 'ගිනි නිවීම් ඒකකය', 'emergency_service', 'fire-truck', 100, 31),
('ambulance', 'Ambulance', 'ගිලන්රථය', 'emergency_service', 'ambulance', 100, 32),
('other', 'Other', 'වෙනත්', 'other', 'account', 10, 99);

-- Default Location Types
INSERT INTO location_types (code, name, name_si, category, icon, marker_color, is_evacuation_point, display_order) VALUES
('home', 'Home', 'නිවස', 'personal', 'home', '#22C55E', FALSE, 1),
('work', 'Work', 'රැකියා ස්ථානය', 'personal', 'briefcase', '#3B82F6', FALSE, 2),
('school', 'School', 'පාසල', 'personal', 'school', '#8B5CF6', FALSE, 3),
('family_house', 'Family House', 'ඥාතීන්ගේ නිවස', 'personal', 'home-heart', '#F59E0B', FALSE, 4),
('evacuation_center', 'Evacuation Center', 'ඉවත් කිරීමේ මධ්‍යස්ථානය', 'shelter', 'shield-home', '#EF4444', TRUE, 10),
('shelter', 'Shelter', 'නවාතැන', 'shelter', 'home-roof', '#DC2626', TRUE, 11),
('safe_zone', 'Safe Zone', 'ආරක්ෂිත කලාපය', 'shelter', 'shield-check', '#059669', TRUE, 12),
('community_hall', 'Community Hall', 'ප්‍රජා ශාලාව', 'shelter', 'town-hall', '#7C3AED', TRUE, 13),
('hospital', 'Hospital', 'රෝහල', 'medical', 'hospital-building', '#EF4444', TRUE, 20),
('clinic', 'Clinic', 'සායනය', 'medical', 'medical-bag', '#F97316', FALSE, 21),
('police_station', 'Police Station', 'පොලිස් ස්ථානය', 'emergency_service', 'police-badge', '#1E40AF', FALSE, 30),
('fire_station', 'Fire Station', 'ගිනි නිවීම් ස්ථානය', 'emergency_service', 'fire-truck', '#B91C1C', FALSE, 31),
('temple', 'Temple', 'පන්සල', 'religious', 'cross', '#F59E0B', TRUE, 40),
('mosque', 'Mosque', 'මුස්ලිම් පල්ලිය', 'religious', 'mosque', '#059669', TRUE, 41),
('church', 'Church', 'පල්ලිය', 'religious', 'church', '#6366F1', TRUE, 42),
('public_ground', 'Public Ground', 'මහජන ක්‍රීඩාංගනය', 'public', 'stadium', '#22C55E', TRUE, 50),
('other', 'Other', 'වෙනත්', 'other', 'map-marker', '#6B7280', FALSE, 99);

-- Default SOS Event Types
INSERT INTO sos_event_types (code, name, name_si, severity_level, auto_notify_authorities, icon, color, default_message, display_order) VALUES
('flood_emergency', 'Flood Emergency', 'ගංවතුර හදිසි අවස්ථාව', 5, TRUE, 'waves', '#3B82F6', 'I am in a flood emergency and need immediate help!', 1),
('dam_breach', 'Dam Breach Alert', 'වේලි බිඳීමේ අනතුරු ඇඟවීම', 5, TRUE, 'water-alert', '#EF4444', 'Dam breach detected in my area. Need evacuation assistance!', 2),
('medical_emergency', 'Medical Emergency', 'වෛද්‍ය හදිසි අවස්ථාව', 4, TRUE, 'hospital-box', '#DC2626', 'I need medical assistance urgently!', 3),
('stranded', 'Stranded', 'අතරමං වී ඇත', 4, FALSE, 'car-off', '#F59E0B', 'I am stranded and need help to evacuate.', 4),
('general_sos', 'General SOS', 'සාමාන්‍ය SOS', 3, FALSE, 'alert-circle', '#EF4444', 'I need emergency assistance!', 5),
('check_in', 'Safety Check-in', 'ආරක්ෂිත බව තහවුරු කිරීම', 1, FALSE, 'check-circle', '#22C55E', 'I am safe at this location.', 10);


-- ============================================================================
-- 4. ALERTS Default Data
-- ============================================================================

-- Default Alert Types
INSERT INTO alert_types (code, name, name_si, category, severity, icon, color, requires_acknowledgment, title_template, display_order) VALUES
('dam_water_high', 'High Water Level', 'ඉහළ ජල මට්ටම', 'dam', 'warning', 'water-alert', '#F59E0B', FALSE, 'High Water Level at {dam_name}', 1),
('dam_water_critical', 'Critical Water Level', 'ආන්තික ජල මට්ටම', 'dam', 'critical', 'water-alert', '#EF4444', TRUE, 'CRITICAL: Water Level at {dam_name}', 2),
('dam_spillway_open', 'Spillway Gates Opening', 'වාන් දොරටු විවෘත කිරීම', 'dam', 'warning', 'gate', '#3B82F6', FALSE, 'Spillway Opening at {dam_name}', 3),
('dam_emergency_release', 'Emergency Water Release', 'හදිසි ජල මුදා හැරීම', 'dam', 'emergency', 'waves', '#DC2626', TRUE, 'EMERGENCY: Water Release at {dam_name}', 4),
('flood_warning', 'Flood Warning', 'ගංවතුර අනතුරු ඇඟවීම', 'flood', 'warning', 'waves', '#F59E0B', FALSE, 'Flood Warning for {region_name}', 10),
('flood_critical', 'Severe Flood Alert', 'දරුණු ගංවතුර අනතුර', 'flood', 'critical', 'waves', '#EF4444', TRUE, 'SEVERE FLOOD: {region_name}', 11),
('weather_heavy_rain', 'Heavy Rainfall Warning', 'අධික වර්ෂාපතන අනතුරු ඇඟවීම', 'weather', 'warning', 'weather-pouring', '#3B82F6', FALSE, 'Heavy Rain Expected in {region_name}', 20),
('weather_storm', 'Storm Warning', 'කුණාටු අනතුරු ඇඟවීම', 'weather', 'critical', 'weather-lightning', '#7C3AED', FALSE, 'Storm Warning for {region_name}', 21),
('evacuation_advisory', 'Evacuation Advisory', 'ඉවත්වීමේ උපදේශනය', 'evacuation', 'warning', 'run', '#F59E0B', FALSE, 'Evacuation Advisory: {zone_name}', 30),
('evacuation_order', 'Evacuation Order', 'ඉවත්වීමේ නියෝගය', 'evacuation', 'emergency', 'run-fast', '#DC2626', TRUE, 'EVACUATE NOW: {zone_name}', 31),
('system_test', 'System Test Alert', 'පද්ධති පරීක්ෂණ අනතුරු ඇඟවීම', 'system', 'info', 'bell-ring', '#6B7280', FALSE, 'Test Alert - Please Ignore', 99);


-- ============================================================================
-- 5. REPORTS Default Data
-- ============================================================================

-- Default Report Types
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


-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
-- Total Tables: 52
-- 
-- Module 1 - Users & RBAC: 8 tables
-- Module 2 - Dam Management: 18 tables  
-- Module 3 - Emergency Contacts: 14 tables
-- Module 4 - Alerts: 6 tables
-- Module 5 - Reports: 6 tables
-- ============================================================================
