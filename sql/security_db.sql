-- MariaDB Schema for security_db
-- Re-created: 2026-02-08
-- Cleaned: normalized collation to utf8mb4_unicode_ci
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
-- INDEPENDENT TABLES
-- ============================================================
--
-- Table: users
--
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL COMMENT 'bcrypt hashed password',
  `fullName` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` timestamp NULL DEFAULT NULL,
  `failed_login_attempts` int(11) DEFAULT 0,
  `locked_until` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `role` varchar(50) DEFAULT NULL,
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_is_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'User accounts without hard-coded roles. Uses RBAC system via user_roles junction table';
--
-- Table: roles
--
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `name` varchar(50) NOT NULL COMMENT 'admin, manager, staff, read_only',
  `description` text DEFAULT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_role_name` (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Role definitions for RBAC system';
--
-- Table: permissions
--
DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
  `name` varchar(100) NOT NULL COMMENT 'inventory.read, inventory.write, users.manage',
  `description` text DEFAULT NULL,
  `resource` varchar(50) DEFAULT NULL COMMENT 'inventory, users, warehouses, reports',
  `action` varchar(50) DEFAULT NULL COMMENT 'read, write, delete, manage',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_permission_name` (`name`),
  KEY `idx_resource_action` (`resource`, `action`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Fine-grained permissions for RBAC system';
-- ============================================================
-- JUNCTION / DEPENDENT TABLES
-- ============================================================
--
-- Table: user_roles
--
DROP TABLE IF EXISTS `user_roles`;
CREATE TABLE `user_roles` (
  `assigned_at` timestamp NULL DEFAULT current_timestamp(),
  `user_id` char(36) DEFAULT NULL,
  `role_id` char(36) DEFAULT NULL,
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Many-to-many relationship between users and roles';
--
-- Table: role_permissions
--
DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `role_id` char(36) DEFAULT NULL,
  `permission_id` char(36) DEFAULT NULL,
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Many-to-many relationship between roles and permissions';
-- ============================================================
-- SESSION & AUTH TABLES
-- ============================================================
--
-- Table: sessions
--
DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `session_id` varchar(128) NOT NULL,
  `expires` bigint(20) unsigned NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `data` mediumtext DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `last_activity` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  `user_id` char(36) DEFAULT NULL,
  PRIMARY KEY (`session_id`),
  KEY `idx_expires` (`expires`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'User session storage (alternative to express-mysql-session)';
--
-- Table: invalidated_tokens
--
DROP TABLE IF EXISTS `invalidated_tokens`;
CREATE TABLE `invalidated_tokens` (
  `token_hash` varchar(255) NOT NULL COMMENT 'Hashed token for security',
  `invalidated_at` timestamp NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NOT NULL,
  `reason` varchar(100) DEFAULT NULL COMMENT 'logout, password_change, force_logout',
  `user_id` char(36) DEFAULT NULL,
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_token_hash` (`token_hash`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_invalidated_at` (`invalidated_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Blacklist for invalidated tokens (logout, password change, etc.)';
--
-- Table: user_token_invalidation
--
DROP TABLE IF EXISTS `user_token_invalidation`;
CREATE TABLE `user_token_invalidation` (
  `invalidated_at` timestamp NULL DEFAULT current_timestamp(),
  `reason` varchar(100) DEFAULT 'security_action',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `user_id` char(36) NOT NULL,
  PRIMARY KEY (`user_id`),
  KEY `idx_invalidated_at` (`invalidated_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--
-- Table: password_reset_tokens
--
DROP TABLE IF EXISTS `password_reset_tokens`;
CREATE TABLE `password_reset_tokens` (
  `token` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `user_id` char(36) DEFAULT NULL,
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_token` (`token`),
  KEY `idx_expires_at` (`expires_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Temporary tokens for password reset functionality';
--
-- Table: failed_login_attempts
--
DROP TABLE IF EXISTS `failed_login_attempts`;
CREATE TABLE `failed_login_attempts` (
  `identifier` varchar(255) NOT NULL COMMENT 'Username or email',
  `identifier_type` enum('username', 'email') NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `attempt_time` timestamp NULL DEFAULT current_timestamp(),
  `user_agent` text DEFAULT NULL,
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_identifier` (`identifier`, `identifier_type`),
  KEY `idx_ip_address` (`ip_address`),
  KEY `idx_attempt_time` (`attempt_time`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Track failed login attempts for brute-force detection';
-- ============================================================
-- AUDIT & SECURITY TABLES
-- ============================================================
--
-- Table: audit_log
--
DROP TABLE IF EXISTS `audit_log`;
CREATE TABLE `audit_log` (
  `username` varchar(50) DEFAULT NULL COMMENT 'Preserved even if user deleted',
  `action_type` varchar(50) NOT NULL COMMENT 'login, logout, create, update, delete, view',
  `resource_type` varchar(50) DEFAULT NULL COMMENT 'inventory, user, warehouse, receipt',
  `resource_id` varchar(100) DEFAULT NULL COMMENT 'ID of the affected resource',
  `description` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `request_method` varchar(10) DEFAULT NULL COMMENT 'GET, POST, PUT, DELETE',
  `request_url` varchar(500) DEFAULT NULL,
  `status_code` int(11) DEFAULT NULL,
  `changes` longtext DEFAULT NULL COMMENT 'JSON of before/after values',
  `severity` enum('info', 'warning', 'error', 'critical') DEFAULT 'info',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `user_id` char(36) DEFAULT NULL,
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_action_type` (`action_type`),
  KEY `idx_resource_type` (`resource_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_severity` (`severity`),
  KEY `idx_audit_resource` (`resource_type`, `resource_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Audit log for tracking all system activities';
--
-- Table: security_events
--
DROP TABLE IF EXISTS `security_events`;
CREATE TABLE `security_events` (
  `event_type` varchar(50) NOT NULL COMMENT 'login_success, login_fail, logout, permission_denied, data_access',
  `username` varchar(50) DEFAULT NULL COMMENT 'Preserved even if user deleted',
  `ip_address` varchar(45) DEFAULT NULL COMMENT 'IPv4 or IPv6',
  `user_agent` text DEFAULT NULL,
  `resource` varchar(100) DEFAULT NULL COMMENT 'Resource accessed',
  `action` varchar(50) DEFAULT NULL COMMENT 'Action attempted',
  `success` tinyint(1) DEFAULT 1,
  `risk_level` enum('low', 'medium', 'high', 'critical') DEFAULT 'low',
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional event details' CHECK (json_valid(`details`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `user_id` char(36) DEFAULT NULL,
  `id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_risk_level` (`risk_level`),
  KEY `idx_ip_address` (`ip_address`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Complete audit trail for security events and access control';
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
-- Schema re-created on 2026-02-08