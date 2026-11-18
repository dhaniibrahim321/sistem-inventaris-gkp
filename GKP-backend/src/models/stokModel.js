const pool = require('../config/db')
const AppError = require('../utils/AppError')
const { withTransaction } = require('../utils/helpers')

// jumlah_awal = total yang pernah dicatat masuk untuk kloter tsb (log_barang_masuk).
// Fallback ke stok saat ini jika kloter belum punya log masuk.
const KLOTER_SELECT = `
  SELECT k.id_kloter, k.id_barang, k.nama_kloter, k.tanggal_kedaluwarsa,
         k.stok_gudang, k.stok_display,
         COALESCE(m.total_masuk, k.stok_gudang + k.stok_display) AS jumlah_awal,
         DATEDIFF(k.tanggal_kedaluwarsa, CURDATE()) AS sisa_hari
  FROM kloter_stok k
  LEFT JOIN (
    SELECT id_kloter, SUM(jumlah) AS total_masuk FROM log_barang_masuk GROUP BY id_kloter
  ) m ON m.id_kloter = k.id_kloter
`

function hitungStatus(total, batas) {
  if (total === 0) return 'Habis'
  if (total <= batas) return 'Menipis'
  return 'Tersedia'
}

function olahKloter(k) {
  return {
    id_kloter: k.id_kloter,
    nama_kloter: k.nama_kloter,
    tanggal_kedaluwarsa: k.tanggal_kedaluwarsa,
    sisa_hari: k.sisa_hari,
    jumlah_awal: Number(k.jumlah_awal),
    stok_gudang: k.stok_gudang,
    stok_display: k.stok_display,
  }
}

async function ambilKloterUntukBarang(idBarangList) {
  if (idBarangList.length === 0) return new Map()
  const [rows] = await pool.query(
    `${KLOTER_SELECT} WHERE k.id_barang IN (?) ORDER BY k.tanggal_kedaluwarsa ASC, k.id_kloter ASC`,
    [idBarangList]
  )
  const peta = new Map()
  rows.forEach((k) => {
    if (!peta.has(k.id_barang)) peta.set(k.id_barang, [])
    peta.get(k.id_barang).push(olahKloter(k))
  })
  return peta
}

// Daftar stok per barang (+ daftar kloter di tiap barang).
async function daftar({ search, kategori, status, batas, limit, offset, likeSearch }) {
  const where = []
  const params = []
  if (search) {
    where.push('(b.sku LIKE ? OR b.nama_barang LIKE ? OR b.kategori LIKE ?)')
    params.push(likeSearch, likeSearch, likeSearch)
  }
  if (kategori) {
    where.push('b.kategori = ?')
    params.push(kategori)
  }

  const having = []
  const havingParams = []
  if (status === 'habis') having.push('total = 0')
  if (status === 'menipis') { having.push('total > 0 AND total <= ?'); havingParams.push(batas) }
  if (status === 'tersedia') { having.push('total > ?'); havingParams.push(batas) }

  const base = `
    SELECT b.id_barang, b.sku, b.nama_barang, b.kategori,
           COALESCE(SUM(k.stok_gudang), 0)  AS stok_gudang,
           COALESCE(SUM(k.stok_display), 0) AS stok_display,
           COALESCE(SUM(k.stok_gudang + k.stok_display), 0) AS total,
           COUNT(k.id_kloter) AS jumlah_kloter,
           MIN(CASE WHEN k.stok_gudang + k.stok_display > 0 THEN k.tanggal_kedaluwarsa END) AS kedaluwarsa_terdekat
    FROM barang b
    LEFT JOIN kloter_stok k ON k.id_barang = b.id_barang
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    GROUP BY b.id_barang, b.sku, b.nama_barang, b.kategori
    ${having.length ? 'HAVING ' + having.join(' AND ') : ''}
  `
  const allParams = [...params, ...havingParams]

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM (${base}) x`, allParams)
  const [rows] = await pool.query(`${base} ORDER BY b.nama_barang ASC LIMIT ? OFFSET ?`, [
    ...allParams, limit, offset,
  ])

  const kloterMap = await ambilKloterUntukBarang(rows.map((r) => r.id_barang))
  const data = rows.map((r) => ({
    id_barang: r.id_barang,
    sku: r.sku,
    nama_barang: r.nama_barang,
    kategori: r.kategori,
    stok_gudang: Number(r.stok_gudang),
    stok_display: Number(r.stok_display),
    total: Number(r.total),
    jumlah_kloter: Number(r.jumlah_kloter),
    kedaluwarsa_terdekat: r.kedaluwarsa_terdekat,
    status: hitungStatus(Number(r.total), batas),
    kloter: kloterMap.get(r.id_barang) || [],
  }))
  return { data, total: Number(total) }
}

async function detailBarang(idBarang, batas) {
  const [[b]] = await pool.query(
    'SELECT id_barang, sku, nama_barang, kategori, foto_url FROM barang WHERE id_barang = ?',
    [idBarang]
  )
  if (!b) throw new AppError('Barang tidak ditemukan.', 404)
  const kloter = (await ambilKloterUntukBarang([idBarang])).get(idBarang) || []
  const stokGudang = kloter.reduce((s, k) => s + k.stok_gudang, 0)
  const stokDisplay = kloter.reduce((s, k) => s + k.stok_display, 0)
  return {
    ...b,
    stok_gudang: stokGudang,
    stok_display: stokDisplay,
    total: stokGudang + stokDisplay,
    status: hitungStatus(stokGudang + stokDisplay, batas),
    kloter,
  }
}

// Kunci baris kloter (FOR UPDATE) di dalam transaksi supaya update stok aman dari race condition.
async function kunciKloter(conn, idKloter) {
  const [rows] = await conn.query(
    `${KLOTER_SELECT} WHERE k.id_kloter = ? FOR UPDATE`,
    [idKloter]
  )
  if (rows.length === 0) throw new AppError('Kloter tidak ditemukan.', 404)
  return rows[0]
}

async function simpanLog(conn, { idKloter, jenis, lama, baru, catatan, idUser }) {
  await conn.query(
    `INSERT INTO log_stok
       (id_kloter, jenis, stok_gudang_lama, stok_display_lama, stok_gudang_baru, stok_display_baru, catatan, id_user)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [idKloter, jenis, lama.stok_gudang, lama.stok_display, baru.stok_gudang, baru.stok_display, catatan, idUser]
  )
}

// Penyesuaian manual stok gudang & display satu kloter.
async function sesuaikan(idKloter, { stokGudang, stokDisplay, catatan, idUser }) {
  return withTransaction(async (conn) => {
    const k = await kunciKloter(conn, idKloter)
    const jumlahAwal = Number(k.jumlah_awal)
    if (stokGudang + stokDisplay > jumlahAwal) {
      throw new AppError(
        `Gudang + display (${stokGudang + stokDisplay}) tidak boleh melebihi jumlah masuk awal kloter ${k.nama_kloter} (${jumlahAwal}).`,
        400
      )
    }
    await conn.query('UPDATE kloter_stok SET stok_gudang = ?, stok_display = ? WHERE id_kloter = ?', [
      stokGudang, stokDisplay, idKloter,
    ])
    if (stokGudang !== k.stok_gudang || stokDisplay !== k.stok_display) {
      await simpanLog(conn, {
        idKloter, jenis: 'penyesuaian', catatan, idUser,
        lama: k, baru: { stok_gudang: stokGudang, stok_display: stokDisplay },
      })
    }
    return { ...olahKloter(k), stok_gudang: stokGudang, stok_display: stokDisplay }
  })
}

// Kurangi stok display (barang laku / rusak / keluar dari display). Gudang tidak berubah.
async function kurangiDisplay(idKloter, { jumlah, catatan, idUser }) {
  return withTransaction(async (conn) => {
    const k = await kunciKloter(conn, idKloter)
    if (jumlah > k.stok_display) {
      throw new AppError(
        `Jumlah melebihi stok display kloter ${k.nama_kloter} (${k.stok_display}).`,
        400
      )
    }
    const displayBaru = k.stok_display - jumlah
    await conn.query('UPDATE kloter_stok SET stok_display = ? WHERE id_kloter = ?', [displayBaru, idKloter])
    await simpanLog(conn, {
      idKloter, jenis: 'pengurangan', catatan, idUser,
      lama: k, baru: { stok_gudang: k.stok_gudang, stok_display: displayBaru },
    })
    return { ...olahKloter(k), stok_display: displayBaru }
  })
}

module.exports = { daftar, detailBarang, sesuaikan, kurangiDisplay }
