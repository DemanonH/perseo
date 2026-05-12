'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import { api, Campaign } from '@/lib/api';

const COLORS = ['#F5A623', '#6366F1', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [adId, setAdId] = useState('');
  const [keywords, setKeywords] = useState('');
  const [color, setColor] = useState('#F5A623');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('perseo_token')) { router.push('/login'); return; }
    api.campaigns.list().then(setCampaigns).finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setError('');
    try {
      const kws = keywords.split(',').map(k => k.trim()).filter(Boolean);
      const camp = await api.campaigns.create({ name: name.trim(), ad_id: adId.trim() || undefined, color, keywords: kws });
      setCampaigns(prev => [camp, ...prev]);
      setName(''); setAdId(''); setKeywords(''); setColor('#F5A623');
      setShowForm(false);
    } catch (err) { setError((err as Error).message); }
    setSaving(false);
  }

  async function handleToggle(c: Campaign) {
    try {
      const updated = await api.campaigns.update(c.id, { is_active: !c.is_active });
      setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, ...updated } : x));
    } catch {}
  }

  function daysActive(createdAt: string): number {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta campaña? Los leads existentes quedarán sin campaña.')) return;
    try {
      await api.campaigns.delete(id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-7">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h1 className="text-xl font-bold text-white">Campañas</h1>
              <p className="text-xs text-white/35 mt-0.5">{campaigns.length} campañas configuradas</p>
            </div>
            <button onClick={() => setShowForm(v => !v)}
              className="text-xs bg-[#F5A623] hover:bg-[#d4880a] text-black font-semibold px-4 py-2 rounded-lg transition-all">
              {showForm ? '✕ Cancelar' : '+ Nueva campaña'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="bg-[#141414] border border-[#F5A623]/20 rounded-2xl p-6 mb-6">
              <h3 className="text-sm font-semibold text-white mb-5">Nueva campaña</h3>
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg mb-4">{error}</div>}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/45 mb-1.5">Nombre *</label>
                  <input value={name} onChange={e => setName(e.target.value)} required placeholder='Ej: "Campaña Mesas"'
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/40" />
                </div>
                <div>
                  <label className="block text-xs text-white/45 mb-1.5">ID del anuncio <span className="text-white/25">(opcional)</span></label>
                  <input value={adId} onChange={e => setAdId(e.target.value)} placeholder='Ej: fb_ad_123456'
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/40 font-mono" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-white/45 mb-1.5">Keywords fallback <span className="text-white/25">(separadas por coma)</span></label>
                  <input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder='mesa, silla, precio, comprar'
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/40" />
                </div>
                <div>
                  <label className="block text-xs text-white/45 mb-2">Color</label>
                  <div className="flex gap-2">
                    {COLORS.map(c => (
                      <button type="button" key={c} onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="mt-5 bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold px-6 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50">
                {saving ? 'Creando...' : 'Crear campaña'}
              </button>
            </form>
          )}

          {loading ? (
            <div className="text-white/25 text-sm py-12 text-center">Cargando campañas...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-white/30 mb-2">Todavía no tenés campañas</p>
              <p className="text-white/20 text-sm">Creá tu primera campaña para empezar a organizar tus leads</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {campaigns.map(c => (
                <div key={c.id} className="bg-[#141414] border border-white/8 hover:border-white/15 rounded-2xl p-5 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <div>
                        <h3 className="font-semibold text-white text-sm">{c.name}</h3>
                        {c.ad_id && <p className="text-xs text-white/30 font-mono mt-0.5">{c.ad_id}</p>}
                        <p className="text-xs text-white/25 mt-0.5">
                          {daysActive(c.created_at) === 0 ? 'Creada hoy' : `${daysActive(c.created_at)} días activa`}
                          {' · '}
                          {new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggle(c)}
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                          c.is_active
                            ? 'bg-green-500/15 text-green-400 border-green-500/25 hover:bg-green-500/25'
                            : 'bg-white/5 text-white/30 border-white/10 hover:bg-white/10'
                        }`}>
                        {c.is_active ? 'Activa' : 'Inactiva'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { label: 'Total', value: c.leads_count || 0, color: 'text-white' },
                      { label: 'Hoy', value: c.today_count || 0, color: 'text-[#F5A623]' },
                      { label: 'Calientes', value: c.hot_count || 0, color: 'text-emerald-400' },
                      { label: 'Tibios', value: c.warm_count || 0, color: 'text-yellow-400' },
                    ].map(stat => (
                      <div key={stat.label} className="text-center bg-white/3 rounded-lg py-2">
                        <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs text-white/30">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {c.keywords && c.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {c.keywords.filter(k => k.is_active).map(k => (
                        <span key={k.id} className="text-xs bg-white/5 text-white/40 px-2 py-0.5 rounded-md border border-white/8">
                          "{k.keyword}"
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link href={`/campaigns/${c.id}`}
                      className="flex-1 text-center text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/20 py-2 rounded-lg transition-all">
                      Ver leads →
                    </Link>
                    <button onClick={() => handleDelete(c.id)}
                      className="text-xs text-white/20 hover:text-red-400 border border-white/8 hover:border-red-500/20 px-3 py-2 rounded-lg transition-all">
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
