-- Migration: Add latitude and longitude columns to dam_gates table
-- Date: 2024
-- Description: Adds coordinate fields to dam_gates for map visualization
-- Note: MySQL does not support "ADD COLUMN IF NOT EXISTS" - that's MariaDB only

-- Add columns (will error if they already exist - check first with query below)
-- Check: SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'dam_gates' AND COLUMN_NAME IN ('latitude', 'longitude');

ALTER TABLE dam_gates 
ADD COLUMN latitude DECIMAL(10, 8) AFTER gate_type,
ADD COLUMN longitude DECIMAL(11, 8) AFTER latitude;

-- Verify the columns were added
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'dam_gates' 
AND COLUMN_NAME IN ('latitude', 'longitude');
