/*M!999999\- enable the sandbox mode */ 

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `laundry_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `laundry_db`;
DROP TABLE IF EXISTS `activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `outlet_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned DEFAULT NULL,
  `user_name` varchar(120) DEFAULT NULL,
  `action` varchar(40) NOT NULL,
  `entity` varchar(40) DEFAULT NULL,
  `entity_id` varchar(40) DEFAULT NULL,
  `summary` varchar(500) DEFAULT NULL,
  `ip` varchar(60) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_log_outlet` (`outlet_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `activity_logs` WRITE;
/*!40000 ALTER TABLE `activity_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `activity_logs` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `outlet_id` int(10) unsigned NOT NULL,
  `name` varchar(120) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `is_member` tinyint(1) NOT NULL DEFAULT 0,
  `points` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customer_phone` (`outlet_id`,`phone`),
  KEY `idx_customer_name` (`name`),
  CONSTRAINT `fk_customers_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `outlet_id` int(10) unsigned NOT NULL,
  `spent_on` date NOT NULL,
  `category` varchar(40) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `amount` decimal(14,2) NOT NULL,
  `method` enum('tunai','transfer','qris') NOT NULL DEFAULT 'tunai',
  `user_id` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_exp_period` (`outlet_id`,`spent_on`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `outlets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `outlets` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `tagline` varchar(200) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `open_hours` varchar(120) DEFAULT NULL,
  `express_pct` decimal(5,2) NOT NULL DEFAULT 30.00,
  `kilat_pct` decimal(5,2) NOT NULL DEFAULT 60.00,
  `express_hours` int(11) NOT NULL DEFAULT 24,
  `kilat_hours` int(11) NOT NULL DEFAULT 6,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `outlets` WRITE;
/*!40000 ALTER TABLE `outlets` DISABLE KEYS */;
INSERT INTO `outlets` VALUES
(1,'Laundry Bersih Jaya','Cucian wangi, rapi, tepat waktu.','Jl. Contoh No. 12, Padang, Sumatera Barat','0812-3456-7890','Setiap hari 07.00 – 21.00 WIB',30.00,60.00,24,6,'2026-11-13 11:42:59','2026-11-13 11:42:59');
/*!40000 ALTER TABLE `outlets` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `outlet_id` int(10) unsigned NOT NULL,
  `transaction_id` int(10) unsigned NOT NULL,
  `kind` enum('bayar','refund') NOT NULL DEFAULT 'bayar',
  `amount` decimal(14,2) NOT NULL,
  `method` enum('tunai','transfer','qris') NOT NULL DEFAULT 'tunai',
  `reference` varchar(80) DEFAULT NULL,
  `user_id` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_pay_period` (`outlet_id`,`created_at`),
  KEY `idx_pay_tx` (`transaction_id`),
  CONSTRAINT `fk_pay_tx` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `services` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `outlet_id` int(10) unsigned NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `category` enum('kiloan','satuan','paket') NOT NULL DEFAULT 'kiloan',
  `unit` varchar(20) NOT NULL DEFAULT 'kg',
  `price` decimal(14,2) NOT NULL,
  `est_hours` int(11) NOT NULL DEFAULT 48,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_services_outlet` (`outlet_id`,`is_active`),
  CONSTRAINT `fk_services_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
INSERT INTO `services` VALUES
(1,1,'Cuci Kering','Dicuci dan dikeringkan, dilipat rapi','kiloan','kg',6000.00,48,1,'2026-11-13 11:42:59','2026-11-13 11:42:59'),
(2,1,'Cuci Setrika','Cuci, kering, setrika uap, kemas plastik','kiloan','kg',8000.00,48,1,'2026-11-13 11:42:59','2026-11-13 11:42:59'),
(3,1,'Setrika Saja','Setrika pakaian bersih','kiloan','kg',5000.00,24,1,'2026-11-13 11:42:59','2026-11-13 11:42:59'),
(4,1,'Bed Cover','Bed cover single / double','satuan','pcs',35000.00,72,1,'2026-11-13 11:42:59','2026-11-13 11:42:59'),
(5,1,'Selimut','Selimut tebal / bulu','satuan','pcs',25000.00,72,1,'2026-11-13 11:42:59','2026-11-13 11:42:59'),
(6,1,'Jaket','Jaket kulit sintetis, parka, hoodie','satuan','pcs',20000.00,48,1,'2026-11-13 11:42:59','2026-11-13 11:42:59'),
(7,1,'Sepatu','Cuci sepatu luar-dalam','satuan','pasang',30000.00,72,1,'2026-11-13 11:42:59','2026-11-13 11:42:59'),
(8,1,'Karpet','Karpet per meter persegi','satuan','m²',15000.00,96,1,'2026-11-13 11:42:59','2026-11-13 11:42:59'),
(9,1,'Paket Hemat Keluarga','Cuci setrika 10 kg, hemat','paket','paket',70000.00,48,1,'2026-11-13 11:42:59','2026-11-13 11:42:59');
/*!40000 ALTER TABLE `services` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `status_histories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `status_histories` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `transaction_id` int(10) unsigned NOT NULL,
  `from_status` varchar(30) DEFAULT NULL,
  `to_status` varchar(30) NOT NULL,
  `user_id` int(10) unsigned DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `source` varchar(20) NOT NULL DEFAULT 'staff',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_hist_tx` (`transaction_id`),
  CONSTRAINT `fk_hist_tx` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `status_histories` WRITE;
/*!40000 ALTER TABLE `status_histories` DISABLE KEYS */;
/*!40000 ALTER TABLE `status_histories` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `transaction_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `transaction_id` int(10) unsigned NOT NULL,
  `service_id` int(10) unsigned DEFAULT NULL,
  `service_name` varchar(120) NOT NULL,
  `category` enum('kiloan','satuan','paket') NOT NULL,
  `unit` varchar(20) NOT NULL,
  `qty` decimal(10,2) NOT NULL,
  `price` decimal(14,2) NOT NULL,
  `subtotal` decimal(14,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_items_tx` (`transaction_id`),
  KEY `fk_items_service` (`service_id`),
  CONSTRAINT `fk_items_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_items_tx` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `transaction_items` WRITE;
/*!40000 ALTER TABLE `transaction_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `transaction_items` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `outlet_id` int(10) unsigned NOT NULL,
  `invoice_no` varchar(30) NOT NULL,
  `tracking_token` varchar(40) NOT NULL,
  `customer_id` int(10) unsigned NOT NULL,
  `received_by` int(10) unsigned NOT NULL,
  `speed` enum('reguler','express','kilat') NOT NULL DEFAULT 'reguler',
  `subtotal` decimal(14,2) NOT NULL DEFAULT 0.00,
  `speed_fee` decimal(14,2) NOT NULL DEFAULT 0.00,
  `extra_fee` decimal(14,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(14,2) NOT NULL DEFAULT 0.00,
  `total` decimal(14,2) NOT NULL DEFAULT 0.00,
  `paid_amount` decimal(14,2) NOT NULL DEFAULT 0.00,
  `payment_status` enum('belum_lunas','dp','lunas') NOT NULL DEFAULT 'belum_lunas',
  `status` enum('diterima','menunggu_antrean','sedang_dicuci','pengeringan','penyetrikaan','pengemasan','siap_diambil','sudah_diambil','dibatalkan') NOT NULL DEFAULT 'diterima',
  `est_done` datetime DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `cancel_reason` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_no` (`invoice_no`),
  UNIQUE KEY `tracking_token` (`tracking_token`),
  KEY `idx_tx_period` (`outlet_id`,`created_at`),
  KEY `idx_tx_status` (`outlet_id`,`status`),
  KEY `idx_tx_customer` (`customer_id`),
  KEY `fk_tx_user` (`received_by`),
  CONSTRAINT `fk_tx_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_tx_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`),
  CONSTRAINT `fk_tx_user` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `outlet_id` int(10) unsigned NOT NULL,
  `name` varchar(120) NOT NULL,
  `username` varchar(60) NOT NULL,
  `email` varchar(160) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `password_hash` varchar(100) NOT NULL,
  `role` enum('owner','karyawan') NOT NULL DEFAULT 'karyawan',
  `can_discount` tinyint(1) NOT NULL DEFAULT 0,
  `can_correct` tinyint(1) NOT NULL DEFAULT 0,
  `can_payment` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `must_change_password` tinyint(1) NOT NULL DEFAULT 0,
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_outlet` (`outlet_id`),
  CONSTRAINT `fk_users_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
(1,1,'Owner Demo','owner','owner@laundry.local',NULL,'$2a$10$D8xxGQGKKBSrtR0NhGRqTeVk.RFLIT532vLDYW2iKltl7zlMSIP.S','owner',1,1,1,1,1,NULL,'2026-11-13 11:42:59','2026-11-13 11:42:59'),
(2,1,'Kasir Demo','kasir','kasir@laundry.local',NULL,'$2a$10$AbgaJNzYKu2hrgCxqxMAgOoIwTNZE9O.3YBB8QHrF.TEW8TlRglq2','karyawan',0,0,1,1,1,NULL,'2026-11-13 11:42:59','2026-11-13 11:42:59');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

