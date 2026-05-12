import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Perseo',
  description: 'Términos y condiciones de uso de PERSEO, el sistema de gestión de leads para campañas de WhatsApp desarrollado por MID Marketing.',
  openGraph: {
    title: 'Términos y Condiciones — Perseo',
    description: 'Condiciones de uso del servicio PERSEO por MID Marketing.',
    url: 'https://perseo.app/terms',
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

export default function TermsPage() {
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
                  ['#aceptacion', 'Aceptación'],
                  ['#servicio', 'Descripción del servicio'],
                  ['#cuenta', 'Cuentas de usuario'],
                  ['#uso-aceptable', 'Uso aceptable'],
                  ['#prohibiciones', 'Prohibiciones'],
                  ['#suscripcion', 'Suscripción y pagos'],
                  ['#cancelacion', 'Cancelación'],
                  ['#disponibilidad', 'Disponibilidad'],
                  ['#propiedad', 'Propiedad intelectual'],
                  ['#privacidad', 'Privacidad'],
                  ['#responsabilidad', 'Limitación de responsabilidad'],
                  ['#whatsapp', 'Términos de WhatsApp'],
                  ['#modificaciones', 'Modificaciones'],
                  ['#ley', 'Ley aplicable'],
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
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Términos y Condiciones</h1>
              <p className="text-white/35 text-sm">
                Última actualización: {lastUpdated} · Empresa: MID Marketing · Producto: PERSEO
              </p>
            </div>

            <div className="bg-[#141414] border border-white/8 rounded-2xl p-6 mb-10 text-sm text-white/55 leading-relaxed">
              Al registrarte y utilizar PERSEO, aceptás estos Términos y Condiciones en su totalidad.
              Si no estás de acuerdo con alguno de los términos aquí descritos, no debés utilizar el servicio.
              Leé este documento cuidadosamente antes de comenzar a usar la plataforma.
            </div>

            <Section id="aceptacion" title="1. Aceptación de los términos">
              <p>
                Estos Términos y Condiciones constituyen un acuerdo legal vinculante entre vos
                (el "Usuario") y <strong className="text-white/80">MID Marketing</strong>, titular del
                producto <strong className="text-white/80">PERSEO</strong> (el "Servicio"). Al crear una cuenta,
                acceder o utilizar el Servicio, declarás haber leído, comprendido y aceptado estos términos.
              </p>
              <p>
                Si actuás en nombre de una empresa u organización, declarás tener la autoridad para vincular
                a dicha entidad con estos términos.
              </p>
            </Section>

            <Section id="servicio" title="2. Descripción del servicio">
              <p>
                PERSEO es un sistema SaaS (Software as a Service) de <strong className="text-white/75">gestión y seguimiento de leads</strong> para
                campañas de WhatsApp. El servicio incluye, según el plan contratado:
              </p>
              <ul className="space-y-2 ml-4">
                {[
                  'Captura automática de leads provenientes de mensajes de WhatsApp',
                  'Clasificación y scoring de leads mediante inteligencia artificial (GPT-4o)',
                  'Organización de leads por campañas y anuncios',
                  'Dashboard de métricas y seguimiento comercial',
                  'Sincronización con Google Sheets',
                  'Conexión con WhatsApp Business API, Twilio y otros proveedores',
                  'Herramientas de seguimiento y conversión de leads',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-[#F5A623] shrink-0 mt-0.5">→</span>{item}
                  </li>
                ))}
              </ul>
              <p>
                PERSEO <strong className="text-white/75">no es un chatbot</strong>, no envía mensajes automáticos
                a los contactos, y no realiza automatizaciones de marketing. Es exclusivamente un sistema de
                inteligencia comercial y organización de leads.
              </p>
            </Section>

            <Section id="cuenta" title="3. Cuentas de usuario">
              <p>
                Para utilizar PERSEO debés crear una cuenta con una dirección de correo electrónico válida y
                una contraseña segura. Sos el único responsable de mantener la confidencialidad de tus
                credenciales de acceso.
              </p>
              <p>
                Una cuenta es personal e intransferible, salvo en los planes que explícitamente permiten
                múltiples usuarios (por ejemplo, el plan Agency). No podés compartir tu cuenta con terceros
                ni ceder el acceso a otros sin autorización expresa de MID Marketing.
              </p>
              <p>
                MID Marketing se reserva el derecho de suspender o eliminar cuentas que incumplan estos
                términos, sin previo aviso y sin derecho a reembolso en casos de infracción comprobada.
              </p>
            </Section>

            <Section id="uso-aceptable" title="4. Uso aceptable del servicio">
              <p>El Usuario se compromete a utilizar PERSEO de forma lícita y ética, incluyendo:</p>
              <ul className="space-y-2 ml-4">
                {[
                  'Gestionar únicamente leads que hayan contactado voluntariamente a través de WhatsApp',
                  'Respetar la privacidad de los contactos y la legislación de protección de datos aplicable',
                  'Utilizar las integraciones (WhatsApp API, Google Sheets) solo con cuentas que tengas derecho a usar',
                  'No procesar datos de menores de edad sin autorización parental correspondiente',
                  'Mantener actualizadas las credenciales de integración de terceros',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-[#F5A623] shrink-0 mt-0.5">✓</span>{item}
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="prohibiciones" title="5. Usos prohibidos">
              <p>Queda expresamente prohibido:</p>
              <div className="bg-[#141414] border border-red-500/15 rounded-xl p-5 space-y-2">
                {[
                  'Usar el servicio para enviar spam o comunicaciones masivas no solicitadas',
                  'Cargar o procesar datos obtenidos mediante prácticas ilegales o sin consentimiento',
                  'Intentar acceder a cuentas o datos de otros usuarios',
                  'Realizar ingeniería inversa, descompilar o copiar el código fuente del sistema',
                  'Revender, sublicenciar o redistribuir el servicio sin autorización escrita de MID Marketing',
                  'Usar el servicio para actividades ilegales, fraudulentas o que violen derechos de terceros',
                  'Sobrecargar o atacar la infraestructura del servicio (DDoS, scraping masivo, etc.)',
                  'Intentar eludir las limitaciones del plan contratado mediante medios técnicos',
                  'Usar el sistema para procesar información de carácter sensible (salud, religión, filiación política) sin las medidas de seguridad adecuadas',
                ].map(item => (
                  <div key={item} className="flex items-start gap-2 text-sm text-white/55">
                    <span className="text-red-400 shrink-0 mt-0.5">✗</span>{item}
                  </div>
                ))}
              </div>
              <p>
                La violación de cualquiera de estas prohibiciones puede resultar en la suspensión inmediata
                de la cuenta sin derecho a reembolso.
              </p>
            </Section>

            <Section id="suscripcion" title="6. Suscripción y pagos">
              <p>
                PERSEO ofrece planes de suscripción mensual. Los precios están expresados en dólares estadounidenses (USD)
                e incluyen los impuestos aplicables según la legislación vigente.
              </p>
              <p>
                Los pagos se procesan de forma segura a través de <strong className="text-white/75">Stripe</strong>.
                MID Marketing no almacena información de tarjetas de crédito. Al suscribirte, autorizás
                el cobro automático mensual por el plan elegido.
              </p>
              <p>
                Si un pago falla, el servicio puede ser limitado o suspendido tras un período de gracia de 7 días.
                Recibirás notificación por correo electrónico antes de cualquier suspensión.
              </p>
              <div className="bg-[#141414] border border-white/8 rounded-xl p-4 text-xs text-white/40">
                Los precios pueden modificarse con un preaviso de 30 días por correo electrónico a los usuarios activos.
                Los planes anuales (si estuvieran disponibles) se bloquean al precio del momento de contratación.
              </div>
            </Section>

            <Section id="cancelacion" title="7. Cancelación y reembolsos">
              <p>
                Podés cancelar tu suscripción en cualquier momento desde el panel de configuración de tu cuenta
                o contactando a <a href="mailto:perseo@midmarketing.com.ar" className="text-[#F5A623] hover:underline">perseo@midmarketing.com.ar</a>.
              </p>
              <p>
                La cancelación es efectiva al final del período de facturación vigente. No realizamos reembolsos
                proporcionales por períodos no utilizados dentro del ciclo de facturación activo, salvo en
                circunstancias excepcionales evaluadas caso a caso.
              </p>
              <p>
                <strong className="text-white/75">Plan Free:</strong> No requiere cancelación. Podés eliminar
                tu cuenta desde la configuración en cualquier momento.
              </p>
              <p>
                Tras la cancelación, tus datos permanecerán disponibles durante 30 días para que puedas
                exportarlos. Pasado ese plazo, se procederá a la eliminación permanente.
              </p>
            </Section>

            <Section id="disponibilidad" title="8. Disponibilidad del servicio">
              <p>
                MID Marketing realiza esfuerzos razonables para mantener PERSEO disponible las 24 horas,
                los 7 días de la semana. Sin embargo, no garantizamos una disponibilidad del 100%.
              </p>
              <p>
                Pueden ocurrir interrupciones por mantenimiento programado, actualizaciones del sistema,
                fallas de terceros (proveedores de cloud, Meta API, Twilio) o causas de fuerza mayor.
                Comunicaremos los mantenimientos programados con anticipación cuando sea posible.
              </p>
              <p>
                MID Marketing no será responsable por pérdidas o daños derivados de interrupciones del
                servicio fuera de su control directo.
              </p>
            </Section>

            <Section id="propiedad" title="9. Propiedad intelectual">
              <p>
                Todo el código, diseño, marca, nombre, logotipo, documentación y materiales de PERSEO son
                propiedad exclusiva de <strong className="text-white/75">MID Marketing</strong> y están
                protegidos por las leyes de propiedad intelectual aplicables.
              </p>
              <p>
                El Usuario recibe una licencia limitada, no exclusiva, no transferible y revocable para
                usar el servicio únicamente según lo permitido por estos términos. No se transfiere ningún
                derecho de propiedad al Usuario.
              </p>
              <p>
                Los datos que el Usuario carga o genera en PERSEO (leads, campañas, configuraciones) son
                de su propiedad. MID Marketing no reivindica ningún derecho sobre esos datos.
              </p>
            </Section>

            <Section id="privacidad" title="10. Privacidad y protección de datos">
              <p>
                El tratamiento de datos personales se rige por nuestra{' '}
                <Link href="/privacy" className="text-[#F5A623] hover:underline">
                  Política de Privacidad
                </Link>
                , que forma parte integrante de estos Términos y Condiciones.
              </p>
              <p>
                El Usuario es el responsable de tratar los datos de sus leads (contactos) de forma
                conforme a la legislación aplicable de protección de datos personales (Ley 25.326 en
                Argentina y normativas equivalentes en otros países). PERSEO actúa como procesador de datos
                en nombre del Usuario.
              </p>
            </Section>

            <Section id="responsabilidad" title="11. Limitación de responsabilidad">
              <p>
                En la máxima medida permitida por la ley aplicable, MID Marketing no será responsable por:
              </p>
              <ul className="space-y-2 ml-4">
                {[
                  'Pérdida de datos ocasionada por errores del usuario o acceso no autorizado a su cuenta',
                  'Daños indirectos, incidentales, especiales o consecuentes',
                  'Interrupción del servicio causada por terceros (Meta, Twilio, Google, etc.)',
                  'Resultados comerciales (ventas, conversiones) derivados del uso de la plataforma',
                  'Pérdida de leads por configuraciones incorrectas del usuario',
                  'Cambios en las APIs de terceros que afecten la funcionalidad del servicio',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-white/30 shrink-0 mt-0.5">—</span>{item}
                  </li>
                ))}
              </ul>
              <p>
                La responsabilidad máxima de MID Marketing ante el Usuario, bajo cualquier circunstancia,
                se limita al monto pagado por el servicio en los últimos 3 meses.
              </p>
            </Section>

            <Section id="whatsapp" title="12. Cumplimiento con WhatsApp y Meta">
              <p>
                Al conectar un número de WhatsApp a través de PERSEO (ya sea mediante WhatsApp Cloud API
                o proveedores como Twilio), el Usuario acepta cumplir con:
              </p>
              <ul className="space-y-2 ml-4">
                {[
                  'Las Políticas de WhatsApp Business de Meta',
                  'Las Políticas de uso aceptable de Meta para desarrolladores',
                  'Los Términos del proveedor BSP que se utilice (Twilio, 360dialog, etc.)',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-[#F5A623] shrink-0 mt-0.5">→</span>{item}
                  </li>
                ))}
              </ul>
              <p>
                PERSEO utiliza únicamente las APIs oficiales de WhatsApp. El Usuario no debe usar la
                plataforma para enviar mensajes masivos, spam, o contenido que viole las políticas de Meta.
                El incumplimiento puede resultar en la suspensión del número de WhatsApp por parte de Meta,
                responsabilidad que recae exclusivamente en el Usuario.
              </p>
            </Section>

            <Section id="modificaciones" title="13. Modificaciones de los términos">
              <p>
                MID Marketing puede modificar estos Términos y Condiciones en cualquier momento. Las
                modificaciones significativas serán comunicadas a los usuarios activos por correo electrónico
                con al menos <strong className="text-white/75">15 días de anticipación</strong>.
              </p>
              <p>
                Si no aceptás los nuevos términos, podés cancelar tu suscripción antes de la fecha de vigencia.
                El uso continuado del servicio después de la fecha de vigencia implica la aceptación de los
                nuevos términos.
              </p>
            </Section>

            <Section id="ley" title="14. Ley aplicable y jurisdicción">
              <p>
                Estos Términos y Condiciones se rigen por las leyes de la <strong className="text-white/75">República Argentina</strong>.
                Para cualquier conflicto derivado del uso del servicio, las partes acuerdan someterse a la
                jurisdicción de los Tribunales Ordinarios de la Ciudad Autónoma de Buenos Aires, renunciando
                a cualquier otro fuero que pudiera corresponder.
              </p>
            </Section>

            <Section id="contacto" title="15. Contacto">
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
                  <p className="text-white/30 text-xs pt-2">
                    Para consultas legales, solicitudes de datos, o reportes de abuso, utilizá el correo indicado
                    con el asunto correspondiente.
                  </p>
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
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacidad</Link>
            <Link href="/terms" className="text-white/40 hover:text-white/60 transition-colors">Términos</Link>
            <a href="mailto:perseo@midmarketing.com.ar" className="hover:text-white/60 transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
