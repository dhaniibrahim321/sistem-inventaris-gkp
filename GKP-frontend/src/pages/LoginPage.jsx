import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoGKP from '../assets/logo_GKP.png';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Simulasi login sukses langsung ke dashboard
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-[#C2B6FE] p-8 rounded-3xl shadow-lg w-full max-w-md flex flex-col items-center">
        
        {/* Bagian Logo */}
        <div className="mb-6 flex flex-col items-center">
          <img 
            src={logoGKP} 
            alt="Logo SIGKP" 
            className="h-30 w-30 rounded-lg object-contain mb-2"
          />
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Username</label>
            <input 
              type="text" 
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-full bg-white text-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Password</label>
            <input 
              type="password" 
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-full bg-white text-slate-800 focus:outline-none"
            />
          </div>

          <button 
            type="submit"
            className="w-full mt-4 py-2.5 rounded-full bg-white/80 hover:bg-white text-slate-800 font-bold shadow transition"
          >
            Login
          </button>
        </form>

      </div>
    </div>
  );
}