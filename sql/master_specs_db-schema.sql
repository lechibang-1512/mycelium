-- Schema for master_specs_db
-- Generated on 2025-07-10T16:55:56.231Z

-- Table: batch_tracking
CREATE TABLE `batch_tracking` (
  `batch_id` int(11) NOT NULL AUTO_INCREMENT,
  `phone_id` bigint(20) unsigned NOT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `batch_no` varchar(100) NOT NULL,
  `lot_no` varchar(100) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `quantity_received` int(11) DEFAULT 0,
  `quantity_remaining` int(11) DEFAULT 0,
  `quantity_sold` int(11) DEFAULT 0,
  `quantity_damaged` int(11) DEFAULT 0,
  `purchase_price` decimal(10,2) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `manufacture_date` date DEFAULT NULL,
  `received_date` date DEFAULT curdate(),
  `status` enum('active','expired','recalled','depleted') DEFAULT 'active',
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`batch_id`),
  KEY `idx_batch_phone` (`phone_id`),
  KEY `idx_batch_warehouse` (`warehouse_id`),
  KEY `idx_batch_zone` (`zone_id`),
  KEY `idx_batch_number` (`batch_no`),
  KEY `idx_batch_lot` (`lot_no`),
  KEY `idx_batch_expiry` (`expiry_date`),
  KEY `idx_batch_status` (`status`),
  KEY `idx_batch_supplier` (`supplier_id`),
  CONSTRAINT `batch_tracking_ibfk_1` FOREIGN KEY (`phone_id`) REFERENCES `specs_db` (`product_id`),
  CONSTRAINT `batch_tracking_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE SET NULL,
  CONSTRAINT `batch_tracking_ibfk_3` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: expiring_batches
undefined;

-- Table: inventory_log
CREATE TABLE `inventory_log` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `phone_id` bigint(20) unsigned NOT NULL,
  `transaction_type` enum('incoming','outgoing','adjustment') NOT NULL,
  `quantity_changed` int(11) NOT NULL,
  `total_value` decimal(12,2) DEFAULT NULL,
  `new_inventory_level` int(11) NOT NULL,
  `supplier_id` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `transaction_date` timestamp NULL DEFAULT current_timestamp(),
  `warehouse_id` int(11) DEFAULT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `batch_no` varchar(100) DEFAULT NULL,
  `lot_no` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `serial_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`log_id`),
  KEY `phone_id` (`phone_id`),
  KEY `idx_inventory_warehouse` (`warehouse_id`),
  KEY `idx_inventory_zone` (`zone_id`),
  KEY `idx_inventory_batch` (`batch_no`),
  KEY `idx_inventory_lot` (`lot_no`),
  KEY `idx_inventory_expiry` (`expiry_date`),
  KEY `idx_inventory_serial` (`serial_id`),
  CONSTRAINT `inventory_log_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE SET NULL,
  CONSTRAINT `inventory_log_ibfk_2` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE SET NULL,
  CONSTRAINT `inventory_log_ibfk_3` FOREIGN KEY (`serial_id`) REFERENCES `serialized_inventory` (`serial_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: inventory_overview
undefined;

-- Table: inventory_transfers
CREATE TABLE `inventory_transfers` (
  `transfer_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned NOT NULL,
  `from_warehouse_id` int(11) NOT NULL,
  `to_warehouse_id` int(11) NOT NULL,
  `from_zone_id` int(11) DEFAULT NULL,
  `to_zone_id` int(11) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `transfer_date` timestamp NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL,
  `status` enum('pending','in_transit','completed','cancelled') DEFAULT 'pending',
  PRIMARY KEY (`transfer_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_from_warehouse` (`from_warehouse_id`),
  KEY `idx_to_warehouse` (`to_warehouse_id`),
  KEY `idx_transfer_date` (`transfer_date`),
  CONSTRAINT `fk_transfer_from_warehouse` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transfer_product` FOREIGN KEY (`product_id`) REFERENCES `specs_db` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transfer_to_warehouse` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: receipts
CREATE TABLE `receipts` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `receipt_id` varchar(50) NOT NULL,
  `receipt_type` enum('PURCHASE_RECEIPT','SALES_RECEIPT') NOT NULL,
  `receipt_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`receipt_data`)),
  `product_id` bigint(20) NOT NULL,
  `supplier_id` varchar(100) DEFAULT NULL,
  `transaction_date` datetime NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `tax_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `receipt_id` (`receipt_id`),
  KEY `idx_receipt_id` (`receipt_id`),
  KEY `idx_phone_id` (`product_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_transaction_date` (`transaction_date`),
  KEY `idx_receipt_type` (`receipt_type`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: serialized_inventory
CREATE TABLE `serialized_inventory` (
  `serial_id` int(11) NOT NULL AUTO_INCREMENT,
  `phone_id` bigint(20) unsigned NOT NULL,
  `serial_number` varchar(255) NOT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `batch_no` varchar(100) DEFAULT NULL,
  `lot_no` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `purchase_price` decimal(10,2) DEFAULT NULL,
  `condition_status` enum('new','used','refurbished','damaged') DEFAULT 'new',
  `status` enum('available','reserved','sold','damaged','returned') DEFAULT 'available',
  `supplier_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`serial_id`),
  UNIQUE KEY `serial_number` (`serial_number`),
  KEY `idx_serial_phone` (`phone_id`),
  KEY `idx_serial_warehouse` (`warehouse_id`),
  KEY `idx_serial_zone` (`zone_id`),
  KEY `idx_serial_batch` (`batch_no`),
  KEY `idx_serial_lot` (`lot_no`),
  KEY `idx_serial_expiry` (`expiry_date`),
  KEY `idx_serial_status` (`status`),
  KEY `idx_serial_supplier` (`supplier_id`),
  CONSTRAINT `serialized_inventory_ibfk_1` FOREIGN KEY (`phone_id`) REFERENCES `specs_db` (`product_id`),
  CONSTRAINT `serialized_inventory_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE SET NULL,
  CONSTRAINT `serialized_inventory_ibfk_3` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: specs_db
CREATE TABLE `specs_db` (
  `product_id` bigint(20) unsigned NOT NULL,
  `device_name` varchar(255) DEFAULT NULL,
  `device_maker` varchar(255) DEFAULT NULL,
  `device_price` decimal(10,2) DEFAULT NULL,
  `device_inventory` int(11) DEFAULT NULL,
  `color` varchar(255) DEFAULT NULL,
  `water_and_dust_rating` varchar(255) DEFAULT NULL,
  `processor` varchar(255) DEFAULT NULL,
  `process_node` varchar(255) DEFAULT NULL,
  `cpu_cores` int(11) DEFAULT NULL,
  `cpu_frequency` varchar(255) DEFAULT NULL,
  `gpu` varchar(255) DEFAULT NULL,
  `memory_type` varchar(255) DEFAULT NULL,
  `ram` varchar(255) DEFAULT NULL,
  `rom` varchar(255) DEFAULT NULL,
  `expandable_memory` varchar(255) DEFAULT NULL,
  `length_mm` decimal(5,2) DEFAULT NULL,
  `width_mm` decimal(5,2) DEFAULT NULL,
  `thickness_mm` decimal(5,2) DEFAULT NULL,
  `weight_g` decimal(6,2) DEFAULT NULL,
  `display_size` decimal(4,2) DEFAULT NULL,
  `resolution` varchar(255) DEFAULT NULL,
  `pixel_density` varchar(255) DEFAULT NULL,
  `refresh_rate` varchar(255) DEFAULT NULL,
  `brightness` varchar(255) DEFAULT NULL,
  `display_features` text DEFAULT NULL,
  `rear_camera_main` varchar(255) DEFAULT NULL,
  `rear_camera_macro` varchar(255) DEFAULT NULL,
  `rear_camera_features` text DEFAULT NULL,
  `rear_video_resolution` varchar(255) DEFAULT NULL,
  `front_camera` varchar(255) DEFAULT NULL,
  `front_camera_features` text DEFAULT NULL,
  `front_video_resolution` varchar(255) DEFAULT NULL,
  `battery_capacity` varchar(255) DEFAULT NULL,
  `fast_charging` varchar(255) DEFAULT NULL,
  `connector` varchar(255) DEFAULT NULL,
  `security_features` text DEFAULT NULL,
  `sim_card` varchar(255) DEFAULT NULL,
  `nfc` varchar(255) DEFAULT NULL,
  `network_bands` text DEFAULT NULL,
  `wireless_connectivity` text DEFAULT NULL,
  `navigation` text DEFAULT NULL,
  `audio_jack` varchar(255) DEFAULT NULL,
  `audio_playback` text DEFAULT NULL,
  `video_playback` text DEFAULT NULL,
  `sensors` text DEFAULT NULL,
  `operating_system` varchar(255) DEFAULT NULL,
  `package_contents` text DEFAULT NULL,
  `product_type` varchar(20) NOT NULL,
  PRIMARY KEY (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: warehouse_product_locations
CREATE TABLE `warehouse_product_locations` (
  `location_id` int(11) NOT NULL AUTO_INCREMENT,
  `warehouse_id` int(11) NOT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `phone_id` bigint(20) unsigned NOT NULL,
  `aisle` varchar(50) DEFAULT NULL,
  `shelf` varchar(50) DEFAULT NULL,
  `bin` varchar(50) DEFAULT NULL,
  `quantity` int(11) DEFAULT 0,
  `reserved_quantity` int(11) DEFAULT 0,
  `min_stock_level` int(11) DEFAULT 0,
  `max_stock_level` int(11) DEFAULT NULL,
  `last_counted` date DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`location_id`),
  UNIQUE KEY `unique_warehouse_zone_phone` (`warehouse_id`,`zone_id`,`phone_id`),
  KEY `idx_wpl_warehouse` (`warehouse_id`),
  KEY `idx_wpl_zone` (`zone_id`),
  KEY `idx_wpl_phone` (`phone_id`),
  KEY `idx_wpl_quantity` (`quantity`),
  KEY `idx_wpl_reserved` (`reserved_quantity`),
  CONSTRAINT `warehouse_product_locations_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE CASCADE,
  CONSTRAINT `warehouse_product_locations_ibfk_2` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones` (`zone_id`) ON DELETE SET NULL,
  CONSTRAINT `warehouse_product_locations_ibfk_3` FOREIGN KEY (`phone_id`) REFERENCES `specs_db` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: warehouse_zones
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
  KEY `idx_zone_name` (`name`),
  KEY `idx_zone_type` (`zone_type`),
  KEY `idx_zone_active` (`is_active`),
  CONSTRAINT `warehouse_zones_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`warehouse_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: warehouses
CREATE TABLE `warehouses` (
  `warehouse_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `location` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `contact_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`contact_info`)),
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`warehouse_id`),
  KEY `idx_warehouse_name` (`name`),
  KEY `idx_warehouse_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

