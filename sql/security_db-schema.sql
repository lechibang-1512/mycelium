-- Schema for security_db
-- Generated on 2025-10-11T11:17:54.429Z

-- Table: security_events
CREATE TABLE `security_events` ( `id` int(11) NOT NULL AUTO_INCREMENT, `event_type` enum('login','logout','failed_login','login_success','session_hijack','token_invalidation','password_change','account_lockout') NOT NULL, `user_id` int(11) DEFAULT NULL, `username` varchar(50) DEFAULT NULL, `ip_address` varchar(45) DEFAULT NULL, `user_agent` text DEFAULT NULL, `session_id` varchar(32) DEFAULT NULL, `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)), `risk_level` enum('low','medium','high','critical') DEFAULT 'low', `created_at` timestamp NULL DEFAULT current_timestamp(), PRIMARY KEY (`id`), KEY `idx_event_type` (`event_type`), KEY `idx_user_id` (`user_id`), KEY `idx_created_at` (`created_at`), KEY `idx_risk_level` (`risk_level`), KEY `idx_ip_address` (`ip_address`) ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci

-- Table: invalidated_tokens
CREATE TABLE `invalidated_tokens` ( `id` int(11) NOT NULL AUTO_INCREMENT, `token_hash` varchar(64) NOT NULL, `token_type` enum('session','remember','reset','api') NOT NULL DEFAULT 'session', `user_id` int(11) DEFAULT NULL, `invalidated_at` timestamp NULL DEFAULT current_timestamp(), `expires_at` timestamp NOT NULL, `reason` varchar(100) DEFAULT 'logout', `created_at` timestamp NULL DEFAULT current_timestamp(), PRIMARY KEY (`id`), UNIQUE KEY `token_hash` (`token_hash`), KEY `idx_token_hash` (`token_hash`), KEY `idx_expires_at` (`expires_at`), KEY `idx_user_id` (`user_id`), KEY `idx_invalidated_at` (`invalidated_at`) ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci

-- Table: user_token_invalidation
CREATE TABLE `user_token_invalidation` ( `user_id` int(11) NOT NULL, `invalidated_at` timestamp NULL DEFAULT current_timestamp(), `reason` varchar(100) DEFAULT 'security_action', `created_at` timestamp NULL DEFAULT current_timestamp(), `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(), PRIMARY KEY (`user_id`), KEY `idx_invalidated_at` (`invalidated_at`) ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci

-- Table: failed_login_attempts
CREATE TABLE `failed_login_attempts` ( `id` int(11) NOT NULL AUTO_INCREMENT, `identifier` varchar(100) NOT NULL, `identifier_type` enum('username','email','ip') NOT NULL, `ip_address` varchar(45) DEFAULT NULL, `user_agent` text DEFAULT NULL, `attempt_time` timestamp NULL DEFAULT current_timestamp(), PRIMARY KEY (`id`), KEY `idx_identifier` (`identifier`,`identifier_type`), KEY `idx_ip_address` (`ip_address`), KEY `idx_attempt_time` (`attempt_time`) ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci

-- Table: users
CREATE TABLE `users` ( `id` int(11) NOT NULL AUTO_INCREMENT, `username` varchar(50) NOT NULL, `password` varchar(255) NOT NULL, `fullName` varchar(100) NOT NULL, `email` varchar(255) NOT NULL, `role` enum('admin','staff','user') NOT NULL DEFAULT 'user', `is_active` tinyint(1) DEFAULT 1, `last_login` timestamp NULL DEFAULT NULL, `failed_login_attempts` int(11) DEFAULT 0, `locked_until` timestamp NULL DEFAULT NULL, `createdAt` datetime DEFAULT current_timestamp(), `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(), PRIMARY KEY (`id`), UNIQUE KEY `username` (`username`), UNIQUE KEY `email` (`email`) ) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

