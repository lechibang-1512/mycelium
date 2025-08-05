-- Schema for suppliers_db
-- Generated on 2025-07-10T18:53:08.740Z
CReate database IF NOT EXISTS `suppliers_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `suppliers_db`;
-- Table: suppliers
CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `contact_position` varchar(100) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_supplier_name` (`name`),
  KEY `idx_supplier_category` (`category`),
  KEY `idx_contact_person` (`contact_person`),
  KEY `idx_contact_email` (`contact_email`),
  KEY `idx_email` (`email`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

