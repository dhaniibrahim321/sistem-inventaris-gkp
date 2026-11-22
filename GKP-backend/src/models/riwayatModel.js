
const pool = require('../config/db');

async function getAll() {
  const [rows] = await pool.query(`
    SELECT
      id_aktivitas AS id,
      DATE_FORMAT(created_at, '%Y-%m-%d') AS tanggal,
      DATE_FORMAT(created_at, '%H:%i') AS waktu,
      jenis,
      sku,
      nama_barang AS nama,
      keterangan,
      oleh,
      DATE_FORMAT(created_at, '%Y-%m-%d') AS tanggalTransaksi,
      UNIX_TIMESTAMP(created_at) * 1000 AS dibuatPada
    FROM log_aktivitas
    ORDER BY created_at DESC
  `);

  return rows;
}

module.exports = { getAll };
