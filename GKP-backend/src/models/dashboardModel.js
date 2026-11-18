const pool = require('../config/db')

// Total stok per barang (semua kloter dijumlahkan). Barang tanpa kloter = stok 0.
const STOK_PER_BARANG_SQL = `
  SELECT b.id_barang, b.sku, b.nama_barang, b.kategori, b.foto_url,
         COALESCE(SUM(k.stok_gudang), 0)  AS stok_gudang,
         COALESCE(SUM(k.stok_display), 0) AS stok_display
  FROM barang b
  LEFT JOIN kloter_stok k ON k.id_barang = b.id_barang
  GROUP BY b.id_barang, b.sku, b.nama_barang, b.kategori, b.foto_url
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
      FROM barang b LEFT JOIN kloter_stok k ON k.id_barang = b.id_barang
      GROUP BY b.id_barang
    ) t`, [batasGudang, batasDisplay])

  const [[exp]] = await pool.query(
    `SELECT COUNT(*) AS jumlah FROM kloter_stok
     WHERE stok_gudang + stok_display > 0
       AND tanggal_kedaluwarsa <= DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
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
            b.id_barang, b.sku, b.nama_barang, b.kategori, b.foto_url
     FROM kloter_stok k
     JOIN barang b ON b.id_barang = k.id_barang
     WHERE k.stok_gudang + k.stok_display > 0
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

// Aktivitas terbaru gabungan: barang masuk, pergerakan, opname, dan penyesuaian stok.
async function aktivitasTerbaru(limit) {
  const [rows] = await pool.query(
    `SELECT a.jenis, a.id, a.created_at, a.tanggal_transaksi, a.jumlah, a.keterangan,
            k.nama_kloter, b.sku, b.nama_barang, u.nama AS oleh
     FROM (
       SELECT 'masuk' AS jenis, id_masuk AS id, created_at, tanggal_masuk AS tanggal_transaksi,
              id_kloter, id_user, jumlah,
              CONCAT('Barang masuk ', jumlah, ' pcs ke gudang',
                     IF(lokasi_rak IS NULL, '', CONCAT(' (rak ', lokasi_rak, ')'))) AS keterangan
       FROM log_barang_masuk
       UNION ALL
       SELECT 'pergerakan', id_pergerakan, created_at, tanggal_pindah,
              id_kloter, id_user, jumlah_pindah,
              CONCAT('Pindah ', jumlah_pindah, ' pcs dari gudang ke display (rak ', letak_rak, ')')
       FROM log_pergerakan
       UNION ALL
       SELECT 'opname', id_opname, created_at, tanggal_opname,
              id_kloter, id_user, selisih,
              CONCAT('Stok display sistem ', stok_sistem_display, ' -> fisik ', stok_fisik_display,
                     '. Selisih ', IF(selisih > 0, '+', ''), selisih, ' (', status, ')')
       FROM stok_opname
       UNION ALL
       SELECT 'stok', id_log_stok, created_at, DATE(created_at),
              id_kloter, id_user, NULL,
              IF(jenis = 'pengurangan',
                 CONCAT('Stok display dikurangi ', stok_display_lama, ' -> ', stok_display_baru),
                 CONCAT('Stok disesuaikan manual: gudang ', stok_gudang_lama, ' -> ', stok_gudang_baru,
                        ', display ', stok_display_lama, ' -> ', stok_display_baru))
       FROM log_stok
     ) a
     JOIN kloter_stok k ON k.id_kloter = a.id_kloter
     JOIN barang b ON b.id_barang = k.id_barang
     JOIN users u ON u.id_user = a.id_user
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT ?`,
    [limit]
  )
  return rows
}

module.exports = { ringkasan, stokKritis, kedaluwarsa, statistik, aktivitasTerbaru }
