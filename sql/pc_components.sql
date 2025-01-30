/*M!999999\- enable the sandbox mode */
-- MariaDB dump 10.19-11.8.3-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: pc_components
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
-- Table structure for table `builds`
--

DROP TABLE IF EXISTS `builds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `builds` (
  `build_id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `build_purpose` varchar(50) DEFAULT NULL COMMENT 'Gaming, Workstation, Office, HTPC, NAS',
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'User tags for categorization' CHECK (json_valid(`tags`)),
  `cpu_id` char(36) DEFAULT NULL,
  `motherboard_id` char(36) DEFAULT NULL,
  `gpu_id` char(36) DEFAULT NULL,
  `psu_id` char(36) DEFAULT NULL,
  `case_id` char(36) DEFAULT NULL,
  `cooler_id` char(36) DEFAULT NULL,
  `ram_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of RAM IDs and quantities' CHECK (json_valid(`ram_ids`)),
  `storage_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of Storage IDs and quantities' CHECK (json_valid(`storage_ids`)),
  `fan_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of Case Fan IDs and quantities' CHECK (json_valid(`fan_ids`)),
  `expansion_card_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of Expansion Card IDs' CHECK (json_valid(`expansion_card_ids`)),
  `monitor_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of Monitor IDs' CHECK (json_valid(`monitor_ids`)),
  `cable_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of Cable IDs' CHECK (json_valid(`cable_ids`)),
  `peripheral_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of peripheral IDs (mouse, keyboard, etc.)' CHECK (json_valid(`peripheral_ids`)),
  `total_tdp_watts` int(11) DEFAULT NULL,
  `estimated_price` decimal(10, 2) DEFAULT NULL,
  `total_price` decimal(10, 2) DEFAULT NULL COMMENT 'Sum of all component prices',
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
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `builds`
--

LOCK TABLES `builds` WRITE;
/*!40000 ALTER TABLE `builds` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `builds` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `cables`
--

DROP TABLE IF EXISTS `cables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `cables` (
  `cable_id` char(36) NOT NULL,
  `part_code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
  `cable_category` varchar(20) NOT NULL COMMENT 'Power, Data, Display',
  `cable_type` varchar(30) NOT NULL COMMENT 'SATA, PCIe, HDMI, DP, USB',
  `connector_end_a` varchar(50) DEFAULT NULL,
  `connector_end_b` varchar(50) DEFAULT NULL,
  `length_m` decimal(4, 2) DEFAULT NULL,
  `bandwidth` varchar(30) DEFAULT NULL COMMENT 'e.g., 48Gbps for HDMI 2.1',
  `version` varchar(20) DEFAULT NULL COMMENT 'HDMI 2.1, DP 1.4, USB 3.2 Gen2',
  `gauge` varchar(10) DEFAULT NULL COMMENT 'AWG rating for power cables',
  `certification` varchar(50) DEFAULT NULL COMMENT 'VESA Certified, HDMI Premium Certified',
  `max_resolution` varchar(30) DEFAULT NULL COMMENT 'For display cables: 4K@120Hz, 8K@60Hz',
  `sleeved` tinyint(1) DEFAULT 0,
  `color` varchar(30) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `msrp` decimal(10, 2) DEFAULT NULL,
  `supplier_id` char(36) DEFAULT NULL,
  `unit_cost` decimal(10, 2) DEFAULT NULL,
  `unit_price` decimal(10, 2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `image_url` varchar(500) DEFAULT NULL,
  `reorder_point` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`cable_id`),
  UNIQUE KEY `part_code` (`part_code`),
  KEY `idx_cable_category` (`cable_category`),
  KEY `idx_cable_type` (`cable_type`),
  KEY `idx_cable_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `cables`
--

LOCK TABLES `cables` WRITE;
/*!40000 ALTER TABLE `cables` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `cables` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `case_fans`
--

DROP TABLE IF EXISTS `case_fans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `case_fans` (
  `fan_id` char(36) NOT NULL,
  `part_code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
  `size_mm` int(11) NOT NULL COMMENT '120, 140, etc.',
  `quantity_in_pack` int(11) DEFAULT 1,
  `rgb_type` varchar(20) DEFAULT NULL COMMENT 'ARGB 5V, RGB 12V, None',
  `connector_type` varchar(20) DEFAULT NULL COMMENT '4-pin PWM, 3-pin DC',
  `daisy_chain` tinyint(1) DEFAULT 0,
  `rpm_min` int(11) DEFAULT NULL,
  `rpm_max` int(11) DEFAULT NULL,
  `airflow_cfm` decimal(5, 1) DEFAULT NULL,
  `static_pressure_mmh2o` decimal(4, 2) DEFAULT NULL,
  `noise_dba` decimal(4, 1) DEFAULT NULL,
  `bearing_type` varchar(50) DEFAULT NULL,
  `pwm` tinyint(1) DEFAULT 1,
  `blade_count` int(11) DEFAULT NULL,
  `anti_vibration` tinyint(1) DEFAULT 0,
  `fan_curve_profiles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Predefined fan curves from software' CHECK (json_valid(`fan_curve_profiles`)),
  `thickness_mm` decimal(4, 1) DEFAULT 25.0,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `msrp` decimal(10, 2) DEFAULT NULL,
  `supplier_id` char(36) DEFAULT NULL,
  `unit_cost` decimal(10, 2) DEFAULT NULL,
  `unit_price` decimal(10, 2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `image_url` varchar(500) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 24,
  `reorder_point` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`fan_id`),
  UNIQUE KEY `part_code` (`part_code`),
  KEY `idx_fan_size` (`size_mm`),
  KEY `idx_fan_rgb` (`rgb_type`),
  KEY `idx_fan_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `case_fans`
--

LOCK TABLES `case_fans` WRITE;
/*!40000 ALTER TABLE `case_fans` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `case_fans` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `cpu`
--

DROP TABLE IF EXISTS `cpu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `cpu` (
  `cpu_id` char(36) NOT NULL,
  `part_code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `manufacturer` varchar(100) NOT NULL,
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
  `p_core_base_ghz` decimal(5, 2) DEFAULT NULL COMMENT 'P-core base clock',
  `p_core_boost_ghz` decimal(5, 2) DEFAULT NULL COMMENT 'P-core max boost clock',
  `e_core_base_ghz` decimal(5, 2) DEFAULT NULL COMMENT 'E-core base clock',
  `e_core_boost_ghz` decimal(5, 2) DEFAULT NULL COMMENT 'E-core max boost clock',
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
  `base_clock_ghz` decimal(5, 2) DEFAULT NULL,
  `boost_clock_ghz` decimal(5, 2) DEFAULT NULL,
  `cache_l2_mb` decimal(5, 1) DEFAULT NULL,
  `cache_l3_mb` decimal(5, 1) DEFAULT NULL,
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
  `msrp` decimal(10, 2) DEFAULT NULL,
  `supplier_id` char(36) DEFAULT NULL,
  `unit_cost` decimal(10, 2) DEFAULT NULL,
  `unit_price` decimal(10, 2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `image_url` varchar(500) DEFAULT NULL,
  `datasheet_url` varchar(500) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 36,
  `reorder_point` int(11) DEFAULT 0,
  `launch_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`cpu_id`),
  UNIQUE KEY `part_code` (`part_code`),
  KEY `idx_cpu_socket` (`socket`),
  KEY `idx_cpu_manufacturer` (`manufacturer`),
  KEY `idx_cpu_socket_memory` (`socket`, `memory_type`),
  KEY `idx_cpu_active` (`is_active`),
  KEY `idx_cpu_family` (`family`),
  KEY `idx_cpu_microarch` (`microarchitecture`),
  KEY `idx_cpu_generation` (`generation`),
  KEY `idx_cpu_design` (`design_type`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `cpu`
--

LOCK TABLES `cpu` WRITE;
/*!40000 ALTER TABLE `cpu` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `cpu` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `cpu_coolers`
--

DROP TABLE IF EXISTS `cpu_coolers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `cpu_coolers` (
  `cooler_id` char(36) NOT NULL,
  `part_code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
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
  `fan_airflow_cfm` decimal(5, 1) DEFAULT NULL,
  `fan_static_pressure_mmh2o` decimal(4, 2) DEFAULT NULL,
  `fan_noise_dba` decimal(4, 1) DEFAULT NULL,
  `fan_bearing_type` varchar(50) DEFAULT NULL,
  `fan_pwm` tinyint(1) DEFAULT 1,
  `fan_rgb` tinyint(1) DEFAULT 0,
  `lcd_display` tinyint(1) DEFAULT 0,
  `software_control` varchar(100) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `msrp` decimal(10, 2) DEFAULT NULL,
  `supplier_id` char(36) DEFAULT NULL,
  `unit_cost` decimal(10, 2) DEFAULT NULL,
  `unit_price` decimal(10, 2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `image_url` varchar(500) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 72 COMMENT '6yr for premium coolers',
  `warranty_includes_mounting` tinyint(1) DEFAULT 1,
  `reorder_point` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`cooler_id`),
  UNIQUE KEY `part_code` (`part_code`),
  KEY `idx_cooler_type` (`type`),
  KEY `idx_cooler_socket` (`socket_compatibility`(255)),
  KEY `idx_cooler_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `cpu_coolers`
--

LOCK TABLES `cpu_coolers` WRITE;
/*!40000 ALTER TABLE `cpu_coolers` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `cpu_coolers` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `expansion_cards`
--

DROP TABLE IF EXISTS `expansion_cards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `expansion_cards` (
  `expansion_card_id` char(36) NOT NULL,
  `part_code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
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
  `slot_width` decimal(3, 1) DEFAULT 1.0 COMMENT 'How many slots wide',
  `low_profile_available` tinyint(1) DEFAULT 0,
  `driver_support` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`driver_support`)),
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `msrp` decimal(10, 2) DEFAULT NULL,
  `supplier_id` char(36) DEFAULT NULL,
  `unit_cost` decimal(10, 2) DEFAULT NULL,
  `unit_price` decimal(10, 2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `image_url` varchar(500) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 36,
  `reorder_point` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`expansion_card_id`),
  UNIQUE KEY `part_code` (`part_code`),
  KEY `idx_expcard_category` (`category`),
  KEY `idx_expcard_slot` (`slot_type`),
  KEY `idx_expcard_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `expansion_cards`
--

LOCK TABLES `expansion_cards` WRITE;
/*!40000 ALTER TABLE `expansion_cards` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `expansion_cards` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `gpu`
--

DROP TABLE IF EXISTS `gpu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `gpu` (
  `gpu_id` char(36) NOT NULL,
  `part_code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `manufacturer` varchar(100) NOT NULL,
  `gpu_chipset` varchar(100) DEFAULT NULL,
  `gpu_chip_manufacturer` varchar(50) DEFAULT NULL,
  `length_mm` int(11) DEFAULT NULL,
  `slot_width` decimal(3, 1) DEFAULT NULL,
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
  `memory_bandwidth_gbps` decimal(8, 1) DEFAULT NULL,
  `vram_ecc` tinyint(1) DEFAULT 0 COMMENT 'ECC VRAM for workstation cards',
  `recommended_psu_watts` int(11) DEFAULT NULL,
  `height_mm` decimal(6, 1) DEFAULT NULL,
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
  `msrp` decimal(10, 2) DEFAULT NULL,
  `supplier_id` char(36) DEFAULT NULL,
  `unit_cost` decimal(10, 2) DEFAULT NULL,
  `unit_price` decimal(10, 2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `image_url` varchar(500) DEFAULT NULL,
  `datasheet_url` varchar(500) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 36,
  `reorder_point` int(11) DEFAULT 0,
  `launch_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`gpu_id`),
  UNIQUE KEY `part_code` (`part_code`),
  KEY `idx_gpu_manufacturer` (`gpu_chip_manufacturer`),
  KEY `idx_gpu_chipset` (`gpu_chip_manufacturer`, `gpu_chipset`),
  KEY `idx_gpu_length` (`length_mm`),
  KEY `idx_gpu_tdp` (`tdp`),
  KEY `idx_gpu_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `gpu`
--

LOCK TABLES `gpu` WRITE;
/*!40000 ALTER TABLE `gpu` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `gpu` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `headphones`
--

DROP TABLE IF EXISTS `headphones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `headphones` (
  `headphone_id` char(36) NOT NULL,
  `part_code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
  `type` varchar(20) NOT NULL COMMENT 'Over-ear, On-ear, In-ear, Earbuds',
  `driver_type` varchar(30) DEFAULT NULL COMMENT 'Dynamic, Planar Magnetic, Electrostatic, BA',
  `driver_size_mm` decimal(5, 1) DEFAULT NULL,
  `driver_count` int(11) DEFAULT 1 COMMENT 'Multiple drivers for IEMs',
  `crossover` varchar(30) DEFAULT NULL COMMENT 'For multi-driver IEMs',
  `frequency_response` varchar(30) DEFAULT NULL COMMENT '20Hz-20kHz etc.',
  `impedance_ohms` int(11) DEFAULT NULL,
  `sensitivity_db` decimal(5, 1) DEFAULT NULL,
  `thd_percent` decimal(4, 2) DEFAULT NULL COMMENT 'Total Harmonic Distortion',
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
  `cable_length_m` decimal(3, 1) DEFAULT NULL,
  `cable_connector` varchar(20) DEFAULT NULL COMMENT '3.5mm, 6.35mm, USB-C, Lightning',
  `weight_g` decimal(5, 1) DEFAULT NULL,
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
  `msrp` decimal(10, 2) DEFAULT NULL,
  `supplier_id` char(36) DEFAULT NULL,
  `unit_cost` decimal(10, 2) DEFAULT NULL,
  `unit_price` decimal(10, 2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `image_url` varchar(500) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 24,
  `reorder_point` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`headphone_id`),
  UNIQUE KEY `part_code` (`part_code`),
  KEY `idx_hp_type` (`type`),
  KEY `idx_hp_connectivity` (`connectivity`),
  KEY `idx_hp_manufacturer` (`manufacturer`),
  KEY `idx_hp_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `headphones`
--

LOCK TABLES `headphones` WRITE;
/*!40000 ALTER TABLE `headphones` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `headphones` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `headsets`
--

DROP TABLE IF EXISTS `headsets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `headsets` (
  `headset_id` char(36) NOT NULL,
  `part_code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
  `type` varchar(20) NOT NULL COMMENT 'Over-ear, On-ear',
  `driver_type` varchar(30) DEFAULT NULL COMMENT 'Dynamic, Planar Magnetic',
  `driver_size_mm` decimal(5, 1) DEFAULT NULL,
  `frequency_response` varchar(30) DEFAULT NULL,
  `impedance_ohms` int(11) DEFAULT NULL,
  `sensitivity_db` decimal(5, 1) DEFAULT NULL,
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
  `mic_sensitivity_db` decimal(5, 1) DEFAULT NULL COMMENT 'Mic sensitivity in dB',
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
  `cable_length_m` decimal(3, 1) DEFAULT NULL,
  `cable_connector` varchar(20) DEFAULT NULL COMMENT '3.5mm, USB-A, USB-C',
  `weight_g` decimal(5, 1) DEFAULT NULL,
  `ear_pad_material` varchar(30) DEFAULT NULL,
  `headband_material` varchar(30) DEFAULT NULL,
  `rgb` tinyint(1) DEFAULT 0,
  `software` varchar(100) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `carrying_case` tinyint(1) DEFAULT 0,
  `replaceable_pads` tinyint(1) DEFAULT 1,
  `ip_rating` varchar(10) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `msrp` decimal(10, 2) DEFAULT NULL,
  `supplier_id` char(36) DEFAULT NULL,
  `unit_cost` decimal(10, 2) DEFAULT NULL,
  `unit_price` decimal(10, 2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `image_url` varchar(500) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 24,
  `reorder_point` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`headset_id`),
  UNIQUE KEY `part_code` (`part_code`),
  KEY `idx_hs_type` (`type`),
  KEY `idx_hs_connectivity` (`connectivity`),
  KEY `idx_hs_manufacturer` (`manufacturer`),
  KEY `idx_hs_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `headsets`
--

LOCK TABLES `headsets` WRITE;
/*!40000 ALTER TABLE `headsets` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `headsets` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `keyboard`
--

DROP TABLE IF EXISTS `keyboard`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `keyboard` (
  `keyboard_id` char(36) NOT NULL,
  `part_code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
  `type` varchar(20) NOT NULL COMMENT 'Mechanical, Membrane, Optical, Topre',
  `size` varchar(20) NOT NULL COMMENT 'Full, TKL, 75pct, 65pct, 60pct, 40pct',
  `layout` varchar(30) DEFAULT 'ANSI' COMMENT 'ANSI, ISO, JIS',
  `connectivity` varchar(20) NOT NULL COMMENT 'Wired, Wireless, Both',
  `switch_brand` varchar(50) DEFAULT NULL,
  `switch_model` varchar(100) DEFAULT NULL,
  `switch_type` varchar(20) DEFAULT NULL COMMENT 'Linear, Tactile, Clicky',
  `switch_actuation_force_g` int(11) DEFAULT NULL,
  `switch_travel_mm` decimal(3, 1) DEFAULT NULL,
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
  `typing_angle_degrees` decimal(3, 1) DEFAULT NULL,
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
  `msrp` decimal(10, 2) DEFAULT NULL,
  `supplier_id` char(36) DEFAULT NULL,
  `unit_cost` decimal(10, 2) DEFAULT NULL,
  `unit_price` decimal(10, 2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `image_url` varchar(500) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 24,
  `reorder_point` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`keyboard_id`),
  UNIQUE KEY `part_code` (`part_code`),
  KEY `idx_kb_type` (`type`),
  KEY `idx_kb_size` (`size`),
  KEY `idx_kb_switch` (`switch_brand`, `switch_model`),
  KEY `idx_kb_connectivity` (`connectivity`),
  KEY `idx_kb_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `keyboard`
--

LOCK TABLES `keyboard` WRITE;
/*!40000 ALTER TABLE `keyboard` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `keyboard` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `monitors`
--

DROP TABLE IF EXISTS `monitors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `monitors` (
  `monitor_id` char(36) NOT NULL,
  `part_code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
  `screen_size_inches` decimal(4, 1) NOT NULL,
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
  `response_time_ms` decimal(4, 1) DEFAULT NULL,
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
  `speaker_watts` decimal(4, 1) DEFAULT NULL,
  `vesa_mount` varchar(20) DEFAULT NULL,
  `height_adjustable` tinyint(1) DEFAULT 0,
  `pivot` tinyint(1) DEFAULT 0,
  `swivel` tinyint(1) DEFAULT 0,
  `tilt` tinyint(1) DEFAULT 1,
  `curved` tinyint(1) DEFAULT 0,
  `curvature` varchar(10) DEFAULT NULL COMMENT '1000R, 1500R, 1800R',
  `weight_kg` decimal(5, 2) DEFAULT NULL,
  `power_consumption_watts` int(11) DEFAULT NULL,
  `energy_rating` varchar(10) DEFAULT NULL COMMENT 'Energy Star, EU energy label',
  `dimensions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'with and without stand' CHECK (json_valid(`dimensions`)),
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `msrp` decimal(10, 2) DEFAULT NULL,
  `supplier_id` char(36) DEFAULT NULL,
  `unit_cost` decimal(10, 2) DEFAULT NULL,
  `unit_price` decimal(10, 2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `image_url` varchar(500) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 36,
  `reorder_point` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`monitor_id`),
  UNIQUE KEY `part_code` (`part_code`),
  KEY `idx_monitor_size` (`screen_size_inches`),
  KEY `idx_monitor_resolution` (`resolution_h`, `resolution_v`),
  KEY `idx_monitor_refresh` (`refresh_rate_hz`),
  KEY `idx_monitor_panel` (`panel_type`),
  KEY `idx_monitor_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `monitors`
--

LOCK TABLES `monitors` WRITE;
/*!40000 ALTER TABLE `monitors` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `monitors` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `motherboard`
--

DROP TABLE IF EXISTS `motherboard`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `motherboard` (
  `motherboard_id` char(36) NOT NULL,
  `part_code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `manufacturer` varchar(100) NOT NULL,
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
  `length_mm` decimal(6, 1) DEFAULT NULL,
  `width_mm` decimal(6, 1) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `msrp` decimal(10, 2) DEFAULT NULL,
  `supplier_id` char(36) DEFAULT NULL,
  `unit_cost` decimal(10, 2) DEFAULT NULL,
  `unit_price` decimal(10, 2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `image_url` varchar(500) DEFAULT NULL,
  `datasheet_url` varchar(500) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 36,
  `reorder_point` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`motherboard_id`),
  UNIQUE KEY `part_code` (`part_code`),
  KEY `idx_mobo_socket` (`socket`),
  KEY `idx_mobo_socket_ff` (`socket`, `form_factor`),
  KEY `idx_mobo_chipset` (`chipset`),
  KEY `idx_mobo_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `motherboard`
--

LOCK TABLES `motherboard` WRITE;
/*!40000 ALTER TABLE `motherboard` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `motherboard` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `mouse`
--

DROP TABLE IF EXISTS `mouse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `mouse` (
  `mouse_id` char(36) NOT NULL,
  `part_code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
  `type` varchar(20) NOT NULL COMMENT 'Wired, Wireless, Both',
  `sensor_type` varchar(50) DEFAULT NULL COMMENT 'Optical, Laser',
  `sensor_model` varchar(100) DEFAULT NULL,
  `dpi_min` int(11) DEFAULT NULL,
  `dpi_max` int(11) DEFAULT NULL,
  `dpi_steps` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of DPI presets' CHECK (json_valid(`dpi_steps`)),
  `polling_rate_hz` int(11) DEFAULT 1000,
  `max_tracking_speed_ips` int(11) DEFAULT NULL,
  `max_acceleration_g` int(11) DEFAULT NULL,
  `lod_mm` decimal(3, 1) DEFAULT NULL COMMENT 'Lift-Off Distance in mm',
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
  `cable_length_m` decimal(3, 1) DEFAULT NULL,
  `weight_g` decimal(5, 1) DEFAULT NULL,
  `length_mm` decimal(5, 1) DEFAULT NULL,
  `width_mm` decimal(5, 1) DEFAULT NULL,
  `height_mm` decimal(5, 1) DEFAULT NULL,
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
  `msrp` decimal(10, 2) DEFAULT NULL,
  `supplier_id` char(36) DEFAULT NULL,
  `unit_cost` decimal(10, 2) DEFAULT NULL,
  `unit_price` decimal(10, 2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `image_url` varchar(500) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 24,
  `reorder_point` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`mouse_id`),
  UNIQUE KEY `part_code` (`part_code`),
  KEY `idx_mouse_type` (`type`),
  KEY `idx_mouse_manufacturer` (`manufacturer`),
  KEY `idx_mouse_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `mouse`
--

LOCK TABLES `mouse` WRITE;
/*!40000 ALTER TABLE `mouse` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `mouse` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `pc_cases`
--

DROP TABLE IF EXISTS `pc_cases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `pc_cases` (
  `case_id` char(36) NOT NULL,
  `part_code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
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
  `height_mm` decimal(6, 1) DEFAULT NULL,
  `width_mm` decimal(6, 1) DEFAULT NULL,
  `depth_mm` decimal(6, 1) DEFAULT NULL,
  `volume_liters` decimal(5, 1) DEFAULT NULL,
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
  `weight_kg` decimal(5, 2) DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `msrp` decimal(10, 2) DEFAULT NULL,
  `supplier_id` char(36) DEFAULT NULL,
  `unit_cost` decimal(10, 2) DEFAULT NULL,
  `unit_price` decimal(10, 2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `image_url` varchar(500) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 24,
  `reorder_point` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`case_id`),
  UNIQUE KEY `part_code` (`part_code`),
  KEY `idx_case_ff` (`form_factor`),
  KEY `idx_case_gpu_len` (`max_gpu_length_mm`),
  KEY `idx_case_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `pc_cases`
--

LOCK TABLES `pc_cases` WRITE;
/*!40000 ALTER TABLE `pc_cases` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `pc_cases` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `power_supply`
--

DROP TABLE IF EXISTS `power_supply`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `power_supply` (
  `psu_id` char(36) NOT NULL,
  `part_code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
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
  `msrp` decimal(10, 2) DEFAULT NULL,
  `supplier_id` char(36) DEFAULT NULL,
  `unit_cost` decimal(10, 2) DEFAULT NULL,
  `unit_price` decimal(10, 2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `image_url` varchar(500) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 120 COMMENT '10yr for premium PSUs',
  `reorder_point` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`psu_id`),
  UNIQUE KEY `part_code` (`part_code`),
  KEY `idx_psu_wattage` (`wattage`),
  KEY `idx_psu_type` (`type`),
  KEY `idx_psu_length` (`length_mm`),
  KEY `idx_psu_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `power_supply`
--

LOCK TABLES `power_supply` WRITE;
/*!40000 ALTER TABLE `power_supply` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `power_supply` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `ram`
--

DROP TABLE IF EXISTS `ram`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `ram` (
  `ram_id` char(36) NOT NULL,
  `part_code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
  `type` varchar(10) NOT NULL,
  `speed_mhz` int(11) NOT NULL,
  `xmp_expo` varchar(20) DEFAULT NULL COMMENT 'XMP 3.0, EXPO, DOCP',
  `base_speed_mhz` int(11) DEFAULT NULL COMMENT 'JEDEC base speed',
  `modules` int(11) DEFAULT 1,
  `height_mm` decimal(5, 1) DEFAULT NULL,
  `capacity_per_module_gb` int(11) DEFAULT NULL,
  `capacity_total_gb` int(11) DEFAULT NULL,
  `cas_latency` int(11) DEFAULT NULL,
  `trcd` int(11) DEFAULT NULL,
  `trp` int(11) DEFAULT NULL,
  `tras` int(11) DEFAULT NULL,
  `voltage` decimal(4, 2) DEFAULT NULL,
  `die_type` varchar(30) DEFAULT NULL COMMENT 'Samsung B-die, Hynix A-die, Micron A-die',
  `ranks_per_module` int(11) DEFAULT 1 COMMENT 'Single-rank or Dual-rank',
  `ecc` tinyint(1) DEFAULT 0,
  `on_die_ecc` tinyint(1) DEFAULT 0 COMMENT 'DDR5 on-die ECC (not full ECC)',
  `pmic` varchar(30) DEFAULT NULL COMMENT 'DDR5 PMIC: integrated or external',
  `has_heatspreader` tinyint(1) DEFAULT 1,
  `rgb` tinyint(1) DEFAULT 0,
  `heat_spreader_height_mm` decimal(5, 1) DEFAULT NULL COMMENT 'Total height with heatspreader for clearance check',
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `msrp` decimal(10, 2) DEFAULT NULL,
  `supplier_id` char(36) DEFAULT NULL,
  `unit_cost` decimal(10, 2) DEFAULT NULL,
  `unit_price` decimal(10, 2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `image_url` varchar(500) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 0 COMMENT 'Lifetime = 0',
  `reorder_point` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ram_id`),
  UNIQUE KEY `part_code` (`part_code`),
  KEY `idx_ram_type` (`type`),
  KEY `idx_ram_type_speed` (`type`, `speed_mhz`),
  KEY `idx_ram_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `ram`
--

LOCK TABLES `ram` WRITE;
/*!40000 ALTER TABLE `ram` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `ram` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
--
-- Table structure for table `storage`
--

DROP TABLE IF EXISTS `storage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */
;
/*!40101 SET character_set_client = utf8mb4 */
;
CREATE TABLE `storage` (
  `storage_id` char(36) NOT NULL,
  `part_code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
  `type` varchar(10) NOT NULL COMMENT 'SSD or HDD',
  `interface_type` varchar(20) NOT NULL COMMENT 'M.2, SATA',
  `form_factor` varchar(30) DEFAULT NULL COMMENT 'M.2 2280, 2.5 inch, 3.5 inch',
  `height_mm` decimal(5, 1) DEFAULT NULL COMMENT 'Physical height for 2.5/3.5 drives',
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
  `endurance_dwpd` decimal(4, 2) DEFAULT NULL COMMENT 'Drive Writes Per Day rating',
  `mtbf_hours` int(11) DEFAULT NULL COMMENT 'Mean Time Between Failures',
  `rpm` int(11) DEFAULT NULL COMMENT 'HDD only',
  `cache_mb` int(11) DEFAULT NULL COMMENT 'HDD only',
  `recording_tech` varchar(10) DEFAULT NULL COMMENT 'CMR, SMR - HDD only',
  `helium_sealed` tinyint(1) DEFAULT 0,
  `use_case` varchar(30) DEFAULT NULL COMMENT 'Consumer, Prosumer, Enterprise, NAS',
  `active_watts` decimal(5, 1) DEFAULT NULL,
  `idle_watts` decimal(5, 1) DEFAULT NULL,
  `encryption` varchar(50) DEFAULT NULL COMMENT 'AES-256, TCG Opal 2.0, None',
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `msrp` decimal(10, 2) DEFAULT NULL,
  `supplier_id` char(36) DEFAULT NULL,
  `unit_cost` decimal(10, 2) DEFAULT NULL,
  `unit_price` decimal(10, 2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `image_url` varchar(500) DEFAULT NULL,
  `warranty_months` int(11) DEFAULT 60,
  `reorder_point` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`storage_id`),
  UNIQUE KEY `part_code` (`part_code`),
  KEY `idx_storage_type` (`type`),
  KEY `idx_storage_interface` (`interface_type`),
  KEY `idx_storage_capacity` (`capacity_gb`),
  KEY `idx_storage_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */
;
--
-- Dumping data for table `storage`
--

LOCK TABLES `storage` WRITE;
/*!40000 ALTER TABLE `storage` DISABLE KEYS */
;
set autocommit = 0;
/*!40000 ALTER TABLE `storage` ENABLE KEYS */
;
UNLOCK TABLES;
commit;
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
-- Dump completed on 2026-02-09  2:15:04