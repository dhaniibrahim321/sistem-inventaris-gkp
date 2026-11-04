const router = require('express').Router();
const pool = require('../config/db');
const AppError = require('../utils/AppError');
const {
  asyncHandler,
  requireDate,
  requirePositiveInt,
  optionalString,
} = require('../utils/helpers');

// POST: Memindahkan stok dari gudang ke display berdasarkan kloter.
router.post('/', asyncHandler(async (req, res) => {
  const idKloter = requirePositiveInt(req.body.id_kloter, 'ID kloter');
  const jumlah = requirePositiveInt(req.body.jumlah, 'Jumlah pemindahan');
  const tanggal = requireDate(req.body.tanggal, 'Tanggal pemindahan');
  const letakRak = optionalString(req.body.letak_rak);

  if (!letakRak) {
    throw new AppError('Letak rak display wajib diisi.', 400);
  }

  const catatan = optionalString(req.body.catatan);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [kloterRows] = await conn.query(
      `SELECT
         k.id_kloter,
         k.nama_kloter,
         k.stok_gudang,
         k.stok_display,
         b.sku,
         b.nama_barang
       FROM kloter_stok k
       JOIN barang b ON b.id_barang = k.id_barang
       WHERE k.id_kloter = ?
       FOR UPDATE`,
      [idKloter]
    );

    if (kloterRows.length === 0) {
      throw new AppError('Kloter tidak ditemukan.', 404);
    }

    const kloter = kloterRows[0];
    const stokGudangSebelum = Number(kloter.stok_gudang);

    if (jumlah > stokGudangSebelum) {
      throw new AppError(
        `Stok gudang tidak mencukupi. Stok tersedia ${stokGudangSebelum} barang.`,
        400
      );
    }

    // Tabel users menjadi sumber id_user untuk pencatatan aktivitas.
    const [users] = await conn.query(
      'SELECT id_user FROM users ORDER BY id_user ASC LIMIT 1'
    );

    if (users.length === 0) {
      throw new AppError(
        'Belum ada pengguna di database. Buat akun admin terlebih dahulu.',
        400
      );
    }

    await conn.query(
      `UPDATE kloter_stok
       SET stok_gudang = stok_gudang - ?,
           stok_display = stok_display + ?
       WHERE id_kloter = ?`,
      [jumlah, jumlah, idKloter]
    );

    await conn.query(
      `INSERT INTO log_pergerakan
        (id_kloter, jumlah_pindah, tanggal_pindah, letak_rak, catatan, id_user)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idKloter, jumlah, tanggal, letakRak, catatan, users[0].id_user]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'Stok berhasil dipindahkan dari gudang ke display.',
      data: {
        id_kloter: idKloter,
        sku: kloter.sku,
        nama_barang: kloter.nama_barang,
        nama_kloter: kloter.nama_kloter,
        jumlah,
        stok_gudang: stokGudangSebelum - jumlah,
        stok_display: Number(kloter.stok_display) + jumlah,
      },
    });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

module.exports = router;
