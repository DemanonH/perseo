'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ServiceCheck {
  status: 'ok' | 'error' | 'checking';
  message: string;
  ms?: number;
}

interface HealthData {
  status: 'ok' | 'degraded' | 'checking';
  uptime_seconds: number;
  check_ms: number;
  version: string;
  environment: string;
  checks: {
    postgres: ServiceCheck;
    evolution: ServiceCheck;
    redis: ServiceCheck;
  };
  ts: string;
}

interface Stats {
  users: number; leads: number; campaigns: number; messages: number;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function formatUptime(seconds: number) {
  if (seconds < 60)   return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function StatusDot({ status }: { status: 'ok' | 'error' | 'checking' }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${
      status === 'ok'       ? 'bg-emerald-400' :
      status === 'checking' ? 'bg-yellow-400 animate-pulse' :
      'bg-red-400'
    }`} />
  );
}

function ServiceRow({ name, check }: { name: string; check: ServiceCheck }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <StatusDot status={check.status} />
        <span className="text-sm text-white font-medium">{name}</span>
      </div>
      <div className="flex items-center gap-3 text-right">
        <span className={`text-xs ${check.status === 'ok' ? 'text-emerald-400' : check.status === 'checking' ? 'text-yellow-400' : 'text-red-400'}`}>
          {check.message}
        </span>
        {check.ms !== undefined && (
          <span className="text-xs text-white/25 w-14 text-right">{check.ms}ms</span>
        )}
      </div>
    </div>
  );
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  async function check() {
    setLoading(true);
    try {
      const [hRes, sRes] = await Promise.all([
        fetch(`${API}/health/full`),
        fetch(`${API}/health/stats`),
      ]);
      if (hRes.ok) {
        setHealth(await hRes.json());
        setBackendOnline(true);
      } else {
        setBackendOnline(false);
      }
      if (sRes.ok) setStats(await sRes.json());
    } catch {
      setBackendOnline(false);
      setHealth(null);
    }
    setLastCheck(new Date());
    setLoading(false);
  }

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const allOk = health?.status === 'ok' && backendOnline;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-[#F5A623] font-bold text-lg">Perseo</Link>
            <p className="text-white/35 text-xs mt-0.5">System Health Check</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${
              loading ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' :
              allOk   ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                        'border-red-500/30 bg-red-500/10 text-red-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                loading ? 'bg-yellow-400 animate-pulse' :
                allOk   ? 'bg-emerald-400' : 'bg-red-400'
              }`} />
              {loading ? 'Verificando...' : allOk ? 'Sistema OK' : 'Problemas detectados'}
            </div>
            <button onClick={check} disabled={loading}
              className="text-xs text-white/40 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40">
              Actualizar
            </button>
          </div>
        </div>

        {/* Backend */}
        <div className="bg-[#141414] border border-white/8 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Backend API</h2>
            {health && (
              <span className="text-xs text-white/30">
                v{health.version} · {health.environment} · uptime {formatUptime(health.uptime_seconds)}
              </span>
            )}
          </div>
          <ServiceRow name="Backend Node.js"
            check={backendOnline === null ? { status: 'checking', message: 'Verificando...' } :
                   backendOnline ? { status: 'ok', message: `Online — ${health?.check_ms}ms total`, ms: health?.check_ms } :
                   { status: 'error', message: 'No se puede conectar' }} />
        </div>

        {/* Services */}
        <div className="bg-[#141414] border border-white/8 rounded-2xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-white mb-4">Servicios</h2>
          {loading && !health ? (
            <p className="text-white/30 text-sm text-center py-4">Verificando servicios...</p>
          ) : health ? (
            <>
              <ServiceRow name="PostgreSQL (Base de datos)" check={health.checks.postgres || { status: 'error', message: 'Sin datos' }} />
              <ServiceRow name="Evolution API (WhatsApp)"  check={health.checks.evolution || { status: 'error', message: 'Sin datos' }} />
              <ServiceRow name="Redis (Cache)"             check={health.checks.redis     || { status: 'error', message: 'Sin datos' }} />
            </>
          ) : (
            <ServiceRow name="Todos los servicios" check={{ status: 'error', message: 'Backend no disponible' }} />
          )}
        </div>

        {/* Integrations */}
        <div className="bg-[#141414] border border-white/8 rounded-2xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-white mb-4">Integraciones</h2>
          <ServiceRow name="Google Sheets"
            check={typeof window !== 'undefined' && localStorage.getItem('perseo_token')
              ? { status: 'ok', message: 'Token de sesión activo' }
              : { status: 'checking', message: 'Requiere autenticación' }} />
          <ServiceRow name="OpenAI API"
            check={{ status: 'ok', message: 'Configurada por usuario (se usa en scoring diario)' }} />
          <ServiceRow name="Stripe"
            check={{ status: 'ok', message: 'Opcional — configurable en .env' }} />
        </div>

        {/* Stats */}
        {stats && (
          <div className="bg-[#141414] border border-white/8 rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-semibold text-white mb-4">Datos en base de datos</h2>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Usuarios',   value: stats.users },
                { label: 'Leads',      value: stats.leads },
                { label: 'Campañas',   value: stats.campaigns },
                { label: 'Mensajes',   value: stats.messages },
              ].map(s => (
                <div key={s.label} className="text-center bg-white/3 rounded-xl py-3">
                  <p className="text-xl font-bold text-[#F5A623]">{s.value}</p>
                  <p className="text-xs text-white/35 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-[#141414] border border-white/8 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Accesos rápidos</h2>
          <div className="space-y-2">
            {[
              { label: 'App principal',         url: '/',           note: 'Landing page' },
              { label: 'Dashboard',             url: '/dashboard',  note: 'Requiere login' },
              { label: 'Cuenta demo',           url: '/login',      note: 'demo@perseo.app / demo1234' },
              { label: 'API Health (JSON)',      url: '/api/health/full', note: 'Raw JSON' },
              { label: 'Evolution API',         url: 'http://localhost:8080', note: 'Puerto 8080' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623]" />
                  <span className="text-sm text-white/70">{item.label}</span>
                  <span className="text-xs text-white/25">— {item.note}</span>
                </div>
                <a href={item.url} target={item.url.startsWith('http') ? '_blank' : undefined}
                  className="text-xs text-[#F5A623]/60 hover:text-[#F5A623] transition-colors font-mono">
                  {item.url}
                </a>
              </div>
            ))}
          </div>
        </div>

        {lastCheck && (
          <p className="text-center text-white/20 text-xs mt-5">
            Última verificación: {lastCheck.toLocaleTimeString('es-AR')} · Auto-actualiza cada 30s
          </p>
        )}
      </div>
    </div>
  );
}
