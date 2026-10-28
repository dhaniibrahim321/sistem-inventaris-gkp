CREATE DATABASE IF NOT EXISTS sigkp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sigkp;

CREATE TABLE IF NOT EXISTS users (
  id_user INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'admin_gudang',
  nama VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

-- Master data: hanya identitas barang, tanpa stok.
CREATE TABLE IF NOT EXISTS barang (
  id_barang INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(50) NOT NULL UNIQUE,
  nama_barang VARCHAR(150) NOT NULL,
  kategori VARCHAR(100) NOT NULL,
  foto_url MEDIUMTEXT NULL, -- URL atau data-URL base64 (frontend mengirim gambar <= 2 MB)
  INDEX idx_barang_nama (nama_barang)
) ENGINE=InnoDB;

-- Entitas pusat penyimpanan stok (per kloter/batch).
CREATE TABLE IF NOT EXISTS kloter_stok (
  id_kloter INT AUTO_INCREMENT PRIMARY KEY,
  id_barang INT NOT NULL,
  nama_kloter VARCHAR(50) NOT NULL,
  tanggal_kedaluwarsa DATE NOT NULL,
  stok_gudang INT NOT NULL DEFAULT 0,
  stok_display INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_kloter_barang FOREIGN KEY (id_barang) REFERENCES barang(id_barang)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT uq_kloter_nama UNIQUE (id_barang, nama_kloter),
  CONSTRAINT chk_stok_gudang CHECK (stok_gudang >= 0),
  CONSTRAINT chk_stok_display CHECK (stok_display >= 0),
  INDEX idx_kloter_exp (tanggal_kedaluwarsa)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS log_barang_masuk (
  id_masuk INT AUTO_INCREMENT PRIMARY KEY,
  id_kloter INT NOT NULL,
  jumlah INT NOT NULL,
  tanggal_masuk DATE NOT NULL,
  lokasi_rak VARCHAR(100) NULL,
  catatan TEXT NULL,
  id_user INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_kloter) REFERENCES kloter_stok(id_kloter) ON DELETE RESTRICT,
  FOREIGN KEY (id_user) REFERENCES users(id_user) ON DELETE RESTRICT,
  INDEX idx_masuk_tgl (tanggal_masuk)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS log_pergerakan (
  id_pergerakan INT AUTO_INCREMENT PRIMARY KEY,
  id_kloter INT NOT NULL,
  jumlah_pindah INT NOT NULL,
  tanggal_pindah DATE NOT NULL,
  letak_rak VARCHAR(100) NOT NULL,
  catatan TEXT NULL,
  id_user INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_kloter) REFERENCES kloter_stok(id_kloter) ON DELETE RESTRICT,
  FOREIGN KEY (id_user) REFERENCES users(id_user) ON DELETE RESTRICT,
  INDEX idx_pindah_tgl (tanggal_pindah)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stok_opname (
  id_opname INT AUTO_INCREMENT PRIMARY KEY,
  id_kloter INT NOT NULL,
  tanggal_opname DATE NOT NULL,
  stok_sistem_display INT NOT NULL,
  stok_fisik_display INT NOT NULL,
  selisih INT NOT NULL,
  status ENUM('sesuai','kurang','lebih') NOT NULL,
  id_user INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_kloter) REFERENCES kloter_stok(id_kloter) ON DELETE RESTRICT,
  FOREIGN KEY (id_user) REFERENCES users(id_user) ON DELETE RESTRICT,
  INDEX idx_opname_tgl (tanggal_opname)
) ENGINE=InnoDB;
