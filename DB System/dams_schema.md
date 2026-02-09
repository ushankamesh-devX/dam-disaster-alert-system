# Dam Management Database Schema

## Overview

This schema provides comprehensive dam management including:
- Dam master data with overall hazard status
- Multiple hazard zones per dam with drawn GeoJSON polygons
- Sensors and real-time readings
- Gate operations and logging
- Dynamic custom fields for extra dam data

---

## Tables

### 1. Regions Table

Geographic regions/districts.

```sql
CREATE TABLE regions (
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
```

---

### 2. Hazard Levels Reference Table

Define hazard levels (1-5) with colors and settings.

```sql
CREATE TABLE hazard_levels (
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
```

---

### 3. Dams Master Table

Main dam information with overall hazard status.

```sql
CREATE TABLE dams (
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
    
    -- Overall Hazard Level (calculated/manual)
    overall_hazard_level_id BIGINT UNSIGNED COMMENT 'Current overall hazard level',
    overall_hazard_status ENUM('safe', 'low', 'moderate', 'high', 'severe', 'critical') DEFAULT 'safe',
    hazard_last_assessed_at TIMESTAMP,
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
```

---

### 4. Dam Hazard Zones (Multiple Areas Per Dam)

Store drawn hazard areas with GeoJSON polygons.

```sql
CREATE TABLE dam_hazard_zones (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dam_id BIGINT UNSIGNED NOT NULL,
    hazard_level_id BIGINT UNSIGNED NOT NULL,
    zone_code VARCHAR(50) NOT NULL COMMENT 'Unique code like DAM001_L1_Z1',
    zone_name VARCHAR(200) NOT NULL,
    zone_name_si VARCHAR(200),
    description TEXT,
    description_si TEXT,
    
    -- GeoJSON Polygon Data (drawn on satellite map)
    boundary_geojson JSON NOT NULL COMMENT 'Polygon coordinates from map drawing',
    center_latitude DECIMAL(10, 8) COMMENT 'Calculated center of polygon',
    center_longitude DECIMAL(11, 8),
    area_sq_km DECIMAL(12, 4) COMMENT 'Calculated area in sq km',
    perimeter_km DECIMAL(10, 4),
    
    -- Zone Details
    distance_from_dam_km DECIMAL(8, 2) COMMENT 'Distance from dam to zone start',
    estimated_flood_arrival_minutes INT COMMENT 'Time for flood to reach this zone',
    estimated_water_depth_meters DECIMAL(6, 2) COMMENT 'Expected flood depth',
    flood_velocity_mps DECIMAL(6, 2) COMMENT 'Expected flood velocity m/s',
    
    -- Display Settings
    fill_color VARCHAR(20) COMMENT 'Override level color if needed',
    fill_opacity DECIMAL(3, 2),
    stroke_color VARCHAR(20),
    stroke_width INT,
    display_order INT DEFAULT 0 COMMENT 'Layer order on map',
    show_label BOOLEAN DEFAULT TRUE,
    label_position JSON COMMENT 'Label lat/lng position',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by BIGINT UNSIGNED,
    verified_at TIMESTAMP,
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
```

---

### 5. Hazard Zone History

Track changes to hazard zone boundaries.

```sql
CREATE TABLE dam_hazard_zone_history (
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
```

---

### 6. Dam Hazard Assessments

History of hazard level calculations.

```sql
CREATE TABLE dam_hazard_assessments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dam_id BIGINT UNSIGNED NOT NULL,
    assessment_type ENUM('automatic', 'manual', 'scheduled', 'emergency') NOT NULL,
    
    -- Calculated Scores
    water_level_score DECIMAL(5, 2),
    inflow_score DECIMAL(5, 2),
    weather_score DECIMAL(5, 2),
    structural_score DECIMAL(5, 2),
    seismic_score DECIMAL(5, 2),
    overall_risk_score DECIMAL(5, 2) NOT NULL,
    
    -- Resulting Hazard Level
    previous_hazard_level_id BIGINT UNSIGNED,
    new_hazard_level_id BIGINT UNSIGNED NOT NULL,
    previous_status ENUM('safe', 'low', 'moderate', 'high', 'severe', 'critical'),
    new_status ENUM('safe', 'low', 'moderate', 'high', 'severe', 'critical') NOT NULL,
    
    -- Assessment Details
    assessment_notes TEXT,
    data_sources JSON COMMENT 'Sensor IDs, weather data used',
    triggered_by_sensor_id BIGINT UNSIGNED,
    triggered_by_value DECIMAL(12, 4),
    
    -- Actions Taken
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
```

---

### 7. Dam Current Status

Real-time status snapshot.

```sql
CREATE TABLE dam_current_status (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dam_id BIGINT UNSIGNED UNIQUE NOT NULL,
    
    -- Water Metrics
    water_level_meters DECIMAL(8, 2),
    water_level_percentage DECIMAL(5, 2),
    full_reservoir_level_meters DECIMAL(8, 2),
    danger_level_meters DECIMAL(8, 2),
    inflow_cumecs DECIMAL(10, 2),
    outflow_cumecs DECIMAL(10, 2),
    storage_current_mcm DECIMAL(12, 4),
    storage_percentage DECIMAL(5, 2),
    
    -- Gate Status
    spillway_gate_status JSON,
    gates_open_count INT DEFAULT 0,
    total_gates_count INT,
    
    -- Current Hazard Status
    current_hazard_level_id BIGINT UNSIGNED,
    hazard_status ENUM('safe', 'low', 'moderate', 'high', 'severe', 'critical') DEFAULT 'safe',
    hazard_value VARCHAR(50),
    flood_risk_score DECIMAL(5, 2),
    active_hazard_zones JSON COMMENT 'Currently active zone IDs',
    
    -- Weather Impact
    rainfall_last_1hr_mm DECIMAL(8, 2),
    rainfall_last_24hr_mm DECIMAL(8, 2),
    rainfall_forecast_24hr_mm DECIMAL(8, 2),
    
    last_sensor_reading_at TIMESTAMP,
    last_hazard_assessment_at TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE CASCADE,
    FOREIGN KEY (current_hazard_level_id) REFERENCES hazard_levels(id) ON DELETE SET NULL,
    INDEX idx_status_hazard (hazard_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 8. Dam Gates/Spillways

```sql
CREATE TABLE dam_gates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dam_id BIGINT UNSIGNED NOT NULL,
    gate_number VARCHAR(20) NOT NULL,
    gate_type ENUM('radial', 'vertical', 'drum', 'flap', 'sluice') NOT NULL,
    max_opening_meters DECIMAL(6, 2),
    current_opening_meters DECIMAL(6, 2) DEFAULT 0,
    status ENUM('closed', 'partial', 'fully_open', 'maintenance', 'jammed') DEFAULT 'closed',
    last_operation_at TIMESTAMP,
    operated_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE CASCADE,
    FOREIGN KEY (operated_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_dam_gate (dam_id, gate_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 9. Gate Operation Logs

```sql
CREATE TABLE gate_operation_logs (
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
```

---

### 10. Sensor Types Reference

```sql
CREATE TABLE sensor_types (
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
```

---

### 11. Sensors

```sql
CREATE TABLE sensors (
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
    last_reading_at TIMESTAMP,
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
```

---

### 12. Sensor Readings (Partitioned)

```sql
CREATE TABLE sensor_readings (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE (UNIX_TIMESTAMP(recorded_at)) (
    PARTITION p_2025_q1 VALUES LESS THAN (UNIX_TIMESTAMP('2025-04-01')),
    PARTITION p_2025_q2 VALUES LESS THAN (UNIX_TIMESTAMP('2025-07-01')),
    PARTITION p_2025_q3 VALUES LESS THAN (UNIX_TIMESTAMP('2025-10-01')),
    PARTITION p_2025_q4 VALUES LESS THAN (UNIX_TIMESTAMP('2026-01-01')),
    PARTITION p_2026_q1 VALUES LESS THAN (UNIX_TIMESTAMP('2026-04-01')),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

---

### 13. Sensor Readings Aggregated

```sql
CREATE TABLE sensor_readings_aggregated (
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
```

---

## Custom Fields Tables

### 14. Custom Field Definitions

Define extra fields that vary per dam.

```sql
CREATE TABLE dam_custom_field_definitions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    field_code VARCHAR(50) UNIQUE NOT NULL COMMENT 'e.g., downstream_villages, power_capacity',
    field_name VARCHAR(100) NOT NULL,
    field_name_si VARCHAR(100),
    description TEXT,
    
    -- Field Type & Validation
    field_type ENUM('text', 'number', 'decimal', 'boolean', 'date', 'datetime', 'select', 'multi_select', 'json', 'file', 'image', 'url', 'email', 'phone', 'textarea', 'rich_text', 'coordinates') NOT NULL DEFAULT 'text',
    
    -- For select/multi_select types
    options JSON COMMENT '[{"value": "opt1", "label": "Option 1"}, ...]',
    
    -- Validation Rules
    is_required BOOLEAN DEFAULT FALSE,
    min_value DECIMAL(15, 4),
    max_value DECIMAL(15, 4),
    min_length INT,
    max_length INT,
    regex_pattern VARCHAR(500),
    validation_message VARCHAR(255),
    default_value TEXT,
    
    -- Field Grouping
    field_group VARCHAR(100) COMMENT 'e.g., technical, environmental, historical',
    field_group_order INT DEFAULT 0,
    
    -- Display Settings
    display_order INT DEFAULT 0,
    display_in_list BOOLEAN DEFAULT FALSE COMMENT 'Show in dam list table',
    display_in_details BOOLEAN DEFAULT TRUE COMMENT 'Show in dam details',
    display_in_map_popup BOOLEAN DEFAULT FALSE,
    icon VARCHAR(100),
    unit VARCHAR(50) COMMENT 'e.g., MW, km², tons',
    
    -- Access Control
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
```

---

### 15. Custom Field Values

Store actual values per dam.

```sql
CREATE TABLE dam_custom_field_values (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dam_id BIGINT UNSIGNED NOT NULL,
    field_id BIGINT UNSIGNED NOT NULL,
    
    -- Store value based on type (only one will be used)
    value_text TEXT,
    value_number DECIMAL(20, 6),
    value_boolean BOOLEAN,
    value_date DATE,
    value_datetime TIMESTAMP NULL,
    value_json JSON,
    
    -- For file/image uploads
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size_bytes BIGINT,
    file_mime_type VARCHAR(100),
    
    -- Metadata
    notes TEXT,
    source VARCHAR(255) COMMENT 'Where this data came from',
    verified BOOLEAN DEFAULT FALSE,
    verified_by BIGINT UNSIGNED,
    verified_at TIMESTAMP,
    
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
```

---

### 16. Custom Field History

```sql
CREATE TABLE dam_custom_field_history (
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
```

---

### 17. Field Templates

Group fields by dam type.

```sql
CREATE TABLE dam_field_templates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    template_code VARCHAR(50) UNIQUE NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    description TEXT,
    dam_type ENUM('earth', 'gravity', 'arch', 'buttress', 'embankment', 'composite', 'all') DEFAULT 'all',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE dam_field_template_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    template_id BIGINT UNSIGNED NOT NULL,
    field_id BIGINT UNSIGNED NOT NULL,
    is_required BOOLEAN DEFAULT FALSE COMMENT 'Override field default',
    display_order INT DEFAULT 0,
    
    FOREIGN KEY (template_id) REFERENCES dam_field_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES dam_custom_field_definitions(id) ON DELETE CASCADE,
    UNIQUE KEY uk_template_field (template_id, field_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Default Data

### Default Hazard Levels

```sql
INSERT INTO hazard_levels (level_number, code, name, name_si, description, color, fill_opacity, stroke_color, evacuation_required, notification_priority, estimated_flood_time_minutes, display_order) VALUES
(1, 'LEVEL_1', 'Extreme Danger Zone', 'ආන්තික අනතුරු කලාපය', 'Immediate downstream area - Dam to 1km. Highest risk of catastrophic flooding.', '#DC2626', 0.50, '#991B1B', TRUE, 'critical', 5, 1),
(2, 'LEVEL_2', 'High Danger Zone', 'ඉහළ අනතුරු කලාපය', '1km to 5km downstream. High risk with fast-moving flood waters.', '#EA580C', 0.45, '#C2410C', TRUE, 'critical', 15, 2),
(3, 'LEVEL_3', 'Moderate Danger Zone', 'මධ්‍යම අනතුරු කලාපය', '5km to 15km downstream. Moderate risk, evacuation recommended.', '#F59E0B', 0.40, '#D97706', TRUE, 'high', 45, 3),
(4, 'LEVEL_4', 'Low Danger Zone', 'අඩු අනතුරු කලාපය', '15km to 30km downstream. Lower risk but stay alert.', '#EAB308', 0.35, '#CA8A04', FALSE, 'medium', 120, 4),
(5, 'LEVEL_5', 'Watch Zone', 'නිරීක්ෂණ කලාපය', '30km+ downstream. Minimal risk, monitoring required.', '#22C55E', 0.30, '#16A34A', FALSE, 'low', 240, 5);
```

### Default Sensor Types

```sql
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
```

### Default Custom Field Definitions

```sql
INSERT INTO dam_custom_field_definitions (field_code, field_name, field_type, field_group, unit, description, display_order) VALUES

-- Technical Fields
('power_generation_capacity', 'Power Generation Capacity', 'decimal', 'technical', 'MW', 'Hydroelectric power generation capacity', 1),
('turbine_count', 'Number of Turbines', 'number', 'technical', NULL, 'Number of turbines installed', 2),
('turbine_type', 'Turbine Type', 'select', 'technical', NULL, 'Type of turbines used', 3),
('annual_power_output', 'Annual Power Output', 'decimal', 'technical', 'GWh', 'Average annual power generation', 4),
('design_flood', 'Design Flood', 'decimal', 'technical', 'cumecs', 'Maximum flood the dam is designed to handle', 5),
('pmf', 'Probable Maximum Flood (PMF)', 'decimal', 'technical', 'cumecs', 'Estimated maximum flood possible', 6),

-- Environmental Fields
('fish_ladder', 'Fish Ladder Available', 'boolean', 'environmental', NULL, 'Whether dam has fish passage', 10),
('environmental_flow', 'Environmental Flow', 'decimal', 'environmental', 'cumecs', 'Minimum downstream flow maintained', 11),
('sedimentation_rate', 'Sedimentation Rate', 'decimal', 'environmental', 'MCM/year', 'Annual sediment accumulation', 12),

-- Historical Fields
('construction_start_date', 'Construction Start Date', 'date', 'historical', NULL, 'When construction began', 20),
('construction_cost', 'Construction Cost', 'decimal', 'historical', 'LKR', 'Original construction cost', 21),

-- Operational Fields
('staff_count', 'Staff Count', 'number', 'operational', NULL, 'Number of permanent staff', 30),
('backup_power', 'Backup Power Available', 'boolean', 'operational', NULL, 'Generator backup available', 31),
('scada_enabled', 'SCADA System', 'boolean', 'operational', NULL, 'Has SCADA monitoring system', 32),
('remote_operation', 'Remote Operation Capable', 'boolean', 'operational', NULL, 'Can be operated remotely', 33),

-- Downstream Impact Fields
('downstream_villages', 'Downstream Villages', 'json', 'downstream', NULL, 'List of villages downstream', 50),
('downstream_population', 'Downstream Population', 'number', 'downstream', NULL, 'Total population in flood zone', 51),
('warning_sirens', 'Warning Sirens Installed', 'number', 'downstream', NULL, 'Number of warning sirens downstream', 52);
```

---

## Useful Views

### View: Dam with All Hazard Zones

```sql
CREATE VIEW v_dam_hazard_zones AS
SELECT 
    d.id AS dam_id,
    d.code AS dam_code,
    d.name AS dam_name,
    d.overall_hazard_status,
    dhz.id AS zone_id,
    dhz.zone_code,
    dhz.zone_name,
    hl.level_number,
    hl.name AS hazard_level_name,
    hl.color AS hazard_color,
    dhz.area_sq_km,
    dhz.estimated_flood_arrival_minutes,
    dhz.boundary_geojson,
    dhz.is_active,
    dhz.is_verified
FROM dams d
LEFT JOIN dam_hazard_zones dhz ON d.id = dhz.dam_id
LEFT JOIN hazard_levels hl ON dhz.hazard_level_id = hl.id
WHERE dhz.is_active = TRUE
ORDER BY d.id, hl.level_number, dhz.display_order;
```

### View: Dam Summary with Zone Counts

```sql
CREATE VIEW v_dam_hazard_summary AS
SELECT 
    d.id,
    d.code,
    d.name,
    d.latitude,
    d.longitude,
    d.overall_hazard_status,
    dcs.water_level_percentage,
    dcs.flood_risk_score,
    (SELECT COUNT(*) FROM dam_hazard_zones WHERE dam_id = d.id AND is_active = TRUE) AS total_zones,
    (SELECT COUNT(*) FROM dam_hazard_zones WHERE dam_id = d.id AND is_active = TRUE AND hazard_level_id = 1) AS level_1_zones,
    (SELECT COUNT(*) FROM dam_hazard_zones WHERE dam_id = d.id AND is_active = TRUE AND hazard_level_id = 2) AS level_2_zones,
    (SELECT COUNT(*) FROM dam_hazard_zones WHERE dam_id = d.id AND is_active = TRUE AND hazard_level_id = 3) AS level_3_zones,
    (SELECT SUM(area_sq_km) FROM dam_hazard_zones WHERE dam_id = d.id AND is_active = TRUE) AS total_hazard_area_sqkm
FROM dams d
LEFT JOIN dam_current_status dcs ON d.id = dcs.dam_id;
```

### View: Active Hazard Zones for Map Display

```sql
CREATE VIEW v_active_hazard_zones_map AS
SELECT 
    dhz.id,
    dhz.dam_id,
    d.name AS dam_name,
    dhz.zone_code,
    dhz.zone_name,
    hl.level_number,
    hl.name AS level_name,
    COALESCE(dhz.fill_color, hl.color) AS fill_color,
    COALESCE(dhz.fill_opacity, hl.fill_opacity) AS fill_opacity,
    COALESCE(dhz.stroke_color, hl.stroke_color) AS stroke_color,
    COALESCE(dhz.stroke_width, hl.stroke_width) AS stroke_width,
    dhz.boundary_geojson,
    dhz.center_latitude,
    dhz.center_longitude,
    dhz.area_sq_km,
    dhz.estimated_flood_arrival_minutes,
    dhz.show_label,
    dhz.label_position,
    dhz.display_order
FROM dam_hazard_zones dhz
JOIN dams d ON dhz.dam_id = d.id
JOIN hazard_levels hl ON dhz.hazard_level_id = hl.id
WHERE dhz.is_active = TRUE
ORDER BY dhz.display_order, hl.level_number;
```

---

## Entity Relationship Diagram

```
┌──────────────────┐      ┌──────────────────┐
│  hazard_levels   │      │     regions      │
│──────────────────│      │──────────────────│
│ level_number: 1-5│      │ name, boundary   │
│ color, opacity   │      └────────┬─────────┘
└────────┬─────────┘               │
         │                         ▼
         │               ┌──────────────────────┐
         │               │        dams          │
         │               │──────────────────────│
         │               │ overall_hazard_status│
         │               │ overall_hazard_level │
         │               └──────────┬───────────┘
         │                          │
         │    ┌────────────┬────────┼────────┬────────────┐
         │    │            │        │        │            │
         │    ▼            ▼        ▼        ▼            ▼
         │  ┌──────────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐
         │  │dam_gates │ │status│ │sensor│ │custom│ │hazard_   │
         │  └────┬─────┘ └──────┘ └──┬───┘ │fields│ │zones     │
         │       │                   │     └──────┘ └────┬─────┘
         │       ▼                   ▼                   │
         │  ┌──────────┐        ┌────────┐               │
         │  │gate_logs │        │readings│               │
         │  └──────────┘        └────────┘               │
         │                                               │
         └───────────────────────────────────────────────┘
```

---

## Summary

| Table | Purpose |
|-------|---------|
| `regions` | Geographic regions/districts |
| `hazard_levels` | Hazard level definitions (1-5) |
| `dams` | Master dam info + overall hazard |
| `dam_hazard_zones` | Multiple drawn hazard areas per dam |
| `dam_hazard_zone_history` | Track zone boundary changes |
| `dam_hazard_assessments` | Hazard level calculation history |
| `dam_current_status` | Real-time status snapshot |
| `dam_gates` | Spillway gates |
| `gate_operation_logs` | Gate operation history |
| `sensor_types` | Sensor type reference |
| `sensors` | Sensors per dam |
| `sensor_readings` | Real-time readings (partitioned) |
| `sensor_readings_aggregated` | Hourly/daily summaries |
| `dam_custom_field_definitions` | Dynamic custom field definitions |
| `dam_custom_field_values` | Custom field values per dam |
| `dam_custom_field_history` | Custom field change history |
| `dam_field_templates` | Group fields by dam type |
| `dam_field_template_items` | Template-field mapping |

**Total: 18 Tables**
