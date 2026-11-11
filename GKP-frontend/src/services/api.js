const API_URL = 'http://localhost:5000/api';

// Mengambil data barang
export async function getBarang() {
  const response = await fetch(`${API_URL}/barang`);
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Gagal mengambil data barang.');
  }

  return result.data.map((item) => ({
    id: Number(item.id_barang),
    sku: item.sku,
    nama: item.nama_barang,
    kategori: item.kategori,
    gambar: item.foto_url || '',
    stokGudang: Number(item.stok_gudang || 0),
    stokDisplay: Number(item.stok_display || 0),
    totalStok: Number(item.total_stok || 0),
    kloter: (item.kloter || []).map((k) => ({
      id: Number(k.id),
      nomor: Number(k.nomor || 0),
      jumlahAwal: Number(k.jumlahAwal || 0),
      stokGudang: Number(k.stokGudang || 0),
      stokDisplay: Number(k.stokDisplay || 0),
      tanggalMasuk: k.tanggalMasuk || '',
      tanggalKadaluarsa: k.tanggalKadaluarsa || '',
      lokasiRak: k.lokasiRak || '',
      catatan: k.catatan || '',
    })),
  }));
}

// Menambahkan barang
export async function tambahBarang(data) {
  return request('/barang', 'POST', data);
}

// Mengedit barang
export async function editBarang(id, data) {
  return request(`/barang/${id}`, 'PUT', data);
}

// Menghapus barang
export async function hapusBarang(id) {
  return request(`/barang/${id}`, 'DELETE');
}

// Fungsi umum request API
async function request(endpoint, method, data = null) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    ...(data && {
      body: JSON.stringify(data),
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Terjadi kesalahan API.');
  }

  return result;
}