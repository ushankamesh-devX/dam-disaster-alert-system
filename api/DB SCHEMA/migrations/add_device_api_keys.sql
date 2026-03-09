-- ============================================================
-- Device API Keys table for ESP32 / IoT device authentication
-- ============================================================

-- Drop if exists (in case of partial creation from Hibernate auto-DDL)
DROP TABLE IF EXISTS device_api_keys;

CREATE TABLE IF NOT EXISTS device_api_keys (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    api_key_hash    VARCHAR(64)     NOT NULL UNIQUE COMMENT 'SHA-256 hash of the API key',
    key_prefix      VARCHAR(12)     NOT NULL COMMENT 'First 8 chars of key for identification (ddasdk_xxxx)',
    sensor_id       BIGINT UNSIGNED NOT NULL,
    name            VARCHAR(100)    NOT NULL COMMENT 'Friendly name, e.g. Victoria Dam Water Level Device',
    description     TEXT            NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    last_used_at    TIMESTAMP       NULL COMMENT 'Last time this key was used to submit data',
    expires_at      TIMESTAMP       NULL COMMENT 'Optional expiry date, NULL = never expires',
    created_by      BIGINT UNSIGNED NULL COMMENT 'Admin user who created this key',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (sensor_id)   REFERENCES sensors(id)  ON DELETE CASCADE,
    FOREIGN KEY (created_by)  REFERENCES users(id)    ON DELETE SET NULL,

    INDEX idx_device_key_hash     (api_key_hash),
    INDEX idx_device_key_sensor   (sensor_id),
    INDEX idx_device_key_active   (is_active),
    INDEX idx_device_key_prefix   (key_prefix)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='API keys for ESP32/IoT devices to submit sensor readings';
