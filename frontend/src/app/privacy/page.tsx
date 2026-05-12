import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidad — Perseo',
  description: 'Política de privacidad de PERSEO, desarrollado por MID Marketing. Cómo recopilamos, usamos y protegemos tus datos.',
  openGraph: {
    title: 'Política de Privacidad — Perseo',
    description: 'Política de privacidad de PERSEO por MID Marketing.',
    url: 'https://perseo.app/privacy',
  },
};

const lastUpdated = '12 de mayo de 2025';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mb-10">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-[#F5A623] rounded-full shrink-0" />
        {title}
      </h2>
      <div className="text-white/55 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
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

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-[240px_1fr] gap-12">

          {/* Sidebar TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4">Contenido</p>
              <nav className="space-y-1 text-xs">
                {[
                  ['#intro', 'Introducción'],
                  ['#datos', 'Datos que recopilamos'],
                  ['#uso', 'Uso de los datos'],
                  ['#almacenamiento', 'Almacenamiento'],
                  ['#seguridad', 'Seguridad'],
                  ['#terceros', 'Servicios de terceros'],
                  ['#cookies', 'Cookies'],
                  ['#derechos', 'Derechos del usuario'],
                  ['#menores', 'Menores de edad'],
                  ['#cambios', 'Cambios a esta política'],
                  ['#contacto', 'Contacto'],
                ].map(([href, label]) => (
                  <a key={href as string} href={href as string}
                    className="block text-white/35 hover:text-white/70 py-1 pl-3 border-l border-white/10 hover:border-[#F5A623]/40 transition-all">
                    {label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main>
            {/* Header */}
            <div className="mb-12">
              <div className="inline-flex items-center gap-2 bg-[#F5A623]/10 border border-[#F5A623]/20 text-[#F5A623] text-xs font-medium px-3 py-1.5 rounded-full mb-4">
                Documento legal
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Política de Privacidad</h1>
              <p className="text-white/35 text-sm">
                Última actualización: {lastUpdated} · Empresa: MID Marketing · Producto: PERSEO
              </p>
            </div>

            <div className="bg-[#141414] border border-white/8 rounded-2xl p-6 mb-10 text-sm text-white/55 leading-relaxed">
              Tu privacidad es una prioridad para nosotros. Esta política explica de forma clara y transparente
              cómo PERSEO, desarrollado por MID Marketing, recopila, usa, almacena y protege
              la información de sus usuarios. Al utilizar el servicio, aceptás los términos descritos a continuación.
            </div>

            <Section id="intro" title="1. Introducción">
              <p>
                PERSEO es un sistema SaaS de gestión y seguimiento de leads para campañas de WhatsApp,
                desarrollado por <strong className="text-white/80">MID Marketing</strong>. Este documento
                describe cómo tratamos la información personal de los usuarios de la plataforma y
                de los contactos (leads) gestionados a través del servicio.
              </p>
              <p>
                Esta política se aplica a todos los usuarios de PERSEO y cumple con los estándares
                de privacidad requeridos por Meta (Facebook), WhatsApp Business API y las regulaciones
                aplicables en la República Argentina (Ley 25.326 de Protección de Datos Personales).
              </p>
            </Section>

            <Section id="datos" title="2. Datos que recopilamos">
              <p>Recopilamos los siguientes tipos de información:</p>

              <div className="bg-[#141414] border border-white/8 rounded-xl p-5 space-y-4">
                <div>
                  <p className="text-white/80 font-semibold mb-1">2.1 Datos de la cuenta del usuario</p>
                  <p>Nombre, dirección de correo electrónico, contraseña (almacenada cifrada), plan de suscripción y fecha de registro.</p>
                </div>
                <div className="border-t border-white/5 pt-4">
                  <p className="text-white/80 font-semibold mb-1">2.2 Datos de leads (contactos comerciales)</p>
                  <p>Número de teléfono de WhatsApp, nombre (cuando está disponible), mensajes enviados al número del usuario, campaña de origen, fecha y hora de contacto, clasificación de IA (score).</p>
                </div>
                <div className="border-t border-white/5 pt-4">
                  <p className="text-white/80 font-semibold mb-1">2.3 Datos de integración</p>
                  <p>Credenciales encriptadas de WhatsApp Business API (token de acceso), identificadores de Google Sheets (spreadsheet ID), y configuración de campañas.</p>
                </div>
                <div className="border-t border-white/5 pt-4">
                  <p className="text-white/80 font-semibold mb-1">2.4 Datos de uso y diagnóstico</p>
                  <p>Logs de actividad dentro de la plataforma, errores del sistema, métricas de uso (número de leads, campañas activas). No incluye datos de navegación ni tracking de terceros.</p>
                </div>
              </div>
            </Section>

            <Section id="uso" title="3. Uso de los datos">
              <p>Utilizamos los datos recopilados exclusivamente para:</p>
              <ul className="space-y-2 ml-4">
                {[
                  'Proveer y mejorar el servicio de PERSEO',
                  'Registrar y organizar los leads del usuario',
                  'Generar scoring automático de leads mediante inteligencia artificial',
                  'Sincronizar datos con Google Sheets cuando el usuario lo autoriza',
                  'Enviar notificaciones del servicio (no publicidad de terceros)',
                  'Procesar pagos a través de Stripe de forma segura',
                  'Resolver problemas técnicos y mejorar la estabilidad del sistema',
                  'Cumplir obligaciones legales aplicables',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-[#F5A623] shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-white/40 text-xs border border-white/8 bg-[#141414] rounded-xl p-4">
                <strong className="text-white/60">Importante:</strong> PERSEO no vende, alquila ni comparte los datos
                de los usuarios ni de sus leads con terceros con fines publicitarios o comerciales.
                Los datos son exclusivamente del usuario titular de la cuenta.
              </p>
            </Section>

            <Section id="almacenamiento" title="4. Almacenamiento y retención de datos">
              <p>
                Los datos se almacenan en servidores con alojamiento en infraestructura cloud segura.
                Las credenciales sensibles (tokens de API, auth tokens) se guardan cifradas en la base de datos
                y nunca se exponen en texto plano en logs ni respuestas de API.
              </p>
              <p>
                Los datos de una cuenta se conservan mientras la cuenta esté activa. Al cancelar la suscripción,
                el usuario puede solicitar la eliminación completa de sus datos enviando un correo a
                <a href="mailto:perseo@midmarketing.com.ar" className="text-[#F5A623] hover:underline ml-1">perseo@midmarketing.com.ar</a>.
                La eliminación se procesa en un plazo máximo de 30 días hábiles.
              </p>
              <p>
                Los datos de leads (números de teléfono, mensajes) son propiedad del usuario que los capturó.
                PERSEO actúa como procesador de datos, no como controlador de los datos de terceros.
              </p>
            </Section>

            <Section id="seguridad" title="5. Seguridad">
              <p>
                Implementamos medidas técnicas y organizativas para proteger la información:
              </p>
              <ul className="space-y-2 ml-4">
                {[
                  'Contraseñas almacenadas con hashing bcrypt (nunca en texto plano)',
                  'Tokens y credenciales de API cifrados en la base de datos',
                  'Comunicaciones HTTPS/TLS en todas las conexiones',
                  'Autenticación JWT con expiración para sesiones de usuario',
                  'Base de datos PostgreSQL con acceso restringido a red interna',
                  'Backups automáticos periódicos',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-[#F5A623] shrink-0 mt-0.5">→</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p>
                Aunque ningún sistema es 100% infalible, PERSEO aplica las mejores prácticas de seguridad
                para minimizar riesgos. En caso de detectar una brecha de seguridad que afecte datos de usuarios,
                notificaremos a los afectados dentro de las 72 horas de su detección.
              </p>
            </Section>

            <Section id="terceros" title="6. Servicios de terceros">
              <p>PERSEO se integra con los siguientes servicios externos. Cada uno tiene sus propias políticas de privacidad:</p>

              <div className="space-y-3">
                {[
                  {
                    name: 'Meta (WhatsApp Business API)',
                    desc: 'Utilizamos la API oficial de WhatsApp Cloud API de Meta para recibir y enviar mensajes. Los mensajes se procesan a través de la infraestructura de Meta. Al conectar un número, el usuario acepta también los Términos de WhatsApp Business.',
                    link: 'https://www.whatsapp.com/legal/business-policy',
                    linkText: 'Política de WhatsApp Business',
                  },
                  {
                    name: 'Google (Google Sheets API)',
                    desc: 'Cuando el usuario conecta su cuenta de Google, PERSEO accede únicamente a las planillas de cálculo autorizadas por el usuario para escribir datos de leads. No accedemos a otros archivos de Google Drive.',
                    link: 'https://policies.google.com/privacy',
                    linkText: 'Política de privacidad de Google',
                  },
                  {
                    name: 'Twilio (WhatsApp BSP)',
                    desc: 'Como opción alternativa de conexión, Twilio actúa como proveedor de servicio de WhatsApp Business (BSP). Los mensajes pueden ser procesados por la infraestructura de Twilio.',
                    link: 'https://www.twilio.com/en-us/legal/privacy',
                    linkText: 'Política de Twilio',
                  },
                  {
                    name: 'OpenAI / GPT-4o',
                    desc: 'Los textos de conversación son enviados a la API de OpenAI para generar el scoring de leads (clasificación Frío/Tibio/Caliente). No se envían datos identificativos adicionales. OpenAI no usa estos datos para entrenar modelos según su política de API.',
                    link: 'https://openai.com/policies/privacy-policy',
                    linkText: 'Política de OpenAI',
                  },
                  {
                    name: 'Stripe',
                    desc: 'Procesamos pagos a través de Stripe. PERSEO no almacena datos de tarjetas de crédito. Toda la información de pago es manejada directamente por Stripe bajo sus estándares PCI DSS.',
                    link: 'https://stripe.com/privacy',
                    linkText: 'Política de Stripe',
                  },
                ].map(service => (
                  <div key={service.name} className="bg-[#141414] border border-white/8 rounded-xl p-5">
                    <p className="text-white/80 font-semibold mb-2">{service.name}</p>
                    <p className="text-sm mb-2">{service.desc}</p>
                    <a href={service.link} target="_blank" rel="noreferrer noopener"
                      className="text-xs text-[#F5A623]/70 hover:text-[#F5A623] transition-colors">
                      {service.linkText} →
                    </a>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="cookies" title="7. Cookies y almacenamiento local">
              <p>
                PERSEO utiliza <strong className="text-white/75">almacenamiento local del navegador (localStorage)</strong> para
                mantener la sesión del usuario activa (token JWT). No utilizamos cookies de rastreo de terceros
                ni plataformas de analytics externas como Google Analytics o Hotjar.
              </p>
              <p>
                El token de sesión se elimina automáticamente al cerrar sesión o al expirar. No existe tracking
                de comportamiento ni perfilado de usuario con fines publicitarios.
              </p>
            </Section>

            <Section id="derechos" title="8. Derechos del usuario">
              <p>Como usuario de PERSEO, tenés derecho a:</p>
              <ul className="space-y-2 ml-4">
                {[
                  'Acceder a todos los datos que PERSEO tiene sobre tu cuenta',
                  'Corregir información incorrecta o desactualizada',
                  'Solicitar la eliminación completa de tu cuenta y datos asociados',
                  'Exportar tus datos de leads en formato CSV',
                  'Revocar el acceso a Google Sheets en cualquier momento desde la configuración',
                  'Desconectar tu número de WhatsApp y eliminar la sesión activa',
                  'Oponerte al procesamiento de tus datos (con la salvedad de que esto puede implicar la cancelación del servicio)',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-[#F5A623] shrink-0 mt-0.5">→</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p>
                Para ejercer cualquiera de estos derechos, contactanos a{' '}
                <a href="mailto:perseo@midmarketing.com.ar" className="text-[#F5A623] hover:underline">
                  perseo@midmarketing.com.ar
                </a>{' '}
                con el asunto "Derechos sobre mis datos". Respondemos en un plazo máximo de 10 días hábiles.
              </p>
            </Section>

            <Section id="menores" title="9. Menores de edad">
              <p>
                PERSEO es un servicio destinado exclusivamente a personas mayores de 18 años y/o empresas
                legalmente constituidas. No recopilamos conscientemente datos de menores de edad.
                Si detectamos que un usuario es menor de edad, procederemos a eliminar su cuenta y datos
                de manera inmediata.
              </p>
            </Section>

            <Section id="cambios" title="10. Cambios a esta política">
              <p>
                Podemos actualizar esta política de privacidad periódicamente para reflejar cambios en el servicio
                o en la legislación aplicable. Cuando realizemos cambios materiales, notificaremos a los usuarios
                registrados por correo electrónico con al menos 15 días de anticipación.
              </p>
              <p>
                La fecha de última actualización siempre estará visible al inicio de este documento. El uso
                continuado del servicio después de la notificación implica la aceptación de los cambios.
              </p>
            </Section>

            <Section id="contacto" title="11. Contacto">
              <div className="bg-[#141414] border border-white/8 rounded-2xl p-6">
                <p className="text-white/80 font-semibold mb-3">MID Marketing — PERSEO</p>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-white/35">Email: </span>
                    <a href="mailto:perseo@midmarketing.com.ar" className="text-[#F5A623] hover:underline">
                      perseo@midmarketing.com.ar
                    </a>
                  </p>
                  <p><span className="text-white/35">Producto: </span>PERSEO</p>
                  <p><span className="text-white/35">Empresa: </span>MID Marketing</p>
                </div>
              </div>
            </Section>

          </main>
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
