'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { token, user } = await api.auth.login(email, password);
      setToken(token);
      localStorage.setItem('perseo_user', JSON.stringify(user));
      router.push(user.is_admin ? '/admin' : '/dashboard');
    } catch (err) { setError((err as Error).message); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link href="/"><h1 className="text-3xl font-bold text-[#F5A623] tracking-tight">Perseo</h1></Link>
          <p className="text-white/35 mt-2 text-sm">Tu base de datos de leads, en automático.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>}
          <div>
            <label className="block text-xs text-white/45 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/40 transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-white/45 mb-1.5">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/40 transition-colors" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <p className="text-center text-white/25 text-xs mt-5">
          ¿No tenés cuenta?{' '}
          <Link href="/register" className="text-[#F5A623] hover:underline">Registrate gratis</Link>
        </p>
      </div>
    </div>
  );
}
