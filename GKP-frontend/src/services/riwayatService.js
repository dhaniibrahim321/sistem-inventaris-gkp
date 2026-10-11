// Service layer untuk Riwayat Aktivitas (audit trail).
//
// Sama seperti barangService, fungsi di sini adalah PURE FUNCTION (stateless).
// State sesungguhnya dipegang oleh React useState di App.jsx.

export function buatEntriRiwayat({ jenis, sku, nama, keterangan, oleh = 'Admin' }) {
  const now = new Date()
  return {
    id: Date.now(),
    tanggal: now.toISOString().slice(0, 10),
    waktu: now.toTimeString().slice(0, 5),
    jenis,
    sku,
    nama,
    keterangan,
    oleh,
  }
}

export function tambahRiwayat(list, entry) {
  return [entry, ...list]
}

export function sortRiwayatTerbaru(list) {
  return [...list].sort((a, b) => (a.tanggal + a.waktu < b.tanggal + b.waktu ? 1 : -1))
}
