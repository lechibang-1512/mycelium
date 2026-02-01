/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.8.3-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: security_db
-- ------------------------------------------------------
-- Server version	11.8.3-MariaDB-0+deb13u1 from Debian

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
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `casbin_rules`
--

DROP TABLE IF EXISTS `casbin_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=1721 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `casbin_rules`
--

LOCK TABLES `casbin_rules` WRITE;
/*!40000 ALTER TABLE `casbin_rules` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `casbin_rules` VALUES
(1625,'p','admin','inventory','manage','','',''),
(1626,'p','admin','warehouse','manage','','',''),
(1627,'p','admin','users','manage','','',''),
(1628,'p','admin','reports','read','','',''),
(1629,'p','admin','reports','export','','',''),
(1630,'p','admin','audit','read','','',''),
(1631,'p','admin','audit','manage','','',''),
(1632,'p','admin','receipts','read','','',''),
(1633,'p','admin','receipts','write','','',''),
(1634,'p','admin','receipts','delete','','',''),
(1635,'p','admin','stocktake','read','','',''),
(1636,'p','admin','stocktake','write','','',''),
(1637,'p','admin','stocktake','approve','','',''),
(1638,'p','admin','spare-parts','read','','',''),
(1639,'p','admin','spare-parts','write','','',''),
(1640,'p','admin','rma','read','','',''),
(1641,'p','admin','rma','write','','',''),
(1642,'p','admin','rma','approve','','',''),
(1643,'p','admin','repairs','read','','',''),
(1644,'p','admin','repairs','write','','',''),
(1645,'p','admin','suppliers','read','','',''),
(1646,'p','admin','suppliers','write','','',''),
(1647,'p','admin','system','admin','','',''),
(1648,'p','admin','inventory','read','','',''),
(1649,'p','admin','inventory','write','','',''),
(1650,'p','admin','inventory','delete','','',''),
(1651,'p','admin','inventory','approve','','',''),
(1652,'p','admin','inventory','export','','',''),
(1653,'p','admin','warehouse','read','','',''),
(1654,'p','admin','warehouse','write','','',''),
(1655,'p','admin','warehouse','delete','','',''),
(1656,'p','admin','warehouse','approve','','',''),
(1657,'p','admin','warehouse','export','','',''),
(1658,'p','admin','users','read','','',''),
(1659,'p','admin','users','write','','',''),
(1660,'p','admin','users','delete','','',''),
(1661,'p','admin','users','approve','','',''),
(1662,'p','admin','users','export','','',''),
(1663,'p','admin','audit','write','','',''),
(1664,'p','admin','audit','delete','','',''),
(1665,'p','admin','audit','approve','','',''),
(1666,'p','admin','audit','export','','',''),
(1667,'p','manager','inventory','read','','',''),
(1668,'p','manager','inventory','write','','',''),
(1669,'p','manager','inventory','manage','','',''),
(1670,'p','manager','warehouse','read','','',''),
(1671,'p','manager','warehouse','write','','',''),
(1672,'p','manager','users','read','','',''),
(1673,'p','manager','reports','read','','',''),
(1674,'p','manager','reports','export','','',''),
(1675,'p','manager','audit','read','','',''),
(1676,'p','manager','receipts','read','','',''),
(1677,'p','manager','receipts','write','','',''),
(1678,'p','manager','stocktake','read','','',''),
(1679,'p','manager','stocktake','write','','',''),
(1680,'p','manager','stocktake','approve','','',''),
(1681,'p','manager','spare-parts','read','','',''),
(1682,'p','manager','spare-parts','write','','',''),
(1683,'p','manager','rma','read','','',''),
(1684,'p','manager','rma','write','','',''),
(1685,'p','manager','rma','approve','','',''),
(1686,'p','manager','repairs','read','','',''),
(1687,'p','manager','repairs','write','','',''),
(1688,'p','manager','suppliers','read','','',''),
(1689,'p','manager','suppliers','write','','',''),
(1690,'p','manager','inventory','delete','','',''),
(1691,'p','manager','inventory','approve','','',''),
(1692,'p','manager','inventory','export','','',''),
(1693,'p','staff','inventory','read','','',''),
(1694,'p','staff','inventory','write','','',''),
(1695,'p','staff','warehouse','read','','',''),
(1696,'p','staff','receipts','read','','',''),
(1697,'p','staff','receipts','write','','',''),
(1698,'p','staff','stocktake','read','','',''),
(1699,'p','staff','stocktake','write','','',''),
(1700,'p','staff','spare-parts','read','','',''),
(1701,'p','staff','rma','read','','',''),
(1702,'p','staff','rma','write','','',''),
(1703,'p','staff','repairs','read','','',''),
(1704,'p','warehouse_staff','inventory','read','','',''),
(1705,'p','warehouse_staff','inventory','write','','',''),
(1706,'p','warehouse_staff','warehouse','read','','',''),
(1707,'p','warehouse_staff','reports','read','','',''),
(1708,'p','warehouse_staff','spare-parts','read','','',''),
(1709,'p','warehouse_staff','rma','read','','',''),
(1710,'p','warehouse_staff','repairs','read','','',''),
(1711,'p','viewer','inventory','read','','',''),
(1712,'p','viewer','warehouse','read','','',''),
(1713,'p','viewer','reports','read','','',''),
(1714,'p','viewer','receipts','read','','',''),
(1715,'p','viewer','stocktake','read','','',''),
(1716,'p','viewer','spare-parts','read','','',''),
(1717,'p','viewer','rma','read','','',''),
(1718,'p','viewer','repairs','read','','',''),
(1719,'p','viewer','suppliers','read','','',''),
(1720,'g','1','admin','','','','');
/*!40000 ALTER TABLE `casbin_rules` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `failed_login_attempts`
--

DROP TABLE IF EXISTS `failed_login_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_login_attempts`
--

LOCK TABLES `failed_login_attempts` WRITE;
/*!40000 ALTER TABLE `failed_login_attempts` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `failed_login_attempts` VALUES
(1,'admin','username','::1','2025-12-25 09:28:06',NULL),
(2,'lechibang','username','192.168.0.109','2025-12-26 03:25:27',NULL),
(3,'lechibang','username','192.168.0.109','2025-12-26 03:25:53',NULL),
(4,'admin','username','127.0.0.1','2025-12-26 06:57:12',NULL),
(5,'admin','username','127.0.0.1','2026-01-07 10:39:58',NULL),
(6,'admin','username','127.0.0.1','2026-01-07 10:47:00',NULL),
(7,'admin','username','127.0.0.1','2026-01-07 10:59:30',NULL),
(8,'lechibangadmin','username','127.0.0.1','2026-01-07 11:02:50',NULL),
(9,'admin','username','127.0.0.1','2026-01-08 07:32:33',NULL),
(10,'admin','username','127.0.0.1','2026-01-10 06:08:54',NULL),
(11,'admin','username','127.0.0.1','2026-01-10 06:08:54',NULL),
(12,'admin','username','127.0.0.1','2026-01-10 06:09:04',NULL),
(13,'admin','username','127.0.0.1','2026-01-10 06:09:04',NULL),
(14,'admin','username','127.0.0.1','2026-01-10 08:20:12',NULL),
(15,'admin','username','127.0.0.1','2026-01-10 08:42:18',NULL),
(16,'lechibangadmin@example.com','username','127.0.0.1','2026-01-10 10:57:40',NULL),
(17,'lechibangadmin@example.com','username','127.0.0.1','2026-01-10 10:59:08',NULL),
(18,'admin','username','127.0.0.1','2026-01-10 11:03:15',NULL),
(19,'admin','username','127.0.0.1','2026-01-12 04:12:47',NULL),
(20,'admin','username','127.0.0.1','2026-01-12 04:12:48',NULL),
(21,'admin','username','127.0.0.1','2026-01-12 04:12:48',NULL),
(22,'admin','username','127.0.0.1','2026-01-12 04:31:34',NULL),
(23,'admin','username','127.0.0.1','2026-01-12 04:31:45',NULL),
(24,'admin','username','127.0.0.1','2026-01-12 04:31:51',NULL),
(25,'admin','username','127.0.0.1','2026-01-13 03:29:38',NULL),
(26,'admin','username','127.0.0.1','2026-01-13 03:50:37',NULL),
(27,'admin','username','127.0.0.1','2026-01-13 14:25:32',NULL),
(28,'admin','username','127.0.0.1','2026-01-14 16:31:49',NULL),
(29,'admin','username','127.0.0.1','2026-01-21 07:36:35',NULL),
(30,'admin','username','127.0.0.1','2026-01-21 07:36:57',NULL),
(31,'test','username','127.0.0.1','2026-01-21 07:39:24',NULL),
(32,'admin','username','127.0.0.1','2026-01-21 07:40:13',NULL);
/*!40000 ALTER TABLE `failed_login_attempts` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `invalidated_tokens`
--

DROP TABLE IF EXISTS `invalidated_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invalidated_tokens`
--

LOCK TABLES `invalidated_tokens` WRITE;
/*!40000 ALTER TABLE `invalidated_tokens` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `invalidated_tokens` VALUES
(1,'4d8963ff67db6c26d66f22604719ab4314fad030a74a74d301afb554492a7fd4',NULL,'2025-12-25 09:28:05','2025-12-26 09:28:05','logout'),
(2,'b24875224f9f57b9db9471c7eb76af3612f410a137d1da757be5d3632fe34a1c',NULL,'2025-12-25 09:57:14','2025-12-26 09:57:14','logout'),
(3,'2693f4c43e557991c80a74b02fe63f3218d09cfcef56b28b2059dee339a02cda',NULL,'2025-12-25 10:49:46','2025-12-26 10:49:46','logout'),
(4,'007f45f9f70f4a5f7919b13226a571f22a28eef56bd4019c40d3c54d3b7ee6b2',NULL,'2025-12-26 03:18:08','2025-12-27 03:18:08','logout'),
(5,'180209ef267a51a1988cb3f86a0cf04ce20b78a41a8e64e9c5292dd9607835da',NULL,'2026-01-06 08:40:23','2026-01-07 08:40:23','logout'),
(6,'38d13b239304adb7d56c316858b2a9d781eb9c74be3730490c135a9eaed9a4bb',NULL,'2026-01-06 08:40:24','2026-01-07 08:40:24','logout'),
(7,'157f9f6ec8857dadb417c7448917bd42470853ca3e247a6180beb7e8f52b712c',NULL,'2026-01-06 08:40:24','2026-01-07 08:40:24','logout'),
(8,'c2802cdc2e82eb83a9af716b41af27baa12db7c5c86d1328b1afb2d5f0a8753e',NULL,'2026-01-06 08:40:24','2026-01-07 08:40:24','logout'),
(9,'8c748ffbb6562c5db53c6ec4468716d706641d60df8d3adb072a00a619e09d34',NULL,'2026-01-06 08:40:25','2026-01-07 08:40:25','logout'),
(10,'0ad4a06b051d0d5f4622c7741d14c9a9bcbb393f3f569bc1b1cdfc28e4920018',NULL,'2026-01-06 08:40:25','2026-01-07 08:40:25','logout'),
(11,'f475c7925e15a72b21c99de7bce32430b0d0bebb71d21d02560a5e3fbd8b6794',NULL,'2026-01-06 08:40:25','2026-01-07 08:40:25','logout'),
(12,'bdc498fb66a983aeaf9eb41d3c0b09ca367fee3a3769e7bea4066f966d5f77f4',NULL,'2026-01-06 08:40:26','2026-01-07 08:40:26','logout'),
(13,'3103fa9ae1064e2615880cd931e56d3518caa8d236b16394bcac6eb86f9ff2dd',NULL,'2026-01-06 08:40:26','2026-01-07 08:40:26','logout'),
(14,'b19466f6fa9e59b2570bc0c08b8b5259f95d496fd537c692c9bedec080c24e98',NULL,'2026-01-06 08:40:26','2026-01-07 08:40:26','logout'),
(15,'468749b991861431f491e3fd155f87244e5807d47763e4f09d78e32c2d0d822d',NULL,'2026-01-06 08:40:27','2026-01-07 08:40:27','logout'),
(16,'d49b52f044cb747b022be27c7b06a7a945644a3841a7546455423eb1891aa771',NULL,'2026-01-06 08:40:27','2026-01-07 08:40:27','logout'),
(17,'e3227182ede4efc7945ac95b075edf565d3338bfdf3740cbaeddda0653033a18',NULL,'2026-01-06 08:40:27','2026-01-07 08:40:27','logout'),
(18,'04e35658291822dc2e7c17191944136289a424943dc2334d4b8dc2547e830684',NULL,'2026-01-06 08:40:28','2026-01-07 08:40:28','logout'),
(19,'199d772e13cc097a56556f1e5b5c8a174e7b4e7458600a7812d581e51998846d',NULL,'2026-01-06 08:40:28','2026-01-07 08:40:28','logout'),
(20,'6f82080fb72c49c4728d74207ad2f48bd2745b1ac0b1b592f2f3ad659d6810a5',NULL,'2026-01-06 08:40:28','2026-01-07 08:40:28','logout'),
(21,'588ac587f3e93fffa1cfee2ae61a79f3e3f8bf4515222889b65fd32734439616',NULL,'2026-01-06 08:40:29','2026-01-07 08:40:29','logout'),
(22,'fe5811f05e8b033d5d41a3d327cdea075fc62d1fb0c25ff3712afd1fb86beb4c',NULL,'2026-01-06 08:40:29','2026-01-07 08:40:29','logout'),
(23,'3ed2ad2bd70fdcc6e7d2e54fa8af730ae8c12fbaea7fc1f6b7035fa5851b2c62',NULL,'2026-01-06 08:40:29','2026-01-07 08:40:29','logout'),
(24,'71408e91d69888c424d6332926f837646b248545593759b6fc38c127c0e67d32',NULL,'2026-01-06 08:40:30','2026-01-07 08:40:30','logout'),
(25,'2dd83be6879648f91d32caeaf74eed9a2565700fd2e24c981d2909eb1424cbc8',NULL,'2026-01-06 08:40:30','2026-01-07 08:40:30','logout'),
(26,'d84fda4e72dea788abe9d615f09cecff6ce67765630136b1f3837f054c428fc3',NULL,'2026-01-06 08:40:30','2026-01-07 08:40:30','logout'),
(27,'4581729d85afa8a9382ca47bd04b829e520f029d26fb78ebc828d620d03909b7',NULL,'2026-01-06 08:40:31','2026-01-07 08:40:31','logout'),
(28,'d7a8a3520521ec9d94c93ea0425c300d28d5e21223142f1e913042bc517f6abb',NULL,'2026-01-06 08:40:31','2026-01-07 08:40:31','logout'),
(29,'04fa07edd0a731d2998d4fbd534352dfbf54a30d5e31f9270d2aeaaf9f8a11ef',NULL,'2026-01-06 08:40:32','2026-01-07 08:40:32','logout'),
(30,'5d829bb2830142c2ce7fd66fed75c51e536334fbe04c0369a1cc127728349573',NULL,'2026-01-06 08:40:32','2026-01-07 08:40:32','logout'),
(31,'26c2346a30be8d6054274c24d91553cb7f54e2d8a8a41ce42449491ff9718bfa',NULL,'2026-01-06 08:40:32','2026-01-07 08:40:32','logout'),
(32,'1b5bbef5e9a18f96897f6dccd42eb024caf7f2b52e5007f010c452443cb1ccfc',NULL,'2026-01-06 08:40:33','2026-01-07 08:40:33','logout'),
(33,'4d5c66090425ead27b39db751acb7726f49750155ff8ecef92959d581f19b738',NULL,'2026-01-06 08:41:01','2026-01-07 08:41:01','logout'),
(34,'98185aa1f72e12f7c82aaf5ac52ea80117079d28cb4a81313d0fc4e6bbe45c7e',NULL,'2026-01-06 09:14:23','2026-01-07 09:14:23','logout'),
(35,'7b39cfdfa4c355e5861a0953074d267b9a9840df667e33024a43063bf0bb08be',NULL,'2026-01-06 09:15:32','2026-01-07 09:15:32','logout'),
(36,'c663f028715d418e0a7cd61320dc23a166f41196669850d9332bc9509e2dfbc4',NULL,'2026-01-06 09:15:47','2026-01-07 09:15:47','logout'),
(37,'fd51658fbc85688035ee85e3379a6842d0855a0bd7dfba5428f47d43c11def2b',NULL,'2026-01-07 10:41:27','2026-01-08 10:41:27','logout'),
(38,'81ee562b98c3ab174a374673e3f3d57d35005c8286493cce6c13d105593237d8',7,'2026-01-08 07:41:22','2026-01-09 07:41:22','logout'),
(39,'7e916c9655bcbc2a5dc8aa1c6391bd697e44266c049e9c8f1f6f3ec3adc7dadf',7,'2026-01-08 07:59:13','2026-01-09 07:59:13','logout'),
(40,'19fd4e0f3eb4b88b434c76e2b5cfbac93bf3fbc640b2a80a0b08616828779abf',7,'2026-01-08 14:19:07','2026-01-09 14:19:07','logout'),
(41,'aad78ecfa3cbd5f9fd0a0ccb0290459818eeeab10f588983ccefa6939e8c479c',NULL,'2026-01-08 14:24:59','2026-01-09 14:24:59','logout'),
(42,'6cc1b0670ed7f5475bf933ebff175747f94636b04868af997225432de5c453b0',7,'2026-01-08 14:27:53','2026-01-09 14:27:53','logout'),
(43,'80ded4ab9eee0eebbccab199952addc6cbc81c893bcbc0573c2ce2e86900005b',NULL,'2026-01-08 14:28:08','2026-01-09 14:28:08','logout'),
(44,'248e519c3c76eb221b4bc8c35e28501626c175442d56d517e9aea0a19bc9be1d',7,'2026-01-08 14:36:11','2026-01-09 14:36:11','logout'),
(45,'a29b690b46c9131e38a51fc2a5994258c4f907d570ee62f9373b45551ee79c40',11,'2026-01-13 03:50:28','2026-01-14 03:50:28','logout'),
(46,'6072bd7d270e1e67d8b7149e19c63d4fb00e4b5a3fef7030c07aa744bc50d2ff',11,'2026-01-13 04:08:03','2026-01-14 04:08:03','logout'),
(47,'98dc183a38948409413ef96bbb0178e8a6915b0cf9f7dce032cec806bf77ca58',7,'2026-01-13 14:26:45','2026-01-14 14:26:45','logout'),
(48,'47feb703f0251a6cfd42955014854e18e00e378512dc855a6b4559181c6e78de',7,'2026-01-13 14:27:07','2026-01-14 14:27:07','logout'),
(49,'e6a07f23da5601aa28fcbd1a901e43b47e93e38eff9ada97127e002369a5010b',7,'2026-01-13 14:28:35','2026-01-14 14:28:35','logout'),
(50,'c072b46704059429dca086d5f89d051bed10ef2bf3e628636fae97788ffc9f72',7,'2026-01-13 14:40:32','2026-01-14 14:40:32','logout'),
(51,'7d713432ce6ffc30c1aed260d6139e40b5cdbab49c93cd835152359f1ea7cbbe',7,'2026-01-13 14:41:22','2026-01-14 14:41:22','logout'),
(52,'3422d6e77169fea1b3493495d5315508642bd0bc1c0a42d4330260154811b5c1',7,'2026-01-13 14:41:39','2026-01-14 14:41:39','logout'),
(53,'112f7ed9e9f8481776005aee8da0b3f8946ffc6b51a1e6fa944bba42697e7d56',7,'2026-01-13 14:42:07','2026-01-14 14:42:07','logout'),
(54,'2b625f51f8b95f27b7fa1dae566eddb7c9fc00739af2493727d671c26bbda227',7,'2026-01-13 14:42:35','2026-01-14 14:42:35','logout'),
(55,'821415a338172d510b5da4623d4b390822ac8fb5c29ecde8978dda00133fa1c6',7,'2026-01-13 14:43:12','2026-01-14 14:43:12','logout'),
(56,'4767f00f9babd34656747b2cf4450c91fc139ae30da5f264b7d595413055eb4c',7,'2026-01-14 03:18:54','2026-01-15 03:18:54','logout'),
(57,'dd3204d5b8d1ba0abf252525762f3d05924ec55515a07f4166c5384ba26ba011',7,'2026-01-14 03:39:25','2026-01-15 03:39:25','logout'),
(58,'b756fe356d1305c3cc004bca4c3c467c8dcdcb8999c06b36100b26bbd1fb414e',NULL,'2026-01-14 07:00:30','2026-01-15 07:00:30','logout'),
(59,'9b89a13b11002a0f208ae5492c94b8ce5f784ff4a999b025f6130e17ac1816f2',NULL,'2026-01-14 07:11:50','2026-01-15 07:11:50','logout'),
(60,'037a3cc13d4159e9e93bbcbe327587ae5d0e238c9997cc89bbc29322e3fee2ea',NULL,'2026-01-14 07:16:35','2026-01-15 07:16:35','logout');
/*!40000 ALTER TABLE `invalidated_tokens` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Fine-grained permissions for RBAC system';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `permissions` VALUES
(1,'users.read','View user information','users','read','2025-11-03 04:19:14'),
(2,'users.write','Create and update users','users','write','2025-11-03 04:19:14'),
(3,'users.delete','Delete users','users','delete','2025-11-03 04:19:14'),
(4,'users.manage','Full user management including roles','users','manage','2025-11-03 04:19:14'),
(5,'inventory.read','View inventory items and stock levels','inventory','read','2025-11-03 04:19:14'),
(6,'inventory.write','Create and update inventory items','inventory','write','2025-11-03 04:19:14'),
(7,'inventory.delete','Delete inventory items','inventory','delete','2025-11-03 04:19:14'),
(8,'inventory.adjust','Adjust inventory quantities','inventory','adjust','2025-11-03 04:19:14'),
(9,'warehouses.read','View warehouse information','warehouses','read','2025-11-03 04:19:14'),
(10,'warehouses.write','Create and update warehouses','warehouses','write','2025-11-03 04:19:14'),
(11,'warehouses.delete','Delete warehouses','warehouses','delete','2025-11-03 04:19:14'),
(12,'receipts.read','View receipts and transactions','receipts','read','2025-11-03 04:19:14'),
(13,'receipts.write','Create and update receipts','receipts','write','2025-11-03 04:19:14'),
(14,'reports.view','View reports and analytics','reports','read','2025-11-03 04:19:14'),
(15,'reports.export','Export reports to file formats','reports','export','2025-11-03 04:19:14'),
(16,'system.configure','Configure system settings','system','configure','2025-11-03 04:19:14'),
(17,'inventory.manage','Full inventory management including adjustments','inventory','manage','2026-01-03 10:17:41'),
(18,'warehouse.read','View warehouse information','warehouse','read','2026-01-03 10:17:41'),
(19,'warehouse.write','Create and update warehouses','warehouse','write','2026-01-03 10:17:41'),
(20,'warehouse.delete','Delete warehouses','warehouse','delete','2026-01-03 10:17:41'),
(21,'warehouse.manage','Full warehouse management','warehouse','manage','2026-01-03 10:17:41'),
(22,'reports.read','View and generate reports','reports','read','2026-01-03 10:17:41'),
(23,'reports.write','Create and save custom reports','reports','write','2026-01-03 10:17:41'),
(24,'reports.manage','Full reports management including templates','reports','manage','2026-01-03 10:17:41'),
(25,'audit.read','View audit logs','audit','read','2026-01-03 10:17:41'),
(26,'audit.write','Create audit log entries','audit','write','2026-01-03 10:17:41'),
(27,'audit.manage','Manage audit settings and retention','audit','manage','2026-01-03 10:17:41'),
(28,'receipts.delete','Delete receipts','receipts','delete','2026-01-03 10:17:41'),
(29,'receipts.manage','Full receipts management including voiding','receipts','manage','2026-01-03 10:17:41'),
(30,'stocktake.read','View stocktake records','stocktake','read','2026-01-03 10:17:41'),
(31,'stocktake.write','Perform stocktake operations','stocktake','write','2026-01-03 10:17:41'),
(32,'stocktake.delete','Delete stocktake records','stocktake','delete','2026-01-03 10:17:41'),
(33,'stocktake.approve','Approve stocktake results','stocktake','approve','2026-01-03 10:17:41'),
(34,'stocktake.manage','Full stocktake management including scheduling','stocktake','manage','2026-01-03 10:17:41'),
(35,'spare-parts.read','View spare parts inventory','spare-parts','read','2026-01-03 10:17:41'),
(36,'spare-parts.write','Create and update spare parts','spare-parts','write','2026-01-03 10:17:41'),
(37,'spare-parts.delete','Delete spare parts','spare-parts','delete','2026-01-03 10:17:41'),
(38,'spare-parts.manage','Full spare parts management','spare-parts','manage','2026-01-03 10:17:41'),
(39,'rma.read','View RMA requests','rma','read','2026-01-03 10:17:41'),
(40,'rma.write','Create and update RMA requests','rma','write','2026-01-03 10:17:41'),
(41,'rma.delete','Delete RMA requests','rma','delete','2026-01-03 10:17:41'),
(42,'rma.approve','Approve RMA requests','rma','approve','2026-01-03 10:17:41'),
(43,'rma.manage','Full RMA management including policies','rma','manage','2026-01-03 10:17:41'),
(44,'repairs.read','View repair jobs','repairs','read','2026-01-03 10:17:41'),
(45,'repairs.write','Create and update repair jobs','repairs','write','2026-01-03 10:17:41'),
(46,'repairs.delete','Delete repair jobs','repairs','delete','2026-01-03 10:17:41'),
(47,'repairs.manage','Full repairs management including assignments','repairs','manage','2026-01-03 10:17:41'),
(48,'suppliers.read','View suppliers','suppliers','read','2026-01-03 10:17:41'),
(49,'suppliers.write','Create and update suppliers','suppliers','write','2026-01-03 10:17:41'),
(50,'suppliers.delete','Delete suppliers','suppliers','delete','2026-01-03 10:17:41'),
(51,'suppliers.manage','Full suppliers management','suppliers','manage','2026-01-03 10:17:41'),
(52,'system.admin','Full system administration access','system','admin','2026-01-03 10:17:41');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=12711 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Many-to-many relationship between roles and permissions';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `role_permissions` VALUES
(10593,11,27,'2026-01-14 07:04:35'),
(10594,11,25,'2026-01-14 07:04:35'),
(10595,11,26,'2026-01-14 07:04:35'),
(10596,11,8,'2026-01-14 07:04:35'),
(10597,11,7,'2026-01-14 07:04:35'),
(10598,11,17,'2026-01-14 07:04:35'),
(10599,11,5,'2026-01-14 07:04:35'),
(10600,11,6,'2026-01-14 07:04:35'),
(10601,11,28,'2026-01-14 07:04:35'),
(10602,11,29,'2026-01-14 07:04:35'),
(10603,11,12,'2026-01-14 07:04:35'),
(10604,11,13,'2026-01-14 07:04:35'),
(10605,11,46,'2026-01-14 07:04:35'),
(10606,11,47,'2026-01-14 07:04:35'),
(10607,11,44,'2026-01-14 07:04:35'),
(10608,11,45,'2026-01-14 07:04:35'),
(10609,11,15,'2026-01-14 07:04:35'),
(10610,11,24,'2026-01-14 07:04:35'),
(10611,11,22,'2026-01-14 07:04:35'),
(10612,11,14,'2026-01-14 07:04:35'),
(10613,11,23,'2026-01-14 07:04:35'),
(10614,11,42,'2026-01-14 07:04:35'),
(10615,11,41,'2026-01-14 07:04:35'),
(10616,11,43,'2026-01-14 07:04:35'),
(10617,11,39,'2026-01-14 07:04:35'),
(10618,11,40,'2026-01-14 07:04:35'),
(10619,11,37,'2026-01-14 07:04:35'),
(10620,11,38,'2026-01-14 07:04:35'),
(10621,11,35,'2026-01-14 07:04:35'),
(10622,11,36,'2026-01-14 07:04:35'),
(10623,11,33,'2026-01-14 07:04:35'),
(10624,11,32,'2026-01-14 07:04:35'),
(10625,11,34,'2026-01-14 07:04:35'),
(10626,11,30,'2026-01-14 07:04:35'),
(10627,11,31,'2026-01-14 07:04:35'),
(10628,11,50,'2026-01-14 07:04:35'),
(10629,11,51,'2026-01-14 07:04:35'),
(10630,11,48,'2026-01-14 07:04:35'),
(10631,11,49,'2026-01-14 07:04:35'),
(10632,11,52,'2026-01-14 07:04:35'),
(10633,11,16,'2026-01-14 07:04:35'),
(10634,11,3,'2026-01-14 07:04:35'),
(10635,11,4,'2026-01-14 07:04:35'),
(10636,11,1,'2026-01-14 07:04:35'),
(10637,11,2,'2026-01-14 07:04:35'),
(10638,11,20,'2026-01-14 07:04:35'),
(10639,11,21,'2026-01-14 07:04:35'),
(10640,11,18,'2026-01-14 07:04:35'),
(10641,11,19,'2026-01-14 07:04:35'),
(10642,11,11,'2026-01-14 07:04:35'),
(10643,11,9,'2026-01-14 07:04:35'),
(10644,11,10,'2026-01-14 07:04:35'),
(10645,12,27,'2026-01-14 07:06:50'),
(10646,12,25,'2026-01-14 07:06:50'),
(10647,12,26,'2026-01-14 07:06:50'),
(10648,12,8,'2026-01-14 07:06:50'),
(10649,12,7,'2026-01-14 07:06:50'),
(10650,12,17,'2026-01-14 07:06:50'),
(10651,12,5,'2026-01-14 07:06:50'),
(10652,12,6,'2026-01-14 07:06:50'),
(10653,12,28,'2026-01-14 07:06:50'),
(10654,12,29,'2026-01-14 07:06:50'),
(10655,12,12,'2026-01-14 07:06:50'),
(10656,12,13,'2026-01-14 07:06:50'),
(10657,12,46,'2026-01-14 07:06:50'),
(10658,12,47,'2026-01-14 07:06:50'),
(10659,12,44,'2026-01-14 07:06:50'),
(10660,12,45,'2026-01-14 07:06:50'),
(10661,12,15,'2026-01-14 07:06:50'),
(10662,12,24,'2026-01-14 07:06:50'),
(10663,12,22,'2026-01-14 07:06:50'),
(10664,12,14,'2026-01-14 07:06:50'),
(10665,12,23,'2026-01-14 07:06:50'),
(10666,12,42,'2026-01-14 07:06:50'),
(10667,12,41,'2026-01-14 07:06:50'),
(10668,12,43,'2026-01-14 07:06:50'),
(10669,12,39,'2026-01-14 07:06:50'),
(10670,12,40,'2026-01-14 07:06:50'),
(10671,12,37,'2026-01-14 07:06:50'),
(10672,12,38,'2026-01-14 07:06:50'),
(10673,12,35,'2026-01-14 07:06:50'),
(10674,12,36,'2026-01-14 07:06:50'),
(10675,12,33,'2026-01-14 07:06:50'),
(10676,12,32,'2026-01-14 07:06:50'),
(10677,12,34,'2026-01-14 07:06:50'),
(10678,12,30,'2026-01-14 07:06:50'),
(10679,12,31,'2026-01-14 07:06:50'),
(10680,12,50,'2026-01-14 07:06:50'),
(10681,12,51,'2026-01-14 07:06:50'),
(10682,12,48,'2026-01-14 07:06:50'),
(10683,12,49,'2026-01-14 07:06:50'),
(10684,12,52,'2026-01-14 07:06:50'),
(10685,12,16,'2026-01-14 07:06:50'),
(10686,12,3,'2026-01-14 07:06:50'),
(10687,12,4,'2026-01-14 07:06:50'),
(10688,12,1,'2026-01-14 07:06:50'),
(10689,12,2,'2026-01-14 07:06:50'),
(10690,12,20,'2026-01-14 07:06:50'),
(10691,12,21,'2026-01-14 07:06:50'),
(10692,12,18,'2026-01-14 07:06:50'),
(10693,12,19,'2026-01-14 07:06:50'),
(10694,12,11,'2026-01-14 07:06:50'),
(10695,12,9,'2026-01-14 07:06:50'),
(10696,12,10,'2026-01-14 07:06:50'),
(12638,5,27,'2026-01-26 13:39:22'),
(12639,5,25,'2026-01-26 13:39:22'),
(12640,5,17,'2026-01-26 13:39:22'),
(12641,5,28,'2026-01-26 13:39:22'),
(12642,5,12,'2026-01-26 13:39:22'),
(12643,5,13,'2026-01-26 13:39:22'),
(12644,5,44,'2026-01-26 13:39:22'),
(12645,5,45,'2026-01-26 13:39:22'),
(12646,5,15,'2026-01-26 13:39:22'),
(12647,5,22,'2026-01-26 13:39:22'),
(12648,5,42,'2026-01-26 13:39:22'),
(12649,5,39,'2026-01-26 13:39:22'),
(12650,5,40,'2026-01-26 13:39:22'),
(12651,5,35,'2026-01-26 13:39:22'),
(12652,5,36,'2026-01-26 13:39:22'),
(12653,5,33,'2026-01-26 13:39:22'),
(12654,5,30,'2026-01-26 13:39:22'),
(12655,5,31,'2026-01-26 13:39:22'),
(12656,5,48,'2026-01-26 13:39:22'),
(12657,5,49,'2026-01-26 13:39:22'),
(12658,5,52,'2026-01-26 13:39:22'),
(12659,5,4,'2026-01-26 13:39:22'),
(12660,5,21,'2026-01-26 13:39:22'),
(12661,7,25,'2026-01-26 13:39:22'),
(12662,7,17,'2026-01-26 13:39:22'),
(12663,7,5,'2026-01-26 13:39:22'),
(12664,7,6,'2026-01-26 13:39:22'),
(12665,7,12,'2026-01-26 13:39:22'),
(12666,7,13,'2026-01-26 13:39:22'),
(12667,7,44,'2026-01-26 13:39:22'),
(12668,7,45,'2026-01-26 13:39:22'),
(12669,7,15,'2026-01-26 13:39:22'),
(12670,7,22,'2026-01-26 13:39:22'),
(12671,7,42,'2026-01-26 13:39:22'),
(12672,7,39,'2026-01-26 13:39:22'),
(12673,7,40,'2026-01-26 13:39:22'),
(12674,7,35,'2026-01-26 13:39:22'),
(12675,7,36,'2026-01-26 13:39:22'),
(12676,7,33,'2026-01-26 13:39:22'),
(12677,7,30,'2026-01-26 13:39:22'),
(12678,7,31,'2026-01-26 13:39:22'),
(12679,7,48,'2026-01-26 13:39:22'),
(12680,7,49,'2026-01-26 13:39:22'),
(12681,7,1,'2026-01-26 13:39:22'),
(12682,7,18,'2026-01-26 13:39:22'),
(12683,7,19,'2026-01-26 13:39:22'),
(12684,8,5,'2026-01-26 13:39:22'),
(12685,8,6,'2026-01-26 13:39:22'),
(12686,8,12,'2026-01-26 13:39:22'),
(12687,8,13,'2026-01-26 13:39:22'),
(12688,8,44,'2026-01-26 13:39:22'),
(12689,8,39,'2026-01-26 13:39:22'),
(12690,8,40,'2026-01-26 13:39:22'),
(12691,8,35,'2026-01-26 13:39:22'),
(12692,8,30,'2026-01-26 13:39:22'),
(12693,8,31,'2026-01-26 13:39:22'),
(12694,8,18,'2026-01-26 13:39:22'),
(12695,6,5,'2026-01-26 13:39:22'),
(12696,6,6,'2026-01-26 13:39:22'),
(12697,6,44,'2026-01-26 13:39:22'),
(12698,6,22,'2026-01-26 13:39:22'),
(12699,6,39,'2026-01-26 13:39:22'),
(12700,6,35,'2026-01-26 13:39:22'),
(12701,6,18,'2026-01-26 13:39:22'),
(12702,9,5,'2026-01-26 13:39:22'),
(12703,9,12,'2026-01-26 13:39:22'),
(12704,9,44,'2026-01-26 13:39:22'),
(12705,9,22,'2026-01-26 13:39:22'),
(12706,9,39,'2026-01-26 13:39:22'),
(12707,9,35,'2026-01-26 13:39:22'),
(12708,9,30,'2026-01-26 13:39:22'),
(12709,9,48,'2026-01-26 13:39:22'),
(12710,9,18,'2026-01-26 13:39:22');
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL COMMENT 'admin, manager, staff, read_only',
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_role_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Role definitions for RBAC system';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `roles` VALUES
(5,'admin','System administrator with full access to all features','2025-12-25 09:25:40','2026-01-03 10:17:41'),
(6,'warehouse_staff','Warehouse staff with inventory management permissions','2025-12-26 02:52:39','2026-01-03 10:17:42'),
(7,'manager','Warehouse manager with operational access','2026-01-03 10:17:41','2026-01-03 10:17:41'),
(8,'staff','Warehouse staff with basic operational access','2026-01-03 10:17:41','2026-01-03 10:17:41'),
(9,'viewer','Read-only access - can view all information but cannot create, update, or delete','2026-01-03 10:17:42','2026-01-08 14:27:28'),
(11,'debug_role_1768374275098',NULL,'2026-01-14 07:04:35','2026-01-14 07:04:35'),
(12,'debug_role_1768374410503',NULL,'2026-01-14 07:06:50','2026-01-14 07:06:50');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `security_events`
--

DROP TABLE IF EXISTS `security_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `security_events`
--

LOCK TABLES `security_events` WRITE;
/*!40000 ALTER TABLE `security_events` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `security_events` VALUES
(1,'login_success',NULL,'admin','::1',NULL,NULL,NULL,1,'low',NULL,'2025-12-25 09:26:00'),
(2,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2025-12-25 09:28:05'),
(3,'login_fail',NULL,'admin','::1',NULL,NULL,NULL,0,'low',NULL,'2025-12-25 09:28:06'),
(4,'login_success',NULL,'admin','::ffff:127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2025-12-25 09:57:07'),
(5,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2025-12-25 09:57:14'),
(6,'login_success',NULL,'admin','::ffff:127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2025-12-25 10:24:57'),
(7,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2025-12-25 10:49:46'),
(8,'login_success',NULL,'admin','::ffff:127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2025-12-25 10:57:29'),
(9,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2025-12-26 03:18:08'),
(10,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2025-12-26 03:18:11'),
(11,'login_fail',NULL,'lechibang','192.168.0.109',NULL,NULL,NULL,0,'low',NULL,'2025-12-26 03:25:27'),
(12,'login_fail',NULL,'lechibang','192.168.0.109',NULL,NULL,NULL,0,'low',NULL,'2025-12-26 03:25:53'),
(13,'login_success',NULL,'admin','192.168.0.109',NULL,NULL,NULL,1,'low',NULL,'2025-12-26 03:26:04'),
(14,'login_success',NULL,'admin','192.168.0.109',NULL,NULL,NULL,1,'low',NULL,'2025-12-26 03:26:08'),
(15,'login_success',NULL,'lechibang','192.168.0.109',NULL,NULL,NULL,1,'low',NULL,'2025-12-26 03:28:20'),
(16,'login_success',NULL,'lechibang','192.168.0.109',NULL,NULL,NULL,1,'low',NULL,'2025-12-26 03:28:23'),
(17,'login_success',NULL,'lechibang','192.168.0.109',NULL,NULL,NULL,1,'low',NULL,'2025-12-26 03:29:09'),
(18,'login_success',NULL,'lechibang','192.168.0.109',NULL,NULL,NULL,1,'low',NULL,'2025-12-26 06:50:49'),
(19,'login_fail',NULL,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2025-12-26 06:57:12'),
(20,'login_success',NULL,'lechibang','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2025-12-26 06:59:37'),
(21,'login_success',NULL,'lechibang','192.168.0.168',NULL,NULL,NULL,1,'low',NULL,'2025-12-26 12:56:10'),
(22,'login_success',NULL,'lechibang','192.168.0.168',NULL,NULL,NULL,1,'low',NULL,'2025-12-26 13:23:57'),
(23,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2025-12-27 04:20:35'),
(24,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-03 10:17:49'),
(25,'login_success',NULL,'lechibang','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:30:32'),
(26,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:23'),
(27,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:23'),
(28,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:24'),
(29,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:24'),
(30,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:24'),
(31,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:24'),
(32,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:24'),
(33,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:24'),
(34,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:25'),
(35,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:25'),
(36,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:25'),
(37,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:25'),
(38,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:25'),
(39,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:25'),
(40,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:26'),
(41,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:26'),
(42,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:26'),
(43,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:26'),
(44,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:26'),
(45,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:26'),
(46,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:27'),
(47,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:27'),
(48,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:27'),
(49,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:27'),
(50,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:27'),
(51,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:27'),
(52,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:28'),
(53,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:28'),
(54,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:28'),
(55,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:28'),
(56,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:28'),
(57,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:28'),
(58,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:29'),
(59,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:29'),
(60,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:29'),
(61,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:29'),
(62,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:29'),
(63,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:29'),
(64,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:30'),
(65,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:30'),
(66,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:30'),
(67,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:30'),
(68,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:30'),
(69,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:30'),
(70,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:31'),
(71,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:31'),
(72,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:31'),
(73,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:31'),
(74,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:32'),
(75,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:32'),
(76,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:32'),
(77,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:32'),
(78,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:32'),
(79,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:32'),
(80,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:33'),
(81,'login_success',NULL,'reg_user_1767688663294','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:40:33'),
(82,'logout',NULL,'reg_user_1767688663294',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:40:33'),
(83,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 08:41:01'),
(84,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 08:41:01'),
(85,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 09:08:52'),
(86,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 09:14:23'),
(87,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 09:14:23'),
(88,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 09:15:32'),
(89,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 09:15:32'),
(90,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-06 09:15:46'),
(91,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-06 09:15:47'),
(92,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-07 10:13:02'),
(93,'login_fail',NULL,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-07 10:39:59'),
(94,'logout',NULL,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-07 10:41:27'),
(95,'login_success',NULL,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-07 10:41:38'),
(96,'login_fail',NULL,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-07 10:47:00'),
(97,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-07 10:48:43'),
(98,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-07 10:59:30'),
(99,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-07 10:59:31'),
(100,'login_fail',NULL,'lechibangadmin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-07 11:02:50'),
(101,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-08 07:32:33'),
(102,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-08 07:32:34'),
(103,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-08 07:32:42'),
(104,'logout',7,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-08 07:41:22'),
(105,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-08 07:41:42'),
(106,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-08 07:46:00'),
(107,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-08 07:46:42'),
(108,'logout',7,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-08 07:59:13'),
(109,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-08 07:59:56'),
(110,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-08 14:13:28'),
(111,'logout',7,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-08 14:19:07'),
(112,'login_success',NULL,'lecb','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-08 14:19:09'),
(113,'logout',NULL,'lecb',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-08 14:24:59'),
(114,'login_success',NULL,'lecb','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-08 14:25:07'),
(115,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-08 14:27:32'),
(116,'logout',7,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-08 14:27:53'),
(117,'login_success',NULL,'lecb','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-08 14:27:57'),
(118,'logout',NULL,'lecb',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-08 14:28:08'),
(119,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-08 14:35:48'),
(120,'logout',7,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-08 14:36:11'),
(121,'login_success',10,'test','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-08 14:36:15'),
(122,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-10 04:40:29'),
(123,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-10 06:08:54'),
(124,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-10 06:08:54'),
(125,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-10 06:09:04'),
(126,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-10 06:09:04'),
(127,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-10 08:20:12'),
(128,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-10 08:42:18'),
(129,'login_fail',NULL,'lechibangadmin@example.com','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-10 10:57:40'),
(130,'login_fail',NULL,'lechibangadmin@example.com','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-10 10:59:08'),
(131,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-10 11:03:15'),
(132,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-12 04:12:47'),
(133,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-12 04:12:48'),
(134,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-12 04:12:48'),
(135,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-12 04:31:34'),
(136,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-12 04:31:45'),
(137,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-12 04:31:51'),
(138,'login_success',11,'testadmin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-12 04:33:44'),
(139,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-13 03:29:38'),
(140,'login_success',11,'testadmin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-13 03:29:45'),
(141,'logout',11,'testadmin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-13 03:50:28'),
(142,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-13 03:50:37'),
(143,'login_success',11,'testadmin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-13 03:50:42'),
(144,'logout',11,'testadmin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-13 04:08:03'),
(145,'login_success',11,'testadmin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-13 04:08:08'),
(146,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-13 14:25:32'),
(147,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-13 14:26:45'),
(148,'logout',7,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-13 14:26:45'),
(149,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-13 14:27:07'),
(150,'logout',7,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-13 14:27:07'),
(151,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-13 14:28:35'),
(152,'logout',7,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-13 14:28:35'),
(153,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-13 14:40:32'),
(154,'logout',7,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-13 14:40:32'),
(155,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-13 14:41:22'),
(156,'logout',7,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-13 14:41:22'),
(157,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-13 14:41:39'),
(158,'logout',7,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-13 14:41:39'),
(159,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-13 14:42:07'),
(160,'logout',7,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-13 14:42:07'),
(161,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-13 14:42:35'),
(162,'logout',7,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-13 14:42:35'),
(163,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-13 14:43:12'),
(164,'logout',7,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-13 14:43:12'),
(165,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-14 03:18:54'),
(166,'logout',7,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-14 03:18:54'),
(167,'login_success',7,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-14 03:39:25'),
(168,'logout',7,'admin',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-14 03:39:25'),
(169,'login_success',NULL,'test_admin_1768374030538','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-14 07:00:30'),
(170,'logout',NULL,'test_admin_1768374030538',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-14 07:00:30'),
(171,'login_success',14,'debug_user_1768374275098','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-14 07:04:35'),
(172,'login_success',15,'debug_user_1768374410503','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-14 07:06:50'),
(173,'login_success',NULL,'test_admin_1768374710244','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-14 07:11:50'),
(174,'logout',NULL,'test_admin_1768374710244',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-14 07:11:50'),
(175,'login_success',NULL,'test_admin_1768374995343','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-14 07:16:35'),
(176,'logout',NULL,'test_admin_1768374995343',NULL,NULL,NULL,NULL,0,'low',NULL,'2026-01-14 07:16:35'),
(177,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-14 16:31:49'),
(178,'login_success',11,'testadmin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-14 16:31:52'),
(179,'login_success',11,'testadmin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-14 16:40:44'),
(180,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-21 07:36:35'),
(181,'login_fail',7,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-21 07:36:57'),
(182,'login_fail',10,'test','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-21 07:39:24'),
(183,'login_fail',1,'admin','127.0.0.1',NULL,NULL,NULL,0,'low',NULL,'2026-01-21 07:40:13'),
(184,'login_success',1,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-21 08:09:23'),
(185,'login_success',1,'admin','127.0.0.1',NULL,NULL,NULL,1,'low',NULL,'2026-01-23 19:21:46');
/*!40000 ALTER TABLE `security_events` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `session_id` varchar(128) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `expires` bigint(20) unsigned NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `data` mediumtext DEFAULT NULL,
  PRIMARY KEY (`session_id`),
  KEY `idx_expires` (`expires`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User session storage (alternative to express-mysql-session)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `sessions` VALUES
('23532174f59587e66723ca6ee9525d87a45e4915260b59ddaa1cd9b55271d10c',1,1769367985447,NULL,NULL),
('265d5e44129666b92951b5c6bbddfc36a10ce876f9ec65c42462229b1541d00f',14,1768460675405,NULL,'{\"ipAddress\":\"127.0.0.1\"}'),
('2da3982167aa187a702b0b1ab652e02bec77c169b28b41e71be62a1f0a5ec05b',7,1767945596905,NULL,'{\"ipAddress\":\"127.0.0.1\"}'),
('3b5bd1f3c8c7e1f34b50b456d75e691ec15b5e886c812b923f214296b09a5766',7,1768106429092,NULL,'{\"ipAddress\":\"127.0.0.1\"}'),
('4f26abdaf132337da05d2f4e5d524565f8ab0d8a64d61ab0f8b0ff9e70a18654',1,1769519602820,'127.0.0.1',NULL),
('541cfb3fe9f65d3b329cf59fcf747b1519fdfa4e9cf3214492973e9578acde1a',1,1769069363730,NULL,'{\"ipAddress\":\"127.0.0.1\"}'),
('7ab042347b9f6be610fffe99d40ba738069e25339f10b84dded34fa0c493e8b2',1,1769368965646,NULL,NULL),
('7bb6cda8b6d2a827391a26f0369af108bd024df2436120cee883f534407b962b',1,1770031713818,NULL,NULL),
('7caea03bc2b417dd83a1e84d46bcbf1ee737260de67ff76c114a312dcca8cfdd',1,1769368921816,NULL,NULL),
('8971cd9d20e41bba2f75937eb2b694415141d6278e09cb8cdfa24afe10b1a75b',7,1767944760429,NULL,'{\"ipAddress\":\"127.0.0.1\"}'),
('8a136469427768ad9f5360388efbc047ef0d68074625dbfd39f6d56ff078daeb',11,1768495244194,NULL,'{\"ipAddress\":\"127.0.0.1\"}'),
('8edc089a1062dd8015b8443a6a33d9e90c498697110c1e996b3efe078b5da054',11,1768278824940,NULL,'{\"ipAddress\":\"127.0.0.1\"}'),
('9dade64d40f4f599020f83ae00c809a5b8a4e15d2257391854e0a8f161edb067',1,1769368853245,NULL,NULL),
('a9d45a2b580529e788923c117f5ae5a0093e6da5769616180c363e6eece610bd',1,1769282506233,NULL,'{\"ipAddress\":\"127.0.0.1\"}'),
('d2a4046bbc4c3a46b19a03bb2b013811efdca8c0280908d75f072d9fd118290c',15,1768460810896,NULL,'{\"ipAddress\":\"127.0.0.1\"}'),
('d56fe3f77980cee2dd87f2c45fd73c6b961051568b88ed78ba0ef742dfe14478',11,1768363688413,NULL,'{\"ipAddress\":\"127.0.0.1\"}'),
('da47844f7d18830d01380ea4da424fdfec8f5771a73867f2dba3e15e01b563cf',7,1767943954684,NULL,'{\"ipAddress\":\"127.0.0.1\"}'),
('DMQe3bKHQw-AVvIdIEoIfQGIkLJywdaY',NULL,1762716430,NULL,'{\"cookie\":{\"originalMaxAge\":false,\"expires\":false,\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"strict\"},\"user\":{\"id\":1,\"username\":\"admin\",\"fullName\":\"System Administrator\",\"email\":\"admin@example.com\",\"is_active\":1,\"last_login\":null,\"failed_login_attempts\":0,\"locked_until\":null,\"created_at\":\"2025-11-03T09:31:40.000Z\",\"updated_at\":\"2025-11-03T09:31:40.000Z\",\"role\":\"admin\",\"sessionStart\":1762623885431,\"lastActivity\":1762623885431,\"sessionExpiry\":1762710285431}}'),
('e2b154d13c923a108d27ff2849f908dccc759296a068f44f0fdc763cb6670185',7,1767869323524,NULL,'{\"ipAddress\":\"127.0.0.1\"}'),
('e6ae6dc846fa2ffc7daa2a4c4934fbb0d00c3a5fdc4ea1c07ac724dae3ec10b9',7,1767944502377,NULL,'{\"ipAddress\":\"127.0.0.1\"}'),
('ea5c7b26f65a720ef3490a3ddfd402b3076bb221ad7a6222dfa6efd8e6932111',1,1769368115718,NULL,NULL),
('ec272b271ab699046b4f9aac50106d7ce055d08354d94c1690bbe8badd036a4d',11,1768494712727,NULL,'{\"ipAddress\":\"127.0.0.1\"}'),
('ecf8527b2df8f6d9b3386dda1ffb0cb6d21046a19c856c5283649025e1a113ee',10,1767969375402,NULL,'{\"ipAddress\":\"127.0.0.1\"}'),
('f13c2787715d0bde1e8d9faeae2087994dba9cc46722bb4b503444e307ecdc5c',7,1767869971989,NULL,'{\"ipAddress\":\"127.0.0.1\"}'),
('ScRpYcOqOg1dtgvzlSmqbaV4b5NhWaNy',NULL,1762717485,NULL,'{\"cookie\":{\"originalMaxAge\":false,\"expires\":false,\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"strict\"},\"user\":{\"id\":1,\"username\":\"admin\",\"fullName\":\"System Administrator\",\"email\":\"admin@example.com\",\"is_active\":1,\"last_login\":null,\"failed_login_attempts\":0,\"locked_until\":null,\"created_at\":\"2025-11-03T09:31:40.000Z\",\"updated_at\":\"2025-11-03T09:31:40.000Z\",\"role\":\"admin\",\"sessionStart\":1762630043965,\"lastActivity\":1762630043965,\"sessionExpiry\":1762716443965}}');
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Many-to-many relationship between users and roles';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `user_roles` VALUES
(22,1,5,'2026-01-26 13:08:14',NULL);
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `user_token_invalidation`
--

DROP TABLE IF EXISTS `user_token_invalidation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_token_invalidation` (
  `user_id` int(11) NOT NULL,
  `invalidated_at` timestamp NULL DEFAULT current_timestamp(),
  `reason` varchar(100) DEFAULT 'security_action',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  KEY `idx_invalidated_at` (`invalidated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_token_invalidation`
--

LOCK TABLES `user_token_invalidation` WRITE;
/*!40000 ALTER TABLE `user_token_invalidation` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `user_token_invalidation` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User accounts without hard-coded roles. Uses RBAC system via user_roles junction table';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `users` VALUES
(1,'admin','$2b$10$BJXDu4yyDn30NdQJGenS2exZTvGWGi1JVRRMnXAZW53LdjcgVrAN.','System Administrator','admin@mycelium.local',1,'2026-02-01 11:28:33',0,NULL,'2026-01-26 13:08:14','2026-02-01 11:28:33','admin');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
commit;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-02-01 22:18:41
