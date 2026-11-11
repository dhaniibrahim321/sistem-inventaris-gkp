USE sigkp;

CREATE TABLE IF NOT EXISTS log_aktivitas (
    id_aktivitas INT AUTO_INCREMENT PRIMARY KEY,
    jenis VARCHAR(30) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    nama_barang VARCHAR(150) NOT NULL,
    keterangan TEXT NOT NULL,
    oleh VARCHAR(100) NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_aktivitas_tanggal (created_at),
    INDEX idx_aktivitas_sku (sku),
    INDEX idx_aktivitas_jenis (jenis)
) ENGINE=InnoDB;