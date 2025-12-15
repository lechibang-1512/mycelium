/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-12.3.2-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: master_db
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
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory` (
  `inventory_type` enum('bulk','serialized','spare_part','batch') NOT NULL,
  `product_id` varchar(36) DEFAULT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `batch_no` varchar(100) DEFAULT NULL,
  `warehouse_id` varchar(36) NOT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `bin_id` varchar(36) DEFAULT NULL,
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
  `supplier_id` int(11) DEFAULT NULL,
  `import_invoice_id` int(11) DEFAULT NULL,
  `last_counted_at` datetime DEFAULT NULL,
  `last_counted_by` varchar(255) DEFAULT NULL,
  `last_movement_at` datetime DEFAULT NULL,
  `last_movement_type` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `id` char(36) NOT NULL,
  `spare_part_id` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `bin_id` (`bin_id`),
  KEY `idx_type_loc` (`inventory_type`,`warehouse_id`),
  KEY `idx_serial` (`serial_number`),
  KEY `idx_imei` (`imei_1`),
  CONSTRAINT `inventory_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `phone_specs` (`product_id`),
  CONSTRAINT `inventory_ibfk_3` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`),
  CONSTRAINT `inventory_ibfk_4` FOREIGN KEY (`bin_id`) REFERENCES `warehouse_bins` (`bin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `inventory` WRITE;
/*!40000 ALTER TABLE `inventory` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `inventory_log`
--

DROP TABLE IF EXISTS `inventory_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_log` (
  `product_id` char(36) DEFAULT NULL,
  `spare_part_id` char(36) DEFAULT NULL,
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
  `lot_id` varchar(50) DEFAULT NULL COMMENT 'Lot identifier for transaction tracking',
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
  `from_bin_id` char(36) DEFAULT NULL,
  `external_doc_no` varchar(100) DEFAULT NULL COMMENT 'Reference to external document (e.g. Supplier Invoice, DO) for traceability',
  `customer_name` varchar(255) DEFAULT NULL COMMENT 'Customer/Recipient name for outgoing transactions',
  `customer_address` text DEFAULT NULL COMMENT 'Customer/Recipient address',
  `delivery_person` varchar(255) DEFAULT NULL COMMENT 'Person who delivered/received the goods',
  `document_reference` varchar(255) DEFAULT NULL COMMENT 'Reference to source document (PO, Invoice, etc.)',
  `unit_of_measure` varchar(50) DEFAULT 'Unit' COMMENT 'Unit of measurement for the product',
  `doc_type` varchar(10) DEFAULT NULL COMMENT 'GRN for Stock In, GDN for Stock Out',
  `doc_number` varchar(50) DEFAULT NULL COMMENT 'Document number',
  `log_id` char(36) NOT NULL,
  `batch_id` char(36) DEFAULT NULL,
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
  KEY `idx_log_group` (`transaction_group_id`),
  KEY `idx_log_group_product` (`transaction_group_id`),
  KEY `idx_log_type_date` (`transaction_type`,`transaction_date`),
  KEY `fk_log_to_specs` (`product_id`),
  KEY `idx_spare_part_id` (`spare_part_id`),
  KEY `idx_condition` (`condition`),
  KEY `idx_log_warehouse` (`warehouse_id`),
  KEY `idx_log_from_warehouse` (`from_warehouse_id`),
  KEY `idx_log_warehouse_date` (`warehouse_id`,`transaction_date`),
  KEY `idx_log_bin` (`bin_id`),
  KEY `idx_customer_name` (`customer_name`),
  KEY `idx_document_ref` (`document_reference`),
  KEY `idx_inventory_log_doc` (`doc_type`,`doc_number`),
  KEY `idx_inventory_log_lot_id` (`lot_id`),
  KEY `idx_from_bin_id` (`from_bin_id`),
  CONSTRAINT `fk_log_to_bin` FOREIGN KEY (`bin_id`) REFERENCES `warehouse_bins` (`bin_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_log_to_specs` FOREIGN KEY (`product_id`) REFERENCES `phone_specs` (`product_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_log_to_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Unified transaction and inventory log table. Single source of truth for all inventory movements and receipts. Uses transaction_group_id to group related entries.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_log`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `inventory_log` WRITE;
/*!40000 ALTER TABLE `inventory_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_log` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `invoice_items`
--

DROP TABLE IF EXISTS `invoice_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_items` (
  `product_id` varchar(36) DEFAULT NULL,
  `spare_part_id` int(11) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `product_uuid` varchar(36) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `unit_name` varchar(50) DEFAULT NULL,
  `quantity` int(11) DEFAULT 1,
  `unit_price` decimal(15,2) DEFAULT 0.00,
  `total_price` decimal(15,2) DEFAULT NULL,
  `tax_rate` decimal(5,2) DEFAULT 10.00,
  `tax_amount` decimal(15,2) DEFAULT NULL,
  `discount_rate` decimal(5,2) DEFAULT 0.00,
  `discount_amount` decimal(15,2) DEFAULT NULL,
  `total_amount` decimal(15,2) DEFAULT NULL,
  `invoice_id` char(36) DEFAULT NULL,
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_items`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `invoice_items` WRITE;
/*!40000 ALTER TABLE `invoice_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoice_items` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `uuid` varchar(36) DEFAULT uuid(),
  `invoice_number` varchar(100) NOT NULL,
  `pattern_number` varchar(50) DEFAULT NULL,
  `serial_number` varchar(50) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `status` enum('draft','issued','paid','cancelled') DEFAULT 'draft',
  `verification_status` enum('PENDING','PARTIAL','VERIFIED') DEFAULT 'PENDING',
  `invoice_date` datetime DEFAULT NULL,
  `due_date` datetime DEFAULT NULL,
  `imported_at` datetime DEFAULT NULL,
  `subtotal` decimal(15,2) DEFAULT 0.00,
  `tax_rate` decimal(5,2) DEFAULT 10.00,
  `tax_amount` decimal(15,2) DEFAULT 0.00,
  `shipping_fee` decimal(15,2) DEFAULT 0.00,
  `discount_amount` decimal(15,2) DEFAULT 0.00,
  `total_amount` decimal(15,2) DEFAULT 0.00,
  `currency` varchar(10) DEFAULT 'VND',
  `payment_method` varchar(50) DEFAULT 'TM/CK',
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  UNIQUE KEY `uuid` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `phone_specs`
--

DROP TABLE IF EXISTS `phone_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `phone_specs` (
  `product_id` char(36) NOT NULL,
  `device_type` varchar(50) DEFAULT 'smartphone',
  `color` varchar(100) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `processor` varchar(255) DEFAULT NULL,
  `ram` varchar(50) DEFAULT NULL,
  `rom` varchar(50) DEFAULT NULL,
  `display_size` decimal(5,2) DEFAULT NULL,
  `resolution` varchar(50) DEFAULT NULL,
  `refresh_rate` varchar(50) DEFAULT NULL,
  `battery_capacity` varchar(50) DEFAULT NULL,
  `fast_charging` varchar(50) DEFAULT NULL,
  `rear_camera_main` varchar(100) DEFAULT NULL,
  `front_camera` varchar(100) DEFAULT NULL,
  `operating_system` varchar(100) DEFAULT NULL,
  `water_and_dust_rating` varchar(50) DEFAULT NULL,
  `nfc` varchar(50) DEFAULT NULL,
  `launch_date` datetime DEFAULT NULL,
  `end_of_life_date` datetime DEFAULT NULL,
  PRIMARY KEY (`product_id`),
  CONSTRAINT `fk_phone_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phone_specs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `phone_specs` WRITE;
/*!40000 ALTER TABLE `phone_specs` DISABLE KEYS */;
/*!40000 ALTER TABLE `phone_specs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `product_id` char(36) NOT NULL,
  `part_code` varchar(100) NOT NULL COMMENT 'Unified SKU or Part Code',
  `product_type` varchar(50) NOT NULL COMMENT 'e.g., CPU, GPU, PHONE, SPARE_PART, CABLE',
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `unit_cost` decimal(15,2) DEFAULT 0.00,
  `unit_price` decimal(15,2) DEFAULT 0.00,
  `currency` varchar(10) DEFAULT 'VND',
  `image_url` varchar(500) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 12,
  `reorder_point` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `part_code` (`part_code`),
  KEY `idx_product_type` (`product_type`),
  KEY `idx_category` (`category`),
  KEY `idx_manufacturer` (`manufacturer`),
  KEY `idx_products_active` (`is_active`,`product_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `repair_job_attachments`
--

DROP TABLE IF EXISTS `repair_job_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_job_attachments` (
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` enum('IMAGE','DOCUMENT','VIDEO','OTHER') DEFAULT 'IMAGE',
  `file_size_kb` int(11) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `attachment_category` enum('BEFORE_PHOTO','AFTER_PHOTO','INVOICE','QUOTE','DIAGNOSTIC_REPORT','WARRANTY_CARD','OTHER') DEFAULT 'OTHER',
  `description` text DEFAULT NULL,
  `uploaded_by` varchar(100) DEFAULT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp(),
  `attachment_id` char(36) NOT NULL,
  `repair_job_id` char(36) DEFAULT NULL,
  PRIMARY KEY (`attachment_id`),
  KEY `idx_category` (`attachment_category`),
  KEY `idx_file_type` (`file_type`),
  KEY `idx_uploaded_at` (`uploaded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='File attachments for repair jobs (photos, documents, etc.)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_job_attachments`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `repair_job_attachments` WRITE;
/*!40000 ALTER TABLE `repair_job_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `repair_job_attachments` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `repair_job_parts`
--

DROP TABLE IF EXISTS `repair_job_parts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_job_parts` (
  `spare_part_id` int(11) NOT NULL,
  `inventory_id` bigint(20) DEFAULT NULL,
  `quantity_used` int(11) DEFAULT 1,
  `unit_cost` decimal(15,2) DEFAULT 0.00,
  `total_cost` decimal(15,2) DEFAULT NULL,
  `installed_date` datetime DEFAULT current_timestamp(),
  `installed_by` varchar(255) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `repair_job_id` char(36) DEFAULT NULL,
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_job_parts`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `repair_job_parts` WRITE;
/*!40000 ALTER TABLE `repair_job_parts` DISABLE KEYS */;
/*!40000 ALTER TABLE `repair_job_parts` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `repair_job_templates`
--

DROP TABLE IF EXISTS `repair_job_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_job_templates` (
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
  `template_id` char(36) NOT NULL,
  PRIMARY KEY (`template_id`),
  KEY `idx_category` (`template_category`),
  KEY `idx_active` (`is_active`),
  KEY `idx_name` (`template_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reusable templates for common repair job types';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_job_templates`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `repair_job_templates` WRITE;
/*!40000 ALTER TABLE `repair_job_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `repair_job_templates` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `repair_jobs`
--

DROP TABLE IF EXISTS `repair_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_jobs` (
  `job_number` varchar(100) NOT NULL,
  `product_id` varchar(36) DEFAULT NULL,
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
  `warehouse_id` varchar(36) DEFAULT NULL,
  `received_date` datetime DEFAULT current_timestamp(),
  `estimated_completion_date` datetime DEFAULT NULL,
  `completion_date` datetime DEFAULT NULL,
  `delivered_date` datetime DEFAULT NULL,
  `cost_estimated` decimal(15,2) DEFAULT 0.00,
  `cost_parts` decimal(15,2) DEFAULT 0.00,
  `cost_labor` decimal(15,2) DEFAULT 0.00,
  `cost_final` decimal(15,2) DEFAULT 0.00,
  `cost_customer_charge` decimal(15,2) DEFAULT 0.00,
  `currency` varchar(10) DEFAULT 'USD',
  `tested_by` varchar(255) DEFAULT NULL,
  `test_results` text DEFAULT NULL,
  `quality_check_passed` tinyint(1) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 3,
  `warranty_expires_at` datetime DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `repair_job_id` char(36) NOT NULL,
  PRIMARY KEY (`repair_job_id`),
  UNIQUE KEY `job_number` (`job_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repair_jobs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `repair_jobs` WRITE;
/*!40000 ALTER TABLE `repair_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `repair_jobs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `rma_items`
--

DROP TABLE IF EXISTS `rma_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `rma_items` (
  `product_id` varchar(36) DEFAULT NULL,
  `spare_part_id` int(11) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `quantity` int(11) DEFAULT 1,
  `condition_detail` varchar(100) DEFAULT NULL,
  `disposition` varchar(50) DEFAULT NULL,
  `unit_value` decimal(15,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `rma_table_id` char(36) DEFAULT NULL,
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rma_items`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `rma_items` WRITE;
/*!40000 ALTER TABLE `rma_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `rma_items` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `rmas`
--

DROP TABLE IF EXISTS `rmas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `rmas` (
  `rma_id` varchar(36) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(50) DEFAULT NULL,
  `original_receipt_id` varchar(100) DEFAULT NULL,
  `original_transaction_date` datetime DEFAULT NULL,
  `reason_code` varchar(50) DEFAULT NULL,
  `reason_description` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `priority` varchar(50) DEFAULT 'medium',
  `warehouse_id` varchar(36) DEFAULT NULL,
  `quarantine_zone_id` int(11) DEFAULT NULL,
  `requested_by` int(11) DEFAULT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `expected_return_date` datetime DEFAULT NULL,
  `actual_return_date` datetime DEFAULT NULL,
  `inspection_date` datetime DEFAULT NULL,
  `completion_date` datetime DEFAULT NULL,
  `total_value` decimal(15,2) DEFAULT 0.00,
  `refund_amount` decimal(15,2) DEFAULT 0.00,
  `restocking_fee` decimal(15,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `internal_notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rma_id` (`rma_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rmas`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `rmas` WRITE;
/*!40000 ALTER TABLE `rmas` DISABLE KEYS */;
/*!40000 ALTER TABLE `rmas` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `spare_part_specs`
--

DROP TABLE IF EXISTS `spare_part_specs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `spare_part_specs` (
  `product_id` char(36) NOT NULL,
  `part_category` varchar(100) NOT NULL,
  `part_type` varchar(100) DEFAULT NULL,
  `compatible_product_id` varchar(36) DEFAULT NULL,
  `compatible_device_category` varchar(100) DEFAULT NULL,
  `compatible_brands` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`compatible_brands`)),
  `compatible_models` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`compatible_models`)),
  `dimensions` varchar(100) DEFAULT NULL,
  `weight_g` decimal(10,2) DEFAULT NULL,
  `color_variants` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`color_variants`)),
  `quality_grade` varchar(50) DEFAULT 'STANDARD',
  `is_hazardous` tinyint(1) DEFAULT 0,
  `requires_serial_tracking` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`product_id`),
  CONSTRAINT `fk_spare_part_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `spare_part_specs`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `spare_part_specs` WRITE;
/*!40000 ALTER TABLE `spare_part_specs` DISABLE KEYS */;
/*!40000 ALTER TABLE `spare_part_specs` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `stocktake_items`
--

DROP TABLE IF EXISTS `stocktake_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stocktake_items` (
  `product_id` char(36) DEFAULT NULL,
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
  `stocktake_id` char(36) DEFAULT NULL,
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_adjustment_receipt` (`adjustment_receipt_id`),
  KEY `idx_variance` (`variance`),
  KEY `idx_product` (`product_id`),
  CONSTRAINT `stocktake_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `phone_specs` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stocktake_items`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `stocktake_items` WRITE;
/*!40000 ALTER TABLE `stocktake_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `stocktake_items` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `stocktake_status_history`
--

DROP TABLE IF EXISTS `stocktake_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stocktake_status_history` (
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) NOT NULL,
  `changed_by` int(11) NOT NULL,
  `changed_at` timestamp NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL,
  `stocktake_id` char(36) DEFAULT NULL,
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_changed_at` (`changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stocktake_status_history`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `stocktake_status_history` WRITE;
/*!40000 ALTER TABLE `stocktake_status_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `stocktake_status_history` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `stocktakes`
--

DROP TABLE IF EXISTS `stocktakes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stocktakes` (
  `stocktake_uuid` char(36) DEFAULT NULL,
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
  `warehouse_id` char(36) DEFAULT NULL,
  `stocktake_id` char(36) NOT NULL,
  PRIMARY KEY (`stocktake_id`),
  UNIQUE KEY `stocktake_number` (`stocktake_number`),
  UNIQUE KEY `stocktake_uuid` (`stocktake_uuid`),
  KEY `idx_zone` (`zone_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at`),
  KEY `idx_stocktakes_scheduled` (`scheduled_for`,`status`),
  KEY `idx_stocktakes_count_type` (`count_type`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_stocktakes_uuid` (`stocktake_uuid`),
  CONSTRAINT `stocktakes_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stocktakes`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `stocktakes` WRITE;
/*!40000 ALTER TABLE `stocktakes` DISABLE KEYS */;
/*!40000 ALTER TABLE `stocktakes` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
  `rating` int(11) DEFAULT NULL CHECK (`rating` between 0 and 5),
  `brands` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`brands`)),
  `additional_contacts` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`additional_contacts`)),
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `supplier_id` char(36) NOT NULL,
  PRIMARY KEY (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `transaction_items`
--

DROP TABLE IF EXISTS `transaction_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction_items` (
  `transaction_group_id` varchar(100) DEFAULT NULL,
  `product_id` varchar(36) DEFAULT NULL,
  `spare_part_id` int(11) DEFAULT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `asset_id` int(11) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `quantity_changed` int(11) DEFAULT 0,
  `condition_status` varchar(50) DEFAULT 'NEW',
  `unit_cost` decimal(15,2) DEFAULT 0.00,
  `total_value` decimal(15,2) DEFAULT 0.00,
  `from_warehouse_id` varchar(36) DEFAULT NULL,
  `from_zone_id` int(11) DEFAULT NULL,
  `from_bin_id` varchar(36) DEFAULT NULL,
  `to_warehouse_id` varchar(36) DEFAULT NULL,
  `to_zone_id` int(11) DEFAULT NULL,
  `to_bin_id` varchar(36) DEFAULT NULL,
  `new_inventory_level` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `transaction_id` char(36) DEFAULT NULL,
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction_items`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `transaction_items` WRITE;
/*!40000 ALTER TABLE `transaction_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `transaction_items` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `transaction_group_id` varchar(100) NOT NULL,
  `receipt_id` varchar(100) DEFAULT NULL,
  `transaction_type` varchar(50) NOT NULL,
  `transaction_date` datetime DEFAULT current_timestamp(),
  `warehouse_id` varchar(36) DEFAULT NULL,
  `from_warehouse_id` varchar(36) DEFAULT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `bin_id` varchar(36) DEFAULT NULL,
  `subtotal` decimal(15,2) DEFAULT 0.00,
  `tax_amount` decimal(15,2) DEFAULT 0.00,
  `total_amount` decimal(15,2) DEFAULT 0.00,
  `shipping_fee` decimal(15,2) DEFAULT 0.00,
  `discount_amount` decimal(15,2) DEFAULT 0.00,
  `supplier_id` int(11) DEFAULT NULL,
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
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_date_type` (`transaction_date`,`transaction_type`),
  KEY `idx_group` (`transaction_group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Temporary table structure for view `view_inventory_summary`
--

DROP TABLE IF EXISTS `view_inventory_summary`;
/*!50001 DROP VIEW IF EXISTS `view_inventory_summary`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `view_inventory_summary` AS SELECT
 NULL AS `product_id`,
 NULL AS `device_name`,
 NULL AS `brand`,
 NULL AS `total_on_hand`,
 NULL AS `total_reserved`,
 NULL AS `available_to_promise`,
 NULL AS `warehouse_name`,
 NULL AS `warehouse_id` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `view_repair_jobs_augmented`
--

DROP TABLE IF EXISTS `view_repair_jobs_augmented`;
/*!50001 DROP VIEW IF EXISTS `view_repair_jobs_augmented`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `view_repair_jobs_augmented` AS SELECT
 NULL AS `repair_job_id`,
 NULL AS `job_number`,
 NULL AS `status`,
 NULL AS `priority`,
 NULL AS `customer_name`,
 NULL AS `device_name`,
 NULL AS `cost_estimated`,
 NULL AS `cost_final`,
 NULL AS `parts_count` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `view_transaction_ledger`
--

DROP TABLE IF EXISTS `view_transaction_ledger`;
/*!50001 DROP VIEW IF EXISTS `view_transaction_ledger`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `view_transaction_ledger` AS SELECT
 NULL AS `transaction_id`,
 NULL AS `transaction_date`,
 NULL AS `transaction_type`,
 NULL AS `from_warehouse`,
 NULL AS `to_warehouse`,
 NULL AS `product_id`,
 NULL AS `device_name`,
 NULL AS `quantity_changed`,
 NULL AS `total_value`,
 NULL AS `user_id`,
 NULL AS `notes` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `warehouse_bins`
--

DROP TABLE IF EXISTS `warehouse_bins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `warehouse_bins` (
  `warehouse_id` varchar(36) NOT NULL,
  `zone_id` int(11) NOT NULL,
  `bin_id` varchar(36) NOT NULL,
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
  `weight_capacity` decimal(10,2) DEFAULT NULL,
  `height_cm` decimal(10,2) DEFAULT NULL,
  `width_cm` decimal(10,2) DEFAULT NULL,
  `depth_cm` decimal(10,2) DEFAULT NULL,
  `temperature_controlled` tinyint(1) DEFAULT 0,
  `temperature_min` decimal(5,2) DEFAULT NULL,
  `temperature_max` decimal(5,2) DEFAULT NULL,
  `priority_level` varchar(50) DEFAULT 'normal',
  `accessibility_level` varchar(50) DEFAULT 'easy',
  `is_active` tinyint(1) DEFAULT 1,
  `notes` text DEFAULT NULL,
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bin_id` (`bin_id`),
  KEY `warehouse_id` (`warehouse_id`,`zone_id`),
  KEY `idx_bin_code` (`bin_code`),
  CONSTRAINT `warehouse_bins_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE CASCADE,
  CONSTRAINT `warehouse_bins_ibfk_2` FOREIGN KEY (`warehouse_id`, `zone_id`) REFERENCES `warehouse_zones` (`warehouse_id`, `zone_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warehouse_bins`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `warehouse_bins` WRITE;
/*!40000 ALTER TABLE `warehouse_bins` DISABLE KEYS */;
/*!40000 ALTER TABLE `warehouse_bins` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `warehouse_zones`
--

DROP TABLE IF EXISTS `warehouse_zones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `warehouse_zones` (
  `warehouse_id` varchar(36) NOT NULL,
  `zone_id` int(11) NOT NULL,
  `zone_uuid` varchar(36) DEFAULT NULL,
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
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_zone` (`warehouse_id`,`zone_id`),
  CONSTRAINT `warehouse_zones_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warehouse_zones`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `warehouse_zones` WRITE;
/*!40000 ALTER TABLE `warehouse_zones` DISABLE KEYS */;
/*!40000 ALTER TABLE `warehouse_zones` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `warehouses`
--

DROP TABLE IF EXISTS `warehouses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `warehouses` (
  `warehouse_id` varchar(36) NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warehouses`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `warehouses` WRITE;
/*!40000 ALTER TABLE `warehouses` DISABLE KEYS */;
/*!40000 ALTER TABLE `warehouses` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Final view structure for view `view_inventory_summary`
--

/*!50001 DROP VIEW IF EXISTS `view_inventory_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `view_inventory_summary` AS select `i`.`product_id` AS `product_id`,`p`.`name` AS `device_name`,`p`.`manufacturer` AS `brand`,sum(`i`.`quantity_on_hand`) AS `total_on_hand`,sum(`i`.`quantity_reserved`) AS `total_reserved`,sum(`i`.`quantity_on_hand`) - sum(coalesce(`i`.`quantity_reserved`,0)) AS `available_to_promise`,`w`.`name` AS `warehouse_name`,`i`.`warehouse_id` AS `warehouse_id` from ((`inventory` `i` join `products` `p` on(`i`.`product_id` = `p`.`product_id`)) join `warehouses` `w` on(`i`.`warehouse_id` = `w`.`warehouse_id`)) group by `i`.`product_id`,`i`.`warehouse_id`,`w`.`name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `view_repair_jobs_augmented`
--

/*!50001 DROP VIEW IF EXISTS `view_repair_jobs_augmented`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `view_repair_jobs_augmented` AS select `r`.`repair_job_id` AS `repair_job_id`,`r`.`job_number` AS `job_number`,`r`.`status` AS `status`,`r`.`priority` AS `priority`,`r`.`customer_name` AS `customer_name`,`r`.`device_name` AS `device_name`,`r`.`cost_estimated` AS `cost_estimated`,`r`.`cost_final` AS `cost_final`,count(`rp`.`id`) AS `parts_count` from (`repair_jobs` `r` left join `repair_job_parts` `rp` on(`r`.`repair_job_id` = `rp`.`repair_job_id`)) group by `r`.`repair_job_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `view_transaction_ledger`
--

/*!50001 DROP VIEW IF EXISTS `view_transaction_ledger`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `view_transaction_ledger` AS select `ti`.`transaction_group_id` AS `transaction_id`,`t`.`transaction_date` AS `transaction_date`,`t`.`transaction_type` AS `transaction_type`,`w_src`.`name` AS `from_warehouse`,`w_dst`.`name` AS `to_warehouse`,`ti`.`product_id` AS `product_id`,`p`.`name` AS `device_name`,`ti`.`quantity_changed` AS `quantity_changed`,`ti`.`total_value` AS `total_value`,`t`.`user_id` AS `user_id`,`t`.`notes` AS `notes` from ((((`transaction_items` `ti` join `transactions` `t` on(`ti`.`transaction_group_id` = `t`.`transaction_group_id`)) left join `warehouses` `w_src` on(`t`.`from_warehouse_id` = `w_src`.`warehouse_id`)) left join `warehouses` `w_dst` on(`t`.`warehouse_id` = `w_dst`.`warehouse_id`)) left join `products` `p` on(`ti`.`product_id` = `p`.`product_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-06-08  2:12:11
