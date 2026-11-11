const router = require('express').Router();
const pool = require('../config/db');
const AppError = require('../utils/AppError');

const {
  asyncHandler,
  requireString,
  optionalString
} = require('../utils/helpers');

// GET: Menampilkan semua barang
router.get('/', asyncHandler(async (req, res) => {
  const { q = '', kategori = '' } = req.query;

  const keyword = `%${String(q).trim()}%`;

  const [rows] = await pool.query(
    `SELECT
      b.id_barang,
      b.sku,
      b.nama_barang,
      b.kategori,
      b.foto_url,
      COALESCE(SUM(k.stok_gudang), 0) AS stok_gudang,
      COALESCE(SUM(k.stok_display), 0) AS stok_display,
      COALESCE(SUM(k.stok_gudang + k.stok_display), 0) AS total_stok
    FROM barang b
    LEFT JOIN kloter_stok k
      ON b.id_barang = k.id_barang
    WHERE (
      b.sku LIKE ?
      OR b.nama_barang LIKE ?
    )
    AND (? = '' OR b.kategori = ?)
    GROUP BY b.id_barang
    ORDER BY b.id_barang DESC`,
    [keyword, keyword, kategori, kategori]
  );

  // Ambil detail kloter agar frontend dapat menampilkan stok per kloter.
  const [kloterRows] = await pool.query(
    `SELECT
       k.id_kloter,
       k.id_barang,
       k.nama_kloter,
       CAST(SUBSTRING_INDEX(k.nama_kloter, ' ', -1) AS UNSIGNED) AS nomor,
       k.tanggal_kedaluwarsa,
       k.stok_gudang,
       k.stok_display,
       COALESCE(SUM(m.jumlah), k.stok_gudang + k.stok_display) AS jumlah_awal,
       MIN(m.tanggal_masuk) AS tanggal_masuk,
       MAX(m.lokasi_rak) AS lokasi_rak,
       MAX(m.catatan) AS catatan
     FROM kloter_stok k
     LEFT JOIN log_barang_masuk m ON m.id_kloter = k.id_kloter
     GROUP BY k.id_kloter
     ORDER BY k.id_barang, nomor ASC, k.id_kloter ASC`
  );

  const kloterByBarang = new Map();
  for (const k of kloterRows) {
    const list = kloterByBarang.get(Number(k.id_barang)) || [];
    list.push({
      id: Number(k.id_kloter),
      nomor: Number(k.nomor) || 0,
      jumlahAwal: Number(k.jumlah_awal || 0),
      stokGudang: Number(k.stok_gudang || 0),
      stokDisplay: Number(k.stok_display || 0),
      tanggalMasuk: k.tanggal_masuk,
      tanggalKadaluarsa: k.tanggal_kedaluwarsa,
      lokasiRak: k.lokasi_rak || '',
      catatan: k.catatan || '',
    });
    kloterByBarang.set(Number(k.id_barang), list);
  }

  res.json({
    success: true,
    data: rows.map((item) => ({
      ...item,
      kloter: kloterByBarang.get(Number(item.id_barang)) || [],
    })),
  });
}));

// GET: Detail barang berdasarkan ID
router.get('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('ID barang tidak valid.', 400);
  }

  const [rows] = await pool.query(
    `SELECT
      b.*,
      COALESCE(SUM(k.stok_gudang), 0) AS stok_gudang,
      COALESCE(SUM(k.stok_display), 0) AS stok_display,
      COALESCE(SUM(k.stok_gudang + k.stok_display), 0) AS total_stok
    FROM barang b
    LEFT JOIN kloter_stok k
      ON b.id_barang = k.id_barang
    WHERE b.id_barang = ?
    GROUP BY b.id_barang`,
    [id]
  );

  if (rows.length === 0) {
    throw new AppError('Barang tidak ditemukan.', 404);
  }

  res.json({
    success: true,
    data: rows[0]
  });
}));

// POST: Menambahkan barang
router.post('/', asyncHandler(async (req, res) => {
  const sku = requireString(req.body.sku, 'SKU');
  const nama = requireString(req.body.nama_barang, 'Nama barang');
  const kategori = requireString(req.body.kategori, 'Kategori');
  const foto = optionalString(req.body.foto_url);

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO barang
        (sku, nama_barang, kategori, foto_url)
       VALUES (?, ?, ?, ?)`,
      [sku, nama, kategori, foto]
    );

    await conn.query(
      `INSERT INTO log_aktivitas
        (jenis, sku, nama_barang, keterangan, oleh)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'barang',
        sku,
        nama,
        'Menambahkan data barang baru.',
        'Admin'
      ]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'Barang berhasil ditambahkan.',
      id_barang: result.insertId
    });

  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

// PUT: Mengubah data barang
router.put('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('ID barang tidak valid.', 400);
  }

  const sku = requireString(req.body.sku, 'SKU');
  const nama = requireString(req.body.nama_barang, 'Nama barang');
  const kategori = requireString(req.body.kategori, 'Kategori');
  const foto = optionalString(req.body.foto_url);

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [oldRows] = await conn.query(
      'SELECT * FROM barang WHERE id_barang = ? FOR UPDATE',
      [id]
    );

    if (oldRows.length === 0) {
      throw new AppError('Barang tidak ditemukan.', 404);
    }

    await conn.query(
      `UPDATE barang
       SET sku = ?,
           nama_barang = ?,
           kategori = ?,
           foto_url = ?
       WHERE id_barang = ?`,
      [sku, nama, kategori, foto, id]
    );

    await conn.query(
      `INSERT INTO log_aktivitas
        (jenis, sku, nama_barang, keterangan, oleh)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'barang',
        sku,
        nama,
        'Memperbarui data barang.',
        'Admin'
      ]
    );

    await conn.commit();

    res.json({
      success: true,
      message: 'Barang berhasil diperbarui.'
    });

  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

// DELETE: Menghapus barang
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('ID barang tidak valid.', 400);
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT * FROM barang WHERE id_barang = ? FOR UPDATE',
      [id]
    );

    if (rows.length === 0) {
      throw new AppError('Barang tidak ditemukan.', 404);
    }

    const barang = rows[0];

    await conn.query(
      `INSERT INTO log_aktivitas
        (jenis, sku, nama_barang, keterangan, oleh)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'barang',
        barang.sku,
        barang.nama_barang,
        'Menghapus data barang.',
        'Admin'
      ]
    );

    await conn.query(
      'DELETE FROM barang WHERE id_barang = ?',
      [id]
    );

    await conn.commit();

    res.json({
      success: true,
      message: 'Barang berhasil dihapus.'
    });

  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

module.exports = router;