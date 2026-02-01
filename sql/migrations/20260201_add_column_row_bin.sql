-- Migration: Add Column-Row-Bin positioning columns to bin_locations
-- Date: 2026-02-01
-- Purpose: Implement Column-Row-Bin hierarchical positioning system
-- Step 1: Add the new columns for Column-Row-Bin positioning
ALTER TABLE bin_locations
ADD COLUMN column_position VARCHAR(10) NULL
AFTER bin_code,
    ADD COLUMN row_position VARCHAR(10) NULL
AFTER column_position,
    ADD COLUMN bin_position VARCHAR(10) NULL
AFTER row_position,
    ADD COLUMN hierarchical_code VARCHAR(50) NULL
AFTER bin_position;
-- Step 2: Add indexes for the new columns
ALTER TABLE bin_locations
ADD INDEX idx_bin_locations_hierarchical (row_position, column_position, bin_position),
    ADD INDEX idx_bin_locations_hierarchical_code (hierarchical_code);
-- Step 3: Add unique constraint for hierarchical_code within a zone
-- Note: This may fail if data already exists - run after migration
-- ALTER TABLE bin_locations
--   ADD UNIQUE KEY uk_bin_locations_zone_hierarchical (zone_id, hierarchical_code);
-- Verify the changes
-- DESCRIBE bin_locations;