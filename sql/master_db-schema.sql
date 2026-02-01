-- Schema for master_db
-- Generated on 2026-01-30T05:30:41.839Z
-- Total objects: 46

CREATE DATABASE IF NOT EXISTS `master_db`;
USE `master_db`;

-- BASE TABLE: assets
CREATE TABLE `assets` (
  `asset_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serial_number` varchar(255) NOT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `status` enum('available','reserved','sold','damaged','returned','scrapped','in_repair','quarantine') DEFAULT 'available',
  `condition` enum('NEW','REFURBISHED','USED','TESTING','DEFECTIVE') DEFAULT 'NEW',
  `purchase_cost` decimal(10,2) DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `warranty_expiry` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `warehouse_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`asset_id`),
  UNIQUE KEY `serial_number` (`serial_number`),
  KEY `idx_assets_serial` (`serial_number`),
  KEY `idx_assets_zone` (`zone_id`),
  KEY `idx_assets_status` (`status`),
  KEY `fk_assets_product` (`product_id`),
  KEY `idx_assets_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_assets_product` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assets_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- BASE TABLE: batch_tracking
CREATE TABLE `batch_tracking` (
  `batch_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` char(36) NOT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `batch_no` varchar(100) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `manufacture_date` date DEFAULT NULL COMMENT 'Manufacturing date of the batch',
  `expiry_date` date DEFAULT NULL COMMENT 'Expiration date of the batch',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `warehouse_id` char(36) DEFAULT NULL,
  PRIMARY KEY (`batch_id`),
  UNIQUE KEY `unique_batch_product_location` (`batch_no`,`product_id`,`warehouse_id`,`zone_id`),
  KEY `idx_batch_zone` (`zone_id`),
  KEY `idx_batch_expiry` (`expiry_date`),
  KEY `idx_batch_product` (`product_id`),
  KEY `idx_batch_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_batch_to_specs` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_batch_to_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_batch_to_zone` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Batch tracking for mid-value items. Tracks quantity per batch without individual serial numbers';

-- BASE TABLE: bin_inventory
CREATE TABLE `bin_inventory` (
  `assignment_id` int(11) NOT NULL AUTO_INCREMENT,
  `bin_id` char(36) NOT NULL,
  `product_id` char(36) DEFAULT NULL COMMENT 'Product UUID - mutually exclusive with spare_part_id',
  `spare_part_id` int(11) DEFAULT NULL COMMENT 'Spare part ID - mutually exclusive with product_id',
  `batch_id` int(11) DEFAULT NULL,
  `asset_id` int(11) DEFAULT NULL COMMENT 'Link to assets table',
  `quantity` int(11) DEFAULT 0,
  `assigned_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`assignment_id`),
  KEY `idx_bin_id` (`bin_id`),
  KEY `idx_batch_id` (`batch_id`),
  KEY `idx_bin_inv_asset` (`asset_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_bin_spare_part` (`bin_id`,`spare_part_id`),
  CONSTRAINT `fk_bin_inv_to_batch` FOREIGN KEY (`batch_id`) REFERENCES `batch_tracking` (`batch_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bin_inv_to_product` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product assignments to specific bin locations';

-- BASE TABLE: bin_locations
CREATE TABLE `bin_locations` (
  `bin_id` char(36) NOT NULL,
  `zone_id` int(11) NOT NULL,
  `aisle` varchar(10) NOT NULL,
  `rack` varchar(10) NOT NULL,
  `row_position` varchar(10) DEFAULT NULL,
  `column_position` varchar(10) DEFAULT NULL,
  `bin_position` varchar(10) DEFAULT NULL,
  `hierarchical_code` varchar(50) DEFAULT NULL,
  `shelf` varchar(10) NOT NULL,
  `bin_code` varchar(50) NOT NULL COMMENT 'e.g., A-01-B-03',
  `bin_type` enum('standard','cold','hazmat','bulk','small_parts') DEFAULT 'standard',
  `max_capacity` int(11) DEFAULT NULL COMMENT 'Maximum units this bin can hold',
  `is_active` tinyint(1) DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `bin_prefix` varchar(10) DEFAULT NULL COMMENT 'Zone-based bin prefix (e.g., RCV, STG, PCK)',
  `bin_sequence` int(11) DEFAULT NULL COMMENT 'Sequential number within zone',
  `physical_location` text DEFAULT NULL COMMENT 'Physical description/directions to bin',
  `temperature_controlled` tinyint(1) DEFAULT 0 COMMENT 'Whether bin has temperature control',
  `temperature_min` decimal(5,2) DEFAULT NULL COMMENT 'Minimum temperature (Celsius)',
  `temperature_max` decimal(5,2) DEFAULT NULL COMMENT 'Maximum temperature (Celsius)',
  `weight_capacity` decimal(10,2) DEFAULT NULL COMMENT 'Maximum weight capacity (kg)',
  `height_cm` decimal(10,2) DEFAULT NULL COMMENT 'Bin height in centimeters',
  `width_cm` decimal(10,2) DEFAULT NULL COMMENT 'Bin width in centimeters',
  `depth_cm` decimal(10,2) DEFAULT NULL COMMENT 'Bin depth in centimeters',
  `priority_level` enum('low','normal','high','critical') DEFAULT 'normal' COMMENT 'Picking priority level',
  `accessibility_level` enum('easy','moderate','difficult','restricted') DEFAULT 'easy' COMMENT 'How easy to access bin',
  `product_type` enum('smartphone','spare_part') DEFAULT NULL COMMENT 'Type of products this bin can store - once set, bin can only store this type',
  PRIMARY KEY (`bin_id`),
  UNIQUE KEY `unique_bin_code` (`zone_id`,`bin_code`),
  UNIQUE KEY `uk_bin_locations_zone_hierarchical` (`zone_id`,`hierarchical_code`),
  KEY `idx_bin_zone` (`zone_id`),
  KEY `idx_bin_active` (`is_active`),
  KEY `idx_bin_prefix` (`bin_prefix`),
  KEY `idx_bin_sequence` (`bin_sequence`),
  KEY `idx_bin_priority` (`priority_level`),
  KEY `idx_bin_locations_hierarchical` (`row_position`,`column_position`,`bin_position`),
  KEY `idx_bin_locations_hierarchical_code` (`hierarchical_code`),
  CONSTRAINT `fk_bin_to_zone` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Physical bin locations within warehouse zones for precise inventory placement';

-- BASE TABLE: device_spare_parts_assignment
CREATE TABLE `device_spare_parts_assignment` (
  `assignment_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` char(36) NOT NULL,
  `spare_part_id` int(11) NOT NULL,
  `is_required` tinyint(1) DEFAULT 0 COMMENT 'Is this part essential for this device',
  `installation_complexity` enum('EASY','MODERATE','DIFFICULT','EXPERT') DEFAULT 'MODERATE',
  `estimated_install_time_minutes` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`assignment_id`),
  UNIQUE KEY `unique_device_part` (`product_id`,`spare_part_id`),
  KEY `idx_spare_part` (`spare_part_id`),
  KEY `idx_product` (`product_id`),
  CONSTRAINT `fk_assignment_device` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assignment_spare_part` FOREIGN KEY (`spare_part_id`) REFERENCES `smartphone_spare_parts` (`spare_part_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Links specific devices to compatible spare parts';

-- BASE TABLE: inventory_log
CREATE TABLE `inventory_log` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` char(36) DEFAULT NULL,
  `spare_part_id` int(11) DEFAULT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `asset_id` int(11) DEFAULT NULL COMMENT 'Liên kết đến bảng assets hợp nhất',
  `transaction_type` enum('incoming','outgoing','adjustment','transfer','rma_return','rma_disposition','zone_transfer_out','zone_transfer_in','zone_to_bin','bin_to_zone','bin_transfer','bin_deletion_return') NOT NULL,
  `quantity_changed` int(11) DEFAULT NULL COMMENT 'Null for single-asset movements',
  `condition` enum('NEW','REFURBISHED','USED','TESTING','DEFECTIVE') DEFAULT 'NEW',
  `transaction_date` datetime DEFAULT current_timestamp(),
  `from_zone_id` int(11) DEFAULT NULL COMMENT 'Source zone for transfers',
  `zone_id` int(11) DEFAULT NULL COMMENT 'Destination zone',
  `bin_id` char(36) DEFAULT NULL COMMENT 'Bin/basket location for the transaction',
  `receipt_id` varchar(50) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `unit_cost` decimal(10,2) DEFAULT NULL COMMENT 'Unit cost at time of transaction',
  `total_value` decimal(12,2) DEFAULT NULL COMMENT 'Total value of transaction',
  `batch_no` varchar(100) DEFAULT NULL COMMENT 'Batch number for tracking',
  `expiry_date` date DEFAULT NULL COMMENT 'Expiry date for batch items',
  `new_inventory_level` int(11) DEFAULT NULL COMMENT 'Inventory level after transaction',
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `serial_number` varchar(100) DEFAULT NULL COMMENT 'Serial number for serialized items',
  `reference_id` char(36) DEFAULT NULL COMMENT 'Reference ID (e.g., RMA ID)',
  `subtotal` decimal(10,2) DEFAULT 0.00 COMMENT 'Subtotal for multi-item transactions',
  `tax_amount` decimal(10,2) DEFAULT 0.00 COMMENT 'Tax amount for transaction',
  `total_amount` decimal(10,2) DEFAULT 0.00 COMMENT 'Total amount for transaction',
  `transaction_group_id` varchar(50) DEFAULT NULL COMMENT 'Groups related log entries from same receipt',
  `item_sequence` int(11) DEFAULT NULL COMMENT 'Item order within transaction group',
  `po_id` int(11) DEFAULT NULL,
  `invoice_id` int(11) DEFAULT NULL,
  `warehouse_id` char(36) DEFAULT NULL,
  `from_warehouse_id` char(36) DEFAULT NULL,
  `external_doc_no` varchar(100) DEFAULT NULL COMMENT 'Reference to external document (e.g. Supplier Invoice, DO) for traceability',
  `customer_name` varchar(255) DEFAULT NULL COMMENT 'Customer/Recipient name for outgoing transactions',
  `customer_address` text DEFAULT NULL COMMENT 'Customer/Recipient address',
  `delivery_person` varchar(255) DEFAULT NULL COMMENT 'Person who delivered/received the goods',
  `document_reference` varchar(255) DEFAULT NULL COMMENT 'Reference to source document (PO, Invoice, etc.)',
  `unit_of_measure` varchar(50) DEFAULT 'Unit' COMMENT 'Unit of measurement for the product',
  PRIMARY KEY (`log_id`),
  KEY `idx_log_zone` (`zone_id`),
  KEY `idx_log_receipt` (`receipt_id`),
  KEY `idx_log_supplier` (`supplier_id`),
  KEY `idx_log_transaction_type` (`transaction_type`),
  KEY `idx_log_transaction_date` (`transaction_date`),
  KEY `idx_log_unit_cost` (`unit_cost`),
  KEY `idx_log_batch_no` (`batch_no`),
  KEY `idx_log_asset` (`asset_id`),
  KEY `idx_log_date_type` (`transaction_date`,`transaction_type`),
  KEY `idx_log_product_date` (`transaction_date`),
  KEY `idx_log_supplier_date` (`supplier_id`,`transaction_date`),
  KEY `idx_inventory_log_date_type` (`transaction_date`,`transaction_type`),
  KEY `idx_inventory_log_product_date` (`transaction_date`),
  KEY `idx_inventory_log_outgoing` (`transaction_type`,`transaction_date`),
  KEY `fk_log_to_batch` (`batch_id`),
  KEY `idx_log_group` (`transaction_group_id`),
  KEY `idx_log_group_product` (`transaction_group_id`),
  KEY `idx_log_type_date` (`transaction_type`,`transaction_date`),
  KEY `fk_log_po` (`po_id`),
  KEY `fk_log_invoice` (`invoice_id`),
  KEY `fk_log_to_specs` (`product_id`),
  KEY `idx_spare_part_id` (`spare_part_id`),
  KEY `idx_condition` (`condition`),
  KEY `idx_log_warehouse` (`warehouse_id`),
  KEY `idx_log_from_warehouse` (`from_warehouse_id`),
  KEY `idx_log_warehouse_date` (`warehouse_id`,`transaction_date`),
  KEY `idx_log_bin` (`bin_id`),
  KEY `idx_customer_name` (`customer_name`),
  KEY `idx_document_ref` (`document_reference`),
  CONSTRAINT `fk_log_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_log_po` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_log_to_batch` FOREIGN KEY (`batch_id`) REFERENCES `batch_tracking` (`batch_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_log_to_bin` FOREIGN KEY (`bin_id`) REFERENCES `bin_locations` (`bin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_log_to_specs` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_log_to_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_log_to_zone` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Unified transaction and inventory log table. Single source of truth for all inventory movements and receipts. Uses transaction_group_id to group related entries.';

-- BASE TABLE: invoices
CREATE TABLE `invoices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `pattern_number` varchar(20) DEFAULT '01GTKT0/001',
  `serial_number` varchar(20) DEFAULT 'AA/24P',
  `supplier_id` int(11) DEFAULT NULL,
  `product_uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('draft','issued','paid','cancelled') DEFAULT 'draft',
  `verification_status` enum('PENDING','PARTIAL','VERIFIED') DEFAULT 'PENDING',
  `invoice_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `subtotal` decimal(14,2) DEFAULT 0.00,
  `tax_rate` decimal(5,2) DEFAULT 10.00,
  `tax_amount` decimal(10,2) DEFAULT NULL,
  `shipping_fee` decimal(10,2) DEFAULT 0.00,
  `discount_amount` decimal(14,2) DEFAULT 0.00,
  `total_amount` decimal(10,2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `payment_method` varchar(50) DEFAULT 'TM/CK',
  `notes` text DEFAULT NULL,
  `imported_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  UNIQUE KEY `idx_invoice_uuid` (`uuid`),
  KEY `fk_invoice_supplier` (`supplier_id`),
  CONSTRAINT `fk_invoice_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- BASE TABLE: invoice_items
CREATE TABLE `invoice_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `invoice_id` int(11) NOT NULL,
  `product_uuid` char(36) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `unit_name` varchar(50) DEFAULT NULL,
  `product_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `spare_part_id` int(11) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `unit` varchar(20) DEFAULT 'Cái',
  `quantity` int(11) DEFAULT 1,
  `unit_price` decimal(10,2) DEFAULT NULL,
  `total_amount` decimal(15,2) DEFAULT NULL,
  `total_price` decimal(12,2) DEFAULT NULL,
  `tax_rate` decimal(5,2) DEFAULT 10.00,
  `tax_amount` decimal(15,2) DEFAULT NULL,
  `discount_amount` decimal(15,2) DEFAULT NULL,
  `discount_rate` decimal(5,2) DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_invoice_items_invoice` (`invoice_id`),
  KEY `fk_invoice_items_product` (`product_id`),
  KEY `idx_ii_spare_part_id` (`spare_part_id`),
  CONSTRAINT `fk_invoice_items_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_invoice_items_product` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- BASE TABLE: phone_models
CREATE TABLE `phone_models` (
  `model_id` int(11) NOT NULL AUTO_INCREMENT,
  `model_uuid` char(36) DEFAULT uuid(),
  `model_name` varchar(255) NOT NULL COMMENT 'e.g., iPhone 15, Galaxy S23 Ultra',
  `manufacturer` varchar(100) NOT NULL,
  `model_series` varchar(100) DEFAULT NULL COMMENT 'e.g., iPhone 15, Galaxy S23',
  `base_image_url` varchar(500) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`model_id`),
  UNIQUE KEY `model_uuid` (`model_uuid`),
  KEY `idx_manufacturer` (`manufacturer`),
  KEY `idx_series` (`model_series`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Base phone models for variant management';

-- BASE TABLE: phone_variants
CREATE TABLE `phone_variants` (
  `variant_id` int(11) NOT NULL AUTO_INCREMENT,
  `variant_uuid` char(36) DEFAULT uuid(),
  `model_id` int(11) NOT NULL,
  `product_id` char(36) DEFAULT NULL COMMENT 'Link to specs_db for backward compatibility',
  `sku` varchar(100) DEFAULT NULL COMMENT 'Stock Keeping Unit',
  `variant_name` varchar(255) DEFAULT NULL COMMENT 'e.g., iPhone 15 128GB Blue',
  `price` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`variant_id`),
  UNIQUE KEY `variant_uuid` (`variant_uuid`),
  UNIQUE KEY `sku` (`sku`),
  KEY `idx_model` (`model_id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_sku` (`sku`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `phone_variants_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `phone_models` (`model_id`) ON DELETE CASCADE,
  CONSTRAINT `phone_variants_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Specific phone variant configurations';

-- BASE TABLE: repair_job_attachments
CREATE TABLE `repair_job_attachments` (
  `attachment_id` int(11) NOT NULL AUTO_INCREMENT,
  `repair_job_id` int(11) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` enum('IMAGE','DOCUMENT','VIDEO','OTHER') DEFAULT 'IMAGE',
  `file_size_kb` int(11) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `attachment_category` enum('BEFORE_PHOTO','AFTER_PHOTO','INVOICE','QUOTE','DIAGNOSTIC_REPORT','WARRANTY_CARD','OTHER') DEFAULT 'OTHER',
  `description` text DEFAULT NULL,
  `uploaded_by` varchar(100) DEFAULT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`attachment_id`),
  KEY `idx_repair_job` (`repair_job_id`),
  KEY `idx_category` (`attachment_category`),
  KEY `idx_file_type` (`file_type`),
  KEY `idx_uploaded_at` (`uploaded_at`),
  CONSTRAINT `repair_job_attachments_ibfk_1` FOREIGN KEY (`repair_job_id`) REFERENCES `smartphone_repair_jobs` (`repair_job_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='File attachments for repair jobs (photos, documents, etc.)';

-- BASE TABLE: repair_job_parts_usage
CREATE TABLE `repair_job_parts_usage` (
  `usage_id` int(11) NOT NULL AUTO_INCREMENT,
  `repair_job_id` int(11) NOT NULL,
  `spare_part_id` int(11) NOT NULL,
  `inventory_id` int(11) DEFAULT NULL COMMENT 'Specific inventory item used',
  `quantity_used` int(11) NOT NULL DEFAULT 1,
  `unit_cost` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Cost at time of use',
  `total_cost` decimal(10,2) GENERATED ALWAYS AS (`quantity_used` * `unit_cost`) STORED,
  `installed_date` datetime DEFAULT current_timestamp(),
  `installed_by` varchar(100) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT NULL COMMENT 'Part-specific warranty',
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`usage_id`),
  KEY `idx_repair_job` (`repair_job_id`),
  KEY `idx_spare_part` (`spare_part_id`),
  KEY `idx_inventory` (`inventory_id`),
  KEY `idx_installed_date` (`installed_date`),
  CONSTRAINT `fk_usage_to_inventory` FOREIGN KEY (`inventory_id`) REFERENCES `smartphone_spare_parts_inventory` (`inventory_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_usage_to_repair_job` FOREIGN KEY (`repair_job_id`) REFERENCES `smartphone_repair_jobs` (`repair_job_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_usage_to_spare_part` FOREIGN KEY (`spare_part_id`) REFERENCES `smartphone_spare_parts` (`spare_part_id`),
  CONSTRAINT `chk_quantity_used_positive` CHECK (`quantity_used` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tracks which spare parts were used in each repair job';

-- BASE TABLE: repair_job_templates
CREATE TABLE `repair_job_templates` (
  `template_id` int(11) NOT NULL AUTO_INCREMENT,
  `template_name` varchar(255) NOT NULL,
  `template_category` enum('SCREEN_REPAIR','BATTERY_REPLACEMENT','CHARGING_PORT','WATER_DAMAGE','SOFTWARE_ISSUE','CAMERA_REPAIR','SPEAKER_REPAIR','BUTTON_REPAIR','OTHER') DEFAULT 'OTHER',
  `description` text DEFAULT NULL,
  `default_priority` enum('LOW','NORMAL','HIGH','URGENT') DEFAULT 'NORMAL',
  `estimated_cost` decimal(10,2) DEFAULT 0.00,
  `estimated_labor_cost` decimal(10,2) DEFAULT 0.00,
  `estimated_duration_hours` int(11) DEFAULT 2,
  `default_parts` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of {spare_part_id, quantity}' CHECK (json_valid(`default_parts`)),
  `checklist` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of task steps' CHECK (json_valid(`checklist`)),
  `diagnosis_template` text DEFAULT NULL,
  `repair_notes_template` text DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 3,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`template_id`),
  KEY `idx_category` (`template_category`),
  KEY `idx_active` (`is_active`),
  KEY `idx_name` (`template_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reusable templates for common repair job types';

-- BASE TABLE: rma
CREATE TABLE `rma` (
  `rma_id` char(36) NOT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(50) DEFAULT NULL,
  `original_receipt_id` varchar(50) DEFAULT NULL,
  `original_transaction_date` datetime DEFAULT NULL,
  `reason_code` enum('defective','damaged','wrong_item','customer_remorse','warranty','other') DEFAULT 'other',
  `reason_description` text DEFAULT NULL,
  `status` enum('pending','awaiting_receipt','received','inspecting','approved','rejected','completed','cancelled') DEFAULT 'pending',
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `quarantine_zone_id` int(11) DEFAULT NULL,
  `requested_by` int(11) NOT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `expected_return_date` date DEFAULT NULL,
  `actual_return_date` datetime DEFAULT NULL,
  `inspection_date` datetime DEFAULT NULL,
  `completion_date` datetime DEFAULT NULL,
  `total_value` decimal(12,2) DEFAULT 0.00,
  `refund_amount` decimal(12,2) DEFAULT 0.00,
  `restocking_fee` decimal(10,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `internal_notes` text DEFAULT NULL,
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '[]' COMMENT 'Array of RMA items' CHECK (json_valid(`items`)),
  `status_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '[]' COMMENT 'Array of status changes' CHECK (json_valid(`status_history`)),
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '[]' COMMENT 'Array of file attachments' CHECK (json_valid(`attachments`)),
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `warehouse_id` char(36) DEFAULT NULL,
  PRIMARY KEY (`rma_id`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_customer` (`customer_name`,`customer_email`),
  KEY `idx_assigned_to` (`assigned_to`),
  KEY `idx_requested_by` (`requested_by`),
  KEY `fk_rma_zone` (`quarantine_zone_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_rma_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`),
  CONSTRAINT `fk_rma_zone` FOREIGN KEY (`quarantine_zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Unified RMA table with JSON for items, history, and attachments';

-- BASE TABLE: smartphone_repair_jobs
CREATE TABLE `smartphone_repair_jobs` (
  `repair_job_id` int(11) NOT NULL AUTO_INCREMENT,
  `job_number` varchar(50) NOT NULL COMMENT 'Unique job number (e.g., RPR-2025-00001)',
  `product_id` char(36) DEFAULT NULL,
  `device_serial_number` varchar(255) DEFAULT NULL COMMENT 'Device IMEI/Serial',
  `device_name` varchar(255) DEFAULT NULL COMMENT 'Device model name',
  `device_imei` varchar(50) DEFAULT NULL COMMENT 'IMEI for phones',
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(50) DEFAULT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `customer_address` text DEFAULT NULL,
  `issue_description` text NOT NULL COMMENT 'Customer reported issue',
  `diagnosis` text DEFAULT NULL COMMENT 'Technician diagnosis',
  `repair_notes` text DEFAULT NULL COMMENT 'Repair process notes',
  `status` enum('PENDING','DIAGNOSED','PARTS_ORDERED','IN_PROGRESS','TESTING','COMPLETED','DELIVERED','CANCELLED') DEFAULT 'PENDING',
  `priority` enum('LOW','NORMAL','HIGH','URGENT') DEFAULT 'NORMAL',
  `assigned_technician` varchar(100) DEFAULT NULL,
  `assigned_at` datetime DEFAULT NULL,
  `received_date` datetime DEFAULT current_timestamp(),
  `estimated_completion_date` datetime DEFAULT NULL,
  `completion_date` datetime DEFAULT NULL,
  `delivered_date` datetime DEFAULT NULL,
  `estimated_cost` decimal(10,2) DEFAULT 0.00,
  `final_cost` decimal(10,2) DEFAULT 0.00,
  `parts_cost` decimal(10,2) DEFAULT 0.00 COMMENT 'Total cost of parts used',
  `labor_cost` decimal(10,2) DEFAULT 0.00 COMMENT 'Labor charges',
  `total_cost` decimal(10,2) GENERATED ALWAYS AS (`parts_cost` + `labor_cost`) STORED,
  `customer_charge` decimal(10,2) DEFAULT 0.00 COMMENT 'Amount charged to customer',
  `currency` varchar(10) DEFAULT 'USD',
  `tested_by` varchar(100) DEFAULT NULL,
  `test_results` text DEFAULT NULL COMMENT 'Post-repair test results',
  `quality_check_passed` tinyint(1) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 3 COMMENT 'Repair warranty period',
  `warranty_expires_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` varchar(100) DEFAULT NULL,
  `warehouse_id` char(36) DEFAULT NULL,
  PRIMARY KEY (`repair_job_id`),
  UNIQUE KEY `unique_job_number` (`job_number`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_technician` (`assigned_technician`),
  KEY `idx_received_date` (`received_date`),
  KEY `idx_customer` (`customer_name`),
  KEY `idx_serial` (`device_serial_number`),
  KEY `idx_repair_jobs_status_date` (`status`,`received_date`),
  KEY `idx_repair_jobs_technician_status` (`assigned_technician`,`status`),
  KEY `idx_device_imei` (`device_imei`),
  KEY `idx_product` (`product_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_repair_to_product` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_repair_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Smartphone repair job tracking with status and cost management';

-- BASE TABLE: smartphone_spare_parts
CREATE TABLE `smartphone_spare_parts` (
  `spare_part_id` int(11) NOT NULL AUTO_INCREMENT,
  `part_code` varchar(50) NOT NULL COMMENT 'Unique part code (e.g., DISP-IP15-BLK)',
  `part_name` varchar(255) NOT NULL COMMENT 'Display name (e.g., iPhone 15 Display)',
  `part_category` enum('DISPLAY','BATTERY','CAMERA_REAR','CAMERA_FRONT','MOTHERBOARD','SPEAKER','MICROPHONE','CHARGING_PORT','BUTTON','CASE','ANTENNA','FLEX_CABLE','OTHER') NOT NULL,
  `part_type` varchar(100) DEFAULT NULL COMMENT 'Specific type (e.g., OLED, LCD, Li-ion)',
  `description` text DEFAULT NULL COMMENT 'Detailed description',
  `compatible_product_id` char(36) DEFAULT NULL,
  `compatible_device_category` varchar(100) DEFAULT NULL COMMENT 'Device category (phone, tablet, etc)',
  `compatible_brands` text DEFAULT NULL COMMENT 'JSON array of compatible brands',
  `compatible_models` text DEFAULT NULL COMMENT 'JSON array of compatible models',
  `dimensions` varchar(100) DEFAULT NULL COMMENT 'Length x Width x Height',
  `weight_g` decimal(6,2) DEFAULT NULL COMMENT 'Weight in grams',
  `color_variants` text DEFAULT NULL COMMENT 'JSON array of available colors',
  `quality_grade` enum('OEM','ORIGINAL','PREMIUM','STANDARD','ECONOMY') DEFAULT 'STANDARD' COMMENT 'Quality tier',
  `warranty_months` int(11) DEFAULT 3 COMMENT 'Warranty period in months',
  `manufacturer` varchar(255) DEFAULT NULL,
  `manufacturer_part_number` varchar(100) DEFAULT NULL COMMENT 'OEM part number',
  `unit_cost` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Cost per unit',
  `unit_price` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Selling price per unit',
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
  PRIMARY KEY (`spare_part_id`),
  UNIQUE KEY `unique_part_code` (`part_code`),
  KEY `idx_part_category` (`part_category`),
  KEY `idx_supplier` (`default_supplier_id`),
  KEY `idx_quality_grade` (`quality_grade`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_manufacturer` (`manufacturer`),
  KEY `idx_spare_parts_category_grade` (`part_category`,`quality_grade`),
  KEY `idx_spare_parts_active_supplier` (`is_active`,`default_supplier_id`),
  KEY `idx_device_category` (`compatible_device_category`),
  KEY `idx_compatible_product` (`compatible_product_id`),
  CONSTRAINT `fk_spare_part_to_device` FOREIGN KEY (`compatible_product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catalog of smartphone spare parts with compatibility and pricing information';

-- BASE TABLE: smartphone_spare_parts_inventory
CREATE TABLE `smartphone_spare_parts_inventory` (
  `inventory_id` int(11) NOT NULL AUTO_INCREMENT,
  `spare_part_id` int(11) NOT NULL,
  `zone_id` int(11) DEFAULT NULL COMMENT 'Storage zone within warehouse',
  `bin_id` char(36) DEFAULT NULL,
  `quantity_on_hand` int(11) NOT NULL DEFAULT 0 COMMENT 'Total available quantity',
  `quantity_reserved` int(11) DEFAULT 0 COMMENT 'Reserved for pending repairs',
  `quantity_defective` int(11) DEFAULT 0 COMMENT 'Defective/damaged units',
  `quantity_in_transit` int(11) DEFAULT 0 COMMENT 'Being transferred',
  `batch_no` varchar(100) DEFAULT NULL,
  `serial_number` varchar(255) DEFAULT NULL COMMENT 'For serialized parts',
  `manufacture_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL COMMENT 'For time-sensitive parts (batteries)',
  `condition_status` enum('NEW','REFURBISHED','USED') DEFAULT 'NEW',
  `condition_notes` text DEFAULT NULL,
  `location_notes` varchar(255) DEFAULT NULL COMMENT 'Additional location info',
  `last_counted_at` datetime DEFAULT NULL COMMENT 'Last physical inventory count',
  `last_counted_by` varchar(100) DEFAULT NULL,
  `last_movement_at` datetime DEFAULT NULL,
  `last_movement_type` varchar(50) DEFAULT NULL COMMENT 'RECEIVE, ISSUE, TRANSFER, ADJUST',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `warehouse_id` char(36) DEFAULT NULL,
  PRIMARY KEY (`inventory_id`),
  UNIQUE KEY `unique_spare_part_location` (`spare_part_id`,`warehouse_id`,`zone_id`,`batch_no`,`serial_number`),
  KEY `idx_spare_part` (`spare_part_id`),
  KEY `idx_zone` (`zone_id`),
  KEY `idx_batch` (`batch_no`),
  KEY `idx_serial` (`serial_number`),
  KEY `idx_condition` (`condition_status`),
  KEY `idx_expiry` (`expiry_date`),
  KEY `idx_spare_inventory_condition` (`condition_status`,`quantity_on_hand`),
  KEY `fk_spare_inventory_to_bin` (`bin_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_spare_inventory_warehouse_part` (`warehouse_id`,`spare_part_id`),
  CONSTRAINT `fk_spare_inventory_to_bin` FOREIGN KEY (`bin_id`) REFERENCES `bin_locations` (`bin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_spare_inventory_to_part` FOREIGN KEY (`spare_part_id`) REFERENCES `smartphone_spare_parts` (`spare_part_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_spare_inventory_to_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`),
  CONSTRAINT `fk_spare_inventory_to_zone` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_quantity_positive` CHECK (`quantity_on_hand` >= 0),
  CONSTRAINT `chk_reserved_valid` CHECK (`quantity_reserved` >= 0 and `quantity_reserved` <= `quantity_on_hand`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Physical inventory tracking for smartphone spare parts across warehouses';

-- BASE TABLE: specs_db
CREATE TABLE `specs_db` (
  `product_id` char(36) NOT NULL,
  `device_name` varchar(255) DEFAULT NULL,
  `device_maker` varchar(255) DEFAULT NULL,
  `device_price` decimal(10,2) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `water_and_dust_rating` varchar(50) DEFAULT NULL,
  `processor` varchar(255) DEFAULT NULL,
  `process_node` varchar(50) DEFAULT NULL,
  `cpu_cores` varchar(50) DEFAULT NULL,
  `cpu_frequency` varchar(100) DEFAULT NULL,
  `gpu` varchar(100) DEFAULT NULL,
  `memory_type` varchar(50) DEFAULT NULL,
  `ram` varchar(50) DEFAULT NULL,
  `rom` varchar(50) DEFAULT NULL,
  `expandable_memory` varchar(100) DEFAULT NULL,
  `length_mm` decimal(5,2) DEFAULT NULL,
  `width_mm` decimal(5,2) DEFAULT NULL,
  `thickness_mm` decimal(4,2) DEFAULT NULL,
  `weight_g` decimal(5,2) DEFAULT NULL,
  `display_size` decimal(4,2) DEFAULT NULL,
  `resolution` varchar(50) DEFAULT NULL,
  `pixel_density` varchar(50) DEFAULT NULL,
  `refresh_rate` varchar(50) DEFAULT NULL,
  `brightness` varchar(100) DEFAULT NULL,
  `display_features` text DEFAULT NULL,
  `rear_camera_main` varchar(255) DEFAULT NULL,
  `rear_camera_macro` varchar(255) DEFAULT NULL,
  `rear_camera_features` text DEFAULT NULL,
  `rear_video_resolution` varchar(255) DEFAULT NULL,
  `front_camera` varchar(255) DEFAULT NULL,
  `front_camera_features` text DEFAULT NULL,
  `front_video_resolution` varchar(255) DEFAULT NULL,
  `battery_capacity` varchar(50) DEFAULT NULL,
  `fast_charging` varchar(100) DEFAULT NULL,
  `connector` varchar(50) DEFAULT NULL,
  `security_features` text DEFAULT NULL,
  `sim_card` varchar(100) DEFAULT NULL,
  `nfc` varchar(50) DEFAULT NULL,
  `network_bands` text DEFAULT NULL,
  `wireless_connectivity` text DEFAULT NULL,
  `navigation` text DEFAULT NULL,
  `audio_jack` varchar(50) DEFAULT NULL,
  `audio_playback` text DEFAULT NULL,
  `video_playback` text DEFAULT NULL,
  `sensors` text DEFAULT NULL,
  `operating_system` varchar(100) DEFAULT NULL,
  `package_contents` text DEFAULT NULL,
  `product_type` varchar(50) DEFAULT NULL COMMENT 'phone, tablet, accessory',
  `default_supplier_id` int(11) DEFAULT NULL COMMENT 'Default supplier for this product',
  `staging_inventory` int(11) DEFAULT 0,
  `reorder_point` int(11) DEFAULT 0 COMMENT 'Minimum stock level before reorder',
  `reorder_quantity` int(11) DEFAULT 0 COMMENT 'Quantity to order when below reorder point',
  `lead_time_days` int(11) DEFAULT 7 COMMENT 'Supplier lead time in days',
  `safety_stock` int(11) DEFAULT 0 COMMENT 'Buffer stock for demand variability',
  `avg_daily_usage` decimal(10,2) DEFAULT 0.00 COMMENT 'Average daily consumption',
  `display_type` enum('LCD','IPS_LCD','OLED','AMOLED','SUPER_AMOLED','LTPO_OLED','RETINA','E_INK','OTHER') DEFAULT NULL COMMENT 'Display panel technology',
  `hdr_support` varchar(100) DEFAULT NULL COMMENT 'HDR10, HDR10+, Dolby Vision, HLG',
  `rear_camera_ultrawide` varchar(255) DEFAULT NULL COMMENT 'Ultrawide camera specs',
  `rear_camera_telephoto` varchar(255) DEFAULT NULL COMMENT 'Telephoto camera specs',
  `optical_zoom` varchar(50) DEFAULT NULL COMMENT 'Optical zoom capability (e.g., 3x, 5x, 10x)',
  `wireless_charging` varchar(100) DEFAULT NULL COMMENT 'Wireless charging wattage (e.g., 15W Qi, 50W)',
  `reverse_charging` varchar(100) DEFAULT NULL COMMENT 'Reverse wireless charging capability',
  `warranty_months` int(11) DEFAULT 12 COMMENT 'Standard warranty period in months',
  `warranty_type` enum('MANUFACTURER','DISTRIBUTOR','STORE','EXTENDED','NONE') DEFAULT 'MANUFACTURER' COMMENT 'Type of warranty coverage',
  `warranty_notes` text DEFAULT NULL COMMENT 'Additional warranty terms or conditions',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Whether product is actively sold',
  `is_discontinued` tinyint(1) DEFAULT 0 COMMENT 'Whether product has been discontinued by manufacturer',
  `launch_date` date DEFAULT NULL COMMENT 'Product launch/release date',
  `end_of_life_date` date DEFAULT NULL COMMENT 'End of life or discontinuation date',
  PRIMARY KEY (`product_id`),
  KEY `idx_default_supplier` (`default_supplier_id`),
  KEY `idx_device_inventory` (`staging_inventory`),
  KEY `idx_reorder_point` (`reorder_point`),
  KEY `idx_lead_time` (`lead_time_days`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_is_discontinued` (`is_discontinued`),
  KEY `idx_display_type` (`display_type`),
  KEY `idx_launch_date` (`launch_date`),
  KEY `idx_active_discontinued` (`is_active`,`is_discontinued`),
  CONSTRAINT `fk_specs_to_supplier` FOREIGN KEY (`default_supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product catalog with 50+ specification fields for electronic devices. Actual inventory tracked in warehouse_product_locations or serialized_inventory';

-- BASE TABLE: stocktakes
CREATE TABLE `stocktakes` (
  `stocktake_id` int(11) NOT NULL AUTO_INCREMENT,
  `stocktake_number` varchar(50) NOT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `count_type` enum('full','cycle','random','location') DEFAULT 'full',
  `status` enum('PLANNED','IN_PROGRESS','COMPLETED','APPROVED','CANCELLED') DEFAULT 'PLANNED',
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
  `warehouse_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`stocktake_id`),
  UNIQUE KEY `stocktake_number` (`stocktake_number`),
  KEY `idx_zone` (`zone_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at`),
  KEY `idx_stocktakes_scheduled` (`scheduled_for`,`status`),
  KEY `idx_stocktakes_count_type` (`count_type`),
  KEY `idx_warehouse` (`warehouse_id`),
  CONSTRAINT `stocktakes_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`),
  CONSTRAINT `stocktakes_ibfk_2` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- BASE TABLE: stocktake_items
CREATE TABLE `stocktake_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `stocktake_id` int(11) NOT NULL,
  `product_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bin_location` varchar(50) DEFAULT NULL,
  `system_quantity` decimal(10,2) NOT NULL DEFAULT 0.00,
  `counted_quantity` decimal(10,2) DEFAULT NULL,
  `variance` decimal(10,2) DEFAULT NULL,
  `variance_pct` decimal(5,2) DEFAULT NULL,
  `adjustment_applied` tinyint(1) DEFAULT 0,
  `adjustment_receipt_id` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `counted_at` datetime DEFAULT NULL,
  `counted_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_stocktake_product` (`stocktake_id`,`product_id`,`bin_location`),
  KEY `idx_stocktake` (`stocktake_id`),
  KEY `idx_adjustment_receipt` (`adjustment_receipt_id`),
  KEY `idx_variance` (`variance`),
  KEY `idx_product` (`product_id`),
  CONSTRAINT `stocktake_items_ibfk_1` FOREIGN KEY (`stocktake_id`) REFERENCES `stocktakes` (`stocktake_id`) ON DELETE CASCADE,
  CONSTRAINT `stocktake_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- BASE TABLE: stocktake_status_history
CREATE TABLE `stocktake_status_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `stocktake_id` int(11) NOT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) NOT NULL,
  `changed_by` int(11) NOT NULL,
  `changed_at` timestamp NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_stocktake` (`stocktake_id`),
  KEY `idx_changed_at` (`changed_at`),
  CONSTRAINT `stocktake_status_history_ibfk_1` FOREIGN KEY (`stocktake_id`) REFERENCES `stocktakes` (`stocktake_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- BASE TABLE: suppliers
CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL COMMENT 'electronics, parts, accessories',
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
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `tax_code` varchar(50) DEFAULT NULL,
  `lead_time_days` int(11) DEFAULT NULL COMMENT 'Average lead time in days',
  `rating` decimal(3,2) DEFAULT NULL COMMENT 'Supplier rating (0-5)',
  `payment_terms` varchar(100) DEFAULT NULL COMMENT 'Payment terms (e.g., Net 30)',
  `brands` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'List of brands associated with the supplier' CHECK (json_valid(`brands`)),
  `additional_contacts` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_name` (`name`),
  KEY `idx_supplier_category` (`category`),
  KEY `idx_contact_person` (`contact_person`),
  KEY `idx_email` (`email`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_tax_number` (`tax_code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Supplier master data for tracking vendors';

-- BASE TABLE: variant_attributes
CREATE TABLE `variant_attributes` (
  `attribute_id` int(11) NOT NULL AUTO_INCREMENT,
  `attribute_type` enum('color','storage','ram','connectivity','special_feature') NOT NULL,
  `attribute_name` varchar(100) NOT NULL COMMENT 'e.g., Phantom Black, 128GB, 5G',
  `attribute_value` varchar(100) NOT NULL COMMENT 'e.g., #000000, 128, 5G',
  `display_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`attribute_id`),
  UNIQUE KEY `unique_attribute` (`attribute_type`,`attribute_name`),
  KEY `idx_type` (`attribute_type`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Variant attributes like colors, storage options';

-- BASE TABLE: variant_attribute_values
CREATE TABLE `variant_attribute_values` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `variant_id` int(11) NOT NULL,
  `attribute_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_variant_attribute` (`variant_id`,`attribute_id`),
  KEY `idx_variant` (`variant_id`),
  KEY `idx_attribute` (`attribute_id`),
  CONSTRAINT `variant_attribute_values_ibfk_1` FOREIGN KEY (`variant_id`) REFERENCES `phone_variants` (`variant_id`) ON DELETE CASCADE,
  CONSTRAINT `variant_attribute_values_ibfk_2` FOREIGN KEY (`attribute_id`) REFERENCES `variant_attributes` (`attribute_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Links variants to their attributes';

-- BASE TABLE: warehouses
CREATE TABLE `warehouses` (
  `name` varchar(255) NOT NULL,
  `location` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `contact_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'JSON field for phone, email, manager' CHECK (json_valid(`contact_info`)),
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `warehouse_id` char(36) NOT NULL,
  `warehouse_uuid` char(36) DEFAULT NULL,
  PRIMARY KEY (`warehouse_id`),
  KEY `idx_warehouse_name` (`name`),
  KEY `idx_warehouse_active` (`is_active`),
  KEY `idx_warehouse_uuid` (`warehouse_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Warehouse locations for physical inventory storage';

-- BASE TABLE: warehouse_product_locations
CREATE TABLE `warehouse_product_locations` (
  `location_id` int(11) NOT NULL AUTO_INCREMENT,
  `zone_id` int(11) DEFAULT NULL,
  `product_id` char(36) NOT NULL,
  `condition` enum('NEW','REFURBISHED','USED','TESTING','DEFECTIVE') DEFAULT 'NEW',
  `quantity` int(11) DEFAULT 0 CHECK (`quantity` >= 0),
  `reserved_quantity` int(11) DEFAULT 0 CHECK (`reserved_quantity` >= 0 and `reserved_quantity` <= `quantity`),
  `min_stock_level` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `warehouse_id` char(36) DEFAULT NULL,
  PRIMARY KEY (`location_id`),
  UNIQUE KEY `unique_warehouse_zone_phone` (`warehouse_id`,`zone_id`,`product_id`,`condition`),
  KEY `idx_wpl_zone` (`zone_id`),
  KEY `idx_wpl_product` (`product_id`),
  KEY `idx_wpl_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_wpl_to_specs` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wpl_to_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wpl_to_zone` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Primary table for bulk inventory tracking. available_quantity = quantity - reserved_quantity';

-- BASE TABLE: warehouse_zones
CREATE TABLE `warehouse_zones` (
  `zone_id` int(11) NOT NULL AUTO_INCREMENT,
  `zone_uuid` char(36) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `zone_type` enum('receiving','storage','picking','staging','shipping') DEFAULT 'storage',
  `capacity_limit` int(11) DEFAULT NULL COMMENT 'Maximum number of items',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `default_bin_type` enum('standard','cold','hazmat','bulk','small_parts') DEFAULT 'standard' COMMENT 'Default bin type for this zone',
  `bin_prefix` varchar(10) DEFAULT NULL COMMENT 'Prefix for bins in this zone (e.g., RCV, STG)',
  `max_bins` int(11) DEFAULT NULL COMMENT 'Maximum number of bins allowed in zone',
  `bin_layout` enum('single_row','double_row','grid','mixed','custom') DEFAULT 'grid' COMMENT 'Physical layout of bins',
  `require_bins` tinyint(1) DEFAULT 0 COMMENT 'Whether zone requires bin-level tracking',
  `warehouse_id` char(36) DEFAULT NULL,
  `warehouse_uuid` char(36) DEFAULT NULL,
  PRIMARY KEY (`zone_id`),
  KEY `idx_zone_bin_prefix` (`bin_prefix`),
  KEY `idx_zone_require_bins` (`require_bins`),
  KEY `idx_zone_warehouse` (`warehouse_id`),
  KEY `idx_zone_uuid` (`zone_uuid`),
  KEY `idx_warehouse_uuid` (`warehouse_uuid`),
  CONSTRAINT `fk_zone_to_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Zones within warehouses following workflow: Receiving → Storage → Picking → Staging → Shipping';

-- VIEW: audit_log
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `audit_log` AS select `security_db`.`audit_log`.`id` AS `log_id`,`security_db`.`audit_log`.`user_id` AS `user_id`,`security_db`.`audit_log`.`action_type` AS `action_type`,`security_db`.`audit_log`.`resource_type` AS `entity_type`,`security_db`.`audit_log`.`resource_id` AS `entity_id`,json_unquote(json_extract(`security_db`.`audit_log`.`changes`,'$.old_values')) AS `old_values`,json_unquote(json_extract(`security_db`.`audit_log`.`changes`,'$.new_values')) AS `new_values`,`security_db`.`audit_log`.`ip_address` AS `ip_address`,`security_db`.`audit_log`.`user_agent` AS `user_agent`,`security_db`.`audit_log`.`description` AS `notes`,`security_db`.`audit_log`.`created_at` AS `created_at` from `security_db`.`audit_log`;

-- VIEW: bin_capacity_view
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `bin_capacity_view` AS select `bl`.`bin_id` AS `bin_id`,`bl`.`zone_id` AS `zone_id`,`bl`.`bin_code` AS `bin_code`,`bl`.`bin_type` AS `bin_type`,`bl`.`aisle` AS `aisle`,`bl`.`rack` AS `rack`,`bl`.`shelf` AS `shelf`,`bl`.`max_capacity` AS `max_capacity`,`bl`.`priority_level` AS `priority_level`,`bl`.`accessibility_level` AS `accessibility_level`,`bl`.`is_active` AS `is_active`,`wz`.`warehouse_id` AS `warehouse_id`,`wz`.`name` AS `zone_name`,`wz`.`zone_type` AS `zone_type`,`wz`.`bin_prefix` AS `zone_bin_prefix`,`w`.`name` AS `warehouse_name`,coalesce(sum(`bi`.`quantity`),0) AS `current_quantity`,count(distinct `bi`.`product_id`) AS `unique_products`,case when `bl`.`max_capacity` is not null then `bl`.`max_capacity` - coalesce(sum(`bi`.`quantity`),0) else NULL end AS `available_capacity`,case when `bl`.`max_capacity` is not null and `bl`.`max_capacity` > 0 then round(coalesce(sum(`bi`.`quantity`),0) / `bl`.`max_capacity` * 100,2) else NULL end AS `utilization_percent`,case when `bl`.`is_active` = 0 then 'inactive' when `bl`.`max_capacity` is null then 'unlimited' when coalesce(sum(`bi`.`quantity`),0) = 0 then 'empty' when coalesce(sum(`bi`.`quantity`),0) >= `bl`.`max_capacity` then 'full' when coalesce(sum(`bi`.`quantity`),0) / nullif(`bl`.`max_capacity`,0) >= 0.9 then 'near_full' when coalesce(sum(`bi`.`quantity`),0) / nullif(`bl`.`max_capacity`,0) >= 0.7 then 'high' else 'available' end AS `capacity_status`,`bl`.`temperature_controlled` AS `temperature_controlled`,`bl`.`temperature_min` AS `temperature_min`,`bl`.`temperature_max` AS `temperature_max`,`bl`.`height_cm` AS `height_cm`,`bl`.`width_cm` AS `width_cm`,`bl`.`depth_cm` AS `depth_cm`,`bl`.`weight_capacity` AS `weight_capacity` from (((`bin_locations` `bl` join `warehouse_zones` `wz` on(`bl`.`zone_id` = `wz`.`zone_id`)) join `warehouses` `w` on(`wz`.`warehouse_id` = `w`.`warehouse_id`)) left join `bin_inventory` `bi` on(`bl`.`bin_id` = `bi`.`bin_id`)) group by `bl`.`bin_id`;

-- VIEW: expected_serials
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `expected_serials` AS select `master_db`.`serial_tracking`.`tracking_id` AS `expectation_id`,`master_db`.`serial_tracking`.`invoice_id` AS `invoice_id`,`master_db`.`serial_tracking`.`product_id` AS `product_uuid`,`master_db`.`serial_tracking`.`imei_1` AS `expected_imei`,`master_db`.`serial_tracking`.`is_expected` AS `is_expected`,`master_db`.`serial_tracking`.`is_received` AS `is_received`,`master_db`.`serial_tracking`.`expected_at` AS `created_at`,`master_db`.`serial_tracking`.`received_at` AS `received_at` from `serial_tracking` where `master_db`.`serial_tracking`.`is_expected` = 1;

-- VIEW: expiring_batches
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `expiring_batches` AS select `bt`.`batch_id` AS `batch_id`,`bt`.`batch_no` AS `batch_no`,`bt`.`product_id` AS `product_id`,`s`.`device_name` AS `product_name`,`s`.`device_maker` AS `brand`,`bt`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,`bt`.`zone_id` AS `zone_id`,`wz`.`name` AS `zone_name`,`bt`.`quantity` AS `quantity`,`bt`.`manufacture_date` AS `manufacture_date`,`bt`.`expiry_date` AS `expiry_date`,to_days(`bt`.`expiry_date`) - to_days(curdate()) AS `days_until_expiry`,case when to_days(`bt`.`expiry_date`) - to_days(curdate()) <= 0 then 'Expired' when to_days(`bt`.`expiry_date`) - to_days(curdate()) <= 30 then 'Critical' when to_days(`bt`.`expiry_date`) - to_days(curdate()) <= 90 then 'Warning' else 'Normal' end AS `expiry_status` from (((`batch_tracking` `bt` left join `specs_db` `s` on(`bt`.`product_id` = `s`.`product_id`)) left join `warehouses` `w` on(`bt`.`warehouse_id` = `w`.`warehouse_id`)) left join `warehouse_zones` `wz` on(`bt`.`zone_id` = `wz`.`zone_id`)) where `bt`.`expiry_date` is not null and `w`.`is_active` = 1 order by `bt`.`expiry_date`;

-- VIEW: inventory_movement_tracking
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `inventory_movement_tracking` AS select `il`.`log_id` AS `log_id`,`il`.`transaction_date` AS `transaction_date`,`il`.`transaction_type` AS `transaction_type`,`il`.`product_id` AS `product_id`,`s`.`device_name` AS `product_name`,`s`.`device_maker` AS `brand`,`il`.`quantity_changed` AS `quantity_changed`,`il`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,`il`.`zone_id` AS `zone_id`,`wz`.`name` AS `zone_name`,`il`.`batch_id` AS `batch_id`,`bt`.`batch_no` AS `batch_no`,`il`.`serial_number` AS `serial_number`,`il`.`notes` AS `notes`,`il`.`user_id` AS `user_id`,`il`.`created_at` AS `created_at` from ((((`inventory_log` `il` left join `specs_db` `s` on(`il`.`product_id` = `s`.`product_id`)) left join `warehouses` `w` on(`il`.`warehouse_id` = `w`.`warehouse_id`)) left join `warehouse_zones` `wz` on(`il`.`zone_id` = `wz`.`zone_id`)) left join `batch_tracking` `bt` on(`il`.`batch_id` = `bt`.`batch_id`)) order by `il`.`transaction_date` desc,`il`.`created_at` desc;

-- VIEW: inventory_overview
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `inventory_overview` AS select `s`.`product_id` AS `product_id`,`s`.`device_name` AS `device_name`,`s`.`device_maker` AS `device_maker`,`s`.`device_price` AS `device_price`,NULL AS `warehouse_id`,'Central Staging' AS `warehouse_name`,NULL AS `zone_id`,'Staging' AS `zone_name`,'staging' AS `zone_type`,`s`.`staging_inventory` AS `warehouse_quantity`,0 AS `reserved_quantity`,`s`.`staging_inventory` AS `available_quantity` from `specs_db` `s` where `s`.`staging_inventory` > 0 union all select `wpl`.`product_id` AS `product_id`,`s`.`device_name` AS `device_name`,`s`.`device_maker` AS `device_maker`,`s`.`device_price` AS `device_price`,`wpl`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,`wpl`.`zone_id` AS `zone_id`,`wz`.`name` AS `zone_name`,`wz`.`zone_type` AS `zone_type`,`wpl`.`quantity` AS `warehouse_quantity`,coalesce(`wpl`.`reserved_quantity`,0) AS `reserved_quantity`,`wpl`.`quantity` - coalesce(`wpl`.`reserved_quantity`,0) AS `available_quantity` from (((`warehouse_product_locations` `wpl` join `specs_db` `s` on(`wpl`.`product_id` = `s`.`product_id`)) join `warehouses` `w` on(`wpl`.`warehouse_id` = `w`.`warehouse_id`)) left join `warehouse_zones` `wz` on(`wpl`.`zone_id` = `wz`.`zone_id`)) where `wpl`.`quantity` > 0 and `w`.`is_active` = 1 order by `device_name`,`warehouse_name`,`zone_name`;

-- VIEW: low_stock_alerts
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `low_stock_alerts` AS select `wpl`.`location_id` AS `location_id`,`wpl`.`product_id` AS `product_id`,`s`.`device_name` AS `device_name`,`s`.`device_maker` AS `device_maker`,`s`.`device_price` AS `device_price`,`wpl`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,`wpl`.`zone_id` AS `zone_id`,`wz`.`name` AS `zone_name`,`wpl`.`quantity` AS `warehouse_quantity`,coalesce(`s`.`staging_inventory`,0) AS `staging_quantity`,`wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) AS `current_quantity`,`wpl`.`reserved_quantity` AS `reserved_quantity`,`wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) - `wpl`.`reserved_quantity` AS `available_quantity`,`wpl`.`min_stock_level` AS `min_stock_level`,`wpl`.`min_stock_level` - (`wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0)) AS `shortage_quantity`,case when `wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) = 0 then 'Out of Stock' when `wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) <= `wpl`.`min_stock_level` * 0.25 then 'Critical' when `wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) <= `wpl`.`min_stock_level` * 0.5 then 'Low' else 'Warning' end AS `alert_level`,`wpl`.`updated_at` AS `last_updated` from (((`warehouse_product_locations` `wpl` join `specs_db` `s` on(`wpl`.`product_id` = `s`.`product_id`)) join `warehouses` `w` on(`wpl`.`warehouse_id` = `w`.`warehouse_id`)) left join `warehouse_zones` `wz` on(`wpl`.`zone_id` = `wz`.`zone_id`)) where `wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) <= `wpl`.`min_stock_level` and `w`.`is_active` = 1 order by case when `wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) = 0 then 1 when `wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) <= `wpl`.`min_stock_level` * 0.25 then 2 when `wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) <= `wpl`.`min_stock_level` * 0.5 then 3 else 4 end,`wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0);

-- VIEW: reorder_recommendations
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `reorder_recommendations` AS select `master_db`.`unified_reorder_recommendations`.`recommendation_id` AS `recommendation_id`,`master_db`.`unified_reorder_recommendations`.`item_id` AS `product_id`,`master_db`.`unified_reorder_recommendations`.`current_stock` AS `current_stock`,`master_db`.`unified_reorder_recommendations`.`reorder_point` AS `reorder_point`,`master_db`.`unified_reorder_recommendations`.`recommended_quantity` AS `recommended_quantity`,`master_db`.`unified_reorder_recommendations`.`urgency_level` AS `urgency_level`,`master_db`.`unified_reorder_recommendations`.`estimated_stockout_date` AS `estimated_stockout_date`,`master_db`.`unified_reorder_recommendations`.`recommendation_reason` AS `recommendation_reason`,case `master_db`.`unified_reorder_recommendations`.`status` when 'CANCELLED' then 'DISMISSED' else `master_db`.`unified_reorder_recommendations`.`status` end AS `status`,`master_db`.`unified_reorder_recommendations`.`acknowledged_by` AS `acknowledged_by`,`master_db`.`unified_reorder_recommendations`.`acknowledged_at` AS `acknowledged_at`,`master_db`.`unified_reorder_recommendations`.`created_at` AS `created_at`,`master_db`.`unified_reorder_recommendations`.`updated_at` AS `updated_at`,`master_db`.`unified_reorder_recommendations`.`warehouse_id` AS `warehouse_id` from `unified_reorder_recommendations` where `master_db`.`unified_reorder_recommendations`.`item_type` = 'product';

-- VIEW: roles
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `roles` AS select `security_db`.`roles`.`id` AS `id`,`security_db`.`roles`.`name` AS `name`,`security_db`.`roles`.`description` AS `description`,`security_db`.`roles`.`created_at` AS `created_at`,`security_db`.`roles`.`updated_at` AS `updated_at` from `security_db`.`roles`;

-- VIEW: serialized_inventory
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `serialized_inventory` AS select `master_db`.`serial_tracking`.`tracking_id` AS `serial_id`,`master_db`.`serial_tracking`.`uuid` AS `uuid`,`master_db`.`serial_tracking`.`product_id` AS `product_id`,`master_db`.`serial_tracking`.`imei_1` AS `imei_1`,`master_db`.`serial_tracking`.`imei_2` AS `imei_2`,`master_db`.`serial_tracking`.`serial_number` AS `serial_number`,`master_db`.`serial_tracking`.`warehouse_id` AS `warehouse_id`,`master_db`.`serial_tracking`.`zone_id` AS `zone_id`,`master_db`.`serial_tracking`.`bin_id` AS `bin_id`,`master_db`.`serial_tracking`.`status` AS `status`,`master_db`.`serial_tracking`.`condition_grade` AS `condition_grade`,`master_db`.`serial_tracking`.`supplier_id` AS `supplier_id`,`master_db`.`serial_tracking`.`import_invoice_id` AS `import_invoice_id`,`master_db`.`serial_tracking`.`created_at` AS `created_at`,`master_db`.`serial_tracking`.`updated_at` AS `updated_at` from `serial_tracking` where `master_db`.`serial_tracking`.`is_received` = 1;

-- VIEW: serial_inventory_status
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `serial_inventory_status` AS select `si`.`serial_id` AS `serial_id`,`si`.`serial_number` AS `serial_number`,`si`.`product_id` AS `product_id`,`s`.`device_name` AS `product_name`,`s`.`device_maker` AS `brand`,`si`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,`si`.`zone_id` AS `zone_id`,`wz`.`name` AS `zone_name`,`si`.`status` AS `status`,`si`.`created_at` AS `created_at`,`si`.`updated_at` AS `updated_at` from (((`serialized_inventory` `si` left join `specs_db` `s` on(`si`.`product_id` = `s`.`product_id`)) left join `warehouses` `w` on(`si`.`warehouse_id` = `w`.`warehouse_id`)) left join `warehouse_zones` `wz` on(`si`.`zone_id` = `wz`.`zone_id`)) where `w`.`is_active` = 1;

-- VIEW: spare_parts_reorder_recommendations
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `spare_parts_reorder_recommendations` AS select `master_db`.`unified_reorder_recommendations`.`recommendation_id` AS `recommendation_id`,cast(`master_db`.`unified_reorder_recommendations`.`item_id` as signed) AS `spare_part_id`,cast(`master_db`.`unified_reorder_recommendations`.`current_stock` as signed) AS `current_stock`,cast(`master_db`.`unified_reorder_recommendations`.`reorder_point` as signed) AS `reorder_point`,cast(`master_db`.`unified_reorder_recommendations`.`recommended_quantity` as signed) AS `recommended_quantity`,`master_db`.`unified_reorder_recommendations`.`urgency_level` AS `urgency_level`,`master_db`.`unified_reorder_recommendations`.`estimated_stockout_date` AS `estimated_stockout_date`,`master_db`.`unified_reorder_recommendations`.`recommendation_reason` AS `recommendation_reason`,case `master_db`.`unified_reorder_recommendations`.`status` when 'DISMISSED' then 'CANCELLED' else `master_db`.`unified_reorder_recommendations`.`status` end AS `status`,`master_db`.`unified_reorder_recommendations`.`acknowledged_by` AS `acknowledged_by`,`master_db`.`unified_reorder_recommendations`.`created_at` AS `created_at`,`master_db`.`unified_reorder_recommendations`.`updated_at` AS `updated_at`,`master_db`.`unified_reorder_recommendations`.`warehouse_id` AS `warehouse_id` from `unified_reorder_recommendations` where `master_db`.`unified_reorder_recommendations`.`item_type` = 'spare_part';

-- VIEW: user_roles
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `user_roles` AS select `security_db`.`user_roles`.`id` AS `id`,`security_db`.`user_roles`.`user_id` AS `user_id`,`security_db`.`user_roles`.`role_id` AS `role_id`,`security_db`.`user_roles`.`assigned_at` AS `assigned_at`,`security_db`.`user_roles`.`assigned_by` AS `assigned_by` from `security_db`.`user_roles`;

-- VIEW: v_all_transactions
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `v_all_transactions` AS select coalesce(`il`.`transaction_group_id`,concat('LOG-',`il`.`log_id`)) AS `transaction_id`,max(`il`.`transaction_type`) AS `transaction_type`,min(`il`.`transaction_date`) AS `transaction_date`,max(`il`.`supplier_id`) AS `supplier_id`,max(`il`.`warehouse_id`) AS `warehouse_id`,max(`il`.`zone_id`) AS `zone_id`,sum(coalesce(`il`.`total_amount`,`il`.`total_value`,0)) AS `total_amount`,sum(coalesce(`il`.`subtotal`,`il`.`total_value`,0)) AS `subtotal`,sum(coalesce(`il`.`tax_amount`,0)) AS `tax_amount`,max(`il`.`notes`) AS `notes`,max(`il`.`po_id`) AS `po_id`,max(`il`.`invoice_id`) AS `invoice_id`,case when `il`.`transaction_group_id` is not null then 'receipt' else 'inventory_log' end AS `source`,count(distinct coalesce(`il`.`product_id`,`il`.`spare_part_id`)) AS `item_count`,min(`il`.`created_at`) AS `created_at`,max(`il`.`updated_at`) AS `updated_at` from `inventory_log` `il` where `il`.`transaction_type` in ('incoming','outgoing','transfer','rma_return','rma_disposition') and (`il`.`transaction_group_id` is not null or `il`.`receipt_id` is null) group by coalesce(`il`.`transaction_group_id`,concat('LOG-',`il`.`log_id`)),case when `il`.`transaction_group_id` is not null then 'receipt' else 'inventory_log' end;

-- VIEW: v_inventory_accuracy
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `v_inventory_accuracy` AS select `w`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,count(`pch`.`product_id`) AS `products_counted`,sum(case when `pch`.`count_result` = 'match' then 1 else 0 end) AS `products_matched`,sum(case when `pch`.`count_result` = 'variance' then 1 else 0 end) AS `products_with_variance`,round(sum(case when `pch`.`count_result` = 'match' then 1 else 0 end) / nullif(count(`pch`.`product_id`),0) * 100,2) AS `accuracy_pct`,sum(abs(`pch`.`variance_qty`)) AS `total_variance_qty`,sum(`pch`.`variance_qty`) AS `total_system_qty_variance`,round(sum(case when `pch`.`count_result` = 'match' then 1 else 0 end) / nullif(count(`pch`.`product_id`),0) * 100,2) AS `ira_pct`,max(`pch`.`last_counted_at`) AS `last_count_date` from (`warehouses` `w` left join `product_count_history` `pch` on(`w`.`warehouse_id` = `pch`.`warehouse_id`)) group by `w`.`warehouse_id`;

-- VIEW: v_items_due_for_count
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `v_items_due_for_count` AS select `wpl`.`product_id` AS `product_id`,`s`.`device_name` AS `device_name`,`s`.`device_maker` AS `device_maker`,`wpl`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,`wpl`.`zone_id` AS `zone_id`,`z`.`name` AS `zone_name`,`wpl`.`quantity` AS `quantity`,`pch`.`last_counted_at` AS `last_counted_at`,`pch`.`count_result` AS `last_count_result`,coalesce(case `ccs`.`frequency` when 'daily' then 1 when 'weekly' then 7 when 'bi_weekly' then 14 when 'monthly' then 30 when 'quarterly' then 90 else 30 end,30) AS `count_frequency_days`,to_days(current_timestamp()) - to_days(`pch`.`last_counted_at`) AS `days_since_count`,case when `pch`.`last_counted_at` is null then 1 when to_days(current_timestamp()) - to_days(`pch`.`last_counted_at`) >= coalesce(case `ccs`.`frequency` when 'daily' then 1 when 'weekly' then 7 when 'bi_weekly' then 14 when 'monthly' then 30 when 'quarterly' then 90 else 30 end,30) then 1 else 0 end AS `is_due` from (((((`warehouse_product_locations` `wpl` join `specs_db` `s` on(`wpl`.`product_id` = `s`.`product_id`)) join `warehouses` `w` on(`wpl`.`warehouse_id` = `w`.`warehouse_id`)) left join `warehouse_zones` `z` on(`wpl`.`zone_id` = `z`.`zone_id`)) left join `product_count_history` `pch` on(`wpl`.`product_id` = `pch`.`product_id` and `wpl`.`warehouse_id` = `pch`.`warehouse_id` and (`wpl`.`zone_id` = `pch`.`zone_id` or `wpl`.`zone_id` is null and `pch`.`zone_id` is null))) left join `cycle_count_schedules` `ccs` on(`wpl`.`warehouse_id` = `ccs`.`warehouse_id` and (`wpl`.`zone_id` = `ccs`.`zone_id` or `ccs`.`zone_id` is null) and `ccs`.`is_active` = 1)) where `wpl`.`quantity` > 0;

-- VIEW: warehouse_distribution_overview
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `warehouse_distribution_overview` AS select `w`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,count(distinct `wz`.`zone_id`) AS `total_zones`,coalesce(`bulk_inventory`.`total_quantity`,0) + coalesce(`serialized_inventory`.`total_quantity`,0) + coalesce(`spare_parts_inventory`.`total_quantity`,0) AS `total_inventory` from ((((`master_db`.`warehouses` `w` left join `master_db`.`warehouse_zones` `wz` on(`w`.`warehouse_id` = `wz`.`warehouse_id` and `wz`.`is_active` = 1)) left join (select `master_db`.`warehouse_product_locations`.`warehouse_id` AS `warehouse_id`,sum(`master_db`.`warehouse_product_locations`.`quantity`) AS `total_quantity` from `master_db`.`warehouse_product_locations` group by `master_db`.`warehouse_product_locations`.`warehouse_id`) `bulk_inventory` on(`w`.`warehouse_id` = `bulk_inventory`.`warehouse_id`)) left join (select `master_db`.`serialized_inventory`.`warehouse_id` AS `warehouse_id`,count(`master_db`.`serialized_inventory`.`serial_id`) AS `total_quantity` from `master_db`.`serialized_inventory` where `master_db`.`serialized_inventory`.`status` in ('available','reserved') group by `master_db`.`serialized_inventory`.`warehouse_id`) `serialized_inventory` on(`w`.`warehouse_id` = `serialized_inventory`.`warehouse_id`)) left join (select `spi`.`warehouse_id` AS `warehouse_id`,sum(`spi`.`quantity_on_hand`) AS `total_quantity` from (`master_db`.`smartphone_spare_parts_inventory` `spi` join `master_db`.`smartphone_spare_parts` `sp` on(`spi`.`spare_part_id` = `sp`.`spare_part_id`)) where `sp`.`is_active` = 1 group by `spi`.`warehouse_id`) `spare_parts_inventory` on(`w`.`warehouse_id` = `spare_parts_inventory`.`warehouse_id`)) where `w`.`is_active` = 1 group by `w`.`warehouse_id`,`w`.`name` order by coalesce(`bulk_inventory`.`total_quantity`,0) + coalesce(`serialized_inventory`.`total_quantity`,0) + coalesce(`spare_parts_inventory`.`total_quantity`,0) desc;

-- VIEW: zone_bin_hierarchy
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `zone_bin_hierarchy` AS select `wz`.`zone_id` AS `zone_id`,`wz`.`warehouse_id` AS `warehouse_id`,`wz`.`name` AS `zone_name`,`wz`.`zone_type` AS `zone_type`,`wz`.`bin_prefix` AS `zone_bin_prefix`,`wz`.`max_bins` AS `max_bins`,`wz`.`require_bins` AS `require_bins`,`wz`.`capacity_limit` AS `zone_capacity_limit`,`wz`.`is_active` AS `zone_is_active`,count(distinct `bl`.`bin_id`) AS `total_bins`,count(distinct case when `bl`.`is_active` = 1 then `bl`.`bin_id` end) AS `active_bins`,coalesce(sum(`bl`.`max_capacity`),0) AS `total_bin_capacity`,coalesce(sum(`wpl`.`quantity`),0) AS `zone_inventory_quantity`,coalesce(sum(`wpl`.`reserved_quantity`),0) AS `zone_reserved_quantity`,coalesce(sum(`bi`.`quantity`),0) AS `bin_inventory_quantity`,coalesce(sum(`wpl`.`quantity`),0) + coalesce(sum(`bi`.`quantity`),0) AS `total_quantity`,case when `wz`.`capacity_limit` is not null and `wz`.`capacity_limit` > 0 then round((coalesce(sum(`wpl`.`quantity`),0) + coalesce(sum(`bi`.`quantity`),0)) / `wz`.`capacity_limit` * 100,2) else NULL end AS `zone_utilization_percent`,case when sum(`bl`.`max_capacity`) > 0 then round(coalesce(sum(`bi`.`quantity`),0) / sum(`bl`.`max_capacity`) * 100,2) else NULL end AS `bin_utilization_percent`,case when count(`bl`.`bin_id`) = 0 and `wz`.`require_bins` = 1 then 'bins_required' when count(`bl`.`bin_id`) = 0 then 'no_bins' when `wz`.`max_bins` is not null and count(`bl`.`bin_id`) >= `wz`.`max_bins` then 'bins_full' when coalesce(sum(`bi`.`quantity`),0) = 0 then 'bins_empty' else 'bins_active' end AS `bin_status` from (((`warehouse_zones` `wz` left join `bin_locations` `bl` on(`wz`.`zone_id` = `bl`.`zone_id`)) left join `warehouse_product_locations` `wpl` on(`wz`.`zone_id` = `wpl`.`zone_id`)) left join `bin_inventory` `bi` on(`bl`.`bin_id` = `bi`.`bin_id`)) group by `wz`.`zone_id`;

-- VIEW: zone_distribution_efficiency
CREATE ALGORITHM=UNDEFINED DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER VIEW `zone_distribution_efficiency` AS select `wz`.`zone_id` AS `zone_id`,`wz`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,`wz`.`name` AS `zone_name`,`wz`.`zone_type` AS `zone_type`,`wz`.`capacity_limit` AS `capacity_limit`,0 AS `current_quantity`,0 AS `utilization_percent`,'N/A - Use Staging' AS `efficiency_status`,0 AS `unique_products` from (`warehouse_zones` `wz` join `warehouses` `w` on(`wz`.`warehouse_id` = `w`.`warehouse_id`)) where `wz`.`is_active` = 1 and `w`.`is_active` = 1 group by `wz`.`zone_id`,`wz`.`warehouse_id`,`w`.`name`,`wz`.`name`,`wz`.`zone_type`,`wz`.`capacity_limit`;

