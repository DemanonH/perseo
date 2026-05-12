'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { api, UserSettings } from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Partial<UserSettings>>({});
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (!localStorage.getItem('perseo_token')) { router.push('/login'); return; }
    api.settings.get().then(data => {
      setSettings(data);
      setName(data.name || '');
    }).finally(() => setLoading(false));
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload: Record<string, string> = { name };
      if (apiKey.trim() && !apiKey.includes('•')) {
        payload.openai_api_key = apiKey.trim();
      }
      const updated = await api.settings.update(payload);
      setSettings(updated);
      setApiKey('');
      setMessage('Configuración guardada correctamente');
      setMessageType('success');
      const stored = JSON.parse(localStorage.getItem('perseo_user') || '{}');
      localStorage.setItem('perseo_user', JSON.stringify({ ...stored, name: updated.name }));
    } catch (err) {
      setMessage((err as Error).message);
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Ajustes</h2>
            <p className="text-white/40 text-sm mt-1">Configurá tu cuenta y conectá tu API key de OpenAI</p>
          </div>

          {loading ? (
            <p className="text-white/30 text-sm">Cargando...</p>
          ) : (
            <form onSubmit={handleSave}>
              {message && (
                <div className={`mb-5 px-4 py-3 rounded-xl text-sm border ${
                  messageType === 'success'
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {message}
                </div>
              )}

              <div className="bg-[#141414] border border-white/8 rounded-2xl p-6 space-y-5">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">Nombre</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5A623]/40 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/50 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={settings.email || ''}
                    readOnly
                    className="w-full bg-white/3 border border-white/5 rounded-xl px-4 py-3 text-white/40 text-sm cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/50 mb-1.5">
                    API Key de OpenAI
                    <span className="ml-2 text-white/30">(para scoring con IA)</span>
                  </label>
                  {settings.openai_api_key && (
                    <p className="text-xs text-white/30 mb-2">
                      Key actual: <code className="text-[#F5A623]/70">{settings.openai_api_key}</code>
                    </p>
                  )}
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5A623]/40 transition-colors font-mono"
                  />
                  <p className="text-xs text-white/25 mt-1.5">
                    Obtené tu key en{' '}
                    <span className="text-[#F5A623]/60">platform.openai.com/api-keys</span>
                    {' '}— se usa para el scoring diario de leads.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </div>

              <div className="mt-4 p-4 bg-[#141414] border border-white/8 rounded-2xl">
                <p className="text-xs text-white/40">
                  <strong className="text-white/60">Plan:</strong>{' '}
                  <span className="text-[#F5A623] capitalize">{settings.plan_id || 'free'}</span>
                </p>
                <p className="text-xs text-white/30 mt-1">
                  Miembro desde {settings.created_at ? new Date(settings.created_at).toLocaleDateString('es-AR') : '—'}
                </p>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
