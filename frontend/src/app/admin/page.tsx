'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  api, getToken, setToken,
  AdminMetrics, AdminUser, AdminUsersResponse,
  AdminConnections, AdminActivity,
} from '@/lib/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days}d`;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' });
}

function fmtMRR(cents: number) {
  if (cents === 0) return '$0';
  const dollars = cents / 100;
  return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

const PLAN_STYLE: Record<string, string> = {
  free:    'bg-zinc-800 text-zinc-300 border-zinc-700',
  starter: 'bg-blue-950 text-blue-300 border-blue-800',
  pro:     'bg-violet-950 text-violet-300 border-violet-800',
  agency:  'bg-amber-950 text-amber-300 border-amber-800',
};

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${PLAN_STYLE[plan] || PLAN_STYLE.free}`}>
      {plan}
    </span>
  );
}

function StatusDot({ active, label }: { active: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
      {label && <span className={`text-xs ${active ? 'text-emerald-400' : 'text-zinc-500'}`}>{label}</span>}
    </span>
  );
}

type Tab = 'overview' | 'users' | 'connections' | 'activity';

// ─── main component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [usersData, setUsersData] = useState<AdminUsersResponse | null>(null);
  const [connections, setConnections] = useState<AdminConnections | null>(null);
  const [activity, setActivity] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Users filters
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  // UI state
  const [pendingPlan, setPendingPlan] = useState<Record<string, string>>({});
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState('');

  // ── auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = (() => { try { return JSON.parse(localStorage.getItem('perseo_user') || '{}'); } catch { return {}; } })();
    if (!u?.is_admin) { router.push('/dashboard'); return; }
    loadAll();
  }, []);

  // ── load data ───────────────────────────────────────────────────────────────
  async function loadAll() {
    setLoading(true);
    try {
      const [m, u, c, a] = await Promise.all([
        api.admin.metrics(),
        api.admin.users({ page: 1, limit: 50 }),
        api.admin.connections(),
        api.admin.activity(),
      ]);
      setMetrics(m);
      setUsersData(u);
      setConnections(c);
      setActivity(a);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  const loadUsers = useCallback(async () => {
    try {
      const u = await api.admin.users({
        page, limit: 50,
        search: search || undefined,
        plan: filterPlan || undefined,
        status: filterStatus || undefined,
      });
      setUsersData(u);
    } catch { /* silent */ }
  }, [page, search, filterPlan, filterStatus]);

  useEffect(() => {
    if (!loading) loadUsers();
  }, [page, filterPlan, filterStatus]);

  // ── actions ─────────────────────────────────────────────────────────────────
  function flash(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 3000);
  }

  async function toggleSuspend(u: AdminUser) {
    try {
      const updated = await api.admin.suspendUser(u.id, !u.suspended);
      setUsersData(prev => prev ? {
        ...prev,
        users: prev.users.map(x => x.id === u.id ? { ...x, suspended: updated.suspended } : x),
      } : null);
      flash(updated.suspended ? `${u.name} suspendido` : `${u.name} reactivado`);
    } catch (e: unknown) { flash(e instanceof Error ? e.message : 'Error'); }
  }

  async function changePlan(u: AdminUser, plan_id: string) {
    setPendingPlan(p => ({ ...p, [u.id]: plan_id }));
    try {
      await api.admin.updatePlan(u.id, plan_id);
      setUsersData(prev => prev ? {
        ...prev,
        users: prev.users.map(x => x.id === u.id ? { ...x, plan_id } : x),
      } : null);
      flash(`Plan de ${u.name} → ${plan_id}`);
    } catch (e: unknown) { flash(e instanceof Error ? e.message : 'Error'); }
    finally { setPendingPlan(p => { const n = { ...p }; delete n[u.id]; return n; }); }
  }

  async function impersonate(u: AdminUser) {
    if (!confirm(`¿Acceder al dashboard como ${u.email}? Tendrás acceso completo a su cuenta por 2h.`)) return;
    setImpersonating(u.id);
    try {
      const { token, user } = await api.admin.impersonate(u.id);
      // Store current admin session so we can return
      const adminToken = getToken();
      const adminUser  = localStorage.getItem('perseo_user');
      sessionStorage.setItem('admin_token', adminToken || '');
      sessionStorage.setItem('admin_user',  adminUser  || '');
      // Switch to impersonated session
      setToken(token);
      localStorage.setItem('perseo_user', JSON.stringify(user));
      router.push('/dashboard');
    } catch (e: unknown) { flash(e instanceof Error ? e.message : 'Error'); }
    finally { setImpersonating(null); }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadUsers();
  }

  // ── render ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
      <div className="flex items-center gap-3 text-zinc-400">
        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        Cargando panel...
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
      <div className="text-red-400 text-sm">{error}</div>
    </div>
  );

  const allConns = connections
    ? [...connections.evolution, ...connections.meta, ...connections.dialog360, ...connections.twilio]
    : [];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">

      {/* Top action message */}
      {actionMsg && (
        <div className="fixed top-4 right-4 z-50 bg-zinc-800 border border-zinc-700 text-sm text-white px-4 py-2 rounded-lg shadow-xl">
          {actionMsg}
        </div>
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <div className="flex h-screen">
        <aside className="w-56 flex-shrink-0 border-r border-white/5 flex flex-col">
          <div className="px-5 py-5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-xs font-bold">P</div>
              <div>
                <div className="text-sm font-semibold leading-none">Perseo</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Admin Console</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {([
              { id: 'overview',     label: 'Overview',     icon: '▦' },
              { id: 'users',        label: 'Usuarios',     icon: '⊞' },
              { id: 'connections',  label: 'Conexiones',   icon: '⊛' },
              { id: 'activity',     label: 'Actividad',    icon: '◎' },
            ] as { id: Tab; label: string; icon: string }[]).map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  tab === item.id
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-xs opacity-70">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="px-3 py-4 border-t border-white/5">
            <button
              onClick={() => {
                // Restore admin session if impersonating
                const adminToken = sessionStorage.getItem('admin_token');
                if (adminToken) {
                  setToken(adminToken);
                  const au = sessionStorage.getItem('admin_user');
                  if (au) localStorage.setItem('perseo_user', au);
                  sessionStorage.removeItem('admin_token');
                  sessionStorage.removeItem('admin_user');
                }
                router.push('/dashboard');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <span className="text-xs">←</span>
              App
            </button>
          </div>
        </aside>

        {/* ── Main content ───────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto">

          {/* ── OVERVIEW ───────────────────────────────────────────────────── */}
          {tab === 'overview' && metrics && (
            <div className="px-8 py-7">
              <h1 className="text-xl font-semibold mb-1">Overview</h1>
              <p className="text-zinc-500 text-sm mb-7">Métricas generales del SaaS</p>

              {/* KPI grid */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                {[
                  {
                    label: 'MRR',
                    value: fmtMRR(metrics.mrr_cents),
                    sub: `${metrics.active_subs} suscripciones activas`,
                    color: 'text-emerald-400',
                  },
                  {
                    label: 'Usuarios totales',
                    value: metrics.total_users.toLocaleString(),
                    sub: `+${metrics.new_users_30d} este mes`,
                    color: 'text-white',
                  },
                  {
                    label: 'WhatsApp conectados',
                    value: metrics.whatsapp_connected.toLocaleString(),
                    sub: 'cuentas activas',
                    color: 'text-blue-400',
                  },
                  {
                    label: 'Leads (30d)',
                    value: metrics.leads_30d.toLocaleString(),
                    sub: `en ${metrics.total_workspaces} workspaces`,
                    color: 'text-violet-400',
                  },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="bg-zinc-900 border border-white/5 rounded-xl p-5">
                    <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">{label}</div>
                    <div className={`text-2xl font-bold ${color}`}>{value}</div>
                    <div className="text-xs text-zinc-500 mt-1">{sub}</div>
                  </div>
                ))}
              </div>

              {/* Plan distribution */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="bg-zinc-900 border border-white/5 rounded-xl p-6">
                  <h3 className="text-sm font-semibold mb-5">Distribución de planes</h3>
                  <div className="space-y-3">
                    {metrics.plan_distribution.map(({ plan_id, cnt }) => {
                      const count = parseInt(cnt);
                      const pct   = metrics.total_users > 0 ? (count / metrics.total_users) * 100 : 0;
                      return (
                        <div key={plan_id} className="flex items-center gap-3">
                          <PlanBadge plan={plan_id} />
                          <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-violet-500/70"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-sm text-zinc-300 w-6 text-right font-medium">{count}</span>
                          <span className="text-xs text-zinc-600 w-8 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                    {metrics.plan_distribution.length === 0 && (
                      <p className="text-zinc-600 text-sm">Sin datos</p>
                    )}
                  </div>
                </div>

                {/* Recent signups */}
                <div className="bg-zinc-900 border border-white/5 rounded-xl p-6">
                  <h3 className="text-sm font-semibold mb-5">Últimos registros</h3>
                  <div className="space-y-3">
                    {activity.filter(a => a.type === 'signup').slice(0, 6).map((a, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-xs font-medium text-zinc-400">
                            {a.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="text-sm text-white leading-none">{a.name}</div>
                            <div className="text-xs text-zinc-500 mt-0.5">{a.email}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-zinc-500">{fmtDate(a.ts)}</div>
                          {a.meta && <PlanBadge plan={a.meta} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ──────────────────────────────────────────────────────── */}
          {tab === 'users' && (
            <div className="px-8 py-7">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-xl font-semibold">Usuarios</h1>
                  <p className="text-zinc-500 text-sm mt-0.5">{usersData?.total ?? 0} cuentas registradas</p>
                </div>
              </div>

              {/* Filters */}
              <form onSubmit={handleSearch} className="flex items-center gap-3 mb-5">
                <div className="relative flex-1 max-w-sm">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/8 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
                <select
                  value={filterPlan}
                  onChange={e => { setFilterPlan(e.target.value); setPage(1); }}
                  className="bg-zinc-900 border border-white/8 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50"
                >
                  <option value="">Todos los planes</option>
                  {['free', 'starter', 'pro', 'agency'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                  className="bg-zinc-900 border border-white/8 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50"
                >
                  <option value="">Todos</option>
                  <option value="active">Activos</option>
                  <option value="suspended">Suspendidos</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 bg-white/8 hover:bg-white/12 border border-white/8 text-sm text-white rounded-lg transition-colors"
                >
                  Buscar
                </button>
              </form>

              {/* Table */}
              <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Usuario', 'Plan', 'WA', 'Leads', 'Actividad', 'Último login', 'Estado', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/3">
                    {(usersData?.users ?? []).map(u => (
                      <tr key={u.id} className={`hover:bg-white/2 transition-colors ${u.suspended ? 'opacity-50' : ''}`}>
                        {/* User */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-xs font-semibold text-zinc-300 flex-shrink-0">
                              {u.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white leading-none">{u.name}</div>
                              <div className="text-xs text-zinc-500 mt-0.5">{u.email}</div>
                              {u.workspace_name && (
                                <div className="text-xs text-zinc-600 mt-0.5 truncate max-w-[160px]">{u.workspace_name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Plan selector */}
                        <td className="px-4 py-3.5">
                          <select
                            value={pendingPlan[u.id] ?? u.plan_id}
                            onChange={e => changePlan(u, e.target.value)}
                            className="bg-zinc-800 border border-white/8 rounded-md px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/50 cursor-pointer"
                          >
                            {['free', 'starter', 'pro', 'agency'].map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </td>
                        {/* WA status */}
                        <td className="px-4 py-3.5">
                          <StatusDot active={u.whatsapp_connected} />
                        </td>
                        {/* Leads */}
                        <td className="px-4 py-3.5">
                          <div className="text-sm text-zinc-300">{u.lead_count}</div>
                          {u.messages_7d > 0 && (
                            <div className="text-xs text-zinc-600">{u.messages_7d} msgs/7d</div>
                          )}
                        </td>
                        {/* Activity */}
                        <td className="px-4 py-3.5 text-xs text-zinc-500">
                          {fmtDate(u.created_at)}
                        </td>
                        {/* Last login */}
                        <td className="px-4 py-3.5 text-xs text-zinc-500">
                          {fmtDate(u.last_login)}
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3.5">
                          {u.suspended
                            ? <span className="inline-flex items-center gap-1 text-xs text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Suspendido</span>
                            : <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Activo</span>
                          }
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => impersonate(u)}
                              disabled={impersonating === u.id || u.suspended}
                              title="Acceder como este usuario"
                              className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md border border-white/8 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {impersonating === u.id ? '...' : 'Ver →'}
                            </button>
                            <button
                              onClick={() => toggleSuspend(u)}
                              title={u.suspended ? 'Reactivar cuenta' : 'Suspender cuenta'}
                              className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                                u.suspended
                                  ? 'bg-emerald-950 text-emerald-400 border-emerald-900 hover:bg-emerald-900'
                                  : 'bg-red-950 text-red-400 border-red-900 hover:bg-red-900'
                              }`}
                            >
                              {u.suspended ? 'Reactivar' : 'Suspender'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(usersData?.users ?? []).length === 0 && (
                  <div className="text-center py-16 text-zinc-600 text-sm">Sin resultados</div>
                )}
              </div>

              {/* Pagination */}
              {usersData && usersData.pages > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm text-zinc-500">
                  <span>Mostrando {((page - 1) * 50) + 1}–{Math.min(page * 50, usersData.total)} de {usersData.total}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 bg-zinc-900 border border-white/8 rounded-lg disabled:opacity-40 hover:bg-zinc-800 transition-colors"
                    >
                      ← Anterior
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(usersData.pages, p + 1))}
                      disabled={page === usersData.pages}
                      className="px-3 py-1.5 bg-zinc-900 border border-white/8 rounded-lg disabled:opacity-40 hover:bg-zinc-800 transition-colors"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CONNECTIONS ────────────────────────────────────────────────── */}
          {tab === 'connections' && connections && (
            <div className="px-8 py-7">
              <h1 className="text-xl font-semibold mb-1">Conexiones WhatsApp</h1>
              <p className="text-zinc-500 text-sm mb-7">
                {allConns.length} cuentas conectadas en total
              </p>

              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-4 mb-7">
                {[
                  { label: 'Evolution (QR)',  count: connections.evolution.length,  icon: '◈', color: 'text-green-400' },
                  { label: 'Meta Cloud API',  count: connections.meta.length,       icon: '◉', color: 'text-blue-400' },
                  { label: '360dialog',       count: connections.dialog360.length,  icon: '◑', color: 'text-violet-400' },
                  { label: 'Twilio',          count: connections.twilio.length,     icon: '◐', color: 'text-amber-400' },
                ].map(({ label, count, icon, color }) => (
                  <div key={label} className="bg-zinc-900 border border-white/5 rounded-xl p-4 flex items-center gap-3">
                    <span className={`text-xl ${color}`}>{icon}</span>
                    <div>
                      <div className="text-xl font-bold text-white">{count}</div>
                      <div className="text-xs text-zinc-500">{label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* All connections table */}
              <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Workspace', 'Owner', 'Proveedor', 'Número / ID', 'Estado', 'Conectado'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/3">
                    {allConns.map((c, i) => {
                      const isActive = c.is_active !== false && c.status !== 'disconnected';
                      const providerColor: Record<string, string> = {
                        evolution: 'text-green-400 bg-green-950 border-green-900',
                        meta:      'text-blue-400 bg-blue-950 border-blue-900',
                        '360dialog': 'text-violet-400 bg-violet-950 border-violet-900',
                        twilio:    'text-amber-400 bg-amber-950 border-amber-900',
                      };
                      return (
                        <tr key={i} className="hover:bg-white/2 transition-colors">
                          <td className="px-4 py-3 text-sm text-white">{c.workspace_name}</td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-zinc-300">{c.owner_name}</div>
                            <div className="text-xs text-zinc-600">{c.owner_email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block text-xs px-2 py-0.5 rounded-md border font-medium ${providerColor[c.provider] || 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
                              {c.provider}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-400 font-mono">
                            {c.phone_number || c.display_name || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <StatusDot active={isActive} label={isActive ? 'activo' : 'inactivo'} />
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500">{fmtDate(c.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {allConns.length === 0 && (
                  <div className="text-center py-16 text-zinc-600 text-sm">No hay conexiones activas</div>
                )}
              </div>
            </div>
          )}

          {/* ── ACTIVITY ───────────────────────────────────────────────────── */}
          {tab === 'activity' && (
            <div className="px-8 py-7">
              <h1 className="text-xl font-semibold mb-1">Actividad reciente</h1>
              <p className="text-zinc-500 text-sm mb-7">Últimos eventos del sistema</p>

              <div className="bg-zinc-900 border border-white/5 rounded-xl divide-y divide-white/3">
                {activity.map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                        a.type === 'signup'
                          ? 'bg-violet-950 border border-violet-900 text-violet-400'
                          : 'bg-blue-950 border border-blue-900 text-blue-400'
                      }`}>
                        {a.type === 'signup' ? '✦' : '◈'}
                      </div>
                      <div>
                        <div className="text-sm text-white">
                          {a.type === 'signup' ? (
                            <><span className="font-medium">{a.name}</span> <span className="text-zinc-500">se registró</span></>
                          ) : (
                            <><span className="text-zinc-500">Nuevo lead en</span> <span className="font-medium">{a.email}</span></>
                          )}
                        </div>
                        <div className="text-xs text-zinc-600 mt-0.5">{a.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      {a.meta && a.type === 'signup' && <PlanBadge plan={a.meta} />}
                      {a.meta && a.type === 'lead' && a.meta !== 'null' && (
                        <span className={`text-xs px-2 py-0.5 rounded-md border ${
                          a.meta === 'CALIENTE' ? 'bg-red-950 text-red-300 border-red-900' :
                          a.meta === 'TIBIO'    ? 'bg-amber-950 text-amber-300 border-amber-900' :
                          'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}>
                          {a.meta}
                        </span>
                      )}
                      <span className="text-xs text-zinc-600 w-20 text-right">{fmtDate(a.ts)}</span>
                    </div>
                  </div>
                ))}
                {activity.length === 0 && (
                  <div className="text-center py-16 text-zinc-600 text-sm">Sin actividad reciente</div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
