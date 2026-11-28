const pool = require('../config/db');

async function getAll() {
  const [rows] = await pool.query(`
    SELECT id, tanggal, waktu, jenis, sku, nama, jumlah, keterangan, oleh, tanggalTransaksi, dibuatPada
    FROM (
      SELECT
        CONCAT('aktivitas-', id_aktivitas) AS id,
        DATE_FORMAT(created_at, '%Y-%m-%d') AS tanggal,
        DATE_FORMAT(created_at, '%H:%i') AS waktu,
        jenis,
        sku,
        nama_barang AS nama,
        NULL AS jumlah,
        keterangan,
        oleh,
        DATE_FORMAT(created_at, '%Y-%m-%d') AS tanggalTransaksi,
        UNIX_TIMESTAMP(created_at) * 1000 AS dibuatPada,
        created_at AS sort_at
      FROM log_aktivitas
      UNION ALL
      SELECT
        CONCAT('masuk-', m.id_masuk) AS id,
        DATE_FORMAT(m.created_at, '%Y-%m-%d') AS tanggal,
        DATE_FORMAT(m.created_at, '%H:%i') AS waktu,
        'masuk' AS jenis,
        b.sku,
        CONCAT(b.nama_barang, IF(b.varian IS NULL OR b.varian = '', '', CONCAT(' (', b.varian, ')'))) AS nama,
        m.jumlah AS jumlah,
        CONCAT(
          'Barang masuk +', m.jumlah, ' pcs (', k.nama_kloter, '). ',
          'Tanggal masuk: ', DATE_FORMAT(m.tanggal_masuk, '%Y-%m-%d'), '. ',
          'Tanggal kedaluwarsa: ', DATE_FORMAT(k.tanggal_kedaluwarsa, '%Y-%m-%d'), '.',
          IF(m.catatan IS NULL OR m.catatan = '', '', CONCAT(' Catatan: ', m.catatan))
        ) AS keterangan,
        u.nama AS oleh,
        DATE_FORMAT(m.tanggal_masuk, '%Y-%m-%d') AS tanggalTransaksi,
        UNIX_TIMESTAMP(m.created_at) * 1000 AS dibuatPada,
        m.created_at AS sort_at
      FROM log_barang_masuk m
      JOIN kloter_stok k ON k.id_kloter = m.id_kloter
      JOIN barang b ON b.id_barang = k.id_barang
      JOIN users u ON u.id_user = m.id_user
      UNION ALL
      SELECT
        CONCAT('pergerakan-', p.id_pergerakan) AS id,
        DATE_FORMAT(p.created_at, '%Y-%m-%d') AS tanggal,
        DATE_FORMAT(p.created_at, '%H:%i') AS waktu,
        'pergerakan' AS jenis,
        b.sku,
        CONCAT(b.nama_barang, IF(b.varian IS NULL OR b.varian = '', '', CONCAT(' (', b.varian, ')'))) AS nama,
        p.jumlah_pindah AS jumlah,
        CONCAT(
          'Dipindahkan +', p.jumlah_pindah, ' pcs dari Gudang ke Display (', k.nama_kloter, '). ',
          IF(p.letak_rak IS NULL OR p.letak_rak = '', '', CONCAT('Rak display: ', p.letak_rak, '. ')),
          'Tanggal pengisian: ', DATE_FORMAT(p.tanggal_pindah, '%Y-%m-%d'), '.',
          IF(p.catatan IS NULL OR p.catatan = '', '', CONCAT(' Catatan: ', p.catatan))
        ) AS keterangan,
        u.nama AS oleh,
        DATE_FORMAT(p.tanggal_pindah, '%Y-%m-%d') AS tanggalTransaksi,
        UNIX_TIMESTAMP(p.created_at) * 1000 AS dibuatPada,
        p.created_at AS sort_at
      FROM log_pergerakan p
      JOIN kloter_stok k ON k.id_kloter = p.id_kloter
      JOIN barang b ON b.id_barang = k.id_barang
      JOIN users u ON u.id_user = p.id_user
      UNION ALL
      SELECT
        CONCAT('opname-', o.id_opname) AS id,
        DATE_FORMAT(o.created_at, '%Y-%m-%d') AS tanggal,
        DATE_FORMAT(o.created_at, '%H:%i') AS waktu,
        'opname' AS jenis,
        COALESCE(o.sku, b.sku) AS sku,
        CONCAT(
          COALESCE(o.nama_barang, b.nama_barang),
          IF(COALESCE(o.varian, b.varian) IS NULL OR COALESCE(o.varian, b.varian) = '', '', CONCAT(' (', COALESCE(o.varian, b.varian), ')'))
        ) AS nama,
        o.selisih AS jumlah,
        CONCAT(
          k.nama_kloter, ': stok display sistem ', o.stok_sistem_display, ' -> stok fisik ', o.stok_fisik_display,
          '. Selisih opname: ', IF(o.selisih > 0, '+', ''), o.selisih, ' pcs (', o.status, '). ',
          'Tanggal opname: ', DATE_FORMAT(o.tanggal_opname, '%Y-%m-%d'), '.',
          IF(o.catatan IS NULL OR o.catatan = '', '', CONCAT(' Keterangan: ', o.catatan))
        ) AS keterangan,
        u.nama AS oleh,
        DATE_FORMAT(o.tanggal_opname, '%Y-%m-%d') AS tanggalTransaksi,
        UNIX_TIMESTAMP(o.created_at) * 1000 AS dibuatPada,
        o.created_at AS sort_at
      FROM stok_opname o
      JOIN kloter_stok k ON k.id_kloter = o.id_kloter
      JOIN barang b ON b.id_barang = k.id_barang
      JOIN users u ON u.id_user = o.id_user
      UNION ALL
      SELECT
        CONCAT('stok-', ls.id_log_stok) AS id,
        DATE_FORMAT(ls.created_at, '%Y-%m-%d') AS tanggal,
        DATE_FORMAT(ls.created_at, '%H:%i') AS waktu,
        'stok' AS jenis,
        b.sku,
        CONCAT(b.nama_barang, IF(b.varian IS NULL OR b.varian = '', '', CONCAT(' (', b.varian, ')'))) AS nama,
        NULL AS jumlah,
        IF(
          ls.jenis = 'pengurangan',
          CONCAT(
            'Stok ', k.nama_kloter, ' dikurangi. Display ', ls.stok_display_lama, ' -> ', ls.stok_display_baru, ' pcs.',
            IF(ls.catatan IS NULL OR ls.catatan = '', '', CONCAT(' Catatan: ', ls.catatan))
          ),
          CONCAT(
            'Koreksi / penyesuaian stok ', k.nama_kloter,
            ': Gudang ', ls.stok_gudang_lama, ' -> ', ls.stok_gudang_baru,
            ', Display ', ls.stok_display_lama, ' -> ', ls.stok_display_baru, '.',
            IF(ls.catatan IS NULL OR ls.catatan = '', '', CONCAT(' Catatan: ', ls.catatan))
          )
        ) AS keterangan,
        u.nama AS oleh,
        DATE_FORMAT(ls.created_at, '%Y-%m-%d') AS tanggalTransaksi,
        UNIX_TIMESTAMP(ls.created_at) * 1000 AS dibuatPada,
        ls.created_at AS sort_at
      FROM log_stok ls
      JOIN kloter_stok k ON k.id_kloter = ls.id_kloter
      JOIN barang b ON b.id_barang = k.id_barang
      JOIN users u ON u.id_user = ls.id_user
    ) riwayat_gabungan
    ORDER BY sort_at DESC, dibuatPada DESC
  `);

  return rows;
}

module.exports = { getAll };
