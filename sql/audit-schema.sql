-- ===============================================
-- Inventory Audit System Schema
-- Database: master_specs_db
-- Description: Tables for periodic inventory verification and reconciliation
-- ===============================================

-- Table: inventory_audits
-- Stores audit header information
CREATE TABLE IF NOT EXISTS `inventory_audits` (
  `audit_id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `warehouse_id` INT(11) NOT NULL,
  `zone_id` INT(11) DEFAULT NULL,
  `audit_type` ENUM('full', 'partial', 'cycle') NOT NULL DEFAULT 'full',
  `status` ENUM('in_progress', 'pending_approval', 'completed', 'rejected') NOT NULL DEFAULT 'in_progress',
  `created_by` INT(11) NOT NULL,
  `approved_by` INT(11) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `approval_notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME DEFAULT NULL,
  `approved_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`audit_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_zone_id` (`zone_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_completed_at` (`completed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: audit_worksheet
-- Stores individual items to be counted in audit
CREATE TABLE IF NOT EXISTS `audit_worksheet` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `audit_id` BIGINT(20) UNSIGNED NOT NULL,
  `product_id` BIGINT(20) UNSIGNED NOT NULL,
  `warehouse_id` INT(11) NOT NULL,
  `zone_id` INT(11) DEFAULT NULL,
  `bin_location` VARCHAR(50) DEFAULT NULL,
  `system_quantity` INT(11) NOT NULL DEFAULT 0,
  `counted_quantity` INT(11) DEFAULT NULL,
  `count_notes` TEXT DEFAULT NULL,
  `counted_at` DATETIME DEFAULT NULL,
  `counted_by` INT(11) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_id` (`audit_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_zone_id` (`zone_id`),
  KEY `idx_counted_at` (`counted_at`),
  CONSTRAINT `fk_audit_worksheet_audit` FOREIGN KEY (`audit_id`) REFERENCES `inventory_audits` (`audit_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_audit_worksheet_product` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: audit_discrepancies
-- Stores major discrepancies requiring investigation
CREATE TABLE IF NOT EXISTS `audit_discrepancies` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `audit_id` BIGINT(20) UNSIGNED NOT NULL,
  `product_id` BIGINT(20) UNSIGNED NOT NULL,
  `warehouse_id` INT(11) NOT NULL,
  `zone_id` INT(11) DEFAULT NULL,
  `system_quantity` INT(11) NOT NULL,
  `counted_quantity` INT(11) NOT NULL,
  `variance` INT(11) NOT NULL,
  `status` ENUM('pending', 'resolved', 'rejected') NOT NULL DEFAULT 'pending',
  `adjustment_applied` BOOLEAN DEFAULT FALSE,
  `adjustment_reason` VARCHAR(255) DEFAULT NULL,
  `resolution_notes` TEXT DEFAULT NULL,
  `investigated_by` INT(11) DEFAULT NULL,
  `resolved_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_id` (`audit_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_status` (`status`),
  KEY `idx_investigated_by` (`investigated_by`),
  KEY `idx_resolved_at` (`resolved_at`),
  CONSTRAINT `fk_audit_discrepancy_audit` FOREIGN KEY (`audit_id`) REFERENCES `inventory_audits` (`audit_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_audit_discrepancy_product` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for common queries
CREATE INDEX idx_audit_status_date ON inventory_audits(status, created_at DESC);
CREATE INDEX idx_worksheet_counted ON audit_worksheet(audit_id, counted_quantity);
CREATE INDEX idx_discrepancy_unresolved ON audit_discrepancies(audit_id, status) WHERE status = 'pending';

-- Add last_audit_date column to warehouse_product_locations if not exists
ALTER TABLE warehouse_product_locations 
ADD COLUMN IF NOT EXISTS last_audit_date DATETIME DEFAULT NULL;

-- Comments for documentation
ALTER TABLE inventory_audits COMMENT = 'Stores inventory audit header information for periodic physical counts';
ALTER TABLE audit_worksheet COMMENT = 'Contains items to be counted in each audit with system vs actual quantities';
ALTER TABLE audit_discrepancies COMMENT = 'Records major discrepancies (>10% variance) requiring investigation and resolution';
