-- Add is_ml_enabled column to dams table
ALTER TABLE dams ADD COLUMN is_ml_enabled BOOLEAN DEFAULT FALSE;

-- Create tables for ML and weather forecasting if they do not exist
CREATE TABLE IF NOT EXISTS dam_overflow_configs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    dam_id BIGINT NOT NULL,
    version INT NOT NULL,
    threshold_meters DECIMAL(8, 2) NOT NULL,
    crest_level_meters DECIMAL(8, 2),
    full_reservoir_level_meters DECIMAL(8, 2),
    danger_level_meters DECIMAL(8, 2),
    description VARCHAR(500),
    status ENUM('verified', 'pending_verification', 'deprecated') NOT NULL DEFAULT 'verified',
    verified_by BIGINT,
    effective_from DATETIME(6) NOT NULL,
    effective_to DATETIME(6),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dam_status_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    dam_id BIGINT NOT NULL,
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
    hazard_status ENUM('safe', 'low', 'moderate', 'high', 'severe', 'critical') DEFAULT 'safe',
    hazard_value VARCHAR(50),
    flood_risk_score DECIMAL(5, 2),
    active_hazard_zones JSON,
    rainfall_last_1hr_mm DECIMAL(8, 2),
    rainfall_last_24hr_mm DECIMAL(8, 2),
    rainfall_forecast_24hr_mm DECIMAL(8, 2),
    recorded_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dam_weather_data (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    dam_id BIGINT NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'open-meteo',
    data_type ENUM('observation', 'forecast', 'reanalysis') NOT NULL DEFAULT 'observation',
    precipitation_mm DECIMAL(8, 2),
    temperature_c DECIMAL(5, 2),
    relative_humidity_pct DECIMAL(5, 2),
    wind_speed_ms DECIMAL(5, 2),
    forecast_rainfall_1h_mm DECIMAL(8, 2),
    forecast_rainfall_3h_mm DECIMAL(8, 2),
    forecast_rainfall_6h_mm DECIMAL(8, 2),
    valid_time DATETIME(6) NOT NULL,
    fetch_time DATETIME(6) NOT NULL,
    issue_time DATETIME(6),
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dam_forecasts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    dam_id BIGINT NOT NULL,
    issued_at DATETIME(6) NOT NULL,
    as_of DATETIME(6) NOT NULL,
    latest_reading_at DATETIME(6),
    freshness VARCHAR(30),
    demo_mode BOOLEAN NOT NULL DEFAULT FALSE,
    release_id VARCHAR(100),
    overflow_threshold_meters DECIMAL(8, 2),
    overflow_config_version INT,
    horizon_hours INT NOT NULL,
    target_time DATETIME(6) NOT NULL,
    level_p10 DECIMAL(8, 2) NOT NULL,
    level_p50 DECIMAL(8, 2) NOT NULL,
    level_p90 DECIMAL(8, 2) NOT NULL,
    overflow_probability DECIMAL(6, 4),
    overflow_probability_reason VARCHAR(255),
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_dam_as_of_horizon (dam_id, as_of, horizon_hours),
    INDEX idx_forecast_dam_asof (dam_id, as_of),
    INDEX idx_forecast_target_time (target_time),
    FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
