/*M!999999\- enable the sandbox mode */
-- MariaDB dump 10.19-11.8.3-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: master_db
-- ------------------------------------------------------
-- Server version	11.8.3-MariaDB-0+deb13u1 from Debian
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
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */
;
--
-- Table structure for table `assets`
--

DROP TABLE IF EXISTS `assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `assets` (
  `asset_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned NOT NULL,
  `serial_number` varchar(255) NOT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `status` enum(
    'available',
    'reserved',
    'sold',
    'damaged',
    'returned',
    'scrapped',
    'in_repair',
    'quarantine'
  ) DEFAULT 'available',
  `purchase_cost` decimal(10, 2) DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `warranty_expiry` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`asset_id`),
  UNIQUE KEY `serial_number` (`serial_number`),
  KEY `idx_assets_product` (`product_id`),
  KEY `idx_assets_serial` (`serial_number`),
  KEY `idx_assets_warehouse` (`warehouse_id`),
  KEY `idx_assets_zone` (`zone_id`),
  KEY `idx_assets_status` (`status`),
  CONSTRAINT `fk_assets_product` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assets_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE
  SET NULL
) ENGINE = InnoDB AUTO_INCREMENT = 210 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `assets`
--

LOCK TABLES `assets` WRITE;
/*!40000 ALTER TABLE `assets` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `assets` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `audit_log` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `action_type` varchar(100) NOT NULL,
  `entity_type` varchar(100) DEFAULT NULL COMMENT 'Type of entity affected (e.g., product, order, rma)',
  `entity_id` varchar(100) DEFAULT NULL COMMENT 'ID of the affected entity',
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Previous values before change' CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'New values after change' CHECK (json_valid(`new_values`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`log_id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_action` (`action_type`),
  KEY `idx_audit_entity` (`entity_type`, `entity_id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `audit_log`
VALUES (
    1,
    NULL,
    'DATABASE_MIGRATION',
    'ABC_ANALYSIS',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Added ABC analysis tables and views for Pareto classification',
    '2025-12-10 11:08:27'
  ),
  (
    2,
    NULL,
    'DATABASE_MIGRATION',
    'ABC_ANALYSIS',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Added ABC analysis tables and views for Pareto classification',
    '2025-12-10 11:30:04'
  );
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `batch_tracking`
--

DROP TABLE IF EXISTS `batch_tracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `batch_tracking` (
  `batch_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned NOT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `batch_no` varchar(100) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `manufacture_date` date DEFAULT NULL COMMENT 'Manufacturing date of the batch',
  `expiry_date` date DEFAULT NULL COMMENT 'Expiration date of the batch',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`batch_id`),
  UNIQUE KEY `unique_batch_product_location` (`batch_no`, `product_id`, `warehouse_id`, `zone_id`),
  KEY `idx_batch_product` (`product_id`),
  KEY `idx_batch_warehouse` (`warehouse_id`),
  KEY `idx_batch_zone` (`zone_id`),
  KEY `idx_batch_expiry` (`expiry_date`),
  CONSTRAINT `fk_batch_to_specs` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_batch_to_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE
  SET NULL,
    CONSTRAINT `fk_batch_to_zone` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE
  SET NULL
) ENGINE = InnoDB AUTO_INCREMENT = 47 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Batch tracking for mid-value items. Tracks quantity per batch without individual serial numbers';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `batch_tracking`
--

LOCK TABLES `batch_tracking` WRITE;
/*!40000 ALTER TABLE `batch_tracking` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `batch_tracking` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Temporary table structure for view `bin_capacity_view`
--

DROP TABLE IF EXISTS `bin_capacity_view`;
/*!50001 DROP VIEW IF EXISTS `bin_capacity_view`*/
;
SET @saved_cs_client = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `bin_capacity_view` AS SELECT
 1 AS `bin_id`,
 1 AS `zone_id`,
 1 AS `bin_code`,
 1 AS `bin_type`,
 1 AS `aisle`,
 1 AS `rack`,
 1 AS `shelf`,
 1 AS `max_capacity`,
 1 AS `priority_level`,
 1 AS `accessibility_level`,
 1 AS `is_active`,
 1 AS `warehouse_id`,
 1 AS `zone_name`,
 1 AS `zone_type`,
 1 AS `zone_bin_prefix`,
 1 AS `warehouse_name`,
 1 AS `current_quantity`,
 1 AS `unique_products`,
 1 AS `available_capacity`,
 1 AS `utilization_percent`,
 1 AS `capacity_status`,
 1 AS `temperature_controlled`,
 1 AS `temperature_min`,
 1 AS `temperature_max`,
 1 AS `height_cm`,
 1 AS `width_cm`,
 1 AS `depth_cm`,
 1 AS `weight_capacity` */
;
SET character_set_client = @saved_cs_client;
--
-- Table structure for table `bin_inventory`
--

DROP TABLE IF EXISTS `bin_inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `bin_inventory` (
  `assignment_id` int(11) NOT NULL AUTO_INCREMENT,
  `bin_id` int(11) NOT NULL,
  `product_id` bigint(20) unsigned DEFAULT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `asset_id` int(11) DEFAULT NULL COMMENT 'Link to assets table',
  `quantity` int(11) DEFAULT 0,
  `assigned_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`assignment_id`),
  KEY `idx_bin_id` (`bin_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_batch_id` (`batch_id`),
  KEY `idx_bin_inv_asset` (`asset_id`),
  CONSTRAINT `fk_bin_inv_to_batch` FOREIGN KEY (`batch_id`) REFERENCES `batch_tracking` (`batch_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bin_inv_to_bin` FOREIGN KEY (`bin_id`) REFERENCES `bin_locations` (`bin_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bin_inv_to_product` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Product assignments to specific bin locations';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `bin_inventory`
--

LOCK TABLES `bin_inventory` WRITE;
/*!40000 ALTER TABLE `bin_inventory` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `bin_inventory`
VALUES (
    1,
    4,
    430,
    NULL,
    NULL,
    12,
    '2026-01-08 18:12:13',
    '2026-01-08 20:41:42'
  );
/*!40000 ALTER TABLE `bin_inventory` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `bin_locations`
--

DROP TABLE IF EXISTS `bin_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `bin_locations` (
  `bin_id` int(11) NOT NULL AUTO_INCREMENT,
  `zone_id` int(11) NOT NULL,
  `aisle` varchar(10) NOT NULL,
  `rack` varchar(10) NOT NULL,
  `shelf` varchar(10) NOT NULL,
  `bin_code` varchar(50) NOT NULL COMMENT 'e.g., A-01-B-03',
  `bin_type` enum('standard', 'cold', 'hazmat', 'bulk', 'small_parts') DEFAULT 'standard',
  `max_capacity` int(11) DEFAULT NULL COMMENT 'Maximum units this bin can hold',
  `is_active` tinyint(1) DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `bin_prefix` varchar(10) DEFAULT NULL COMMENT 'Zone-based bin prefix (e.g., RCV, STG, PCK)',
  `bin_sequence` int(11) DEFAULT NULL COMMENT 'Sequential number within zone',
  `physical_location` text DEFAULT NULL COMMENT 'Physical description/directions to bin',
  `temperature_controlled` tinyint(1) DEFAULT 0 COMMENT 'Whether bin has temperature control',
  `temperature_min` decimal(5, 2) DEFAULT NULL COMMENT 'Minimum temperature (Celsius)',
  `temperature_max` decimal(5, 2) DEFAULT NULL COMMENT 'Maximum temperature (Celsius)',
  `weight_capacity` decimal(10, 2) DEFAULT NULL COMMENT 'Maximum weight capacity (kg)',
  `height_cm` decimal(10, 2) DEFAULT NULL COMMENT 'Bin height in centimeters',
  `width_cm` decimal(10, 2) DEFAULT NULL COMMENT 'Bin width in centimeters',
  `depth_cm` decimal(10, 2) DEFAULT NULL COMMENT 'Bin depth in centimeters',
  `priority_level` enum('low', 'normal', 'high', 'critical') DEFAULT 'normal' COMMENT 'Picking priority level',
  `accessibility_level` enum('easy', 'moderate', 'difficult', 'restricted') DEFAULT 'easy' COMMENT 'How easy to access bin',
  PRIMARY KEY (`bin_id`),
  UNIQUE KEY `unique_bin_code` (`zone_id`, `bin_code`),
  KEY `idx_bin_zone` (`zone_id`),
  KEY `idx_bin_active` (`is_active`),
  KEY `idx_bin_prefix` (`bin_prefix`),
  KEY `idx_bin_sequence` (`bin_sequence`),
  KEY `idx_bin_priority` (`priority_level`),
  CONSTRAINT `fk_bin_to_zone` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 5 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Physical bin locations within warehouse zones for precise inventory placement';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `bin_locations`
--

LOCK TABLES `bin_locations` WRITE;
/*!40000 ALTER TABLE `bin_locations` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `bin_locations`
VALUES (
    4,
    652,
    'A1',
    'A2',
    'A3',
    'B001',
    'standard',
    1000,
    1,
    '',
    '2026-01-08 18:12:02',
    '2026-01-08 20:54:15',
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'normal',
    'easy'
  );
/*!40000 ALTER TABLE `bin_locations` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `cycle_count_schedules`
--

DROP TABLE IF EXISTS `cycle_count_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `cycle_count_schedules` (
  `schedule_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `count_type` enum('random', 'location', 'cycle') DEFAULT 'cycle',
  `frequency` enum(
    'daily',
    'weekly',
    'bi_weekly',
    'monthly',
    'quarterly'
  ) DEFAULT 'monthly',
  `items_per_count` int(11) DEFAULT 50,
  `is_active` tinyint(1) DEFAULT 1,
  `last_run_at` datetime DEFAULT NULL,
  `next_run_at` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`schedule_id`),
  KEY `fk_ccs_warehouse` (`warehouse_id`),
  KEY `idx_schedule_next` (`is_active`, `next_run_at`),
  CONSTRAINT `fk_ccs_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE
  SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `cycle_count_schedules`
--

LOCK TABLES `cycle_count_schedules` WRITE;
/*!40000 ALTER TABLE `cycle_count_schedules` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `cycle_count_schedules` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `device_spare_parts_assignment`
--

DROP TABLE IF EXISTS `device_spare_parts_assignment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `device_spare_parts_assignment` (
  `assignment_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned NOT NULL COMMENT 'Device from specs_db',
  `spare_part_id` int(11) NOT NULL,
  `is_required` tinyint(1) DEFAULT 0 COMMENT 'Is this part essential for this device',
  `installation_complexity` enum('EASY', 'MODERATE', 'DIFFICULT', 'EXPERT') DEFAULT 'MODERATE',
  `estimated_install_time_minutes` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`assignment_id`),
  UNIQUE KEY `unique_device_part` (`product_id`, `spare_part_id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_spare_part` (`spare_part_id`),
  CONSTRAINT `fk_assignment_device` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assignment_spare_part` FOREIGN KEY (`spare_part_id`) REFERENCES `smartphone_spare_parts` (`spare_part_id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Links specific devices to compatible spare parts';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `device_spare_parts_assignment`
--

LOCK TABLES `device_spare_parts_assignment` WRITE;
/*!40000 ALTER TABLE `device_spare_parts_assignment` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `device_spare_parts_assignment` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `email_notification_settings`
--

DROP TABLE IF EXISTS `email_notification_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `email_notification_settings` (
  `setting_id` int(11) NOT NULL AUTO_INCREMENT,
  `event_type` enum(
    'JOB_CREATED',
    'STATUS_CHANGED',
    'TECHNICIAN_ASSIGNED',
    'JOB_COMPLETED',
    'JOB_OVERDUE',
    'PARTS_ORDERED'
  ) NOT NULL,
  `notify_customer` tinyint(1) DEFAULT 1,
  `notify_technician` tinyint(1) DEFAULT 1,
  `notify_admin` tinyint(1) DEFAULT 0,
  `admin_email` varchar(255) DEFAULT NULL,
  `email_subject_template` varchar(500) DEFAULT NULL,
  `email_body_template` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `unique_event_type` (`event_type`),
  KEY `idx_active` (`is_active`)
) ENGINE = InnoDB AUTO_INCREMENT = 7 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Email notification configuration for repair job events';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `email_notification_settings`
--

LOCK TABLES `email_notification_settings` WRITE;
/*!40000 ALTER TABLE `email_notification_settings` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `email_notification_settings`
VALUES (
    1,
    'JOB_CREATED',
    1,
    0,
    0,
    NULL,
    'Repair Job Created - {{job_number}}',
    'Dear {{customer_name}},\n\nYour repair job has been created.\n\nJob Number: {{job_number}}\nDevice: {{device_name}}\nIssue: {{issue_description}}\nEstimated Cost: ${{estimated_cost}}\n\nWe will keep you updated on the progress.\n\nThank you!',
    1,
    '2025-12-27 17:57:24',
    '2025-12-27 17:57:24'
  ),
  (
    2,
    'STATUS_CHANGED',
    1,
    0,
    0,
    NULL,
    'Repair Job Status Update - {{job_number}}',
    'Dear {{customer_name}},\n\nYour repair job status has been updated.\n\nJob Number: {{job_number}}\nNew Status: {{new_status}}\nDevice: {{device_name}}\n\nThank you!',
    1,
    '2025-12-27 17:57:24',
    '2025-12-27 17:57:24'
  ),
  (
    3,
    'TECHNICIAN_ASSIGNED',
    0,
    1,
    0,
    NULL,
    'New Repair Job Assigned - {{job_number}}',
    'Hello {{technician_name}},\n\nA new repair job has been assigned to you.\n\nJob Number: {{job_number}}\nDevice: {{device_name}}\nIssue: {{issue_description}}\nPriority: {{priority}}\n\nPlease review and start work.\n\nThank you!',
    1,
    '2025-12-27 17:57:24',
    '2025-12-27 17:57:24'
  ),
  (
    4,
    'JOB_COMPLETED',
    1,
    0,
    0,
    NULL,
    'Repair Job Completed - {{job_number}}',
    'Dear {{customer_name}},\n\nGreat news! Your repair job is complete and ready for pickup.\n\nJob Number: {{job_number}}\nDevice: {{device_name}}\nFinal Cost: ${{final_cost}}\nWarranty: {{warranty_months}} months\n\nPlease visit us to collect your device.\n\nThank you!',
    1,
    '2025-12-27 17:57:24',
    '2025-12-27 17:57:24'
  ),
  (
    5,
    'JOB_OVERDUE',
    0,
    1,
    1,
    NULL,
    'Overdue Repair Job Alert - {{job_number}}',
    'Alert: Repair job is overdue.\n\nJob Number: {{job_number}}\nDevice: {{device_name}}\nCustomer: {{customer_name}}\nEstimated Completion: {{estimated_completion_date}}\nDays Overdue: {{days_overdue}}\n\nPlease prioritize this job.',
    1,
    '2025-12-27 17:57:24',
    '2025-12-27 17:57:24'
  ),
  (
    6,
    'PARTS_ORDERED',
    0,
    1,
    0,
    NULL,
    'Parts Ordered for Repair Job - {{job_number}}',
    'Hello {{technician_name}},\n\nParts have been ordered for repair job {{job_number}}.\n\nDevice: {{device_name}}\nParts will arrive soon. Job status updated to PARTS_ORDERED.\n\nThank you!',
    1,
    '2025-12-27 17:57:24',
    '2025-12-27 17:57:24'
  );
/*!40000 ALTER TABLE `email_notification_settings` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Temporary table structure for view `expiring_batches`
--

DROP TABLE IF EXISTS `expiring_batches`;
/*!50001 DROP VIEW IF EXISTS `expiring_batches`*/
;
SET @saved_cs_client = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `expiring_batches` AS SELECT
 1 AS `batch_id`,
 1 AS `batch_no`,
 1 AS `product_id`,
 1 AS `product_name`,
 1 AS `brand`,
 1 AS `warehouse_id`,
 1 AS `warehouse_name`,
 1 AS `zone_id`,
 1 AS `zone_name`,
 1 AS `quantity`,
 1 AS `manufacture_date`,
 1 AS `expiry_date`,
 1 AS `days_until_expiry`,
 1 AS `expiry_status` */
;
SET character_set_client = @saved_cs_client;
--
-- Table structure for table `inventory_log`
--

DROP TABLE IF EXISTS `inventory_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `inventory_log` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned DEFAULT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `asset_id` int(11) DEFAULT NULL COMMENT 'Liên kết đến bảng assets hợp nhất',
  `transaction_type` enum(
    'incoming',
    'outgoing',
    'transfer',
    'rma_return',
    'rma_disposition',
    'zone_transfer_out',
    'zone_transfer_in',
    'zone_to_bin',
    'bin_to_zone',
    'bin_transfer',
    'bin_deletion_return'
  ) NOT NULL,
  `quantity_changed` int(11) DEFAULT NULL COMMENT 'Null for single-asset movements',
  `transaction_date` datetime DEFAULT current_timestamp(),
  `from_warehouse_id` int(11) DEFAULT NULL COMMENT 'Source warehouse for transfers',
  `from_zone_id` int(11) DEFAULT NULL COMMENT 'Source zone for transfers',
  `warehouse_id` int(11) DEFAULT NULL COMMENT 'Destination warehouse',
  `zone_id` int(11) DEFAULT NULL COMMENT 'Destination zone',
  `receipt_id` varchar(50) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `unit_cost` decimal(10, 2) DEFAULT NULL COMMENT 'Unit cost at time of transaction',
  `total_value` decimal(12, 2) DEFAULT NULL COMMENT 'Total value of transaction',
  `batch_no` varchar(100) DEFAULT NULL COMMENT 'Batch number for tracking',
  `expiry_date` date DEFAULT NULL COMMENT 'Expiry date for batch items',
  `new_inventory_level` int(11) DEFAULT NULL COMMENT 'Inventory level after transaction',
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `serial_number` varchar(100) DEFAULT NULL COMMENT 'Serial number for serialized items',
  `reference_id` int(11) DEFAULT NULL COMMENT 'Reference ID (e.g., RMA ID)',
  `subtotal` decimal(10, 2) DEFAULT 0.00 COMMENT 'Subtotal for multi-item transactions',
  `tax_amount` decimal(10, 2) DEFAULT 0.00 COMMENT 'Tax amount for transaction',
  `total_amount` decimal(10, 2) DEFAULT 0.00 COMMENT 'Total amount for transaction',
  `transaction_group_id` varchar(50) DEFAULT NULL COMMENT 'Groups related log entries from same receipt',
  `item_sequence` int(11) DEFAULT NULL COMMENT 'Item order within transaction group',
  PRIMARY KEY (`log_id`),
  KEY `idx_log_product` (`product_id`),
  KEY `idx_log_warehouse` (`warehouse_id`),
  KEY `idx_log_from_warehouse` (`from_warehouse_id`),
  KEY `idx_log_zone` (`zone_id`),
  KEY `idx_log_receipt` (`receipt_id`),
  KEY `idx_log_supplier` (`supplier_id`),
  KEY `idx_log_transaction_type` (`transaction_type`),
  KEY `idx_log_transaction_date` (`transaction_date`),
  KEY `idx_log_unit_cost` (`unit_cost`),
  KEY `idx_log_batch_no` (`batch_no`),
  KEY `idx_log_asset` (`asset_id`),
  KEY `idx_log_date_type` (`transaction_date`, `transaction_type`),
  KEY `idx_log_product_date` (`product_id`, `transaction_date`),
  KEY `idx_log_warehouse_date` (`warehouse_id`, `transaction_date`),
  KEY `idx_log_supplier_date` (`supplier_id`, `transaction_date`),
  KEY `idx_inventory_log_date_type` (`transaction_date`, `transaction_type`),
  KEY `idx_inventory_log_product_date` (`product_id`, `transaction_date`),
  KEY `idx_inventory_log_outgoing` (
    `transaction_type`,
    `transaction_date`,
    `product_id`
  ),
  KEY `fk_log_to_batch` (`batch_id`),
  KEY `idx_log_group` (`transaction_group_id`),
  KEY `idx_log_group_product` (`transaction_group_id`, `product_id`),
  KEY `idx_log_type_date` (`transaction_type`, `transaction_date`),
  CONSTRAINT `fk_log_to_batch` FOREIGN KEY (`batch_id`) REFERENCES `batch_tracking` (`batch_id`) ON DELETE
  SET NULL,
    CONSTRAINT `fk_log_to_specs` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE
  SET NULL,
    CONSTRAINT `fk_log_to_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE
  SET NULL,
    CONSTRAINT `fk_log_to_zone` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE
  SET NULL
) ENGINE = InnoDB AUTO_INCREMENT = 1694 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Unified transaction and inventory log table. Single source of truth for all inventory movements and receipts. Uses transaction_group_id to group related entries.';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `inventory_log`
--

LOCK TABLES `inventory_log` WRITE;
/*!40000 ALTER TABLE `inventory_log` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `inventory_log`
VALUES (
    1384,
    430,
    NULL,
    NULL,
    'zone_to_bin',
    1,
    '2026-01-08 20:41:42',
    NULL,
    NULL,
    729,
    652,
    NULL,
    NULL,
    NULL,
    'Moved from zone \'Z1\' to bin \'B001\'',
    '2026-01-08 20:41:42',
    NULL,
    0.00,
    NULL,
    NULL,
    NULL,
    '2026-01-08 20:41:42',
    NULL,
    NULL,
    0.00,
    0.00,
    0.00,
    NULL,
    NULL
  ),
  (
    1494,
    430,
    NULL,
    NULL,
    'outgoing',
    -121,
    '2026-01-13 18:12:03',
    NULL,
    NULL,
    729,
    652,
    'OUT-20260113-00001',
    NULL,
    NULL,
    NULL,
    '2026-01-13 18:12:03',
    NULL,
    21296.00,
    NULL,
    NULL,
    70,
    '2026-01-13 18:12:03',
    NULL,
    NULL,
    19360.00,
    1936.00,
    21296.00,
    'OUT-20260113-00001',
    1
  ),
  (
    1501,
    NULL,
    NULL,
    NULL,
    'incoming',
    3,
    '2026-01-13 20:58:02',
    NULL,
    NULL,
    NULL,
    NULL,
    'IN-20260113-00003',
    1,
    NULL,
    NULL,
    '2026-01-13 20:58:02',
    100.00,
    310.00,
    NULL,
    NULL,
    3,
    '2026-01-13 20:58:02',
    NULL,
    NULL,
    300.00,
    10.00,
    310.00,
    'IN-20260113-00003',
    1
  ),
  (
    1502,
    NULL,
    NULL,
    159,
    'incoming',
    1,
    '2026-01-13 20:58:57',
    NULL,
    NULL,
    NULL,
    NULL,
    'IN-20260113-00004',
    1,
    NULL,
    NULL,
    '2026-01-13 20:58:57',
    100.00,
    103.33,
    NULL,
    NULL,
    NULL,
    '2026-01-13 20:58:57',
    NULL,
    NULL,
    100.00,
    3.33,
    103.33,
    'IN-20260113-00004',
    1
  ),
  (
    1503,
    NULL,
    NULL,
    160,
    'incoming',
    1,
    '2026-01-13 20:58:57',
    NULL,
    NULL,
    NULL,
    NULL,
    'IN-20260113-00004',
    1,
    NULL,
    NULL,
    '2026-01-13 20:58:57',
    100.00,
    103.33,
    NULL,
    NULL,
    NULL,
    '2026-01-13 20:58:57',
    NULL,
    NULL,
    100.00,
    3.33,
    103.33,
    'IN-20260113-00004',
    1
  ),
  (
    1504,
    NULL,
    NULL,
    161,
    'incoming',
    1,
    '2026-01-13 20:58:57',
    NULL,
    NULL,
    NULL,
    NULL,
    'IN-20260113-00004',
    1,
    NULL,
    NULL,
    '2026-01-13 20:58:57',
    100.00,
    103.33,
    NULL,
    NULL,
    NULL,
    '2026-01-13 20:58:57',
    NULL,
    NULL,
    100.00,
    3.33,
    103.33,
    'IN-20260113-00004',
    1
  ),
  (
    1505,
    NULL,
    NULL,
    162,
    'incoming',
    1,
    '2026-01-13 21:00:11',
    NULL,
    NULL,
    NULL,
    NULL,
    'IN-20260113-00005',
    1,
    NULL,
    NULL,
    '2026-01-13 21:00:11',
    100.00,
    103.33,
    NULL,
    NULL,
    NULL,
    '2026-01-13 21:00:11',
    NULL,
    NULL,
    100.00,
    3.33,
    103.33,
    'IN-20260113-00005',
    1
  ),
  (
    1506,
    NULL,
    NULL,
    163,
    'incoming',
    1,
    '2026-01-13 21:00:11',
    NULL,
    NULL,
    NULL,
    NULL,
    'IN-20260113-00005',
    1,
    NULL,
    NULL,
    '2026-01-13 21:00:11',
    100.00,
    103.33,
    NULL,
    NULL,
    NULL,
    '2026-01-13 21:00:11',
    NULL,
    NULL,
    100.00,
    3.33,
    103.33,
    'IN-20260113-00005',
    1
  ),
  (
    1507,
    NULL,
    NULL,
    164,
    'incoming',
    1,
    '2026-01-13 21:00:11',
    NULL,
    NULL,
    NULL,
    NULL,
    'IN-20260113-00005',
    1,
    NULL,
    NULL,
    '2026-01-13 21:00:11',
    100.00,
    103.33,
    NULL,
    NULL,
    NULL,
    '2026-01-13 21:00:11',
    NULL,
    NULL,
    100.00,
    3.33,
    103.33,
    'IN-20260113-00005',
    1
  ),
  (
    1508,
    NULL,
    NULL,
    165,
    'incoming',
    1,
    '2026-01-13 21:00:49',
    NULL,
    NULL,
    NULL,
    NULL,
    'IN-20260113-00006',
    1,
    NULL,
    NULL,
    '2026-01-13 21:00:49',
    100.00,
    103.33,
    NULL,
    NULL,
    NULL,
    '2026-01-13 21:00:49',
    NULL,
    NULL,
    100.00,
    3.33,
    103.33,
    'IN-20260113-00006',
    1
  ),
  (
    1509,
    NULL,
    NULL,
    166,
    'incoming',
    1,
    '2026-01-13 21:00:49',
    NULL,
    NULL,
    NULL,
    NULL,
    'IN-20260113-00006',
    1,
    NULL,
    NULL,
    '2026-01-13 21:00:49',
    100.00,
    103.33,
    NULL,
    NULL,
    NULL,
    '2026-01-13 21:00:49',
    NULL,
    NULL,
    100.00,
    3.33,
    103.33,
    'IN-20260113-00006',
    1
  ),
  (
    1510,
    NULL,
    NULL,
    167,
    'incoming',
    1,
    '2026-01-13 21:00:49',
    NULL,
    NULL,
    NULL,
    NULL,
    'IN-20260113-00006',
    1,
    NULL,
    NULL,
    '2026-01-13 21:00:49',
    100.00,
    103.33,
    NULL,
    NULL,
    NULL,
    '2026-01-13 21:00:49',
    NULL,
    NULL,
    100.00,
    3.33,
    103.33,
    'IN-20260113-00006',
    1
  ),
  (
    1511,
    NULL,
    NULL,
    168,
    'incoming',
    1,
    '2026-01-13 21:01:23',
    NULL,
    NULL,
    NULL,
    NULL,
    'IN-20260113-00007',
    1,
    NULL,
    NULL,
    '2026-01-13 21:01:23',
    100.00,
    103.33,
    NULL,
    NULL,
    NULL,
    '2026-01-13 21:01:23',
    NULL,
    NULL,
    100.00,
    3.33,
    103.33,
    'IN-20260113-00007',
    1
  ),
  (
    1512,
    NULL,
    NULL,
    169,
    'incoming',
    1,
    '2026-01-13 21:01:23',
    NULL,
    NULL,
    NULL,
    NULL,
    'IN-20260113-00007',
    1,
    NULL,
    NULL,
    '2026-01-13 21:01:23',
    100.00,
    103.33,
    NULL,
    NULL,
    NULL,
    '2026-01-13 21:01:23',
    NULL,
    NULL,
    100.00,
    3.33,
    103.33,
    'IN-20260113-00007',
    1
  ),
  (
    1513,
    NULL,
    NULL,
    170,
    'incoming',
    1,
    '2026-01-13 21:01:23',
    NULL,
    NULL,
    NULL,
    NULL,
    'IN-20260113-00007',
    1,
    NULL,
    NULL,
    '2026-01-13 21:01:23',
    100.00,
    103.33,
    NULL,
    NULL,
    NULL,
    '2026-01-13 21:01:23',
    NULL,
    NULL,
    100.00,
    3.33,
    103.33,
    'IN-20260113-00007',
    1
  ),
  (
    1527,
    NULL,
    NULL,
    NULL,
    'outgoing',
    -5,
    '2026-01-13 21:40:32',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    NULL,
    'Used Part #35 in Repair Job TEST-RPR-001',
    '2026-01-13 21:40:32',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-13 21:40:32',
    NULL,
    69,
    0.00,
    0.00,
    0.00,
    NULL,
    NULL
  ),
  (
    1528,
    NULL,
    NULL,
    NULL,
    'outgoing',
    -5,
    '2026-01-13 21:41:39',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    NULL,
    'Used Part #37 in Repair Job TEST-RPR-001',
    '2026-01-13 21:41:39',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-13 21:41:39',
    NULL,
    70,
    0.00,
    0.00,
    0.00,
    NULL,
    NULL
  ),
  (
    1529,
    NULL,
    NULL,
    NULL,
    'outgoing',
    -5,
    '2026-01-13 21:42:07',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    NULL,
    'Used Part #38 in Repair Job TEST-RPR-001',
    '2026-01-13 21:42:07',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-13 21:42:07',
    NULL,
    71,
    0.00,
    0.00,
    0.00,
    NULL,
    NULL
  ),
  (
    1530,
    NULL,
    NULL,
    NULL,
    'outgoing',
    -5,
    '2026-01-13 21:42:35',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    NULL,
    'Used Part #39 in Repair Job TEST-RPR-001',
    '2026-01-13 21:42:35',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-13 21:42:35',
    NULL,
    72,
    0.00,
    0.00,
    0.00,
    NULL,
    NULL
  ),
  (
    1531,
    NULL,
    NULL,
    NULL,
    'incoming',
    5,
    '2026-01-13 21:42:35',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    NULL,
    'Restored Part #39 from Repair Job TEST-RPR-001',
    '2026-01-13 21:42:35',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-13 21:42:35',
    NULL,
    72,
    0.00,
    0.00,
    0.00,
    NULL,
    NULL
  ),
  (
    1532,
    NULL,
    NULL,
    NULL,
    'outgoing',
    -5,
    '2026-01-13 21:43:12',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    NULL,
    'Used Part #40 in Repair Job TEST-RPR-001',
    '2026-01-13 21:43:12',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-13 21:43:12',
    NULL,
    73,
    0.00,
    0.00,
    0.00,
    NULL,
    NULL
  ),
  (
    1533,
    NULL,
    NULL,
    NULL,
    'incoming',
    5,
    '2026-01-13 21:43:12',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    NULL,
    'Restored Part #40 from Repair Job TEST-RPR-001',
    '2026-01-13 21:43:12',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-13 21:43:12',
    NULL,
    73,
    0.00,
    0.00,
    0.00,
    NULL,
    NULL
  ),
  (
    1534,
    NULL,
    NULL,
    NULL,
    'outgoing',
    -5,
    '2026-01-14 10:18:54',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    NULL,
    'Used Part #41 in Repair Job TEST-RPR-001',
    '2026-01-14 10:18:54',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-14 10:18:54',
    NULL,
    75,
    0.00,
    0.00,
    0.00,
    NULL,
    NULL
  ),
  (
    1535,
    NULL,
    NULL,
    NULL,
    'incoming',
    5,
    '2026-01-14 10:18:54',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    NULL,
    'Restored Part #41 from Repair Job TEST-RPR-001',
    '2026-01-14 10:18:54',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-14 10:18:54',
    NULL,
    75,
    0.00,
    0.00,
    0.00,
    NULL,
    NULL
  ),
  (
    1536,
    NULL,
    NULL,
    NULL,
    'outgoing',
    -5,
    '2026-01-14 10:39:25',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    NULL,
    'Used Part #42 in Repair Job TEST-RPR-001',
    '2026-01-14 10:39:25',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-14 10:39:25',
    NULL,
    77,
    0.00,
    0.00,
    0.00,
    NULL,
    NULL
  ),
  (
    1537,
    NULL,
    NULL,
    NULL,
    'outgoing',
    -1,
    '2026-01-14 10:45:24',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    NULL,
    'Used Part #9 in Repair Job RPR-2026-00001',
    '2026-01-14 10:45:24',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-14 10:45:24',
    NULL,
    76,
    0.00,
    0.00,
    0.00,
    NULL,
    NULL
  ),
  (
    1538,
    NULL,
    NULL,
    NULL,
    'incoming',
    10,
    '2026-01-14 14:16:35',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Initial inventory',
    '2026-01-14 14:16:35',
    NULL,
    0.00,
    NULL,
    NULL,
    10,
    '2026-01-14 14:16:35',
    NULL,
    NULL,
    0.00,
    0.00,
    0.00,
    NULL,
    NULL
  ),
  (
    1571,
    647,
    NULL,
    NULL,
    'incoming',
    12,
    '2026-01-25 01:07:09',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    478,
    NULL,
    '2026-01-25 01:07:09',
    100.00,
    1260.00,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:07:09',
    NULL,
    NULL,
    1200.00,
    60.00,
    1260.00,
    'LOG-1571',
    1
  ),
  (
    1572,
    NULL,
    NULL,
    NULL,
    'incoming',
    100,
    '2026-01-25 01:49:12',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    766,
    NULL,
    '2026-01-25 01:49:12',
    50.00,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:49:12',
    NULL,
    NULL,
    0.00,
    0.00,
    5000.00,
    'REC-1769280552423',
    NULL
  ),
  (
    1573,
    NULL,
    NULL,
    NULL,
    'incoming',
    3,
    '2026-01-25 01:49:12',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    766,
    NULL,
    '2026-01-25 01:49:12',
    800.00,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:49:12',
    NULL,
    NULL,
    0.00,
    0.00,
    2400.00,
    'REC-1769280552429',
    NULL
  ),
  (
    1574,
    NULL,
    NULL,
    NULL,
    'incoming',
    50,
    '2026-01-25 01:49:12',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    766,
    NULL,
    '2026-01-25 01:49:12',
    10.00,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:49:12',
    NULL,
    NULL,
    0.00,
    0.00,
    500.00,
    'REC-1769280552434',
    NULL
  ),
  (
    1575,
    NULL,
    NULL,
    NULL,
    'incoming',
    1,
    '2026-01-25 01:49:12',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:49:12',
    10.00,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:49:12',
    NULL,
    NULL,
    0.00,
    0.00,
    10.00,
    'REC-1769280552439',
    NULL
  ),
  (
    1576,
    NULL,
    NULL,
    NULL,
    'incoming',
    50,
    '2026-01-25 01:49:12',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    766,
    NULL,
    '2026-01-25 01:49:12',
    25.00,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:49:12',
    NULL,
    NULL,
    0.00,
    0.00,
    1250.00,
    'REC-1769280552444',
    NULL
  ),
  (
    1578,
    NULL,
    NULL,
    NULL,
    'incoming',
    50,
    '2026-01-25 01:49:12',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    766,
    NULL,
    '2026-01-25 01:49:12',
    25.00,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:49:12',
    NULL,
    NULL,
    0.00,
    0.00,
    1250.00,
    'REC-1769280552453',
    NULL
  ),
  (
    1580,
    NULL,
    NULL,
    NULL,
    'incoming',
    100,
    '2026-01-25 01:49:12',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    766,
    NULL,
    '2026-01-25 01:49:12',
    25.00,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:49:12',
    NULL,
    NULL,
    0.00,
    0.00,
    2500.00,
    'REC-1769280552468',
    NULL
  ),
  (
    1581,
    NULL,
    NULL,
    NULL,
    'incoming',
    75,
    '2026-01-25 01:49:12',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    766,
    NULL,
    '2026-01-25 01:49:12',
    20.00,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:49:12',
    NULL,
    NULL,
    0.00,
    0.00,
    1500.00,
    'REC-1769280552485',
    NULL
  ),
  (
    1582,
    NULL,
    NULL,
    NULL,
    'incoming',
    50,
    '2026-01-25 01:49:25',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    767,
    NULL,
    '2026-01-25 01:49:25',
    50.00,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:49:25',
    NULL,
    NULL,
    0.00,
    0.00,
    2500.00,
    'REC-1769280565705',
    NULL
  ),
  (
    1586,
    NULL,
    NULL,
    NULL,
    'incoming',
    100,
    '2026-01-25 01:52:24',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    769,
    NULL,
    '2026-01-25 01:52:24',
    50.00,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:52:24',
    NULL,
    NULL,
    0.00,
    0.00,
    5000.00,
    'REC-1769280744271',
    NULL
  ),
  (
    1587,
    NULL,
    NULL,
    NULL,
    'incoming',
    3,
    '2026-01-25 01:52:24',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    769,
    NULL,
    '2026-01-25 01:52:24',
    800.00,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:52:24',
    NULL,
    NULL,
    0.00,
    0.00,
    2400.00,
    'REC-1769280744277',
    NULL
  ),
  (
    1588,
    NULL,
    NULL,
    NULL,
    'incoming',
    50,
    '2026-01-25 01:52:24',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    769,
    NULL,
    '2026-01-25 01:52:24',
    10.00,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:52:24',
    NULL,
    NULL,
    0.00,
    0.00,
    500.00,
    'REC-1769280744281',
    NULL
  ),
  (
    1589,
    NULL,
    NULL,
    NULL,
    'incoming',
    1,
    '2026-01-25 01:52:24',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:52:24',
    10.00,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:52:24',
    NULL,
    NULL,
    0.00,
    0.00,
    10.00,
    'REC-1769280744285',
    NULL
  ),
  (
    1590,
    NULL,
    NULL,
    NULL,
    'incoming',
    50,
    '2026-01-25 01:52:24',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    769,
    NULL,
    '2026-01-25 01:52:24',
    25.00,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:52:24',
    NULL,
    NULL,
    0.00,
    0.00,
    1250.00,
    'REC-1769280744291',
    NULL
  ),
  (
    1592,
    NULL,
    NULL,
    NULL,
    'incoming',
    50,
    '2026-01-25 01:52:24',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    769,
    NULL,
    '2026-01-25 01:52:24',
    25.00,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:52:24',
    NULL,
    NULL,
    0.00,
    0.00,
    1250.00,
    'REC-1769280744300',
    NULL
  ),
  (
    1594,
    NULL,
    NULL,
    NULL,
    'incoming',
    100,
    '2026-01-25 01:52:24',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    769,
    NULL,
    '2026-01-25 01:52:24',
    25.00,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:52:24',
    NULL,
    NULL,
    0.00,
    0.00,
    2500.00,
    'REC-1769280744313',
    NULL
  ),
  (
    1595,
    NULL,
    NULL,
    NULL,
    'incoming',
    75,
    '2026-01-25 01:52:24',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    769,
    NULL,
    '2026-01-25 01:52:24',
    20.00,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:52:24',
    NULL,
    NULL,
    0.00,
    0.00,
    1500.00,
    'REC-1769280744326',
    NULL
  ),
  (
    1596,
    NULL,
    NULL,
    NULL,
    'incoming',
    50,
    '2026-01-25 01:52:37',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    770,
    NULL,
    '2026-01-25 01:52:37',
    50.00,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 01:52:37',
    NULL,
    NULL,
    0.00,
    0.00,
    2500.00,
    'REC-1769280757580',
    NULL
  ),
  (
    1647,
    NULL,
    NULL,
    NULL,
    'incoming',
    10,
    '2026-01-25 02:04:37',
    NULL,
    NULL,
    NULL,
    NULL,
    'REC-260124-0003',
    1,
    NULL,
    NULL,
    '2026-01-25 02:04:37',
    100.00,
    1050.00,
    NULL,
    NULL,
    10,
    '2026-01-25 02:04:37',
    NULL,
    NULL,
    1000.00,
    50.00,
    1050.00,
    'REC-260124-0003',
    1
  ),
  (
    1648,
    NULL,
    NULL,
    NULL,
    'incoming',
    10,
    '2026-01-25 02:04:50',
    NULL,
    NULL,
    NULL,
    NULL,
    'REC-260124-0004',
    1,
    NULL,
    NULL,
    '2026-01-25 02:04:50',
    100.00,
    1050.00,
    NULL,
    NULL,
    10,
    '2026-01-25 02:04:50',
    NULL,
    NULL,
    1000.00,
    50.00,
    1050.00,
    'REC-260124-0004',
    1
  ),
  (
    1650,
    NULL,
    NULL,
    NULL,
    'incoming',
    10,
    '2026-01-25 02:05:21',
    NULL,
    NULL,
    NULL,
    NULL,
    'REC-260124-0006',
    1,
    NULL,
    'Test Receive Legacy',
    '2026-01-25 02:05:21',
    100.00,
    1050.00,
    NULL,
    NULL,
    10,
    '2026-01-25 02:05:21',
    NULL,
    NULL,
    1000.00,
    50.00,
    1050.00,
    'REC-260124-0006',
    1
  ),
  (
    1654,
    NULL,
    NULL,
    NULL,
    'incoming',
    50,
    '2026-01-25 02:06:25',
    NULL,
    NULL,
    NULL,
    NULL,
    'REC-260124-0004',
    NULL,
    NULL,
    NULL,
    '2026-01-25 02:06:25',
    25.00,
    1250.00,
    NULL,
    NULL,
    50,
    '2026-01-25 02:06:25',
    NULL,
    NULL,
    1250.00,
    0.00,
    1250.00,
    'REC-260124-0004',
    1
  ),
  (
    1655,
    NULL,
    NULL,
    NULL,
    'incoming',
    20,
    '2026-01-25 02:06:25',
    NULL,
    NULL,
    NULL,
    NULL,
    'REC-260124-0005',
    NULL,
    NULL,
    NULL,
    '2026-01-25 02:06:25',
    25.00,
    500.00,
    NULL,
    NULL,
    70,
    '2026-01-25 02:06:25',
    NULL,
    NULL,
    500.00,
    0.00,
    500.00,
    'REC-260124-0005',
    1
  ),
  (
    1656,
    NULL,
    NULL,
    NULL,
    'incoming',
    50,
    '2026-01-25 02:08:19',
    NULL,
    NULL,
    NULL,
    NULL,
    'REC-260124-0006',
    NULL,
    NULL,
    NULL,
    '2026-01-25 02:08:19',
    25.00,
    1250.00,
    NULL,
    NULL,
    50,
    '2026-01-25 02:08:19',
    NULL,
    NULL,
    1250.00,
    0.00,
    1250.00,
    'REC-260124-0006',
    1
  ),
  (
    1657,
    NULL,
    NULL,
    NULL,
    'incoming',
    20,
    '2026-01-25 02:08:20',
    NULL,
    NULL,
    NULL,
    NULL,
    'REC-260124-0007',
    NULL,
    NULL,
    NULL,
    '2026-01-25 02:08:20',
    25.00,
    500.00,
    NULL,
    NULL,
    70,
    '2026-01-25 02:08:20',
    NULL,
    NULL,
    500.00,
    0.00,
    500.00,
    'REC-260124-0007',
    1
  ),
  (
    1671,
    NULL,
    NULL,
    NULL,
    'incoming',
    10,
    '2026-01-25 02:08:33',
    NULL,
    NULL,
    NULL,
    NULL,
    'REC-260124-0008',
    1,
    NULL,
    'Test Receive Legacy',
    '2026-01-25 02:08:33',
    100.00,
    1050.00,
    NULL,
    NULL,
    10,
    '2026-01-25 02:08:33',
    NULL,
    NULL,
    1000.00,
    50.00,
    1050.00,
    'REC-260124-0008',
    1
  ),
  (
    1672,
    NULL,
    NULL,
    NULL,
    'incoming',
    5,
    '2026-01-25 02:08:33',
    NULL,
    NULL,
    NULL,
    NULL,
    'REC-260124-0009',
    888,
    NULL,
    'Test Receive Modern',
    '2026-01-25 02:08:33',
    200.00,
    1020.00,
    NULL,
    NULL,
    5,
    '2026-01-25 02:08:33',
    NULL,
    NULL,
    1000.00,
    20.00,
    1020.00,
    'REC-260124-0009',
    1
  ),
  (
    1675,
    NULL,
    NULL,
    NULL,
    'incoming',
    10,
    '2026-01-25 02:08:35',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Initial inventory',
    '2026-01-25 02:08:35',
    NULL,
    0.00,
    NULL,
    NULL,
    10,
    '2026-01-25 02:08:35',
    NULL,
    NULL,
    0.00,
    0.00,
    0.00,
    NULL,
    NULL
  ),
  (
    1679,
    NULL,
    NULL,
    NULL,
    'incoming',
    10,
    '2026-01-25 02:20:53',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Initial inventory',
    '2026-01-25 02:20:53',
    NULL,
    0.00,
    NULL,
    NULL,
    10,
    '2026-01-25 02:20:53',
    NULL,
    NULL,
    0.00,
    0.00,
    0.00,
    NULL,
    NULL
  ),
  (
    1680,
    NULL,
    NULL,
    NULL,
    'incoming',
    10,
    '2026-01-25 02:22:01',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Initial inventory',
    '2026-01-25 02:22:01',
    NULL,
    0.00,
    NULL,
    NULL,
    10,
    '2026-01-25 02:22:01',
    NULL,
    NULL,
    0.00,
    0.00,
    0.00,
    NULL,
    NULL
  ),
  (
    1681,
    NULL,
    NULL,
    NULL,
    'incoming',
    50,
    '2026-01-25 02:23:07',
    NULL,
    NULL,
    NULL,
    NULL,
    'REC-260124-0010',
    NULL,
    NULL,
    NULL,
    '2026-01-25 02:23:07',
    25.00,
    1250.00,
    NULL,
    NULL,
    50,
    '2026-01-25 02:23:07',
    NULL,
    NULL,
    1250.00,
    0.00,
    1250.00,
    'REC-260124-0010',
    1
  ),
  (
    1682,
    NULL,
    NULL,
    NULL,
    'incoming',
    20,
    '2026-01-25 02:23:07',
    NULL,
    NULL,
    NULL,
    NULL,
    'REC-260124-0011',
    NULL,
    NULL,
    NULL,
    '2026-01-25 02:23:07',
    25.00,
    500.00,
    NULL,
    NULL,
    70,
    '2026-01-25 02:23:07',
    NULL,
    NULL,
    500.00,
    0.00,
    500.00,
    'REC-260124-0011',
    1
  );
/*!40000 ALTER TABLE `inventory_log` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Temporary table structure for view `inventory_movement_tracking`
--

DROP TABLE IF EXISTS `inventory_movement_tracking`;
/*!50001 DROP VIEW IF EXISTS `inventory_movement_tracking`*/
;
SET @saved_cs_client = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `inventory_movement_tracking` AS SELECT
 1 AS `log_id`,
 1 AS `transaction_date`,
 1 AS `transaction_type`,
 1 AS `product_id`,
 1 AS `product_name`,
 1 AS `brand`,
 1 AS `quantity_changed`,
 1 AS `warehouse_id`,
 1 AS `warehouse_name`,
 1 AS `zone_id`,
 1 AS `zone_name`,
 1 AS `batch_id`,
 1 AS `batch_no`,
 1 AS `serial_number`,
 1 AS `notes`,
 1 AS `user_id`,
 1 AS `created_at` */
;
SET character_set_client = @saved_cs_client;
--
-- Temporary table structure for view `inventory_overview`
--

DROP TABLE IF EXISTS `inventory_overview`;
/*!50001 DROP VIEW IF EXISTS `inventory_overview`*/
;
SET @saved_cs_client = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `inventory_overview` AS SELECT
 1 AS `product_id`,
 1 AS `device_name`,
 1 AS `device_maker`,
 1 AS `device_price`,
 1 AS `warehouse_id`,
 1 AS `warehouse_name`,
 1 AS `zone_id`,
 1 AS `zone_name`,
 1 AS `zone_type`,
 1 AS `warehouse_quantity`,
 1 AS `reserved_quantity`,
 1 AS `available_quantity` */
;
SET character_set_client = @saved_cs_client;
--
-- Temporary table structure for view `low_staging_inventory_alerts`
--

DROP TABLE IF EXISTS `low_staging_inventory_alerts`;
/*!50001 DROP VIEW IF EXISTS `low_staging_inventory_alerts`*/
;
SET @saved_cs_client = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `low_staging_inventory_alerts` AS SELECT
 1 AS `product_id`,
 1 AS `device_name`,
 1 AS `device_maker`,
 1 AS `device_price`,
 1 AS `staging_quantity`,
 1 AS `min_stock_level`,
 1 AS `shortage_quantity`,
 1 AS `alert_level`,
 1 AS `total_warehouse_quantity`,
 1 AS `default_supplier_id`,
 1 AS `default_supplier_name`,
 1 AS `email`,
 1 AS `phone` */
;
SET character_set_client = @saved_cs_client;
--
-- Temporary table structure for view `low_stock_alerts`
--

DROP TABLE IF EXISTS `low_stock_alerts`;
/*!50001 DROP VIEW IF EXISTS `low_stock_alerts`*/
;
SET @saved_cs_client = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `low_stock_alerts` AS SELECT
 1 AS `location_id`,
 1 AS `product_id`,
 1 AS `device_name`,
 1 AS `device_maker`,
 1 AS `device_price`,
 1 AS `warehouse_id`,
 1 AS `warehouse_name`,
 1 AS `zone_id`,
 1 AS `zone_name`,
 1 AS `warehouse_quantity`,
 1 AS `staging_quantity`,
 1 AS `current_quantity`,
 1 AS `reserved_quantity`,
 1 AS `available_quantity`,
 1 AS `min_stock_level`,
 1 AS `shortage_quantity`,
 1 AS `alert_level`,
 1 AS `last_updated` */
;
SET character_set_client = @saved_cs_client;
--
-- Table structure for table `product_count_history`
--

DROP TABLE IF EXISTS `product_count_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `product_count_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `last_counted_at` datetime NOT NULL,
  `last_stocktake_id` int(11) NOT NULL,
  `count_result` enum('match', 'variance', 'adjusted') NOT NULL,
  `variance_qty` decimal(10, 2) DEFAULT 0.00,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_location` (`product_id`, `warehouse_id`, `zone_id`),
  KEY `idx_last_counted` (`last_counted_at`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `fk_pch_stocktake` (`last_stocktake_id`),
  CONSTRAINT `fk_pch_product` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pch_stocktake` FOREIGN KEY (`last_stocktake_id`) REFERENCES `stocktakes` (`stocktake_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pch_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `product_count_history`
--

LOCK TABLES `product_count_history` WRITE;
/*!40000 ALTER TABLE `product_count_history` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `product_count_history` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Temporary table structure for view `product_inventory_computed`
--

DROP TABLE IF EXISTS `product_inventory_computed`;
/*!50001 DROP VIEW IF EXISTS `product_inventory_computed`*/
;
SET @saved_cs_client = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `product_inventory_computed` AS SELECT
 1 AS `product_id`,
 1 AS `device_name`,
 1 AS `device_maker`,
 1 AS `device_price`,
 1 AS `total_inventory`,
 1 AS `bulk_inventory`,
 1 AS `serialized_inventory`,
 1 AS `bin_inventory`,
 1 AS `reserved_quantity`,
 1 AS `available_inventory`,
 1 AS `reorder_point`,
 1 AS `reorder_quantity`,
 1 AS `safety_stock`,
 1 AS `stock_status` */
;
SET character_set_client = @saved_cs_client;
--
-- Table structure for table `reorder_recommendations`
--

DROP TABLE IF EXISTS `reorder_recommendations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `reorder_recommendations` (
  `recommendation_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned NOT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `current_stock` decimal(10, 2) NOT NULL,
  `reorder_point` decimal(10, 2) NOT NULL,
  `recommended_quantity` decimal(10, 2) NOT NULL,
  `urgency_level` enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
  `estimated_stockout_date` date DEFAULT NULL,
  `recommendation_reason` text DEFAULT NULL,
  `status` enum('PENDING', 'ACKNOWLEDGED', 'ORDERED', 'DISMISSED') DEFAULT 'PENDING',
  `acknowledged_by` int(11) DEFAULT NULL,
  `acknowledged_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`recommendation_id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_status` (`status`),
  KEY `idx_urgency` (`urgency_level`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `reorder_recommendations_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `reorder_recommendations_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 48 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `reorder_recommendations`
--

LOCK TABLES `reorder_recommendations` WRITE;
/*!40000 ALTER TABLE `reorder_recommendations` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `reorder_recommendations`
VALUES (
    43,
    430,
    NULL,
    0.00,
    0.00,
    1.00,
    'CRITICAL',
    NULL,
    'Consider restocking',
    'ACKNOWLEDGED',
    1,
    '2026-01-08 17:24:41',
    '2025-12-22 11:13:05',
    '2026-01-08 10:24:41'
  );
/*!40000 ALTER TABLE `reorder_recommendations` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `repair_job_attachments`
--

DROP TABLE IF EXISTS `repair_job_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `repair_job_attachments` (
  `attachment_id` int(11) NOT NULL AUTO_INCREMENT,
  `repair_job_id` int(11) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` enum('IMAGE', 'DOCUMENT', 'VIDEO', 'OTHER') DEFAULT 'IMAGE',
  `file_size_kb` int(11) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `attachment_category` enum(
    'BEFORE_PHOTO',
    'AFTER_PHOTO',
    'INVOICE',
    'QUOTE',
    'DIAGNOSTIC_REPORT',
    'WARRANTY_CARD',
    'OTHER'
  ) DEFAULT 'OTHER',
  `description` text DEFAULT NULL,
  `uploaded_by` varchar(100) DEFAULT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`attachment_id`),
  KEY `idx_repair_job` (`repair_job_id`),
  KEY `idx_category` (`attachment_category`),
  KEY `idx_file_type` (`file_type`),
  KEY `idx_uploaded_at` (`uploaded_at`),
  CONSTRAINT `repair_job_attachments_ibfk_1` FOREIGN KEY (`repair_job_id`) REFERENCES `smartphone_repair_jobs` (`repair_job_id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'File attachments for repair jobs (photos, documents, etc.)';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `repair_job_attachments`
--

LOCK TABLES `repair_job_attachments` WRITE;
/*!40000 ALTER TABLE `repair_job_attachments` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `repair_job_attachments` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `repair_job_parts_usage`
--

DROP TABLE IF EXISTS `repair_job_parts_usage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `repair_job_parts_usage` (
  `usage_id` int(11) NOT NULL AUTO_INCREMENT,
  `repair_job_id` int(11) NOT NULL,
  `spare_part_id` int(11) NOT NULL,
  `inventory_id` int(11) DEFAULT NULL COMMENT 'Specific inventory item used',
  `quantity_used` int(11) NOT NULL DEFAULT 1,
  `unit_cost` decimal(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Cost at time of use',
  `total_cost` decimal(10, 2) GENERATED ALWAYS AS (`quantity_used` * `unit_cost`) STORED,
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
  CONSTRAINT `fk_usage_to_inventory` FOREIGN KEY (`inventory_id`) REFERENCES `smartphone_spare_parts_inventory` (`inventory_id`) ON DELETE
  SET NULL,
    CONSTRAINT `fk_usage_to_repair_job` FOREIGN KEY (`repair_job_id`) REFERENCES `smartphone_repair_jobs` (`repair_job_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_usage_to_spare_part` FOREIGN KEY (`spare_part_id`) REFERENCES `smartphone_spare_parts` (`spare_part_id`),
    CONSTRAINT `chk_quantity_used_positive` CHECK (`quantity_used` > 0)
) ENGINE = InnoDB AUTO_INCREMENT = 36 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Tracks which spare parts were used in each repair job';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `repair_job_parts_usage`
--

LOCK TABLES `repair_job_parts_usage` WRITE;
/*!40000 ALTER TABLE `repair_job_parts_usage` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `repair_job_parts_usage`
VALUES (
    35,
    78,
    52,
    NULL,
    1000,
    50.00,
    50000.00,
    '2026-01-25 02:08:33',
    NULL,
    NULL,
    NULL,
    '2026-01-25 02:08:33'
  );
/*!40000 ALTER TABLE `repair_job_parts_usage` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
/*!50003 SET @saved_cs_client      = @@character_set_client */
;
/*!50003 SET @saved_cs_results     = @@character_set_results */
;
/*!50003 SET @saved_col_connection = @@collation_connection */
;
/*!50003 SET character_set_client  = utf8mb4 */
;
/*!50003 SET character_set_results = utf8mb4 */
;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */
;
/*!50003 SET @saved_sql_mode       = @@sql_mode */
;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */
;
DELIMITER;
;
/*!50003 CREATE*/
/*!50017 DEFINER=`lechibang`@`localhost`*/
/*!50003 TRIGGER `trg_update_repair_job_costs`
 AFTER INSERT ON `repair_job_parts_usage`
 FOR EACH ROW
 BEGIN
 UPDATE smartphone_repair_jobs
 SET parts_cost = (
 SELECT SUM(total_cost)
 FROM repair_job_parts_usage
 WHERE repair_job_id = NEW.repair_job_id
 )
 WHERE repair_job_id = NEW.repair_job_id;
 END */
;
;
DELIMITER;
/*!50003 SET sql_mode              = @saved_sql_mode */
;
/*!50003 SET character_set_client  = @saved_cs_client */
;
/*!50003 SET character_set_results = @saved_cs_results */
;
/*!50003 SET collation_connection  = @saved_col_connection */
;
/*!50003 SET @saved_cs_client      = @@character_set_client */
;
/*!50003 SET @saved_cs_results     = @@character_set_results */
;
/*!50003 SET @saved_col_connection = @@collation_connection */
;
/*!50003 SET character_set_client  = utf8mb4 */
;
/*!50003 SET character_set_results = utf8mb4 */
;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */
;
/*!50003 SET @saved_sql_mode       = @@sql_mode */
;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */
;
DELIMITER;
;
/*!50003 CREATE*/
/*!50017 DEFINER=`lechibang`@`localhost`*/
/*!50003 TRIGGER `trg_decrease_inventory_on_usage`
 AFTER INSERT ON `repair_job_parts_usage`
 FOR EACH ROW
 BEGIN
 IF NEW.inventory_id IS NOT NULL THEN
 UPDATE smartphone_spare_parts_inventory
 SET quantity_on_hand = quantity_on_hand - NEW.quantity_used,
 last_movement_at = CURRENT_TIMESTAMP,
 last_movement_type = 'ISSUE'
 WHERE inventory_id = NEW.inventory_id;
 END IF;
 END */
;
;
DELIMITER;
/*!50003 SET sql_mode              = @saved_sql_mode */
;
/*!50003 SET character_set_client  = @saved_cs_client */
;
/*!50003 SET character_set_results = @saved_cs_results */
;
/*!50003 SET collation_connection  = @saved_col_connection */
;
--
-- Table structure for table `repair_job_status_history`
--

DROP TABLE IF EXISTS `repair_job_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `repair_job_status_history` (
  `history_id` int(11) NOT NULL AUTO_INCREMENT,
  `repair_job_id` int(11) NOT NULL,
  `from_status` enum(
    'PENDING',
    'DIAGNOSED',
    'PARTS_ORDERED',
    'IN_PROGRESS',
    'TESTING',
    'COMPLETED',
    'DELIVERED',
    'CANCELLED'
  ) DEFAULT NULL,
  `to_status` enum(
    'PENDING',
    'DIAGNOSED',
    'PARTS_ORDERED',
    'IN_PROGRESS',
    'TESTING',
    'COMPLETED',
    'DELIVERED',
    'CANCELLED'
  ) NOT NULL,
  `changed_by` varchar(100) DEFAULT NULL,
  `change_reason` text DEFAULT NULL,
  `changed_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`history_id`),
  KEY `idx_repair_job` (`repair_job_id`),
  KEY `idx_changed_at` (`changed_at`),
  KEY `idx_to_status` (`to_status`),
  CONSTRAINT `repair_job_status_history_ibfk_1` FOREIGN KEY (`repair_job_id`) REFERENCES `smartphone_repair_jobs` (`repair_job_id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 7 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Audit trail for repair job status changes';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `repair_job_status_history`
--

LOCK TABLES `repair_job_status_history` WRITE;
/*!40000 ALTER TABLE `repair_job_status_history` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `repair_job_status_history` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `repair_job_templates`
--

DROP TABLE IF EXISTS `repair_job_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `repair_job_templates` (
  `template_id` int(11) NOT NULL AUTO_INCREMENT,
  `template_name` varchar(255) NOT NULL,
  `template_category` enum(
    'SCREEN_REPAIR',
    'BATTERY_REPLACEMENT',
    'CHARGING_PORT',
    'WATER_DAMAGE',
    'SOFTWARE_ISSUE',
    'CAMERA_REPAIR',
    'SPEAKER_REPAIR',
    'BUTTON_REPAIR',
    'OTHER'
  ) DEFAULT 'OTHER',
  `description` text DEFAULT NULL,
  `default_priority` enum('LOW', 'NORMAL', 'HIGH', 'URGENT') DEFAULT 'NORMAL',
  `estimated_cost` decimal(10, 2) DEFAULT 0.00,
  `estimated_labor_cost` decimal(10, 2) DEFAULT 0.00,
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
) ENGINE = InnoDB AUTO_INCREMENT = 6 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Reusable templates for common repair job types';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `repair_job_templates`
--

LOCK TABLES `repair_job_templates` WRITE;
/*!40000 ALTER TABLE `repair_job_templates` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `repair_job_templates`
VALUES (
    1,
    'Screen Replacement - Standard',
    'SCREEN_REPAIR',
    'Standard screen replacement for most smartphone models',
    'NORMAL',
    150.00,
    50.00,
    2,
    NULL,
    NULL,
    'Screen cracked/damaged. Display functional: Yes/No. Touch responsive: Yes/No.',
    'Replaced screen assembly. Tested display and touch functionality. Quality check passed.',
    3,
    1,
    '2025-12-27 17:57:08',
    '2025-12-27 17:57:08',
    NULL
  ),
  (
    2,
    'Battery Replacement - Standard',
    'BATTERY_REPLACEMENT',
    'Standard battery replacement service',
    'NORMAL',
    80.00,
    30.00,
    1,
    NULL,
    NULL,
    'Battery health degraded. Current capacity: ___%. Device shuts down unexpectedly: Yes/No.',
    'Replaced battery. Tested charging and power management. Calibrated battery.',
    6,
    1,
    '2025-12-27 17:57:08',
    '2025-12-27 17:57:08',
    NULL
  ),
  (
    3,
    'Charging Port Repair',
    'CHARGING_PORT',
    'Charging port cleaning or replacement',
    'HIGH',
    60.00,
    40.00,
    1,
    NULL,
    NULL,
    'Charging port not working. Physical damage visible: Yes/No. Debris present: Yes/No.',
    'Cleaned/replaced charging port. Tested with multiple cables. Charging functional.',
    3,
    1,
    '2025-12-27 17:57:08',
    '2025-12-27 17:57:08',
    NULL
  ),
  (
    4,
    'Water Damage Assessment',
    'WATER_DAMAGE',
    'Complete water damage diagnostic and repair',
    'URGENT',
    200.00,
    100.00,
    4,
    NULL,
    NULL,
    'Device exposed to liquid. Liquid indicators triggered: Yes/No. Device powers on: Yes/No.',
    'Disassembled device. Cleaned corrosion. Replaced damaged components. Tested all functions.',
    1,
    1,
    '2025-12-27 17:57:08',
    '2025-12-27 17:57:08',
    NULL
  ),
  (
    5,
    'Software Issue - General',
    'SOFTWARE_ISSUE',
    'Software troubleshooting and repair',
    'NORMAL',
    50.00,
    50.00,
    2,
    NULL,
    NULL,
    'Software malfunction. Symptoms: ___. Boot loop: Yes/No. Factory reset attempted: Yes/No.',
    'Diagnosed software issue. Performed factory reset/firmware update. Restored functionality.',
    1,
    1,
    '2025-12-27 17:57:08',
    '2025-12-27 17:57:08',
    NULL
  );
/*!40000 ALTER TABLE `repair_job_templates` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `rma`
--

DROP TABLE IF EXISTS `rma`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `rma` (
  `rma_number` varchar(50) NOT NULL COMMENT 'Unique RMA identifier (e.g., RMA-000001)',
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(50) DEFAULT NULL,
  `original_receipt_id` varchar(50) DEFAULT NULL,
  `original_transaction_date` datetime DEFAULT NULL,
  `reason_code` enum(
    'defective',
    'damaged',
    'wrong_item',
    'customer_remorse',
    'warranty',
    'other'
  ) DEFAULT 'other',
  `reason_description` text DEFAULT NULL,
  `status` enum(
    'pending',
    'awaiting_receipt',
    'received',
    'inspecting',
    'approved',
    'rejected',
    'completed',
    'cancelled'
  ) DEFAULT 'pending',
  `priority` enum('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  `warehouse_id` int(11) NOT NULL,
  `quarantine_zone_id` int(11) DEFAULT NULL,
  `requested_by` int(11) NOT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `expected_return_date` date DEFAULT NULL,
  `actual_return_date` datetime DEFAULT NULL,
  `inspection_date` datetime DEFAULT NULL,
  `completion_date` datetime DEFAULT NULL,
  `total_value` decimal(12, 2) DEFAULT 0.00,
  `refund_amount` decimal(12, 2) DEFAULT 0.00,
  `restocking_fee` decimal(10, 2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `internal_notes` text DEFAULT NULL,
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '[]' COMMENT 'Array of RMA items' CHECK (json_valid(`items`)),
  `status_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '[]' COMMENT 'Array of status changes' CHECK (json_valid(`status_history`)),
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '[]' COMMENT 'Array of file attachments' CHECK (json_valid(`attachments`)),
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`rma_number`),
  KEY `idx_status` (`status`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_priority` (`priority`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_customer` (`customer_name`, `customer_email`),
  KEY `idx_assigned_to` (`assigned_to`),
  KEY `idx_requested_by` (`requested_by`),
  KEY `fk_rma_zone` (`quarantine_zone_id`),
  CONSTRAINT `fk_rma_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`),
  CONSTRAINT `fk_rma_zone` FOREIGN KEY (`quarantine_zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE
  SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Unified RMA table with JSON for items, history, and attachments';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `rma`
--

LOCK TABLES `rma` WRITE;
/*!40000 ALTER TABLE `rma` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `rma`
VALUES (
    'RMA-000001',
    'Bang',
    NULL,
    NULL,
    NULL,
    NULL,
    'defective',
    NULL,
    'completed',
    'low',
    729,
    652,
    1,
    NULL,
    '2026-01-12',
    '2026-01-13 11:52:21',
    '2026-01-13 11:52:24',
    '2026-01-13 11:52:35',
    160.00,
    0.00,
    0.00,
    NULL,
    NULL,
    '[{\"item_id\":1,\"product_id\":430,\"device_identifier\":\"121212\",\"device_name\":\"realme P3 Lite\",\"batch_no\":null,\"quantity_requested\":1,\"quantity_received\":0,\"quantity_approved\":0,\"unit_price\":160,\"total_price\":160,\"condition_on_receipt\":null,\"disposition\":\"repair\",\"disposition_notes\":null,\"inspection_result\":\"pending\",\"inspection_notes\":null,\"inspected_by\":null,\"inspected_at\":null,\"repair_job_id\":61,\"notes\":null,\"created_at\":\"2026-01-10T04:40:52.846Z\",\"repair_link\":{\"linked_by\":1,\"link_reason\":\"created_with_repair_job\",\"notes\":\"Linked during repair job creation\",\"linked_at\":\"2026-01-10T05:05:39.685Z\"}}]',
    '[{\"from_status\":null,\"to_status\":\"pending\",\"changed_by\":1,\"notes\":\"RMA request created\",\"changed_at\":\"2026-01-10T04:40:52.846Z\"},{\"from_status\":\"pending\",\"to_status\":\"awaiting_receipt\",\"changed_by\":1,\"notes\":\"Status changed to awaiting_receipt\",\"changed_at\":\"2026-01-10T04:46:45.739Z\"},{\"from_status\":\"awaiting_receipt\",\"to_status\":\"received\",\"changed_by\":1,\"notes\":\"Status changed to received\",\"changed_at\":\"2026-01-13T04:52:21.223Z\"},{\"from_status\":\"received\",\"to_status\":\"inspecting\",\"changed_by\":1,\"notes\":\"Status changed to inspecting\",\"changed_at\":\"2026-01-13T04:52:24.528Z\"},{\"from_status\":\"inspecting\",\"to_status\":\"approved\",\"changed_by\":1,\"notes\":\"Status changed to approved\",\"changed_at\":\"2026-01-13T04:52:31.747Z\"},{\"from_status\":\"approved\",\"to_status\":\"completed\",\"changed_by\":1,\"notes\":\"Status changed to completed\",\"changed_at\":\"2026-01-13T04:52:35.176Z\"}]',
    '[]',
    '2026-01-10 11:40:52',
    '2026-01-13 11:52:35'
  ),
  (
    'RMA-000002',
    'Bang',
    NULL,
    NULL,
    NULL,
    NULL,
    'defective',
    NULL,
    'awaiting_receipt',
    'medium',
    863,
    772,
    1,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    160.00,
    0.00,
    0.00,
    NULL,
    NULL,
    '[{\"item_id\":1,\"product_id\":430,\"device_identifier\":null,\"device_name\":\"realme P3 Lite\",\"batch_no\":null,\"quantity_requested\":1,\"quantity_received\":0,\"quantity_approved\":0,\"unit_price\":160,\"total_price\":160,\"condition_on_receipt\":null,\"disposition\":\"repair\",\"disposition_notes\":null,\"inspection_result\":\"pending\",\"inspection_notes\":null,\"inspected_by\":null,\"inspected_at\":null,\"repair_job_id\":76,\"notes\":null,\"created_at\":\"2026-01-14T03:16:35.144Z\",\"repair_link\":{\"linked_by\":1,\"link_reason\":\"created_with_repair_job\",\"notes\":\"Linked during repair job creation\",\"linked_at\":\"2026-01-14T03:28:24.572Z\"}}]',
    '[{\"from_status\":null,\"to_status\":\"pending\",\"changed_by\":1,\"notes\":\"RMA request created\",\"changed_at\":\"2026-01-14T03:16:35.144Z\"},{\"from_status\":\"pending\",\"to_status\":\"awaiting_receipt\",\"changed_by\":1,\"notes\":\"Status changed to awaiting_receipt\",\"changed_at\":\"2026-01-14T03:28:01.890Z\"}]',
    '[]',
    '2026-01-14 10:16:35',
    '2026-01-14 10:28:24'
  );
/*!40000 ALTER TABLE `rma` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Temporary table structure for view `serial_inventory_status`
--

DROP TABLE IF EXISTS `serial_inventory_status`;
/*!50001 DROP VIEW IF EXISTS `serial_inventory_status`*/
;
SET @saved_cs_client = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `serial_inventory_status` AS SELECT
 1 AS `serial_id`,
 1 AS `serial_number`,
 1 AS `product_id`,
 1 AS `product_name`,
 1 AS `brand`,
 1 AS `warehouse_id`,
 1 AS `warehouse_name`,
 1 AS `zone_id`,
 1 AS `zone_name`,
 1 AS `status`,
 1 AS `created_at`,
 1 AS `updated_at` */
;
SET character_set_client = @saved_cs_client;
--
-- Table structure for table `serialized_inventory`
--

DROP TABLE IF EXISTS `serialized_inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `serialized_inventory` (
  `serial_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned NOT NULL,
  `serial_number` varchar(255) NOT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `status` enum(
    'available',
    'reserved',
    'sold',
    'damaged',
    'returned'
  ) DEFAULT 'available',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`serial_id`),
  UNIQUE KEY `serial_number` (`serial_number`),
  KEY `idx_serial_product` (`product_id`),
  KEY `idx_serial_status` (`status`),
  KEY `idx_serial_warehouse` (`warehouse_id`),
  KEY `idx_serial_zone` (`zone_id`),
  KEY `idx_status_warehouse` (`status`, `warehouse_id`),
  CONSTRAINT `fk_serial_to_specs` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_serial_to_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE
  SET NULL,
    CONSTRAINT `fk_serial_to_zone` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE
  SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Serial number tracking for high-value electronics (phones, laptops). Used for exact unit tracking';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `serialized_inventory`
--

LOCK TABLES `serialized_inventory` WRITE;
/*!40000 ALTER TABLE `serialized_inventory` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `serialized_inventory` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `smartphone_repair_jobs`
--

DROP TABLE IF EXISTS `smartphone_repair_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `smartphone_repair_jobs` (
  `repair_job_id` int(11) NOT NULL AUTO_INCREMENT,
  `job_number` varchar(50) NOT NULL COMMENT 'Unique job number (e.g., RPR-2025-00001)',
  `product_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Product being repaired',
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
  `status` enum(
    'PENDING',
    'DIAGNOSED',
    'PARTS_ORDERED',
    'IN_PROGRESS',
    'TESTING',
    'COMPLETED',
    'DELIVERED',
    'CANCELLED'
  ) DEFAULT 'PENDING',
  `priority` enum('LOW', 'NORMAL', 'HIGH', 'URGENT') DEFAULT 'NORMAL',
  `assigned_technician` varchar(100) DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT NULL COMMENT 'Where repair is done',
  `assigned_at` datetime DEFAULT NULL,
  `received_date` datetime DEFAULT current_timestamp(),
  `estimated_completion_date` datetime DEFAULT NULL,
  `completion_date` datetime DEFAULT NULL,
  `delivered_date` datetime DEFAULT NULL,
  `estimated_cost` decimal(10, 2) DEFAULT 0.00,
  `final_cost` decimal(10, 2) DEFAULT 0.00,
  `parts_cost` decimal(10, 2) DEFAULT 0.00 COMMENT 'Total cost of parts used',
  `labor_cost` decimal(10, 2) DEFAULT 0.00 COMMENT 'Labor charges',
  `total_cost` decimal(10, 2) GENERATED ALWAYS AS (`parts_cost` + `labor_cost`) STORED,
  `customer_charge` decimal(10, 2) DEFAULT 0.00 COMMENT 'Amount charged to customer',
  `currency` varchar(10) DEFAULT 'USD',
  `tested_by` varchar(100) DEFAULT NULL,
  `test_results` text DEFAULT NULL COMMENT 'Post-repair test results',
  `quality_check_passed` tinyint(1) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 3 COMMENT 'Repair warranty period',
  `warranty_expires_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`repair_job_id`),
  UNIQUE KEY `unique_job_number` (`job_number`),
  KEY `idx_product` (`product_id`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_technician` (`assigned_technician`),
  KEY `idx_received_date` (`received_date`),
  KEY `idx_customer` (`customer_name`),
  KEY `idx_serial` (`device_serial_number`),
  KEY `idx_repair_jobs_status_date` (`status`, `received_date`),
  KEY `idx_repair_jobs_technician_status` (`assigned_technician`, `status`),
  KEY `idx_device_imei` (`device_imei`),
  KEY `idx_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_repair_to_product` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE
  SET NULL,
    CONSTRAINT `fk_repair_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE
  SET NULL
) ENGINE = InnoDB AUTO_INCREMENT = 79 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Smartphone repair job tracking with status and cost management';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `smartphone_repair_jobs`
--

LOCK TABLES `smartphone_repair_jobs` WRITE;
/*!40000 ALTER TABLE `smartphone_repair_jobs` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `smartphone_repair_jobs`
VALUES (
    76,
    'RPR-2026-00001',
    430,
    NULL,
    'realme P3 Lite',
    NULL,
    'Bang',
    NULL,
    NULL,
    NULL,
    'Code: defective\n\nItem Details:',
    NULL,
    NULL,
    'PENDING',
    'NORMAL',
    'Nasm',
    729,
    NULL,
    '2026-01-14 10:28:24',
    '2026-01-14 00:00:00',
    NULL,
    NULL,
    NULL,
    0.00,
    100.00,
    0.00,
    100.00,
    0.00,
    'USD',
    NULL,
    NULL,
    NULL,
    3,
    NULL,
    '2026-01-14 10:28:24',
    '2026-01-14 10:31:48',
    NULL
  ),
  (
    78,
    'TEST-RPR-001',
    NULL,
    NULL,
    NULL,
    NULL,
    'Test Customer',
    NULL,
    NULL,
    NULL,
    'Broken Screen',
    NULL,
    NULL,
    'IN_PROGRESS',
    'NORMAL',
    NULL,
    NULL,
    NULL,
    '2026-01-25 02:08:33',
    NULL,
    NULL,
    NULL,
    0.00,
    0.00,
    50250.00,
    0.00,
    50250.00,
    0.00,
    'USD',
    NULL,
    NULL,
    NULL,
    3,
    NULL,
    '2026-01-25 02:08:33',
    '2026-01-25 02:08:33',
    NULL
  );
/*!40000 ALTER TABLE `smartphone_repair_jobs` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
/*!50003 SET @saved_cs_client      = @@character_set_client */
;
/*!50003 SET @saved_cs_results     = @@character_set_results */
;
/*!50003 SET @saved_col_connection = @@collation_connection */
;
/*!50003 SET character_set_client  = utf8mb4 */
;
/*!50003 SET character_set_results = utf8mb4 */
;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */
;
/*!50003 SET @saved_sql_mode       = @@sql_mode */
;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */
;
DELIMITER;
;
/*!50003 CREATE*/
/*!50017 DEFINER=`lechibang`@`localhost`*/
/*!50003 TRIGGER smartphone_repair_jobs_before_update
 BEFORE UPDATE ON smartphone_repair_jobs
 FOR EACH ROW
 BEGIN
 IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
 SET NEW.completion_date = CURRENT_TIMESTAMP;
 IF NEW.warranty_months IS NOT NULL AND NEW.warranty_months > 0 THEN
 SET NEW.warranty_expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL NEW.warranty_months MONTH);
 END IF;
 END IF;
 END */
;
;
DELIMITER;
/*!50003 SET sql_mode              = @saved_sql_mode */
;
/*!50003 SET character_set_client  = @saved_cs_client */
;
/*!50003 SET character_set_results = @saved_cs_results */
;
/*!50003 SET collation_connection  = @saved_col_connection */
;
/*!50003 SET @saved_cs_client      = @@character_set_client */
;
/*!50003 SET @saved_cs_results     = @@character_set_results */
;
/*!50003 SET @saved_col_connection = @@collation_connection */
;
/*!50003 SET character_set_client  = utf8mb4 */
;
/*!50003 SET character_set_results = utf8mb4 */
;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */
;
/*!50003 SET @saved_sql_mode       = @@sql_mode */
;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */
;
DELIMITER;
;
/*!50003 CREATE*/
/*!50017 DEFINER=`lechibang`@`localhost`*/
/*!50003 TRIGGER trg_log_repair_job_status_change AFTER UPDATE ON smartphone_repair_jobs FOR EACH ROW INSERT INTO repair_job_status_history (repair_job_id, from_status, to_status, changed_by, changed_at) SELECT NEW.repair_job_id, OLD.status, NEW.status, NEW.created_by, CURRENT_TIMESTAMP WHERE OLD.status != NEW.status */
;
;
DELIMITER;
/*!50003 SET sql_mode              = @saved_sql_mode */
;
/*!50003 SET character_set_client  = @saved_cs_client */
;
/*!50003 SET character_set_results = @saved_cs_results */
;
/*!50003 SET collation_connection  = @saved_col_connection */
;
--
-- Table structure for table `smartphone_spare_parts`
--

DROP TABLE IF EXISTS `smartphone_spare_parts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `smartphone_spare_parts` (
  `spare_part_id` int(11) NOT NULL AUTO_INCREMENT,
  `part_code` varchar(50) NOT NULL COMMENT 'Unique part code (e.g., DISP-IP15-BLK)',
  `part_name` varchar(255) NOT NULL COMMENT 'Display name (e.g., iPhone 15 Display)',
  `part_category` enum(
    'DISPLAY',
    'BATTERY',
    'CAMERA_REAR',
    'CAMERA_FRONT',
    'MOTHERBOARD',
    'SPEAKER',
    'MICROPHONE',
    'CHARGING_PORT',
    'BUTTON',
    'CASE',
    'ANTENNA',
    'FLEX_CABLE',
    'OTHER'
  ) NOT NULL,
  `part_type` varchar(100) DEFAULT NULL COMMENT 'Specific type (e.g., OLED, LCD, Li-ion)',
  `description` text DEFAULT NULL COMMENT 'Detailed description',
  `compatible_product_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Specific device compatibility via specs_db',
  `compatible_device_category` varchar(100) DEFAULT NULL COMMENT 'Device category (phone, tablet, etc)',
  `compatible_brands` text DEFAULT NULL COMMENT 'JSON array of compatible brands',
  `compatible_models` text DEFAULT NULL COMMENT 'JSON array of compatible models',
  `dimensions` varchar(100) DEFAULT NULL COMMENT 'Length x Width x Height',
  `weight_g` decimal(6, 2) DEFAULT NULL COMMENT 'Weight in grams',
  `color_variants` text DEFAULT NULL COMMENT 'JSON array of available colors',
  `quality_grade` enum('OEM', 'ORIGINAL', 'PREMIUM', 'STANDARD', 'ECONOMY') DEFAULT 'STANDARD' COMMENT 'Quality tier',
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
  PRIMARY KEY (`spare_part_id`),
  UNIQUE KEY `unique_part_code` (`part_code`),
  KEY `idx_part_category` (`part_category`),
  KEY `idx_compatible_product` (`compatible_product_id`),
  KEY `idx_supplier` (`default_supplier_id`),
  KEY `idx_quality_grade` (`quality_grade`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_manufacturer` (`manufacturer`),
  KEY `idx_spare_parts_category_grade` (`part_category`, `quality_grade`),
  KEY `idx_spare_parts_active_supplier` (`is_active`, `default_supplier_id`),
  KEY `idx_device_category` (`compatible_device_category`),
  CONSTRAINT `fk_spare_part_to_device` FOREIGN KEY (`compatible_product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE
  SET NULL
) ENGINE = InnoDB AUTO_INCREMENT = 55 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Catalog of smartphone spare parts with compatibility and pricing information';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `smartphone_spare_parts`
--

LOCK TABLES `smartphone_spare_parts` WRITE;
/*!40000 ALTER TABLE `smartphone_spare_parts` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `smartphone_spare_parts`
VALUES (
    9,
    'MOBO-REALMEP3LITE',
    'mobo',
    'MOTHERBOARD',
    NULL,
    '',
    430,
    '',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'STANDARD',
    3,
    'realme',
    '',
    100.00,
    100.00,
    'USD',
    NULL,
    NULL,
    5,
    50,
    10,
    20,
    1,
    0,
    0,
    NULL,
    '2025-12-02 08:44:16',
    '2025-12-25 22:46:30',
    NULL
  ),
  (
    10,
    'LCD-1765946957043-ZGOD8K',
    'Test LCD Screen 1765946957043',
    'DISPLAY',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'OEM',
    3,
    'Test Manufacturer',
    NULL,
    50.00,
    0.00,
    'USD',
    NULL,
    NULL,
    15,
    50,
    20,
    20,
    0,
    0,
    0,
    NULL,
    '2025-12-17 11:49:17',
    '2025-12-17 11:49:17',
    NULL
  ),
  (
    11,
    'LCD-1765947932747-KGNLWE',
    'Test LCD Screen 1765947932747',
    'DISPLAY',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'OEM',
    3,
    'Test Manufacturer',
    NULL,
    50.00,
    0.00,
    'USD',
    NULL,
    NULL,
    15,
    50,
    20,
    20,
    0,
    0,
    0,
    NULL,
    '2025-12-17 12:05:32',
    '2025-12-17 12:05:32',
    NULL
  ),
  (
    12,
    'LCD-1765949097210-4BCPG8',
    'Test LCD Screen 1765949097210',
    'DISPLAY',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'OEM',
    3,
    'Test Manufacturer',
    NULL,
    50.00,
    0.00,
    'USD',
    NULL,
    NULL,
    15,
    50,
    20,
    20,
    0,
    0,
    0,
    NULL,
    '2025-12-17 12:24:57',
    '2025-12-17 12:24:57',
    NULL
  ),
  (
    13,
    'LCD-1765949432460-WVRFNL',
    'Test LCD Screen 1765949432460',
    'DISPLAY',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'OEM',
    3,
    'Test Manufacturer',
    NULL,
    50.00,
    0.00,
    'USD',
    NULL,
    NULL,
    15,
    50,
    20,
    20,
    0,
    0,
    0,
    NULL,
    '2025-12-17 12:30:32',
    '2025-12-17 12:30:32',
    NULL
  ),
  (
    14,
    'LCD-1766055258620-YFEVEQ',
    'Test LCD Screen 1766055258620',
    'DISPLAY',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'OEM',
    3,
    'Test Manufacturer',
    NULL,
    50.00,
    0.00,
    'USD',
    NULL,
    NULL,
    15,
    50,
    20,
    20,
    0,
    0,
    0,
    NULL,
    '2025-12-18 17:54:18',
    '2025-12-18 17:54:18',
    NULL
  ),
  (
    15,
    'LCD-1766056585943-RK4P0F',
    'Test LCD Screen 1766056585943',
    'DISPLAY',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'OEM',
    3,
    'Test Manufacturer',
    NULL,
    50.00,
    0.00,
    'USD',
    NULL,
    NULL,
    15,
    50,
    20,
    20,
    0,
    0,
    0,
    NULL,
    '2025-12-18 18:16:25',
    '2025-12-18 18:16:26',
    NULL
  ),
  (
    16,
    'SCREEN-REALMEP3LITE',
    'Touchscreen',
    'DISPLAY',
    NULL,
    '',
    430,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'STANDARD',
    3,
    '',
    '',
    12.00,
    12.00,
    'USD',
    NULL,
    NULL,
    5,
    50,
    10,
    20,
    0,
    0,
    0,
    NULL,
    '2025-12-27 11:43:36',
    '2026-01-08 14:48:25',
    NULL
  ),
  (
    18,
    'TEST-PART-20-ced79c45',
    'Test Part 20',
    'DISPLAY',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'STANDARD',
    3,
    NULL,
    NULL,
    20.00,
    0.00,
    'USD',
    NULL,
    NULL,
    5,
    50,
    10,
    20,
    0,
    0,
    0,
    NULL,
    '2025-12-27 22:40:51',
    '2026-01-07 17:31:11',
    NULL
  ),
  (
    19,
    'TEST-PART-20-d4627c84',
    'Test Part 20',
    'DISPLAY',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'STANDARD',
    3,
    NULL,
    NULL,
    20.00,
    0.00,
    'USD',
    NULL,
    NULL,
    5,
    50,
    10,
    20,
    0,
    0,
    0,
    NULL,
    '2025-12-27 22:41:00',
    '2026-01-07 17:31:15',
    NULL
  ),
  (
    20,
    'TEST-PART-20-e4d54f90',
    'Test Part 20',
    'DISPLAY',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'STANDARD',
    3,
    NULL,
    NULL,
    20.00,
    0.00,
    'USD',
    NULL,
    NULL,
    5,
    50,
    10,
    20,
    0,
    0,
    0,
    NULL,
    '2025-12-27 22:41:27',
    '2026-01-07 17:31:17',
    NULL
  ),
  (
    52,
    'PART-CONS-001',
    'Test Part Consumption',
    'DISPLAY',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'STANDARD',
    3,
    NULL,
    NULL,
    50.00,
    0.00,
    'USD',
    NULL,
    NULL,
    5,
    50,
    10,
    20,
    1,
    0,
    0,
    NULL,
    '2026-01-25 02:08:33',
    '2026-01-25 02:08:33',
    NULL
  ),
  (
    54,
    'LCD-1769281714350-JYKXH3',
    'Test LCD Screen 1769281714350',
    'DISPLAY',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'STANDARD',
    3,
    NULL,
    NULL,
    0.00,
    0.00,
    'USD',
    NULL,
    NULL,
    5,
    50,
    10,
    20,
    1,
    0,
    0,
    NULL,
    '2026-01-25 02:08:34',
    '2026-01-25 02:08:34',
    NULL
  );
/*!40000 ALTER TABLE `smartphone_spare_parts` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `smartphone_spare_parts_inventory`
--

DROP TABLE IF EXISTS `smartphone_spare_parts_inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `smartphone_spare_parts_inventory` (
  `inventory_id` int(11) NOT NULL AUTO_INCREMENT,
  `spare_part_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `zone_id` int(11) DEFAULT NULL COMMENT 'Storage zone within warehouse',
  `bin_id` int(11) DEFAULT NULL,
  `quantity_on_hand` int(11) NOT NULL DEFAULT 0 COMMENT 'Total available quantity',
  `quantity_reserved` int(11) DEFAULT 0 COMMENT 'Reserved for pending repairs',
  `quantity_defective` int(11) DEFAULT 0 COMMENT 'Defective/damaged units',
  `quantity_in_transit` int(11) DEFAULT 0 COMMENT 'Being transferred',
  `batch_no` varchar(100) DEFAULT NULL,
  `serial_number` varchar(255) DEFAULT NULL COMMENT 'For serialized parts',
  `manufacture_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL COMMENT 'For time-sensitive parts (batteries)',
  `condition_status` enum('NEW', 'REFURBISHED', 'USED', 'TESTING', 'DEFECTIVE') DEFAULT 'NEW',
  `condition_notes` text DEFAULT NULL,
  `location_notes` varchar(255) DEFAULT NULL COMMENT 'Additional location info',
  `last_counted_at` datetime DEFAULT NULL COMMENT 'Last physical inventory count',
  `last_counted_by` varchar(100) DEFAULT NULL,
  `last_movement_at` datetime DEFAULT NULL,
  `last_movement_type` varchar(50) DEFAULT NULL COMMENT 'RECEIVE, ISSUE, TRANSFER, ADJUST',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`inventory_id`),
  UNIQUE KEY `unique_spare_part_location` (
    `spare_part_id`,
    `warehouse_id`,
    `zone_id`,
    `batch_no`,
    `serial_number`
  ),
  KEY `idx_spare_part` (`spare_part_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_zone` (`zone_id`),
  KEY `idx_batch` (`batch_no`),
  KEY `idx_serial` (`serial_number`),
  KEY `idx_condition` (`condition_status`),
  KEY `idx_expiry` (`expiry_date`),
  KEY `idx_spare_inventory_warehouse_part` (`warehouse_id`, `spare_part_id`),
  KEY `idx_spare_inventory_condition` (`condition_status`, `quantity_on_hand`),
  KEY `fk_spare_inventory_to_bin` (`bin_id`),
  CONSTRAINT `fk_spare_inventory_to_bin` FOREIGN KEY (`bin_id`) REFERENCES `bin_locations` (`bin_id`) ON DELETE
  SET NULL,
    CONSTRAINT `fk_spare_inventory_to_part` FOREIGN KEY (`spare_part_id`) REFERENCES `smartphone_spare_parts` (`spare_part_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_spare_inventory_to_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`),
    CONSTRAINT `fk_spare_inventory_to_zone` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE
  SET NULL,
    CONSTRAINT `chk_quantity_positive` CHECK (`quantity_on_hand` >= 0),
    CONSTRAINT `chk_reserved_valid` CHECK (
      `quantity_reserved` >= 0
      and `quantity_reserved` <= `quantity_on_hand`
    )
) ENGINE = InnoDB AUTO_INCREMENT = 61 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Physical inventory tracking for smartphone spare parts across warehouses';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `smartphone_spare_parts_inventory`
--

LOCK TABLES `smartphone_spare_parts_inventory` WRITE;
/*!40000 ALTER TABLE `smartphone_spare_parts_inventory` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `smartphone_spare_parts_inventory`
VALUES (
    15,
    9,
    729,
    652,
    NULL,
    10,
    0,
    0,
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    'NEW',
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-14 10:45:24',
    'ISSUE',
    '2026-01-08 21:00:31',
    '2026-01-14 10:45:24'
  ),
  (
    58,
    52,
    1240,
    NULL,
    NULL,
    100,
    0,
    0,
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    'NEW',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-25 02:08:33',
    '2026-01-25 02:08:33'
  );
/*!40000 ALTER TABLE `smartphone_spare_parts_inventory` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Temporary table structure for view `spare_parts_low_stock`
--

DROP TABLE IF EXISTS `spare_parts_low_stock`;
/*!50001 DROP VIEW IF EXISTS `spare_parts_low_stock`*/
;
SET @saved_cs_client = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `spare_parts_low_stock` AS SELECT
 1 AS `spare_part_id`,
 1 AS `part_code`,
 1 AS `part_name`,
 1 AS `part_category`,
 1 AS `quality_grade`,
 1 AS `total_quantity`,
 1 AS `total_reserved`,
 1 AS `available_quantity`,
 1 AS `minimum_stock_level`,
 1 AS `reorder_point`,
 1 AS `reorder_quantity`,
 1 AS `default_supplier_id`,
 1 AS `supplier_name`,
 1 AS `stock_status`,
 1 AS `last_updated` */
;
SET character_set_client = @saved_cs_client;
--
-- Table structure for table `spare_parts_reorder_recommendations`
--

DROP TABLE IF EXISTS `spare_parts_reorder_recommendations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `spare_parts_reorder_recommendations` (
  `recommendation_id` int(11) NOT NULL AUTO_INCREMENT,
  `spare_part_id` int(11) NOT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `current_stock` int(11) DEFAULT 0,
  `reorder_point` int(11) DEFAULT 0,
  `recommended_quantity` int(11) DEFAULT 1,
  `urgency_level` enum('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') DEFAULT 'MEDIUM',
  `estimated_stockout_date` date DEFAULT NULL,
  `recommendation_reason` text DEFAULT NULL,
  `status` enum('PENDING', 'ACKNOWLEDGED', 'ORDERED', 'CANCELLED') DEFAULT 'PENDING',
  `acknowledged_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`recommendation_id`),
  KEY `idx_spare_part` (`spare_part_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_status` (`status`),
  KEY `idx_urgency` (`urgency_level`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `spare_parts_reorder_recommendations_ibfk_1` FOREIGN KEY (`spare_part_id`) REFERENCES `smartphone_spare_parts` (`spare_part_id`) ON DELETE CASCADE,
  CONSTRAINT `spare_parts_reorder_recommendations_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE
  SET NULL
) ENGINE = InnoDB AUTO_INCREMENT = 12 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `spare_parts_reorder_recommendations`
--

LOCK TABLES `spare_parts_reorder_recommendations` WRITE;
/*!40000 ALTER TABLE `spare_parts_reorder_recommendations` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `spare_parts_reorder_recommendations`
VALUES (
    6,
    9,
    NULL,
    0,
    10,
    20,
    'CRITICAL',
    NULL,
    'Consider restocking',
    'ORDERED',
    NULL,
    '2025-12-22 10:39:55',
    '2025-12-27 04:43:48'
  ),
  (
    7,
    16,
    NULL,
    0,
    10,
    20,
    'CRITICAL',
    NULL,
    'Consider restocking',
    'CANCELLED',
    11,
    '2025-12-27 04:43:45',
    '2026-01-13 03:19:14'
  ),
  (
    8,
    9,
    NULL,
    0,
    10,
    20,
    'CRITICAL',
    NULL,
    'Consider restocking',
    'CANCELLED',
    11,
    '2025-12-27 04:43:54',
    '2026-01-13 03:19:13'
  ),
  (
    9,
    18,
    NULL,
    0,
    10,
    20,
    'CRITICAL',
    NULL,
    'Consider restocking',
    'CANCELLED',
    11,
    '2026-01-06 08:40:30',
    '2026-01-13 03:19:11'
  ),
  (
    10,
    19,
    NULL,
    0,
    10,
    20,
    'CRITICAL',
    NULL,
    'Consider restocking',
    'CANCELLED',
    11,
    '2026-01-06 08:40:30',
    '2026-01-13 03:19:12'
  ),
  (
    11,
    20,
    NULL,
    0,
    10,
    20,
    'CRITICAL',
    NULL,
    'Consider restocking',
    'CANCELLED',
    11,
    '2026-01-06 08:40:30',
    '2026-01-13 03:19:13'
  );
/*!40000 ALTER TABLE `spare_parts_reorder_recommendations` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `specs_db`
--

DROP TABLE IF EXISTS `specs_db`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `specs_db` (
  `product_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `device_name` varchar(255) DEFAULT NULL,
  `device_maker` varchar(255) DEFAULT NULL,
  `device_price` decimal(10, 2) DEFAULT NULL,
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
  `length_mm` decimal(5, 2) DEFAULT NULL,
  `width_mm` decimal(5, 2) DEFAULT NULL,
  `thickness_mm` decimal(4, 2) DEFAULT NULL,
  `weight_g` decimal(5, 2) DEFAULT NULL,
  `display_size` decimal(4, 2) DEFAULT NULL,
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
  `avg_daily_usage` decimal(10, 2) DEFAULT 0.00 COMMENT 'Average daily consumption',
  `display_type` enum(
    'LCD',
    'IPS_LCD',
    'OLED',
    'AMOLED',
    'SUPER_AMOLED',
    'LTPO_OLED',
    'RETINA',
    'E_INK',
    'OTHER'
  ) DEFAULT NULL COMMENT 'Display panel technology',
  `hdr_support` varchar(100) DEFAULT NULL COMMENT 'HDR10, HDR10+, Dolby Vision, HLG',
  `rear_camera_ultrawide` varchar(255) DEFAULT NULL COMMENT 'Ultrawide camera specs',
  `rear_camera_telephoto` varchar(255) DEFAULT NULL COMMENT 'Telephoto camera specs',
  `optical_zoom` varchar(50) DEFAULT NULL COMMENT 'Optical zoom capability (e.g., 3x, 5x, 10x)',
  `wireless_charging` varchar(100) DEFAULT NULL COMMENT 'Wireless charging wattage (e.g., 15W Qi, 50W)',
  `reverse_charging` varchar(100) DEFAULT NULL COMMENT 'Reverse wireless charging capability',
  `warranty_months` int(11) DEFAULT 12 COMMENT 'Standard warranty period in months',
  `warranty_type` enum(
    'MANUFACTURER',
    'DISTRIBUTOR',
    'STORE',
    'EXTENDED',
    'NONE'
  ) DEFAULT 'MANUFACTURER' COMMENT 'Type of warranty coverage',
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
  KEY `idx_active_discontinued` (`is_active`, `is_discontinued`),
  CONSTRAINT `fk_specs_to_supplier` FOREIGN KEY (`default_supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE
  SET NULL
) ENGINE = InnoDB AUTO_INCREMENT = 736 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Product catalog with 50+ specification fields for electronic devices. Actual inventory tracked in warehouse_product_locations or serialized_inventory';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `specs_db`
--

LOCK TABLES `specs_db` WRITE;
/*!40000 ALTER TABLE `specs_db` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `specs_db`
VALUES (
    430,
    'P3 Lite',
    'realme',
    160.00,
    'Pine Green',
    'none',
    'Mediatek Dimensity 6300',
    NULL,
    NULL,
    NULL,
    'Mali-G57 MC2',
    NULL,
    '6',
    '128',
    'Yes',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '6300',
    '45W',
    'USB Type-C 2.0',
    NULL,
    NULL,
    'No',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Android 15, Realme UI 6.0',
    NULL,
    'phone',
    NULL,
    11,
    0,
    0,
    7,
    0,
    0.00,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    12,
    'MANUFACTURER',
    NULL,
    1,
    0,
    NULL,
    NULL
  ),
  (
    647,
    'Test Phone Price',
    'Test Maker',
    100.00,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    12,
    0,
    0,
    7,
    0,
    0.00,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    12,
    'MANUFACTURER',
    NULL,
    1,
    0,
    NULL,
    NULL
  ),
  (
    706,
    'Test Phone',
    'Test Maker',
    999.99,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    0,
    0,
    7,
    0,
    0.00,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    12,
    'MANUFACTURER',
    NULL,
    1,
    0,
    NULL,
    NULL
  );
/*!40000 ALTER TABLE `specs_db` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Temporary table structure for view `stock_valuation_by_supplier`
--

DROP TABLE IF EXISTS `stock_valuation_by_supplier`;
/*!50001 DROP VIEW IF EXISTS `stock_valuation_by_supplier`*/
;
SET @saved_cs_client = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `stock_valuation_by_supplier` AS SELECT
 1 AS `supplier_id`,
 1 AS `supplier_name`,
 1 AS `category`,
 1 AS `product_count`,
 1 AS `total_quantity`,
 1 AS `total_value` */
;
SET character_set_client = @saved_cs_client;
--
-- Table structure for table `stocktake_items`
--

DROP TABLE IF EXISTS `stocktake_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `stocktake_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `stocktake_id` int(11) NOT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_stocktake_product` (`stocktake_id`, `product_id`, `bin_location`),
  KEY `idx_stocktake` (`stocktake_id`),
  KEY `idx_adjustment_receipt` (`adjustment_receipt_id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_variance` (`variance`),
  CONSTRAINT `stocktake_items_ibfk_1` FOREIGN KEY (`stocktake_id`) REFERENCES `stocktakes` (`stocktake_id`) ON DELETE CASCADE,
  CONSTRAINT `stocktake_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`)
) ENGINE = InnoDB AUTO_INCREMENT = 66 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `stocktake_items`
--

LOCK TABLES `stocktake_items` WRITE;
/*!40000 ALTER TABLE `stocktake_items` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `stocktake_items`
VALUES (
    65,
    41,
    430,
    NULL,
    70.00,
    76.00,
    6.00,
    8.57,
    0,
    NULL,
    'Days since count: 9510',
    '2026-01-14 10:24:14',
    1,
    '2026-01-14 03:23:56',
    '2026-01-14 03:24:14'
  );
/*!40000 ALTER TABLE `stocktake_items` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `stocktake_status_history`
--

DROP TABLE IF EXISTS `stocktake_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
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
) ENGINE = InnoDB AUTO_INCREMENT = 87 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `stocktake_status_history`
--

LOCK TABLES `stocktake_status_history` WRITE;
/*!40000 ALTER TABLE `stocktake_status_history` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `stocktake_status_history`
VALUES (
    82,
    41,
    NULL,
    'PLANNED',
    1,
    '2026-01-14 03:23:56',
    'Stocktake created'
  ),
  (
    83,
    41,
    'PLANNED',
    'IN_PROGRESS',
    1,
    '2026-01-14 03:24:15',
    'Stocktake started'
  ),
  (
    84,
    41,
    'IN_PROGRESS',
    'COMPLETED',
    1,
    '2026-01-14 03:24:17',
    'Stocktake completed'
  ),
  (
    85,
    41,
    'COMPLETED',
    'APPROVED',
    1,
    '2026-01-14 03:24:19',
    'Stocktake approved'
  ),
  (
    86,
    42,
    NULL,
    'PLANNED',
    1,
    '2026-01-24 19:08:34',
    'Stocktake created'
  );
/*!40000 ALTER TABLE `stocktake_status_history` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `stocktakes`
--

DROP TABLE IF EXISTS `stocktakes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `stocktakes` (
  `stocktake_id` int(11) NOT NULL AUTO_INCREMENT,
  `stocktake_number` varchar(50) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `count_type` enum('full', 'cycle', 'random', 'location') DEFAULT 'full',
  `status` enum(
    'PLANNED',
    'IN_PROGRESS',
    'COMPLETED',
    'APPROVED',
    'CANCELLED'
  ) DEFAULT 'PLANNED',
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
  PRIMARY KEY (`stocktake_id`),
  UNIQUE KEY `stocktake_number` (`stocktake_number`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_zone` (`zone_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at`),
  KEY `idx_stocktakes_scheduled` (`scheduled_for`, `status`),
  KEY `idx_stocktakes_count_type` (`count_type`),
  CONSTRAINT `stocktakes_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`),
  CONSTRAINT `stocktakes_ibfk_2` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`)
) ENGINE = InnoDB AUTO_INCREMENT = 43 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `stocktakes`
--

LOCK TABLES `stocktakes` WRITE;
/*!40000 ALTER TABLE `stocktakes` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `stocktakes`
VALUES (
    41,
    'ST-20260114-O5TMZ2',
    729,
    NULL,
    'full',
    'APPROVED',
    1,
    '2026-01-14 10:24:15',
    '2026-01-14 10:24:17',
    1,
    '2026-01-14 10:24:19',
    NULL,
    NULL,
    0,
    NULL,
    '2026-01-14 03:23:56',
    '2026-01-14 03:24:19'
  ),
  (
    42,
    'ST-20260124-B60HFC',
    1252,
    NULL,
    'full',
    'PLANNED',
    1,
    NULL,
    NULL,
    NULL,
    NULL,
    'Test stocktake',
    NULL,
    0,
    NULL,
    '2026-01-24 19:08:34',
    '2026-01-24 19:08:34'
  );
/*!40000 ALTER TABLE `stocktakes` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
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
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `tax_number` varchar(50) DEFAULT NULL COMMENT 'Tax identification number',
  `lead_time_days` int(11) DEFAULT NULL COMMENT 'Average lead time in days',
  `rating` decimal(3, 2) DEFAULT NULL COMMENT 'Supplier rating (0-5)',
  `payment_terms` varchar(100) DEFAULT NULL COMMENT 'Payment terms (e.g., Net 30)',
  PRIMARY KEY (`id`),
  KEY `idx_supplier_name` (`name`),
  KEY `idx_supplier_category` (`category`),
  KEY `idx_contact_person` (`contact_person`),
  KEY `idx_email` (`email`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_tax_number` (`tax_number`)
) ENGINE = InnoDB AUTO_INCREMENT = 841 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Supplier master data for tracking vendors';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `suppliers`
VALUES (
    478,
    'DigiWorld',
    'Electronics',
    'Sam',
    'Salesperson',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    '2025-12-15 12:49:51',
    '2025-12-15 12:50:40',
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    586,
    'Test Supplier',
    'electronics',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    '2026-01-06 08:40:30',
    '2026-01-06 08:40:30',
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    589,
    'Test Supplier 1767688831282',
    'electronics',
    'John Doe',
    NULL,
    'test1767688831282@example.com',
    '1234567890',
    NULL,
    NULL,
    NULL,
    1,
    '2026-01-06 08:40:31',
    '2026-01-06 08:40:31',
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    600,
    'Test Supplier',
    'electronics',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    '2026-01-08 07:11:17',
    '2026-01-08 07:11:17',
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    601,
    'Test Supplier',
    'electronics',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    '2026-01-08 07:12:44',
    '2026-01-08 07:12:44',
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    606,
    'Test Supplier',
    'electronics',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    '2026-01-10 06:09:04',
    '2026-01-10 06:09:04',
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    629,
    'Test Supplier',
    'electronics',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    '2026-01-10 06:09:25',
    '2026-01-10 06:09:25',
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    630,
    'Test Supplier',
    'electronics',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    '2026-01-12 03:57:07',
    '2026-01-12 03:57:07',
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    813,
    'Test Supplier',
    'electronics',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    '2026-01-24 19:08:34',
    '2026-01-24 19:08:34',
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    816,
    'Test Supplier 1769281714596',
    'electronics',
    'John Doe',
    NULL,
    'test1769281714596@example.com',
    '1234567890',
    NULL,
    NULL,
    NULL,
    1,
    '2026-01-24 19:08:34',
    '2026-01-24 19:08:34',
    NULL,
    NULL,
    NULL,
    NULL
  );
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Temporary table structure for view `v_all_transactions`
--

DROP TABLE IF EXISTS `v_all_transactions`;
/*!50001 DROP VIEW IF EXISTS `v_all_transactions`*/
;
SET @saved_cs_client = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_all_transactions` AS SELECT
 1 AS `transaction_id`,
 1 AS `transaction_type`,
 1 AS `transaction_date`,
 1 AS `supplier_id`,
 1 AS `warehouse_id`,
 1 AS `zone_id`,
 1 AS `total_amount`,
 1 AS `subtotal`,
 1 AS `tax_amount`,
 1 AS `notes`,
 1 AS `source`,
 1 AS `item_count`,
 1 AS `created_at`,
 1 AS `updated_at` */
;
SET character_set_client = @saved_cs_client;
--
-- Temporary table structure for view `v_cycle_count_summary`
--

DROP TABLE IF EXISTS `v_cycle_count_summary`;
/*!50001 DROP VIEW IF EXISTS `v_cycle_count_summary`*/
;
SET @saved_cs_client = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_cycle_count_summary` AS SELECT
 1 AS `stocktake_id`,
 1 AS `stocktake_number`,
 1 AS `count_type`,
 1 AS `warehouse_id`,
 1 AS `warehouse_name`,
 1 AS `zone_id`,
 1 AS `zone_name`,
 1 AS `status`,
 1 AS `scheduled_for`,
 1 AS `started_at`,
 1 AS `completed_at`,
 1 AS `approved_at`,
 1 AS `total_items`,
 1 AS `items_counted`,
 1 AS `items_with_variance`,
 1 AS `completion_pct`,
 1 AS `total_variance_qty` */
;
SET character_set_client = @saved_cs_client;
--
-- Temporary table structure for view `v_inventory_accuracy`
--

DROP TABLE IF EXISTS `v_inventory_accuracy`;
/*!50001 DROP VIEW IF EXISTS `v_inventory_accuracy`*/
;
SET @saved_cs_client = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_inventory_accuracy` AS SELECT
 1 AS `warehouse_id`,
 1 AS `warehouse_name`,
 1 AS `products_counted`,
 1 AS `products_matched`,
 1 AS `products_with_variance`,
 1 AS `accuracy_pct`,
 1 AS `total_variance_qty`,
 1 AS `total_system_qty_variance`,
 1 AS `ira_pct`,
 1 AS `last_count_date` */
;
SET character_set_client = @saved_cs_client;
--
-- Temporary table structure for view `v_items_due_for_count`
--

DROP TABLE IF EXISTS `v_items_due_for_count`;
/*!50001 DROP VIEW IF EXISTS `v_items_due_for_count`*/
;
SET @saved_cs_client = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_items_due_for_count` AS SELECT
 1 AS `product_id`,
 1 AS `device_name`,
 1 AS `device_maker`,
 1 AS `warehouse_id`,
 1 AS `warehouse_name`,
 1 AS `zone_id`,
 1 AS `zone_name`,
 1 AS `quantity`,
 1 AS `last_counted_at`,
 1 AS `last_count_result`,
 1 AS `count_frequency_days`,
 1 AS `days_since_count`,
 1 AS `is_due` */
;
SET character_set_client = @saved_cs_client;
--
-- Temporary table structure for view `warehouse_distribution_overview`
--

DROP TABLE IF EXISTS `warehouse_distribution_overview`;
/*!50001 DROP VIEW IF EXISTS `warehouse_distribution_overview`*/
;
SET @saved_cs_client = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `warehouse_distribution_overview` AS SELECT
 1 AS `warehouse_id`,
 1 AS `warehouse_name`,
 1 AS `total_zones`,
 1 AS `total_inventory` */
;
SET character_set_client = @saved_cs_client;
--
-- Table structure for table `warehouse_product_locations`
--

DROP TABLE IF EXISTS `warehouse_product_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `warehouse_product_locations` (
  `location_id` int(11) NOT NULL AUTO_INCREMENT,
  `warehouse_id` int(11) NOT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  `quantity` int(11) DEFAULT 0 CHECK (`quantity` >= 0),
  `reserved_quantity` int(11) DEFAULT 0 CHECK (
    `reserved_quantity` >= 0
    and `reserved_quantity` <= `quantity`
  ),
  `min_stock_level` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`location_id`),
  UNIQUE KEY `unique_warehouse_zone_phone` (`warehouse_id`, `zone_id`, `product_id`),
  KEY `idx_wpl_product` (`product_id`),
  KEY `idx_wpl_warehouse` (`warehouse_id`),
  KEY `idx_wpl_zone` (`zone_id`),
  CONSTRAINT `fk_wpl_to_specs` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wpl_to_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wpl_to_zone` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE
  SET NULL
) ENGINE = InnoDB AUTO_INCREMENT = 713 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Primary table for bulk inventory tracking. available_quantity = quantity - reserved_quantity';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `warehouse_product_locations`
--

LOCK TABLES `warehouse_product_locations` WRITE;
/*!40000 ALTER TABLE `warehouse_product_locations` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `warehouse_product_locations`
VALUES (
    513,
    729,
    652,
    430,
    70,
    0,
    0,
    '2025-12-24 10:18:55',
    '2026-01-13 18:12:03'
  );
/*!40000 ALTER TABLE `warehouse_product_locations` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `warehouse_zones`
--

DROP TABLE IF EXISTS `warehouse_zones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `warehouse_zones` (
  `zone_id` int(11) NOT NULL AUTO_INCREMENT,
  `warehouse_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `zone_type` enum(
    'receiving',
    'storage',
    'picking',
    'staging',
    'shipping'
  ) DEFAULT 'storage',
  `capacity_limit` int(11) DEFAULT NULL COMMENT 'Maximum number of items',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `default_bin_type` enum('standard', 'cold', 'hazmat', 'bulk', 'small_parts') DEFAULT 'standard' COMMENT 'Default bin type for this zone',
  `bin_prefix` varchar(10) DEFAULT NULL COMMENT 'Prefix for bins in this zone (e.g., RCV, STG)',
  `max_bins` int(11) DEFAULT NULL COMMENT 'Maximum number of bins allowed in zone',
  `bin_layout` enum(
    'single_row',
    'double_row',
    'grid',
    'mixed',
    'custom'
  ) DEFAULT 'grid' COMMENT 'Physical layout of bins',
  `require_bins` tinyint(1) DEFAULT 0 COMMENT 'Whether zone requires bin-level tracking',
  PRIMARY KEY (`zone_id`),
  KEY `idx_zone_warehouse` (`warehouse_id`),
  KEY `idx_zone_bin_prefix` (`bin_prefix`),
  KEY `idx_zone_require_bins` (`require_bins`),
  CONSTRAINT `fk_zone_to_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1179 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Zones within warehouses following workflow: Receiving → Storage → Picking → Staging → Shipping';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `warehouse_zones`
--

LOCK TABLES `warehouse_zones` WRITE;
/*!40000 ALTER TABLE `warehouse_zones` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `warehouse_zones`
VALUES (
    652,
    729,
    'Z1',
    NULL,
    'receiving',
    NULL,
    1,
    '2025-12-22 00:27:18',
    '2026-01-08 20:54:01',
    'standard',
    'RCV',
    NULL,
    'grid',
    0
  ),
  (
    772,
    863,
    'Test Zone',
    NULL,
    'storage',
    NULL,
    1,
    '2026-01-10 13:09:25',
    '2026-01-10 13:09:25',
    'standard',
    NULL,
    NULL,
    'grid',
    0
  ),
  (
    773,
    865,
    'Test Zone',
    NULL,
    'storage',
    NULL,
    1,
    '2026-01-12 10:57:07',
    '2026-01-12 10:57:07',
    'standard',
    NULL,
    NULL,
    'grid',
    0
  ),
  (
    1038,
    1154,
    'Test Zone Price',
    NULL,
    'storage',
    NULL,
    1,
    '2026-01-17 11:30:23',
    '2026-01-17 11:30:23',
    'standard',
    NULL,
    NULL,
    'grid',
    0
  ),
  (
    1127,
    1252,
    'Test Zone',
    NULL,
    'storage',
    NULL,
    1,
    '2026-01-25 02:08:34',
    '2026-01-25 02:08:34',
    'standard',
    NULL,
    NULL,
    'grid',
    0
  ),
  (
    1128,
    1253,
    'Test Zone 2',
    NULL,
    'storage',
    NULL,
    1,
    '2026-01-25 02:08:34',
    '2026-01-25 02:08:34',
    'standard',
    NULL,
    NULL,
    'grid',
    0
  );
/*!40000 ALTER TABLE `warehouse_zones` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `warehouses`
--

DROP TABLE IF EXISTS `warehouses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `warehouses` (
  `warehouse_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `location` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `contact_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'JSON field for phone, email, manager' CHECK (json_valid(`contact_info`)),
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`warehouse_id`),
  KEY `idx_warehouse_name` (`name`),
  KEY `idx_warehouse_active` (`is_active`)
) ENGINE = InnoDB AUTO_INCREMENT = 1305 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Warehouse locations for physical inventory storage';
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `warehouses`
--

LOCK TABLES `warehouses` WRITE;
/*!40000 ALTER TABLE `warehouses` DISABLE KEYS */
;
set autocommit = 0;
INSERT INTO `warehouses`
VALUES (
    729,
    'WH1',
    'Homebase',
    NULL,
    NULL,
    1,
    '2025-12-22 00:26:58',
    '2025-12-22 00:26:58'
  ),
  (
    863,
    'Test Warehouse',
    'Test Location',
    NULL,
    NULL,
    1,
    '2026-01-10 13:09:25',
    '2026-01-10 13:09:25'
  ),
  (
    865,
    'Test Warehouse 2',
    'Test Location',
    '',
    '{\"manager_name\":\"\",\"contact_phone\":\"\",\"contact_email\":\"\"}',
    1,
    '2026-01-12 10:57:07',
    '2026-01-13 01:49:27'
  ),
  (
    1154,
    'Test Warehouse Price',
    'Test Location Price',
    NULL,
    NULL,
    1,
    '2026-01-17 11:30:23',
    '2026-01-17 11:30:23'
  ),
  (
    1240,
    'Test Repair WH',
    'Test Loc',
    NULL,
    NULL,
    1,
    '2026-01-25 02:08:33',
    '2026-01-25 02:08:33'
  ),
  (
    1252,
    'Test Warehouse',
    'Test Location',
    NULL,
    NULL,
    1,
    '2026-01-25 02:08:34',
    '2026-01-25 02:08:34'
  ),
  (
    1253,
    'Test Warehouse 2',
    'Test Location 2',
    NULL,
    NULL,
    1,
    '2026-01-25 02:08:34',
    '2026-01-25 02:08:34'
  );
/*!40000 ALTER TABLE `warehouses` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Temporary table structure for view `zone_bin_hierarchy`
--

DROP TABLE IF EXISTS `zone_bin_hierarchy`;
/*!50001 DROP VIEW IF EXISTS `zone_bin_hierarchy`*/
;
SET @saved_cs_client = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `zone_bin_hierarchy` AS SELECT
 1 AS `zone_id`,
 1 AS `warehouse_id`,
 1 AS `zone_name`,
 1 AS `zone_type`,
 1 AS `zone_bin_prefix`,
 1 AS `max_bins`,
 1 AS `require_bins`,
 1 AS `zone_capacity_limit`,
 1 AS `zone_is_active`,
 1 AS `total_bins`,
 1 AS `active_bins`,
 1 AS `total_bin_capacity`,
 1 AS `zone_inventory_quantity`,
 1 AS `zone_reserved_quantity`,
 1 AS `bin_inventory_quantity`,
 1 AS `total_quantity`,
 1 AS `zone_utilization_percent`,
 1 AS `bin_utilization_percent`,
 1 AS `bin_status` */
;
SET character_set_client = @saved_cs_client;
--
-- Temporary table structure for view `zone_distribution_efficiency`
--

DROP TABLE IF EXISTS `zone_distribution_efficiency`;
/*!50001 DROP VIEW IF EXISTS `zone_distribution_efficiency`*/
;
SET @saved_cs_client = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `zone_distribution_efficiency` AS SELECT
 1 AS `zone_id`,
 1 AS `warehouse_id`,
 1 AS `warehouse_name`,
 1 AS `zone_name`,
 1 AS `zone_type`,
 1 AS `capacity_limit`,
 1 AS `current_quantity`,
 1 AS `utilization_percent`,
 1 AS `efficiency_status`,
 1 AS `unique_products` */
;
SET character_set_client = @saved_cs_client;
--
-- Dumping events for database 'master_db'
--

--
-- Dumping routines for database 'master_db'
--
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */
;
/*!50003 DROP PROCEDURE IF EXISTS `create_bin_for_zone` */
;
/*!50003 SET @saved_cs_client      = @@character_set_client */
;
/*!50003 SET @saved_cs_results     = @@character_set_results */
;
/*!50003 SET @saved_col_connection = @@collation_connection */
;
/*!50003 SET character_set_client  = utf8mb4 */
;
/*!50003 SET character_set_results = utf8mb4 */
;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */
;
DELIMITER;
;
CREATE DEFINER = `lechibang` @`localhost` PROCEDURE `create_bin_for_zone`(
  IN p_zone_id INT,
  IN p_aisle VARCHAR(10),
  IN p_rack VARCHAR(10),
  IN p_shelf VARCHAR(10),
  IN p_capacity INT,
  IN p_bin_type VARCHAR(20),
  OUT p_bin_id INT,
  OUT p_bin_code VARCHAR(50)
) BEGIN
DECLARE v_bin_prefix VARCHAR(10);
DECLARE v_bin_sequence INT;
DECLARE v_zone_type VARCHAR(50);
SELECT bin_prefix,
  zone_type INTO v_bin_prefix,
  v_zone_type
FROM warehouse_zones
WHERE zone_id = p_zone_id;
SELECT COALESCE(MAX(bin_sequence), 0) + 1 INTO v_bin_sequence
FROM bin_locations
WHERE zone_id = p_zone_id;
SET p_bin_code = CONCAT(
    COALESCE(v_bin_prefix, 'BIN'),
    '-',
    LPAD(v_bin_sequence, 4, '0')
  );
INSERT INTO bin_locations (
    zone_id,
    aisle,
    rack,
    shelf,
    bin_code,
    bin_type,
    max_capacity,
    bin_prefix,
    bin_sequence,
    is_active
  )
VALUES (
    p_zone_id,
    p_aisle,
    p_rack,
    p_shelf,
    p_bin_code,
    p_bin_type,
    p_capacity,
    v_bin_prefix,
    v_bin_sequence,
    1
  );
SET p_bin_id = LAST_INSERT_ID();
END;
;
DELIMITER;
/*!50003 SET sql_mode              = @saved_sql_mode */
;
/*!50003 SET character_set_client  = @saved_cs_client */
;
/*!50003 SET character_set_results = @saved_cs_results */
;
/*!50003 SET collation_connection  = @saved_col_connection */
;
/*!50003 SET @saved_sql_mode       = @@sql_mode */
;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */
;
/*!50003 DROP PROCEDURE IF EXISTS `get_zone_bins_summary` */
;
/*!50003 SET @saved_cs_client      = @@character_set_client */
;
/*!50003 SET @saved_cs_results     = @@character_set_results */
;
/*!50003 SET @saved_col_connection = @@collation_connection */
;
/*!50003 SET character_set_client  = utf8mb4 */
;
/*!50003 SET character_set_results = utf8mb4 */
;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */
;
DELIMITER;
;
CREATE DEFINER = `lechibang` @`localhost` PROCEDURE `get_zone_bins_summary`(IN p_zone_id INT) BEGIN
SELECT zbh.*,
  bcv.bin_code,
  bcv.bin_type,
  bcv.current_quantity,
  bcv.available_capacity,
  bcv.utilization_percent,
  bcv.capacity_status
FROM zone_bin_hierarchy zbh
  LEFT JOIN bin_capacity_view bcv ON zbh.zone_id = bcv.zone_id
WHERE zbh.zone_id = p_zone_id
ORDER BY bcv.aisle,
  bcv.rack,
  bcv.shelf,
  bcv.bin_code;
END;
;
DELIMITER;
/*!50003 SET sql_mode              = @saved_sql_mode */
;
/*!50003 SET character_set_client  = @saved_cs_client */
;
/*!50003 SET character_set_results = @saved_cs_results */
;
/*!50003 SET collation_connection  = @saved_col_connection */
;
--
-- Final view structure for view `bin_capacity_view`
--

/*!50001 DROP VIEW IF EXISTS `bin_capacity_view`*/
;
/*!50001 SET @saved_cs_client          = @@character_set_client */
;
/*!50001 SET @saved_cs_results         = @@character_set_results */
;
/*!50001 SET @saved_col_connection     = @@collation_connection */
;
/*!50001 SET character_set_client      = utf8mb4 */
;
/*!50001 SET character_set_results     = utf8mb4 */
;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */
;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `bin_capacity_view` AS select `bl`.`bin_id` AS `bin_id`,`bl`.`zone_id` AS `zone_id`,`bl`.`bin_code` AS `bin_code`,`bl`.`bin_type` AS `bin_type`,`bl`.`aisle` AS `aisle`,`bl`.`rack` AS `rack`,`bl`.`shelf` AS `shelf`,`bl`.`max_capacity` AS `max_capacity`,`bl`.`priority_level` AS `priority_level`,`bl`.`accessibility_level` AS `accessibility_level`,`bl`.`is_active` AS `is_active`,`wz`.`warehouse_id` AS `warehouse_id`,`wz`.`name` AS `zone_name`,`wz`.`zone_type` AS `zone_type`,`wz`.`bin_prefix` AS `zone_bin_prefix`,`w`.`name` AS `warehouse_name`,coalesce(sum(`bi`.`quantity`),0) AS `current_quantity`,count(distinct `bi`.`product_id`) AS `unique_products`,case when `bl`.`max_capacity` is not null then `bl`.`max_capacity` - coalesce(sum(`bi`.`quantity`),0) else NULL end AS `available_capacity`,case when `bl`.`max_capacity` is not null and `bl`.`max_capacity` > 0 then round(coalesce(sum(`bi`.`quantity`),0) / `bl`.`max_capacity` * 100,2) else NULL end AS `utilization_percent`,case when `bl`.`is_active` = 0 then 'inactive' when `bl`.`max_capacity` is null then 'unlimited' when coalesce(sum(`bi`.`quantity`),0) = 0 then 'empty' when coalesce(sum(`bi`.`quantity`),0) >= `bl`.`max_capacity` then 'full' when coalesce(sum(`bi`.`quantity`),0) / nullif(`bl`.`max_capacity`,0) >= 0.9 then 'near_full' when coalesce(sum(`bi`.`quantity`),0) / nullif(`bl`.`max_capacity`,0) >= 0.7 then 'high' else 'available' end AS `capacity_status`,`bl`.`temperature_controlled` AS `temperature_controlled`,`bl`.`temperature_min` AS `temperature_min`,`bl`.`temperature_max` AS `temperature_max`,`bl`.`height_cm` AS `height_cm`,`bl`.`width_cm` AS `width_cm`,`bl`.`depth_cm` AS `depth_cm`,`bl`.`weight_capacity` AS `weight_capacity` from (((`bin_locations` `bl` join `warehouse_zones` `wz` on(`bl`.`zone_id` = `wz`.`zone_id`)) join `warehouses` `w` on(`wz`.`warehouse_id` = `w`.`warehouse_id`)) left join `bin_inventory` `bi` on(`bl`.`bin_id` = `bi`.`bin_id`)) group by `bl`.`bin_id` */
;
/*!50001 SET character_set_client      = @saved_cs_client */
;
/*!50001 SET character_set_results     = @saved_cs_results */
;
/*!50001 SET collation_connection      = @saved_col_connection */
;
--
-- Final view structure for view `expiring_batches`
--

/*!50001 DROP VIEW IF EXISTS `expiring_batches`*/
;
/*!50001 SET @saved_cs_client          = @@character_set_client */
;
/*!50001 SET @saved_cs_results         = @@character_set_results */
;
/*!50001 SET @saved_col_connection     = @@collation_connection */
;
/*!50001 SET character_set_client      = utf8mb4 */
;
/*!50001 SET character_set_results     = utf8mb4 */
;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */
;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `expiring_batches` AS select `bt`.`batch_id` AS `batch_id`,`bt`.`batch_no` AS `batch_no`,`bt`.`product_id` AS `product_id`,`s`.`device_name` AS `product_name`,`s`.`device_maker` AS `brand`,`bt`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,`bt`.`zone_id` AS `zone_id`,`wz`.`name` AS `zone_name`,`bt`.`quantity` AS `quantity`,`bt`.`manufacture_date` AS `manufacture_date`,`bt`.`expiry_date` AS `expiry_date`,to_days(`bt`.`expiry_date`) - to_days(curdate()) AS `days_until_expiry`,case when to_days(`bt`.`expiry_date`) - to_days(curdate()) <= 0 then 'Expired' when to_days(`bt`.`expiry_date`) - to_days(curdate()) <= 30 then 'Critical' when to_days(`bt`.`expiry_date`) - to_days(curdate()) <= 90 then 'Warning' else 'Normal' end AS `expiry_status` from (((`batch_tracking` `bt` left join `specs_db` `s` on(`bt`.`product_id` = `s`.`product_id`)) left join `warehouses` `w` on(`bt`.`warehouse_id` = `w`.`warehouse_id`)) left join `warehouse_zones` `wz` on(`bt`.`zone_id` = `wz`.`zone_id`)) where `bt`.`expiry_date` is not null and `w`.`is_active` = 1 order by `bt`.`expiry_date` */
;
/*!50001 SET character_set_client      = @saved_cs_client */
;
/*!50001 SET character_set_results     = @saved_cs_results */
;
/*!50001 SET collation_connection      = @saved_col_connection */
;
--
-- Final view structure for view `inventory_movement_tracking`
--

/*!50001 DROP VIEW IF EXISTS `inventory_movement_tracking`*/
;
/*!50001 SET @saved_cs_client          = @@character_set_client */
;
/*!50001 SET @saved_cs_results         = @@character_set_results */
;
/*!50001 SET @saved_col_connection     = @@collation_connection */
;
/*!50001 SET character_set_client      = utf8mb4 */
;
/*!50001 SET character_set_results     = utf8mb4 */
;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */
;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `inventory_movement_tracking` AS select `il`.`log_id` AS `log_id`,`il`.`transaction_date` AS `transaction_date`,`il`.`transaction_type` AS `transaction_type`,`il`.`product_id` AS `product_id`,`s`.`device_name` AS `product_name`,`s`.`device_maker` AS `brand`,`il`.`quantity_changed` AS `quantity_changed`,`il`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,`il`.`zone_id` AS `zone_id`,`wz`.`name` AS `zone_name`,`il`.`batch_id` AS `batch_id`,`bt`.`batch_no` AS `batch_no`,`il`.`serial_number` AS `serial_number`,`il`.`notes` AS `notes`,`il`.`user_id` AS `user_id`,`il`.`created_at` AS `created_at` from ((((`inventory_log` `il` left join `specs_db` `s` on(`il`.`product_id` = `s`.`product_id`)) left join `warehouses` `w` on(`il`.`warehouse_id` = `w`.`warehouse_id`)) left join `warehouse_zones` `wz` on(`il`.`zone_id` = `wz`.`zone_id`)) left join `batch_tracking` `bt` on(`il`.`batch_id` = `bt`.`batch_id`)) order by `il`.`transaction_date` desc,`il`.`created_at` desc */
;
/*!50001 SET character_set_client      = @saved_cs_client */
;
/*!50001 SET character_set_results     = @saved_cs_results */
;
/*!50001 SET collation_connection      = @saved_col_connection */
;
--
-- Final view structure for view `inventory_overview`
--

/*!50001 DROP VIEW IF EXISTS `inventory_overview`*/
;
/*!50001 SET @saved_cs_client          = @@character_set_client */
;
/*!50001 SET @saved_cs_results         = @@character_set_results */
;
/*!50001 SET @saved_col_connection     = @@collation_connection */
;
/*!50001 SET character_set_client      = utf8mb4 */
;
/*!50001 SET character_set_results     = utf8mb4 */
;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */
;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `inventory_overview` AS select `s`.`product_id` AS `product_id`,`s`.`device_name` AS `device_name`,`s`.`device_maker` AS `device_maker`,`s`.`device_price` AS `device_price`,NULL AS `warehouse_id`,'Central Staging' AS `warehouse_name`,NULL AS `zone_id`,'Staging' AS `zone_name`,'staging' AS `zone_type`,`s`.`staging_inventory` AS `warehouse_quantity`,0 AS `reserved_quantity`,`s`.`staging_inventory` AS `available_quantity` from `specs_db` `s` where `s`.`staging_inventory` > 0 union all select `wpl`.`product_id` AS `product_id`,`s`.`device_name` AS `device_name`,`s`.`device_maker` AS `device_maker`,`s`.`device_price` AS `device_price`,`wpl`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,`wpl`.`zone_id` AS `zone_id`,`wz`.`name` AS `zone_name`,`wz`.`zone_type` AS `zone_type`,`wpl`.`quantity` AS `warehouse_quantity`,coalesce(`wpl`.`reserved_quantity`,0) AS `reserved_quantity`,`wpl`.`quantity` - coalesce(`wpl`.`reserved_quantity`,0) AS `available_quantity` from (((`warehouse_product_locations` `wpl` join `specs_db` `s` on(`wpl`.`product_id` = `s`.`product_id`)) join `warehouses` `w` on(`wpl`.`warehouse_id` = `w`.`warehouse_id`)) left join `warehouse_zones` `wz` on(`wpl`.`zone_id` = `wz`.`zone_id`)) where `wpl`.`quantity` > 0 and `w`.`is_active` = 1 order by `device_name`,`warehouse_name`,`zone_name` */
;
/*!50001 SET character_set_client      = @saved_cs_client */
;
/*!50001 SET character_set_results     = @saved_cs_results */
;
/*!50001 SET collation_connection      = @saved_col_connection */
;
--
-- Final view structure for view `low_staging_inventory_alerts`
--

/*!50001 DROP VIEW IF EXISTS `low_staging_inventory_alerts`*/
;
/*!50001 SET @saved_cs_client          = @@character_set_client */
;
/*!50001 SET @saved_cs_results         = @@character_set_results */
;
/*!50001 SET @saved_col_connection     = @@collation_connection */
;
/*!50001 SET character_set_client      = utf8mb4 */
;
/*!50001 SET character_set_results     = utf8mb4 */
;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */
;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `low_staging_inventory_alerts` AS select `s`.`product_id` AS `product_id`,`s`.`device_name` AS `device_name`,`s`.`device_maker` AS `device_maker`,`s`.`device_price` AS `device_price`,coalesce(`s`.`staging_inventory`,0) AS `staging_quantity`,10 AS `min_stock_level`,10 - coalesce(`s`.`staging_inventory`,0) AS `shortage_quantity`,case when coalesce(`s`.`staging_inventory`,0) = 0 then 'Out of Stock' when coalesce(`s`.`staging_inventory`,0) <= 2 then 'Critical' when coalesce(`s`.`staging_inventory`,0) <= 5 then 'Low' else 'Warning' end AS `alert_level`,coalesce(`s`.`staging_inventory`,0) AS `total_warehouse_quantity`,`s`.`default_supplier_id` AS `default_supplier_id`,`sup`.`name` AS `default_supplier_name`,`sup`.`email` AS `email`,`sup`.`phone` AS `phone` from (`specs_db` `s` left join `suppliers` `sup` on(`s`.`default_supplier_id` = `sup`.`id`)) where coalesce(`s`.`staging_inventory`,0) <= 10 order by case when coalesce(`s`.`staging_inventory`,0) = 0 then 1 when coalesce(`s`.`staging_inventory`,0) <= 2 then 2 when coalesce(`s`.`staging_inventory`,0) <= 5 then 3 else 4 end,`s`.`staging_inventory` */
;
/*!50001 SET character_set_client      = @saved_cs_client */
;
/*!50001 SET character_set_results     = @saved_cs_results */
;
/*!50001 SET collation_connection      = @saved_col_connection */
;
--
-- Final view structure for view `low_stock_alerts`
--

/*!50001 DROP VIEW IF EXISTS `low_stock_alerts`*/
;
/*!50001 SET @saved_cs_client          = @@character_set_client */
;
/*!50001 SET @saved_cs_results         = @@character_set_results */
;
/*!50001 SET @saved_col_connection     = @@collation_connection */
;
/*!50001 SET character_set_client      = utf8mb4 */
;
/*!50001 SET character_set_results     = utf8mb4 */
;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */
;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `low_stock_alerts` AS select `wpl`.`location_id` AS `location_id`,`wpl`.`product_id` AS `product_id`,`s`.`device_name` AS `device_name`,`s`.`device_maker` AS `device_maker`,`s`.`device_price` AS `device_price`,`wpl`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,`wpl`.`zone_id` AS `zone_id`,`wz`.`name` AS `zone_name`,`wpl`.`quantity` AS `warehouse_quantity`,coalesce(`s`.`staging_inventory`,0) AS `staging_quantity`,`wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) AS `current_quantity`,`wpl`.`reserved_quantity` AS `reserved_quantity`,`wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) - `wpl`.`reserved_quantity` AS `available_quantity`,`wpl`.`min_stock_level` AS `min_stock_level`,`wpl`.`min_stock_level` - (`wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0)) AS `shortage_quantity`,case when `wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) = 0 then 'Out of Stock' when `wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) <= `wpl`.`min_stock_level` * 0.25 then 'Critical' when `wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) <= `wpl`.`min_stock_level` * 0.5 then 'Low' else 'Warning' end AS `alert_level`,`wpl`.`updated_at` AS `last_updated` from (((`warehouse_product_locations` `wpl` join `specs_db` `s` on(`wpl`.`product_id` = `s`.`product_id`)) join `warehouses` `w` on(`wpl`.`warehouse_id` = `w`.`warehouse_id`)) left join `warehouse_zones` `wz` on(`wpl`.`zone_id` = `wz`.`zone_id`)) where `wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) <= `wpl`.`min_stock_level` and `w`.`is_active` = 1 order by case when `wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) = 0 then 1 when `wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) <= `wpl`.`min_stock_level` * 0.25 then 2 when `wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) <= `wpl`.`min_stock_level` * 0.5 then 3 else 4 end,`wpl`.`quantity` + coalesce(`s`.`staging_inventory`,0) */
;
/*!50001 SET character_set_client      = @saved_cs_client */
;
/*!50001 SET character_set_results     = @saved_cs_results */
;
/*!50001 SET collation_connection      = @saved_col_connection */
;
--
-- Final view structure for view `product_inventory_computed`
--

/*!50001 DROP VIEW IF EXISTS `product_inventory_computed`*/
;
/*!50001 SET @saved_cs_client          = @@character_set_client */
;
/*!50001 SET @saved_cs_results         = @@character_set_results */
;
/*!50001 SET @saved_col_connection     = @@collation_connection */
;
/*!50001 SET character_set_client      = utf8mb4 */
;
/*!50001 SET character_set_results     = utf8mb4 */
;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */
;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `product_inventory_computed` AS select `p`.`product_id` AS `product_id`,`p`.`device_name` AS `device_name`,`p`.`device_maker` AS `device_maker`,`p`.`device_price` AS `device_price`,coalesce(`bulk_inv`.`total_quantity`,0) + coalesce(`serial_inv`.`total_quantity`,0) + coalesce(`bin_inv`.`total_quantity`,0) AS `total_inventory`,coalesce(`bulk_inv`.`total_quantity`,0) AS `bulk_inventory`,coalesce(`serial_inv`.`total_quantity`,0) AS `serialized_inventory`,coalesce(`bin_inv`.`total_quantity`,0) AS `bin_inventory`,coalesce(`bulk_inv`.`reserved_quantity`,0) AS `reserved_quantity`,coalesce(`bulk_inv`.`total_quantity`,0) + coalesce(`serial_inv`.`total_quantity`,0) + coalesce(`bin_inv`.`total_quantity`,0) - coalesce(`bulk_inv`.`reserved_quantity`,0) AS `available_inventory`,`p`.`reorder_point` AS `reorder_point`,`p`.`reorder_quantity` AS `reorder_quantity`,`p`.`safety_stock` AS `safety_stock`,case when coalesce(`bulk_inv`.`total_quantity`,0) + coalesce(`serial_inv`.`total_quantity`,0) + coalesce(`bin_inv`.`total_quantity`,0) = 0 then 'OUT_OF_STOCK' when coalesce(`bulk_inv`.`total_quantity`,0) + coalesce(`serial_inv`.`total_quantity`,0) + coalesce(`bin_inv`.`total_quantity`,0) - coalesce(`bulk_inv`.`reserved_quantity`,0) <= `p`.`safety_stock` then 'CRITICAL' when coalesce(`bulk_inv`.`total_quantity`,0) + coalesce(`serial_inv`.`total_quantity`,0) + coalesce(`bin_inv`.`total_quantity`,0) <= `p`.`reorder_point` then 'LOW' else 'SUFFICIENT' end AS `stock_status` from (((`specs_db` `p` left join (select `warehouse_product_locations`.`product_id` AS `product_id`,sum(`warehouse_product_locations`.`quantity`) AS `total_quantity`,sum(`warehouse_product_locations`.`reserved_quantity`) AS `reserved_quantity` from `warehouse_product_locations` group by `warehouse_product_locations`.`product_id`) `bulk_inv` on(`p`.`product_id` = `bulk_inv`.`product_id`)) left join (select `serialized_inventory`.`product_id` AS `product_id`,count(0) AS `total_quantity` from `serialized_inventory` where `serialized_inventory`.`status` in ('available','reserved') group by `serialized_inventory`.`product_id`) `serial_inv` on(`p`.`product_id` = `serial_inv`.`product_id`)) left join (select `bin_inventory`.`product_id` AS `product_id`,sum(`bin_inventory`.`quantity`) AS `total_quantity` from `bin_inventory` group by `bin_inventory`.`product_id`) `bin_inv` on(`p`.`product_id` = `bin_inv`.`product_id`)) */
;
/*!50001 SET character_set_client      = @saved_cs_client */
;
/*!50001 SET character_set_results     = @saved_cs_results */
;
/*!50001 SET collation_connection      = @saved_col_connection */
;
--
-- Final view structure for view `serial_inventory_status`
--

/*!50001 DROP VIEW IF EXISTS `serial_inventory_status`*/
;
/*!50001 SET @saved_cs_client          = @@character_set_client */
;
/*!50001 SET @saved_cs_results         = @@character_set_results */
;
/*!50001 SET @saved_col_connection     = @@collation_connection */
;
/*!50001 SET character_set_client      = utf8mb4 */
;
/*!50001 SET character_set_results     = utf8mb4 */
;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */
;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `serial_inventory_status` AS select `si`.`serial_id` AS `serial_id`,`si`.`serial_number` AS `serial_number`,`si`.`product_id` AS `product_id`,`s`.`device_name` AS `product_name`,`s`.`device_maker` AS `brand`,`si`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,`si`.`zone_id` AS `zone_id`,`wz`.`name` AS `zone_name`,`si`.`status` AS `status`,`si`.`created_at` AS `created_at`,`si`.`updated_at` AS `updated_at` from (((`serialized_inventory` `si` left join `specs_db` `s` on(`si`.`product_id` = `s`.`product_id`)) left join `warehouses` `w` on(`si`.`warehouse_id` = `w`.`warehouse_id`)) left join `warehouse_zones` `wz` on(`si`.`zone_id` = `wz`.`zone_id`)) where `w`.`is_active` = 1 */
;
/*!50001 SET character_set_client      = @saved_cs_client */
;
/*!50001 SET character_set_results     = @saved_cs_results */
;
/*!50001 SET collation_connection      = @saved_col_connection */
;
--
-- Final view structure for view `spare_parts_low_stock`
--

/*!50001 DROP VIEW IF EXISTS `spare_parts_low_stock`*/
;
/*!50001 SET @saved_cs_client          = @@character_set_client */
;
/*!50001 SET @saved_cs_results         = @@character_set_results */
;
/*!50001 SET @saved_col_connection     = @@collation_connection */
;
/*!50001 SET character_set_client      = utf8mb4 */
;
/*!50001 SET character_set_results     = utf8mb4 */
;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */
;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `spare_parts_low_stock` AS select `sp`.`spare_part_id` AS `spare_part_id`,`sp`.`part_code` AS `part_code`,`sp`.`part_name` AS `part_name`,`sp`.`part_category` AS `part_category`,`sp`.`quality_grade` AS `quality_grade`,coalesce(sum(`spi`.`quantity_on_hand`),0) AS `total_quantity`,coalesce(sum(`spi`.`quantity_reserved`),0) AS `total_reserved`,coalesce(sum(`spi`.`quantity_on_hand`) - sum(`spi`.`quantity_reserved`),0) AS `available_quantity`,`sp`.`minimum_stock_level` AS `minimum_stock_level`,`sp`.`reorder_point` AS `reorder_point`,`sp`.`reorder_quantity` AS `reorder_quantity`,`sp`.`default_supplier_id` AS `default_supplier_id`,`s`.`name` AS `supplier_name`,case when coalesce(sum(`spi`.`quantity_on_hand`),0) = 0 then 'OUT_OF_STOCK' when coalesce(sum(`spi`.`quantity_on_hand`),0) <= `sp`.`minimum_stock_level` then 'CRITICAL' when coalesce(sum(`spi`.`quantity_on_hand`),0) <= `sp`.`reorder_point` then 'LOW' else 'SUFFICIENT' end AS `stock_status`,max(`spi`.`updated_at`) AS `last_updated` from ((`smartphone_spare_parts` `sp` left join `smartphone_spare_parts_inventory` `spi` on(`sp`.`spare_part_id` = `spi`.`spare_part_id`)) left join `suppliers` `s` on(`sp`.`default_supplier_id` = `s`.`id`)) where `sp`.`is_active` = 1 group by `sp`.`spare_part_id`,`sp`.`part_code`,`sp`.`part_name`,`sp`.`part_category`,`sp`.`quality_grade`,`sp`.`minimum_stock_level`,`sp`.`reorder_point`,`sp`.`reorder_quantity`,`sp`.`default_supplier_id`,`s`.`name` having coalesce(sum(`spi`.`quantity_on_hand`),0) <= `sp`.`reorder_point` or coalesce(sum(`spi`.`quantity_on_hand`),0) = 0 */
;
/*!50001 SET character_set_client      = @saved_cs_client */
;
/*!50001 SET character_set_results     = @saved_cs_results */
;
/*!50001 SET collation_connection      = @saved_col_connection */
;
--
-- Final view structure for view `stock_valuation_by_supplier`
--

/*!50001 DROP VIEW IF EXISTS `stock_valuation_by_supplier`*/
;
/*!50001 SET @saved_cs_client          = @@character_set_client */
;
/*!50001 SET @saved_cs_results         = @@character_set_results */
;
/*!50001 SET @saved_col_connection     = @@collation_connection */
;
/*!50001 SET character_set_client      = utf8mb4 */
;
/*!50001 SET character_set_results     = utf8mb4 */
;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */
;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `stock_valuation_by_supplier` AS select `s`.`id` AS `supplier_id`,`s`.`name` AS `supplier_name`,`s`.`category` AS `category`,count(distinct `p`.`product_id`) AS `product_count`,sum(`p`.`staging_inventory`) AS `total_quantity`,sum(`p`.`staging_inventory` * coalesce((select `il`.`unit_cost` from `inventory_log` `il` where `il`.`product_id` = `p`.`product_id` and `il`.`supplier_id` = `s`.`id` and `il`.`unit_cost` is not null order by `il`.`created_at` desc limit 1),`p`.`device_price`,0)) AS `total_value` from (`suppliers` `s` left join `specs_db` `p` on(`p`.`default_supplier_id` = `s`.`id`)) where `s`.`is_active` = 1 and `p`.`staging_inventory` > 0 group by `s`.`id`,`s`.`name`,`s`.`category` */
;
/*!50001 SET character_set_client      = @saved_cs_client */
;
/*!50001 SET character_set_results     = @saved_cs_results */
;
/*!50001 SET collation_connection      = @saved_col_connection */
;
--
-- Final view structure for view `v_all_transactions`
--

/*!50001 DROP VIEW IF EXISTS `v_all_transactions`*/
;
/*!50001 SET @saved_cs_client          = @@character_set_client */
;
/*!50001 SET @saved_cs_results         = @@character_set_results */
;
/*!50001 SET @saved_col_connection     = @@collation_connection */
;
/*!50001 SET character_set_client      = utf8mb4 */
;
/*!50001 SET character_set_results     = utf8mb4 */
;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */
;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_all_transactions` AS select coalesce(`il`.`transaction_group_id`,concat('LOG-',`il`.`log_id`)) AS `transaction_id`,max(`il`.`transaction_type`) AS `transaction_type`,min(`il`.`transaction_date`) AS `transaction_date`,max(`il`.`supplier_id`) AS `supplier_id`,max(`il`.`warehouse_id`) AS `warehouse_id`,max(`il`.`zone_id`) AS `zone_id`,sum(coalesce(`il`.`total_amount`,`il`.`total_value`,0)) AS `total_amount`,sum(coalesce(`il`.`subtotal`,`il`.`total_value`,0)) AS `subtotal`,sum(coalesce(`il`.`tax_amount`,0)) AS `tax_amount`,max(`il`.`notes`) AS `notes`,case when `il`.`transaction_group_id` is not null then 'receipt' else 'inventory_log' end AS `source`,count(distinct `il`.`product_id`) AS `item_count`,min(`il`.`created_at`) AS `created_at`,max(`il`.`updated_at`) AS `updated_at` from `inventory_log` `il` where `il`.`transaction_type` in ('incoming','outgoing','transfer','rma_return','rma_disposition') and (`il`.`transaction_group_id` is not null or `il`.`receipt_id` is null) group by coalesce(`il`.`transaction_group_id`,concat('LOG-',`il`.`log_id`)),case when `il`.`transaction_group_id` is not null then 'receipt' else 'inventory_log' end */
;
/*!50001 SET character_set_client      = @saved_cs_client */
;
/*!50001 SET character_set_results     = @saved_cs_results */
;
/*!50001 SET collation_connection      = @saved_col_connection */
;
--
-- Final view structure for view `v_cycle_count_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_cycle_count_summary`*/
;
/*!50001 SET @saved_cs_client          = @@character_set_client */
;
/*!50001 SET @saved_cs_results         = @@character_set_results */
;
/*!50001 SET @saved_col_connection     = @@collation_connection */
;
/*!50001 SET character_set_client      = utf8mb4 */
;
/*!50001 SET character_set_results     = utf8mb4 */
;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */
;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_cycle_count_summary` AS select `s`.`stocktake_id` AS `stocktake_id`,`s`.`stocktake_number` AS `stocktake_number`,`s`.`count_type` AS `count_type`,`s`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,`s`.`zone_id` AS `zone_id`,`wz`.`name` AS `zone_name`,`s`.`status` AS `status`,`s`.`scheduled_for` AS `scheduled_for`,`s`.`started_at` AS `started_at`,`s`.`completed_at` AS `completed_at`,`s`.`approved_at` AS `approved_at`,count(`si`.`id`) AS `total_items`,sum(case when `si`.`counted_quantity` is not null then 1 else 0 end) AS `items_counted`,sum(case when `si`.`variance` <> 0 then 1 else 0 end) AS `items_with_variance`,round(sum(case when `si`.`counted_quantity` is not null then 1 else 0 end) / nullif(count(`si`.`id`),0) * 100,1) AS `completion_pct`,sum(abs(coalesce(`si`.`variance`,0))) AS `total_variance_qty` from (((`stocktakes` `s` left join `stocktake_items` `si` on(`s`.`stocktake_id` = `si`.`stocktake_id`)) left join `warehouses` `w` on(`s`.`warehouse_id` = `w`.`warehouse_id`)) left join `warehouse_zones` `wz` on(`s`.`zone_id` = `wz`.`zone_id`)) group by `s`.`stocktake_id` */
;
/*!50001 SET character_set_client      = @saved_cs_client */
;
/*!50001 SET character_set_results     = @saved_cs_results */
;
/*!50001 SET collation_connection      = @saved_col_connection */
;
--
-- Final view structure for view `v_inventory_accuracy`
--

/*!50001 DROP VIEW IF EXISTS `v_inventory_accuracy`*/
;
/*!50001 SET @saved_cs_client          = @@character_set_client */
;
/*!50001 SET @saved_cs_results         = @@character_set_results */
;
/*!50001 SET @saved_col_connection     = @@collation_connection */
;
/*!50001 SET character_set_client      = utf8mb4 */
;
/*!50001 SET character_set_results     = utf8mb4 */
;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */
;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_inventory_accuracy` AS select `w`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,count(`pch`.`product_id`) AS `products_counted`,sum(case when `pch`.`count_result` = 'match' then 1 else 0 end) AS `products_matched`,sum(case when `pch`.`count_result` = 'variance' then 1 else 0 end) AS `products_with_variance`,round(sum(case when `pch`.`count_result` = 'match' then 1 else 0 end) / nullif(count(`pch`.`product_id`),0) * 100,2) AS `accuracy_pct`,sum(abs(`pch`.`variance_qty`)) AS `total_variance_qty`,sum(`pch`.`variance_qty`) AS `total_system_qty_variance`,round(sum(case when `pch`.`count_result` = 'match' then 1 else 0 end) / nullif(count(`pch`.`product_id`),0) * 100,2) AS `ira_pct`,max(`pch`.`last_counted_at`) AS `last_count_date` from (`warehouses` `w` left join `product_count_history` `pch` on(`w`.`warehouse_id` = `pch`.`warehouse_id`)) group by `w`.`warehouse_id` */
;
/*!50001 SET character_set_client      = @saved_cs_client */
;
/*!50001 SET character_set_results     = @saved_cs_results */
;
/*!50001 SET collation_connection      = @saved_col_connection */
;
--
-- Final view structure for view `v_items_due_for_count`
--

/*!50001 DROP VIEW IF EXISTS `v_items_due_for_count`*/
;
/*!50001 SET @saved_cs_client          = @@character_set_client */
;
/*!50001 SET @saved_cs_results         = @@character_set_results */
;
/*!50001 SET @saved_col_connection     = @@collation_connection */
;
/*!50001 SET character_set_client      = utf8mb4 */
;
/*!50001 SET character_set_results     = utf8mb4 */
;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */
;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_items_due_for_count` AS select `wpl`.`product_id` AS `product_id`,`s`.`device_name` AS `device_name`,`s`.`device_maker` AS `device_maker`,`wpl`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,`wpl`.`zone_id` AS `zone_id`,`z`.`name` AS `zone_name`,`wpl`.`quantity` AS `quantity`,`pch`.`last_counted_at` AS `last_counted_at`,`pch`.`count_result` AS `last_count_result`,coalesce(case `ccs`.`frequency` when 'daily' then 1 when 'weekly' then 7 when 'bi_weekly' then 14 when 'monthly' then 30 when 'quarterly' then 90 else 30 end,30) AS `count_frequency_days`,to_days(current_timestamp()) - to_days(`pch`.`last_counted_at`) AS `days_since_count`,case when `pch`.`last_counted_at` is null then 1 when to_days(current_timestamp()) - to_days(`pch`.`last_counted_at`) >= coalesce(case `ccs`.`frequency` when 'daily' then 1 when 'weekly' then 7 when 'bi_weekly' then 14 when 'monthly' then 30 when 'quarterly' then 90 else 30 end,30) then 1 else 0 end AS `is_due` from (((((`warehouse_product_locations` `wpl` join `specs_db` `s` on(`wpl`.`product_id` = `s`.`product_id`)) join `warehouses` `w` on(`wpl`.`warehouse_id` = `w`.`warehouse_id`)) left join `warehouse_zones` `z` on(`wpl`.`zone_id` = `z`.`zone_id`)) left join `product_count_history` `pch` on(`wpl`.`product_id` = `pch`.`product_id` and `wpl`.`warehouse_id` = `pch`.`warehouse_id` and (`wpl`.`zone_id` = `pch`.`zone_id` or `wpl`.`zone_id` is null and `pch`.`zone_id` is null))) left join `cycle_count_schedules` `ccs` on(`wpl`.`warehouse_id` = `ccs`.`warehouse_id` and (`wpl`.`zone_id` = `ccs`.`zone_id` or `ccs`.`zone_id` is null) and `ccs`.`is_active` = 1)) where `wpl`.`quantity` > 0 */
;
/*!50001 SET character_set_client      = @saved_cs_client */
;
/*!50001 SET character_set_results     = @saved_cs_results */
;
/*!50001 SET collation_connection      = @saved_col_connection */
;
--
-- Final view structure for view `warehouse_distribution_overview`
--

/*!50001 DROP VIEW IF EXISTS `warehouse_distribution_overview`*/
;
/*!50001 SET @saved_cs_client          = @@character_set_client */
;
/*!50001 SET @saved_cs_results         = @@character_set_results */
;
/*!50001 SET @saved_col_connection     = @@collation_connection */
;
/*!50001 SET character_set_client      = utf8mb4 */
;
/*!50001 SET character_set_results     = utf8mb4 */
;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */
;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `warehouse_distribution_overview` AS select `w`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,count(distinct `wz`.`zone_id`) AS `total_zones`,coalesce(`bulk_inventory`.`total_quantity`,0) + coalesce(`serialized_inventory`.`total_quantity`,0) + coalesce(`spare_parts_inventory`.`total_quantity`,0) AS `total_inventory` from ((((`warehouses` `w` left join `warehouse_zones` `wz` on(`w`.`warehouse_id` = `wz`.`warehouse_id` and `wz`.`is_active` = 1)) left join (select `warehouse_product_locations`.`warehouse_id` AS `warehouse_id`,sum(`warehouse_product_locations`.`quantity`) AS `total_quantity` from `warehouse_product_locations` group by `warehouse_product_locations`.`warehouse_id`) `bulk_inventory` on(`w`.`warehouse_id` = `bulk_inventory`.`warehouse_id`)) left join (select `serialized_inventory`.`warehouse_id` AS `warehouse_id`,count(`serialized_inventory`.`serial_id`) AS `total_quantity` from `serialized_inventory` where `serialized_inventory`.`status` in ('available','reserved') group by `serialized_inventory`.`warehouse_id`) `serialized_inventory` on(`w`.`warehouse_id` = `serialized_inventory`.`warehouse_id`)) left join (select `spi`.`warehouse_id` AS `warehouse_id`,sum(`spi`.`quantity_on_hand`) AS `total_quantity` from (`smartphone_spare_parts_inventory` `spi` join `smartphone_spare_parts` `sp` on(`spi`.`spare_part_id` = `sp`.`spare_part_id`)) where `sp`.`is_active` = 1 group by `spi`.`warehouse_id`) `spare_parts_inventory` on(`w`.`warehouse_id` = `spare_parts_inventory`.`warehouse_id`)) where `w`.`is_active` = 1 group by `w`.`warehouse_id`,`w`.`name` order by coalesce(`bulk_inventory`.`total_quantity`,0) + coalesce(`serialized_inventory`.`total_quantity`,0) + coalesce(`spare_parts_inventory`.`total_quantity`,0) desc */
;
/*!50001 SET character_set_client      = @saved_cs_client */
;
/*!50001 SET character_set_results     = @saved_cs_results */
;
/*!50001 SET collation_connection      = @saved_col_connection */
;
--
-- Final view structure for view `zone_bin_hierarchy`
--

/*!50001 DROP VIEW IF EXISTS `zone_bin_hierarchy`*/
;
/*!50001 SET @saved_cs_client          = @@character_set_client */
;
/*!50001 SET @saved_cs_results         = @@character_set_results */
;
/*!50001 SET @saved_col_connection     = @@collation_connection */
;
/*!50001 SET character_set_client      = utf8mb4 */
;
/*!50001 SET character_set_results     = utf8mb4 */
;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */
;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `zone_bin_hierarchy` AS select `wz`.`zone_id` AS `zone_id`,`wz`.`warehouse_id` AS `warehouse_id`,`wz`.`name` AS `zone_name`,`wz`.`zone_type` AS `zone_type`,`wz`.`bin_prefix` AS `zone_bin_prefix`,`wz`.`max_bins` AS `max_bins`,`wz`.`require_bins` AS `require_bins`,`wz`.`capacity_limit` AS `zone_capacity_limit`,`wz`.`is_active` AS `zone_is_active`,count(distinct `bl`.`bin_id`) AS `total_bins`,count(distinct case when `bl`.`is_active` = 1 then `bl`.`bin_id` end) AS `active_bins`,coalesce(sum(`bl`.`max_capacity`),0) AS `total_bin_capacity`,coalesce(sum(`wpl`.`quantity`),0) AS `zone_inventory_quantity`,coalesce(sum(`wpl`.`reserved_quantity`),0) AS `zone_reserved_quantity`,coalesce(sum(`bi`.`quantity`),0) AS `bin_inventory_quantity`,coalesce(sum(`wpl`.`quantity`),0) + coalesce(sum(`bi`.`quantity`),0) AS `total_quantity`,case when `wz`.`capacity_limit` is not null and `wz`.`capacity_limit` > 0 then round((coalesce(sum(`wpl`.`quantity`),0) + coalesce(sum(`bi`.`quantity`),0)) / `wz`.`capacity_limit` * 100,2) else NULL end AS `zone_utilization_percent`,case when sum(`bl`.`max_capacity`) > 0 then round(coalesce(sum(`bi`.`quantity`),0) / sum(`bl`.`max_capacity`) * 100,2) else NULL end AS `bin_utilization_percent`,case when count(`bl`.`bin_id`) = 0 and `wz`.`require_bins` = 1 then 'bins_required' when count(`bl`.`bin_id`) = 0 then 'no_bins' when `wz`.`max_bins` is not null and count(`bl`.`bin_id`) >= `wz`.`max_bins` then 'bins_full' when coalesce(sum(`bi`.`quantity`),0) = 0 then 'bins_empty' else 'bins_active' end AS `bin_status` from (((`warehouse_zones` `wz` left join `bin_locations` `bl` on(`wz`.`zone_id` = `bl`.`zone_id`)) left join `warehouse_product_locations` `wpl` on(`wz`.`zone_id` = `wpl`.`zone_id`)) left join `bin_inventory` `bi` on(`bl`.`bin_id` = `bi`.`bin_id`)) group by `wz`.`zone_id` */
;
/*!50001 SET character_set_client      = @saved_cs_client */
;
/*!50001 SET character_set_results     = @saved_cs_results */
;
/*!50001 SET collation_connection      = @saved_col_connection */
;
--
-- Final view structure for view `zone_distribution_efficiency`
--

/*!50001 DROP VIEW IF EXISTS `zone_distribution_efficiency`*/
;
/*!50001 SET @saved_cs_client          = @@character_set_client */
;
/*!50001 SET @saved_cs_results         = @@character_set_results */
;
/*!50001 SET @saved_col_connection     = @@collation_connection */
;
/*!50001 SET character_set_client      = utf8mb4 */
;
/*!50001 SET character_set_results     = utf8mb4 */
;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */
;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`lechibang`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `zone_distribution_efficiency` AS select `wz`.`zone_id` AS `zone_id`,`wz`.`warehouse_id` AS `warehouse_id`,`w`.`name` AS `warehouse_name`,`wz`.`name` AS `zone_name`,`wz`.`zone_type` AS `zone_type`,`wz`.`capacity_limit` AS `capacity_limit`,0 AS `current_quantity`,0 AS `utilization_percent`,'N/A - Use Staging' AS `efficiency_status`,0 AS `unique_products` from (`warehouse_zones` `wz` join `warehouses` `w` on(`wz`.`warehouse_id` = `w`.`warehouse_id`)) where `wz`.`is_active` = 1 and `w`.`is_active` = 1 group by `wz`.`zone_id`,`wz`.`warehouse_id`,`w`.`name`,`wz`.`name`,`wz`.`zone_type`,`wz`.`capacity_limit` */
;
/*!50001 SET character_set_client      = @saved_cs_client */
;
/*!50001 SET character_set_results     = @saved_cs_results */
;
/*!50001 SET collation_connection      = @saved_col_connection */
;
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
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */
;
-- Dump completed on 2026-01-26 21:46:34