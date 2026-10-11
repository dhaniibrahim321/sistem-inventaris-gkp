// Daftar jenis aktivitas (opsi dropdown filter Riwayat). Ini adalah data
// referensi statis, bukan data transaksi/mock dummy — log aktivitas SELALU
// dimulai kosong (lihat App.jsx: useState([])), sesuai ketentuan
// "No Dummy Data & No Persistence" pada dokumen revisi.

export const jenisAktivitasList = [
  { value: 'masuk', label: 'Barang Masuk' },
  { value: 'pergerakan', label: 'Pergerakan Barang' },
  { value: 'opname', label: 'Stock Opname' },
]
