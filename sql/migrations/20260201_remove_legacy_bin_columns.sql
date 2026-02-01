-- Migration: Remove legacy aisle/rack/shelf columns from bin_locations
-- Date: 2026-02-01
-- Purpose: Standardize on Column-Row-Bin hierarchical positioning system
-- First, verify no bins are using legacy fields exclusively
-- SELECT * FROM bin_locations WHERE (aisle IS NOT NULL OR rack IS NOT NULL OR shelf IS NOT NULL) AND (column_position IS NULL OR row_position IS NULL OR bin_position IS NULL);
-- Drop the bin_capacity_view first since it references the columns
DROP VIEW IF EXISTS bin_capacity_view;
-- Alter the table to remove legacy columns
ALTER TABLE bin_locations DROP COLUMN IF EXISTS aisle,
    DROP COLUMN IF EXISTS rack,
    DROP COLUMN IF EXISTS shelf;
-- Make Column-Row-Bin positions NOT NULL
-- Note: Only run this if existing data has been migrated
-- ALTER TABLE bin_locations 
--   MODIFY column_position VARCHAR(10) NOT NULL,
--   MODIFY row_position VARCHAR(10) NOT NULL,
--   MODIFY bin_position VARCHAR(10) NOT NULL;
-- Recreate bin_capacity_view without legacy columns
CREATE OR REPLACE VIEW `bin_capacity_view` AS
SELECT `bl`.`bin_id` AS `bin_id`,
    `bl`.`zone_id` AS `zone_id`,
    `bl`.`bin_code` AS `bin_code`,
    `bl`.`bin_type` AS `bin_type`,
    `bl`.`column_position` AS `column_position`,
    `bl`.`row_position` AS `row_position`,
    `bl`.`bin_position` AS `bin_position`,
    `bl`.`hierarchical_code` AS `hierarchical_code`,
    `bl`.`max_capacity` AS `max_capacity`,
    `bl`.`priority_level` AS `priority_level`,
    `bl`.`accessibility_level` AS `accessibility_level`,
    `bl`.`is_active` AS `is_active`,
    `wz`.`warehouse_id` AS `warehouse_id`,
    `wz`.`name` AS `zone_name`,
    `wz`.`zone_type` AS `zone_type`,
    `wz`.`bin_prefix` AS `zone_bin_prefix`,
    `w`.`name` AS `warehouse_name`,
    COALESCE(SUM(`bi`.`quantity`), 0) AS `current_quantity`,
    COUNT(DISTINCT `bi`.`product_id`) AS `unique_products`,
    CASE
        WHEN `bl`.`max_capacity` IS NOT NULL THEN `bl`.`max_capacity` - COALESCE(SUM(`bi`.`quantity`), 0)
        ELSE NULL
    END AS `available_capacity`,
    CASE
        WHEN `bl`.`max_capacity` IS NOT NULL
        AND `bl`.`max_capacity` > 0 THEN ROUND(
            COALESCE(SUM(`bi`.`quantity`), 0) / `bl`.`max_capacity` * 100,
            2
        )
        ELSE NULL
    END AS `utilization_percent`,
    CASE
        WHEN `bl`.`is_active` = 0 THEN 'inactive'
        WHEN `bl`.`max_capacity` IS NULL THEN 'unlimited'
        WHEN COALESCE(SUM(`bi`.`quantity`), 0) = 0 THEN 'empty'
        WHEN COALESCE(SUM(`bi`.`quantity`), 0) >= `bl`.`max_capacity` THEN 'full'
        WHEN COALESCE(SUM(`bi`.`quantity`), 0) / NULLIF(`bl`.`max_capacity`, 0) >= 0.9 THEN 'near_full'
        WHEN COALESCE(SUM(`bi`.`quantity`), 0) / NULLIF(`bl`.`max_capacity`, 0) >= 0.7 THEN 'high'
        ELSE 'available'
    END AS `capacity_status`,
    `bl`.`temperature_controlled` AS `temperature_controlled`,
    `bl`.`temperature_min` AS `temperature_min`,
    `bl`.`temperature_max` AS `temperature_max`,
    `bl`.`height_cm` AS `height_cm`,
    `bl`.`width_cm` AS `width_cm`,
    `bl`.`depth_cm` AS `depth_cm`,
    `bl`.`weight_capacity` AS `weight_capacity`
FROM (
        (
            (
                `bin_locations` `bl`
                JOIN `warehouse_zones` `wz` ON (`bl`.`zone_id` = `wz`.`zone_id`)
            )
            JOIN `warehouses` `w` ON (`wz`.`warehouse_id` = `w`.`warehouse_id`)
        )
        LEFT JOIN `bin_inventory` `bi` ON (`bl`.`bin_id` = `bi`.`bin_id`)
    )
GROUP BY `bl`.`bin_id`;