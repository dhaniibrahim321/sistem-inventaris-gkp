import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoGKP from '../assets/logo_GKP.png';
import apiClient from '../services/apiClient';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

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
      const msg =
        err.response?.data?.message ||
        'Gagal login. Periksa kembali username dan password Anda.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-[#C2B6FE] p-8 rounded-3xl shadow-lg w-full max-w-md flex flex-col items-center">
        <div className="mb-6 flex flex-col items-center">
          <img 
            src={logoGKP} 
            alt="Logo SIGKP" 
            className="h-30 w-30 rounded-lg object-contain mb-2"
          />
        </div>

        {error && (
          <div className="w-full mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Username</label>
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
            <label className="block text-sm font-semibold text-slate-800 mb-1">Password</label>
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
      </div>
    </div>
  );
}
