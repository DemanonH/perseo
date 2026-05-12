'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import LeadTable from '@/components/ui/LeadTable';
import { api, Lead, Campaign } from '@/lib/api';

const fmt = (d: Date) => d.toISOString().split('T')[0];

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterScore, setFilterScore] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]     = useState('');
  const [activeQuick, setActiveQuick] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('perseo_token')) { router.push('/login'); return; }
    api.campaigns.list().then(setCampaigns).catch(() => {});
  }, [router]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 50 };
      if (filterCampaign)  params.campaign_id = filterCampaign;
      if (filterScore)     params.score       = filterScore;
      if (filterStatus)    params.status      = filterStatus;
      if (filterMonth)     params.month       = filterMonth;
      if (filterDateFrom)  params.date_from   = filterDateFrom;
      if (filterDateTo)    params.date_to     = filterDateTo;
      const res = await api.leads.list(params);
      setLeads(res.leads);
      setTotal(res.total);
      setPages(res.pages);
    } catch {}
    setLoading(false);
  }, [page, filterCampaign, filterScore, filterStatus, filterMonth, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  function clearFilters() {
    setFilterCampaign(''); setFilterScore(''); setFilterStatus('');
    setFilterMonth(''); setFilterDateFrom(''); setFilterDateTo('');
    setActiveQuick(''); setPage(1);
  }

  function applyQuickFilter(preset: string) {
    const today = new Date();
    setFilterMonth('');
    setActiveQuick(preset);
    setPage(1);
    if (preset === 'hoy') {
      setFilterDateFrom(fmt(today)); setFilterDateTo(fmt(today));
    } else if (preset === 'ayer') {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      setFilterDateFrom(fmt(y)); setFilterDateTo(fmt(y));
    } else if (preset === 'semana') {
      const start = new Date(today); start.setDate(today.getDate() - 6);
      setFilterDateFrom(fmt(start)); setFilterDateTo(fmt(today));
    } else if (preset === 'mes') {
      setFilterDateFrom(fmt(new Date(today.getFullYear(), today.getMonth(), 1)));
      setFilterDateTo(fmt(today));
    }
  }

  const hasFilters = filterCampaign || filterScore || filterStatus || filterMonth || filterDateFrom || filterDateTo;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-7">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h1 className="text-xl font-bold text-white">Leads</h1>
              <p className="text-xs text-white/35 mt-0.5">{total} leads{hasFilters ? ' (filtrado)' : ' en total'}</p>
            </div>
          </div>

          {/* Filtros fila 1: selects */}
          <div className="flex flex-wrap gap-2.5 mb-2.5">
            <select value={filterCampaign} onChange={e => { setFilterCampaign(e.target.value); setPage(1); }}
              className="bg-[#141414] border border-white/10 text-white/60 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A623]/30">
              <option value="">Todas las campañas</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select value={filterScore} onChange={e => { setFilterScore(e.target.value); setPage(1); }}
              className="bg-[#141414] border border-white/10 text-white/60 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A623]/30">
              <option value="">Toda temperatura</option>
              <option value="CALIENTE">🟢 Caliente</option>
              <option value="TIBIO">🟡 Tibio</option>
              <option value="FRIO">🔴 Frío</option>
            </select>

            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              className="bg-[#141414] border border-white/10 text-white/60 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A623]/30">
              <option value="">Todos los estados</option>
              <option value="new">Nuevo</option>
              <option value="converted">Convertido</option>
            </select>
          </div>

          {/* Filtros fila 2: fechas */}
          <div className="flex flex-wrap gap-2 mb-5 items-center">
            {/* Quick filters */}
            {(['hoy', 'ayer', 'semana', 'mes'] as const).map(p => (
              <button key={p} onClick={() => applyQuickFilter(p === activeQuick ? '' : p)}
                className={`text-xs px-3 py-2 rounded-lg border transition-all ${
                  activeQuick === p
                    ? 'bg-[#F5A623] text-black border-[#F5A623] font-semibold'
                    : 'text-white/50 hover:text-white border-white/10 hover:border-white/25'
                }`}>
                {p === 'hoy' ? 'Hoy' : p === 'ayer' ? 'Ayer' : p === 'semana' ? 'Últimos 7 días' : 'Este mes'}
              </button>
            ))}

            {/* Separador */}
            <span className="text-white/20 text-xs px-1">|</span>

            {/* Date pickers */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/30">Desde</span>
              <input type="date" value={filterDateFrom}
                onChange={e => { setFilterDateFrom(e.target.value); setActiveQuick(''); setPage(1); }}
                className="bg-[#141414] border border-white/10 text-white/60 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A623]/30" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/30">hasta</span>
              <input type="date" value={filterDateTo}
                onChange={e => { setFilterDateTo(e.target.value); setActiveQuick(''); setPage(1); }}
                className="bg-[#141414] border border-white/10 text-white/60 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#F5A623]/30" />
            </div>

            {hasFilters && (
              <button onClick={clearFilters}
                className="text-xs text-white/30 hover:text-white/60 border border-white/8 px-2.5 py-2 rounded-lg transition-colors ml-1">
                ✕ Limpiar
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-white/25 text-sm py-12 text-center">Cargando leads...</div>
          ) : (
            <LeadTable
              leads={leads}
              onConvert={id => setLeads(p => p.map(l => l.id === id ? { ...l, status: 'converted' } : l))}
              onDelete={id => setLeads(p => p.filter(l => l.id !== id))}
              onUpdate={updated => setLeads(p => p.map(l => l.id === updated.id ? { ...l, ...updated } : l))}
            />
          )}

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-4 py-1.5 text-xs border border-white/10 rounded-lg text-white/40 hover:text-white disabled:opacity-25 transition-colors">← Anterior</button>
              <span className="text-white/30 text-xs">Página {page} de {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                className="px-4 py-1.5 text-xs border border-white/10 rounded-lg text-white/40 hover:text-white disabled:opacity-25 transition-colors">Siguiente →</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
