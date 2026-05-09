# Database Guide - Dam Disaster Alert System

Complete reference for database schema, migrations, queries, and management.

## Table of Contents

1. [Database Overview](#database-overview)
2. [Schema Design](#schema-design)
3. [Table Definitions](#table-definitions)
4. [Database Migrations](#database-migrations)
5. [Common Queries](#common-queries)
6. [Performance Optimization](#performance-optimization)
7. [Backup and Recovery](#backup-and-recovery)
8. [Maintenance Tasks](#maintenance-tasks)
9. [Troubleshooting](#troubleshooting)

## Database Overview

### Database Information

- **Type**: Relational Database (MySQL)
- **Version**: MySQL 5.7+ or 8.0+
- **Character Set**: utf8mb4
- **Collation**: utf8mb4_unicode_ci
- **Storage Engine**: InnoDB

### Key Features

- ACID compliance for data integrity
- Foreign key constraints for referential integrity
- Indexes for query performance
- Transactions for data consistency
- Replication support for high availability

## Schema Design

### Entity-Relationship Diagram

```
┌─────────────┐
│   Regions   │
│  (1)        │
│ ├─ id       │
│ ├─ name     │
│ ├─ code     │
│ └─ ...      │
└──────┬──────┘
       │ (N)
       │
┌──────▼──────────────┐
│       Dams          │
│  (1)                │
│ ├─ id               │
│ ├─ name             │
│ ├─ region_id (FK)   │
│ ├─ capacity         │
│ ├─ current_level    │
│ └─ ...              │
└──────┬──────────────┘
       │
       ├─ (N) Sensors ──── (N) SensorReadings
       │  │ ├─ id           ├─ id
       │  │ ├─ type         ├─ value
       │  │ ├─ dam_id (FK)  ├─ timestamp
       │  │ └─ ...          └─ ...
       │  │
       │  └─ (N) Devices
       │      ├─ id
       │      ├─ key
       │      └─ ...
       │
       ├─ (N) Alerts
       │  ├─ id
       │  ├─ type
       │  ├─ severity
       │  ├─ dam_id (FK)
       │  └─ ...
       │
       └─ (N) Reports
          ├─ id
          ├─ type
          ├─ dam_id (FK)
          └─ ...

┌──────────────────┐
│     Users        │
│  (1)             │
│ ├─ id            │
│ ├─ email         │
│ ├─ password      │
│ ├─ role_id (FK)  │
│ └─ ...           │
└──────┬───────────┘
       │
       ├─ (N) Roles
       │  ├─ id
       │  ├─ name (ADMIN, OPERATOR, VIEWER)
       │  └─ ...
       │
       └─ (N) Permissions
          ├─ id
          ├─ name
          └─ ...
```

## Table Definitions

### 1. Regions Table

```sql
CREATE TABLE regions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(10) UNIQUE,
  description TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  area_km2 DECIMAL(12, 2),
  population BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_name (name),
  INDEX idx_code (code)
) ENGINE=InnoDB;
```

### 2. Dams Table

```sql
CREATE TABLE dams (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  region_id BIGINT NOT NULL,
  location VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  capacity BIGINT COMMENT 'in cubic meters',
  current_level BIGINT COMMENT 'current water level in cubic meters',
  max_level BIGINT COMMENT 'maximum safe level',
  min_level BIGINT COMMENT 'minimum operational level',
  status ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE') DEFAULT 'ACTIVE',
  construction_year INT,
  height_meters DECIMAL(10, 2),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT,
  INDEX idx_region_id (region_id),
  INDEX idx_status (status),
  INDEX idx_name (name)
) ENGINE=InnoDB;
```

### 3. Devices Table

```sql
CREATE TABLE devices (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  device_key VARCHAR(50) NOT NULL UNIQUE,
  device_name VARCHAR(255),
  device_type ENUM('SENSOR', 'GATEWAY', 'CONTROLLER'),
  dam_id BIGINT,
  firmware_version VARCHAR(20),
  hardware_version VARCHAR(20),
  last_seen TIMESTAMP,
  status ENUM('ONLINE', 'OFFLINE', 'ERROR') DEFAULT 'OFFLINE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE SET NULL,
  UNIQUE KEY uk_device_key (device_key),
  INDEX idx_status (status),
  INDEX idx_dam_id (dam_id)
) ENGINE=InnoDB;
```

### 4. Sensors Table

```sql
CREATE TABLE sensors (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dam_id BIGINT NOT NULL,
  device_id BIGINT,
  sensor_type ENUM('WATER_LEVEL', 'PRESSURE', 'TEMPERATURE', 'HUMIDITY', 'VIBRATION') NOT NULL,
  location VARCHAR(255),
  unit_of_measurement VARCHAR(20),
  min_threshold DECIMAL(10, 2),
  max_threshold DECIMAL(10, 2),
  warning_threshold DECIMAL(10, 2),
  critical_threshold DECIMAL(10, 2),
  status ENUM('OPERATIONAL', 'MAINTENANCE', 'OFFLINE', 'CALIBRATION') DEFAULT 'OPERATIONAL',
  last_reading_value DECIMAL(12, 4),
  last_reading_timestamp TIMESTAMP,
  calibration_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
  INDEX idx_dam_id (dam_id),
  INDEX idx_sensor_type (sensor_type),
  INDEX idx_status (status),
  INDEX idx_last_reading_timestamp (last_reading_timestamp)
) ENGINE=InnoDB;
```

### 5. Sensor Readings Table

```sql
CREATE TABLE sensor_readings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  sensor_id BIGINT NOT NULL,
  reading_value DECIMAL(12, 4) NOT NULL,
  unit_of_measurement VARCHAR(20),
  quality_flag ENUM('VALID', 'SUSPECT', 'INVALID') DEFAULT 'VALID',
  source VARCHAR(50) COMMENT 'Source of data (DEVICE, MANUAL, API)',
  timestamp TIMESTAMP NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE,
  INDEX idx_sensor_id_timestamp (sensor_id, timestamp),
  INDEX idx_timestamp (timestamp),
  INDEX idx_quality_flag (quality_flag)
) ENGINE=InnoDB;

-- Partition for performance
ALTER TABLE sensor_readings PARTITION BY RANGE (YEAR(timestamp)) (
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

### 6. Alerts Table

```sql
CREATE TABLE alerts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dam_id BIGINT NOT NULL,
  sensor_id BIGINT,
  alert_type VARCHAR(50) NOT NULL,
  severity ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO') DEFAULT 'MEDIUM',
  status ENUM('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED') DEFAULT 'ACTIVE',
  title VARCHAR(255),
  description TEXT,
  threshold_value DECIMAL(12, 4),
  current_value DECIMAL(12, 4),
  triggered_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  acknowledged_by BIGINT,
  resolved_at TIMESTAMP,
  resolved_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE CASCADE,
  FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE SET NULL,
  FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_dam_id (dam_id),
  INDEX idx_severity (severity),
  INDEX idx_status (status),
  INDEX idx_triggered_at (triggered_at)
) ENGINE=InnoDB;
```

### 7. Users Table

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  department VARCHAR(100),
  region_id BIGINT,
  role_id BIGINT NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
  last_login TIMESTAMP,
  password_changed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  UNIQUE KEY uk_email (email),
  INDEX idx_status (status),
  INDEX idx_role_id (role_id)
) ENGINE=InnoDB;
```

### 8. Roles Table

```sql
CREATE TABLE roles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_name (name)
) ENGINE=InnoDB;

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('ADMIN', 'System administrator with full access'),
  ('OPERATOR', 'Dam operator with operational permissions'),
  ('VIEWER', 'Read-only user for monitoring');
```

### 9. Reports Table

```sql
CREATE TABLE reports (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dam_id BIGINT NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_by BIGINT,
  status ENUM('DRAFT', 'COMPLETED', 'ARCHIVED') DEFAULT 'DRAFT',
  file_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (dam_id) REFERENCES dams(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_dam_id (dam_id),
  INDEX idx_report_type (report_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;
```

## Database Migrations

### Using Flyway

Create migration files in `api/src/main/resources/db/migration/`:

**V001__initial_schema.sql**
```sql
-- Run all table creation scripts
-- Executed automatically on application startup
```

**V002__add_indexes.sql**
```sql
-- Add performance indexes
CREATE INDEX idx_sensor_readings_timestamp ON sensor_readings(timestamp);
CREATE INDEX idx_alerts_severity ON alerts(severity);
```

### Migration Best Practices

1. **Keep migrations small and focused**
2. **Make migrations idempotent** (safe to run multiple times)
3. **Test migrations thoroughly**
4. **Include rollback procedures**
5. **Document schema changes**

### View Migrations

```bash
# Check migration history
SELECT * FROM flyway_schema_history;

# Check current schema version
SELECT description FROM flyway_schema_history ORDER BY execution_time DESC LIMIT 1;
```

## Common Queries

### 1. Get Current Dam Status

```sql
SELECT 
  d.id,
  d.name,
  d.current_level,
  d.max_level,
  ROUND((d.current_level / d.max_level) * 100, 2) as level_percentage,
  COUNT(DISTINCT s.id) as sensor_count,
  COUNT(DISTINCT CASE WHEN a.status = 'ACTIVE' THEN a.id END) as active_alerts
FROM dams d
LEFT JOIN sensors s ON d.id = s.dam_id
LEFT JOIN alerts a ON d.id = a.dam_id
WHERE d.status = 'ACTIVE'
GROUP BY d.id
ORDER BY d.name;
```

### 2. Get Recent Sensor Readings

```sql
SELECT 
  s.id,
  s.sensor_type,
  s.location,
  sr.reading_value,
  sr.unit_of_measurement,
  sr.timestamp,
  CASE 
    WHEN sr.reading_value > s.critical_threshold THEN 'CRITICAL'
    WHEN sr.reading_value > s.warning_threshold THEN 'WARNING'
    ELSE 'OK'
  END as alert_level
FROM sensors s
LEFT JOIN sensor_readings sr ON s.id = sr.sensor_id
  AND sr.timestamp = (
    SELECT MAX(timestamp) 
    FROM sensor_readings 
    WHERE sensor_id = s.id
  )
WHERE s.dam_id = ?
ORDER BY s.sensor_type, s.location;
```

### 3. Find Active Alerts by Severity

```sql
SELECT 
  a.id,
  a.alert_type,
  a.severity,
  d.name as dam_name,
  s.location as sensor_location,
  a.description,
  a.triggered_at,
  TIME_TO_SEC(TIMEDIFF(NOW(), a.triggered_at)) / 3600 as hours_active
FROM alerts a
JOIN dams d ON a.dam_id = d.id
LEFT JOIN sensors s ON a.sensor_id = s.id
WHERE a.status IN ('ACTIVE', 'ACKNOWLEDGED')
ORDER BY 
  CASE a.severity
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MEDIUM' THEN 3
    WHEN 'LOW' THEN 4
    ELSE 5
  END,
  a.triggered_at DESC;
```

### 4. Get Alert Statistics

```sql
SELECT 
  HOUR(triggered_at) as hour,
  COUNT(*) as alert_count,
  SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count,
  SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) as high_count
FROM alerts
WHERE DATE(triggered_at) = CURDATE()
GROUP BY HOUR(triggered_at)
ORDER BY hour;
```

### 5. Sensor Data Statistics

```sql
SELECT 
  s.id,
  s.sensor_type,
  MIN(sr.reading_value) as min_value,
  MAX(sr.reading_value) as max_value,
  AVG(sr.reading_value) as avg_value,
  STDDEV(sr.reading_value) as stddev_value,
  COUNT(sr.id) as reading_count
FROM sensors s
LEFT JOIN sensor_readings sr ON s.id = sr.sensor_id
  AND sr.timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
WHERE s.dam_id = ?
GROUP BY s.id, s.sensor_type;
```

## Performance Optimization

### Index Strategy

```sql
-- Primary indexes (already created)
-- Add additional performance indexes:

CREATE INDEX idx_readings_sensor_timestamp ON sensor_readings(sensor_id, timestamp DESC);
CREATE INDEX idx_alerts_dam_severity ON alerts(dam_id, severity);
CREATE INDEX idx_alerts_dam_status ON alerts(dam_id, status);
CREATE INDEX idx_users_email ON users(email);
```

### Query Optimization

```sql
-- Use EXPLAIN to analyze queries
EXPLAIN SELECT * FROM sensor_readings WHERE sensor_id = 1 AND timestamp > NOW() - INTERVAL 7 DAY;

-- Use column selection (not SELECT *)
SELECT id, sensor_id, reading_value, timestamp FROM sensor_readings;

-- Use pagination for large result sets
SELECT * FROM alerts LIMIT 20 OFFSET 0;
```

### Table Maintenance

```sql
-- Check table integrity
CHECK TABLE dams;
REPAIR TABLE dams;

-- Optimize tables
OPTIMIZE TABLE sensor_readings;
OPTIMIZE TABLE alerts;
OPTIMIZE TABLE dams;

-- Update statistics
ANALYZE TABLE sensors;
ANALYZE TABLE sensor_readings;
```

## Backup and Recovery

### Backup Strategies

**Full Backup**
```bash
mysqldump -u root -p --all-databases > full_backup.sql
```

**Database Backup**
```bash
mysqldump -u root -p ddas > ddas_backup.sql
```

**Incremental Backup** (Binary Logs)
```bash
# Enable binary logging in MySQL configuration
# Then use mysqlbinlog for incremental backups
```

### Restore from Backup

```bash
# Restore from full dump
mysql -u root -p < ddas_backup.sql

# Restore specific database
mysql -u root -p ddas < database_backup.sql

# Restore specific table
mysql -u root -p ddas < table_backup.sql
```

### Automated Backup Script

```bash
#!/bin/bash
BACKUP_DIR="/backups/mysql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="ddas"

# Create backup
mysqldump -u root -p$DB_PASSWORD $DB_NAME > $BACKUP_DIR/ddas_$TIMESTAMP.sql

# Compress backup
gzip $BACKUP_DIR/ddas_$TIMESTAMP.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "ddas_*.sql.gz" -mtime +30 -delete

echo "Backup completed: ddas_$TIMESTAMP.sql.gz"
```

## Maintenance Tasks

### Daily Tasks

```bash
# Check database size
SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024 / 1024, 2) as size_gb 
FROM information_schema.TABLES 
WHERE table_schema = 'ddas';

# Check slow queries
SHOW VARIABLES LIKE 'slow_query_log';

# Monitor connections
SHOW PROCESSLIST;
```

### Weekly Tasks

```sql
-- Analyze tables for query optimization
ANALYZE TABLE dams;
ANALYZE TABLE sensors;
ANALYZE TABLE sensor_readings;
ANALYZE TABLE alerts;

-- Check for corrupted tables
CHECK TABLE dams;
CHECK TABLE sensors;
```

### Monthly Tasks

```sql
-- Optimize tables
OPTIMIZE TABLE sensor_readings;
OPTIMIZE TABLE alerts;

-- Archive old data
DELETE FROM sensor_readings WHERE timestamp < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- Check replication status (if applicable)
SHOW SLAVE STATUS;
```

## Troubleshooting

### Connection Issues

```bash
# Test connection
mysql -u root -p -e "SELECT 1;"

# Check MySQL service
sudo systemctl status mysql

# View error log
tail -50 /var/log/mysql/error.log
```

### Performance Issues

```sql
-- Find slow queries
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;

-- Check query execution plan
EXPLAIN SELECT * FROM sensor_readings WHERE sensor_id = 1;

-- Monitor table status
SHOW TABLE STATUS FROM ddas;
```

### Disk Space Issues

```bash
# Check disk usage
df -h

# Find large tables
SELECT 
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb
FROM information_schema.TABLES
WHERE table_schema = 'ddas'
ORDER BY size_mb DESC;
```

---

**Database is the heart of data-driven systems!** 💾

