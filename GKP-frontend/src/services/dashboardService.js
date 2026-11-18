import apiClient from './apiClient'

/**
 * Mengambil data ringkasan KPI dashboard (total SKU, total stok gudang/display, kritis, kedaluwarsa)
 * @param {Object} params - { batas_gudang, batas_display, hari_kedaluwarsa }
 */
export async function getRingkasan(params = {}) {
  const response = await apiClient.get('/dashboard/ringkasan', { params })
  return response.data?.data
}

/**
 * Mengambil data statistik perputaran barang harian (masuk vs ke display)
 * @param {Object} params - { start, end, sku }
 */
export async function getStatistik(params = {}) {
  const response = await apiClient.get('/dashboard/statistik', { params })
  return response.data?.data
}

/**
 * Mengambil daftar barang dengan stok kritis (gudang & display)
 * @param {Object} params - { batas_gudang, batas_display, limit }
 */
export async function getStokKritis(params = {}) {
  const response = await apiClient.get('/dashboard/stok-kritis', { params })
  return response.data?.data
}

/**
 * Mengambil kloter barang yang mendekati kedaluwarsa
 * @param {Object} params - { hari_kedaluwarsa, limit }
 */
export async function getKedaluwarsa(params = {}) {
  const response = await apiClient.get('/dashboard/kedaluwarsa', { params })
  return response.data?.data
}

/**
 * Mengambil aktivitas log inventaris terbaru
 * @param {number} limit
 */
export async function getAktivitas(limit = 50) {
  const response = await apiClient.get('/dashboard/aktivitas', {
    params: { limit },
  })
  return response.data?.data
}
