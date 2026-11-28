import apiClient from './apiClient'

/**
 * Mengambil daftar stok barang beserta kloter per barang
 * @param {Object} params - { search, brand, status, batas, limit, page }
 */
export async function getDaftarStok(params = {}) {
  const response = await apiClient.get('/stok', { params })
  return response.data
}

/**
 * Mengambil detail stok satu barang beserta seluruh kloternya
 * @param {number|string} idBarang
 * @param {Object} params - { batas }
 */
export async function getDetailStokBarang(idBarang, params = {}) {
  const response = await apiClient.get(`/stok/barang/${idBarang}`, { params })
  return response.data?.data
}

/**
 * Menyesuaikan stok gudang dan display pada suatu kloter secara manual
 * @param {number|string} idKloter
 * @param {Object} data - { stok_gudang, stok_display, catatan }
 */
export async function sesuaikanStokKloter(idKloter, data) {
  const response = await apiClient.put(`/stok/kloter/${idKloter}`, data)
  return response.data
}

/**
 * Mengurangi stok display pada suatu kloter (misal: terjual, rusak, susut)
 * @param {number|string} idKloter
 * @param {Object} data - { jumlah, catatan }
 */
export async function kurangiStokDisplay(idKloter, data) {
  const response = await apiClient.post(
    `/stok/kloter/${idKloter}/kurangi-display`,
    typeof data === 'number' ? { jumlah: data } : data
  )
  return response.data
}
