import apiClient from './apiClient'

export async function simpanPergerakan(data) {
  const response = await apiClient.post('/pergerakan', data)
  return response.data
}

export async function getKloterByBarang(idBarang, params = {}) {
  const response = await apiClient.get(`/kloter/${idBarang}`, { params })
  return response.data
}

export async function getRiwayatPergerakan(params = {}) {
  const response = await apiClient.get('/pergerakan', { params })
  return response.data
}
