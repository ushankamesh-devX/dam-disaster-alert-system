# Emergency Contacts, Safe Locations, & Emergency Response — Database Schema

## Overview

This schema provides a comprehensive, **scalable emergency response system** supporting:
- **Dynamic relationship types** (configurable via lookup table)
- **Dynamic location types** with multi-language support
- **System & User safe locations** (official evacuation centers + personal locations)
- **Real-time SOS events** with multi-channel notification tracking
- **Live hazard context snapshots** tied to dam hazard zones
- **Emergency service providers** (hospitals, fire stations, police, etc.)
- **Location sharing sessions** for emergency tracking
- **Audit trails** for all critical operations

> SQL dialect: **MySQL 8+** (InnoDB, `utf8mb4`).

---

## Dependencies (existing tables)

This schema references tables defined in other schema documents:
- `users`, `roles`, `permissions` (from `users_rbac_schema.md`)
- `hazard_levels`, `dams`, `dam_hazard_zones`, `regions` (from `dams_schema.md`)

---

## Tables

### 1. Contact Relationship Types (Lookup Table)

Dynamic relationship types for scalability (instead of ENUM).

```sql
CREATE TABLE contact_relationship_types (
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
```

---

### 2. Emergency Contacts

Stores emergency contacts for each user with dynamic relationship support.

```sql
CREATE TABLE emergency_contacts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,

    -- Contact Details
    contact_name VARCHAR(120) NOT NULL,
    contact_name_si VARCHAR(120) NULL,
    phone_number VARCHAR(20) NOT NULL,
    phone_number_alt VARCHAR(20) NULL COMMENT 'Alternative phone number',
    email VARCHAR(255) NULL,
    
    -- Relationship (FK to lookup table)
    relationship_type_id BIGINT UNSIGNED NOT NULL,
    custom_relationship VARCHAR(100) NULL COMMENT 'When relationship is "other"',
    
    -- Optional: Contact is also a registered user
    contact_user_id BIGINT UNSIGNED NULL COMMENT 'FK to users if contact is registered',

    -- Priority & Settings
    priority_order INT DEFAULT 1 COMMENT '1=highest priority',
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Communication Preferences
    can_receive_sms BOOLEAN DEFAULT TRUE,
    can_receive_calls BOOLEAN DEFAULT TRUE,
    can_receive_push BOOLEAN DEFAULT TRUE,
    can_receive_whatsapp BOOLEAN DEFAULT FALSE,
    preferred_language ENUM('en', 'si', 'ta') DEFAULT 'en',
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP NULL,
    verification_code VARCHAR(10) NULL,
    verification_expires_at TIMESTAMP NULL,

    -- Location (optional - for distance calculations)
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    
    notes VARCHAR(500) NULL,
    metadata JSON NULL COMMENT 'Extra flexible data',

    -- Audit
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
```

---

### 3. Location Types (Lookup Table)

Dynamic location types for safe locations (instead of ENUM).

```sql
CREATE TABLE location_types (
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
```

---

### 4. System Safe Locations (Official Evacuation Centers)

Admin-managed official safe locations/evacuation centers linked to regions and dams.

```sql
CREATE TABLE system_safe_locations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL COMMENT 'Unique code like EVA_COL_001',
    
    -- Basic Info
    name VARCHAR(200) NOT NULL,
    name_si VARCHAR(200) NULL,
    name_ta VARCHAR(200) NULL,
    description TEXT NULL,
    description_si TEXT NULL,
    
    -- Type & Category
    location_type_id BIGINT UNSIGNED NOT NULL,
    
    -- Geographic Info
    region_id BIGINT UNSIGNED NULL,
    address_text VARCHAR(500) NULL,
    address_si VARCHAR(500) NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    elevation_meters DECIMAL(8, 2) NULL COMMENT 'Important for flood safety',
    boundary_geojson JSON NULL COMMENT 'Facility boundary polygon',
    
    -- Capacity & Facilities
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
    
    -- Contact Info
    contact_name VARCHAR(120) NULL,
    contact_phone VARCHAR(20) NULL,
    contact_email VARCHAR(255) NULL,
    emergency_phone VARCHAR(20) NULL,
    
    -- Operating Hours
    operating_hours JSON NULL COMMENT '{"mon": "08:00-20:00", "emergency": "24/7"}',
    is_24_hours BOOLEAN DEFAULT FALSE,
    
    -- Dam/Zone Association
    primary_dam_id BIGINT UNSIGNED NULL COMMENT 'Primary dam this shelter serves',
    serves_hazard_zones JSON NULL COMMENT 'List of dam_hazard_zone IDs',
    distance_from_dam_km DECIMAL(8, 2) NULL,
    estimated_travel_time_minutes INT NULL,
    
    -- Status
    status ENUM('active', 'inactive', 'under_maintenance', 'full', 'closed') DEFAULT 'active',
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by BIGINT UNSIGNED NULL,
    verified_at TIMESTAMP NULL,
    last_inspection_date DATE NULL,
    next_inspection_date DATE NULL,
    
    -- Display Settings
    show_on_map BOOLEAN DEFAULT TRUE,
    marker_icon VARCHAR(100) NULL,
    marker_color VARCHAR(20) NULL,
    
    -- Media
    image_url VARCHAR(500) NULL,
    gallery_urls JSON NULL COMMENT 'Array of image URLs',
    
    -- Audit
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
```

---

### 5. User Safe Locations (Personal Locations + OSM)

Stores user-saved personal safe locations.

```sql
CREATE TABLE user_safe_locations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,

    -- Basic Info
    label VARCHAR(120) NOT NULL COMMENT 'User-friendly name e.g. Home, School',
    label_si VARCHAR(120) NULL,
    location_type_id BIGINT UNSIGNED NOT NULL,

    -- Address & Coordinates
    address_text VARCHAR(500) NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    elevation_meters DECIMAL(8, 2) NULL,
    
    -- Hazard Context (pre-computed)
    nearest_dam_id BIGINT UNSIGNED NULL,
    hazard_zone_id BIGINT UNSIGNED NULL,
    hazard_level_id BIGINT UNSIGNED NULL,
    distance_to_dam_km DECIMAL(8, 2) NULL,
    is_in_hazard_zone BOOLEAN DEFAULT FALSE,
    hazard_last_checked_at TIMESTAMP NULL,

    -- OpenStreetMap / Nominatim metadata (optional)
    osm_place_id VARCHAR(64) NULL,
    osm_display_name VARCHAR(800) NULL,
    osm_type VARCHAR(100) NULL COMMENT 'OSM type/category',
    osm_class VARCHAR(100) NULL COMMENT 'OSM class',
    osm_raw_response JSON NULL COMMENT 'Full OSM response for reference',

    source ENUM('manual', 'osm_search', 'osm_reverse_geocode', 'system_import') DEFAULT 'manual',
    
    -- User Preferences
    is_favorite BOOLEAN DEFAULT FALSE,
    is_home BOOLEAN DEFAULT FALSE COMMENT 'Primary home location',
    is_work BOOLEAN DEFAULT FALSE COMMENT 'Primary work location',
    notify_when_in_danger BOOLEAN DEFAULT TRUE COMMENT 'Send alerts when this location is in hazard zone',
    
    -- Contact at Location (optional)
    contact_name VARCHAR(120) NULL,
    contact_phone VARCHAR(20) NULL,
    
    notes VARCHAR(500) NULL,
    metadata JSON NULL COMMENT 'Extra flexible data',

    -- Audit
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
```

---

### 6. Emergency Service Providers

Official emergency services (hospitals, fire stations, police, etc.) per region.

```sql
CREATE TABLE emergency_service_providers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Basic Info
    name VARCHAR(200) NOT NULL,
    name_si VARCHAR(200) NULL,
    name_ta VARCHAR(200) NULL,
    description TEXT NULL,
    
    -- Service Type
    service_type ENUM('hospital', 'police', 'fire_brigade', 'ambulance', 'disaster_management', 'military', 'coast_guard', 'other') NOT NULL,
    location_type_id BIGINT UNSIGNED NULL,
    
    -- Geographic Info
    region_id BIGINT UNSIGNED NULL,
    address_text VARCHAR(500) NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    service_area_geojson JSON NULL COMMENT 'Polygon of service coverage area',
    
    -- Contact Info
    primary_phone VARCHAR(20) NOT NULL,
    secondary_phone VARCHAR(20) NULL,
    emergency_phone VARCHAR(20) NULL COMMENT 'Direct emergency line',
    email VARCHAR(255) NULL,
    website VARCHAR(500) NULL,
    
    -- Operating Info
    is_24_hours BOOLEAN DEFAULT TRUE,
    operating_hours JSON NULL,
    response_time_minutes INT NULL COMMENT 'Average response time',
    
    -- Capacity (for hospitals)
    total_beds INT NULL,
    icu_beds INT NULL,
    emergency_beds INT NULL,
    
    -- Status
    status ENUM('active', 'inactive', 'limited_service') DEFAULT 'active',
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by BIGINT UNSIGNED NULL,
    verified_at TIMESTAMP NULL,
    
    -- Display
    show_on_map BOOLEAN DEFAULT TRUE,
    marker_icon VARCHAR(100) NULL,
    marker_color VARCHAR(20) NULL,
    image_url VARCHAR(500) NULL,
    
    metadata JSON NULL,
    
    -- Audit
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
```

---

### 7. OpenStreetMap (Nominatim) Cache

Caching layer for OSM API calls to reduce rate limits and improve latency.

```sql
CREATE TABLE osm_place_cache (
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
```

---

### 8. User Hazard Location Snapshots

Stores computed hazard context for user locations at points in time.

```sql
CREATE TABLE user_hazard_location_snapshots (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,

    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Location
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy_meters DECIMAL(8, 2) NULL COMMENT 'GPS accuracy',
    altitude_meters DECIMAL(8, 2) NULL,
    
    -- Address (reverse geocoded)
    address_text VARCHAR(500) NULL,
    region_id BIGINT UNSIGNED NULL,

    -- Hazard Context
    hazard_level_id BIGINT UNSIGNED NULL,
    dam_id BIGINT UNSIGNED NULL,
    hazard_zone_id BIGINT UNSIGNED NULL,
    distance_to_dam_km DECIMAL(8, 2) NULL,
    distance_to_zone_boundary_km DECIMAL(8, 2) NULL,
    
    -- Risk Scores
    overall_risk_score DECIMAL(5, 2) NULL,
    flood_risk_score DECIMAL(5, 2) NULL,
    proximity_score DECIMAL(5, 2) NULL,

    -- Source & Context
    source ENUM('gps_auto', 'manual', 'sos_trigger', 'background_check', 'scheduled') DEFAULT 'gps_auto',
    trigger_event VARCHAR(100) NULL COMMENT 'What triggered this snapshot',
    context_json JSON NULL COMMENT 'Raw computation data: nearest zones, weather, etc.',
    
    -- Associated Safe Location
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
```

---

### 9. SOS Event Types (Lookup Table)

Configurable SOS event types for different emergency scenarios.

```sql
CREATE TABLE sos_event_types (
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
```

---

### 10. SOS Events

User-initiated SOS (panic) events with comprehensive tracking.

```sql
CREATE TABLE sos_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    
    -- Event Type
    sos_type_id BIGINT UNSIGNED NOT NULL,
    custom_message TEXT NULL COMMENT 'User-provided message',

    -- Status Flow
    status ENUM('triggered', 'acknowledged', 'responding', 'resolved', 'cancelled', 'false_alarm') DEFAULT 'triggered',
    
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP NULL,
    acknowledged_by BIGINT UNSIGNED NULL COMMENT 'Responder who acknowledged',
    responding_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    resolved_by BIGINT UNSIGNED NULL,
    cancelled_at TIMESTAMP NULL,
    cancellation_reason VARCHAR(500) NULL,

    -- Location at trigger time
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy_meters DECIMAL(8, 2) NULL,
    address_text VARCHAR(800) NULL,
    region_id BIGINT UNSIGNED NULL,

    -- Hazard context captured at trigger time
    hazard_level_id BIGINT UNSIGNED NULL,
    dam_id BIGINT UNSIGNED NULL,
    hazard_zone_id BIGINT UNSIGNED NULL,
    snapshot_id BIGINT UNSIGNED NULL COMMENT 'Link to user_hazard_location_snapshots',
    
    -- Risk Assessment
    risk_score_at_trigger DECIMAL(5, 2) NULL,
    
    -- Response Info
    nearest_safe_location_id BIGINT UNSIGNED NULL,
    assigned_responder_id BIGINT UNSIGNED NULL,
    response_notes TEXT NULL,
    resolution_notes TEXT NULL,
    
    -- Statistics
    notification_count INT DEFAULT 0,
    successful_notification_count INT DEFAULT 0,
    response_time_seconds INT NULL COMMENT 'Time from trigger to first response',
    
    -- Device Info
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
```

---

### 11. SOS Event Notifications

Tracks all notification attempts for SOS events.

```sql
CREATE TABLE sos_event_notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    sos_event_id BIGINT UNSIGNED NOT NULL,
    
    -- Recipient (either emergency contact OR service provider OR user)
    recipient_type ENUM('emergency_contact', 'service_provider', 'authority_user') NOT NULL,
    emergency_contact_id BIGINT UNSIGNED NULL,
    service_provider_id BIGINT UNSIGNED NULL,
    recipient_user_id BIGINT UNSIGNED NULL COMMENT 'For authority users',
    
    -- Recipient Info (denormalized for history)
    recipient_name VARCHAR(120) NULL,
    recipient_phone VARCHAR(20) NULL,
    recipient_email VARCHAR(255) NULL,

    -- Channel & Status
    channel ENUM('push', 'sms', 'call', 'email', 'whatsapp', 'in_app') DEFAULT 'sms',
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'high',

    status ENUM('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'cancelled') DEFAULT 'queued',

    -- Timestamps
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    
    -- Retry Logic
    attempt_count INT DEFAULT 1,
    max_attempts INT DEFAULT 3,
    next_retry_at TIMESTAMP NULL,

    -- Provider Response
    provider VARCHAR(100) NULL COMMENT 'twilio, firebase, smtp, etc.',
    provider_message_id VARCHAR(200) NULL,
    provider_status VARCHAR(100) NULL,
    provider_response JSON NULL,
    
    -- Error Handling
    error_code VARCHAR(50) NULL,
    error_message VARCHAR(800) NULL,
    
    -- Message Content
    message_template VARCHAR(100) NULL COMMENT 'Template used',
    message_content TEXT NULL COMMENT 'Actual message sent',
    
    -- Cost Tracking (optional)
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
```

---

### 12. Location Sharing Sessions

For live location sharing during emergencies.

```sql
CREATE TABLE location_sharing_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    
    -- Session Info
    session_type ENUM('sos', 'manual', 'scheduled', 'family_tracking') DEFAULT 'manual',
    sos_event_id BIGINT UNSIGNED NULL COMMENT 'If triggered by SOS',
    
    -- Access Token (for sharing link)
    share_token VARCHAR(100) UNIQUE NOT NULL,
    share_url VARCHAR(500) NULL,
    
    -- Session Duration
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP NULL,
    
    -- Status
    status ENUM('active', 'paused', 'expired', 'ended') DEFAULT 'active',
    
    -- Sharing Settings
    update_interval_seconds INT DEFAULT 30,
    share_with_contacts BOOLEAN DEFAULT TRUE,
    share_with_authorities BOOLEAN DEFAULT FALSE,
    allowed_viewer_ids JSON NULL COMMENT 'Specific user IDs allowed to view',
    
    -- Last Known Location
    last_latitude DECIMAL(10, 8) NULL,
    last_longitude DECIMAL(11, 8) NULL,
    last_update_at TIMESTAMP NULL,
    
    -- Statistics
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
```

---

### 13. Location Sharing Updates

Location updates during sharing sessions.

```sql
CREATE TABLE location_sharing_updates (
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
```

---

### 14. Emergency Activity Logs

Audit trail for all emergency-related actions.

```sql
CREATE TABLE emergency_activity_logs (
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
    
    -- Related Entity
    entity_type VARCHAR(50) NULL COMMENT 'emergency_contacts, sos_events, etc.',
    entity_id BIGINT UNSIGNED NULL,
    
    description TEXT NULL,
    
    -- Location Context
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    
    -- Device Info
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
```

---

## Default Data

### Default Relationship Types

```sql
INSERT INTO contact_relationship_types (code, name, name_si, category, icon, priority_weight, display_order) VALUES
-- Family
('parent', 'Parent', 'දෙමව්පියෝ', 'family', 'account-child', 100, 1),
('spouse', 'Spouse', 'කලත්‍රයා', 'family', 'heart', 100, 2),
('child', 'Child', 'දරුවා', 'family', 'baby-face', 90, 3),
('sibling', 'Sibling', 'සහෝදරයා/සහෝදරිය', 'family', 'account-multiple', 80, 4),
('relative', 'Relative', 'ඥාතියා', 'family', 'account-group', 70, 5),
('guardian', 'Guardian', 'භාරකරු', 'family', 'shield-account', 95, 6),

-- Friends & Others
('friend', 'Friend', 'මිතුරා', 'friend', 'account-heart', 60, 10),
('neighbor', 'Neighbor', 'අසල්වැසියා', 'friend', 'home-group', 50, 11),
('coworker', 'Coworker', 'සේවක සගයා', 'friend', 'briefcase-account', 40, 12),
('caregiver', 'Caregiver', 'රැකවරණකරු', 'professional', 'hand-heart', 85, 13),

-- Professional/Medical
('doctor', 'Doctor', 'වෛද්‍යවරයා', 'professional', 'doctor', 75, 20),
('hospital', 'Hospital', 'රෝහල', 'professional', 'hospital-building', 75, 21),

-- Emergency Services
('police', 'Police', 'පොලිසිය', 'emergency_service', 'police-badge', 100, 30),
('fire_brigade', 'Fire Brigade', 'ගිනි නිවීම් ඒකකය', 'emergency_service', 'fire-truck', 100, 31),
('ambulance', 'Ambulance', 'ගිලන්රථය', 'emergency_service', 'ambulance', 100, 32),

-- Other
('other', 'Other', 'වෙනත්', 'other', 'account', 10, 99);
```

### Default Location Types

```sql
INSERT INTO location_types (code, name, name_si, category, icon, marker_color, is_evacuation_point, display_order) VALUES
-- Personal
('home', 'Home', 'නිවස', 'personal', 'home', '#22C55E', FALSE, 1),
('work', 'Work', 'රැකියා ස්ථානය', 'personal', 'briefcase', '#3B82F6', FALSE, 2),
('school', 'School', 'පාසල', 'personal', 'school', '#8B5CF6', FALSE, 3),
('family_house', 'Family House', 'ඥාතීන්ගේ නිවස', 'personal', 'home-heart', '#F59E0B', FALSE, 4),

-- Shelters & Evacuation
('evacuation_center', 'Evacuation Center', 'ඉවත් කිරීමේ මධ්‍යස්ථානය', 'shelter', 'shield-home', '#EF4444', TRUE, 10),
('shelter', 'Shelter', 'නවාතැන', 'shelter', 'home-roof', '#DC2626', TRUE, 11),
('safe_zone', 'Safe Zone', 'ආරක්ෂිත කලාපය', 'shelter', 'shield-check', '#059669', TRUE, 12),
('community_hall', 'Community Hall', 'ප්‍රජා ශාලාව', 'shelter', 'town-hall', '#7C3AED', TRUE, 13),

-- Medical
('hospital', 'Hospital', 'රෝහල', 'medical', 'hospital-building', '#EF4444', TRUE, 20),
('clinic', 'Clinic', 'සායනය', 'medical', 'medical-bag', '#F97316', FALSE, 21),

-- Emergency Services
('police_station', 'Police Station', 'පොලිස් ස්ථානය', 'emergency_service', 'police-badge', '#1E40AF', FALSE, 30),
('fire_station', 'Fire Station', 'ගිනි නිවීම් ස්ථානය', 'emergency_service', 'fire-truck', '#B91C1C', FALSE, 31),

-- Religious
('temple', 'Temple', 'පන්සල', 'religious', 'cross', '#F59E0B', TRUE, 40),
('mosque', 'Mosque', 'මුස්ලිම් පල්ලිය', 'religious', 'mosque', '#059669', TRUE, 41),
('church', 'Church', 'පල්ලිය', 'religious', 'church', '#6366F1', TRUE, 42),

-- Public
('public_ground', 'Public Ground', 'මහජන ක්‍රීඩාංගනය', 'public', 'stadium', '#22C55E', TRUE, 50),

-- Other
('other', 'Other', 'වෙනත්', 'other', 'map-marker', '#6B7280', FALSE, 99);
```

### Default SOS Event Types

```sql
INSERT INTO sos_event_types (code, name, name_si, severity_level, auto_notify_authorities, icon, color, default_message, display_order) VALUES
('flood_emergency', 'Flood Emergency', 'ගංවතුර හදිසි අවස්ථාව', 5, TRUE, 'waves', '#3B82F6', 'I am in a flood emergency and need immediate help!', 1),
('dam_breach', 'Dam Breach Alert', 'වේලි බිඳීමේ අනතුරු ඇඟවීම', 5, TRUE, 'water-alert', '#EF4444', 'Dam breach detected in my area. Need evacuation assistance!', 2),
('medical_emergency', 'Medical Emergency', 'වෛද්‍ය හදිසි අවස්ථාව', 4, TRUE, 'hospital-box', '#DC2626', 'I need medical assistance urgently!', 3),
('stranded', 'Stranded', 'අතරමං වී ඇත', 4, FALSE, 'car-off', '#F59E0B', 'I am stranded and need help to evacuate.', 4),
('general_sos', 'General SOS', 'සාමාන්‍ය SOS', 3, FALSE, 'alert-circle', '#EF4444', 'I need emergency assistance!', 5),
('check_in', 'Safety Check-in', 'ආරක්ෂිත බව තහවුරු කිරීම', 1, FALSE, 'check-circle', '#22C55E', 'I am safe at this location.', 10);
```

---

## Useful Views

### View: User Emergency Contacts with Relationship Details

```sql
CREATE VIEW v_user_emergency_contacts AS
SELECT 
    ec.id,
    ec.uuid,
    ec.user_id,
    ec.contact_name,
    ec.phone_number,
    ec.email,
    ec.priority_order,
    ec.is_primary,
    ec.is_verified,
    crt.id AS relationship_type_id,
    crt.code AS relationship_code,
    crt.name AS relationship_name,
    crt.name_si AS relationship_name_si,
    crt.category AS relationship_category,
    crt.icon AS relationship_icon,
    ec.can_receive_sms,
    ec.can_receive_calls,
    ec.can_receive_push,
    ec.created_at,
    ec.updated_at
FROM emergency_contacts ec
JOIN contact_relationship_types crt ON ec.relationship_type_id = crt.id
WHERE ec.deleted_at IS NULL;
```

### View: Active SOS Events with User and Location Details

```sql
CREATE VIEW v_active_sos_events AS
SELECT 
    se.id,
    se.uuid,
    se.user_id,
    u.full_name AS user_name,
    u.phone_number AS user_phone,
    set.code AS sos_type_code,
    set.name AS sos_type_name,
    set.severity_level,
    se.status,
    se.triggered_at,
    se.latitude,
    se.longitude,
    se.address_text,
    r.name AS region_name,
    hl.name AS hazard_level_name,
    hl.color AS hazard_level_color,
    d.name AS dam_name,
    se.notification_count,
    se.successful_notification_count,
    ssl.name AS nearest_safe_location_name,
    ssl.latitude AS safe_location_lat,
    ssl.longitude AS safe_location_lng
FROM sos_events se
JOIN users u ON se.user_id = u.id
JOIN sos_event_types set ON se.sos_type_id = set.id
LEFT JOIN regions r ON se.region_id = r.id
LEFT JOIN hazard_levels hl ON se.hazard_level_id = hl.id
LEFT JOIN dams d ON se.dam_id = d.id
LEFT JOIN system_safe_locations ssl ON se.nearest_safe_location_id = ssl.id
WHERE se.status IN ('triggered', 'acknowledged', 'responding');
```

### View: Safe Locations Near User (for mobile app)

```sql
CREATE VIEW v_all_safe_locations AS
SELECT 
    'system' AS source,
    ssl.id,
    ssl.uuid,
    NULL AS user_id,
    ssl.name AS label,
    ssl.name_si AS label_si,
    lt.code AS location_type_code,
    lt.name AS location_type_name,
    lt.icon AS location_type_icon,
    ssl.latitude,
    ssl.longitude,
    ssl.address_text,
    ssl.capacity_persons,
    ssl.current_occupancy,
    ssl.status,
    ssl.is_24_hours,
    ssl.has_medical_facility,
    ssl.contact_phone,
    ssl.image_url,
    ssl.region_id,
    ssl.primary_dam_id,
    TRUE AS is_official,
    ssl.show_on_map
FROM system_safe_locations ssl
JOIN location_types lt ON ssl.location_type_id = lt.id
WHERE ssl.deleted_at IS NULL AND ssl.status = 'active' AND ssl.show_on_map = TRUE

UNION ALL

SELECT 
    'user' AS source,
    usl.id,
    usl.uuid,
    usl.user_id,
    usl.label,
    usl.label_si,
    lt.code AS location_type_code,
    lt.name AS location_type_name,
    lt.icon AS location_type_icon,
    usl.latitude,
    usl.longitude,
    usl.address_text,
    NULL AS capacity_persons,
    NULL AS current_occupancy,
    'active' AS status,
    NULL AS is_24_hours,
    NULL AS has_medical_facility,
    usl.contact_phone,
    NULL AS image_url,
    NULL AS region_id,
    usl.nearest_dam_id AS primary_dam_id,
    FALSE AS is_official,
    TRUE AS show_on_map
FROM user_safe_locations usl
JOIN location_types lt ON usl.location_type_id = lt.id
WHERE usl.deleted_at IS NULL;
```

### View: SOS Notification Status Summary

```sql
CREATE VIEW v_sos_notification_summary AS
SELECT 
    sos_event_id,
    COUNT(*) AS total_notifications,
    SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered_count,
    SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) AS read_count,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
    SUM(CASE WHEN status IN ('queued', 'sending') THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN channel = 'sms' THEN 1 ELSE 0 END) AS sms_count,
    SUM(CASE WHEN channel = 'push' THEN 1 ELSE 0 END) AS push_count,
    SUM(CASE WHEN channel = 'call' THEN 1 ELSE 0 END) AS call_count,
    MIN(sent_at) AS first_sent_at,
    MAX(delivered_at) AS last_delivered_at
FROM sos_event_notifications
GROUP BY sos_event_id;
```

---

## Sample Queries

### Get user's emergency contacts (sorted by priority)

```sql
SELECT ec.*, crt.name AS relationship_name, crt.icon
FROM emergency_contacts ec
JOIN contact_relationship_types crt ON ec.relationship_type_id = crt.id
WHERE ec.user_id = ? AND ec.deleted_at IS NULL
ORDER BY ec.is_primary DESC, crt.priority_weight DESC, ec.priority_order ASC;
```

### Get nearby safe locations within radius

```sql
SELECT 
    ssl.*,
    lt.name AS location_type_name,
    lt.icon AS location_type_icon,
    (6371 * ACOS(
        COS(RADIANS(?)) * COS(RADIANS(ssl.latitude)) *
        COS(RADIANS(ssl.longitude) - RADIANS(?)) +
        SIN(RADIANS(?)) * SIN(RADIANS(ssl.latitude))
    )) AS distance_km
FROM system_safe_locations ssl
JOIN location_types lt ON ssl.location_type_id = lt.id
WHERE ssl.deleted_at IS NULL 
  AND ssl.status = 'active'
  AND ssl.show_on_map = TRUE
HAVING distance_km <= ?
ORDER BY distance_km ASC
LIMIT 20;
```

### Get active SOS events in a region

```sql
SELECT se.*, u.full_name, u.phone_number, set.name AS sos_type_name
FROM sos_events se
JOIN users u ON se.user_id = u.id
JOIN sos_event_types set ON se.sos_type_id = set.id
WHERE se.region_id = ?
  AND se.status IN ('triggered', 'acknowledged', 'responding')
ORDER BY set.severity_level DESC, se.triggered_at DESC;
```

### Get notification delivery stats for an SOS event

```sql
SELECT 
    channel,
    status,
    COUNT(*) as count,
    AVG(TIMESTAMPDIFF(SECOND, queued_at, delivered_at)) AS avg_delivery_time_seconds
FROM sos_event_notifications
WHERE sos_event_id = ?
GROUP BY channel, status;
```

---

## API Permissions (for RBAC integration)

Add these to your permissions table for emergency module:

```sql
INSERT INTO permissions (code, name, module, action, description) VALUES
-- Emergency Contacts
('emergency.contacts.view', 'View Emergency Contacts', 'emergency', 'view', 'Can view own emergency contacts'),
('emergency.contacts.manage', 'Manage Emergency Contacts', 'emergency', 'manage', 'Can add/edit/delete emergency contacts'),

-- Safe Locations (User)
('emergency.locations.view', 'View Safe Locations', 'emergency', 'view', 'Can view safe locations'),
('emergency.locations.manage', 'Manage Personal Locations', 'emergency', 'manage', 'Can manage personal safe locations'),

-- System Safe Locations (Admin)
('emergency.system_locations.view', 'View System Safe Locations', 'emergency', 'view', 'Can view system safe locations'),
('emergency.system_locations.create', 'Create System Safe Locations', 'emergency', 'create', 'Can create evacuation centers'),
('emergency.system_locations.edit', 'Edit System Safe Locations', 'emergency', 'edit', 'Can edit evacuation centers'),
('emergency.system_locations.delete', 'Delete System Safe Locations', 'emergency', 'delete', 'Can delete evacuation centers'),

-- SOS Events
('emergency.sos.trigger', 'Trigger SOS', 'emergency', 'create', 'Can trigger SOS events'),
('emergency.sos.view_own', 'View Own SOS History', 'emergency', 'view', 'Can view own SOS history'),
('emergency.sos.view_all', 'View All SOS Events', 'emergency', 'view', 'Can view all SOS events'),
('emergency.sos.respond', 'Respond to SOS', 'emergency', 'manage', 'Can acknowledge and respond to SOS'),
('emergency.sos.resolve', 'Resolve SOS Events', 'emergency', 'manage', 'Can resolve SOS events'),

-- Location Sharing
('emergency.location_share.create', 'Share Location', 'emergency', 'create', 'Can share live location'),
('emergency.location_share.view', 'View Shared Locations', 'emergency', 'view', 'Can view shared locations'),

-- Emergency Service Providers
('emergency.providers.view', 'View Emergency Providers', 'emergency', 'view', 'Can view emergency service providers'),
('emergency.providers.manage', 'Manage Emergency Providers', 'emergency', 'manage', 'Can add/edit emergency providers'),

-- Lookup Tables
('emergency.config.view', 'View Emergency Config', 'emergency', 'view', 'Can view relationship/location types'),
('emergency.config.manage', 'Manage Emergency Config', 'emergency', 'manage', 'Can manage lookup tables');
```

---

## Scalability Notes

1. **Lookup Tables over ENUMs**: Using `contact_relationship_types`, `location_types`, and `sos_event_types` tables instead of ENUMs allows dynamic configuration without schema changes.

2. **Multi-language Support**: All lookup tables and key entities support `name_si` and `name_ta` for Sinhala and Tamil translations.

3. **UUID Support**: All major entities have UUIDs for external API exposure without revealing internal IDs.

4. **Soft Deletes**: Critical tables use `deleted_at` for data recovery and audit trails.

5. **Region/Dam Integration**: Safe locations and SOS events link to `regions` and `dams` tables for geographic context.

6. **Flexible JSON Fields**: `metadata`, `amenities`, and `context_json` fields allow storing additional data without schema changes.

7. **Audit Trail**: `emergency_activity_logs` tracks all user actions for compliance and debugging.

8. **Notification Tracking**: Comprehensive notification tracking with retry logic, provider details, and cost tracking.

9. **Location Sharing**: Support for real-time location sharing during emergencies with session management.

10. **Hazard Context**: Pre-computed hazard information stored with user locations for quick alerts.

---

## Entity Relationship Diagram (Summary)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EMERGENCY MODULE SCHEMA                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐       ┌──────────────────────┐                            │
│  │ contact_         │       │ location_types       │                            │
│  │ relationship_    │       │ (lookup)             │                            │
│  │ types (lookup)   │       └──────────┬───────────┘                            │
│  └────────┬─────────┘                  │                                        │
│           │                            │                                        │
│           ▼                            ▼                                        │
│  ┌──────────────────┐       ┌──────────────────────┐   ┌─────────────────────┐  │
│  │ emergency_       │       │ user_safe_locations  │   │ system_safe_        │  │
│  │ contacts         │       │ (personal)           │   │ locations           │  │
│  └────────┬─────────┘       └──────────────────────┘   │ (official)          │  │
│           │                                             └──────────┬──────────┘  │
│           │                                                        │             │
│           │    ┌────────────────────────────────────────┐          │             │
│           │    │           sos_event_types              │          │             │
│           │    │              (lookup)                  │          │             │
│           │    └────────────────┬───────────────────────┘          │             │
│           │                     │                                  │             │
│           │                     ▼                                  │             │
│           │    ┌────────────────────────────────────────┐          │             │
│           └───►│            sos_events                  │◄─────────┘             │
│                │    (main emergency events)             │                        │
│                └────────────────┬───────────────────────┘                        │
│                                 │                                                │
│                                 ▼                                                │
│                ┌────────────────────────────────────────┐                        │
│                │      sos_event_notifications           │                        │
│                │    (multi-channel tracking)            │                        │
│                └────────────────────────────────────────┘                        │
│                                                                                  │
│  ┌──────────────────────┐    ┌──────────────────────────┐                       │
│  │ location_sharing_    │    │ emergency_service_       │                       │
│  │ sessions             │    │ providers                │                       │
│  └──────────┬───────────┘    └──────────────────────────┘                       │
│             │                                                                    │
│             ▼                                                                    │
│  ┌──────────────────────┐    ┌──────────────────────────┐                       │
│  │ location_sharing_    │    │ emergency_activity_      │                       │
│  │ updates              │    │ logs (audit)             │                       │
│  └──────────────────────┘    └──────────────────────────┘                       │
│                                                                                  │
│  External Dependencies:                                                          │
│  ├── users (from users_rbac_schema.md)                                          │
│  ├── regions, dams, hazard_levels, dam_hazard_zones (from dams_schema.md)       │
│  └── permissions (for RBAC integration)                                         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Migration Notes

If migrating from the previous schema version:

1. Create new lookup tables first (`contact_relationship_types`, `location_types`, `sos_event_types`)
2. Insert default data into lookup tables
3. Create new tables with foreign keys
4. Migrate existing data:
   - Map old ENUM values to new lookup table IDs
   - Generate UUIDs for existing records
5. Create views after all tables are ready
6. Update application code to use new schema structure
