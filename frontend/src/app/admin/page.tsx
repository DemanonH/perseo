'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, AdminMetrics, AdminUser, AdminWorkspace } from '@/lib/api';
import { getToken } from '@/lib/api';

type Tab = 'metrics' | 'users' | 'workspaces';

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('metrics');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const user = (() => { try { return JSON.parse(localStorage.getItem('perseo_user') || '{}'); } catch { return {}; } })();
    if (!user.is_admin) { router.push('/dashboard'); return; }
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [m, u, w] = await Promise.all([
        api.admin.metrics(),
        api.admin.users(),
        api.admin.workspaces(),
      ]);
      setMetrics(m);
      setUsers(u.users);
      setWorkspaces(w);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  async function toggleSuspend(user: AdminUser) {
    try {
      const updated = await api.admin.suspendUser(user.id, !user.suspended);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, suspended: updated.suspended } : u));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error');
    }
  }

  async function changePlan(userId: string, plan_id: string) {
    try {
      await api.admin.updatePlan(userId, plan_id);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan_id } : u));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error');
    }
  }

  const filteredUsers = users.filter(u =>
    !search || u.email.toLowerCase().includes(search.toLowerCase()) || u.name.toLowerCase().includes(search.toLowerCase())
  );

  const planBadge = (plan: string) => {
    const colors: Record<string, string> = {
      free: 'bg-gray-100 text-gray-700',
      starter: 'bg-blue-100 text-blue-700',
      pro: 'bg-purple-100 text-purple-700',
      agency: 'bg-amber-100 text-amber-700',
    };
    return `inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[plan] || 'bg-gray-100 text-gray-600'}`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      Cargando panel de administración...
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-red-400">
      {error}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Panel de Administración</h1>
            <p className="text-gray-400 text-sm mt-1">Perseo SaaS — Vista de owner</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Volver al dashboard
          </button>
        </div>

        {/* Metrics cards */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Usuarios totales', value: metrics.total_users },
              { label: 'Workspaces', value: metrics.total_workspaces },
              { label: 'Leads totales', value: metrics.total_leads },
              { label: 'Nuevos usuarios (30d)', value: metrics.new_users_30d },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-3xl font-bold text-white">{value.toLocaleString()}</div>
                <div className="text-sm text-gray-400 mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-800">
          {(['metrics', 'users', 'workspaces'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {t === 'metrics' ? 'Resumen' : t === 'users' ? 'Usuarios' : 'Workspaces'}
            </button>
          ))}
        </div>

        {/* Users tab */}
        {tab === 'users' && (
          <div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar por email o nombre..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 w-80 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-left">
                    <th className="px-4 py-3 font-medium">Usuario</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Leads</th>
                    <th className="px-4 py-3 font-medium">Campañas</th>
                    <th className="px-4 py-3 font-medium">Creado</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{u.name}</div>
                        <div className="text-gray-400 text-xs">{u.email}</div>
                        {u.is_admin && <span className="text-xs text-amber-400">admin</span>}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.plan_id}
                          onChange={e => changePlan(u.id, e.target.value)}
                          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                        >
                          {['free', 'starter', 'pro', 'agency'].map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{u.lead_count}</td>
                      <td className="px-4 py-3 text-gray-300">{u.campaign_count}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(u.created_at).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-4 py-3">
                        {u.suspended
                          ? <span className="inline-block px-2 py-0.5 rounded text-xs bg-red-900/50 text-red-400">Suspendido</span>
                          : <span className="inline-block px-2 py-0.5 rounded text-xs bg-green-900/50 text-green-400">Activo</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleSuspend(u)}
                          className={`text-xs px-3 py-1 rounded transition-colors ${
                            u.suspended
                              ? 'bg-green-900/40 text-green-400 hover:bg-green-900/60'
                              : 'bg-red-900/40 text-red-400 hover:bg-red-900/60'
                          }`}
                        >
                          {u.suspended ? 'Reactivar' : 'Suspender'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-gray-500">No se encontraron usuarios</div>
              )}
            </div>
          </div>
        )}

        {/* Workspaces tab */}
        {tab === 'workspaces' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="px-4 py-3 font-medium">Workspace</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Miembros</th>
                  <th className="px-4 py-3 font-medium">Leads</th>
                  <th className="px-4 py-3 font-medium">Campañas</th>
                  <th className="px-4 py-3 font-medium">Creado</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map(w => (
                  <tr key={w.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{w.name}</td>
                    <td className="px-4 py-3">
                      <div className="text-white">{w.owner_name}</div>
                      <div className="text-gray-400 text-xs">{w.owner_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={planBadge(w.plan_id)}>{w.plan_id}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{w.member_count}</td>
                    <td className="px-4 py-3 text-gray-300">{w.lead_count}</td>
                    <td className="px-4 py-3 text-gray-300">{w.campaign_count}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(w.created_at).toLocaleDateString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {workspaces.length === 0 && (
              <div className="text-center py-12 text-gray-500">No hay workspaces</div>
            )}
          </div>
        )}

        {/* Metrics summary tab */}
        {tab === 'metrics' && metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Resumen de actividad</h3>
              <div className="space-y-3">
                {[
                  { label: 'Usuarios registrados', value: metrics.total_users },
                  { label: 'Workspaces activos', value: metrics.total_workspaces },
                  { label: 'Total de leads en el sistema', value: metrics.total_leads },
                  { label: 'Nuevos usuarios este mes', value: metrics.new_users_30d },
                  { label: 'Promedio de leads por workspace', value: metrics.total_workspaces > 0 ? Math.round(metrics.total_leads / metrics.total_workspaces) : 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-semibold text-white">{value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Distribución de planes</h3>
              {(() => {
                const dist: Record<string, number> = {};
                for (const u of users) {
                  dist[u.plan_id] = (dist[u.plan_id] || 0) + 1;
                }
                return Object.entries(dist).sort((a, b) => b[1] - a[1]).map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between py-2 border-b border-gray-800">
                    <span className={planBadge(plan)}>{plan}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(count / users.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-white font-medium w-8 text-right">{count}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
