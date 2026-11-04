const router = require('express').Router();
const pool = require('../config/db');
const { asyncHandler } = require('../utils/helpers');

// GET: Menampilkan seluruh riwayat aktivitas
router.get('/', asyncHandler(async (req, res) => {
  const {
    dari = '',
    sampai = '',
    jenis = '',
    q = ''
  } = req.query;

  const keyword = `%${String(q).trim()}%`;

  const [rows] = await pool.query(
    `SELECT *
     FROM (
       -- Riwayat kelola data barang
       SELECT
         CONCAT('barang-', id_aktivitas) AS id,
         created_at AS tanggal,
         jenis,
         sku,
         nama_barang,
         keterangan,
         oleh
       FROM log_aktivitas

       UNION ALL

       -- Riwayat barang masuk
       SELECT
         CONCAT('masuk-', m.id_masuk) AS id,
         m.created_at AS tanggal,
         'masuk' AS jenis,
         b.sku,
         b.nama_barang,
         CONCAT(
           'Barang masuk sebanyak ',
           m.jumlah,
           ' unit. ',
           COALESCE(m.catatan, '')
         ) AS keterangan,
         COALESCE(u.nama, 'Admin') AS oleh
       FROM log_barang_masuk m
       JOIN kloter_stok k
         ON m.id_kloter = k.id_kloter
       JOIN barang b
         ON k.id_barang = b.id_barang
       JOIN users u
         ON m.id_user = u.id_user

       UNION ALL

       -- Riwayat pergerakan barang
       SELECT
         CONCAT('pindah-', p.id_pergerakan) AS id,
         p.created_at AS tanggal,
         'pergerakan' AS jenis,
         b.sku,
         b.nama_barang,
         CONCAT(
           'Pergerakan ',
           p.jumlah_pindah,
           ' unit ke rak ',
           p.letak_rak,
           '. ',
           COALESCE(p.catatan, '')
         ) AS keterangan,
         COALESCE(u.nama, 'Admin') AS oleh
       FROM log_pergerakan p
       JOIN kloter_stok k
         ON p.id_kloter = k.id_kloter
       JOIN barang b
         ON k.id_barang = b.id_barang
       JOIN users u
         ON p.id_user = u.id_user

       UNION ALL

       -- Riwayat stok opname
       SELECT
         CONCAT('opname-', o.id_opname) AS id,
         o.created_at AS tanggal,
         'opname' AS jenis,
         b.sku,
         b.nama_barang,
         CONCAT(
           'Stok sistem: ',
           o.stok_sistem_display,
           ', stok fisik: ',
           o.stok_fisik_display,
           ', selisih: ',
           o.selisih,
           ', status: ',
           o.status
         ) AS keterangan,
         COALESCE(u.nama, 'Admin') AS oleh
       FROM stok_opname o
       JOIN kloter_stok k
         ON o.id_kloter = k.id_kloter
       JOIN barang b
         ON k.id_barang = b.id_barang
       JOIN users u
         ON o.id_user = u.id_user

     ) AS aktivitas

     WHERE
       (? = '' OR DATE(tanggal) >= ?)
       AND (? = '' OR DATE(tanggal) <= ?)
       AND (? = '' OR jenis = ?)
       AND (
         ? = '%%'
         OR sku LIKE ?
         OR nama_barang LIKE ?
       )

     ORDER BY tanggal DESC
     LIMIT 1000`,
    [
      dari, dari,
      sampai, sampai,
      jenis, jenis,
      keyword, keyword, keyword
    ]
  );

  res.json({
    success: true,
    total: rows.length,
    data: rows
  });
}));

module.exports = router;

// Fitur ini mengambil riwayat dari:
// - Aktivitas CRUD barang.
// - Barang masuk.
// - Pergerakan barang.
// - Stok opname.