import apiClient, { clearAuthSession } from './apiClient'

export async function registerStaf(data) {
  const response = await apiClient.post('/auth/register', data)
  return response.data
}

export async function getDaftarStaf() {
  const response = await apiClient.get('/auth/users')
  return response.data?.data
}

export async function getPendingCount() {
  const response = await apiClient.get('/auth/users/pending-count')
  return Number(response.data?.data?.pending_count || 0)
}

export async function verifikasiStaf(idUser, action) {
  const response = await apiClient.patch(`/auth/users/${idUser}/verify`, { action })
  return response.data
}

export async function nonaktifkanStaf(idUser) {
  const response = await apiClient.patch(`/auth/users/${idUser}/deactivate`)
  return response.data
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export { clearAuthSession }

export function formatRoleLabel(role) {
  if (role === 'super_admin') return 'Super Admin'
  if (role === 'staf_gudang' || role === 'admin_gudang') return 'Staf Gudang'
  return role || 'Staf Gudang'
}
