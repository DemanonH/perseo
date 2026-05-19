'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import LeadTable from '@/components/ui/LeadTable';
import { api, Lead, Metrics } from '@/lib/api';

const IconTrendUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);
const IconFire = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconBroadcast = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l19-9-9 19-2-8-8-2z" />
  </svg>
);
const IconReply = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </svg>
);
const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

interface StatCardProps {
  label: string;
  value: number | string | undefined;
  sub?: string;
  highlight?: boolean;
  accentColor?: string;
  icon?: React.ReactNode;
}

function StatCard({ label, value, sub, highlight = false, accentColor, icon }: StatCardProps) {
  const cardStyle: React.CSSProperties = {
    backgroundColor: accentColor ? `${accentColor}08` : 'var(--bg-card)',
    border: `1px solid ${accentColor ? `${accentColor}18` : 'var(--border)'}`,
    borderRadius: '1rem',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    boxShadow: 'var(--shadow-sm)',
  };
  return (
    <div style={cardStyle}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{label}</p>
        {icon && <span style={{ color: accentColor ?? 'var(--text-4)', opacity: 0.7 }}>{icon}</span>}
      </div>
      <div>
        <p className="text-3xl font-bold tracking-tight" style={{ color: highlight ? (accentColor ?? 'var(--gold)') : 'var(--text-1)' }}>
          {value ?? '—'}
        </p>
        {sub && <p className="text-[11px] mt-1" style={{ color: 'var(--text-4)' }}>{sub}</p>}
      </div>
    </div>
  );
}

const fmt = (d: Date) => d.toISOString().split('T')[0];

const QUICK_PERIODS = [
  { label: 'Hoy', id: 'hoy' },
  { label: '7 días', id: 'semana' },
  { label: 'Este mes', id: 'mes' },
];

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
  const [activeQuick, setActiveQuick] = useState('hoy');

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
    setActiveQuick(preset);
    if (preset === 'hoy')    { setMetricDateFrom(''); setMetricDateTo(''); }
    else if (preset === 'semana') { setMetricDateFrom(fmt(new Date(today.getTime() - 6 * 86400000))); setMetricDateTo(fmt(today)); }
    else if (preset === 'mes')    { setMetricDateFrom(fmt(new Date(today.getFullYear(), today.getMonth(), 1))); setMetricDateTo(fmt(today)); }
  }

  const periodLabel = metrics?.period_label || (hasRange ? `${metricDateFrom} → ${metricDateTo}` : null);
  const todayStr = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border)',
    color: 'var(--text-2)',
    borderRadius: '0.625rem',
    padding: '0.375rem 0.625rem',
    fontSize: '0.75rem',
    outline: 'none',
  };

  const selectStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    color: 'var(--text-2)',
    borderRadius: '0.75rem',
    padding: '0.5rem 0.75rem',
    fontSize: '0.75rem',
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-1)' }}>Dashboard</h1>
              <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                <IconCalendar />
                {periodLabel ? `Período: ${periodLabel}` : todayStr}
              </p>
            </div>
            <Link href="/campaigns"
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
              style={{ backgroundColor: 'var(--gold)', color: '#000', boxShadow: '0 4px 12px var(--gold-glow)' }}>
              <IconPlus />
              Nueva campaña
            </Link>
          </div>

          {/* Period selector */}
          <div className="flex flex-wrap items-center gap-2 mb-7 p-3 rounded-2xl"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1">
              {QUICK_PERIODS.map(q => {
                const isActive = activeQuick === q.id && !hasRange;
                return (
                  <button key={q.id} onClick={() => applyQuickMetric(q.id)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{
                      backgroundColor: isActive ? 'var(--gold-text)' : 'transparent',
                      color: isActive ? 'var(--gold)' : 'var(--text-3)',
                      border: isActive ? '1px solid var(--gold-glow)' : '1px solid transparent',
                    }}>
                    {q.label}
                  </button>
                );
              })}
            </div>
            <div className="w-px h-4" style={{ backgroundColor: 'var(--border-md)' }} />
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-4)' }}>Desde</span>
              <input type="date" value={metricDateFrom}
                onChange={e => { setMetricDateFrom(e.target.value); setActiveQuick(''); }}
                style={inputStyle} />
              <span className="text-xs" style={{ color: 'var(--text-4)' }}>hasta</span>
              <input type="date" value={metricDateTo}
                onChange={e => { setMetricDateTo(e.target.value); setActiveQuick(''); }}
                style={inputStyle} />
            </div>
            {hasRange && (
              <button onClick={() => { setMetricDateFrom(''); setMetricDateTo(''); setActiveQuick('hoy'); }}
                className="text-xs px-2.5 py-1.5 rounded-lg ml-auto transition-all"
                style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                ✕ Limpiar
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
            <StatCard label={hasRange ? 'En el período' : 'Leads hoy'} value={metrics?.today} highlight accentColor="#F5A623" icon={<IconTrendUp />} />
            <StatCard label={hasRange ? 'Total período' : 'Este mes'} value={metrics?.month} icon={<IconCalendar />} />
            <StatCard label="Calientes" value={metrics?.hot} highlight accentColor="#ef4444" icon={<IconFire />} />
            <StatCard label="Convertidos" value={metrics?.converted} accentColor="#10b981" icon={<IconCheck />} />
            <StatCard label="Campañas activas" value={metrics?.active_campaigns} icon={<IconBroadcast />} />
            <StatCard label="Tasa respuesta" value={metrics ? `${metrics.response_rate}%` : '—'} sub={hasRange ? 'del período' : 'contactados hoy'} icon={<IconReply />} />
          </div>

          {/* Best campaigns */}
          {metrics?.best_campaigns && metrics.best_campaigns.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-4)' }}>
                Mejores campañas · últimos 30 días
              </h2>
              <div className="grid md:grid-cols-3 gap-3">
                {metrics.best_campaigns.map(c => (
                  <Link key={c.id} href={`/campaigns/${c.id}`}
                    className="rounded-2xl p-4 transition-all group"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{c.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span style={{ color: 'var(--text-3)' }}>{c.total_leads} leads</span>
                      <span className="text-emerald-500 font-medium">{c.hot_leads} calientes</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Leads table */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold flex-1" style={{ color: 'var(--text-1)' }}>Leads recientes</h2>
            <select value={filterScore} onChange={e => { setFilterScore(e.target.value); setPage(1); }} style={selectStyle}>
              <option value="">Toda temperatura</option>
              <option value="CALIENTE">🔥 Caliente</option>
              <option value="TIBIO">🌡 Tibio</option>
              <option value="FRIO">❄️ Frío</option>
            </select>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={selectStyle}>
              <option value="">Todos los estados</option>
              <option value="new">Nuevo</option>
              <option value="converted">Convertido</option>
            </select>
            {(filterScore || filterStatus) && (
              <button onClick={() => { setFilterScore(''); setFilterStatus(''); setPage(1); }}
                className="text-xs px-2.5 py-2 rounded-xl transition-colors"
                style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                Limpiar
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'var(--border-md)', borderTopColor: 'var(--gold)' }} />
            </div>
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
            <div className="flex items-center justify-center gap-2 mt-6">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 text-xs rounded-xl transition-all disabled:opacity-20"
                style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                ← Anterior
              </button>
              <span className="text-xs px-2" style={{ color: 'var(--text-4)' }}>Página {page} de {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 text-xs rounded-xl transition-all disabled:opacity-20"
                style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
