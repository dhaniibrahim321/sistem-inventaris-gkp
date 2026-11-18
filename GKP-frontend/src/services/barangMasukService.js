import apiClient from './apiClient'

export async function simpanBarangMasuk(data) {
  const response = await apiClient.post('/barang-masuk', data)
  return response.data
}

export async function getRiwayatBarangMasuk(params = {}) {
  const response = await apiClient.get('/barang-masuk', { params })
  return response.data
}
