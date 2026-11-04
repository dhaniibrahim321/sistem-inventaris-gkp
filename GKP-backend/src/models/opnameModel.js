const pool = require('../config/db')
const AppError = require('../utils/AppError')
const { withTransaction } = require('../utils/helpers')

function tentukanStatus(selisih) {
  if (selisih === 0) return 'sesuai'
  return selisih < 0 ? 'kurang' : 'lebih'
}

function ringkasan(rows) {
  const r = { total: rows.length, sesuai: 0, kurang: 0, lebih: 0 }
  rows.forEach((x) => { r[x.status] += 1 })
  return r
}

const OPNAME_SELECT = `
  SELECT o.id_opname, o.tanggal_opname, o.id_kloter, k.nama_kloter,
         b.id_barang, b.sku, b.nama_barang, b.kategori,
         o.stok_sistem_display, o.stok_fisik_display, o.selisih, o.status,
         u.nama AS oleh, o.created_at
  FROM stok_opname o
  JOIN kloter_stok k ON k.id_kloter = o.id_kloter
  JOIN barang b ON b.id_barang = k.id_barang
  JOIN users u ON u.id_user = o.id_user
`

// Simpan hasil opname beberapa kloter sekaligus dalam SATU transaksi (atomik):
// stok sistem diambil dari DB (bukan dari client), selisih dihitung server,
// lalu stok display kloter disesuaikan ke stok fisik.
async function simpan({ tanggal, items, idUser }) {
  return withTransaction(async (conn) => {
    const ids = items.map((i) => i.id_kloter).sort((a, b) => a - b) // urut tetap -> hindari deadlock
    const [kloter] = await conn.query(
      'SELECT id_kloter, stok_display FROM kloter_stok WHERE id_kloter IN (?) ORDER BY id_kloter FOR UPDATE',
      [ids]
    )
    const peta = new Map(kloter.map((k) => [k.id_kloter, k]))
    const hilang = ids.filter((id) => !peta.has(id))
    if (hilang.length > 0) {
      throw new AppError(`Kloter tidak ditemukan: ${hilang.join(', ')}.`, 404)
    }

    const idOpname = []
    for (const item of items) {
      const sistem = peta.get(item.id_kloter).stok_display
      const selisih = item.stok_fisik - sistem
      const [res] = await conn.query(
        `INSERT INTO stok_opname
           (id_kloter, tanggal_opname, stok_sistem_display, stok_fisik_display, selisih, status, id_user)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [item.id_kloter, tanggal, sistem, item.stok_fisik, selisih, tentukanStatus(selisih), idUser]
      )
      idOpname.push(res.insertId)
      await conn.query('UPDATE kloter_stok SET stok_display = ? WHERE id_kloter = ?', [
        item.stok_fisik, item.id_kloter,
      ])
    }

    const [hasil] = await conn.query(`${OPNAME_SELECT} WHERE o.id_opname IN (?) ORDER BY b.nama_barang, k.nama_kloter`, [idOpname])
    return { items: hasil, ringkasan: ringkasan(hasil) }
  })
}

async function daftar({ mulai, akhir, status, search, likeSearch, limit, offset }) {
  const where = []
  const params = []
  if (mulai) { where.push('o.tanggal_opname >= ?'); params.push(mulai) }
  if (akhir) { where.push('o.tanggal_opname <= ?'); params.push(akhir) }
  if (status) { where.push('o.status = ?'); params.push(status) }
  if (search) {
    where.push('(b.sku LIKE ? OR b.nama_barang LIKE ?)')
    params.push(likeSearch, likeSearch)
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM stok_opname o
     JOIN kloter_stok k ON k.id_kloter = o.id_kloter
     JOIN barang b ON b.id_barang = k.id_barang ${w}`,
    params
  )
  const [rows] = await pool.query(
    `${OPNAME_SELECT} ${w} ORDER BY o.tanggal_opname DESC, o.id_opname DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )
  return { data: rows, total: Number(total) }
}

async function detail(idOpname) {
  const [rows] = await pool.query(`${OPNAME_SELECT} WHERE o.id_opname = ?`, [idOpname])
  if (rows.length === 0) throw new AppError('Data opname tidak ditemukan.', 404)
  return rows[0]
}

// Laporan opname satu tanggal: daftar barang, stok sistem, stok fisik, selisih (SRS 3.2 no. 7).
async function laporan(tanggal) {
  const [rows] = await pool.query(
    `${OPNAME_SELECT} WHERE o.tanggal_opname = ? ORDER BY b.nama_barang, k.nama_kloter`,
    [tanggal]
  )
  return { tanggal, items: rows, ringkasan: ringkasan(rows) }
}

module.exports = { simpan, daftar, detail, laporan }
