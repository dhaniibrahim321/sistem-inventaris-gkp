// Helper Kloter — dipakai bersama oleh Stok Barang, Pergerakan Barang,
// Stok Opname, Barang Masuk, dan Dashboard.
//
// Model data satu kloter (disimpan di item.kloter[]):
//   {
//     id, nomor,
//     jumlahAwal,      // jumlah yang dimasukkan ke gudang saat pencatatan (TOTAL, tidak berubah)
//     stokGudang,      // sisa di gudang untuk kloter ini
//     stokDisplay,     // sisa di display untuk kloter ini
//     tanggalMasuk, tanggalKadaluarsa, lokasiRak, catatan,
//   }
//
// Aturan penting:
//  - Total kloter = jumlahAwal. Mengurangi stok hanya mengurangi stokDisplay,
//    jadi total tetap sama dengan jumlah yang dimasukkan awal.
//  - item.stokGudang / item.stokDisplay (level produk) selalu = jumlah dari
//    seluruh kloter, supaya halaman lain yang membaca field itu tetap benar.

export const SEMUA_KLOTER = 'all'

export function getKloterList(item) {
  if (!Array.isArray(item?.kloter)) return []
  return item.kloter.map(normalisasiKloter)
}

// Kloter lama (tanpa stokGudang/stokDisplay) dianggap seluruhnya masih di gudang.
export function normalisasiKloter(k) {
  const jumlahAwal = Number(k.jumlahAwal ?? k.jumlah ?? 0)
  return {
    ...k,
    jumlahAwal,
    jumlah: jumlahAwal,
    stokGudang: Number(k.stokGudang ?? jumlahAwal),
    stokDisplay: Number(k.stokDisplay ?? 0),
  }
}

export function hitungAgregat(kloterList) {
  return kloterList.reduce(
    (acc, k) => ({
      stokGudang: acc.stokGudang + k.stokGudang,
      stokDisplay: acc.stokDisplay + k.stokDisplay,
      total: acc.total + k.jumlahAwal,
    }),
    { stokGudang: 0, stokDisplay: 0, total: 0 }
  )
}

// Susun ulang item setelah daftar kloternya berubah: field level produk
// (stokGudang, stokDisplay) ikut dihitung ulang dari kloter.
export function buatItemDenganKloter(item, kloterList) {
  const agregat = hitungAgregat(kloterList)
  return {
    ...item,
    kloter: kloterList,
    stokGudang: agregat.stokGudang,
    stokDisplay: agregat.stokDisplay,
    stok_gudang: agregat.stokGudang,
    stok_display: agregat.stokDisplay,
  }
}

// Tanggal kedaluwarsa terdekat dari kloter yang masih punya stok.
export function kadaluarsaTerdekat(kloterList) {
  const tanggal = kloterList
    .filter((k) => k.stokGudang + k.stokDisplay > 0 && k.tanggalKadaluarsa)
    .map((k) => k.tanggalKadaluarsa)
    .sort()
  return tanggal[0] ?? ''
}

// Kloter yang dipakai otomatis saat user belum memilih: FIFO berdasarkan
// kedaluwarsa terdekat, hanya yang masih punya stok.
export function kloterDefault(kloterList) {
  const aktif = kloterList.filter((k) => k.stokGudang + k.stokDisplay > 0)
  const sumber = aktif.length > 0 ? aktif : kloterList
  return (
    [...sumber].sort((a, b) =>
      String(a.tanggalKadaluarsa || '9999').localeCompare(
        String(b.tanggalKadaluarsa || '9999')
      )
    )[0] ?? null
  )
}

export function cariKloter(item, kloterKey) {
  if (!kloterKey || kloterKey === SEMUA_KLOTER) return null
  return getKloterList(item).find((k) => String(k.id) === String(kloterKey)) ?? null
}

// Angka stok yang ditampilkan untuk sebuah produk pada pilihan kloter tertentu.
// kloterKey = SEMUA_KLOTER -> jumlah seluruh kloter.
export function getStokView(item, kloterKey = SEMUA_KLOTER) {
  const list = getKloterList(item)

  if (kloterKey === SEMUA_KLOTER) {
    const agregat = hitungAgregat(list)
    return {
      kloter: null,
      gudang: agregat.stokGudang,
      display: agregat.stokDisplay,
      total: agregat.total,
      kadaluarsa: kadaluarsaTerdekat(list),
    }
  }

  const kloter = list.find((k) => String(k.id) === String(kloterKey))
  if (!kloter) {
    return { kloter: null, gudang: 0, display: 0, total: 0, kadaluarsa: '' }
  }

  return {
    kloter,
    gudang: kloter.stokGudang,
    display: kloter.stokDisplay,
    total: kloter.jumlahAwal,
    kadaluarsa: kloter.tanggalKadaluarsa || '',
  }
}

export function labelKloter(k) {
  return `Kloter ${k.nomor}`
}

// Nomor kloter berikutnya = nomor tertinggi + 1 (bukan jumlah kloter + 1),
// supaya tidak terjadi nomor ganda setelah ada kloter yang dihapus.
export function nomorKloterBerikutnya(item) {
  return (
    getKloterList(item).reduce(
      (max, k) => Math.max(max, Number(k.nomor) || 0),
      0
    ) + 1
  )
}
