
import {
  getKloterList,
  buatItemDenganKloter,
  kadaluarsaTerdekat,
} from '../utils/kloterHelpers'

export function createBarang(data, existingList) {
  const nextId =
    existingList.reduce(
      (max, item) => Math.max(max, item.id),
      0
    ) + 1

  return {
    id: nextId,
    stokGudang: 0,
    stokDisplay: 0,
    kadaluarsa: '',
    kloter: [],
    ...data,
  }
}

export function updateBarang(list, id, data) {
  return list.map((item) =>
    item.id === id
      ? { ...item, ...data }
      : item
  )
}

export function deleteBarang(list, id) {
  return list.filter(
    (item) => item.id !== id
  )
}

export function tambahStokGudang(
  list,
  id,
  jumlah
) {
  return list.map((item) =>
    item.id === id
      ? {
          ...item,
          stokGudang:
            Number(item.stokGudang ?? 0) +
            Number(jumlah ?? 0),
        }
      : item
  )
}

export function transferGudangKeDisplay(
  list,
  id,
  jumlah
) {
  return list.map((item) =>
    item.id === id
      ? {
          ...item,
          stokGudang:
            Number(item.stokGudang ?? 0) -
            Number(jumlah ?? 0),
          stokDisplay:
            Number(item.stokDisplay ?? 0) +
            Number(jumlah ?? 0),
        }
      : item
  )
}

export function setStokGudangHasilOpname(
  list,
  id,
  stokFisik
) {
  return list.map((item) =>
    item.id === id
      ? {
          ...item,
          stokGudang: Number(stokFisik ?? 0),
        }
      : item
  )
}

function ubahKloter(list, id, kloterId, fn) {
  return list.map((item) => {
    if (item.id !== id) return item
    const kloterBaru = getKloterList(item).map((k) =>
      String(k.id) === String(kloterId) ? fn(k) : k
    )
    return buatItemDenganKloter(item, kloterBaru)
  })
}

export function tambahKloterBarang(list, id, kloterBaru) {
  return list.map((item) => {
    if (item.id !== id) return item
    const kloterLama = getKloterList(item)
    return {
      ...buatItemDenganKloter(item, [...kloterLama, kloterBaru]),
      kadaluarsa: kloterBaru.tanggalKadaluarsa,
    }
  })
}

export function transferKloterGudangKeDisplay(list, id, kloterId, jumlah) {
  const n = Number(jumlah ?? 0)
  return ubahKloter(list, id, kloterId, (k) => ({
    ...k,
    stokGudang: k.stokGudang - n,
    stokDisplay: k.stokDisplay + n,
  }))
}

export function setStokKloter(list, id, kloterId, { stokGudang, stokDisplay }) {
  return ubahKloter(list, id, kloterId, (k) => ({
    ...k,
    stokGudang: Number(stokGudang),
    stokDisplay: Number(stokDisplay),
  }))
}

export function kurangiStokDisplayKloter(list, id, kloterId, jumlah) {
  const n = Number(jumlah ?? 0)
  return ubahKloter(list, id, kloterId, (k) => ({
    ...k,
    stokDisplay: k.stokDisplay - n,
  }))
}

export function setStokDisplayHasilOpname(list, id, kloterId, stokFisik) {
  return ubahKloter(list, id, kloterId, (k) => ({
    ...k,
    stokDisplay: Number(stokFisik ?? 0),
  }))
}

export function hapusKloterBarang(list, id, kloterId) {
  return list.map((item) => {
    if (item.id !== id) return item
    const sisa = getKloterList(item).filter(
      (k) => String(k.id) !== String(kloterId)
    )
    return {
      ...buatItemDenganKloter(item, sisa),
      kadaluarsa: kadaluarsaTerdekat(sisa),
    }
  })
}
