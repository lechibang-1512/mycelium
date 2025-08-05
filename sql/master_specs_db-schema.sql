-- ============================================================================
-- MASTER WAREHOUSE MANAGEMENT SCRIPT
-- Corrected and Combined for master_specs_db
-- Generated on 2025-07-10
--
-- Fix: Wrapped drop statements in `SET FOREIGN_KEY_CHECKS` to ensure
-- a clean and ordered tear-down and rebuild process, preventing
-- foreign key constraint failures on re-creation.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `master_specs_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `master_specs_db`;

-- ============================================================================
-- SECTION 0: ENSURE CLEAN DATABASE STATE
-- ============================================================================

-- Disable foreign key checks to allow for dropping tables in any order.
SET FOREIGN_KEY_CHECKS = 0;

-- Step 1: Drop views first (as they depend on tables)
DROP VIEW IF EXISTS inventory_overview;
DROP VIEW IF EXISTS expiring_batches;
DROP VIEW IF EXISTS serial_inventory_status;
DROP VIEW IF EXISTS warehouse_distribution_overview;
DROP VIEW IF EXISTS zone_distribution_efficiency;
DROP VIEW IF EXISTS inventory_movement_tracking;
DROP VIEW IF EXISTS low_stock_alerts;

-- Step 2: Drop all tables
DROP TABLE IF EXISTS `inventory_log`;
DROP TABLE IF EXISTS `inventory_transfers`;
DROP TABLE IF EXISTS `receipts`;
DROP TABLE IF EXISTS `batch_tracking`;
DROP TABLE IF EXISTS `warehouse_product_locations`;
DROP TABLE IF EXISTS `serialized_inventory`;
DROP TABLE IF EXISTS `warehouse_zones`;
DROP TABLE IF EXISTS `warehouses`;
DROP TABLE IF EXISTS `specs_db`;
DROP TABLE IF EXISTS `suppliers`; -- Assuming a suppliers table might exist

-- Re-enable foreign key checks. All subsequent statements will be validated.
SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================================
-- SECTION 1: CREATE TABLES
-- Parent tables are created before child tables that reference them.
-- ============================================================================

-- Table: specs_db (Parent to many)
CREATE TABLE `specs_db` (
  `product_id` bigint(20) unsigned NOT NULL,
  `device_name` varchar(255) DEFAULT NULL,
  `device_maker` varchar(255) DEFAULT NULL,
  `device_price` decimal(10,2) DEFAULT NULL,
  -- Other columns from your schema...
  `product_type` varchar(20) NOT NULL,
  PRIMARY KEY (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: warehouses (Parent to zones, locations, etc.)
CREATE TABLE `warehouses` (
  `warehouse_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `location` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `contact_info` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`warehouse_id`),
  KEY `idx_warehouse_name` (`name`),
  KEY `idx_warehouse_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: warehouse_zones (Child of warehouses)
CREATE TABLE `warehouse_zones` (
  `zone_id` int(11) NOT NULL AUTO_INCREMENT,
  `warehouse_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `zone_type` enum('receiving','storage','picking','staging','shipping') DEFAULT 'storage',
  `capacity_limit` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`zone_id`),
  KEY `idx_zone_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_zone_to_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: serialized_inventory
CREATE TABLE `serialized_inventory` (
  `serial_id` int(11) NOT NULL AUTO_INCREMENT,
  `phone_id` bigint(20) unsigned NOT NULL,
  `serial_number` varchar(255) NOT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `status` enum('available','reserved','sold','damaged','returned') DEFAULT 'available',
  -- Other columns from your schema...
  PRIMARY KEY (`serial_id`),
  UNIQUE KEY `serial_number` (`serial_number`),
  CONSTRAINT `fk_serial_to_specs` FOREIGN KEY (`phone_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_serial_to_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_serial_to_zone` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: warehouse_product_locations
CREATE TABLE `warehouse_product_locations` (
  `location_id` int(11) NOT NULL AUTO_INCREMENT,
  `warehouse_id` int(11) NOT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `phone_id` bigint(20) unsigned NOT NULL,
  `quantity` int(11) DEFAULT 0,
  `reserved_quantity` int(11) DEFAULT 0,
  `min_stock_level` int(11) DEFAULT 0,
  -- Other columns from your schema...
  PRIMARY KEY (`location_id`),
  UNIQUE KEY `unique_warehouse_zone_phone` (`warehouse_id`, `zone_id`, `phone_id`),
  CONSTRAINT `fk_wpl_to_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wpl_to_zone` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_wpl_to_specs` FOREIGN KEY (`phone_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: batch_tracking
CREATE TABLE `batch_tracking` (
  `batch_id` int(11) NOT NULL AUTO_INCREMENT,
  `phone_id` bigint(20) unsigned NOT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `batch_no` varchar(100) NOT NULL,
  -- Other columns...
  PRIMARY KEY (`batch_id`),
  CONSTRAINT `fk_batch_to_specs` FOREIGN KEY (`phone_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_batch_to_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_batch_to_zone` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: inventory_log
CREATE TABLE `inventory_log` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `phone_id` bigint(20) unsigned NOT NULL,
  `transaction_type` enum('incoming','outgoing','adjustment') NOT NULL,
  `quantity_changed` int(11) NOT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `serial_id` int(11) DEFAULT NULL,
  -- Other columns...
  PRIMARY KEY (`log_id`),
  CONSTRAINT `fk_log_to_specs` FOREIGN KEY (`phone_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_log_to_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_log_to_zone` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_log_to_serial` FOREIGN KEY (`serial_id`) REFERENCES `serialized_inventory` (`serial_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add other table creations (inventory_transfers, receipts) here, following the same pattern...


-- ============================================================================
-- SECTION 2: INSERT SAMPLE DATA
-- Data is inserted into parent tables before child tables.
-- ============================================================================

-- Insert sample warehouses (this must happen before inserting zones)
INSERT INTO `warehouses` (`warehouse_id`, `name`, `location`, `description`, `contact_info`, `is_active`) VALUES
(1, 'Main Warehouse', 'Downtown Location', 'Primary storage and distribution facility', JSON_OBJECT('phone', '555-0001', 'email', 'main@warehouse.com'), TRUE),
(2, 'Regional Warehouse North', 'North District', 'Regional distribution center for northern areas', JSON_OBJECT('phone', '555-0002', 'email', 'north@warehouse.com'), TRUE),
(3, 'Regional Warehouse South', 'South District', 'Regional distribution center for southern areas', JSON_OBJECT('phone', '555-0003', 'email', 'south@warehouse.com'), TRUE),
(4, 'Returns Processing Center', 'Central Location', 'Dedicated facility for processing returns', JSON_OBJECT('phone', '555-0004', 'email', 'returns@warehouse.com'), TRUE);

-- Insert sample zones for the warehouses created above
INSERT INTO `warehouse_zones` (`warehouse_id`, `name`, `zone_type`) VALUES
(1, 'Receiving Dock A', 'receiving'),
(1, 'High Value Storage', 'storage'),
(1, 'Fast Pick Zone', 'picking'),
(1, 'Shipping Dock A', 'shipping'),
(2, 'North Receiving', 'receiving'),
(2, 'North Storage', 'storage'),
(2, 'North Shipping', 'shipping'),
(3, 'South Receiving', 'receiving'),
(3, 'South Storage', 'storage'),
(3, 'South Shipping', 'shipping'),
(4, 'Returns Receiving', 'receiving'),
(4, 'Inspection Zone', 'storage');

-- You would insert sample data for specs_db, batch_tracking, etc. here

-- ============================================================================
-- SECTION 3: CREATE VIEWS FOR REPORTING
-- ============================================================================

-- (All your CREATE VIEW statements go here, they will work now that tables and data exist)

CREATE VIEW `warehouse_distribution_overview` AS
SELECT
    w.warehouse_id,
    w.name as warehouse_name,
    COUNT(DISTINCT wz.zone_id) as total_zones,
    COALESCE(SUM(wpl.quantity), 0) as total_inventory
FROM warehouses w
LEFT JOIN warehouse_zones wz ON w.warehouse_id = wz.warehouse_id AND wz.is_active = TRUE
LEFT JOIN warehouse_product_locations wpl ON w.warehouse_id = wpl.warehouse_id
WHERE w.is_active = TRUE
GROUP BY w.warehouse_id;

-- Add all other VIEW definitions here...


-- ============================================================================
-- SECTION 4: VERIFICATION
-- ============================================================================

SELECT 'Script execution completed successfully.' as status;
SELECT 'Warehouses created:' as label, COUNT(*) as count FROM warehouses;
SELECT 'Zones created:' as label, COUNT(*) as count FROM warehouse_zones;