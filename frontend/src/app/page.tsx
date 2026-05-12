import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Perseo — Convertí tus campañas de WhatsApp en un sistema medible',
  description: 'PERSEO organiza, clasifica y analiza automáticamente los leads que llegan desde tus campañas de WhatsApp. Scoring con IA, Google Sheets, métricas en tiempo real.',
  keywords: 'leads whatsapp, gestión leads, crm whatsapp, marketing digital, scoring leads, google sheets leads',
  openGraph: {
    title: 'Perseo — Convertí tus campañas de WhatsApp en un sistema medible',
    description: 'Organizá, clasificá y analizá automáticamente los leads de WhatsApp. Hecho para agencias y negocios que hacen Meta Ads.',
    url: 'https://perseo.app',
    siteName: 'Perseo',
    type: 'website',
  },
};

// ─── Dashboard Mockup Component ───────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="relative w-full max-w-3xl mx-auto mt-16 select-none">
      {/* Glow */}
      <div className="absolute inset-0 bg-[#F5A623]/5 blur-3xl rounded-3xl scale-110 pointer-events-none" />

      <div className="relative bg-[#111111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/8 bg-[#0d0d0d]">
          <span className="w-3 h-3 rounded-full bg-red-500/60" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <span className="w-3 h-3 rounded-full bg-green-500/60" />
          <div className="flex-1 mx-3 bg-white/5 rounded-md px-3 py-1 text-xs text-white/20">app.perseo.com/dashboard</div>
        </div>

        {/* Dashboard content */}
        <div className="flex">
          {/* Sidebar */}
          <div className="hidden sm:flex w-12 flex-col items-center gap-3 py-4 border-r border-white/5 bg-[#0d0d0d]">
            {['▣', '◈', '⬡', '◎', '⚙'].map((icon, i) => (
              <div key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${i === 0 ? 'bg-[#F5A623]/20 text-[#F5A623]' : 'text-white/20'}`}>
                {icon}
              </div>
            ))}
          </div>

          <div className="flex-1 p-4">
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Leads hoy', value: '47', color: 'text-[#F5A623]' },
                { label: 'Calientes 🔥', value: '12', color: 'text-emerald-400' },
                { label: 'Tasa respuesta', value: '84%', color: 'text-white' },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-3">
                  <p className="text-white/35 text-xs mb-1">{stat.label}</p>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Lead table */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden">
              <div className="grid grid-cols-4 gap-2 px-3 py-2 border-b border-white/5 text-xs text-white/25 uppercase tracking-wide">
                <span>Contacto</span><span>Campaña</span><span>Score</span><span>Hora</span>
              </div>
              {[
                { name: 'Valentina R.', camp: 'Mesas', score: 'CALIENTE', hora: '14:32', dot: 'bg-emerald-400' },
                { name: 'Marcos T.',    camp: 'Sillas', score: 'TIBIO',    hora: '14:18', dot: 'bg-yellow-400' },
                { name: '+549 11…',    camp: 'Promo',  score: 'FRÍO',     hora: '13:55', dot: 'bg-red-400' },
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 px-3 py-2.5 border-b border-white/4 text-xs">
                  <span className="text-white/70 font-medium truncate">{row.name}</span>
                  <span className="text-white/35 truncate">{row.camp}</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${row.dot}`} />
                    <span className={`font-medium ${row.dot === 'bg-emerald-400' ? 'text-emerald-400' : row.dot === 'bg-yellow-400' ? 'text-yellow-400' : 'text-red-400'}`}>{row.score}</span>
                  </span>
                  <span className="text-white/25">{row.hora}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sections data ─────────────────────────────────────────────────────────────
const benefits = [
  {
    icon: '⚡',
    title: 'Captura automática',
    desc: 'Cada mensaje a tu WhatsApp queda registrado con nombre, teléfono y campaña de origen. Sin formularios, sin pérdidas.',
    tag: 'Cero fricción',
  },
  {
    icon: '🤖',
    title: 'Scoring con IA',
    desc: 'GPT-4o analiza cada conversación y clasifica al lead como Frío, Tibio o Caliente. Con datos reales, sin opiniones.',
    tag: 'Powered by GPT-4o',
  },
  {
    icon: '📊',
    title: 'Google Sheets sync',
    desc: 'Tu equipo ve los leads actualizados en el sheet que ya usan. Colores, scoring y estado en tiempo real.',
    tag: 'Integración nativa',
  },
  {
    icon: '🎯',
    title: 'Multi-campaña',
    desc: 'Gestioná todos tus anuncios en un lugar. Sabé exactamente qué campaña genera más leads calientes.',
    tag: 'Meta Ads ready',
  },
  {
    icon: '📱',
    title: 'WhatsApp Business API',
    desc: 'Conectá tu número real de WhatsApp Business. Coexistencia con tu celular. Sin perder chats existentes.',
    tag: 'API oficial',
  },
  {
    icon: '📈',
    title: 'Dashboard en tiempo real',
    desc: 'Métricas de hoy, esta semana, este mes. Convertidos, calientes, tasa de respuesta. Todo en una pantalla.',
    tag: 'Reportes claros',
  },
];

const steps = [
  { n: '01', title: 'Creá tu cuenta', desc: 'Registro en 2 minutos. Sin tarjeta de crédito. Sin compromisos.' },
  { n: '02', title: 'Conectá tu WhatsApp', desc: 'Usamos WhatsApp Cloud API oficial. Tu número sigue funcionando normalmente en el celular.' },
  { n: '03', title: 'Configurá tus campañas', desc: 'Asignás keywords a cada anuncio o producto. Ej: "mesa" → Campaña Mesas. Automático desde ahí.' },
  { n: '04', title: 'Recibís leads organizados', desc: 'Cada consulta queda registrada, clasificada por IA y sincronizada con tu Google Sheets.' },
];

const metrics = [
  { value: '500+', label: 'Negocios activos' },
  { value: '98%', label: 'Leads capturados' },
  { value: '3×', label: 'Más cierres de venta' },
  { value: '10 min', label: 'Setup inicial' },
];

const plans = [
  {
    id: 'free', name: 'Free', price: '$0', period: '/mes',
    desc: 'Para explorar Perseo',
    features: ['50 leads / mes', '3 campañas', '1 WhatsApp', 'Dashboard básico'],
    cta: 'Empezar gratis', href: '/register', highlight: false, badge: null,
  },
  {
    id: 'starter', name: 'Starter', price: '$29', period: '/mes',
    desc: 'Para negocios en crecimiento',
    features: ['500 leads / mes', 'Campañas ilimitadas', '1 WhatsApp', 'Scoring IA diario', 'Google Sheets sync'],
    cta: 'Empezar ahora', href: '/register', highlight: true, badge: 'Más popular',
  },
  {
    id: 'pro', name: 'Pro', price: '$79', period: '/mes',
    desc: 'Para equipos de ventas',
    features: ['Leads ilimitados', 'Campañas ilimitadas', '3 números WhatsApp', 'Scoring IA diario', 'Soporte prioritario'],
    cta: 'Elegir Pro', href: '/register', highlight: false, badge: null,
  },
  {
    id: 'agency', name: 'Agency', price: '$199', period: '/mes',
    desc: 'Para agencias de marketing',
    features: ['Todo ilimitado', '10 números WhatsApp', 'Clientes separados', 'Branding personalizado', 'Onboarding guiado'],
    cta: 'Hablar con ventas', href: 'mailto:perseo@midmarketing.com.ar', highlight: false, badge: null,
  },
];

const testimonials = [
  {
    name: 'Martina G.',
    role: 'Agencia de muebles, Córdoba',
    text: 'En 3 días de usar Perseo ya tenía 47 leads ordenados y 8 ventas cerradas. Antes se me iba todo en WhatsApp.',
    avatar: 'MG',
  },
  {
    name: 'Diego F.',
    role: 'Inmobiliaria, Buenos Aires',
    text: 'La IA que clasifica leads es increíble. Mis vendedores solo llaman a los CALIENTES y la tasa de cierre se duplicó.',
    avatar: 'DF',
  },
  {
    name: 'Camila V.',
    role: 'E-commerce de indumentaria',
    text: 'Lo conecté con mi Google Sheets y ahora todo mi equipo ve los leads en tiempo real. Setup en 10 minutos.',
    avatar: 'CV',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">

      {/* ─── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#F5A623] tracking-tight">Perseo</span>
            <span className="hidden sm:inline text-xs text-white/20 border border-white/10 px-2 py-0.5 rounded-full">by MID Marketing</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/50">
            <a href="#beneficios" className="hover:text-white transition-colors">Beneficios</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a>
            <a href="#precios" className="hover:text-white transition-colors">Precios</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm text-white/50 hover:text-white transition-colors">
              Ingresar
            </Link>
            <Link href="/register"
              className="text-sm bg-[#F5A623] hover:bg-[#d4880a] text-black font-semibold px-4 py-2 rounded-lg transition-all">
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative px-6 pt-20 pb-8 overflow-hidden">
        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#F5A623]/8 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#F5A623]/10 border border-[#F5A623]/20 text-[#F5A623] text-xs font-medium px-3 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-[#F5A623] rounded-full animate-pulse" />
            500+ negocios ya capturan leads con Perseo
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight">
            Convertí tus campañas de<br />
            <span className="text-[#F5A623]">WhatsApp</span> en un sistema<br />
            medible.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-white/45 leading-relaxed max-w-2xl mx-auto">
            PERSEO organiza, clasifica y analiza automáticamente los leads
            que llegan desde tus campañas. Sin planillas manuales, sin leads perdidos.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
            <Link href="/register"
              className="w-full sm:w-auto bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold text-base px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-[#F5A623]/20">
              Empezar gratis — sin tarjeta →
            </Link>
            <a href="#como-funciona"
              className="w-full sm:w-auto text-white/55 hover:text-white border border-white/10 hover:border-white/20 text-base px-8 py-3.5 rounded-xl transition-all text-center">
              Ver cómo funciona
            </a>
          </div>
          <p className="mt-4 text-xs text-white/20">
            Setup en menos de 10 minutos · Integración con Meta Ads y Google Sheets
          </p>
        </div>

        {/* Dashboard preview */}
        <DashboardMockup />
      </section>

      {/* ─── Tech bar ────────────────────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-white/[0.02] px-6 py-5 mt-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs text-white/20 uppercase tracking-widest mb-4">Compatible con</p>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-2 text-xs text-white/25 font-medium uppercase tracking-widest">
            {['WhatsApp Cloud API', 'Meta Ads', 'Google Sheets', 'GPT-4o', 'Twilio', 'Stripe'].map(t => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Benefits ────────────────────────────────────────────────────────── */}
      <section id="beneficios" className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">Todo automático. Desde el primer mensaje.</h2>
            <p className="text-white/40 mt-3 text-lg">Configurás una vez, Perseo trabaja para siempre.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((b) => (
              <div key={b.title}
                className="group bg-[#141414] border border-white/8 rounded-2xl p-6 hover:border-[#F5A623]/25 hover:bg-[#161616] transition-all">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-2xl">{b.icon}</span>
                  <span className="text-xs text-[#F5A623]/60 border border-[#F5A623]/20 bg-[#F5A623]/5 px-2 py-0.5 rounded-full">
                    {b.tag}
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-2">{b.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Metrics ─────────────────────────────────────────────────────────── */}
      <section className="px-6 py-16 bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {metrics.map((m) => (
              <div key={m.label}>
                <p className="text-4xl font-bold text-[#F5A623]">{m.value}</p>
                <p className="text-white/40 text-sm mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────────────────────────── */}
      <section id="como-funciona" className="px-6 py-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">De 0 a capturando leads en 4 pasos</h2>
            <p className="text-white/40 mt-3">Sin tecnicismos. Sin llamadas de onboarding de 2 horas.</p>
          </div>
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={step.n}
                className="flex items-start gap-5 bg-[#141414] border border-white/8 rounded-2xl p-6 hover:border-white/15 transition-all">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/20 flex items-center justify-center">
                  <span className="text-[#F5A623] font-bold text-sm">{step.n}</span>
                </div>
                <div>
                  <p className="font-semibold text-white">{step.title}</p>
                  <p className="text-white/45 text-sm mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── For agencies ────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Para agencias y empresas</h2>
            <p className="text-white/40 mt-3">Perseo se adapta a tu estructura, sea 1 cliente o 50.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-[#141414] border border-white/8 rounded-2xl p-8">
              <div className="w-10 h-10 bg-[#F5A623]/10 rounded-xl flex items-center justify-center text-xl mb-5">🏢</div>
              <h3 className="text-lg font-bold text-white mb-3">Para empresas y negocios</h3>
              <ul className="space-y-2.5">
                {[
                  'Un dashboard para tu equipo comercial',
                  'Scoring automático para priorizar llamados',
                  'Google Sheets actualizado en tiempo real',
                  'Campañas separadas por producto o sucursal',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white/55">
                    <span className="text-[#F5A623] mt-0.5 shrink-0">✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#141414] border border-[#F5A623]/15 rounded-2xl p-8">
              <div className="w-10 h-10 bg-[#F5A623]/10 rounded-xl flex items-center justify-center text-xl mb-5">🎯</div>
              <h3 className="text-lg font-bold text-white mb-3">Para agencias de marketing</h3>
              <ul className="space-y-2.5">
                {[
                  'Cuentas separadas por cliente',
                  'Comprobá el ROI de cada campaña con datos',
                  'Reportes de leads para presentar resultados',
                  'White-label disponible en el plan Agency',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white/55">
                    <span className="text-[#F5A623] mt-0.5 shrink-0">✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ────────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Lo que dicen nuestros clientes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-[#141414] border border-white/8 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="text-[#F5A623] text-sm">★</span>
                    ))}
                  </div>
                  <p className="text-white/65 text-sm leading-relaxed mb-5">"{t.text}"</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F5A623]/20 text-[#F5A623] text-xs font-bold flex items-center justify-center">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-white/30 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────────────────────── */}
      <section id="precios" className="px-6 py-24 bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">Precios simples y transparentes</h2>
            <p className="text-white/40 mt-3 text-lg">Empezá gratis. Escalá cuando lo necesites.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <div key={plan.id}
                className={`relative rounded-2xl p-6 flex flex-col ${
                  plan.highlight
                    ? 'bg-[#F5A623]/8 border-2 border-[#F5A623]/35'
                    : 'bg-[#141414] border border-white/8'
                }`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#F5A623] text-black text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <p className="font-bold text-white text-lg">{plan.name}</p>
                <p className="text-white/35 text-xs mt-0.5 mb-4">{plan.desc}</p>
                <div className="mb-5 flex items-baseline gap-1">
                  <span className={`text-3xl font-bold ${plan.highlight ? 'text-[#F5A623]' : 'text-white'}`}>{plan.price}</span>
                  <span className="text-white/35 text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-white/55">
                      <span className="text-[#F5A623] shrink-0 mt-0.5">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href}
                  className={`text-sm font-semibold py-2.5 rounded-xl text-center transition-all ${
                    plan.highlight
                      ? 'bg-[#F5A623] hover:bg-[#d4880a] text-black'
                      : 'border border-white/12 text-white/60 hover:text-white hover:border-white/25'
                  }`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-white/25 text-xs mt-6">
            Todos los precios en USD. Facturación mensual. Cancelá cuando quieras.
          </p>
        </div>
      </section>

      {/* ─── Final CTA ───────────────────────────────────────────────────────── */}
      <section className="relative px-6 py-28 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[#F5A623]/4 blur-[80px] pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4">
            Tu próximo lead ya está llegando.<br />
            <span className="text-[#F5A623]">¿Lo vas a perder?</span>
          </h2>
          <p className="text-white/40 mb-8 text-lg">
            Cada consulta sin responder rápida es una venta que se va a la competencia.
          </p>
          <Link href="/register"
            className="inline-block bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold text-lg px-10 py-4 rounded-xl transition-all shadow-lg shadow-[#F5A623]/25">
            Empezar gratis ahora →
          </Link>
          <p className="mt-4 text-xs text-white/20">Sin tarjeta de crédito · Setup en 10 minutos</p>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-8 mb-8">
            <div>
              <span className="text-[#F5A623] font-bold text-lg">Perseo</span>
              <p className="text-white/25 text-xs mt-2 leading-relaxed">
                Sistema de inteligencia y seguimiento comercial para campañas de WhatsApp.
              </p>
              <p className="text-white/20 text-xs mt-2">by MID Marketing</p>
            </div>
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Producto</p>
              <ul className="space-y-2 text-xs text-white/30">
                <li><a href="#beneficios" className="hover:text-white/60 transition-colors">Beneficios</a></li>
                <li><a href="#como-funciona" className="hover:text-white/60 transition-colors">Cómo funciona</a></li>
                <li><a href="#precios" className="hover:text-white/60 transition-colors">Precios</a></li>
              </ul>
            </div>
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Acceso</p>
              <ul className="space-y-2 text-xs text-white/30">
                <li><Link href="/login" className="hover:text-white/60 transition-colors">Iniciar sesión</Link></li>
                <li><Link href="/register" className="hover:text-white/60 transition-colors">Registrarse</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Legal</p>
              <ul className="space-y-2 text-xs text-white/30">
                <li><Link href="/privacy" className="hover:text-white/60 transition-colors">Política de privacidad</Link></li>
                <li><Link href="/terms" className="hover:text-white/60 transition-colors">Términos y condiciones</Link></li>
                <li><a href="mailto:perseo@midmarketing.com.ar" className="hover:text-white/60 transition-colors">Contacto</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/20">
            <span>© {new Date().getFullYear()} MID Marketing. Todos los derechos reservados.</span>
            <span>PERSEO no es un chatbot. Es un sistema de inteligencia comercial.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
