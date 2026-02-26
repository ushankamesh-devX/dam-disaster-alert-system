-- =============================================================================
-- SAMPLE DATA: sensor_types + sensors + sensor_readings
-- DAM Disaster Alert System
-- SAFE VERSION: readings use UID-based subqueries, not hardcoded IDs.
-- Step 1 → Step 2 → Step 3 (run in order, or paste everything at once).
-- Before running, verify your dam IDs:  SELECT id, name FROM dams LIMIT 5;
-- Then update the TWO variables at the top of Step 2 if needed.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Sensor Types
-- Uses INSERT IGNORE so safe to re-run; IDs are auto-assigned.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO sensor_types (code, name, description, unit, min_threshold, max_threshold, critical_threshold)
VALUES
  ('WATER_LEVEL',   'Water Level Sensor',    'Measures reservoir water level',            'm',       0.00,   150.00,  130.00),
  ('RAINFALL',      'Rainfall Sensor',       'Measures precipitation',                    'mm/hr',   0.00,   300.00,  200.00),
  ('INFLOW',        'Inflow Sensor',         'Measures water inflow rate',                'cumecs',  0.00,  5000.00, 4000.00),
  ('OUTFLOW',       'Outflow Sensor',        'Measures water outflow rate',               'cumecs',  0.00,  5000.00, 4500.00),
  ('SEISMIC',       'Seismic Sensor',        'Detects seismic activity',                  'g',       0.00,    10.00,    7.50),
  ('SOIL_MOISTURE', 'Soil Moisture Sensor',  'Monitors embankment soil moisture',         '%',       0.00,   100.00,   85.00),
  ('TEMPERATURE',   'Temperature Sensor',    'Ambient temperature monitoring',            '°C',    -10.00,    60.00,   55.00),
  ('PRESSURE',      'Piezometer',            'Measures pore water pressure in dam body',  'kPa',     0.00,  1000.00,  850.00);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Sensors
-- *** CHANGE dam_1_id and dam_2_id to real IDs from your dams table ***
-- Run first:  SELECT id, name FROM dams LIMIT 5;
-- ─────────────────────────────────────────────────────────────────────────────
-- Using variables so you only change them in ONE place:
SET @dam_1_id = 1;   -- <-- change to your first dam's real ID
SET @dam_2_id = 2;   -- <-- change to your second dam's real ID (or same as dam_1_id if only one)

SET @wl_type  = (SELECT id FROM sensor_types WHERE code = 'WATER_LEVEL'   LIMIT 1);
SET @rf_type  = (SELECT id FROM sensor_types WHERE code = 'RAINFALL'      LIMIT 1);
SET @if_type  = (SELECT id FROM sensor_types WHERE code = 'INFLOW'        LIMIT 1);
SET @of_type  = (SELECT id FROM sensor_types WHERE code = 'OUTFLOW'       LIMIT 1);
SET @se_type  = (SELECT id FROM sensor_types WHERE code = 'SEISMIC'       LIMIT 1);
SET @sm_type  = (SELECT id FROM sensor_types WHERE code = 'SOIL_MOISTURE' LIMIT 1);
SET @tp_type  = (SELECT id FROM sensor_types WHERE code = 'TEMPERATURE'   LIMIT 1);

INSERT IGNORE INTO sensors
  (sensor_uid, dam_id, sensor_type_id, name, description, location_on_dam,
   latitude, longitude, elevation_meters, manufacturer, model, serial_number,
   installation_date, calibration_date, next_calibration_date,
   min_reading, max_reading, warning_threshold, critical_threshold,
   reading_interval_seconds, status, battery_level, signal_strength)
VALUES
  -- Dam 1 – active sensors
  ('VIC-WL-001', @dam_1_id, @wl_type, 'Victoria Water Level S1',   'Primary water level gauge',          'Dam Crest - Center',          7.2276, 80.7867, 438.0, 'Siemens',     'SITRANS LH300', 'SIE-24-001', '2024-01-15', '2024-01-15', '2025-01-15',    0,  125, 115, 120, 60,  'active',      87.5, 92.3),
  ('VIC-RF-001', @dam_1_id, @rf_type, 'Victoria Rainfall S1',      'Main rainfall gauge',                'Upstream Weather Station',    7.2300, 80.7900, 440.0, 'Campbell',    'TB4-L',         'CAM-24-001', '2024-01-20', '2024-01-20', '2025-01-20',    0,  300,  50, 100, 300, 'active',      72.0, 88.1),
  ('VIC-IF-001', @dam_1_id, @if_type, 'Victoria Inflow S1',        'Inflow at main channel',             'Upstream Channel',            7.2200, 80.7850, 430.0, 'Ott Hydromet','Flowbird',      'OTT-24-001', '2024-02-01', '2024-02-01', '2025-02-01',    0, 5000,3500,4200, 120, 'active',      65.0, 85.0),
  ('VIC-OF-001', @dam_1_id, @of_type, 'Victoria Outflow S1',       'Outflow gauge at spillway',          'Spillway Exit',               7.2250, 80.7880, 420.0, 'Ott Hydromet','Flowbird',      'OTT-24-002', '2024-02-01', '2024-02-01', '2025-02-01',    0, 5000,3800,4500, 120, 'active',      55.0, 78.5),
  ('VIC-SM-001', @dam_1_id, @sm_type, 'Victoria Soil Moisture S1', 'Embankment moisture sensor',         'Left Abutment - 10m depth',   7.2280, 80.7860, 435.0, 'Delta-T',     'SM300',         'DLT-24-001', '2024-03-01', '2024-03-01', '2025-03-01',    0,  100,  70,  85, 600, 'active',      90.0, 95.0),
  ('VIC-SE-001', @dam_1_id, @se_type, 'Victoria Seismic S1',       'Seismograph at dam foundation',      'Dam Foundation - Center',     7.2270, 80.7870, 428.0, 'Guralp',      'CMG-6TD',       'GUR-24-001', '2024-03-15', '2024-03-15', '2025-03-15',    0,   10,   5, 7.5,  30, 'active',      95.0, 98.0),
  -- Dam 1 – problematic sensors
  ('VIC-WL-002', @dam_1_id, @wl_type, 'Victoria Water Level S2',   'Backup water level (faulty)',         'Dam Crest - Right',           7.2278, 80.7869, 438.5, 'Siemens',     'SITRANS LH300', 'SIE-24-002', '2024-01-15', '2024-01-15', '2025-01-15',    0,  125, 115, 120, 60,  'faulty',      42.0, 15.3),
  ('VIC-TP-001', @dam_1_id, @tp_type, 'Victoria Temperature S1',   'Ambient temp at dam site',            'Control Room Roof',           7.2274, 80.7862, 442.0, 'Vaisala',     'HMP110',        'VAI-24-001', '2024-04-01', '2024-04-01', '2025-04-01',  -10,   60,  45,  55, 300, 'maintenance', 80.0, 70.0),
  -- Dam 2 sensors
  ('KTL-WL-001', @dam_2_id, @wl_type, 'Kotmale Water Level S1',    'Primary water level at Kotmale',     'Dam Crest - Center',          7.0500, 80.6300, 600.0, 'Siemens',     'SITRANS LH300', 'SIE-24-003', '2024-01-18', '2024-01-18', '2025-01-18',    0,  100,  90,  96, 60,  'active',      85.0, 90.5),
  ('KTL-RF-001', @dam_2_id, @rf_type, 'Kotmale Rainfall S1',       'Rainfall at Kotmale catchment',      'Upstream Catchment',          7.0600, 80.6200, 620.0, 'Campbell',    'TB4-L',         'CAM-24-002', '2024-01-22', '2024-01-22', '2025-01-22',    0,  300,  60, 120, 300, 'active',      68.0, 82.0);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Sensor Readings
-- Uses UID subqueries – safe regardless of what IDs were assigned above.
-- ─────────────────────────────────────────────────────────────────────────────

-- Resolve sensor IDs by UID (so FK always matches)
SET @s_vic_wl  = (SELECT id FROM sensors WHERE sensor_uid = 'VIC-WL-001' LIMIT 1);
SET @s_vic_rf  = (SELECT id FROM sensors WHERE sensor_uid = 'VIC-RF-001' LIMIT 1);
SET @s_vic_if  = (SELECT id FROM sensors WHERE sensor_uid = 'VIC-IF-001' LIMIT 1);
SET @s_vic_of  = (SELECT id FROM sensors WHERE sensor_uid = 'VIC-OF-001' LIMIT 1);
SET @s_vic_sm  = (SELECT id FROM sensors WHERE sensor_uid = 'VIC-SM-001' LIMIT 1);
SET @s_vic_se  = (SELECT id FROM sensors WHERE sensor_uid = 'VIC-SE-001' LIMIT 1);
SET @s_ktl_wl  = (SELECT id FROM sensors WHERE sensor_uid = 'KTL-WL-001' LIMIT 1);

-- ── Victoria Water Level S1 (48 hours, every 30 min) ─────────────────────────
-- Simulates a flood event: rise → peak → receding
INSERT INTO sensor_readings (sensor_id, dam_id, reading_value, unit, quality, recorded_at)
SELECT @s_vic_wl, @dam_1_id, v, 'm', q, ts FROM (
  SELECT 108.23 v, 'good' q, DATE_SUB(NOW(), INTERVAL 48 HOUR) ts UNION ALL
  SELECT 108.41, 'good', DATE_SUB(NOW(), INTERVAL 47 HOUR) + INTERVAL 30 MINUTE UNION ALL
  SELECT 108.72, 'good', DATE_SUB(NOW(), INTERVAL 47 HOUR) UNION ALL
  SELECT 109.10, 'good', DATE_SUB(NOW(), INTERVAL 46 HOUR) + INTERVAL 30 MINUTE UNION ALL
  SELECT 109.55, 'good', DATE_SUB(NOW(), INTERVAL 46 HOUR) UNION ALL
  SELECT 110.20, 'good', DATE_SUB(NOW(), INTERVAL 45 HOUR) UNION ALL
  SELECT 110.85, 'good', DATE_SUB(NOW(), INTERVAL 44 HOUR) UNION ALL
  SELECT 111.50, 'good', DATE_SUB(NOW(), INTERVAL 43 HOUR) UNION ALL
  SELECT 112.30, 'good', DATE_SUB(NOW(), INTERVAL 42 HOUR) UNION ALL
  SELECT 113.05, 'good', DATE_SUB(NOW(), INTERVAL 41 HOUR) UNION ALL
  SELECT 113.72, 'good', DATE_SUB(NOW(), INTERVAL 40 HOUR) UNION ALL
  SELECT 114.35, 'suspect', DATE_SUB(NOW(), INTERVAL 39 HOUR) UNION ALL
  SELECT 114.80, 'good', DATE_SUB(NOW(), INTERVAL 38 HOUR) UNION ALL
  SELECT 115.10, 'good', DATE_SUB(NOW(), INTERVAL 37 HOUR) UNION ALL
  SELECT 115.75, 'good', DATE_SUB(NOW(), INTERVAL 36 HOUR) UNION ALL
  SELECT 116.10, 'good', DATE_SUB(NOW(), INTERVAL 35 HOUR) UNION ALL
  SELECT 116.60, 'good', DATE_SUB(NOW(), INTERVAL 34 HOUR) UNION ALL
  SELECT 116.95, 'good', DATE_SUB(NOW(), INTERVAL 33 HOUR) UNION ALL
  SELECT 117.30, 'good', DATE_SUB(NOW(), INTERVAL 32 HOUR) UNION ALL
  SELECT 117.65, 'good', DATE_SUB(NOW(), INTERVAL 31 HOUR) UNION ALL
  SELECT 117.80, 'good', DATE_SUB(NOW(), INTERVAL 30 HOUR) UNION ALL
  SELECT 118.10, 'good', DATE_SUB(NOW(), INTERVAL 29 HOUR) UNION ALL
  SELECT 118.50, 'good', DATE_SUB(NOW(), INTERVAL 28 HOUR) UNION ALL
  SELECT 118.78, 'good', DATE_SUB(NOW(), INTERVAL 27 HOUR) UNION ALL
  SELECT 119.02, 'good', DATE_SUB(NOW(), INTERVAL 26 HOUR) UNION ALL
  SELECT 119.28, 'good', DATE_SUB(NOW(), INTERVAL 25 HOUR) UNION ALL
  SELECT 119.55, 'good', DATE_SUB(NOW(), INTERVAL 24 HOUR) UNION ALL
  SELECT 119.80, 'good', DATE_SUB(NOW(), INTERVAL 23 HOUR) UNION ALL
  SELECT 119.95, 'good', DATE_SUB(NOW(), INTERVAL 22 HOUR) UNION ALL
  SELECT 119.98, 'suspect', DATE_SUB(NOW(), INTERVAL 21 HOUR) UNION ALL
  SELECT 119.90, 'good', DATE_SUB(NOW(), INTERVAL 20 HOUR) UNION ALL  -- PEAK
  SELECT 119.70, 'good', DATE_SUB(NOW(), INTERVAL 19 HOUR) UNION ALL
  SELECT 119.45, 'good', DATE_SUB(NOW(), INTERVAL 18 HOUR) UNION ALL
  SELECT 119.10, 'good', DATE_SUB(NOW(), INTERVAL 17 HOUR) UNION ALL
  SELECT 118.75, 'good', DATE_SUB(NOW(), INTERVAL 16 HOUR) UNION ALL
  SELECT 118.35, 'good', DATE_SUB(NOW(), INTERVAL 15 HOUR) UNION ALL
  SELECT 117.95, 'good', DATE_SUB(NOW(), INTERVAL 14 HOUR) UNION ALL
  SELECT 117.52, 'good', DATE_SUB(NOW(), INTERVAL 13 HOUR) UNION ALL
  SELECT 117.10, 'good', DATE_SUB(NOW(), INTERVAL 12 HOUR) UNION ALL
  SELECT 116.72, 'good', DATE_SUB(NOW(), INTERVAL 11 HOUR) UNION ALL
  SELECT 116.38, 'good', DATE_SUB(NOW(), INTERVAL 10 HOUR) UNION ALL
  SELECT 116.08, 'good', DATE_SUB(NOW(), INTERVAL 9  HOUR) UNION ALL
  SELECT 115.80, 'good', DATE_SUB(NOW(), INTERVAL 8  HOUR) UNION ALL
  SELECT 115.60, 'good', DATE_SUB(NOW(), INTERVAL 7  HOUR) UNION ALL
  SELECT 115.45, 'good', DATE_SUB(NOW(), INTERVAL 6  HOUR) UNION ALL
  SELECT 115.38, 'good', DATE_SUB(NOW(), INTERVAL 5  HOUR) UNION ALL
  SELECT 115.33, 'good', DATE_SUB(NOW(), INTERVAL 4  HOUR) UNION ALL
  SELECT 115.28, 'good', DATE_SUB(NOW(), INTERVAL 3  HOUR) UNION ALL
  SELECT 115.24, 'good', DATE_SUB(NOW(), INTERVAL 2  HOUR) UNION ALL
  SELECT 115.21, 'good', DATE_SUB(NOW(), INTERVAL 1  HOUR) UNION ALL
  SELECT 115.18, 'good', DATE_SUB(NOW(), INTERVAL 30 MINUTE)
) d WHERE @s_vic_wl IS NOT NULL;

-- ── Victoria Rainfall S1 (rain spike then decay) ─────────────────────────────
INSERT INTO sensor_readings (sensor_id, dam_id, reading_value, unit, quality, recorded_at)
SELECT @s_vic_rf, @dam_1_id, v, 'mm/hr', q, ts FROM (
  SELECT  2.1 v, 'good' q, DATE_SUB(NOW(), INTERVAL 48 HOUR) ts UNION ALL
  SELECT  3.5, 'good', DATE_SUB(NOW(), INTERVAL 44 HOUR) UNION ALL
  SELECT  8.2, 'good', DATE_SUB(NOW(), INTERVAL 40 HOUR) UNION ALL
  SELECT 22.5, 'good', DATE_SUB(NOW(), INTERVAL 36 HOUR) UNION ALL
  SELECT 45.8, 'good', DATE_SUB(NOW(), INTERVAL 32 HOUR) UNION ALL
  SELECT 62.3, 'good', DATE_SUB(NOW(), INTERVAL 28 HOUR) UNION ALL
  SELECT 78.5, 'good', DATE_SUB(NOW(), INTERVAL 24 HOUR) UNION ALL
  SELECT 55.2, 'good', DATE_SUB(NOW(), INTERVAL 20 HOUR) UNION ALL
  SELECT 38.4, 'good', DATE_SUB(NOW(), INTERVAL 16 HOUR) UNION ALL
  SELECT 22.1, 'good', DATE_SUB(NOW(), INTERVAL 12 HOUR) UNION ALL
  SELECT 12.5, 'good', DATE_SUB(NOW(), INTERVAL  8 HOUR) UNION ALL
  SELECT  6.8, 'good', DATE_SUB(NOW(), INTERVAL  4 HOUR) UNION ALL
  SELECT  3.2, 'good', DATE_SUB(NOW(), INTERVAL  1 HOUR)
) d WHERE @s_vic_rf IS NOT NULL;

-- ── Victoria Inflow S1 (correlated with rainfall) ────────────────────────────
INSERT INTO sensor_readings (sensor_id, dam_id, reading_value, unit, quality, recorded_at)
SELECT @s_vic_if, @dam_1_id, v, 'cumecs', q, ts FROM (
  SELECT  420.0 v, 'good' q, DATE_SUB(NOW(), INTERVAL 48 HOUR) ts UNION ALL
  SELECT  485.5, 'good', DATE_SUB(NOW(), INTERVAL 44 HOUR) UNION ALL
  SELECT  680.2, 'good', DATE_SUB(NOW(), INTERVAL 40 HOUR) UNION ALL
  SELECT 1050.8, 'good', DATE_SUB(NOW(), INTERVAL 36 HOUR) UNION ALL
  SELECT 1820.3, 'good', DATE_SUB(NOW(), INTERVAL 32 HOUR) UNION ALL
  SELECT 2540.6, 'good', DATE_SUB(NOW(), INTERVAL 28 HOUR) UNION ALL
  SELECT 3180.5, 'good', DATE_SUB(NOW(), INTERVAL 24 HOUR) UNION ALL
  SELECT 2890.2, 'good', DATE_SUB(NOW(), INTERVAL 20 HOUR) UNION ALL
  SELECT 2450.8, 'good', DATE_SUB(NOW(), INTERVAL 16 HOUR) UNION ALL
  SELECT 1920.4, 'good', DATE_SUB(NOW(), INTERVAL 12 HOUR) UNION ALL
  SELECT 1380.0, 'good', DATE_SUB(NOW(), INTERVAL  8 HOUR) UNION ALL
  SELECT  890.5, 'good', DATE_SUB(NOW(), INTERVAL  4 HOUR) UNION ALL
  SELECT  620.3, 'good', DATE_SUB(NOW(), INTERVAL  1 HOUR)
) d WHERE @s_vic_if IS NOT NULL;

-- ── Victoria Outflow S1 ───────────────────────────────────────────────────────
INSERT INTO sensor_readings (sensor_id, dam_id, reading_value, unit, quality, recorded_at)
SELECT @s_vic_of, @dam_1_id, v, 'cumecs', q, ts FROM (
  SELECT  380.0 v, 'good' q, DATE_SUB(NOW(), INTERVAL 48 HOUR) ts UNION ALL
  SELECT  420.0, 'good', DATE_SUB(NOW(), INTERVAL 44 HOUR) UNION ALL
  SELECT  520.0, 'good', DATE_SUB(NOW(), INTERVAL 40 HOUR) UNION ALL
  SELECT  780.0, 'good', DATE_SUB(NOW(), INTERVAL 36 HOUR) UNION ALL
  SELECT 1200.0, 'good', DATE_SUB(NOW(), INTERVAL 32 HOUR) UNION ALL
  SELECT 1850.0, 'good', DATE_SUB(NOW(), INTERVAL 28 HOUR) UNION ALL
  SELECT 2600.0, 'good', DATE_SUB(NOW(), INTERVAL 24 HOUR) UNION ALL
  SELECT 2750.0, 'good', DATE_SUB(NOW(), INTERVAL 20 HOUR) UNION ALL
  SELECT 2500.0, 'good', DATE_SUB(NOW(), INTERVAL 16 HOUR) UNION ALL
  SELECT 2100.0, 'good', DATE_SUB(NOW(), INTERVAL 12 HOUR) UNION ALL
  SELECT 1600.0, 'good', DATE_SUB(NOW(), INTERVAL  8 HOUR) UNION ALL
  SELECT 1100.0, 'good', DATE_SUB(NOW(), INTERVAL  4 HOUR) UNION ALL
  SELECT  750.0, 'good', DATE_SUB(NOW(), INTERVAL  1 HOUR)
) d WHERE @s_vic_of IS NOT NULL;

-- ── Victoria Soil Moisture S1 ─────────────────────────────────────────────────
INSERT INTO sensor_readings (sensor_id, dam_id, reading_value, unit, quality, recorded_at)
SELECT @s_vic_sm, @dam_1_id, v, '%', q, ts FROM (
  SELECT 38.5 v, 'good' q, DATE_SUB(NOW(), INTERVAL 48 HOUR) ts UNION ALL
  SELECT 39.2, 'good', DATE_SUB(NOW(), INTERVAL 40 HOUR) UNION ALL
  SELECT 42.8, 'good', DATE_SUB(NOW(), INTERVAL 32 HOUR) UNION ALL
  SELECT 50.3, 'good', DATE_SUB(NOW(), INTERVAL 24 HOUR) UNION ALL
  SELECT 58.7, 'good', DATE_SUB(NOW(), INTERVAL 16 HOUR) UNION ALL
  SELECT 64.2, 'suspect', DATE_SUB(NOW(), INTERVAL 8  HOUR) UNION ALL
  SELECT 62.8, 'good', DATE_SUB(NOW(), INTERVAL 1  HOUR)
) d WHERE @s_vic_sm IS NOT NULL;

-- ── Victoria Seismic S1 ───────────────────────────────────────────────────────
INSERT INTO sensor_readings (sensor_id, dam_id, reading_value, unit, quality, recorded_at)
SELECT @s_vic_se, @dam_1_id, v, 'g', q, ts FROM (
  SELECT 0.012 v, 'good' q, DATE_SUB(NOW(), INTERVAL 48 HOUR) ts UNION ALL
  SELECT 0.015, 'good', DATE_SUB(NOW(), INTERVAL 40 HOUR) UNION ALL
  SELECT 0.018, 'good', DATE_SUB(NOW(), INTERVAL 32 HOUR) UNION ALL
  SELECT 0.025, 'good', DATE_SUB(NOW(), INTERVAL 24 HOUR) UNION ALL
  SELECT 0.019, 'good', DATE_SUB(NOW(), INTERVAL 16 HOUR) UNION ALL
  SELECT 0.014, 'good', DATE_SUB(NOW(), INTERVAL  8 HOUR) UNION ALL
  SELECT 0.011, 'good', DATE_SUB(NOW(), INTERVAL  1 HOUR)
) d WHERE @s_vic_se IS NOT NULL;

-- ── Kotmale Water Level S1 ────────────────────────────────────────────────────
INSERT INTO sensor_readings (sensor_id, dam_id, reading_value, unit, quality, recorded_at)
SELECT @s_ktl_wl, @dam_2_id, v, 'm', q, ts FROM (
  SELECT 72.30 v, 'good' q, DATE_SUB(NOW(), INTERVAL 48 HOUR) ts UNION ALL
  SELECT 73.55, 'good', DATE_SUB(NOW(), INTERVAL 40 HOUR) UNION ALL
  SELECT 75.80, 'good', DATE_SUB(NOW(), INTERVAL 32 HOUR) UNION ALL
  SELECT 77.20, 'good', DATE_SUB(NOW(), INTERVAL 24 HOUR) UNION ALL
  SELECT 78.55, 'good', DATE_SUB(NOW(), INTERVAL 16 HOUR) UNION ALL
  SELECT 79.10, 'good', DATE_SUB(NOW(), INTERVAL  8 HOUR) UNION ALL
  SELECT 79.45, 'good', DATE_SUB(NOW(), INTERVAL  1 HOUR)
) d WHERE @s_ktl_wl IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Sync last_reading_at on each sensor
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE sensors s
SET s.last_reading_at = (
    SELECT MAX(r.recorded_at)
    FROM sensor_readings r
    WHERE r.sensor_id = s.id
)
WHERE s.sensor_uid IN (
    'VIC-WL-001','VIC-RF-001','VIC-IF-001','VIC-OF-001',
    'VIC-SM-001','VIC-SE-001','KTL-WL-001','KTL-RF-001'
);
