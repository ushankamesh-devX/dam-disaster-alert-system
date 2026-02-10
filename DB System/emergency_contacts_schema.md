# Emergency Contacts, Safe Locations (OSM), & Live Hazard Context — Database Schema

## Overview

This schema supports the **Emergency Contact** module in the mobile app:
- Users can add/manage emergency contacts (priority order, primary contact)
- Users can save **Safe Locations** discovered via **OpenStreetMap (OSM/Nominatim)** or added manually
- The system can record **SOS events** and who was notified
- The system can store **live hazard context snapshots** for a user’s location (ties into existing `hazard_levels`, `dams`, `dam_hazard_zones`)
- Optional caching for OSM geocoding/reverse-geocoding results

> SQL dialect: **MySQL 8+** (InnoDB, `utf8mb4`).

---

## Dependencies (existing tables)

This schema references tables defined in other schema documents:
- `users` (from `users_rbac_schema.md`)
- `hazard_levels`, `dams`, `dam_hazard_zones` (from `dams_schema.md`)

---

## Tables

### 1. Emergency Contacts

Stores emergency contacts for each user.

```sql
CREATE TABLE emergency_contacts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,

    contact_name VARCHAR(120) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) NULL,

    relationship ENUM(
        'parent', 'spouse', 'sibling', 'child', 'relative',
        'friend', 'neighbor', 'coworker',
        'guardian', 'caregiver',
        'doctor', 'hospital',
        'police', 'fire_brigade', 'ambulance',
        'other'
    ) DEFAULT 'other',

    priority_order INT DEFAULT 1 COMMENT '1=highest priority',
    is_primary BOOLEAN DEFAULT FALSE,

    can_receive_sms BOOLEAN DEFAULT TRUE,
    can_receive_calls BOOLEAN DEFAULT TRUE,

    notes VARCHAR(500) NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ec_user (user_id),
    INDEX idx_ec_phone (phone_number),
    INDEX idx_ec_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Notes**
- `deleted_at` supports soft-delete in case users remove contacts.
- If you later want “contact is also a registered user”, add `contact_user_id` (FK to `users.id`) as optional.

---

### 2. User Safe Locations (Manual + OSM)

Stores user-saved safe locations such as home, shelter, hospital, etc.

```sql
CREATE TABLE user_safe_locations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,

    label VARCHAR(120) NOT NULL COMMENT 'User-friendly name e.g. Home, School',
    location_type ENUM(
        'home', 'work', 'school', 'shelter', 'hospital',
        'police_station', 'fire_station', 'family_house',
        'temple', 'mosque', 'church',
        'other'
    ) DEFAULT 'other',

    address_text VARCHAR(500) NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,

    -- OpenStreetMap / Nominatim metadata (optional)
    osm_place_id VARCHAR(64) NULL,
    osm_display_name VARCHAR(800) NULL,
    osm_type VARCHAR(100) NULL COMMENT 'OSM type/category',
    osm_class VARCHAR(100) NULL COMMENT 'OSM class',

    source ENUM('manual', 'osm_search', 'osm_reverse_geocode') DEFAULT 'manual',
    metadata JSON NULL COMMENT 'Any extra info: tags, opening_hours, etc.',

    is_favorite BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_usl_user (user_id),
    INDEX idx_usl_type (location_type),
    INDEX idx_usl_location (latitude, longitude),
    INDEX idx_usl_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3. OpenStreetMap (Nominatim) Cache (Optional)

Useful if the API layer does frequent search/reverse geocoding and you want to reduce rate limits / latency.

```sql
CREATE TABLE osm_place_cache (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    provider ENUM('nominatim') DEFAULT 'nominatim',
    query_type ENUM('search', 'reverse') NOT NULL,

    query_hash CHAR(64) NOT NULL COMMENT 'SHA-256 of normalized query params',
    query_params JSON NOT NULL,

    response_json JSON NOT NULL,

    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,

    UNIQUE KEY uk_osm_cache_hash (provider, query_type, query_hash),
    INDEX idx_osm_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 4. Hazard Context Snapshots (Live Hazard Level Near User)

Stores the hazard context computed for a specific user location at a point in time.

This is where your “live hazard level” can be saved (e.g., after:
- point-in-polygon check against `dam_hazard_zones.boundary_geojson`, and/or
- nearest dam + latest `dam_hazard_assessments`, and/or
- other sensor/weather-based scoring logic).

```sql
CREATE TABLE user_hazard_location_snapshots (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,

    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,

    hazard_level_id BIGINT UNSIGNED NULL,
    dam_id BIGINT UNSIGNED NULL,
    hazard_zone_id BIGINT UNSIGNED NULL,

    risk_score DECIMAL(6, 2) NULL COMMENT 'Optional computed score',
    source ENUM('computed', 'manual') DEFAULT 'computed',

    context_json JSON NULL COMMENT 'Any debugging/raw context: nearest zones, distances, model inputs',

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hazard_level_id) REFERENCES hazard_levels(id) ON DELETE SET NULL,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE SET NULL,
    FOREIGN KEY (hazard_zone_id) REFERENCES dam_hazard_zones(id) ON DELETE SET NULL,

    INDEX idx_uhls_user_time (user_id, captured_at),
    INDEX idx_uhls_level (hazard_level_id),
    INDEX idx_uhls_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 5. SOS Events

Represents a user-initiated SOS (panic) event.

```sql
CREATE TABLE sos_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,

    status ENUM('open', 'cancelled', 'resolved') DEFAULT 'open',

    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,

    -- Location at trigger time
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address_text VARCHAR(800) NULL,

    -- Hazard context captured at trigger time
    hazard_level_id BIGINT UNSIGNED NULL,
    dam_id BIGINT UNSIGNED NULL,
    hazard_zone_id BIGINT UNSIGNED NULL,

    snapshot_id BIGINT UNSIGNED NULL COMMENT 'Optional link to user_hazard_location_snapshots',

    notes TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hazard_level_id) REFERENCES hazard_levels(id) ON DELETE SET NULL,
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE SET NULL,
    FOREIGN KEY (hazard_zone_id) REFERENCES dam_hazard_zones(id) ON DELETE SET NULL,

    INDEX idx_sos_user_time (user_id, triggered_at),
    INDEX idx_sos_status (status),
    INDEX idx_sos_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 6. SOS Notifications (Which contacts were notified)

Tracks notification attempts to emergency contacts for a given SOS.

```sql
CREATE TABLE sos_event_notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sos_event_id BIGINT UNSIGNED NOT NULL,
    emergency_contact_id BIGINT UNSIGNED NOT NULL,

    channel ENUM('push', 'sms', 'call', 'email', 'whatsapp') DEFAULT 'sms',

    status ENUM('queued', 'sent', 'delivered', 'failed') DEFAULT 'queued',

    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,

    provider_message_id VARCHAR(200) NULL,
    error_message VARCHAR(800) NULL,

    FOREIGN KEY (sos_event_id) REFERENCES sos_events(id) ON DELETE CASCADE,
    FOREIGN KEY (emergency_contact_id) REFERENCES emergency_contacts(id) ON DELETE CASCADE,

    UNIQUE KEY uk_sos_contact_channel (sos_event_id, emergency_contact_id, channel),
    INDEX idx_sen_sos (sos_event_id),
    INDEX idx_sen_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Suggested queries (implementation notes)

### Get user’s emergency contacts (sorted)

```sql
SELECT *
FROM emergency_contacts
WHERE user_id = ? AND deleted_at IS NULL
ORDER BY is_primary DESC, priority_order ASC, id ASC;
```

### Get favorite safe locations

```sql
SELECT *
FROM user_safe_locations
WHERE user_id = ? AND deleted_at IS NULL AND is_favorite = TRUE
ORDER BY updated_at DESC;
```

### Create a hazard snapshot when location updates

Store a new row in `user_hazard_location_snapshots` whenever the API computes hazard near the user.

---

## Optional future extensions

- Contact verification (OTP) tables if needed
- “Share my live location” sessions for a limited time window
- Spatial indexing using MySQL `POINT` + `SPATIAL INDEX` (if you decide to store geometry types instead of JSON GeoJSON)
