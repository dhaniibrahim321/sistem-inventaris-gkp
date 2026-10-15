// Helper Kategori Barang.
//
// Kategori TIDAK punya daftar bawaan. User mengetik sendiri nama kategori
// saat menambah / mengedit barang. Daftar kategori untuk saran pengetikan dan
// filter selalu diturunkan dari barang yang sudah ada.

export function getKategoriList(barang = []) {
  const unik = new Map()

  barang.forEach((item) => {
    const nama = String(item?.kategori ?? '').trim()
    if (nama && !unik.has(nama.toLowerCase())) {
      unik.set(nama.toLowerCase(), nama)
    }
  })

  return [...unik.values()].sort((a, b) => a.localeCompare(b, 'id'))
}

// Jika kategori yang diketik sama dengan kategori yang sudah ada (tanpa
// membedakan huruf besar/kecil), pakai penulisan yang sudah ada supaya
// "skincare" dan "Skincare" tidak terhitung dua kategori berbeda.
export function samakanKategori(input, barang = []) {
  const teks = String(input ?? '').trim()
  const cocok = getKategoriList(barang).find(
    (k) => k.toLowerCase() === teks.toLowerCase()
  )
  return cocok ?? teks
}
