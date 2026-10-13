function pad(n) {
  return String(n).padStart(2, '0')
}

export function buatEntriRiwayat({
  jenis,
  sku,
  nama,
  keterangan,
  oleh = 'Admin',
  tanggalTransaksi,
  jumlah,
  kloter,
}) {
  const now = new Date()
  const tanggal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const waktu = `${pad(now.getHours())}:${pad(now.getMinutes())}`

  return {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    tanggal,
    waktu,
    jenis,
    sku: sku ?? '-',
    nama: nama ?? '-',
    keterangan: keterangan ?? '',
    oleh,
    tanggalTransaksi: tanggalTransaksi || tanggal,
    jumlah: jumlah ?? null,
    kloter: kloter ?? null,
    dibuatPada: now.getTime(),
  }
}

export function tambahRiwayat(list, entry) {
  return [entry, ...list]
}

export function sortRiwayatTerbaru(list) {
  return [...list].sort((a, b) => {
    const waktuA = `${a.tanggal ?? ''} ${a.waktu ?? ''}`
    const waktuB = `${b.tanggal ?? ''} ${b.waktu ?? ''}`

    if (waktuA !== waktuB) return waktuA < waktuB ? 1 : -1
    return (b.dibuatPada ?? 0) - (a.dibuatPada ?? 0)
  })
}
