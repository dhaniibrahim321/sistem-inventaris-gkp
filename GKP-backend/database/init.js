// Menjalankan schema.sql ke server MySQL. Pemakaian: npm run db:init
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
  await conn.end()
  console.log(`Database "${dbName}" siap dipakai.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
