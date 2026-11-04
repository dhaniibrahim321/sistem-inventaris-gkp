const router = require('express').Router();
const pool = require('../config/db');
const AppError = require('../utils/AppError');
const {
  asyncHandler,
  requireDate,
  requirePositiveInt,
  optionalString,
} = require('../utils/helpers');

// POST: Membuat kloter stok baru dan mencatat barang masuk.
router.post('/', asyncHandler(async (req, res) => {
  const idBarang = requirePositiveInt(req.body.id_barang, 'ID barang');
  const nomor = requirePositiveInt(req.body.nomor_kloter, 'Nomor kloter');
  const jumlah = requirePositiveInt(req.body.jumlah, 'Jumlah barang');
  const tanggalMasuk = requireDate(req.body.tanggal_masuk, 'Tanggal masuk');
  const tanggalKadaluarsa = requireDate(
    req.body.tanggal_kedaluwarsa,
    'Tanggal kedaluwarsa'
  );
  const lokasiRak = optionalString(req.body.lokasi_rak);
  const catatan = optionalString(req.body.catatan);

  if (tanggalKadaluarsa < tanggalMasuk) {
    throw new AppError('Tanggal kedaluwarsa tidak boleh lebih awal dari tanggal masuk.', 400);
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [barangRows] = await conn.query(
      'SELECT id_barang FROM barang WHERE id_barang = ? FOR UPDATE',
      [idBarang]
    );
    if (barangRows.length === 0) {
      throw new AppError('Barang tidak ditemukan.', 404);
    }

    const [users] = await conn.query(
      'SELECT id_user FROM users ORDER BY id_user ASC LIMIT 1'
    );
    if (users.length === 0) {
      throw new AppError('Belum ada pengguna di database. Buat akun admin terlebih dahulu.', 400);
    }

    const namaKloter = `Kloter ${nomor}`;
    const [kloterResult] = await conn.query(
      `INSERT INTO kloter_stok
        (id_barang, nama_kloter, tanggal_kedaluwarsa, stok_gudang, stok_display)
       VALUES (?, ?, ?, ?, 0)`,
      [idBarang, namaKloter, tanggalKadaluarsa, jumlah]
    );

    await conn.query(
      `INSERT INTO log_barang_masuk
        (id_kloter, jumlah, tanggal_masuk, lokasi_rak, catatan, id_user)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [kloterResult.insertId, jumlah, tanggalMasuk, lokasiRak, catatan, users[0].id_user]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'Barang masuk berhasil dicatat.',
      data: {
        id_kloter: kloterResult.insertId,
        nomor_kloter: nomor,
        jumlah,
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
