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

  await conn.end()
  console.log(`Database "${dbName}" siap dipakai.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
