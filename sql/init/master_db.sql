-- MariaDB Schema for master_db
-- Re-created: 2026-02-08
-- Cleaned: removed unused tables, fixed broken FK constraints, normalized collation
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */
;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */
;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */
;
/*!40101 SET NAMES utf8mb4 */
;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */
;
/*!40103 SET TIME_ZONE='+00:00' */
;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */
;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */
;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */
;
-- ============================================================
-- INDEPENDENT TABLES (no FK dependencies)
-- ============================================================

--
-- Table: suppliers
--
DROP TABLE IF EXISTS `suppliers`;
CREATE TABLE `suppliers` (
  `name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `contact_position` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `ward` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `tax_code` varchar(50) DEFAULT NULL,
  `payment_terms` varchar(100) DEFAULT NULL,
  `lead_time_days` int(11) DEFAULT NULL,
  `rating` int(11) DEFAULT NULL CHECK (
    `rating` between 0 and 5
  ),
  `brands` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`brands`)),
  `additional_contacts` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`additional_contacts`)),
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `supplier_id` UUID NOT NULL,
  PRIMARY KEY (`supplier_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--
-- Table: phone_specs (product catalog)
--
DROP TABLE IF EXISTS `phone_specs`;
CREATE TABLE `phone_specs` (
  `product_id` UUID NOT NULL,
  `device_type` varchar(50) DEFAULT 'smartphone',
  `device_name` varchar(255) NOT NULL,
  `device_maker` varchar(255) DEFAULT NULL,
  `device_price` decimal(15, 2) DEFAULT 0.00,
  `color` varchar(100) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `processor` varchar(255) DEFAULT NULL,
  `ram` varchar(50) DEFAULT NULL,
  `rom` varchar(50) DEFAULT NULL,
  `display_size` decimal(5, 2) DEFAULT NULL,
  `resolution` varchar(50) DEFAULT NULL,
  `refresh_rate` varchar(50) DEFAULT NULL,
  `battery_capacity` varchar(50) DEFAULT NULL,
  `fast_charging` varchar(50) DEFAULT NULL,
  `rear_camera_main` varchar(100) DEFAULT NULL,
  `front_camera` varchar(100) DEFAULT NULL,
  `operating_system` varchar(100) DEFAULT NULL,
  `water_and_dust_rating` varchar(50) DEFAULT NULL,
  `nfc` varchar(50) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 12,
  `warranty_type` varchar(50) DEFAULT 'MANUFACTURER',
  `inv_staging_inventory` int(11) DEFAULT 0,
  `inv_reorder_point` int(11) DEFAULT 0,
  `inv_reorder_quantity` int(11) DEFAULT 0,
  `inv_lead_time_days` int(11) DEFAULT 7,
  `inv_safety_stock` int(11) DEFAULT 0,
  `inv_avg_daily_usage` int(11) DEFAULT 0,
  `default_supplier_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `is_discontinued` tinyint(1) DEFAULT 0,
  `launch_date` datetime DEFAULT NULL,
  `end_of_life_date` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`product_id`),
  KEY `idx_maker_name` (`device_maker`, `device_name`),
  KEY `idx_type_active` (`device_type`, `is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--
-- Table: warehouses
--
DROP TABLE IF EXISTS `warehouses`;
CREATE TABLE `warehouses` (
  `warehouse_id` UUID NOT NULL,
  `warehouse_uuid` varchar(36) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_manager` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`warehouse_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--
-- Table: products (unified product catalog)
--
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `product_id` UUID NOT NULL,
  `product_type` varchar(50) NOT NULL DEFAULT 'PHONE',
  `sku` varchar(100) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `subcategory` varchar(100) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `base_price` decimal(10, 2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `specifications` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`specifications`)),
  `requires_serial_tracking` tinyint(1) DEFAULT 0,
  `serial_format` varchar(50) DEFAULT NULL,
  `default_supplier_id` int(11) DEFAULT NULL,
  `reorder_point` int(11) DEFAULT 0,
  `reorder_quantity` int(11) DEFAULT 0,
  `lead_time_days` int(11) DEFAULT 7,
  `safety_stock` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `is_discontinued` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `idx_product_type` (`product_type`),
  KEY `idx_category` (`category`),
  KEY `idx_brand` (`brand`),
  KEY `idx_sku` (`sku`),
  KEY `idx_supplier` (`default_supplier_id`),
  KEY `idx_products_active` (`is_active`, `product_type`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--
-- Table: spare_parts
--
DROP TABLE IF EXISTS `spare_parts`;
CREATE TABLE `spare_parts` (
  `part_code` varchar(255) NOT NULL,
  `part_name` varchar(255) NOT NULL,
  `part_category` varchar(100) NOT NULL,
  `part_type` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `compatible_product_id` UUID DEFAULT NULL,
  `compatible_device_category` varchar(100) DEFAULT NULL,
  `compatible_brands` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`compatible_brands`)),
  `compatible_models` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`compatible_models`)),
  `dimensions` varchar(100) DEFAULT NULL,
  `weight_g` decimal(10, 2) DEFAULT NULL,
  `color_variants` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`color_variants`)),
  `quality_grade` varchar(50) DEFAULT 'STANDARD',
  `warranty_months` int(11) DEFAULT 3,
  `manufacturer` varchar(255) DEFAULT NULL,
  `manufacturer_part_number` varchar(255) DEFAULT NULL,
  `default_supplier_id` int(11) DEFAULT NULL,
  `unit_cost` decimal(15, 2) DEFAULT 0.00,
  `unit_price` decimal(15, 2) DEFAULT 0.00,
  `currency` varchar(10) DEFAULT 'USD',
  `min_stock_level` int(11) DEFAULT 5,
  `max_stock_level` int(11) DEFAULT 50,
  `reorder_point` int(11) DEFAULT 10,
  `reorder_quantity` int(11) DEFAULT 20,
  `lead_time_days` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `is_hazardous` tinyint(1) DEFAULT 0,
  `requires_serial_tracking` tinyint(1) DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `spare_part_id` UUID NOT NULL,
  PRIMARY KEY (`spare_part_id`),
  UNIQUE KEY `part_code` (`part_code`),
  KEY `idx_part_code` (`part_code`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--
-- Table: smartphone_spare_parts
--
DROP TABLE IF EXISTS `smartphone_spare_parts`;
CREATE TABLE `smartphone_spare_parts` (
  `spare_part_uuid` UUID NOT NULL,
  `part_code` varchar(50) NOT NULL COMMENT 'Unique part code (e.g., DISP-IP15-BLK)',
  `part_name` varchar(255) NOT NULL COMMENT 'Display name (e.g., iPhone 15 Display)',
  `part_category` varchar(50) NOT NULL,
  `part_type` varchar(100) DEFAULT NULL COMMENT 'Specific type (e.g., OLED, LCD, Li-ion)',
  `description` text DEFAULT NULL COMMENT 'Detailed description',
  `compatible_product_id` UUID DEFAULT NULL,
  `compatible_device_category` varchar(100) DEFAULT NULL COMMENT 'Device category (phone, tablet, etc)',
  `compatible_brands` text DEFAULT NULL COMMENT 'JSON array of compatible brands',
  `compatible_models` text DEFAULT NULL COMMENT 'JSON array of compatible models',
  `dimensions` varchar(100) DEFAULT NULL COMMENT 'Length x Width x Height',
  `weight_g` decimal(6, 2) DEFAULT NULL COMMENT 'Weight in grams',
  `color_variants` text DEFAULT NULL COMMENT 'JSON array of available colors',
  `quality_grade` varchar(50) DEFAULT 'STANDARD' COMMENT 'Quality tier',
  `warranty_months` int(11) DEFAULT 3 COMMENT 'Warranty period in months',
  `manufacturer` varchar(255) DEFAULT NULL,
  `manufacturer_part_number` varchar(100) DEFAULT NULL COMMENT 'OEM part number',
  `unit_cost` decimal(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Cost per unit',
  `unit_price` decimal(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Selling price per unit',
  `currency` varchar(10) DEFAULT 'USD',
  `default_supplier_id` int(11) DEFAULT NULL COMMENT 'Primary supplier',
  `lead_time_days` int(11) DEFAULT NULL COMMENT 'Average lead time',
  `minimum_stock_level` int(11) DEFAULT 5,
  `max_stock_level` int(11) DEFAULT 50 COMMENT 'Maximum stock level',
  `reorder_point` int(11) DEFAULT 10 COMMENT 'Reorder trigger point',
  `reorder_quantity` int(11) DEFAULT 20 COMMENT 'Standard reorder quantity',
  `is_active` tinyint(1) DEFAULT 1,
  `is_hazardous` tinyint(1) DEFAULT 0 COMMENT 'Requires special handling (e.g., batteries)',
  `requires_serial_tracking` tinyint(1) DEFAULT 0 COMMENT 'Track individual units',
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`spare_part_uuid`),
  UNIQUE KEY `unique_part_code` (`part_code`),
  KEY `idx_part_category` (`part_category`),
  KEY `idx_supplier` (`default_supplier_id`),
  KEY `idx_quality_grade` (`quality_grade`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_manufacturer` (`manufacturer`),
  KEY `idx_spare_parts_category_grade` (`part_category`, `quality_grade`),
  KEY `idx_spare_parts_active_supplier` (`is_active`, `default_supplier_id`),
  KEY `idx_device_category` (`compatible_device_category`),
  KEY `idx_compatible_product` (`compatible_product_id`),
  CONSTRAINT `fk_spare_part_to_device` FOREIGN KEY (`compatible_product_id`) REFERENCES `phone_specs` (`product_id`) ON DELETE
  SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Catalog of smartphone spare parts with compatibility and pricing information';
--
-- Table: invoices
--
DROP TABLE IF EXISTS `invoices`;
CREATE TABLE `invoices` (
  `uuid` UUID DEFAULT uuid(),
  `invoice_number` varchar(100) NOT NULL,
  `pattern_number` varchar(50) DEFAULT NULL,
  `serial_number` varchar(50) DEFAULT NULL,
  `supplier_id` UUID DEFAULT NULL,
  `status` varchar(50) DEFAULT 'draft',
  `verification_status` varchar(50) DEFAULT 'PENDING',
  `invoice_date` datetime DEFAULT NULL,
  `due_date` datetime DEFAULT NULL,
  `imported_at` datetime DEFAULT NULL,
  `subtotal` decimal(15, 2) DEFAULT 0.00,
  `tax_rate` decimal(5, 2) DEFAULT 10.00,
  `tax_amount` decimal(15, 2) DEFAULT 0.00,
  `shipping_fee` decimal(15, 2) DEFAULT 0.00,
  `discount_amount` decimal(15, 2) DEFAULT 0.00,
  `total_amount` decimal(15, 2) DEFAULT 0.00,
  `currency` varchar(10) DEFAULT 'VND',
  `payment_method` varchar(50) DEFAULT 'TM/CK',
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `id` UUID NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  UNIQUE KEY `uuid` (`uuid`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================
-- LEVEL 1 DEPENDENCIES (depend on independent tables)
-- ============================================================
--
-- Table: warehouse_zones (depends on warehouses)
--
DROP TABLE IF EXISTS `warehouse_zones`;
CREATE TABLE `warehouse_zones` (
  `warehouse_id` UUID NOT NULL,
  `zone_id` int(11) NOT NULL,
  `zone_uuid` UUID DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `zone_type` varchar(50) DEFAULT 'storage',
  `bin_prefix` varchar(50) DEFAULT NULL,
  `max_bins` int(11) DEFAULT NULL,
  `require_bins` tinyint(1) DEFAULT 0,
  `default_bin_type` varchar(50) DEFAULT NULL,
  `bin_layout` varchar(50) DEFAULT NULL,
  `capacity_limit` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `id` UUID NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_zone` (`warehouse_id`, `zone_id`),
  CONSTRAINT `warehouse_zones_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--
-- Table: invoice_items (depends on invoices)
--
DROP TABLE IF EXISTS `invoice_items`;
CREATE TABLE `invoice_items` (
  `product_id` UUID DEFAULT NULL,
  `spare_part_id` int(11) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `product_uuid` UUID DEFAULT NULL,
  `description` text DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `unit_name` varchar(50) DEFAULT NULL,
  `quantity` int(11) DEFAULT 1,
  `unit_price` decimal(15, 2) DEFAULT 0.00,
  `total_price` decimal(15, 2) DEFAULT NULL,
  `tax_rate` decimal(5, 2) DEFAULT 10.00,
  `tax_amount` decimal(15, 2) DEFAULT NULL,
  `discount_rate` decimal(5, 2) DEFAULT 0.00,
  `discount_amount` decimal(15, 2) DEFAULT NULL,
  `total_amount` decimal(15, 2) DEFAULT NULL,
  `invoice_id` UUID DEFAULT NULL,
  `id` UUID NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--
-- Table: repair_jobs (depends on nothing directly, warehouses FK removed for simplicity)
--
DROP TABLE IF EXISTS `repair_jobs`;
CREATE TABLE `repair_jobs` (
  `job_number` varchar(100) NOT NULL,
  `product_id` UUID DEFAULT NULL,
  `device_name` varchar(255) DEFAULT NULL,
  `device_serial_number` varchar(100) DEFAULT NULL,
  `device_imei` varchar(100) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(50) DEFAULT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `customer_address` text DEFAULT NULL,
  `issue_description` text DEFAULT NULL,
  `diagnosis` text DEFAULT NULL,
  `repair_notes` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'PENDING',
  `priority` varchar(50) DEFAULT 'NORMAL',
  `assigned_technician` varchar(255) DEFAULT NULL,
  `assigned_at` datetime DEFAULT NULL,
  `warehouse_id` UUID DEFAULT NULL,
  `received_date` datetime DEFAULT current_timestamp(),
  `estimated_completion_date` datetime DEFAULT NULL,
  `completion_date` datetime DEFAULT NULL,
  `delivered_date` datetime DEFAULT NULL,
  `cost_estimated` decimal(15, 2) DEFAULT 0.00,
  `cost_parts` decimal(15, 2) DEFAULT 0.00,
  `cost_labor` decimal(15, 2) DEFAULT 0.00,
  `cost_final` decimal(15, 2) DEFAULT 0.00,
  `cost_customer_charge` decimal(15, 2) DEFAULT 0.00,
  `currency` varchar(10) DEFAULT 'USD',
  `tested_by` varchar(255) DEFAULT NULL,
  `test_results` text DEFAULT NULL,
  `quality_check_passed` tinyint(1) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 3,
  `warranty_expires_at` datetime DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `repair_job_id` UUID NOT NULL,
  PRIMARY KEY (`repair_job_id`),
  UNIQUE KEY `job_number` (`job_number`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--
-- Table: repair_job_attachments (depends on repair_jobs conceptually)
--
DROP TABLE IF EXISTS `repair_job_attachments`;
CREATE TABLE `repair_job_attachments` (
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` varchar(50) DEFAULT 'IMAGE',
  `file_size_kb` int(11) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `attachment_category` varchar(50) DEFAULT 'OTHER',
  `description` text DEFAULT NULL,
  `uploaded_by` varchar(100) DEFAULT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp(),
  `attachment_id` UUID NOT NULL,
  `repair_job_id` UUID DEFAULT NULL,
  PRIMARY KEY (`attachment_id`),
  KEY `idx_category` (`attachment_category`),
  KEY `idx_file_type` (`file_type`),
  KEY `idx_uploaded_at` (`uploaded_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'File attachments for repair jobs (photos, documents, etc.)';
--
-- Table: repair_job_parts (depends on repair_jobs conceptually)
--
DROP TABLE IF EXISTS `repair_job_parts`;
CREATE TABLE `repair_job_parts` (
  `spare_part_id` int(11) NOT NULL,
  `inventory_id` bigint(20) DEFAULT NULL,
  `quantity_used` int(11) DEFAULT 1,
  `unit_cost` decimal(15, 2) DEFAULT 0.00,
  `total_cost` decimal(15, 2) DEFAULT NULL,
  `installed_date` datetime DEFAULT current_timestamp(),
  `installed_by` varchar(255) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `repair_job_id` UUID DEFAULT NULL,
  `id` UUID NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--
-- Table: transactions
--
DROP TABLE IF EXISTS `transactions`;
CREATE TABLE `transactions` (
  `transaction_group_id` varchar(100) NOT NULL,
  `receipt_id` varchar(100) DEFAULT NULL,
  `transaction_type` varchar(50) NOT NULL,
  `transaction_date` datetime DEFAULT current_timestamp(),
  `warehouse_id` UUID DEFAULT NULL,
  `from_warehouse_id` UUID DEFAULT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `bin_id` UUID DEFAULT NULL,
  `subtotal` decimal(15, 2) DEFAULT 0.00,
  `tax_amount` decimal(15, 2) DEFAULT 0.00,
  `total_amount` decimal(15, 2) DEFAULT 0.00,
  `shipping_fee` decimal(15, 2) DEFAULT 0.00,
  `discount_amount` decimal(15, 2) DEFAULT 0.00,
  `supplier_id` UUID DEFAULT NULL,
  `invoice_id` int(11) DEFAULT NULL,
  `po_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `external_doc_no` varchar(100) DEFAULT NULL,
  `document_reference` varchar(255) DEFAULT NULL,
  `customer` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`customer`)),
  `delivery_person` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `internal_notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `id` UUID NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_date_type` (`transaction_date`, `transaction_type`),
  KEY `idx_group` (`transaction_group_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--
-- Table: transaction_items
--
DROP TABLE IF EXISTS `transaction_items`;
CREATE TABLE `transaction_items` (
  `transaction_group_id` varchar(100) DEFAULT NULL,
  `product_id` UUID DEFAULT NULL,
  `spare_part_id` int(11) DEFAULT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `asset_id` int(11) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `quantity_changed` int(11) DEFAULT 0,
  `condition_status` varchar(50) DEFAULT 'NEW',
  `unit_cost` decimal(15, 2) DEFAULT 0.00,
  `total_value` decimal(15, 2) DEFAULT 0.00,
  `from_warehouse_id` UUID DEFAULT NULL,
  `from_zone_id` int(11) DEFAULT NULL,
  `from_bin_id` UUID DEFAULT NULL,
  `to_warehouse_id` UUID DEFAULT NULL,
  `to_zone_id` int(11) DEFAULT NULL,
  `to_bin_id` UUID DEFAULT NULL,
  `new_inventory_level` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `transaction_id` UUID DEFAULT NULL,
  `id` UUID NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--
-- Table: rmas (RMA headers)
--
DROP TABLE IF EXISTS `rmas`;
CREATE TABLE `rmas` (
  `rma_id` UUID DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(50) DEFAULT NULL,
  `original_receipt_id` varchar(100) DEFAULT NULL,
  `original_transaction_date` datetime DEFAULT NULL,
  `reason_code` varchar(50) DEFAULT NULL,
  `reason_description` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `priority` varchar(50) DEFAULT 'medium',
  `warehouse_id` UUID DEFAULT NULL,
  `quarantine_zone_id` int(11) DEFAULT NULL,
  `requested_by` int(11) DEFAULT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `expected_return_date` datetime DEFAULT NULL,
  `actual_return_date` datetime DEFAULT NULL,
  `inspection_date` datetime DEFAULT NULL,
  `completion_date` datetime DEFAULT NULL,
  `total_value` decimal(15, 2) DEFAULT 0.00,
  `refund_amount` decimal(15, 2) DEFAULT 0.00,
  `restocking_fee` decimal(15, 2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `internal_notes` text DEFAULT NULL,
  `status_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`status_history`)),
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attachments`)),
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `id` UUID NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rma_id` (`rma_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--
-- Table: rma_items (RMA line items)
--
DROP TABLE IF EXISTS `rma_items`;
CREATE TABLE `rma_items` (
  `product_id` UUID DEFAULT NULL,
  `spare_part_id` int(11) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `quantity` int(11) DEFAULT 1,
  `condition_detail` varchar(100) DEFAULT NULL,
  `disposition` varchar(50) DEFAULT NULL,
  `unit_value` decimal(15, 2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `rma_table_id` UUID DEFAULT NULL,
  `repair_job_id` UUID DEFAULT NULL,
  `id` UUID NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--
-- Table: stocktakes (depends on warehouses)
--
DROP TABLE IF EXISTS `stocktakes`;
CREATE TABLE `stocktakes` (
  `stocktake_uuid` UUID DEFAULT NULL,
  `stocktake_number` varchar(50) NOT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `count_type` varchar(50) DEFAULT 'full',
  `status` varchar(50) DEFAULT 'PLANNED',
  `initiated_by` int(11) NOT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `scheduled_for` datetime DEFAULT NULL,
  `is_recurring` tinyint(1) DEFAULT 0,
  `recurrence_rule` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `warehouse_id` UUID DEFAULT NULL,
  `stocktake_id` UUID NOT NULL,
  PRIMARY KEY (`stocktake_id`),
  UNIQUE KEY `stocktake_number` (`stocktake_number`),
  UNIQUE KEY `stocktake_uuid` (`stocktake_uuid`),
  KEY `idx_zone` (`zone_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at`),
  KEY `idx_stocktakes_scheduled` (`scheduled_for`, `status`),
  KEY `idx_stocktakes_count_type` (`count_type`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_stocktakes_uuid` (`stocktake_uuid`),
  CONSTRAINT `stocktakes_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--
-- Table: stocktake_items (depends on phone_specs)
--
DROP TABLE IF EXISTS `stocktake_items`;
CREATE TABLE `stocktake_items` (
  `product_id` UUID DEFAULT NULL,
  `bin_location` varchar(50) DEFAULT NULL,
  `system_quantity` decimal(10, 2) NOT NULL DEFAULT 0.00,
  `counted_quantity` decimal(10, 2) DEFAULT NULL,
  `variance` decimal(10, 2) DEFAULT NULL,
  `variance_pct` decimal(5, 2) DEFAULT NULL,
  `adjustment_applied` tinyint(1) DEFAULT 0,
  `adjustment_receipt_id` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `counted_at` datetime DEFAULT NULL,
  `counted_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `stocktake_id` UUID DEFAULT NULL,
  `id` UUID NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_adjustment_receipt` (`adjustment_receipt_id`),
  KEY `idx_variance` (`variance`),
  KEY `idx_product` (`product_id`),
  CONSTRAINT `stocktake_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `phone_specs` (`product_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--
-- Table: stocktake_status_history
--
DROP TABLE IF EXISTS `stocktake_status_history`;
CREATE TABLE `stocktake_status_history` (
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) NOT NULL,
  `changed_by` int(11) NOT NULL,
  `changed_at` timestamp NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL,
  `stocktake_id` UUID DEFAULT NULL,
  `id` UUID NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_changed_at` (`changed_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- ============================================================
-- LEVEL 2 DEPENDENCIES (depend on level 1)
-- ============================================================
--
-- Table: warehouse_bins (depends on warehouses, warehouse_zones)
--
DROP TABLE IF EXISTS `warehouse_bins`;
CREATE TABLE `warehouse_bins` (
  `warehouse_id` UUID NOT NULL,
  `zone_id` int(11) NOT NULL,
  `bin_id` UUID NOT NULL,
  `bin_code` varchar(100) NOT NULL,
  `bin_type` varchar(50) DEFAULT 'standard',
  `product_type` varchar(50) DEFAULT NULL,
  `row_position` varchar(50) DEFAULT NULL,
  `column_position` varchar(50) DEFAULT NULL,
  `bin_position` varchar(50) DEFAULT NULL,
  `hierarchical_code` varchar(100) DEFAULT NULL,
  `aisle` varchar(50) DEFAULT NULL,
  `rack` varchar(50) DEFAULT NULL,
  `shelf` varchar(50) DEFAULT NULL,
  `max_capacity` int(11) DEFAULT NULL,
  `weight_capacity` decimal(10, 2) DEFAULT NULL,
  `height_cm` decimal(10, 2) DEFAULT NULL,
  `width_cm` decimal(10, 2) DEFAULT NULL,
  `depth_cm` decimal(10, 2) DEFAULT NULL,
  `temperature_controlled` tinyint(1) DEFAULT 0,
  `temperature_min` decimal(5, 2) DEFAULT NULL,
  `temperature_max` decimal(5, 2) DEFAULT NULL,
  `priority_level` varchar(50) DEFAULT 'normal',
  `accessibility_level` varchar(50) DEFAULT 'easy',
  `is_active` tinyint(1) DEFAULT 1,
  `notes` text DEFAULT NULL,
  `id` UUID NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bin_id` (`bin_id`),
  KEY `warehouse_id` (`warehouse_id`, `zone_id`),
  KEY `idx_bin_code` (`bin_code`),
  CONSTRAINT `warehouse_bins_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE CASCADE,
  CONSTRAINT `warehouse_bins_ibfk_2` FOREIGN KEY (`warehouse_id`, `zone_id`) REFERENCES `warehouse_zones` (`warehouse_id`, `zone_id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- ============================================================
-- LEVEL 3 DEPENDENCIES (depend on level 2)
-- ============================================================
--
-- Table: inventory (depends on phone_specs, warehouses, warehouse_bins)
--
DROP TABLE IF EXISTS `inventory`;


CREATE TABLE `inventory` (
  `inventory_type` varchar(50) NOT NULL,
  `product_id` UUID DEFAULT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `batch_no` varchar(100) DEFAULT NULL,
  `warehouse_id` UUID NOT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `bin_id` UUID DEFAULT NULL,
  `quantity` int(11) DEFAULT 0,
  `reserved_quantity` int(11) DEFAULT 0,
  `min_stock_level` int(11) DEFAULT 0,
  `condition_status` varchar(50) DEFAULT 'NEW',
  `serial_number` varchar(100) DEFAULT NULL,
  `imei_1` varchar(100) DEFAULT NULL,
  `imei_2` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'available',
  `condition_grade` varchar(10) DEFAULT 'A',
  `quantity_on_hand` int(11) DEFAULT 0,
  `quantity_reserved` int(11) DEFAULT 0,
  `quantity_defective` int(11) DEFAULT 0,
  `quantity_in_transit` int(11) DEFAULT 0,
  `manufacture_date` datetime DEFAULT NULL,
  `expiry_date` datetime DEFAULT NULL,
  `supplier_id` UUID DEFAULT NULL,
  `import_invoice_id` UUID DEFAULT NULL,
  `last_counted_at` datetime DEFAULT NULL,
  `last_counted_by` varchar(255) DEFAULT NULL,
  `last_movement_at` datetime DEFAULT NULL,
  `last_movement_type` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `id` UUID NOT NULL,
  `spare_part_id` UUID DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `bin_id` (`bin_id`),
  KEY `idx_type_loc` (`inventory_type`, `warehouse_id`),
  KEY `idx_serial` (`serial_number`),
  KEY `idx_imei` (`imei_1`),
  CONSTRAINT `inventory_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `phone_specs` (`product_id`),
  CONSTRAINT `inventory_ibfk_3` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`),
  CONSTRAINT `inventory_ibfk_4` FOREIGN KEY (`bin_id`) REFERENCES `warehouse_bins` (`bin_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--
-- Table: product_inventory (bin-level inventory, depends on products, warehouses)
--
DROP TABLE IF EXISTS `product_inventory`;
CREATE TABLE `product_inventory` (
  `product_id` UUID NOT NULL,
  `serial_number` varchar(255) DEFAULT NULL,
  `batch_number` varchar(100) DEFAULT NULL,
  `warehouse_id` UUID DEFAULT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `bin_id` UUID DEFAULT NULL,
  `quantity_on_hand` int(11) DEFAULT 0,
  `quantity_reserved` int(11) DEFAULT 0,
  `quantity_defective` int(11) DEFAULT 0,
  `quantity_in_transit` int(11) DEFAULT 0,
  `status` varchar(50) DEFAULT 'AVAILABLE',
  `condition_status` varchar(50) DEFAULT 'NEW',
  `purchase_cost` decimal(10, 2) DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `manufacture_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `warranty_expiry` date DEFAULT NULL,
  `last_counted_at` datetime DEFAULT NULL,
  `last_counted_by` varchar(100) DEFAULT NULL,
  `last_movement_at` datetime DEFAULT NULL,
  `last_movement_type` varchar(50) DEFAULT NULL,
  `condition_notes` text DEFAULT NULL,
  `location_notes` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `inventory_id` UUID NOT NULL,
  PRIMARY KEY (`inventory_id`),
  UNIQUE KEY `unique_serial` (`product_id`, `serial_number`),
  UNIQUE KEY `unique_batch_location` (
    `product_id`,
    `batch_number`,
    `warehouse_id`,
    `zone_id`,
    `bin_id`
  ),
  KEY `idx_product` (`product_id`),
  KEY `idx_serial` (`serial_number`),
  KEY `idx_batch` (`batch_number`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_zone` (`zone_id`),
  KEY `idx_bin` (`bin_id`),
  KEY `idx_status` (`status`),
  KEY `idx_condition` (`condition_status`),
  KEY `idx_expiry` (`expiry_date`),
  KEY `idx_warranty` (`warranty_expiry`),
  KEY `idx_inventory_location` (`warehouse_id`, `zone_id`, `bin_id`),
  KEY `idx_inventory_status` (`status`, `condition_status`),
  CONSTRAINT `product_inventory_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `product_inventory_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE
  SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */
;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */
;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */
;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */
;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */
;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */
;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */
;



-- ============================================================
-- PC COMPONENTS MIGRATED TABLES (with pc_ prefix)
-- ============================================================

/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-12.3.2-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: master_db (migrated pc_components)
-- ------------------------------------------------------
-- Server version	12.3.2-MariaDB-deb13

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `pc_builds`
--

DROP TABLE IF EXISTS `pc_builds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pc_builds` (
  `build_id` UUID NOT NULL,
  `name` varchar(255) NOT NULL,
  `user_id` UUID DEFAULT NULL,
  `description` text DEFAULT NULL,
  `build_purpose` varchar(50) DEFAULT NULL COMMENT 'Gaming, Workstation, Office, HTPC, NAS',
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'User tags for categorization' CHECK (json_valid(`tags`)),
  `cpu_id` UUID DEFAULT NULL,
  `motherboard_id` UUID DEFAULT NULL,
  `gpu_id` UUID DEFAULT NULL,
  `psu_id` UUID DEFAULT NULL,
  `case_id` UUID DEFAULT NULL,
  `cooler_id` UUID DEFAULT NULL,
  `total_tdp_watts` int(11) DEFAULT NULL,
  `estimated_price` decimal(10,2) DEFAULT NULL,
  `total_price` decimal(10,2) DEFAULT NULL COMMENT 'Sum of all component prices',
  `currency` varchar(10) DEFAULT 'VND',
  `image_url` varchar(500) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT 0,
  `status` varchar(20) DEFAULT 'draft' COMMENT 'draft, complete, ordered',
  `compatibility_status` varchar(30) DEFAULT 'unchecked' COMMENT 'unchecked, compatible, warnings, incompatible',
  `compatibility_issues` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of compatibility problems found' CHECK (json_valid(`compatibility_issues`)),
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`build_id`),
  KEY `idx_build_user` (`user_id`),
  KEY `idx_build_status` (`status`),
  KEY `idx_build_created` (`created_at`),
  KEY `idx_build_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pc_builds`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pc_builds` WRITE;
/*!40000 ALTER TABLE `pc_builds` DISABLE KEYS */;
/*!40000 ALTER TABLE `pc_builds` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pc_build_components`
--

DROP TABLE IF EXISTS `pc_build_components`;
CREATE TABLE `pc_build_components` (
  `build_id` UUID NOT NULL,
  `product_id` UUID NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `component_type` varchar(50) NOT NULL COMMENT 'ram, storage, fan, expansion, monitor, cable, peripheral',
  PRIMARY KEY (`build_id`, `product_id`, `component_type`),
  KEY `idx_build_comp_product` (`product_id`),
  CONSTRAINT `fk_build_components_build` FOREIGN KEY (`build_id`) REFERENCES `pc_builds` (`build_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_build_components_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


--
-- Table structure for table `pc_cables_specs`
--

DROP TABLE IF EXISTS `pc_cables_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pc_cables_specs` (
  `product_id` UUID NOT NULL,
  `cable_id` UUID NOT NULL,
  `cable_category` varchar(20) NOT NULL COMMENT 'Power, Data, Display',
  `cable_type` varchar(30) NOT NULL COMMENT 'SATA, PCIe, HDMI, DP, USB',
  `connector_end_a` varchar(50) DEFAULT NULL,
  `connector_end_b` varchar(50) DEFAULT NULL,
  `length_m` decimal(4,2) DEFAULT NULL,
  `bandwidth` varchar(30) DEFAULT NULL COMMENT 'e.g., 48Gbps for HDMI 2.1',
  `version` varchar(20) DEFAULT NULL COMMENT 'HDMI 2.1, DP 1.4, USB 3.2 Gen2',
  `gauge` varchar(10) DEFAULT NULL COMMENT 'AWG rating for power cables',
  `certification` varchar(50) DEFAULT NULL COMMENT 'VESA Certified, HDMI Premium Certified',
  `max_resolution` varchar(30) DEFAULT NULL COMMENT 'For display cables: 4K@120Hz, 8K@60Hz',
  `sleeved` tinyint(1) DEFAULT 0,
  `color` varchar(30) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  PRIMARY KEY (`product_id`),
  KEY `idx_cable_category` (`cable_category`),
  KEY `idx_cable_type` (`cable_type`),
  CONSTRAINT `fk_cables_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pc_cables_specs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pc_cables_specs` WRITE;
/*!40000 ALTER TABLE `pc_cables_specs` DISABLE KEYS */;
/*!40000 ALTER TABLE `pc_cables_specs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pc_case_fans_specs`
--

DROP TABLE IF EXISTS `pc_case_fans_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pc_case_fans_specs` (
  `product_id` UUID NOT NULL,
  `fan_id` UUID NOT NULL,
  `size_mm` int(11) NOT NULL COMMENT '120, 140, etc.',
  `quantity_in_pack` int(11) DEFAULT 1,
  `rgb_type` varchar(20) DEFAULT NULL COMMENT 'ARGB 5V, RGB 12V, None',
  `connector_type` varchar(20) DEFAULT NULL COMMENT '4-pin PWM, 3-pin DC',
  `daisy_chain` tinyint(1) DEFAULT 0,
  `rpm_min` int(11) DEFAULT NULL,
  `rpm_max` int(11) DEFAULT NULL,
  `airflow_cfm` decimal(5,1) DEFAULT NULL,
  `static_pressure_mmh2o` decimal(4,2) DEFAULT NULL,
  `noise_dba` decimal(4,1) DEFAULT NULL,
  `bearing_type` varchar(50) DEFAULT NULL,
  `pwm` tinyint(1) DEFAULT 1,
  `blade_count` int(11) DEFAULT NULL,
  `anti_vibration` tinyint(1) DEFAULT 0,
  `fan_curve_profiles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Predefined fan curves from software' CHECK (json_valid(`fan_curve_profiles`)),
  `thickness_mm` decimal(4,1) DEFAULT 25.0,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  PRIMARY KEY (`product_id`),
  KEY `idx_fan_size` (`size_mm`),
  KEY `idx_fan_rgb` (`rgb_type`),
  CONSTRAINT `fk_case_fans_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pc_case_fans_specs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pc_case_fans_specs` WRITE;
/*!40000 ALTER TABLE `pc_case_fans_specs` DISABLE KEYS */;
/*!40000 ALTER TABLE `pc_case_fans_specs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pc_cpu_coolers_specs`
--

DROP TABLE IF EXISTS `pc_cpu_coolers_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pc_cpu_coolers_specs` (
  `product_id` UUID NOT NULL,
  `cooler_id` UUID NOT NULL,
  `type` varchar(10) NOT NULL COMMENT 'Air or AIO',
  `socket_compatibility` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`socket_compatibility`)),
  `tdp_rating_watts` int(11) DEFAULT NULL,
  `height_mm` int(11) DEFAULT NULL COMMENT 'Air coolers',
  `ram_clearance_mm` int(11) DEFAULT NULL COMMENT 'Max RAM height clearance',
  `radiator_size_mm` int(11) DEFAULT NULL COMMENT 'AIO: 120, 240, 280, 360',
  `rgb_type` varchar(20) DEFAULT NULL COMMENT 'ARGB 5V, RGB 12V, None',
  `rgb_daisy_chain` tinyint(1) DEFAULT 0,
  `air_width_mm` int(11) DEFAULT NULL,
  `air_depth_mm` int(11) DEFAULT NULL,
  `air_weight_g` int(11) DEFAULT NULL,
  `heatpipes` int(11) DEFAULT NULL,
  `fin_material` varchar(50) DEFAULT NULL,
  `base_material` varchar(50) DEFAULT NULL,
  `coldplate_material` varchar(30) DEFAULT NULL COMMENT 'Copper, Nickel-plated Copper',
  `radiator_thickness_mm` int(11) DEFAULT NULL,
  `tube_length_mm` int(11) DEFAULT NULL,
  `pump_type` varchar(50) DEFAULT NULL,
  `pump_rpm` int(11) DEFAULT NULL,
  `refillable` tinyint(1) DEFAULT 0,
  `fan_count` int(11) DEFAULT NULL,
  `fan_size_mm` int(11) DEFAULT NULL,
  `fan_rpm_min` int(11) DEFAULT NULL,
  `fan_rpm_max` int(11) DEFAULT NULL,
  `fan_airflow_cfm` decimal(5,1) DEFAULT NULL,
  `fan_static_pressure_mmh2o` decimal(4,2) DEFAULT NULL,
  `fan_noise_dba` decimal(4,1) DEFAULT NULL,
  `fan_bearing_type` varchar(50) DEFAULT NULL,
  `fan_pwm` tinyint(1) DEFAULT 1,
  `fan_rgb` tinyint(1) DEFAULT 0,
  `lcd_display` tinyint(1) DEFAULT 0,
  `software_control` varchar(100) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `warranty_includes_mounting` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`product_id`),
  KEY `idx_cooler_type` (`type`),
  KEY `idx_cooler_socket` (`socket_compatibility`(255)),
  CONSTRAINT `fk_cpu_coolers_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pc_cpu_coolers_specs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pc_cpu_coolers_specs` WRITE;
/*!40000 ALTER TABLE `pc_cpu_coolers_specs` DISABLE KEYS */;
/*!40000 ALTER TABLE `pc_cpu_coolers_specs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pc_cpu_specs`
--

DROP TABLE IF EXISTS `pc_cpu_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pc_cpu_specs` (
  `product_id` UUID NOT NULL,
  `socket` varchar(30) NOT NULL COMMENT 'AM5, LGA1700, LGA1200, AM4, LGA2066, TR4, sWRX8',
  `tdp` int(11) NOT NULL,
  `memory_type` varchar(20) NOT NULL,
  `integrated_graphics` tinyint(1) DEFAULT 0,
  `includes_cooler` tinyint(1) DEFAULT 0,
  `microarchitecture` varchar(100) DEFAULT NULL COMMENT 'Core microarch: Zen 4, Raptor Lake, Skylake, K7, NetBurst, Sandy Bridge',
  `family` varchar(50) DEFAULT NULL COMMENT 'Product family: Ryzen, Core, Pentium, Athlon, Xeon, Celeron, EPYC, Threadripper',
  `generation` varchar(20) DEFAULT NULL COMMENT 'Generation: 14th Gen, 7000 Series, etc.',
  `series` varchar(30) DEFAULT NULL COMMENT 'Tier: i9, i7, i5, i3, Ryzen 9, Ryzen 7, etc.',
  `codename` varchar(50) DEFAULT NULL COMMENT 'Die codename: Raphael, Meteor Lake, Vermeer, Prescott, Barton',
  `isa` varchar(20) DEFAULT 'x86-64' COMMENT 'ISA: x86, x86-64, ARM, RISC-V',
  `design_type` varchar(20) DEFAULT 'monolithic' COMMENT 'monolithic, chiplet, hybrid, MCM',
  `hybrid_architecture` tinyint(1) DEFAULT 0 COMMENT 'TRUE for P-core/E-core hybrid designs',
  `p_core_arch` varchar(50) DEFAULT NULL COMMENT 'Performance core arch: Raptor Cove, Golden Cove',
  `e_core_arch` varchar(50) DEFAULT NULL COMMENT 'Efficiency core arch: Gracemont, Crestmont',
  `p_core_base_ghz` decimal(5,2) DEFAULT NULL COMMENT 'P-core base clock',
  `p_core_boost_ghz` decimal(5,2) DEFAULT NULL COMMENT 'P-core max boost clock',
  `e_core_base_ghz` decimal(5,2) DEFAULT NULL COMMENT 'E-core base clock',
  `e_core_boost_ghz` decimal(5,2) DEFAULT NULL COMMENT 'E-core max boost clock',
  `vcache` tinyint(1) DEFAULT 0 COMMENT 'Has 3D V-Cache or similar stacked cache',
  `vcache_size_mb` int(11) DEFAULT NULL COMMENT 'Extra stacked cache size in MB',
  `die_count` int(11) DEFAULT 1 COMMENT 'Number of dies: 1 for monolithic, 2+ for chiplet/MCM',
  `ccd_count` int(11) DEFAULT NULL COMMENT 'Core Complex Die count (AMD chiplet)',
  `iod_type` varchar(30) DEFAULT NULL COMMENT 'I/O Die type: separate IOD, integrated, none',
  `instruction_extensions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'SSE, SSE2, SSE4.1, AVX, AVX2, AVX-512, AMX, MMX, 3DNow!' CHECK (json_valid(`instruction_extensions`)),
  `unlocked_multiplier` tinyint(1) DEFAULT 0 COMMENT 'K/X/unlocked SKU',
  `max_overclock_temp_c` int(11) DEFAULT NULL COMMENT 'Tjunction max temperature',
  `lithography` varchar(20) DEFAULT NULL,
  `process_node_manufacturer` varchar(30) DEFAULT NULL COMMENT 'Fab: TSMC, Intel, Samsung, GlobalFoundries',
  `cores_performance` int(11) DEFAULT NULL,
  `cores_efficiency` int(11) DEFAULT NULL,
  `cores_total` int(11) DEFAULT NULL,
  `threads` int(11) DEFAULT NULL,
  `base_clock_ghz` decimal(5,2) DEFAULT NULL,
  `boost_clock_ghz` decimal(5,2) DEFAULT NULL,
  `cache_l2_mb` decimal(5,1) DEFAULT NULL,
  `cache_l3_mb` decimal(5,1) DEFAULT NULL,
  `max_tdp_watts` int(11) DEFAULT NULL,
  `igpu_name` varchar(100) DEFAULT NULL,
  `igpu_execution_units` int(11) DEFAULT NULL,
  `igpu_max_frequency_mhz` int(11) DEFAULT NULL,
  `max_memory_speed_mhz` int(11) DEFAULT NULL,
  `max_memory_capacity_gb` int(11) DEFAULT NULL,
  `memory_channels` int(11) DEFAULT NULL,
  `ecc_support` tinyint(1) DEFAULT 0,
  `pcie_lanes_total` int(11) DEFAULT NULL,
  `pcie_version` varchar(10) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `launch_date` date DEFAULT NULL,
  PRIMARY KEY (`product_id`),
  KEY `idx_cpu_socket` (`socket`),
  KEY `idx_cpu_socket_memory` (`socket`,`memory_type`),
  KEY `idx_cpu_family` (`family`),
  KEY `idx_cpu_microarch` (`microarchitecture`),
  KEY `idx_cpu_generation` (`generation`),
  KEY `idx_cpu_design` (`design_type`),
  CONSTRAINT `fk_cpu_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pc_cpu_specs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pc_cpu_specs` WRITE;
/*!40000 ALTER TABLE `pc_cpu_specs` DISABLE KEYS */;
/*!40000 ALTER TABLE `pc_cpu_specs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pc_expansion_cards_specs`
--

DROP TABLE IF EXISTS `pc_expansion_cards_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pc_expansion_cards_specs` (
  `product_id` UUID NOT NULL,
  `expansion_card_id` UUID NOT NULL,
  `category` varchar(30) NOT NULL COMMENT 'Network, Storage, Sound, USB, Capture',
  `slot_type` varchar(20) NOT NULL COMMENT 'PCIe x1, x4, x8, x16',
  `pcie_version` varchar(10) DEFAULT NULL,
  `tdp_watts` int(11) DEFAULT NULL,
  `ethernet_speed` varchar(20) DEFAULT NULL,
  `wifi_standard` varchar(20) DEFAULT NULL,
  `bluetooth` varchar(10) DEFAULT NULL,
  `controller_type` varchar(100) DEFAULT NULL,
  `ports_count` int(11) DEFAULT NULL,
  `raid_levels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`raid_levels`)),
  `audio_channels` varchar(10) DEFAULT NULL,
  `audio_snr_db` int(11) DEFAULT NULL,
  `usb_ports` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`usb_ports`)),
  `capture_max_resolution` varchar(20) DEFAULT NULL,
  `capture_max_fps` int(11) DEFAULT NULL,
  `requires_external_power` tinyint(1) DEFAULT 0,
  `power_connector` varchar(30) DEFAULT NULL,
  `bracket_type` varchar(20) DEFAULT NULL,
  `length_mm` int(11) DEFAULT NULL COMMENT 'Physical card length',
  `slot_width` decimal(3,1) DEFAULT 1.0 COMMENT 'How many slots wide',
  `low_profile_available` tinyint(1) DEFAULT 0,
  `driver_support` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`driver_support`)),
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  PRIMARY KEY (`product_id`),
  KEY `idx_expcard_category` (`category`),
  KEY `idx_expcard_slot` (`slot_type`),
  CONSTRAINT `fk_expansion_cards_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pc_expansion_cards_specs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pc_expansion_cards_specs` WRITE;
/*!40000 ALTER TABLE `pc_expansion_cards_specs` DISABLE KEYS */;
/*!40000 ALTER TABLE `pc_expansion_cards_specs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pc_gpu_specs`
--

DROP TABLE IF EXISTS `pc_gpu_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pc_gpu_specs` (
  `product_id` UUID NOT NULL,
  `gpu_chipset` varchar(100) DEFAULT NULL,
  `gpu_chip_manufacturer` varchar(50) DEFAULT NULL,
  `length_mm` int(11) DEFAULT NULL,
  `slot_width` decimal(3,1) DEFAULT NULL,
  `slot_blocking_count` int(11) DEFAULT 2,
  `tdp` int(11) NOT NULL,
  `power_connectors` varchar(255) DEFAULT NULL COMMENT 'e.g., 2x 8-pin, 1x 16-pin 12VHPWR',
  `architecture` varchar(100) DEFAULT NULL,
  `cuda_cores` int(11) DEFAULT NULL,
  `stream_processors` int(11) DEFAULT NULL,
  `ray_tracing_cores` int(11) DEFAULT NULL,
  `tensor_cores` int(11) DEFAULT NULL,
  `base_clock_mhz` int(11) DEFAULT NULL,
  `boost_clock_mhz` int(11) DEFAULT NULL,
  `memory_clock_mhz` int(11) DEFAULT NULL,
  `memory_size_gb` int(11) DEFAULT NULL,
  `memory_type` varchar(20) DEFAULT NULL,
  `memory_bus_width_bit` int(11) DEFAULT NULL,
  `memory_bandwidth_gbps` decimal(8,1) DEFAULT NULL,
  `vram_ecc` tinyint(1) DEFAULT 0 COMMENT 'ECC VRAM for workstation cards',
  `recommended_psu_watts` int(11) DEFAULT NULL,
  `height_mm` decimal(6,1) DEFAULT NULL,
  `hdmi_version` varchar(10) DEFAULT NULL,
  `displayport_version` varchar(10) DEFAULT NULL,
  `outputs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`outputs`)),
  `ray_tracing` tinyint(1) DEFAULT 0,
  `dlss_version` varchar(10) DEFAULT NULL,
  `fsr_version` varchar(10) DEFAULT NULL,
  `cooling_type` varchar(50) DEFAULT NULL,
  `fan_count` int(11) DEFAULT NULL,
  `zero_rpm_mode` tinyint(1) DEFAULT 0,
  `multi_gpu_support` varchar(20) DEFAULT NULL COMMENT 'SLI, CrossFire, NVLink, None',
  `compute_capability` varchar(10) DEFAULT NULL COMMENT 'CUDA compute capability',
  `directx_version` varchar(10) DEFAULT NULL COMMENT 'DirectX 12 Ultimate, etc.',
  `opengl_version` varchar(10) DEFAULT NULL,
  `vulkan_version` varchar(10) DEFAULT NULL,
  `encode_engines` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'NVENC, AMD VCE/VCN generations' CHECK (json_valid(`encode_engines`)),
  `decode_engines` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'AV1 HW decode support' CHECK (json_valid(`decode_engines`)),
  `pcie_version` varchar(10) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `launch_date` date DEFAULT NULL,
  PRIMARY KEY (`product_id`),
  KEY `idx_gpu_manufacturer` (`gpu_chip_manufacturer`),
  KEY `idx_gpu_chipset` (`gpu_chip_manufacturer`,`gpu_chipset`),
  KEY `idx_gpu_length` (`length_mm`),
  KEY `idx_gpu_tdp` (`tdp`),
  CONSTRAINT `fk_gpu_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pc_gpu_specs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pc_gpu_specs` WRITE;
/*!40000 ALTER TABLE `pc_gpu_specs` DISABLE KEYS */;
/*!40000 ALTER TABLE `pc_gpu_specs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pc_headphones_specs`
--

DROP TABLE IF EXISTS `pc_headphones_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pc_headphones_specs` (
  `product_id` UUID NOT NULL,
  `headphone_id` UUID NOT NULL,
  `type` varchar(20) NOT NULL COMMENT 'Over-ear, On-ear, In-ear, Earbuds',
  `driver_type` varchar(30) DEFAULT NULL COMMENT 'Dynamic, Planar Magnetic, Electrostatic, BA',
  `driver_size_mm` decimal(5,1) DEFAULT NULL,
  `driver_count` int(11) DEFAULT 1 COMMENT 'Multiple drivers for IEMs',
  `crossover` varchar(30) DEFAULT NULL COMMENT 'For multi-driver IEMs',
  `frequency_response` varchar(30) DEFAULT NULL COMMENT '20Hz-20kHz etc.',
  `impedance_ohms` int(11) DEFAULT NULL,
  `sensitivity_db` decimal(5,1) DEFAULT NULL,
  `thd_percent` decimal(4,2) DEFAULT NULL COMMENT 'Total Harmonic Distortion',
  `connectivity` varchar(20) NOT NULL COMMENT 'Wired, Wireless, Both',
  `wireless_bluetooth_version` varchar(10) DEFAULT NULL,
  `wireless_bluetooth_codecs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'SBC, AAC, aptX, LDAC' CHECK (json_valid(`wireless_bluetooth_codecs`)),
  `wireless_battery_life_hours` int(11) DEFAULT NULL,
  `wireless_charging_type` varchar(20) DEFAULT NULL COMMENT 'USB-C, Lightning, Wireless',
  `dac_chip` varchar(50) DEFAULT NULL COMMENT 'Built-in DAC for USB/wireless',
  `active_noise_cancellation` tinyint(1) DEFAULT 0,
  `anc_levels` int(11) DEFAULT NULL COMMENT 'Number of ANC intensity levels',
  `transparency_mode` tinyint(1) DEFAULT 0,
  `wear_detection` tinyint(1) DEFAULT 0 COMMENT 'Auto-pause on removal',
  `open_back` tinyint(1) DEFAULT 0,
  `foldable` tinyint(1) DEFAULT 0,
  `detachable_cable` tinyint(1) DEFAULT 0,
  `cable_length_m` decimal(3,1) DEFAULT NULL,
  `cable_connector` varchar(20) DEFAULT NULL COMMENT '3.5mm, 6.35mm, USB-C, Lightning',
  `weight_g` decimal(5,1) DEFAULT NULL,
  `ear_pad_material` varchar(30) DEFAULT NULL COMMENT 'Leather, Velour, Memory Foam, Mesh',
  `replaceable_pads` tinyint(1) DEFAULT 1,
  `carrying_case` tinyint(1) DEFAULT 0,
  `headband_material` varchar(30) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `ip_rating` varchar(10) DEFAULT NULL,
  `multipoint` tinyint(1) DEFAULT 0,
  `spatial_audio` tinyint(1) DEFAULT 0,
  `app_support` varchar(100) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  PRIMARY KEY (`product_id`),
  KEY `idx_hp_type` (`type`),
  KEY `idx_hp_connectivity` (`connectivity`),
  CONSTRAINT `fk_headphones_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pc_headphones_specs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pc_headphones_specs` WRITE;
/*!40000 ALTER TABLE `pc_headphones_specs` DISABLE KEYS */;
/*!40000 ALTER TABLE `pc_headphones_specs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pc_headsets_specs`
--

DROP TABLE IF EXISTS `pc_headsets_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pc_headsets_specs` (
  `product_id` UUID NOT NULL,
  `headset_id` UUID NOT NULL,
  `type` varchar(20) NOT NULL COMMENT 'Over-ear, On-ear',
  `driver_type` varchar(30) DEFAULT NULL COMMENT 'Dynamic, Planar Magnetic',
  `driver_size_mm` decimal(5,1) DEFAULT NULL,
  `frequency_response` varchar(30) DEFAULT NULL,
  `impedance_ohms` int(11) DEFAULT NULL,
  `sensitivity_db` decimal(5,1) DEFAULT NULL,
  `connectivity` varchar(20) NOT NULL COMMENT 'Wired, Wireless, Both',
  `wireless_dongle` tinyint(1) DEFAULT 0,
  `wireless_dongle_type` varchar(20) DEFAULT NULL COMMENT 'USB-A, USB-C',
  `wireless_bluetooth` tinyint(1) DEFAULT 0,
  `wireless_bluetooth_version` varchar(10) DEFAULT NULL,
  `wireless_battery_life_hours` int(11) DEFAULT NULL,
  `wireless_range_m` int(11) DEFAULT NULL COMMENT 'Wireless range in meters',
  `wireless_charging_type` varchar(20) DEFAULT NULL,
  `simultaneous_connections` int(11) DEFAULT 1 COMMENT 'BT + dongle simultaneous',
  `surround_sound` varchar(30) DEFAULT NULL COMMENT '7.1, Virtual 7.1, DTS, Dolby Atmos',
  `spatial_audio` varchar(30) DEFAULT NULL COMMENT 'Windows Sonic, Dolby Atmos, Tempest 3D',
  `mic_type` varchar(30) DEFAULT NULL COMMENT 'Boom, Retractable, Detachable, Built-in, Flip-up',
  `boom_arm_flexible` tinyint(1) DEFAULT 0,
  `mic_pattern` varchar(30) DEFAULT NULL COMMENT 'Cardioid, Omnidirectional, Bidirectional',
  `mic_frequency_response` varchar(30) DEFAULT NULL,
  `mic_sensitivity_db` decimal(5,1) DEFAULT NULL COMMENT 'Mic sensitivity in dB',
  `mic_noise_cancellation` tinyint(1) DEFAULT 0,
  `mic_mute_button` tinyint(1) DEFAULT 1,
  `mic_led_indicator` tinyint(1) DEFAULT 0,
  `mic_detachable` tinyint(1) DEFAULT 0,
  `sidetone` tinyint(1) DEFAULT 0 COMMENT 'Hear your own voice through headset',
  `chat_mix_dial` tinyint(1) DEFAULT 0 COMMENT 'Game/chat balance control',
  `haptic_feedback` tinyint(1) DEFAULT 0 COMMENT 'Bass haptics (e.g., Razer HyperSense)',
  `active_noise_cancellation` tinyint(1) DEFAULT 0,
  `transparency_mode` tinyint(1) DEFAULT 0,
  `inline_controls` tinyint(1) DEFAULT 0,
  `volume_wheel` tinyint(1) DEFAULT 0,
  `eq_presets` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`eq_presets`)),
  `platform_compatibility` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'PC, PS5, Xbox, Switch, Mobile' CHECK (json_valid(`platform_compatibility`)),
  `cable_length_m` decimal(3,1) DEFAULT NULL,
  `cable_connector` varchar(20) DEFAULT NULL COMMENT '3.5mm, USB-A, USB-C',
  `weight_g` decimal(5,1) DEFAULT NULL,
  `ear_pad_material` varchar(30) DEFAULT NULL,
  `headband_material` varchar(30) DEFAULT NULL,
  `rgb` tinyint(1) DEFAULT 0,
  `software` varchar(100) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `carrying_case` tinyint(1) DEFAULT 0,
  `replaceable_pads` tinyint(1) DEFAULT 1,
  `ip_rating` varchar(10) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  PRIMARY KEY (`product_id`),
  KEY `idx_hs_type` (`type`),
  KEY `idx_hs_connectivity` (`connectivity`),
  CONSTRAINT `fk_headsets_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pc_headsets_specs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pc_headsets_specs` WRITE;
/*!40000 ALTER TABLE `pc_headsets_specs` DISABLE KEYS */;
/*!40000 ALTER TABLE `pc_headsets_specs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pc_keyboard_specs`
--

DROP TABLE IF EXISTS `pc_keyboard_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pc_keyboard_specs` (
  `product_id` UUID NOT NULL,
  `type` varchar(20) NOT NULL COMMENT 'Mechanical, Membrane, Optical, Topre',
  `size` varchar(20) NOT NULL COMMENT 'Full, TKL, 75pct, 65pct, 60pct, 40pct',
  `layout` varchar(30) DEFAULT 'ANSI' COMMENT 'ANSI, ISO, JIS',
  `connectivity` varchar(20) NOT NULL COMMENT 'Wired, Wireless, Both',
  `switch_brand` varchar(50) DEFAULT NULL,
  `switch_model` varchar(100) DEFAULT NULL,
  `switch_type` varchar(20) DEFAULT NULL COMMENT 'Linear, Tactile, Clicky',
  `switch_actuation_force_g` int(11) DEFAULT NULL,
  `switch_travel_mm` decimal(3,1) DEFAULT NULL,
  `hot_swappable` tinyint(1) DEFAULT 0,
  `south_facing_leds` tinyint(1) DEFAULT 0 COMMENT 'Better keycap compatibility',
  `switch_socket_type` varchar(30) DEFAULT NULL COMMENT '3-pin, 5-pin, optical',
  `keycap_material` varchar(20) DEFAULT NULL COMMENT 'PBT, ABS, POM',
  `keycap_profile` varchar(20) DEFAULT NULL COMMENT 'Cherry, OEM, SA, DSA, XDA',
  `keycap_legends` varchar(20) DEFAULT NULL COMMENT 'Doubleshot, Dye-sub, Laser, Pad-print',
  `stabilizers` varchar(30) DEFAULT NULL,
  `plate_material` varchar(20) DEFAULT NULL COMMENT 'Aluminum, Steel, PC, FR4, Brass',
  `case_material` varchar(30) DEFAULT NULL COMMENT 'Plastic, Aluminum, Polycarbonate',
  `gasket_mount` tinyint(1) DEFAULT 0,
  `dampening` varchar(50) DEFAULT NULL COMMENT 'Foam, Silicone, Tape-mod',
  `foam_layers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'PE foam, silicone, IXPE, case foam' CHECK (json_valid(`foam_layers`)),
  `typing_angle_degrees` decimal(3,1) DEFAULT NULL,
  `n_key_rollover` tinyint(1) DEFAULT 1,
  `anti_ghosting` tinyint(1) DEFAULT 1,
  `rapid_trigger` tinyint(1) DEFAULT 0 COMMENT 'Analog rapid trigger support',
  `actuation_point_adjustable` tinyint(1) DEFAULT 0,
  `media_controls` tinyint(1) DEFAULT 0,
  `knob` tinyint(1) DEFAULT 0,
  `wireless_battery_mah` int(11) DEFAULT NULL,
  `wireless_battery_life_hours` int(11) DEFAULT NULL,
  `bluetooth` tinyint(1) DEFAULT 0,
  `dongle_24ghz` tinyint(1) DEFAULT 0,
  `usb_passthrough` tinyint(1) DEFAULT 0,
  `rgb` tinyint(1) DEFAULT 0,
  `rgb_per_key` tinyint(1) DEFAULT 0,
  `software` varchar(100) DEFAULT NULL,
  `onboard_memory_profiles` int(11) DEFAULT 0,
  `programmable_layers` int(11) DEFAULT 1 COMMENT 'Number of programmable layers (VIA/QMK)',
  `firmware` varchar(30) DEFAULT NULL COMMENT 'QMK, VIA, ZMK, Proprietary',
  `weight_g` int(11) DEFAULT NULL,
  `dimensions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'length, width, height in mm' CHECK (json_valid(`dimensions`)),
  `color` varchar(50) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  PRIMARY KEY (`product_id`),
  KEY `idx_kb_type` (`type`),
  KEY `idx_kb_size` (`size`),
  KEY `idx_kb_switch` (`switch_brand`,`switch_model`),
  KEY `idx_kb_connectivity` (`connectivity`),
  CONSTRAINT `fk_keyboard_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pc_keyboard_specs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pc_keyboard_specs` WRITE;
/*!40000 ALTER TABLE `pc_keyboard_specs` DISABLE KEYS */;
/*!40000 ALTER TABLE `pc_keyboard_specs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pc_monitors_specs`
--

DROP TABLE IF EXISTS `pc_monitors_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pc_monitors_specs` (
  `product_id` UUID NOT NULL,
  `monitor_id` UUID NOT NULL,
  `screen_size_inches` decimal(4,1) NOT NULL,
  `resolution_h` int(11) NOT NULL,
  `resolution_v` int(11) NOT NULL,
  `refresh_rate_hz` int(11) NOT NULL,
  `overclock_hz` int(11) DEFAULT NULL COMMENT 'Overclockable refresh rate',
  `flicker_free` tinyint(1) DEFAULT 1,
  `low_blue_light` tinyint(1) DEFAULT 1,
  `panel_type` varchar(20) DEFAULT NULL COMMENT 'IPS, VA, TN, OLED, Mini-LED',
  `backlight_type` varchar(30) DEFAULT NULL COMMENT 'LED, Mini-LED, OLED, QD-OLED, FALD',
  `dimming_zones` int(11) DEFAULT NULL COMMENT 'FALD/Mini-LED zone count',
  `aspect_ratio` varchar(10) DEFAULT NULL COMMENT '16:9, 21:9, 32:9',
  `response_time_ms` decimal(4,1) DEFAULT NULL,
  `brightness_nits` int(11) DEFAULT NULL,
  `contrast_ratio` varchar(30) DEFAULT NULL,
  `hdr_support` varchar(30) DEFAULT NULL COMMENT 'HDR10, HDR400, HDR600, HDR1000',
  `color_gamut_srgb` int(11) DEFAULT NULL,
  `color_gamut_dcip3` int(11) DEFAULT NULL,
  `color_gamut_adobergb` int(11) DEFAULT NULL,
  `color_depth_bit` int(11) DEFAULT NULL COMMENT '8, 10, 12',
  `adaptive_sync` varchar(30) DEFAULT NULL COMMENT 'G-Sync, FreeSync, G-Sync Compatible',
  `hdmi_ports` int(11) DEFAULT 0,
  `hdmi_version` varchar(10) DEFAULT NULL,
  `displayport_ports` int(11) DEFAULT 0,
  `displayport_version` varchar(10) DEFAULT NULL,
  `usb_c_ports` int(11) DEFAULT 0,
  `usb_c_power_delivery_watts` int(11) DEFAULT NULL,
  `usb_hub` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`usb_hub`)),
  `kvm_switch` tinyint(1) DEFAULT 0,
  `daisy_chain` varchar(20) DEFAULT NULL COMMENT 'DP Out for daisy-chaining',
  `speakers` tinyint(1) DEFAULT 0,
  `speaker_watts` decimal(4,1) DEFAULT NULL,
  `vesa_mount` varchar(20) DEFAULT NULL,
  `height_adjustable` tinyint(1) DEFAULT 0,
  `pivot` tinyint(1) DEFAULT 0,
  `swivel` tinyint(1) DEFAULT 0,
  `tilt` tinyint(1) DEFAULT 1,
  `curved` tinyint(1) DEFAULT 0,
  `curvature` varchar(10) DEFAULT NULL COMMENT '1000R, 1500R, 1800R',
  `weight_kg` decimal(5,2) DEFAULT NULL,
  `power_consumption_watts` int(11) DEFAULT NULL,
  `energy_rating` varchar(10) DEFAULT NULL COMMENT 'Energy Star, EU energy label',
  `dimensions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'with and without stand' CHECK (json_valid(`dimensions`)),
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  PRIMARY KEY (`product_id`),
  KEY `idx_monitor_size` (`screen_size_inches`),
  KEY `idx_monitor_resolution` (`resolution_h`,`resolution_v`),
  KEY `idx_monitor_refresh` (`refresh_rate_hz`),
  KEY `idx_monitor_panel` (`panel_type`),
  CONSTRAINT `fk_monitors_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pc_monitors_specs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pc_monitors_specs` WRITE;
/*!40000 ALTER TABLE `pc_monitors_specs` DISABLE KEYS */;
/*!40000 ALTER TABLE `pc_monitors_specs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pc_motherboard_specs`
--

DROP TABLE IF EXISTS `pc_motherboard_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pc_motherboard_specs` (
  `product_id` UUID NOT NULL,
  `socket` varchar(50) NOT NULL,
  `form_factor` varchar(20) NOT NULL,
  `memory_type` varchar(20) NOT NULL,
  `chipset` varchar(50) DEFAULT NULL,
  `m2_slots_gen5` int(11) DEFAULT 0,
  `m2_slots_gen4` int(11) DEFAULT 0,
  `m2_slots_sata` int(11) DEFAULT 0,
  `expansion_slots` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`expansion_slots`)),
  `pcie_version` varchar(10) DEFAULT NULL COMMENT 'PCIe 5.0, 4.0',
  `memory_slots` int(11) DEFAULT NULL,
  `max_memory_capacity_gb` int(11) DEFAULT NULL,
  `max_memory_speed_mhz` int(11) DEFAULT NULL,
  `ecc_support` tinyint(1) DEFAULT 0,
  `m2_slots_detail` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`m2_slots_detail`)),
  `sata_ports` int(11) DEFAULT 0,
  `storage_conflicts` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`storage_conflicts`)),
  `usb_ports` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`usb_ports`)),
  `ethernet` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ethernet`)),
  `wifi` varchar(50) DEFAULT NULL,
  `bluetooth` varchar(20) DEFAULT NULL,
  `thunderbolt_version` varchar(10) DEFAULT NULL,
  `audio_codec` varchar(100) DEFAULT NULL,
  `audio_channels` varchar(20) DEFAULT NULL,
  `rear_io_ports` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Rear panel USB/video/audio port list' CHECK (json_valid(`rear_io_ports`)),
  `cpu_power_phases` int(11) DEFAULT NULL,
  `vrm_phases` varchar(30) DEFAULT NULL COMMENT 'e.g., 16+2+1 phase',
  `vrm_mosfet` varchar(50) DEFAULT NULL COMMENT 'e.g., DrMOS, Dual Half-Bridge',
  `cpu_power_connectors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`cpu_power_connectors`)),
  `bios_flashback` tinyint(1) DEFAULT 0,
  `debug_led` tinyint(1) DEFAULT 0,
  `internal_headers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`internal_headers`)),
  `length_mm` decimal(6,1) DEFAULT NULL,
  `width_mm` decimal(6,1) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  PRIMARY KEY (`product_id`),
  KEY `idx_mobo_socket` (`socket`),
  KEY `idx_mobo_socket_ff` (`socket`,`form_factor`),
  KEY `idx_mobo_chipset` (`chipset`),
  CONSTRAINT `fk_motherboard_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pc_motherboard_specs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pc_motherboard_specs` WRITE;
/*!40000 ALTER TABLE `pc_motherboard_specs` DISABLE KEYS */;
/*!40000 ALTER TABLE `pc_motherboard_specs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pc_mouse_specs`
--

DROP TABLE IF EXISTS `pc_mouse_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pc_mouse_specs` (
  `product_id` UUID NOT NULL,
  `type` varchar(20) NOT NULL COMMENT 'Wired, Wireless, Both',
  `sensor_type` varchar(50) DEFAULT NULL COMMENT 'Optical, Laser',
  `sensor_model` varchar(100) DEFAULT NULL,
  `dpi_min` int(11) DEFAULT NULL,
  `dpi_max` int(11) DEFAULT NULL,
  `dpi_steps` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of DPI presets' CHECK (json_valid(`dpi_steps`)),
  `polling_rate_hz` int(11) DEFAULT 1000,
  `max_tracking_speed_ips` int(11) DEFAULT NULL,
  `max_acceleration_g` int(11) DEFAULT NULL,
  `lod_mm` decimal(3,1) DEFAULT NULL COMMENT 'Lift-Off Distance in mm',
  `buttons` int(11) DEFAULT 5,
  `programmable_buttons` int(11) DEFAULT NULL,
  `side_buttons` int(11) DEFAULT 0,
  `scroll_type` varchar(30) DEFAULT NULL COMMENT 'Standard, Infinite, Tilt',
  `tilt_scroll` tinyint(1) DEFAULT 0,
  `switch_type` varchar(50) DEFAULT NULL,
  `microswitch_brand` varchar(50) DEFAULT NULL COMMENT 'Omron, TTC, Kailh, Huano',
  `switch_rated_clicks` int(11) DEFAULT NULL,
  `connectivity` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'USB-A, USB-C, 2.4GHz, Bluetooth' CHECK (json_valid(`connectivity`)),
  `wireless_battery_type` varchar(30) DEFAULT NULL COMMENT 'Built-in, AA, AAA',
  `wireless_battery_life_hours` int(11) DEFAULT NULL,
  `wireless_charging` tinyint(1) DEFAULT 0,
  `cable_type` varchar(30) DEFAULT NULL COMMENT 'Paracord, Braided, Rubber',
  `cable_length_m` decimal(3,1) DEFAULT NULL,
  `weight_g` decimal(5,1) DEFAULT NULL,
  `length_mm` decimal(5,1) DEFAULT NULL,
  `width_mm` decimal(5,1) DEFAULT NULL,
  `height_mm` decimal(5,1) DEFAULT NULL,
  `grip_style` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Palm, Claw, Fingertip' CHECK (json_valid(`grip_style`)),
  `hand` varchar(15) DEFAULT 'ambidextrous' COMMENT 'right, left, ambidextrous',
  `rgb` tinyint(1) DEFAULT 0,
  `rgb_zones` int(11) DEFAULT 0,
  `software` varchar(100) DEFAULT NULL,
  `onboard_memory_profiles` int(11) DEFAULT 0,
  `skates_material` varchar(30) DEFAULT NULL COMMENT 'PTFE, ceramic',
  `feet_area` varchar(30) DEFAULT NULL COMMENT 'Large, Medium, Small dot skates',
  `color` varchar(50) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  PRIMARY KEY (`product_id`),
  KEY `idx_mouse_type` (`type`),
  CONSTRAINT `fk_mouse_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pc_mouse_specs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pc_mouse_specs` WRITE;
/*!40000 ALTER TABLE `pc_mouse_specs` DISABLE KEYS */;
/*!40000 ALTER TABLE `pc_mouse_specs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pc_pc_cases_specs`
--

DROP TABLE IF EXISTS `pc_pc_cases_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pc_pc_cases_specs` (
  `product_id` UUID NOT NULL,
  `case_id` UUID NOT NULL,
  `form_factor` varchar(30) NOT NULL,
  `airflow_type` varchar(30) DEFAULT NULL COMMENT 'Mesh, Solid, Perforated, Hybrid',
  `supported_motherboards` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'ATX, mATX, ITX etc.' CHECK (json_valid(`supported_motherboards`)),
  `max_gpu_length_mm` int(11) DEFAULT NULL,
  `max_cpu_cooler_height_mm` int(11) DEFAULT NULL,
  `max_psu_length_mm` int(11) DEFAULT NULL,
  `max_radiator_length_front_mm` int(11) DEFAULT NULL,
  `max_radiator_length_top_mm` int(11) DEFAULT NULL,
  `radiator_support` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`radiator_support`)),
  `drive_bays_3_5` int(11) DEFAULT 0,
  `drive_bays_2_5` int(11) DEFAULT 0,
  `expansion_slots` int(11) DEFAULT NULL,
  `external_5_25_bays` int(11) DEFAULT 0,
  `front_panel_usb_c` int(11) DEFAULT 0,
  `front_panel_usb_a` int(11) DEFAULT 0,
  `front_panel_usb_2` int(11) DEFAULT 0,
  `front_panel_audio` tinyint(1) DEFAULT 1,
  `cable_management_depth_mm` int(11) DEFAULT NULL,
  `height_mm` decimal(6,1) DEFAULT NULL,
  `width_mm` decimal(6,1) DEFAULT NULL,
  `depth_mm` decimal(6,1) DEFAULT NULL,
  `volume_liters` decimal(5,1) DEFAULT NULL,
  `fan_mounts` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`fan_mounts`)),
  `included_fans` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`included_fans`)),
  `tempered_glass` tinyint(1) DEFAULT 0,
  `glass_panels` int(11) DEFAULT 0,
  `dust_filters` tinyint(1) DEFAULT 0,
  `tool_less_design` tinyint(1) DEFAULT 0,
  `rgb_included` tinyint(1) DEFAULT 0,
  `psu_shroud` tinyint(1) DEFAULT 0,
  `psu_position` varchar(20) DEFAULT 'bottom' COMMENT 'bottom, top',
  `vertical_gpu_mount` tinyint(1) DEFAULT 0,
  `side_panel_type` varchar(30) DEFAULT NULL COMMENT 'Tempered Glass, Acrylic, Steel, Mesh',
  `material` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`material`)),
  `color` varchar(50) DEFAULT NULL,
  `weight_kg` decimal(5,2) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  PRIMARY KEY (`product_id`),
  KEY `idx_case_ff` (`form_factor`),
  KEY `idx_case_gpu_len` (`max_gpu_length_mm`),
  CONSTRAINT `fk_pc_cases_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pc_pc_cases_specs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pc_pc_cases_specs` WRITE;
/*!40000 ALTER TABLE `pc_pc_cases_specs` DISABLE KEYS */;
/*!40000 ALTER TABLE `pc_pc_cases_specs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pc_power_supply_specs`
--

DROP TABLE IF EXISTS `pc_power_supply_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pc_power_supply_specs` (
  `product_id` UUID NOT NULL,
  `psu_id` UUID NOT NULL,
  `wattage` int(11) NOT NULL,
  `total_continuous_watts` int(11) DEFAULT NULL,
  `peak_watts` int(11) DEFAULT NULL COMMENT 'Transient peak capacity',
  `length_mm` int(11) DEFAULT NULL,
  `depth_mm` int(11) DEFAULT NULL COMMENT 'PSU depth for case clearance',
  `width_mm` int(11) DEFAULT 150 COMMENT 'Usually 150mm standard',
  `height_mm` int(11) DEFAULT 86 COMMENT 'Usually 86mm standard ATX',
  `type` varchar(20) NOT NULL COMMENT 'ATX, SFX, SFX-L',
  `atx_version` varchar(10) DEFAULT NULL COMMENT 'ATX 3.0, ATX 3.1, ATX 2.x',
  `efficiency_rating` varchar(30) DEFAULT NULL COMMENT '80+ Gold, etc.',
  `cybenetics_noise` varchar(20) DEFAULT NULL COMMENT 'A++, A+, A, etc.',
  `cybenetics_efficiency` varchar(20) DEFAULT NULL COMMENT 'Titanium, Diamond, etc.',
  `modular` varchar(10) DEFAULT NULL COMMENT 'Full, Semi, No',
  `connectors_atx_24pin` int(11) DEFAULT 1,
  `connectors_eps_8pin` int(11) DEFAULT 1,
  `connectors_eps_4pin` int(11) DEFAULT 0,
  `connectors_pcie_6_plus_2` int(11) DEFAULT 0,
  `connectors_pcie_12vhpwr` int(11) DEFAULT 0,
  `connectors_sata` int(11) DEFAULT 0,
  `connectors_molex` int(11) DEFAULT 0,
  `cable_length_atx_24pin_mm` int(11) DEFAULT NULL,
  `cable_length_eps_cpu_mm` int(11) DEFAULT NULL,
  `cable_length_pcie_mm` int(11) DEFAULT NULL,
  `cable_length_sata_mm` int(11) DEFAULT NULL,
  `single_rail` tinyint(1) DEFAULT 1,
  `twelve_v_rails` int(11) DEFAULT 1,
  `twelve_v_watts` int(11) DEFAULT NULL,
  `protections` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'OVP, UVP, OCP, OPP, SCP, OTP' CHECK (json_valid(`protections`)),
  `fan_size_mm` int(11) DEFAULT NULL,
  `fan_bearing` varchar(50) DEFAULT NULL,
  `zero_rpm_mode` tinyint(1) DEFAULT 0,
  `fanless` tinyint(1) DEFAULT 0,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  PRIMARY KEY (`product_id`),
  KEY `idx_psu_wattage` (`wattage`),
  KEY `idx_psu_type` (`type`),
  KEY `idx_psu_length` (`length_mm`),
  CONSTRAINT `fk_power_supply_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pc_power_supply_specs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pc_power_supply_specs` WRITE;
/*!40000 ALTER TABLE `pc_power_supply_specs` DISABLE KEYS */;
/*!40000 ALTER TABLE `pc_power_supply_specs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pc_ram_specs`
--

DROP TABLE IF EXISTS `pc_ram_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pc_ram_specs` (
  `product_id` UUID NOT NULL,
  `type` varchar(10) NOT NULL,
  `speed_mhz` int(11) NOT NULL,
  `xmp_expo` varchar(20) DEFAULT NULL COMMENT 'XMP 3.0, EXPO, DOCP',
  `base_speed_mhz` int(11) DEFAULT NULL COMMENT 'JEDEC base speed',
  `modules` int(11) DEFAULT 1,
  `height_mm` decimal(5,1) DEFAULT NULL,
  `capacity_per_module_gb` int(11) DEFAULT NULL,
  `capacity_total_gb` int(11) DEFAULT NULL,
  `cas_latency` int(11) DEFAULT NULL,
  `trcd` int(11) DEFAULT NULL,
  `trp` int(11) DEFAULT NULL,
  `tras` int(11) DEFAULT NULL,
  `voltage` decimal(4,2) DEFAULT NULL,
  `die_type` varchar(30) DEFAULT NULL COMMENT 'Samsung B-die, Hynix A-die, Micron A-die',
  `ranks_per_module` int(11) DEFAULT 1 COMMENT 'Single-rank or Dual-rank',
  `ecc` tinyint(1) DEFAULT 0,
  `on_die_ecc` tinyint(1) DEFAULT 0 COMMENT 'DDR5 on-die ECC (not full ECC)',
  `pmic` varchar(30) DEFAULT NULL COMMENT 'DDR5 PMIC: integrated or external',
  `has_heatspreader` tinyint(1) DEFAULT 1,
  `rgb` tinyint(1) DEFAULT 0,
  `heat_spreader_height_mm` decimal(5,1) DEFAULT NULL COMMENT 'Total height with heatspreader for clearance check',
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  PRIMARY KEY (`product_id`),
  KEY `idx_ram_type` (`type`),
  KEY `idx_ram_type_speed` (`type`,`speed_mhz`),
  CONSTRAINT `fk_ram_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pc_ram_specs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pc_ram_specs` WRITE;
/*!40000 ALTER TABLE `pc_ram_specs` DISABLE KEYS */;
/*!40000 ALTER TABLE `pc_ram_specs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pc_storage_specs`
--

DROP TABLE IF EXISTS `pc_storage_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pc_storage_specs` (
  `product_id` UUID NOT NULL,
  `type` varchar(10) NOT NULL COMMENT 'SSD or HDD',
  `interface_type` varchar(20) NOT NULL COMMENT 'M.2, SATA',
  `form_factor` varchar(30) DEFAULT NULL COMMENT 'M.2 2280, 2.5 inch, 3.5 inch',
  `height_mm` decimal(5,1) DEFAULT NULL COMMENT 'Physical height for 2.5/3.5 drives',
  `pcie_gen` int(11) DEFAULT NULL,
  `capacity_gb` int(11) NOT NULL,
  `protocol` varchar(20) DEFAULT NULL COMMENT 'NVMe, AHCI, SATA',
  `sequential_read_mbps` int(11) DEFAULT NULL,
  `sequential_write_mbps` int(11) DEFAULT NULL,
  `sustained_write_mbps` int(11) DEFAULT NULL COMMENT 'After SLC cache exhaustion',
  `random_read_iops` int(11) DEFAULT NULL,
  `random_write_iops` int(11) DEFAULT NULL,
  `controller` varchar(100) DEFAULT NULL,
  `nand_type` varchar(10) DEFAULT NULL COMMENT 'TLC, QLC, MLC, SLC',
  `nand_layers` int(11) DEFAULT NULL,
  `dram_cache` tinyint(1) DEFAULT 0,
  `dram_size_mb` int(11) DEFAULT NULL,
  `slc_cache_gb` int(11) DEFAULT NULL COMMENT 'SLC cache size in GB',
  `tbw` int(11) DEFAULT NULL,
  `endurance_dwpd` decimal(4,2) DEFAULT NULL COMMENT 'Drive Writes Per Day rating',
  `mtbf_hours` int(11) DEFAULT NULL COMMENT 'Mean Time Between Failures',
  `rpm` int(11) DEFAULT NULL COMMENT 'HDD only',
  `cache_mb` int(11) DEFAULT NULL COMMENT 'HDD only',
  `recording_tech` varchar(10) DEFAULT NULL COMMENT 'CMR, SMR - HDD only',
  `helium_sealed` tinyint(1) DEFAULT 0,
  `use_case` varchar(30) DEFAULT NULL COMMENT 'Consumer, Prosumer, Enterprise, NAS',
  `active_watts` decimal(5,1) DEFAULT NULL,
  `idle_watts` decimal(5,1) DEFAULT NULL,
  `encryption` varchar(50) DEFAULT NULL COMMENT 'AES-256, TCG Opal 2.0, None',
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  PRIMARY KEY (`product_id`),
  KEY `idx_storage_type` (`type`),
  KEY `idx_storage_interface` (`interface_type`),
  KEY `idx_storage_capacity` (`capacity_gb`),
  CONSTRAINT `fk_storage_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pc_storage_specs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pc_storage_specs` WRITE;
/*!40000 ALTER TABLE `pc_storage_specs` DISABLE KEYS */;
/*!40000 ALTER TABLE `pc_storage_specs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-06-08  2:12:11

-- ============================================================
-- VIEWS
-- ============================================================

DROP VIEW IF EXISTS `view_inventory_summary`;
CREATE VIEW `view_inventory_summary` AS 
select 
  `i`.`product_id` AS `product_id`,
  coalesce(`p`.`device_name`,`sp`.`part_name`) AS `device_name`,
  coalesce(`p`.`device_maker`,`sp`.`part_category`) AS `brand`,
  sum(`i`.`quantity`) AS `total_on_hand`,
  sum(`i`.`reserved_quantity`) AS `total_reserved`,
  sum(`i`.`quantity`) - sum(coalesce(`i`.`reserved_quantity`,0)) AS `available_to_promise`,
  `w`.`name` AS `warehouse_name`,
  `i`.`warehouse_id` AS `warehouse_id` 
from (((`inventory` `i` 
  left join `phone_specs` `p` on(`i`.`product_id` = `p`.`product_id`)) 
  left join `spare_parts` `sp` on(`i`.`product_id` = `sp`.`spare_part_id`)) 
  join `warehouses` `w` on(`i`.`warehouse_id` = `w`.`warehouse_id`)) 
group by `i`.`product_id`,`i`.`warehouse_id`,`w`.`name`;

DROP VIEW IF EXISTS `view_repair_jobs_augmented`;
CREATE VIEW `view_repair_jobs_augmented` AS 
select 
  `r`.`repair_job_id` AS `repair_job_id`,
  `r`.`job_number` AS `job_number`,
  `r`.`status` AS `status`,
  `r`.`priority` AS `priority`,
  `r`.`customer_name` AS `customer_name`,
  `r`.`device_name` AS `device_name`,
  `r`.`cost_estimated` AS `cost_estimated`,
  `r`.`cost_final` AS `cost_final`,
  count(`rp`.`id`) AS `parts_count` 
from (`repair_jobs` `r` 
  left join `repair_job_parts` `rp` on(`r`.`repair_job_id` = `rp`.`repair_job_id`)) 
group by `r`.`repair_job_id`;

DROP VIEW IF EXISTS `view_transaction_ledger`;
CREATE VIEW `view_transaction_ledger` AS 
select 
  `t`.`id` AS `transaction_id`,
  `t`.`transaction_date` AS `transaction_date`,
  `t`.`transaction_type` AS `transaction_type`,
  `w_src`.`name` AS `from_warehouse`,
  `w_dst`.`name` AS `to_warehouse`,
  `ti`.`product_id` AS `product_id`,
  `p`.`device_name` AS `device_name`,
  `ti`.`quantity_changed` AS `quantity_changed`,
  `ti`.`total_value` AS `total_value`,
  `t`.`user_id` AS `user_id`,
  `t`.`notes` AS `notes` 
from ((((`transactions` `t` 
  left join `transaction_items` `ti` on(`t`.`id` = `ti`.`transaction_id`))
  left join `warehouses` `w_src` on(`t`.`from_warehouse_id` = `w_src`.`warehouse_id`)) 
  left join `warehouses` `w_dst` on(`t`.`warehouse_id` = `w_dst`.`warehouse_id`)) 
  left join `phone_specs` `p` on(`ti`.`product_id` = `p`.`product_id`));

-- Schema unified on 2026-05-31
