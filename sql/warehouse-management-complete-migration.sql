-- Complete Warehouse Management Migration for master_specs_db
-- This file combines drop and create operations for a complete warehouse setup
-- Generated on 2025-07-10

-- ============================================================================
-- SECTION 1: DROP EXISTING WAREHOUSE STRUCTURES
-- ============================================================================

-- Step 1: Drop views first (they depend on tables)
DROP VIEW IF EXISTS inventory_overview;
DROP VIEW IF EXISTS expiring_batches;
DROP VIEW IF EXISTS serial_inventory_status;

-- Step 2: Drop foreign key constraints from inventory_log table
-- Get and drop all warehouse-related foreign keys
SET @sql = NULL;
SELECT GROUP_CONCAT(
    CONCAT('ALTER TABLE inventory_log DROP FOREIGN KEY ', CONSTRAINT_NAME)
    SEPARATOR '; '
) INTO @sql
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'inventory_log'
AND CONSTRAINT_TYPE = 'FOREIGN KEY'
AND CONSTRAINT_NAME REGEXP 'warehouse|zone|serial';

SET @sql = IFNULL(@sql, 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Drop warehouse-related columns from inventory_log
ALTER TABLE inventory_log 
DROP COLUMN IF EXISTS warehouse_id,
DROP COLUMN IF EXISTS zone_id,
DROP COLUMN IF EXISTS batch_no,
DROP COLUMN IF EXISTS lot_no,
DROP COLUMN IF EXISTS expiry_date,
DROP COLUMN IF EXISTS serial_id;

-- Step 4: Drop warehouse-related tables
DROP TABLE IF EXISTS batch_tracking;
DROP TABLE IF EXISTS warehouse_product_locations;
DROP TABLE IF EXISTS serialized_inventory;
DROP TABLE IF EXISTS warehouse_zones;
DROP TABLE IF EXISTS warehouses;

-- ============================================================================
-- SECTION 2: CREATE NEW WAREHOUSE STRUCTURES
-- ============================================================================

-- Step 1: Create warehouses table
CREATE TABLE warehouses (
  warehouse_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location TEXT,
  description TEXT,
  contact_info JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_warehouse_name (name),
  INDEX idx_warehouse_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Create warehouse_zones table
CREATE TABLE warehouse_zones (
  zone_id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  zone_type ENUM('receiving', 'storage', 'picking', 'staging', 'shipping') DEFAULT 'storage',
  capacity_limit INT DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
  INDEX idx_zone_warehouse (warehouse_id),
  INDEX idx_zone_name (name),
  INDEX idx_zone_type (zone_type),
  INDEX idx_zone_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 3: Create serialized_inventory table
CREATE TABLE serialized_inventory (
  serial_id INT AUTO_INCREMENT PRIMARY KEY,
  phone_id BIGINT(20) UNSIGNED NOT NULL,
  serial_number VARCHAR(255) UNIQUE NOT NULL,
  warehouse_id INT,
  zone_id INT,
  batch_no VARCHAR(100),
  lot_no VARCHAR(100),
  expiry_date DATE,
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  condition_status ENUM('new', 'used', 'refurbished', 'damaged') DEFAULT 'new',
  status ENUM('available', 'reserved', 'sold', 'damaged', 'returned') DEFAULT 'available',
  supplier_id INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (phone_id) REFERENCES specs_db(product_id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE SET NULL,
  FOREIGN KEY (zone_id) REFERENCES warehouse_zones(zone_id) ON DELETE SET NULL,
  INDEX idx_serial_phone (phone_id),
  INDEX idx_serial_warehouse (warehouse_id),
  INDEX idx_serial_zone (zone_id),
  INDEX idx_serial_batch (batch_no),
  INDEX idx_serial_lot (lot_no),
  INDEX idx_serial_expiry (expiry_date),
  INDEX idx_serial_status (status),
  INDEX idx_serial_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 4: Create warehouse_product_locations table
CREATE TABLE warehouse_product_locations (
  location_id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT NOT NULL,
  zone_id INT,
  phone_id BIGINT(20) UNSIGNED NOT NULL,
  aisle VARCHAR(50),
  shelf VARCHAR(50),
  bin VARCHAR(50),
  quantity INT DEFAULT 0,
  reserved_quantity INT DEFAULT 0,
  min_stock_level INT DEFAULT 0,
  max_stock_level INT DEFAULT NULL,
  last_counted DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
  FOREIGN KEY (zone_id) REFERENCES warehouse_zones(zone_id) ON DELETE SET NULL,
  FOREIGN KEY (phone_id) REFERENCES specs_db(product_id),
  INDEX idx_wpl_warehouse (warehouse_id),
  INDEX idx_wpl_zone (zone_id),
  INDEX idx_wpl_phone (phone_id),
  INDEX idx_wpl_quantity (quantity),
  INDEX idx_wpl_reserved (reserved_quantity),
  UNIQUE KEY unique_warehouse_zone_phone (warehouse_id, zone_id, phone_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 5: Create batch_tracking table
CREATE TABLE batch_tracking (
  batch_id INT AUTO_INCREMENT PRIMARY KEY,
  phone_id BIGINT(20) UNSIGNED NOT NULL,
  warehouse_id INT,
  zone_id INT,
  batch_no VARCHAR(100) NOT NULL,
  lot_no VARCHAR(100),
  supplier_id INT,
  quantity_received INT DEFAULT 0,
  quantity_remaining INT DEFAULT 0,
  quantity_sold INT DEFAULT 0,
  quantity_damaged INT DEFAULT 0,
  purchase_price DECIMAL(10,2),
  expiry_date DATE,
  manufacture_date DATE,
  received_date DATE DEFAULT CURRENT_DATE,
  status ENUM('active', 'expired', 'recalled', 'depleted') DEFAULT 'active',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (phone_id) REFERENCES specs_db(product_id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE SET NULL,
  FOREIGN KEY (zone_id) REFERENCES warehouse_zones(zone_id) ON DELETE SET NULL,
  INDEX idx_batch_phone (phone_id),
  INDEX idx_batch_warehouse (warehouse_id),
  INDEX idx_batch_zone (zone_id),
  INDEX idx_batch_number (batch_no),
  INDEX idx_batch_lot (lot_no),
  INDEX idx_batch_expiry (expiry_date),
  INDEX idx_batch_status (status),
  INDEX idx_batch_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 6: Alter inventory_log table to add warehouse tracking
ALTER TABLE inventory_log
ADD COLUMN warehouse_id INT,
ADD COLUMN zone_id INT,
ADD COLUMN batch_no VARCHAR(100),
ADD COLUMN lot_no VARCHAR(100),
ADD COLUMN expiry_date DATE,
ADD COLUMN serial_id INT,
ADD FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE SET NULL,
ADD FOREIGN KEY (zone_id) REFERENCES warehouse_zones(zone_id) ON DELETE SET NULL,
ADD FOREIGN KEY (serial_id) REFERENCES serialized_inventory(serial_id) ON DELETE SET NULL;

-- Step 7: Add indexes to inventory_log for warehouse tracking
ALTER TABLE inventory_log
ADD INDEX idx_inventory_warehouse (warehouse_id),
ADD INDEX idx_inventory_zone (zone_id),
ADD INDEX idx_inventory_batch (batch_no),
ADD INDEX idx_inventory_lot (lot_no),
ADD INDEX idx_inventory_expiry (expiry_date),
ADD INDEX idx_inventory_serial (serial_id);

-- ============================================================================
-- SECTION 3: CREATE VIEWS FOR REPORTING
-- ============================================================================

-- Step 8: Create inventory_overview view
CREATE VIEW inventory_overview AS
SELECT 
    sd.product_id,
    sd.device_name,
    sd.device_maker,
    sd.device_price,
    w.warehouse_id,
    w.name as warehouse_name,
    wz.zone_id,
    wz.name as zone_name,
    wz.zone_type,
    COALESCE(wpl.quantity, 0) as warehouse_quantity,
    COALESCE(wpl.reserved_quantity, 0) as reserved_quantity,
    COALESCE(wpl.quantity, 0) - COALESCE(wpl.reserved_quantity, 0) as available_quantity,
    wpl.aisle,
    wpl.shelf,
    wpl.bin,
    wpl.min_stock_level,
    wpl.max_stock_level,
    wpl.last_counted,
    CASE 
        WHEN wpl.quantity IS NULL OR wpl.quantity = 0 THEN 'out_of_stock'
        WHEN wpl.min_stock_level IS NOT NULL AND wpl.quantity <= wpl.min_stock_level THEN 'low'
        WHEN wpl.max_stock_level IS NOT NULL AND wpl.quantity >= wpl.max_stock_level THEN 'high'
        ELSE 'normal'
    END as stock_level_status
FROM specs_db sd
CROSS JOIN warehouses w
LEFT JOIN warehouse_zones wz ON w.warehouse_id = wz.warehouse_id AND wz.is_active = TRUE
LEFT JOIN warehouse_product_locations wpl ON sd.product_id = wpl.phone_id 
    AND w.warehouse_id = wpl.warehouse_id 
    AND (wz.zone_id = wpl.zone_id OR wpl.zone_id IS NULL)
WHERE w.is_active = TRUE
ORDER BY sd.product_id, w.warehouse_id, wz.zone_id;

-- Step 9: Create expiring_batches view
CREATE VIEW expiring_batches AS
SELECT 
    bt.batch_id,
    bt.phone_id,
    sd.device_name,
    sd.device_maker,
    sd.device_price,
    bt.batch_no,
    bt.lot_no,
    bt.supplier_id,
    bt.quantity_received,
    bt.quantity_remaining,
    bt.quantity_sold,
    bt.quantity_damaged,
    bt.purchase_price,
    bt.expiry_date,
    bt.manufacture_date,
    bt.received_date,
    bt.status,
    DATEDIFF(bt.expiry_date, CURRENT_DATE) as days_until_expiry,
    w.warehouse_id,
    w.name as warehouse_name,
    wz.zone_id,
    wz.name as zone_name,
    wz.zone_type,
    CASE 
        WHEN DATEDIFF(bt.expiry_date, CURRENT_DATE) < 0 THEN 'expired'
        WHEN DATEDIFF(bt.expiry_date, CURRENT_DATE) <= 7 THEN 'critical'
        WHEN DATEDIFF(bt.expiry_date, CURRENT_DATE) <= 30 THEN 'warning'
        WHEN DATEDIFF(bt.expiry_date, CURRENT_DATE) <= 90 THEN 'attention'
        ELSE 'good'
    END as urgency_level,
    bt.quantity_remaining * COALESCE(bt.purchase_price, sd.device_price) as value_at_risk
FROM batch_tracking bt
JOIN specs_db sd ON bt.phone_id = sd.product_id
LEFT JOIN warehouses w ON bt.warehouse_id = w.warehouse_id
LEFT JOIN warehouse_zones wz ON bt.zone_id = wz.zone_id
WHERE bt.status = 'active' 
    AND bt.expiry_date IS NOT NULL
    AND bt.quantity_remaining > 0
ORDER BY bt.expiry_date ASC;

-- Step 10: Create serial_inventory_status view
CREATE VIEW serial_inventory_status AS
SELECT 
    si.serial_id,
    si.phone_id,
    sd.device_name,
    sd.device_maker,
    sd.device_price,
    si.serial_number,
    si.batch_no,
    si.lot_no,
    si.condition_status,
    si.status,
    si.expiry_date,
    si.purchase_date,
    si.purchase_price,
    CASE 
        WHEN si.expiry_date IS NULL THEN NULL
        WHEN DATEDIFF(si.expiry_date, CURRENT_DATE) < 0 THEN 'expired'
        WHEN DATEDIFF(si.expiry_date, CURRENT_DATE) <= 30 THEN 'expiring_soon'
        ELSE 'good'
    END as expiry_status,
    DATEDIFF(si.expiry_date, CURRENT_DATE) as days_until_expiry,
    w.warehouse_id,
    w.name as warehouse_name,
    wz.zone_id,
    wz.name as zone_name,
    wz.zone_type,
    si.supplier_id,
    si.created_at,
    si.updated_at
FROM serialized_inventory si
JOIN specs_db sd ON si.phone_id = sd.product_id
LEFT JOIN warehouses w ON si.warehouse_id = w.warehouse_id
LEFT JOIN warehouse_zones wz ON si.zone_id = wz.zone_id
ORDER BY si.serial_number;

-- ============================================================================
-- SECTION 4: INSERT SAMPLE DATA
-- ============================================================================

-- Insert sample warehouses
INSERT INTO warehouses (name, location, description, contact_info, is_active) VALUES
('Main Warehouse', 'Downtown Location', 'Primary storage and distribution facility', 
 JSON_OBJECT('phone', '555-0001', 'email', 'main@warehouse.com', 'manager', 'John Smith'), TRUE),
('Regional Warehouse North', 'North District', 'Regional distribution center for northern areas', 
 JSON_OBJECT('phone', '555-0002', 'email', 'north@warehouse.com', 'manager', 'Jane Doe'), TRUE),
('Regional Warehouse South', 'South District', 'Regional distribution center for southern areas', 
 JSON_OBJECT('phone', '555-0003', 'email', 'south@warehouse.com', 'manager', 'Bob Johnson'), TRUE),
('Returns Processing Center', 'Central Location', 'Dedicated facility for processing returns and refurbishments', 
 JSON_OBJECT('phone', '555-0004', 'email', 'returns@warehouse.com', 'manager', 'Alice Brown'), TRUE);

-- Insert sample zones for Main Warehouse
INSERT INTO warehouse_zones (warehouse_id, name, description, zone_type, capacity_limit, is_active) VALUES
(1, 'Receiving Dock A', 'Primary receiving area for incoming shipments', 'receiving', 1000, TRUE),
(1, 'Receiving Dock B', 'Secondary receiving area for overflow shipments', 'receiving', 500, TRUE),
(1, 'High Value Storage', 'Secure storage for premium and high-value items', 'storage', 2000, TRUE),
(1, 'General Storage A', 'Main storage area for regular inventory', 'storage', 5000, TRUE),
(1, 'General Storage B', 'Additional storage space for overflow inventory', 'storage', 5000, TRUE),
(1, 'Bulk Storage', 'Large storage area for bulk items and accessories', 'storage', 10000, TRUE),
(1, 'Fast Pick Zone', 'High-turnover items for quick order fulfillment', 'picking', 1500, TRUE),
(1, 'Order Staging', 'Area for preparing and staging outbound orders', 'staging', 800, TRUE),
(1, 'Shipping Dock A', 'Primary shipping area for outbound orders', 'shipping', 1200, TRUE),
(1, 'Shipping Dock B', 'Secondary shipping area for large orders', 'shipping', 800, TRUE);

-- Insert sample zones for Regional Warehouse North
INSERT INTO warehouse_zones (warehouse_id, name, description, zone_type, capacity_limit, is_active) VALUES
(2, 'North Receiving', 'Receiving area for regional shipments', 'receiving', 500, TRUE),
(2, 'North Storage', 'Main storage area for regional inventory', 'storage', 3000, TRUE),
(2, 'North Picking', 'Order fulfillment area for regional orders', 'picking', 800, TRUE),
(2, 'North Shipping', 'Shipping area for regional distribution', 'shipping', 600, TRUE);

-- Insert sample zones for Regional Warehouse South
INSERT INTO warehouse_zones (warehouse_id, name, description, zone_type, capacity_limit, is_active) VALUES
(3, 'South Receiving', 'Receiving area for regional shipments', 'receiving', 500, TRUE),
(3, 'South Storage', 'Main storage area for regional inventory', 'storage', 3000, TRUE),
(3, 'South Picking', 'Order fulfillment area for regional orders', 'picking', 800, TRUE),
(3, 'South Shipping', 'Shipping area for regional distribution', 'shipping', 600, TRUE);

-- Insert sample zones for Returns Processing Center
INSERT INTO warehouse_zones (warehouse_id, name, description, zone_type, capacity_limit, is_active) VALUES
(4, 'Returns Receiving', 'Area for receiving returned items', 'receiving', 300, TRUE),
(4, 'Inspection Zone', 'Area for inspecting and testing returned items', 'storage', 200, TRUE),
(4, 'Refurbishment Zone', 'Area for refurbishing returned items', 'storage', 150, TRUE),
(4, 'Returns Shipping', 'Area for shipping processed returns', 'shipping', 250, TRUE);

-- ============================================================================
-- SECTION 5: ADDITIONAL VIEWS FOR DISTRIBUTION MANAGEMENT
-- ============================================================================

-- Step 11: Create warehouse_distribution_overview view
CREATE VIEW warehouse_distribution_overview AS
SELECT 
    w.warehouse_id,
    w.name as warehouse_name,
    w.location,
    w.description,
    COUNT(DISTINCT wz.zone_id) as total_zones,
    COUNT(DISTINCT CASE WHEN wz.zone_type = 'receiving' THEN wz.zone_id END) as receiving_zones,
    COUNT(DISTINCT CASE WHEN wz.zone_type = 'storage' THEN wz.zone_id END) as storage_zones,
    COUNT(DISTINCT CASE WHEN wz.zone_type = 'picking' THEN wz.zone_id END) as picking_zones,
    COUNT(DISTINCT CASE WHEN wz.zone_type = 'staging' THEN wz.zone_id END) as staging_zones,
    COUNT(DISTINCT CASE WHEN wz.zone_type = 'shipping' THEN wz.zone_id END) as shipping_zones,
    COUNT(DISTINCT wpl.phone_id) as unique_products,
    COALESCE(SUM(wpl.quantity), 0) as total_inventory,
    COALESCE(SUM(wpl.reserved_quantity), 0) as total_reserved,
    COALESCE(SUM(wpl.quantity - wpl.reserved_quantity), 0) as total_available,
    COALESCE(SUM(wz.capacity_limit), 0) as total_capacity,
    CASE 
        WHEN SUM(wz.capacity_limit) > 0 THEN 
            ROUND((SUM(wpl.quantity) / SUM(wz.capacity_limit)) * 100, 2)
        ELSE NULL 
    END as capacity_utilization_percent,
    COUNT(DISTINCT bt.batch_id) as active_batches,
    COUNT(DISTINCT si.serial_id) as serialized_items
FROM warehouses w
LEFT JOIN warehouse_zones wz ON w.warehouse_id = wz.warehouse_id AND wz.is_active = TRUE
LEFT JOIN warehouse_product_locations wpl ON w.warehouse_id = wpl.warehouse_id
LEFT JOIN batch_tracking bt ON w.warehouse_id = bt.warehouse_id AND bt.status = 'active'
LEFT JOIN serialized_inventory si ON w.warehouse_id = si.warehouse_id AND si.status = 'available'
WHERE w.is_active = TRUE
GROUP BY w.warehouse_id, w.name, w.location, w.description
ORDER BY w.name;

-- Step 12: Create zone_distribution_efficiency view
CREATE VIEW zone_distribution_efficiency AS
SELECT 
    wz.zone_id,
    wz.warehouse_id,
    wz.name as zone_name,
    wz.zone_type,
    wz.capacity_limit,
    w.name as warehouse_name,
    COUNT(DISTINCT wpl.phone_id) as unique_products,
    COALESCE(SUM(wpl.quantity), 0) as current_inventory,
    COALESCE(SUM(wpl.reserved_quantity), 0) as reserved_inventory,
    COALESCE(SUM(wpl.quantity - wpl.reserved_quantity), 0) as available_inventory,
    CASE 
        WHEN wz.capacity_limit > 0 THEN 
            ROUND((SUM(wpl.quantity) / wz.capacity_limit) * 100, 2)
        ELSE NULL 
    END as utilization_percent,
    CASE 
        WHEN wz.capacity_limit > 0 AND SUM(wpl.quantity) > 0 THEN
            CASE 
                WHEN (SUM(wpl.quantity) / wz.capacity_limit) > 0.9 THEN 'over_capacity'
                WHEN (SUM(wpl.quantity) / wz.capacity_limit) > 0.8 THEN 'high_utilization'
                WHEN (SUM(wpl.quantity) / wz.capacity_limit) > 0.6 THEN 'moderate_utilization'
                WHEN (SUM(wpl.quantity) / wz.capacity_limit) > 0.3 THEN 'low_utilization'
                ELSE 'under_utilized'
            END
        ELSE 'empty'
    END as efficiency_status,
    -- Recent activity metrics (last 30 days)
    (SELECT COUNT(*) FROM inventory_log il 
     WHERE il.zone_id = wz.zone_id 
     AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as recent_transactions,
    (SELECT SUM(ABS(il.quantity_changed)) FROM inventory_log il 
     WHERE il.zone_id = wz.zone_id 
     AND il.transaction_type = 'incoming'
     AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as items_received_30d,
    (SELECT SUM(ABS(il.quantity_changed)) FROM inventory_log il 
     WHERE il.zone_id = wz.zone_id 
     AND il.transaction_type = 'outgoing'
     AND il.transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as items_shipped_30d
FROM warehouse_zones wz
JOIN warehouses w ON wz.warehouse_id = w.warehouse_id
LEFT JOIN warehouse_product_locations wpl ON wz.zone_id = wpl.zone_id
WHERE wz.is_active = TRUE AND w.is_active = TRUE
GROUP BY wz.zone_id, wz.warehouse_id, wz.name, wz.zone_type, wz.capacity_limit, w.name
ORDER BY w.name, wz.zone_type, wz.name;

-- Step 13: Create inventory_movement_tracking view
CREATE VIEW inventory_movement_tracking AS
SELECT 
    il.log_id,
    il.phone_id,
    sd.device_name,
    sd.device_maker,
    il.transaction_type,
    il.quantity_changed,
    il.transaction_date,
    il.warehouse_id,
    w.name as warehouse_name,
    il.zone_id,
    wz.name as zone_name,
    wz.zone_type,
    il.batch_no,
    il.lot_no,
    il.serial_id,
    si.serial_number,
    il.notes,
    -- Calculate running totals
    SUM(il.quantity_changed) OVER (
        PARTITION BY il.phone_id, il.warehouse_id, il.zone_id 
        ORDER BY il.transaction_date, il.log_id
    ) as running_total
FROM inventory_log il
JOIN specs_db sd ON il.phone_id = sd.product_id
LEFT JOIN warehouses w ON il.warehouse_id = w.warehouse_id
LEFT JOIN warehouse_zones wz ON il.zone_id = wz.zone_id
LEFT JOIN serialized_inventory si ON il.serial_id = si.serial_id
ORDER BY il.transaction_date DESC, il.log_id DESC;

-- Step 14: Create low_stock_alerts view
CREATE VIEW low_stock_alerts AS
SELECT 
    wpl.location_id,
    wpl.phone_id,
    sd.device_name,
    sd.device_maker,
    sd.device_price,
    wpl.warehouse_id,
    w.name as warehouse_name,
    wpl.zone_id,
    wz.name as zone_name,
    wz.zone_type,
    wpl.quantity as current_stock,
    wpl.reserved_quantity,
    wpl.quantity - wpl.reserved_quantity as available_stock,
    wpl.min_stock_level,
    wpl.max_stock_level,
    wpl.aisle,
    wpl.shelf,
    wpl.bin,
    wpl.last_counted,
    CASE 
        WHEN wpl.quantity = 0 THEN 'out_of_stock'
        WHEN wpl.quantity <= (wpl.min_stock_level * 0.5) THEN 'critical'
        WHEN wpl.quantity <= wpl.min_stock_level THEN 'low'
        ELSE 'normal'
    END as alert_level,
    DATEDIFF(NOW(), wpl.last_counted) as days_since_count,
    -- Suggest reorder quantity
    CASE 
        WHEN wpl.max_stock_level IS NOT NULL THEN 
            wpl.max_stock_level - wpl.quantity
        ELSE 
            wpl.min_stock_level * 2
    END as suggested_reorder_qty
FROM warehouse_product_locations wpl
JOIN specs_db sd ON wpl.phone_id = sd.product_id
JOIN warehouses w ON wpl.warehouse_id = w.warehouse_id
LEFT JOIN warehouse_zones wz ON wpl.zone_id = wz.zone_id
WHERE w.is_active = TRUE
AND (wpl.quantity <= wpl.min_stock_level OR wpl.quantity = 0)
ORDER BY 
    CASE 
        WHEN wpl.quantity = 0 THEN 1
        WHEN wpl.quantity <= (wpl.min_stock_level * 0.5) THEN 2
        WHEN wpl.quantity <= wpl.min_stock_level THEN 3
        ELSE 4
    END,
    wpl.quantity ASC;

-- ============================================================================
-- SECTION 6: VERIFICATION QUERIES
-- ============================================================================

-- ============================================================================
-- SECTION 6: VERIFICATION QUERIES
-- ============================================================================

-- Verify tables created
SELECT 'Tables Created' as verification_step, COUNT(*) as count
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME IN ('warehouses', 'warehouse_zones', 'serialized_inventory', 'warehouse_product_locations', 'batch_tracking');

-- Verify views created
SELECT 'Views Created' as verification_step, COUNT(*) as count
FROM information_schema.VIEWS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME IN ('inventory_overview', 'expiring_batches', 'serial_inventory_status', 'warehouse_distribution_overview', 'zone_distribution_efficiency', 'inventory_movement_tracking', 'low_stock_alerts');

-- Verify sample data
SELECT 'Sample Warehouses' as verification_step, COUNT(*) as count FROM warehouses;
SELECT 'Sample Zones' as verification_step, COUNT(*) as count FROM warehouse_zones;

-- Test distribution overview
SELECT 'Distribution Overview Test' as verification_step, COUNT(*) as warehouse_count FROM warehouse_distribution_overview;

-- Test zone efficiency
SELECT 'Zone Efficiency Test' as verification_step, COUNT(*) as zone_count FROM zone_distribution_efficiency;

-- Migration completion message
SELECT 'Multi-Zone Warehouse Distribution Management Migration Completed Successfully!' as status,
       'Features: Multi-warehouse, Zone management, Batch tracking, Serial inventory, Distribution analytics' as capabilities;
