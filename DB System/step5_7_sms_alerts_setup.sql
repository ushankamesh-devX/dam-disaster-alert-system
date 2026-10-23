-- ============================================================================
-- DDAS Step 5-7: Database Setup Script
-- alert_types seed, alert_user_deliveries table, v_active_alerts view
-- ============================================================================
-- Run this script AFTER the main ddas_complete_schema.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. alert_types Table Seed Data
--    HazardAssessmentService: findByCode('HIGH_WATER_LEVEL')
-- ----------------------------------------------------------------------------

INSERT IGNORE INTO alert_types (code, name, category) VALUES
('HIGH_WATER_LEVEL',  'High Water Level Alert',     'sensor_triggered'),
('DAM_BREACH',        'Dam Breach Warning',          'emergency'),
('FLOOD_WARNING',     'Downstream Flood Warning',    'emergency'),
('EVACUATION',        'Evacuation Order',             'emergency'),
('WEATHER_ALERT',     'Severe Weather Alert',        'weather'),
('MAINTENANCE',       'Scheduled Maintenance Notice','operational'),
('ALL_CLEAR',         'All Clear / Safe Status',     'informational'),
('DRILL',             'Emergency Drill / Simulation', 'training');

-- ----------------------------------------------------------------------------
-- 2. alert_user_deliveries Table
--    SMS delivery tracking for HazardAssessmentService + SmsDispatcherService
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS alert_user_deliveries (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    alert_id          BIGINT UNSIGNED NOT NULL,
    user_id           BIGINT UNSIGNED NOT NULL,

    -- Delivery Info (snapshot at time of delivery)
    phone_number      VARCHAR(20),
    sms_message       TEXT,

    -- SMS Status Tracking
    sms_status        ENUM('pending','sent','delivered','failed','skipped')
                      NOT NULL DEFAULT 'pending',
    sms_gateway_sid   VARCHAR(100)    COMMENT 'Twilio SID / Dialog reference',
    sms_error_message TEXT,
    attempt_count     INT             DEFAULT 0,
    sent_at           TIMESTAMP       NULL,

    -- Audit
    created_at        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,

    -- Prevent duplicate deliveries for same alert+user
    UNIQUE KEY uk_alert_user_delivery (alert_id, user_id),

    INDEX idx_delivery_alert      (alert_id),
    INDEX idx_delivery_user       (user_id),
    INDEX idx_delivery_sms_status (sms_status),
    INDEX idx_delivery_pending    (sms_status, created_at)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='SMS delivery tracking per user per alert — SmsDispatcherService reads pending rows';


-- ----------------------------------------------------------------------------
-- 3. v_active_alerts SQL View
--    PublicAlertController: GET /api/public/active-alerts
--    Enriches alerts with dam name, region name, alert type info
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_active_alerts AS
SELECT
    a.id                                AS alert_id,
    a.uuid                              AS alert_uuid,
    a.title                             AS alert_title,
    a.message                           AS alert_message,
    a.severity                          AS severity,
    a.status                            AS status,
    a.simulation_mode                   AS simulation_mode,
    a.created_at                        AS created_at,
    a.updated_at                        AS updated_at,

    -- Alert Type
    at.code                             AS alert_type_code,
    at.name                             AS alert_type_name,
    at.category                         AS alert_type_category,

    -- Dam Info
    d.id                                AS dam_id,
    d.code                              AS dam_code,
    d.name                              AS dam_name,
    d.name_si                           AS dam_name_si,
    d.latitude                          AS dam_latitude,
    d.longitude                         AS dam_longitude,

    -- Region Info
    r.id                                AS region_id,
    r.name                              AS region_name,
    r.name_si                           AS region_name_si,

    -- Current Water Status
    dcs.water_level_meters              AS current_water_level,
    dcs.danger_level_meters             AS danger_level,
    dcs.hazard_status                   AS current_hazard_status,

    -- SMS Delivery Summary
    (SELECT COUNT(*) FROM alert_user_deliveries aud
     WHERE aud.alert_id = a.id AND aud.sms_status = 'sent')
                                        AS sms_sent_count,
    (SELECT COUNT(*) FROM alert_user_deliveries aud
     WHERE aud.alert_id = a.id AND aud.sms_status = 'pending')
                                        AS sms_pending_count

FROM alerts a
LEFT JOIN alert_types        at  ON a.alert_type_id = at.id
LEFT JOIN dams               d   ON a.dam_id = d.id
LEFT JOIN regions            r   ON COALESCE(a.region_id, d.region_id) = r.id
LEFT JOIN dam_current_status dcs ON d.id = dcs.dam_id

WHERE a.status IN ('active', 'escalated')
  AND a.simulation_mode = FALSE      -- Simulation alerts are NOT shown publicly

ORDER BY
    CASE a.severity
        WHEN 'emergency' THEN 1
        WHEN 'critical'  THEN 2
        WHEN 'warning'   THEN 3
        WHEN 'info'      THEN 4
        ELSE 5
    END,
    a.created_at DESC;


-- ----------------------------------------------------------------------------
-- 4. Useful monitoring queries
-- ----------------------------------------------------------------------------

-- Check pending SMS deliveries
-- SELECT COUNT(*) FROM alert_user_deliveries WHERE sms_status = 'pending';

-- View all active alerts with details
-- SELECT * FROM v_active_alerts;

-- SMS delivery success rate for an alert
-- SELECT
--     sms_status,
--     COUNT(*) AS count,
--     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) AS pct
-- FROM alert_user_deliveries
-- WHERE alert_id = ?
-- GROUP BY sms_status;
