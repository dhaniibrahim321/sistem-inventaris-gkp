// Helper Date Formatter — dipakai bersama oleh seluruh halaman
// supaya format tanggal konsisten di seluruh aplikasi.

const NAMA_BULAN_SINGKAT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

const NAMA_BULAN_PANJANG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

// Format singkat: "19 Sep 2026". Dipakai di tabel & kartu ringkas.
export function formatTanggal(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getDate()} ${NAMA_BULAN_SINGKAT[d.getMonth()]} ${d.getFullYear()}`
}

// Format lengkap ala Indonesia: "Selasa, 8 September 2026". Dipakai di Header.
export function formatTanggalIndonesia(date = new Date()) {
  return `${NAMA_HARI[date.getDay()]}, ${date.getDate()} ${NAMA_BULAN_PANJANG[date.getMonth()]} ${date.getFullYear()}`
}

// Jumlah hari tersisa sampai sebuah tanggal (dipakai untuk cek kedaluwarsa).
// Mengembalikan null jika dateStr kosong.
export function sisaHari(dateStr, today = new Date()) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - today) / (1000 * 60 * 60 * 24))
}

// Tanggal hari ini dalam format "YYYY-MM-DD", dipakai sebagai default value
// input type="date" di form-form transaksi.
// Memakai tanggal lokal (bukan UTC) agar di WIB tidak mundur sehari sebelum jam 07.00.
export function todayISOString(date = new Date()) {
  const bulan = String(date.getMonth() + 1).padStart(2, '0')
  const hari = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${bulan}-${hari}`
}
