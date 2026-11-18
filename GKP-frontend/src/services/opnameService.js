import apiClient from './apiClient'

/**
 * Mengambil daftar barang & kloter untuk pengisian formulir Stock Opname
 * @param {string} search
 */
export async function getOpnameFormData(search = '') {
  const response = await apiClient.get('/opname/form', {
    params: search ? { search } : {},
  })
  return response.data?.data
}

/**
 * Menyimpan batch hasil stock opname fisik
 * @param {Object} payload - { tanggal_opname: 'YYYY-MM-DD', items: [{ id_kloter, stok_fisik }] }
 */
export async function simpanOpname(payload) {
  const response = await apiClient.post('/opname', payload)
  return response.data
}

/**
 * Mengambil riwayat data opname dengan filter tanggal / status / search
 * @param {Object} params
 */
export async function getDaftarOpname(params = {}) {
  const response = await apiClient.get('/opname', { params })
  return response.data
}

/**
 * Mengambil rekap laporan opname pada tanggal tertentu
 * @param {string} tanggal - YYYY-MM-DD
 */
export async function getLaporanOpname(tanggal) {
  const response = await apiClient.get('/opname/laporan', {
    params: { tanggal },
  })
  return response.data?.data
}

/**
 * Mengambil detail satu data opname berdasarkan ID
 * @param {number|string} id
 */
export async function getDetailOpname(id) {
  const response = await apiClient.get(`/opname/${id}`)
  return response.data?.data
}
