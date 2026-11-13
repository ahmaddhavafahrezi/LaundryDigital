-- Management Laundry Digital — skema MySQL / MariaDB
-- Import lewat phpMyAdmin atau: mysql -u root -p < database/schema.sql
CREATE DATABASE IF NOT EXISTS laundry_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE laundry_db;

CREATE TABLE IF NOT EXISTS outlets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  tagline VARCHAR(200) NULL,
  address VARCHAR(255) NULL,
  phone VARCHAR(30) NULL,
  open_hours VARCHAR(120) NULL,
  express_pct DECIMAL(5,2) NOT NULL DEFAULT 30,
  kilat_pct DECIMAL(5,2) NOT NULL DEFAULT 60,
  express_hours INT NOT NULL DEFAULT 24,
  kilat_hours INT NOT NULL DEFAULT 6,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  outlet_id INT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  username VARCHAR(60) NOT NULL UNIQUE,
  email VARCHAR(160) NULL UNIQUE,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(100) NOT NULL,
  role ENUM('owner','karyawan') NOT NULL DEFAULT 'karyawan',
  can_discount TINYINT(1) NOT NULL DEFAULT 0,
  can_correct TINYINT(1) NOT NULL DEFAULT 0,
  can_payment TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  last_login DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  outlet_id INT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  address VARCHAR(255) NULL,
  notes VARCHAR(255) NULL,
  is_member TINYINT(1) NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_customer_phone (outlet_id, phone),
  KEY idx_customer_name (name),
  CONSTRAINT fk_customers_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS services (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  outlet_id INT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NULL,
  category ENUM('kiloan','satuan','paket') NOT NULL DEFAULT 'kiloan',
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  price DECIMAL(14,2) NOT NULL,
  est_hours INT NOT NULL DEFAULT 48,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_services_outlet (outlet_id, is_active),
  CONSTRAINT fk_services_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  outlet_id INT UNSIGNED NOT NULL,
  invoice_no VARCHAR(30) NOT NULL UNIQUE,
  tracking_token VARCHAR(40) NOT NULL UNIQUE,
  customer_id INT UNSIGNED NOT NULL,
  received_by INT UNSIGNED NOT NULL,
  speed ENUM('reguler','express','kilat') NOT NULL DEFAULT 'reguler',
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
  speed_fee DECIMAL(14,2) NOT NULL DEFAULT 0,
  extra_fee DECIMAL(14,2) NOT NULL DEFAULT 0,
  discount DECIMAL(14,2) NOT NULL DEFAULT 0,
  total DECIMAL(14,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  payment_status ENUM('belum_lunas','dp','lunas') NOT NULL DEFAULT 'belum_lunas',
  status ENUM('diterima','menunggu_antrean','sedang_dicuci','pengeringan','penyetrikaan','pengemasan','siap_diambil','sudah_diambil','dibatalkan') NOT NULL DEFAULT 'diterima',
  est_done DATETIME NULL,
  notes VARCHAR(500) NULL,
  cancel_reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tx_period (outlet_id, created_at),
  KEY idx_tx_status (outlet_id, status),
  KEY idx_tx_customer (customer_id),
  CONSTRAINT fk_tx_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id),
  CONSTRAINT fk_tx_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_tx_user FOREIGN KEY (received_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transaction_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT UNSIGNED NOT NULL,
  service_id INT UNSIGNED NULL,
  service_name VARCHAR(120) NOT NULL,
  category ENUM('kiloan','satuan','paket') NOT NULL,
  unit VARCHAR(20) NOT NULL,
  qty DECIMAL(10,2) NOT NULL,
  price DECIMAL(14,2) NOT NULL,
  subtotal DECIMAL(14,2) NOT NULL,
  KEY idx_items_tx (transaction_id),
  CONSTRAINT fk_items_tx FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS status_histories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT UNSIGNED NOT NULL,
  from_status VARCHAR(30) NULL,
  to_status VARCHAR(30) NOT NULL,
  user_id INT UNSIGNED NULL,
  note VARCHAR(255) NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'staff',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_hist_tx (transaction_id),
  CONSTRAINT fk_hist_tx FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  outlet_id INT UNSIGNED NOT NULL,
  transaction_id INT UNSIGNED NOT NULL,
  kind ENUM('bayar','refund') NOT NULL DEFAULT 'bayar',
  amount DECIMAL(14,2) NOT NULL,
  method ENUM('tunai','transfer','qris') NOT NULL DEFAULT 'tunai',
  reference VARCHAR(80) NULL,
  user_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pay_period (outlet_id, created_at),
  KEY idx_pay_tx (transaction_id),
  CONSTRAINT fk_pay_tx FOREIGN KEY (transaction_id) REFERENCES transactions(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS expenses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  outlet_id INT UNSIGNED NOT NULL,
  spent_on DATE NOT NULL,
  category VARCHAR(40) NOT NULL,
  description VARCHAR(255) NULL,
  amount DECIMAL(14,2) NOT NULL,
  method ENUM('tunai','transfer','qris') NOT NULL DEFAULT 'tunai',
  user_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_exp_period (outlet_id, spent_on)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  outlet_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NULL,
  user_name VARCHAR(120) NULL,
  action VARCHAR(40) NOT NULL,
  entity VARCHAR(40) NULL,
  entity_id VARCHAR(40) NULL,
  summary VARCHAR(500) NULL,
  ip VARCHAR(60) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_log_outlet (outlet_id, created_at)
) ENGINE=InnoDB;
