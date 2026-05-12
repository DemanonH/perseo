'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, setToken } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { token, user } = await api.auth.register(name, email, password);
      setToken(token);
      localStorage.setItem('perseo_user', JSON.stringify(user));
      router.push('/onboarding');
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
          {[
            { label: 'Nombre', value: name, setter: setName, type: 'text', placeholder: 'Tu nombre' },
            { label: 'Email', value: email, setter: setEmail, type: 'email', placeholder: 'tu@email.com' },
            { label: 'Contraseña', value: password, setter: setPassword, type: 'password', placeholder: 'Mínimo 6 caracteres' },
          ].map(({ label, value, setter, type, placeholder }) => (
            <div key={label}>
              <label className="block text-xs text-white/45 mb-1.5">{label}</label>
              <input type={type} value={value} onChange={e => setter(e.target.value)} required placeholder={placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/40 transition-colors" />
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50">
            {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
          </button>
        </form>
        <p className="text-center text-white/25 text-xs mt-5">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-[#F5A623] hover:underline">Ingresá</Link>
        </p>
      </div>
    </div>
  );
}
