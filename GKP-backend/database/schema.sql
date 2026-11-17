-- =====================================================================
-- SIGKP - Skema Database (MySQL 8 / MariaDB 10.4+ / XAMPP)
-- ---------------------------------------------------------------------
-- Catatan desain:
--  * Semua PK/FK & kolom kuantitas memakai INT UNSIGNED: stok tidak mungkin
--    negatif dan pengurangan di bawah 0 otomatis ditolak oleh database.
--  * Soft delete: tabel referensi (users, barang, kloter_stok) memakai kolom
--    is_deleted. Data TIDAK PERNAH dihapus fisik karena dirujuk tabel log.
--  * Tabel log bersifat append-only (FK ON DELETE RESTRICT).
--  * Timestamp memakai DATETIME (bebas masalah tahun 2038 pada TIMESTAMP).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS sigkp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sigkp;

-- ---------------------------------------------------------------------
-- users: akun dibuatkan oleh pengelola (tanpa registrasi publik)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id_user     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL,
  password    VARCHAR(255) NOT NULL,             -- hash bcrypt
  role        VARCHAR(30)  NOT NULL DEFAULT 'admin_gudang',
  nama        VARCHAR(100) NOT NULL,
  is_deleted  TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_username UNIQUE (username),
  CONSTRAINT chk_users_deleted CHECK (is_deleted IN (0, 1))
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- barang: master data (identitas barang saja, tanpa stok)
-- SKU tetap UNIQUE walau barang di-soft-delete agar riwayat tidak ambigu.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS barang (
  id_barang    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku          VARCHAR(50)  NOT NULL,
  nama_barang  VARCHAR(150) NOT NULL,
  kategori     VARCHAR(100) NOT NULL,
  foto_url     MEDIUMTEXT   NULL,                 -- URL atau data-URL base64 (<= 2 MB dari frontend)
  is_deleted   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_barang_sku UNIQUE (sku),
  CONSTRAINT chk_barang_deleted CHECK (is_deleted IN (0, 1)),
  INDEX idx_barang_aktif_nama (is_deleted, nama_barang),
  INDEX idx_barang_kategori (kategori)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- kloter_stok: entitas pusat penyimpanan stok (per batch / kedaluwarsa)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kloter_stok (
  id_kloter            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_barang            INT UNSIGNED NOT NULL,
  nama_kloter          VARCHAR(50)  NOT NULL,
  tanggal_kedaluwarsa  DATE         NOT NULL,
  stok_gudang          INT UNSIGNED NOT NULL DEFAULT 0,
  stok_display         INT UNSIGNED NOT NULL DEFAULT 0,
  is_deleted           TINYINT(1)   NOT NULL DEFAULT 0,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_kloter_barang FOREIGN KEY (id_barang) REFERENCES barang(id_barang)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  -- Nama kloter unik per barang (termasuk yang sudah soft-delete) agar
  -- penomoran "Kloter N" tidak pernah bentrok dengan riwayat lama.
  CONSTRAINT uq_kloter_nama UNIQUE (id_barang, nama_kloter),
  CONSTRAINT chk_kloter_deleted CHECK (is_deleted IN (0, 1)),
  -- Dropdown kloter per barang (FIFO): WHERE id_barang=? AND is_deleted=0 ORDER BY tanggal_kedaluwarsa
  INDEX idx_kloter_barang_aktif_exp (id_barang, is_deleted, tanggal_kedaluwarsa),
  -- Dashboard "mendekati kedaluwarsa": WHERE is_deleted=0 AND tanggal_kedaluwarsa <= ?
  INDEX idx_kloter_aktif_exp (is_deleted, tanggal_kedaluwarsa)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- log_barang_masuk: setiap pencatatan masuk membuat tepat SATU kloter baru
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS log_barang_masuk (
  id_masuk       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_kloter      INT UNSIGNED  NOT NULL,
  jumlah         INT UNSIGNED  NOT NULL,
  tanggal_masuk  DATE          NOT NULL,
  lokasi_rak     VARCHAR(100)  NULL,
  catatan        VARCHAR(1000) NULL,
  id_user        INT UNSIGNED  NOT NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_masuk_kloter FOREIGN KEY (id_kloter) REFERENCES kloter_stok(id_kloter) ON DELETE RESTRICT,
  CONSTRAINT fk_masuk_user   FOREIGN KEY (id_user)   REFERENCES users(id_user)         ON DELETE RESTRICT,
  CONSTRAINT uq_masuk_kloter UNIQUE (id_kloter),
  CONSTRAINT chk_masuk_jumlah CHECK (jumlah > 0),
  -- Riwayat terbaru + pagination: ORDER BY tanggal_masuk DESC, id_masuk DESC
  INDEX idx_masuk_tgl (tanggal_masuk, id_masuk),
  INDEX idx_masuk_user (id_user)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- log_pergerakan: perpindahan stok Gudang -> Display dalam satu kloter
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS log_pergerakan (
  id_pergerakan   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_kloter       INT UNSIGNED  NOT NULL,
  jumlah_pindah   INT UNSIGNED  NOT NULL,
  tanggal_pindah  DATE          NOT NULL,
  letak_rak       VARCHAR(100)  NOT NULL,
  catatan         VARCHAR(1000) NULL,
  id_user         INT UNSIGNED  NOT NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pindah_kloter FOREIGN KEY (id_kloter) REFERENCES kloter_stok(id_kloter) ON DELETE RESTRICT,
  CONSTRAINT fk_pindah_user   FOREIGN KEY (id_user)   REFERENCES users(id_user)         ON DELETE RESTRICT,
  CONSTRAINT chk_pindah_jumlah CHECK (jumlah_pindah > 0),
  INDEX idx_pindah_tgl (tanggal_pindah, id_pergerakan),
  INDEX idx_pindah_kloter_tgl (id_kloter, tanggal_pindah),
  INDEX idx_pindah_user (id_user)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- stok_opname (modul anggota tim lain) - tipe FK disesuaikan ke UNSIGNED
-- agar kompatibel dengan PK kloter_stok & users.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stok_opname (
  id_opname            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_kloter            INT UNSIGNED NOT NULL,
  tanggal_opname       DATE         NOT NULL,
  stok_sistem_display  INT UNSIGNED NOT NULL,
  stok_fisik_display   INT UNSIGNED NOT NULL,
  selisih              INT          NOT NULL,
  status               ENUM('sesuai','kurang','lebih') NOT NULL,
  id_user              INT UNSIGNED NOT NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_opname_kloter FOREIGN KEY (id_kloter) REFERENCES kloter_stok(id_kloter) ON DELETE RESTRICT,
  CONSTRAINT fk_opname_user   FOREIGN KEY (id_user)   REFERENCES users(id_user)         ON DELETE RESTRICT,
  INDEX idx_opname_tgl (tanggal_opname, id_opname),
  INDEX idx_opname_user (id_user)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- [Nawaf] log_stok: penyesuaian manual & pengurangan stok display (halaman Stok Barang)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS log_stok (
  id_log_stok        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_kloter          INT UNSIGNED NOT NULL,
  jenis              ENUM('penyesuaian','pengurangan') NOT NULL,
  stok_gudang_lama   INT UNSIGNED NOT NULL,
  stok_display_lama  INT UNSIGNED NOT NULL,
  stok_gudang_baru   INT UNSIGNED NOT NULL,
  stok_display_baru  INT UNSIGNED NOT NULL,
  catatan            TEXT         NULL,
  id_user            INT UNSIGNED NOT NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_stok_kloter FOREIGN KEY (id_kloter) REFERENCES kloter_stok(id_kloter) ON DELETE RESTRICT,
  CONSTRAINT fk_log_stok_user   FOREIGN KEY (id_user)   REFERENCES users(id_user)         ON DELETE RESTRICT,
  INDEX idx_log_stok_created (created_at)
) ENGINE=InnoDB;
