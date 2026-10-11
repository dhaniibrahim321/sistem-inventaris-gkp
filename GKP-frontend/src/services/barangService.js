// Service layer untuk Master Data Barang.
//
// Seluruh fungsi di sini adalah PURE FUNCTION (stateless): menerima array
// terkini + parameter, lalu mengembalikan array baru — tanpa menyimpan
// state apa pun di dalam modul ini sendiri. Satu-satunya pemegang state
// yang sesungguhnya adalah React useState di App.jsx (Pure React State,
// sesuai dokumen revisi). Pola ini juga membuat fungsi-fungsi ini mudah
// diganti dengan pemanggilan Axios ke API sungguhan pada tahap berikutnya.

export function createBarang(data, existingList) {
  const nextId = existingList.reduce((max, item) => Math.max(max, item.id), 0) + 1
  return {
    id: nextId,
    stokGudang: 0,
    stokDisplay: 0,
    kadaluarsa: '',
    ...data,
  }
}

export function updateBarang(list, id, data) {
  return list.map((item) => (item.id === id ? { ...item, ...data } : item))
}

export function deleteBarang(list, id) {
  return list.filter((item) => item.id !== id)
}

// Menambah stok gudang, dipakai oleh halaman Barang Masuk.
export function tambahStokGudang(list, id, jumlah) {
  return list.map((item) =>
    item.id === id ? { ...item, stokGudang: item.stokGudang + jumlah } : item
  )
}

// Memindahkan stok dari gudang ke display, dipakai oleh halaman Pergerakan Barang.
export function transferGudangKeDisplay(list, id, jumlah) {
  return list.map((item) =>
    item.id === id
      ? {
          ...item,
          stokGudang: item.stokGudang - jumlah,
          stokDisplay: item.stokDisplay + jumlah,
        }
      : item
  )
}

// Menyesuaikan stok gudang sesuai hasil hitung fisik, dipakai oleh Stock Opname.
export function setStokGudangHasilOpname(list, id, stokFisik) {
  return list.map((item) => (item.id === id ? { ...item, stokGudang: stokFisik } : item))
}
