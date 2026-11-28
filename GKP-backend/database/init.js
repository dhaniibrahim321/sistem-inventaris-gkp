require('dotenv').config()
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  })
  let sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  const dbName = process.env.DB_NAME || 'sigkp'
  sql = sql.replace(/sigkp/g, dbName)
  await conn.query(sql)

  const [cols] = await conn.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status'`,
    [dbName]
  )
  if (cols.length === 0) {
    await conn.query(
      `ALTER TABLE \`${dbName}\`.users
       ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'aktif' AFTER role,
       ADD CONSTRAINT chk_users_status CHECK (status IN ('pending', 'aktif', 'ditolak', 'nonaktif'))`
    )
  }

  // Migrasi 1: Tambah kolom varian pada tabel barang jika belum ada
  const [colVarian] = await conn.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'barang' AND COLUMN_NAME = 'varian'`,
    [dbName]
  )
  if (colVarian.length === 0) {
    await conn.query(
      `ALTER TABLE \`${dbName}\`.barang
       ADD COLUMN varian VARCHAR(100) NULL AFTER nama_barang`
    )
  }

  // Migrasi 2: Tambah kolom brand pada tabel barang jika belum ada
  const [colBrand] = await conn.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'barang' AND COLUMN_NAME = 'brand'`,
    [dbName]
  )
  if (colBrand.length === 0) {
    await conn.query(
      `ALTER TABLE \`${dbName}\`.barang
       ADD COLUMN brand VARCHAR(100) NULL AFTER varian`
    )
  }

  // Migrasi 3: Tambah index idx_barang_brand jika belum ada
  const [idxBrand] = await conn.query(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'barang' AND INDEX_NAME = 'idx_barang_brand'`,
    [dbName]
  )
  if (idxBrand.length === 0) {
    await conn.query(
      `ALTER TABLE \`${dbName}\`.barang
       ADD INDEX idx_barang_brand (brand)`
    )
  }

  // Migrasi 4: Hapus kolom kategori dari tabel barang jika masih ada
  const [colKategori] = await conn.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'barang' AND COLUMN_NAME = 'kategori'`,
    [dbName]
  )
  if (colKategori.length > 0) {
    try {
      await conn.query(`ALTER TABLE \`${dbName}\`.barang DROP INDEX idx_barang_kategori`)
    } catch (e) {
      // Abaikan jika index tidak ada
    }
    await conn.query(`ALTER TABLE \`${dbName}\`.barang DROP COLUMN kategori`)
  }

  // Migrasi 5: Tambah kolom sku, nama_barang, varian, brand, catatan pada stok_opname jika belum ada
  const opnameCols = [
    { name: 'sku', sql: 'ADD COLUMN sku VARCHAR(50) NULL AFTER id_kloter' },
    { name: 'nama_barang', sql: 'ADD COLUMN nama_barang VARCHAR(150) NULL AFTER sku' },
    { name: 'varian', sql: 'ADD COLUMN varian VARCHAR(100) NULL AFTER nama_barang' },
    { name: 'brand', sql: 'ADD COLUMN brand VARCHAR(100) NULL AFTER varian' },
    { name: 'catatan', sql: 'ADD COLUMN catatan VARCHAR(500) NULL AFTER status' },
  ]
  for (const col of opnameCols) {
    const [exists] = await conn.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'stok_opname' AND COLUMN_NAME = ?`,
      [dbName, col.name]
    )
    if (exists.length === 0) {
      await conn.query(`ALTER TABLE \`${dbName}\`.stok_opname ${col.sql}`)
    }
  }

  // Isi ulang kolom produk di stok_opname untuk baris lama yang masih NULL
  await conn.query(
    `UPDATE \`${dbName}\`.stok_opname o
     JOIN \`${dbName}\`.kloter_stok k ON k.id_kloter = o.id_kloter
     JOIN \`${dbName}\`.barang b ON b.id_barang = k.id_barang
     SET o.sku = COALESCE(o.sku, b.sku),
         o.nama_barang = COALESCE(o.nama_barang, b.nama_barang),
         o.varian = COALESCE(o.varian, b.varian),
         o.brand = COALESCE(o.brand, b.brand)
     WHERE o.sku IS NULL OR o.nama_barang IS NULL`
  )

  // Migrasi 6: Jadikan letak_rak di log_pergerakan opsional (NULL)
  try {
    await conn.query(
      `ALTER TABLE \`${dbName}\`.log_pergerakan
       MODIFY COLUMN letak_rak VARCHAR(100) NULL`
    )
  } catch (e) {
    // Abaikan jika sudah NULL
  }

  // Migrasi 7: Hapus constraint unique id_kloter di log_barang_masuk jika ada
  try {
    await conn.query(
      `ALTER TABLE \`${dbName}\`.log_barang_masuk
       DROP INDEX uq_masuk_kloter`
    )
  } catch (e) {
    // Abaikan jika index sudah tidak ada
  }

  await conn.end()
  console.log(`Database "${dbName}" siap dipakai.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
