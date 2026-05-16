import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Eliminación de datos — Perseo',
  description: 'Instrucciones para solicitar la eliminación de tus datos personales de la plataforma Perseo.',
  openGraph: {
    title: 'Eliminación de datos — Perseo',
    description: 'Cómo solicitar la eliminación de tus datos en PERSEO.',
    url: 'https://perseo.midmarketing.com.ar/data-deletion',
  },
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-[#F5A623] tracking-tight">Perseo</Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors hidden sm:block">Ingresar</Link>
            <Link href="/register" className="text-sm bg-[#F5A623] hover:bg-[#d4880a] text-black font-semibold px-4 py-2 rounded-lg transition-all">
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-[#F5A623]/10 border border-[#F5A623]/20 text-[#F5A623] text-xs font-medium px-3 py-1.5 rounded-full mb-4">
            Documento legal
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Eliminación de datos</h1>
          <p className="text-white/35 text-sm">Instrucciones para solicitar la eliminación de tus datos personales en PERSEO</p>
        </div>

        <div className="space-y-8">

          {/* Intro */}
          <div className="bg-[#141414] border border-white/8 rounded-2xl p-6 text-sm text-white/55 leading-relaxed">
            En PERSEO respetamos tu derecho a la eliminación de datos. Si utilizaste el inicio de sesión
            con Facebook/Meta para conectar una cuenta de WhatsApp Business en nuestra plataforma, podés
            solicitar que eliminemos toda la información que almacenamos sobre vos.
          </div>

          {/* What we store */}
          <section>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-[#F5A623] rounded-full shrink-0" />
              ¿Qué datos almacenamos?
            </h2>
            <div className="bg-[#141414] border border-white/8 rounded-xl p-5 space-y-3 text-sm text-white/55">
              <div className="flex items-start gap-2">
                <span className="text-[#F5A623] shrink-0 mt-0.5">→</span>
                <span>Token de acceso de WhatsApp Business API (encriptado)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#F5A623] shrink-0 mt-0.5">→</span>
                <span>Identificador de tu cuenta de WhatsApp Business (WABA ID)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#F5A623] shrink-0 mt-0.5">→</span>
                <span>Número de teléfono vinculado y nombre de perfil de WhatsApp</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#F5A623] shrink-0 mt-0.5">→</span>
                <span>Leads y conversaciones registradas en tu cuenta de Perseo</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#F5A623] shrink-0 mt-0.5">→</span>
                <span>Datos del perfil de usuario (nombre, email, foto de Meta) si se usó Login con Facebook</span>
              </div>
            </div>
          </section>

          {/* How to request */}
          <section>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-[#F5A623] rounded-full shrink-0" />
              Cómo solicitar la eliminación
            </h2>
            <div className="space-y-4 text-sm text-white/55">

              <div className="bg-[#141414] border border-white/8 rounded-xl p-5">
                <p className="text-white/80 font-semibold mb-2">Opción 1 — Desde tu cuenta (recomendado)</p>
                <ol className="space-y-2 ml-4 list-decimal list-inside">
                  <li>Ingresá a tu cuenta en <a href="https://perseo.midmarketing.com.ar/login" className="text-[#F5A623] hover:underline">perseo.midmarketing.com.ar</a></li>
                  <li>Dirigite a <strong className="text-white/70">Configuración → Mi cuenta</strong></li>
                  <li>Hacé clic en <strong className="text-white/70">"Eliminar cuenta y datos"</strong></li>
                  <li>Confirmá la eliminación en el diálogo que aparece</li>
                </ol>
                <p className="mt-3 text-white/35 text-xs">La eliminación se procesa de forma inmediata e irreversible.</p>
              </div>

              <div className="bg-[#141414] border border-white/8 rounded-xl p-5">
                <p className="text-white/80 font-semibold mb-2">Opción 2 — Por correo electrónico</p>
                <p className="mb-3">
                  Enviá un email a{' '}
                  <a href="mailto:perseo@midmarketing.com.ar" className="text-[#F5A623] hover:underline">
                    perseo@midmarketing.com.ar
                  </a>{' '}
                  con el asunto <strong className="text-white/70">"Solicitud de eliminación de datos"</strong>.
                </p>
                <p>Incluí en el cuerpo del mensaje:</p>
                <ul className="space-y-1 ml-4 mt-2">
                  <li className="flex items-start gap-2">
                    <span className="text-[#F5A623] shrink-0">→</span>
                    El email con el que te registraste en Perseo
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#F5A623] shrink-0">→</span>
                    El número de teléfono de WhatsApp conectado (si aplica)
                  </li>
                </ul>
                <p className="mt-3 text-white/35 text-xs">
                  Procesamos las solicitudes en un plazo máximo de <strong className="text-white/50">30 días hábiles</strong>.
                  Recibirás una confirmación por email cuando tu información haya sido eliminada.
                </p>
              </div>
            </div>
          </section>

          {/* What gets deleted */}
          <section>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-[#F5A623] rounded-full shrink-0" />
              ¿Qué se elimina?
            </h2>
            <div className="text-sm text-white/55 space-y-3">
              <p>
                Al confirmar la eliminación, borramos de nuestros servidores:
              </p>
              <ul className="space-y-2 ml-4">
                {[
                  'Tu cuenta de usuario y credenciales de acceso',
                  'Todos los leads y conversaciones registradas',
                  'La conexión con WhatsApp Business (token revocado)',
                  'Configuración de campañas y plantillas',
                  'Cualquier integración activa (Google Sheets, etc.)',
                  'Datos de facturación y suscripción (conservamos solo lo requerido por ley impositiva)',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-[#F5A623] shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-white/35 text-xs border border-white/8 bg-[#141414] rounded-xl p-4">
                <strong className="text-white/50">Nota:</strong> La eliminación de datos en PERSEO no elimina
                automáticamente la información almacenada por Meta/WhatsApp en sus propios sistemas.
                Para gestionar tus datos en Meta, visitá{' '}
                <a href="https://www.facebook.com/help/contact/540977946302970" target="_blank" rel="noreferrer"
                  className="text-[#F5A623]/70 hover:text-[#F5A623]">
                  el centro de privacidad de Facebook →
                </a>
              </p>
            </div>
          </section>

          {/* Contact */}
          <div className="bg-[#141414] border border-white/8 rounded-2xl p-6">
            <p className="text-white/80 font-semibold mb-3">¿Tenés dudas?</p>
            <p className="text-sm text-white/55 mb-3">
              Contactanos en cualquier momento. Respondemos dentro de los 5 días hábiles.
            </p>
            <a href="mailto:perseo@midmarketing.com.ar"
              className="inline-flex items-center gap-2 text-sm text-[#F5A623] hover:underline">
              perseo@midmarketing.com.ar →
            </a>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-6 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/20">
          <Link href="/" className="text-[#F5A623] font-bold">Perseo</Link>
          <span>© {new Date().getFullYear()} MID Marketing</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-white/40 hover:text-white/60 transition-colors">Privacidad</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Términos</Link>
            <a href="mailto:perseo@midmarketing.com.ar" className="hover:text-white/60 transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
