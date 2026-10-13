import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BarangPage from './pages/BarangPage'
import BarangMasukPage from './pages/BarangMasukPage'
import PergerakanPage from './pages/PergerakanPage'
import StokPage from './pages/StokPage'
import StockOpnamePage from './pages/StockOpnamePage'
import RiwayatPage from './pages/RiwayatPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  // Pure React State (useState) sebagai satu-satunya penyimpanan data.
  // Sengaja diawali array kosong ([]) tanpa data dummy, dan TIDAK disimpan
  // ke localStorage/sessionStorage apa pun — refresh halaman otomatis
  // mengembalikan seluruh data ke kondisi kosong sesuai ketentuan revisi.
  const [barang, setBarang] = useState([])
  const [riwayat, setRiwayat] = useState([])

  return (
    <BrowserRouter>
      <Routes>
        {/* Login - tanpa layout */}
        <Route path="/" element={<LoginPage />} />

        {/* Halaman dengan MainLayout (Sidebar + Header) */}
        <Route element={<MainLayout />}>
          <Route
            path="/dashboard"
            element={<DashboardPage barang={barang} riwayat={riwayat} />}
          />
          <Route
            path="/barang"
            element={
              <BarangPage
                barang={barang}
                setBarang={setBarang}
                setRiwayat={setRiwayat}
              />
            }
          />
          <Route
            path="/barang-masuk"
            element={
              <BarangMasukPage
                barang={barang}
                setBarang={setBarang}
                setRiwayat={setRiwayat}
              />
            }
          />
          <Route
            path="/pergerakan"
            element={
              <PergerakanPage
                barang={barang}
                setBarang={setBarang}
                setRiwayat={setRiwayat}
              />
            }
          />
          <Route
            path="/stok"
            element={
              <StokPage
                barang={barang}
                setBarang={setBarang}
                setRiwayat={setRiwayat}
              />
            }
          />
          <Route
            path="/stock-opname"
            element={
              <StockOpnamePage
                barang={barang}
                setBarang={setBarang}
                setRiwayat={setRiwayat}
              />
            }
          />
          <Route path="/riwayat" element={<RiwayatPage riwayat={riwayat} />} />
          <Route path="/pengaturan" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
