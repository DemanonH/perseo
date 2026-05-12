'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import LeadTable from '@/components/ui/LeadTable';
import { api, Campaign, Lead } from '@/lib/api';

export default function CampaignDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterScore, setFilterScore] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('perseo_token')) { router.push('/login'); return; }
    api.campaigns.list().then(camps => {
      const c = camps.find(x => x.id === id);
      if (!c) { router.push('/campaigns'); return; }
      setCampaign(c);
      setNameValue(c.name);
    });
  }, [id, router]);

  const fetchLeads = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 50 };
      if (filterScore) params.score = filterScore;
      const res = await api.campaigns.leads(id, params);
      setLeads(res.leads);
      setTotal(res.total);
      setPages(res.pages);
    } catch {}
    setLoading(false);
  }, [id, page, filterScore]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function handleAddKeyword(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyword.trim() || !campaign) return;
    try {
      await api.campaigns.addKeyword(campaign.id, newKeyword.trim());
      const updated = await api.campaigns.list();
      const c = updated.find(x => x.id === id);
      if (c) setCampaign(c);
      setNewKeyword('');
    } catch {}
  }

  async function handleRemoveKeyword(kwId: string) {
    if (!campaign) return;
    try {
      await api.campaigns.removeKeyword(campaign.id, kwId);
      setCampaign(prev => prev ? { ...prev, keywords: (prev.keywords || []).filter(k => k.id !== kwId) } : prev);
    } catch {}
  }

  async function handleSaveName() {
    if (!campaign || !nameValue.trim()) return;
    await api.campaigns.update(campaign.id, { name: nameValue.trim() });
    setCampaign(prev => prev ? { ...prev, name: nameValue.trim() } : prev);
    setEditingName(false);
  }

  if (!campaign) return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center text-white/30">Cargando...</main>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-7">
          <div className="flex items-center gap-2 mb-6 text-xs text-white/30">
            <Link href="/campaigns" className="hover:text-white/60 transition-colors">Campañas</Link>
            <span>/</span>
            <span className="text-white/60">{campaign.name}</span>
          </div>

          <div className="flex items-start justify-between mb-7">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: campaign.color }} />
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input value={nameValue} onChange={e => setNameValue(e.target.value)}
                    className="bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-white text-lg font-bold focus:outline-none focus:border-[#F5A623]/50" />
                  <button onClick={handleSaveName} className="text-xs text-[#F5A623] hover:text-[#d4880a]">Guardar</button>
                  <button onClick={() => setEditingName(false)} className="text-xs text-white/30 hover:text-white/60">Cancelar</button>
                </div>
              ) : (
                <div>
                  <h1 className="text-xl font-bold text-white">{campaign.name}</h1>
                  {campaign.ad_id && <p className="text-xs text-white/30 font-mono mt-0.5">ad_id: {campaign.ad_id}</p>}
                </div>
              )}
              {!editingName && (
                <button onClick={() => setEditingName(true)} className="text-white/20 hover:text-white/50 text-xs transition-colors">✎</button>
              )}
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              campaign.is_active
                ? 'bg-green-500/15 text-green-400 border-green-500/25'
                : 'bg-white/5 text-white/30 border-white/10'
            }`}>
              {campaign.is_active ? 'Activa' : 'Inactiva'}
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
            {[
              { label: 'Total leads', value: total, c: 'text-white' },
              { label: 'Calientes', value: campaign.hot_count || 0, c: 'text-emerald-400' },
              { label: 'Tibios', value: campaign.warm_count || 0, c: 'text-yellow-400' },
              { label: 'Fríos', value: campaign.cold_count || 0, c: 'text-red-400' },
            ].map(s => (
              <div key={s.label} className="bg-[#141414] border border-white/8 rounded-xl p-4">
                <p className="text-xs text-white/35 uppercase tracking-wide mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.c}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-7">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-white flex-1">Leads</h2>
                <select value={filterScore} onChange={e => { setFilterScore(e.target.value); setPage(1); }}
                  className="bg-[#141414] border border-white/10 text-white/60 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none">
                  <option value="">Toda temperatura</option>
                  <option value="CALIENTE">🟢 Caliente</option>
                  <option value="TIBIO">🟡 Tibio</option>
                  <option value="FRIO">🔴 Frío</option>
                </select>
              </div>
              {loading ? (
                <div className="text-white/25 text-sm py-8 text-center">Cargando...</div>
              ) : (
                <LeadTable
                  leads={leads}
                  onConvert={id => setLeads(p => p.map(l => l.id === id ? { ...l, status: 'converted' } : l))}
                  onDelete={id => setLeads(p => p.filter(l => l.id !== id))}
                  onUpdate={updated => setLeads(p => p.map(l => l.id === updated.id ? { ...l, ...updated } : l))}
                />
              )}
              {pages > 1 && (
                <div className="flex gap-2 mt-3 justify-center">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="text-xs border border-white/10 px-3 py-1.5 rounded-lg text-white/40 hover:text-white disabled:opacity-25 transition-colors">← Anterior</button>
                  <span className="text-white/25 text-xs self-center">Página {page} de {pages}</span>
                  <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                    className="text-xs border border-white/10 px-3 py-1.5 rounded-lg text-white/40 hover:text-white disabled:opacity-25 transition-colors">Siguiente →</button>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold text-white mb-3">Keywords de activación</h2>
              <div className="bg-[#141414] border border-white/8 rounded-xl p-4">
                <form onSubmit={handleAddKeyword} className="flex gap-2 mb-3">
                  <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder='Ej: "mesa"'
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-white/20 focus:outline-none focus:border-[#F5A623]/40" />
                  <button type="submit" className="bg-[#F5A623]/15 hover:bg-[#F5A623]/25 text-[#F5A623] text-xs px-3 py-2 rounded-lg transition-all">+</button>
                </form>
                <div className="space-y-1.5">
                  {(campaign.keywords || []).map(k => (
                    <div key={k.id} className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2">
                      <span className="text-xs text-white/70 font-mono">"{k.keyword}"</span>
                      <button onClick={() => handleRemoveKeyword(k.id)} className="text-white/20 hover:text-red-400 text-xs transition-colors">✕</button>
                    </div>
                  ))}
                  {(!campaign.keywords || campaign.keywords.length === 0) && (
                    <p className="text-xs text-white/25 text-center py-3">Sin keywords. Agregá una para capturar leads automáticamente.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
