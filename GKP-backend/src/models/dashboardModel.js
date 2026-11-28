const pool = require('../config/db')

// Total stok per barang (semua kloter dijumlahkan). Barang tanpa kloter = stok 0.
const STOK_PER_BARANG_SQL = `
  SELECT b.id_barang, b.sku, b.nama_barang, b.varian, b.brand, b.foto_url,
         COALESCE(SUM(k.stok_gudang), 0)  AS stok_gudang,
         COALESCE(SUM(k.stok_display), 0) AS stok_display
  FROM barang b
  LEFT JOIN kloter_stok k ON k.id_barang = b.id_barang AND k.is_deleted = 0
  WHERE b.is_deleted = 0
  GROUP BY b.id_barang, b.sku, b.nama_barang, b.varian, b.brand, b.foto_url
`

async function ringkasan({ batasGudang, batasDisplay, hariKedaluwarsa }) {
  const [[tot]] = await pool.query(`
    SELECT COUNT(*) AS total_barang,
           COALESCE(SUM(t.stok_gudang), 0)  AS total_stok_gudang,
           COALESCE(SUM(t.stok_display), 0) AS total_stok_display,
           COALESCE(SUM(t.stok_gudang  <= ?), 0) AS kritis_gudang,
           COALESCE(SUM(t.stok_display <= ?), 0) AS kritis_display
    FROM (
      SELECT b.id_barang,
             COALESCE(SUM(k.stok_gudang), 0)  AS stok_gudang,
             COALESCE(SUM(k.stok_display), 0) AS stok_display
      FROM barang b
      LEFT JOIN kloter_stok k ON k.id_barang = b.id_barang AND k.is_deleted = 0
      WHERE b.is_deleted = 0
      GROUP BY b.id_barang
    ) t`, [batasGudang, batasDisplay])

  const [[exp]] = await pool.query(
    `SELECT COUNT(*) AS jumlah
     FROM kloter_stok k
     JOIN barang b ON b.id_barang = k.id_barang
     WHERE k.is_deleted = 0 AND b.is_deleted = 0
       AND k.stok_gudang + k.stok_display > 0
       AND k.tanggal_kedaluwarsa <= DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
    [hariKedaluwarsa]
  )

  return {
    total_barang: Number(tot.total_barang),
    total_stok_gudang: Number(tot.total_stok_gudang),
    total_stok_display: Number(tot.total_stok_display),
    jumlah_kritis_gudang: Number(tot.kritis_gudang),
    jumlah_kritis_display: Number(tot.kritis_display),
    jumlah_kloter_kedaluwarsa: Number(exp.jumlah),
  }
}

async function stokKritis({ batasGudang, batasDisplay, limit }) {
  const [gudang] = await pool.query(
    `SELECT * FROM (${STOK_PER_BARANG_SQL}) t WHERE t.stok_gudang <= ?
     ORDER BY t.stok_gudang ASC, t.nama_barang ASC LIMIT ?`,
    [batasGudang, limit]
  )
  const [display] = await pool.query(
    `SELECT * FROM (${STOK_PER_BARANG_SQL}) t WHERE t.stok_display <= ?
     ORDER BY t.stok_display ASC, t.nama_barang ASC LIMIT ?`,
    [batasDisplay, limit]
  )
  const angka = (r) => ({ ...r, stok_gudang: Number(r.stok_gudang), stok_display: Number(r.stok_display) })
  return { gudang: gudang.map(angka), display: display.map(angka) }
}

async function kedaluwarsa({ hari, limit }) {
  const [rows] = await pool.query(
    `SELECT k.id_kloter, k.nama_kloter, k.tanggal_kedaluwarsa,
            k.stok_gudang, k.stok_display,
            DATEDIFF(k.tanggal_kedaluwarsa, CURDATE()) AS sisa_hari,
            b.id_barang, b.sku, b.nama_barang, b.varian, b.brand, b.foto_url
     FROM kloter_stok k
     JOIN barang b ON b.id_barang = k.id_barang
     WHERE k.is_deleted = 0 AND b.is_deleted = 0
       AND k.stok_gudang + k.stok_display > 0
       AND k.tanggal_kedaluwarsa <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
     ORDER BY k.tanggal_kedaluwarsa ASC, b.nama_barang ASC
     LIMIT ?`,
    [hari, limit]
  )
  return rows
}

// Statistik harian: barang masuk gudang vs pergerakan ke display.
// Dikembalikan dalam dua satuan sekaligus: pcs (jumlah barang) dan sku (jumlah jenis barang).
async function statistik({ start, end, sku }) {
  const skuFilter = sku ? 'AND b.sku = ?' : ''
  const params = sku ? [start, end, sku] : [start, end]

  const [masuk] = await pool.query(
    `SELECT m.tanggal_masuk AS tanggal, b.id_barang, SUM(m.jumlah) AS pcs
     FROM log_barang_masuk m
     JOIN kloter_stok k ON k.id_kloter = m.id_kloter
     JOIN barang b ON b.id_barang = k.id_barang
     WHERE m.tanggal_masuk BETWEEN ? AND ? ${skuFilter}
     GROUP BY m.tanggal_masuk, b.id_barang`,
    params
  )
  const [pindah] = await pool.query(
    `SELECT p.tanggal_pindah AS tanggal, b.id_barang, SUM(p.jumlah_pindah) AS pcs
     FROM log_pergerakan p
     JOIN kloter_stok k ON k.id_kloter = p.id_kloter
     JOIN barang b ON b.id_barang = k.id_barang
     WHERE p.tanggal_pindah BETWEEN ? AND ? ${skuFilter}
     GROUP BY p.tanggal_pindah, b.id_barang`,
    params
  )
  return { masuk, pindah }
}

// Aktivitas terbaru gabungan: kelola barang, barang masuk, pergerakan, opname, dan penyesuaian stok.
async function aktivitasTerbaru(limit) {
  const [rows] = await pool.query(
    `SELECT * FROM (
       SELECT CONCAT('aktivitas-', id_aktivitas) AS id,
              id_aktivitas AS sort_id,
              jenis,
              created_at,
              DATE_FORMAT(created_at, '%Y-%m-%d') AS tanggal_transaksi,
              NULL AS jumlah,
              keterangan,
              NULL AS nama_kloter,
              sku,
              nama_barang,
              oleh
       FROM log_aktivitas
       UNION ALL
       SELECT CONCAT('masuk-', m.id_masuk) AS id,
              m.id_masuk AS sort_id,
              'masuk' AS jenis,
              m.created_at,
              DATE_FORMAT(m.tanggal_masuk, '%Y-%m-%d') AS tanggal_transaksi,
              m.jumlah,
              CONCAT('Barang masuk ', m.jumlah, ' pcs ke gudang (', k.nama_kloter, ')',
                     IF(m.catatan IS NULL OR m.catatan = '', '', CONCAT('. ', m.catatan))) AS keterangan,
              k.nama_kloter,
              b.sku,
              CONCAT(b.nama_barang, IF(b.varian IS NULL OR b.varian = '', '', CONCAT(' (', b.varian, ')'))) AS nama_barang,
              u.nama AS oleh
       FROM log_barang_masuk m
       JOIN kloter_stok k ON k.id_kloter = m.id_kloter
       JOIN barang b ON b.id_barang = k.id_barang
       JOIN users u ON u.id_user = m.id_user
       UNION ALL
       SELECT CONCAT('pergerakan-', p.id_pergerakan) AS id,
              p.id_pergerakan AS sort_id,
              'pergerakan' AS jenis,
              p.created_at,
              DATE_FORMAT(p.tanggal_pindah, '%Y-%m-%d') AS tanggal_transaksi,
              p.jumlah_pindah AS jumlah,
              CONCAT('Pindah ', p.jumlah_pindah, ' pcs dari gudang ke display (', k.nama_kloter, ')',
                     IF(p.letak_rak IS NULL OR p.letak_rak = '', '', CONCAT(' (rak ', p.letak_rak, ')'))) AS keterangan,
              k.nama_kloter,
              b.sku,
              CONCAT(b.nama_barang, IF(b.varian IS NULL OR b.varian = '', '', CONCAT(' (', b.varian, ')'))) AS nama_barang,
              u.nama AS oleh
       FROM log_pergerakan p
       JOIN kloter_stok k ON k.id_kloter = p.id_kloter
       JOIN barang b ON b.id_barang = k.id_barang
       JOIN users u ON u.id_user = p.id_user
       UNION ALL
       SELECT CONCAT('opname-', o.id_opname) AS id,
              o.id_opname AS sort_id,
              'opname' AS jenis,
              o.created_at,
              DATE_FORMAT(o.tanggal_opname, '%Y-%m-%d') AS tanggal_transaksi,
              o.selisih AS jumlah,
              CONCAT(k.nama_kloter, ': stok display sistem ', o.stok_sistem_display, ' -> fisik ', o.stok_fisik_display,
                     '. Selisih ', IF(o.selisih > 0, '+', ''), o.selisih, ' (', o.status, ')',
                     IF(o.catatan IS NULL OR o.catatan = '', '', CONCAT('. ', o.catatan))) AS keterangan,
              k.nama_kloter,
              COALESCE(o.sku, b.sku) AS sku,
              CONCAT(COALESCE(o.nama_barang, b.nama_barang),
                     IF(COALESCE(o.varian, b.varian) IS NULL OR COALESCE(o.varian, b.varian) = '', '', CONCAT(' (', COALESCE(o.varian, b.varian), ')'))) AS nama_barang,
              u.nama AS oleh
       FROM stok_opname o
       JOIN kloter_stok k ON k.id_kloter = o.id_kloter
       JOIN barang b ON b.id_barang = k.id_barang
       JOIN users u ON u.id_user = o.id_user
       UNION ALL
       SELECT CONCAT('stok-', ls.id_log_stok) AS id,
              ls.id_log_stok AS sort_id,
              'stok' AS jenis,
              ls.created_at,
              DATE_FORMAT(ls.created_at, '%Y-%m-%d') AS tanggal_transaksi,
              NULL AS jumlah,
              IF(ls.jenis = 'pengurangan',
                 CONCAT('Stok display ', k.nama_kloter, ' dikurangi ', ls.stok_display_lama, ' -> ', ls.stok_display_baru,
                        IF(ls.catatan IS NULL OR ls.catatan = '', '', CONCAT('. ', ls.catatan))),
                 CONCAT('Koreksi / penyesuaian stok ', k.nama_kloter, ': gudang ', ls.stok_gudang_lama, ' -> ', ls.stok_gudang_baru,
                        ', display ', ls.stok_display_lama, ' -> ', ls.stok_display_baru,
                        IF(ls.catatan IS NULL OR ls.catatan = '', '', CONCAT('. ', ls.catatan)))) AS keterangan,
              k.nama_kloter,
              b.sku,
              CONCAT(b.nama_barang, IF(b.varian IS NULL OR b.varian = '', '', CONCAT(' (', b.varian, ')'))) AS nama_barang,
              u.nama AS oleh
       FROM log_stok ls
       JOIN kloter_stok k ON k.id_kloter = ls.id_kloter
       JOIN barang b ON b.id_barang = k.id_barang
       JOIN users u ON u.id_user = ls.id_user
     ) x
     ORDER BY x.created_at DESC, x.sort_id DESC
     LIMIT ?`,
    [limit]
  )
  return rows
}

module.exports = { ringkasan, stokKritis, kedaluwarsa, statistik, aktivitasTerbaru }
