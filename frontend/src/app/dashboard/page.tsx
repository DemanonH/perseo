'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import LeadTable from '@/components/ui/LeadTable';
import { api, Lead, Metrics } from '@/lib/api';

function StatCard({ label, value, sub, highlight = false }: { label: string; value: number | string | undefined; sub?: string; highlight?: boolean }) {
  return (
    <div className="bg-[#141414] border border-white/8 rounded-2xl p-5">
      <p className="text-xs text-white/35 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-bold ${highlight ? 'text-[#F5A623]' : 'text-white'}`}>
        {value ?? '—'}
      </p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

const fmt = (d: Date) => d.toISOString().split('T')[0];

export default function DashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics & { period_label?: string | null } | null>(null);
  const [leads, setLeads]     = useState<Lead[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterScore, setFilterScore]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [metricDateFrom, setMetricDateFrom] = useState('');
  const [metricDateTo,   setMetricDateTo]   = useState('');

  const fetchMetrics = useCallback(async () => {
    try {
      const params: { date_from?: string; date_to?: string } = {};
      if (metricDateFrom) params.date_from = metricDateFrom;
      if (metricDateTo)   params.date_to   = metricDateTo;
      const m = await api.leads.metrics(params);
      setMetrics(m);
    } catch {}
  }, [metricDateFrom, metricDateTo]);

  useEffect(() => {
    if (!localStorage.getItem('perseo_token')) { router.push('/login'); return; }
    api.onboarding.status().then(res => {
      if (!res.onboarding_completed) router.push('/onboarding');
    }).catch(() => {});
  }, [router]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 30 };
      if (filterScore)  params.score  = filterScore;
      if (filterStatus) params.status = filterStatus;
      const res = await api.leads.list(params);
      setLeads(res.leads);
      setTotal(res.total);
      setPages(res.pages);
    } catch {}
    setLoading(false);
  }, [page, filterScore, filterStatus]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const hasRange = metricDateFrom || metricDateTo;

  function applyQuickMetric(preset: string) {
    const today = new Date();
    if (preset === 'hoy')    { setMetricDateFrom(''); setMetricDateTo(''); }
    else if (preset === 'semana') { setMetricDateFrom(fmt(new Date(today.getTime() - 6 * 86400000))); setMetricDateTo(fmt(today)); }
    else if (preset === 'mes')    { setMetricDateFrom(fmt(new Date(today.getFullYear(), today.getMonth(), 1))); setMetricDateTo(fmt(today)); }
  }

  const periodLabel = metrics?.period_label
    || (hasRange ? `${metricDateFrom} → ${metricDateTo}` : null);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-7">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-white">Dashboard</h1>
              <p className="text-xs text-white/35 mt-0.5">
                {periodLabel
                  ? `Período: ${periodLabel}`
                  : `Resumen de hoy — ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
              </p>
            </div>
            <Link href="/campaigns"
              className="text-xs bg-[#F5A623] hover:bg-[#d4880a] text-black font-semibold px-4 py-2 rounded-lg transition-all">
              + Nueva campaña
            </Link>
          </div>

          {/* Selector de período para métricas */}
          <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-[#141414] border border-white/8 rounded-xl">
            <span className="text-xs text-white/35 mr-1">Período:</span>
            {[
              { label: 'Hoy', id: 'hoy' },
              { label: 'Últimos 7 días', id: 'semana' },
              { label: 'Este mes', id: 'mes' },
            ].map(q => (
              <button key={q.id} onClick={() => applyQuickMetric(q.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition-all">
                {q.label}
              </button>
            ))}
            <span className="text-white/15 px-1">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/30">Desde</span>
              <input type="date" value={metricDateFrom}
                onChange={e => setMetricDateFrom(e.target.value)}
                className="bg-[#0e0e0e] border border-white/10 text-white/60 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#F5A623]/30" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/30">hasta</span>
              <input type="date" value={metricDateTo}
                onChange={e => setMetricDateTo(e.target.value)}
                className="bg-[#0e0e0e] border border-white/10 text-white/60 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#F5A623]/30" />
            </div>
            {hasRange && (
              <button onClick={() => { setMetricDateFrom(''); setMetricDateTo(''); }}
                className="text-xs text-white/30 hover:text-white/60 border border-white/8 px-2 py-1.5 rounded-lg transition-colors">
                ✕ Hoy
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-7">
            <StatCard label={hasRange ? 'En el período' : 'Leads hoy'} value={metrics?.today} highlight />
            <StatCard label={hasRange ? 'Total período' : 'Este mes'} value={metrics?.month} />
            <StatCard label="Calientes 🔥"     value={metrics?.hot}              highlight />
            <StatCard label="Convertidos"       value={metrics?.converted}        />
            <StatCard label="Campañas activas"  value={metrics?.active_campaigns} />
            <StatCard label="Tasa de respuesta" value={metrics ? `${metrics.response_rate}%` : '—'}
              sub={hasRange ? 'del período' : 'de leads contactados hoy'} />
          </div>

          {metrics?.best_campaigns && metrics.best_campaigns.length > 0 && (
            <div className="mb-7">
              <h2 className="text-xs text-white/35 uppercase tracking-wide mb-3">Mejores campañas (últimos 30 días)</h2>
              <div className="grid md:grid-cols-3 gap-3">
                {metrics.best_campaigns.map(c => (
                  <Link key={c.id} href={`/campaigns/${c.id}`}
                    className="bg-[#141414] border border-white/8 hover:border-white/15 rounded-xl p-4 transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-sm font-medium text-white">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-white/40">
                      <span>{c.total_leads} leads</span>
                      <span className="text-emerald-400">🟢 {c.hot_leads} calientes</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold text-white flex-1">Leads recientes</h2>
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
            {(filterScore || filterStatus) && (
              <button onClick={() => { setFilterScore(''); setFilterStatus(''); setPage(1); }}
                className="text-xs text-white/30 hover:text-white/60 border border-white/8 px-2.5 py-2 rounded-lg transition-colors">
                Limpiar
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-white/25 text-sm py-12 text-center">Cargando leads...</div>
          ) : (
            <LeadTable
              leads={leads}
              onConvert={id => {
                setLeads(p => p.map(l => l.id === id ? { ...l, status: 'converted' } : l));
                fetchMetrics();
              }}
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
