-- Schema for security_db
-- Generated on 2026-01-30T05:30:41.850Z
-- Total objects: 13

CREATE DATABASE IF NOT EXISTS `security_db`;
USE `security_db`;

-- BASE TABLE: audit_log
CREATE TABLE `audit_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
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
  `severity` enum('info','warning','error','critical') DEFAULT 'info',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action_type` (`action_type`),
  KEY `idx_resource_type` (`resource_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_severity` (`severity`),
  KEY `idx_audit_user_action` (`user_id`,`action_type`,`created_at`),
  KEY `idx_audit_resource` (`resource_type`,`resource_id`),
  CONSTRAINT `fk_audit_log_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit log for tracking all system activities';

-- BASE TABLE: casbin_rules
CREATE TABLE `casbin_rules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ptype` varchar(100) DEFAULT NULL,
  `v0` varchar(100) DEFAULT NULL,
  `v1` varchar(100) DEFAULT NULL,
  `v2` varchar(100) DEFAULT NULL,
  `v3` varchar(100) DEFAULT NULL,
  `v4` varchar(100) DEFAULT NULL,
  `v5` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=60051 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- BASE TABLE: failed_login_attempts
CREATE TABLE `failed_login_attempts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `identifier` varchar(255) NOT NULL COMMENT 'Username or email',
  `identifier_type` enum('username','email') NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `attempt_time` timestamp NULL DEFAULT current_timestamp(),
  `user_agent` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_identifier` (`identifier`,`identifier_type`),
  KEY `idx_ip_address` (`ip_address`),
  KEY `idx_attempt_time` (`attempt_time`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Track failed login attempts for brute-force detection';

-- BASE TABLE: invalidated_tokens
CREATE TABLE `invalidated_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token_hash` varchar(255) NOT NULL COMMENT 'Hashed token for security',
  `user_id` int(11) DEFAULT NULL,
  `invalidated_at` timestamp NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NOT NULL,
  `reason` varchar(100) DEFAULT NULL COMMENT 'logout, password_change, force_logout',
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_token_hash` (`token_hash`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_invalidated_at` (`invalidated_at`),
  CONSTRAINT `fk_invalidated_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Blacklist for invalidated tokens (logout, password change, etc.)';

-- BASE TABLE: password_reset_tokens
CREATE TABLE `password_reset_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_token` (`token`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `fk_password_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Temporary tokens for password reset functionality';

-- BASE TABLE: permissions
CREATE TABLE `permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'inventory.read, inventory.write, users.manage',
  `description` text DEFAULT NULL,
  `resource` varchar(50) DEFAULT NULL COMMENT 'inventory, users, warehouses, reports',
  `action` varchar(50) DEFAULT NULL COMMENT 'read, write, delete, manage',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_permission_name` (`name`),
  KEY `idx_resource_action` (`resource`,`action`)
) ENGINE=InnoDB AUTO_INCREMENT=153 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Fine-grained permissions for RBAC system';

-- BASE TABLE: roles
CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL COMMENT 'admin, manager, staff, read_only',
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_role_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Role definitions for RBAC system';

-- BASE TABLE: role_permissions
CREATE TABLE `role_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  `granted_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_permission` (`role_id`,`permission_id`),
  KEY `idx_role_id` (`role_id`),
  KEY `idx_permission_id` (`permission_id`),
  CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32371 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Many-to-many relationship between roles and permissions';

-- BASE TABLE: security_events
CREATE TABLE `security_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_type` varchar(50) NOT NULL COMMENT 'login_success, login_fail, logout, permission_denied, data_access',
  `user_id` int(11) DEFAULT NULL,
  `username` varchar(50) DEFAULT NULL COMMENT 'Preserved even if user deleted',
  `ip_address` varchar(45) DEFAULT NULL COMMENT 'IPv4 or IPv6',
  `user_agent` text DEFAULT NULL,
  `resource` varchar(100) DEFAULT NULL COMMENT 'Resource accessed',
  `action` varchar(50) DEFAULT NULL COMMENT 'Action attempted',
  `success` tinyint(1) DEFAULT 1,
  `risk_level` enum('low','medium','high','critical') DEFAULT 'low',
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional event details' CHECK (json_valid(`details`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_risk_level` (`risk_level`),
  KEY `idx_ip_address` (`ip_address`),
  KEY `idx_user_created` (`user_id`,`created_at`),
  CONSTRAINT `fk_security_events_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=186 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Complete audit trail for security events and access control';

-- BASE TABLE: sessions
CREATE TABLE `sessions` (
  `session_id` varchar(128) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `expires` bigint(20) unsigned NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `data` mediumtext DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `last_activity` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`session_id`),
  KEY `idx_expires` (`expires`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User session storage (alternative to express-mysql-session)';

-- BASE TABLE: users
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User accounts without hard-coded roles. Uses RBAC system via user_roles junction table';

-- BASE TABLE: user_roles
CREATE TABLE `user_roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `assigned_at` timestamp NULL DEFAULT current_timestamp(),
  `assigned_by` int(11) DEFAULT NULL COMMENT 'Admin who assigned the role',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_role` (`user_id`,`role_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_role_id` (`role_id`),
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Many-to-many relationship between users and roles';

-- BASE TABLE: user_token_invalidation
CREATE TABLE `user_token_invalidation` (
  `user_id` int(11) NOT NULL,
  `invalidated_at` timestamp NULL DEFAULT current_timestamp(),
  `reason` varchar(100) DEFAULT 'security_action',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  KEY `idx_invalidated_at` (`invalidated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

