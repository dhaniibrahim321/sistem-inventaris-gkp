// Helper Brand Barang.
//
// Daftar brand untuk saran pengetikan dan filter diturunkan langsung dari
// data barang yang sudah pernah diinput user.

export function getBrandList(barang = []) {
  const unik = new Map()

  barang.forEach((item) => {
    const nama = String(item?.brand ?? '').trim()
    if (nama && !unik.has(nama.toLowerCase())) {
      unik.set(nama.toLowerCase(), nama)
    }
  })

  return [...unik.values()].sort((a, b) => a.localeCompare(b, 'id'))
}

// Menyamakan penulisan brand secara case-insensitive dengan yang sudah ada
// supaya "wardah" dan "Wardah" tetap konsisten.
export function samakanBrand(input, barang = []) {
  const teks = String(input ?? '').trim()
  if (!teks) return ''
  const cocok = getBrandList(barang).find(
    (b) => b.toLowerCase() === teks.toLowerCase()
  )
  return cocok ?? teks
}
