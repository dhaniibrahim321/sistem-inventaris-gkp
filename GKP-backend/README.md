# Backend SIGKP — Setup & Konfigurasi Dasar

Repositori ini memuat pondasi dasar arsitektur backend untuk Sistem Informasi Inventaris Gudang Kosmetik Purwokerto (SIGKP) menggunakan Node.js, Express, dan MySQL.

---

## Langkah Menjalankan Backend (Untuk Seluruh Anggota Tim):

1. **Masuk ke folder backend:**
   ```bash
   cd GKP-backend
   ```
2. **Install dependensi:**
   ```bash
   npm install
   ```
3. **Konfigurasi Environment:**
   Salin `.env.example` menjadi `.env`:
   ```bash
   copy .env.example .env
   ```
   Buka file `.env` dan sesuaikan username & password MySQL lokal kamu (XAMPP / Laragon / MySQL Workbench).

4. **Inisialisasi Database:**
   Jalankan script pembuatan database dan tabel otomatis:
   ```bash
   npm run db:init
   ```
5. **Buat Akun Admin Awal:**
   ```bash
   npm run db:seed-admin
   ```
   *(Default username: `admin`, password: `admin123`)*

6. **Jalankan Server:**
   ```bash
   npm run dev
   ```
   Server akan berjalan di `http://localhost:5000/api`.

---

## Aturan Pengerjaan Fitur:
* Setiap anggota tim **WAJIB membuat branch fitur masing-masing** dari `master` (misal: `feat/data-barang`, `feat/stok-opname`, `feat/dashboard`, dll).
* **DILARANG** melakukan push langsung ke branch `master`.
* Buat Pull Request (PR) ke `master` jika fitur sudah selesai dan diuji.
