import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoGKP from '../assets/logo_GKP.png';
import apiClient from '../services/apiClient';
import { registerStaf } from '../services/userService';

const USERNAME_RE = /^[a-zA-Z0-9._]{3,30}$/;

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const notice = sessionStorage.getItem('auth_notice');
    if (notice) {
      setError(notice);
      sessionStorage.removeItem('auth_notice');
    }
  }, []);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setSuccess('');
    setPassword('');
    setKonfirmasiPassword('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim()) {
      setError('Username wajib diisi.');
      return;
    }

    if (!password) {
      setError('Password wajib diisi.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.post('/auth/login', {
        username: username.trim(),
        password,
      });

      if (res.data?.data?.token) {
        localStorage.setItem('token', res.data.data.token);
        if (res.data.data.user) {
          localStorage.setItem('user', JSON.stringify(res.data.data.user));
        }
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Gagal login. Periksa kembali username dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanNama = nama.trim();
    const cleanUsername = username.trim();

    if (!cleanNama) {
      setError('Nama lengkap wajib diisi.');
      return;
    }

    if (!USERNAME_RE.test(cleanUsername)) {
      setError('Username harus 3–30 karakter (huruf, angka, titik, atau garis bawah).');
      return;
    }

    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }

    if (password !== konfirmasiPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    try {
      setLoading(true);
      const res = await registerStaf({
        nama: cleanNama,
        username: cleanUsername,
        password,
        konfirmasi_password: konfirmasiPassword,
      });
      setSuccess(
        res?.message ||
          'Pendaftaran berhasil. Akun Anda menunggu persetujuan Super Admin.'
      );
      setNama('');
      setUsername('');
      setPassword('');
      setKonfirmasiPassword('');
      setMode('login');
    } catch (err) {
      setError(err.message || 'Pendaftaran gagal. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-[#C2B6FE] p-8 rounded-3xl shadow-lg w-full max-w-md flex flex-col items-center">
        <div className="mb-5 flex flex-col items-center">
          <img
            src={logoGKP}
            alt="Logo SIGKP"
            className="h-30 w-30 rounded-lg object-contain mb-2"
          />
        </div>

        <div className="w-full grid grid-cols-2 gap-1.5 bg-white/40 p-1 rounded-full mb-5">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`py-2 rounded-full text-sm font-semibold transition ${
              mode === 'login'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`py-2 rounded-full text-sm font-semibold transition ${
              mode === 'register'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Daftar Staf
          </button>
        </div>

        {error && (
          <div className="w-full mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="w-full mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium text-center">
            {success}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                Username
              </label>
              <input
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-2.5 rounded-full bg-white text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-2.5 rounded-full bg-white text-slate-800 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-2.5 rounded-full bg-white/80 hover:bg-white text-slate-800 font-bold shadow transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Memproses...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="w-full space-y-3.5">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                placeholder="Masukkan nama lengkap"
                value={nama}
                onChange={(e) => {
                  setNama(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-2.5 rounded-full bg-white text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                Username
              </label>
              <input
                type="text"
                placeholder="Contoh: rina.gudang"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-2.5 rounded-full bg-white text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-2.5 rounded-full bg-white text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                Konfirmasi Password
              </label>
              <input
                type="password"
                placeholder="Ulangi password"
                value={konfirmasiPassword}
                onChange={(e) => {
                  setKonfirmasiPassword(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-2.5 rounded-full bg-white text-slate-800 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-full bg-white/80 hover:bg-white text-slate-800 font-bold shadow transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Mendaftar...' : 'Ajukan Pendaftaran'}
            </button>

            <p className="text-xs text-center text-slate-700 pt-1">
              Akun baru perlu diverifikasi Super Admin sebelum dapat login.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
