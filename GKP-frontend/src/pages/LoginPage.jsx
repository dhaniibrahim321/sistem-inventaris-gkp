import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = (e) => {
    e.preventDefault()
    // Prototype: langsung navigasi ke dashboard tanpa validasi
    navigate('/dashboard')
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Card Login */}
        <section
          aria-label="Form login"
          className="w-full bg-[#C2B6FE] rounded-[2rem] shadow-lg px-8 pt-10 pb-10"
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src="src/assets/logo_GKP.png" className="h-20 object-contain"/>
          </div>

          {/* Form */}
          <form id="login-form" onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-base font-bold text-slate-900 mb-2"
              >
                Username
              </label>
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-5 pr-12 py-3 rounded-full bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B528D] transition-shadow"
                />
                <User size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-base font-bold text-slate-900 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-5 pr-12 py-3 rounded-full bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B528D] transition-shadow"
                />
                <Lock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </form>
        </section>

        {/* Tombol Login - di luar card, warna lebih muda */}
        <button
          type="submit"
          form="login-form"
          className="mt-6 px-12 py-3 rounded-full bg-[#E4DFFB] text-slate-900 font-semibold text-sm shadow-md hover:bg-[#d4ccf7] focus:outline-none focus:ring-2 focus:ring-[#5B528D] transition-colors"
        >
          Login
        </button>
      </div>
    </main>
  )
}
