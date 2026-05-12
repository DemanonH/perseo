'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { api, Plan, Subscription } from '@/lib/api';

function fmt(cents: number) {
  if (cents === 0) return 'Gratis';
  return `$${cents / 100}/mes`;
}

const PLAN_ICONS: Record<string, string> = {
  free: '◇', starter: '◈', pro: '◉', agency: '◎',
};

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (!localStorage.getItem('perseo_token')) { router.push('/login'); return; }
    Promise.all([api.billing.plans(), api.billing.subscription()])
      .then(([p, s]) => { setPlans(p); setCurrentPlan(s.current_plan); setSubscription(s.subscription); })
      .finally(() => setLoading(false));

    if (searchParams.get('success')) { setMessage('¡Suscripción activada correctamente!'); setMessageType('success'); }
    if (searchParams.get('canceled')) { setMessage('El pago fue cancelado.'); setMessageType('error'); }
  }, [router, searchParams]);

  async function handleUpgrade(planId: string) {
    if (planId === 'free') return;
    setUpgrading(planId);
    try {
      const { url } = await api.billing.checkout(planId);
      window.location.href = url;
    } catch (err) {
      setMessage((err as Error).message);
      setMessageType('error');
    }
    setUpgrading(null);
  }

  async function handlePortal() {
    try {
      const { url } = await api.billing.portal();
      window.location.href = url;
    } catch (err) {
      setMessage((err as Error).message);
      setMessageType('error');
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-7">
          <div className="mb-7">
            <h1 className="text-xl font-bold text-white">Facturación</h1>
            <p className="text-xs text-white/35 mt-0.5">Gestión de plan y suscripción</p>
          </div>

          {message && (
            <div className={`mb-6 px-4 py-3 rounded-xl text-sm border ${
              messageType === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>{message}</div>
          )}

          {subscription && (
            <div className="bg-[#141414] border border-[#F5A623]/20 rounded-2xl p-5 mb-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Plan actual</p>
                  <p className="text-lg font-bold text-white capitalize">{subscription.plan_name || currentPlan}</p>
                  {subscription.current_period_end && (
                    <p className="text-xs text-white/30 mt-0.5">
                      Próxima renovación: {new Date(subscription.current_period_end).toLocaleDateString('es-AR')}
                    </p>
                  )}
                </div>
                <button onClick={handlePortal}
                  className="text-xs border border-white/15 text-white/60 hover:text-white hover:border-white/30 px-4 py-2 rounded-lg transition-all">
                  Administrar suscripción →
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-white/25 text-sm py-12 text-center">Cargando planes...</div>
          ) : (
            <div className="grid md:grid-cols-4 gap-4">
              {plans.map((plan) => {
                const isCurrent = plan.id === currentPlan;
                const isPopular = plan.id === 'starter';
                return (
                  <div key={plan.id} className={`rounded-2xl p-5 flex flex-col border transition-all ${
                    isCurrent ? 'border-[#F5A623]/40 bg-[#F5A623]/5' :
                    isPopular ? 'border-white/20 bg-[#141414]' : 'border-white/8 bg-[#141414]'
                  }`}>
                    {isPopular && !isCurrent && (
                      <span className="text-xs text-[#F5A623] font-semibold mb-2 uppercase tracking-wide">Más popular</span>
                    )}
                    {isCurrent && (
                      <span className="text-xs text-[#F5A623] font-semibold mb-2 uppercase tracking-wide">Plan actual</span>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[#F5A623] text-sm">{PLAN_ICONS[plan.id]}</span>
                      <p className="font-bold text-white">{plan.name}</p>
                    </div>
                    <p className="text-2xl font-bold text-white mb-4">{fmt(plan.price_monthly_cents)}</p>

                    <ul className="space-y-2 flex-1 mb-5">
                      {[
                        plan.max_leads_monthly === -1 ? 'Leads ilimitados' : `${plan.max_leads_monthly} leads/mes`,
                        plan.max_campaigns === -1 ? 'Campañas ilimitadas' : `${plan.max_campaigns} campañas`,
                        `${plan.max_whatsapp_sessions} WhatsApp${plan.max_whatsapp_sessions > 1 ? 's' : ''}`,
                        plan.ai_scoring ? 'Scoring IA diario' : 'Sin scoring IA',
                      ].map(f => (
                        <li key={f} className={`flex items-center gap-2 text-xs ${plan.ai_scoring || !f.startsWith('Sin') ? 'text-white/60' : 'text-white/25 line-through'}`}>
                          <span className={plan.ai_scoring || !f.startsWith('Sin') ? 'text-[#F5A623]' : 'text-white/20'}>✓</span> {f}
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <span className="text-xs text-center text-white/30 py-2.5">Plan activo</span>
                    ) : plan.id === 'free' ? (
                      <span className="text-xs text-center text-white/25 py-2.5">Plan gratuito</span>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={upgrading === plan.id}
                        className={`text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50 ${
                          isPopular
                            ? 'bg-[#F5A623] hover:bg-[#d4880a] text-black'
                            : 'border border-white/15 text-white/70 hover:text-white hover:border-white/30'
                        }`}
                      >
                        {upgrading === plan.id ? 'Redirigiendo...' : `Actualizar a ${plan.name}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 p-5 bg-[#141414] border border-white/8 rounded-2xl">
            <h3 className="text-sm font-semibold text-white mb-3">¿Necesitás algo personalizado?</h3>
            <p className="text-xs text-white/40 mb-3">
              Para agencias con múltiples clientes, white-label, o necesidades específicas, contactanos para armar un plan a medida.
            </p>
            <a href="mailto:hola@perseo.app" className="text-xs text-[#F5A623] hover:underline">
              hola@perseo.app →
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
