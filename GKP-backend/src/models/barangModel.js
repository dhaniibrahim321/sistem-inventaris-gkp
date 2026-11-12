
const pool = require('../config/db');

async function getAll(q = '', kategori = '') {
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
    LEFT JOIN kloter_stok k ON b.id_barang = k.id_barang
    WHERE b.is_deleted = 0
      AND (b.sku LIKE ? OR b.nama_barang LIKE ?)
      AND (? = '' OR b.kategori = ?)
    GROUP BY b.id_barang
    ORDER BY b.id_barang DESC`,
    [keyword, keyword, kategori, kategori]
  );

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
      catatan: k.catatan || ''
    });

    kloterByBarang.set(Number(k.id_barang), list);
  }

  return rows.map(item => ({
    ...item,
    kloter: kloterByBarang.get(Number(item.id_barang)) || []
  }));
}

async function getById(id) {
  const [rows] = await pool.query(
    `SELECT
      b.*,
      COALESCE(SUM(k.stok_gudang), 0) AS stok_gudang,
      COALESCE(SUM(k.stok_display), 0) AS stok_display,
      COALESCE(SUM(k.stok_gudang + k.stok_display), 0) AS total_stok
    FROM barang b
    LEFT JOIN kloter_stok k ON b.id_barang = k.id_barang
    WHERE b.id_barang = ? AND b.is_deleted = 0
    GROUP BY b.id_barang`,
    [id]
  );

  return rows[0] || null;
}

async function create(data) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO barang (sku, nama_barang, kategori, foto_url)
       VALUES (?, ?, ?, ?)`,
      [data.sku, data.nama, data.kategori, data.foto]
    );

    await conn.query(
      `INSERT INTO log_aktivitas
       (jenis, sku, nama_barang, keterangan, oleh)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'barang',
        data.sku,
        data.nama,
        'Menambahkan data barang baru.',
        data.oleh
      ]
    );

    await conn.commit();
    return result.insertId;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function update(id, data) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT * FROM barang WHERE id_barang = ? AND is_deleted = 0 FOR UPDATE',
      [id]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return false;
    }

    await conn.query(
      `UPDATE barang
       SET sku = ?, nama_barang = ?, kategori = ?, foto_url = ?
       WHERE id_barang = ?`,
      [data.sku, data.nama, data.kategori, data.foto, id]
    );

    await conn.query(
      `INSERT INTO log_aktivitas
       (jenis, sku, nama_barang, keterangan, oleh)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'barang',
        data.sku,
        data.nama,
        'Memperbarui data barang.',
        data.oleh
      ]
    );

    await conn.commit();
    return true;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function softDelete(id, oleh) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT * FROM barang WHERE id_barang = ? AND is_deleted = 0 FOR UPDATE',
      [id]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return false;
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
        oleh
      ]
    );

    await conn.query(
      'UPDATE barang SET is_deleted = 1 WHERE id_barang = ?',
      [id]
    );

    await conn.commit();
    return true;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  softDelete
};
