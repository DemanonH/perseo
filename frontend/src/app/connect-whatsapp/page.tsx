'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { api, MetaSession, EmbeddedSignupAccount } from '@/lib/api';

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || '1312384980822827';

// ─── FB SDK type declaration ──────────────────────────────────────────────────
declare global {
  interface Window {
    FB: {
      init: (opts: object) => void;
      login: (
        cb: (r: { authResponse?: { accessToken: string; userID: string } | null; status: string }) => void,
        opts: object
      ) => void;
      getLoginStatus: (cb: (r: { status: string; authResponse?: { accessToken: string } | null }) => void) => void;
    };
    fbAsyncInit?: () => void;
  }
}

// ─── Possible UI steps ────────────────────────────────────────────────────────
type Step =
  | { kind: 'sdk_loading' }
  | { kind: 'sdk_error'; reason: string }
  | { kind: 'idle' }                            // SDK ready, not connected
  | { kind: 'fb_opening' }                      // FB popup opening
  | { kind: 'processing' }                      // Calling our backend
  | { kind: 'pick_phone'; accounts: EmbeddedSignupAccount[]; access_token: string }
  | { kind: 'connected'; session: MetaSession }
  | { kind: 'manual'; access_token?: string };  // Manual form, optionally pre-filled token

// ─── Helpers ─────────────────────────────────────────────────────────────────
function FB_init() {
  try {
    window.FB.init({ appId: META_APP_ID, autoLogAppEvents: true, xfbml: false, version: 'v22.0' });
    return true;
  } catch {
    return false;
  }
}

export default function ConnectWhatsAppPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: 'sdk_loading' });
  const [manualData, setManualData] = useState({
    phone_number_id: '', waba_id: '', access_token: '', phone_number: '', display_name: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // ── Auth guard + existing session check ──────────────────────────────────
  useEffect(() => {
    if (!localStorage.getItem('perseo_token')) { router.push('/login'); return; }
    api.whatsapp.meta.status()
      .then(r => { if (r.session) setStep({ kind: 'connected', session: r.session }); })
      .catch(() => {});
  }, [router]);

  // ── Load Facebook SDK ─────────────────────────────────────────────────────
  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval>;
    let timeoutTimer: ReturnType<typeof setTimeout>;

    function markReady() {
      clearInterval(pollTimer);
      clearTimeout(timeoutTimer);
      FB_init();
      setStep(s => s.kind === 'sdk_loading' ? { kind: 'idle' } : s);
    }

    // Case 1: FB already available (SPA back-navigation)
    if (typeof window !== 'undefined' && window.FB) {
      markReady();
      return;
    }

    // Set the async init callback BEFORE injecting the script
    window.fbAsyncInit = () => { markReady(); };

    // Inject script only once per page lifetime
    if (!document.getElementById('facebook-jssdk')) {
      const s = document.createElement('script');
      s.id = 'facebook-jssdk';
      s.src = 'https://connect.facebook.net/en_US/sdk.js';
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.onerror = () => {
        clearInterval(pollTimer);
        clearTimeout(timeoutTimer);
        setStep(s2 => s2.kind === 'sdk_loading'
          ? { kind: 'sdk_error', reason: 'No se pudo cargar el SDK de Facebook. Revisá tu conexión o el bloqueador de anuncios.' }
          : s2
        );
      };
      document.head.appendChild(s);
    }

    // Polling fallback (handles cases where fbAsyncInit doesn't fire — e.g. script already in DOM)
    let attempts = 0;
    pollTimer = setInterval(() => {
      if (typeof window !== 'undefined' && window.FB) { markReady(); return; }
      if (++attempts > 60) { // 12 s
        clearInterval(pollTimer);
        setStep(s2 => s2.kind === 'sdk_loading'
          ? { kind: 'sdk_error', reason: 'Facebook SDK tardó demasiado. Intentá recargar la página.' }
          : s2
        );
      }
    }, 200);

    timeoutTimer = setTimeout(() => {
      clearInterval(pollTimer);
      setStep(s2 => s2.kind === 'sdk_loading'
        ? { kind: 'sdk_error', reason: 'Facebook SDK no respondió. Verificá que connect.facebook.net no esté bloqueado.' }
        : s2
      );
    }, 15000);

    return () => { clearInterval(pollTimer); clearTimeout(timeoutTimer); };
  }, []);

  // ── Embedded Signup click ─────────────────────────────────────────────────
  const handleEmbeddedSignup = useCallback(() => {
    if (!window.FB) {
      setStep({ kind: 'sdk_error', reason: 'Facebook SDK no está disponible. Recargá la página.' });
      return;
    }

    setStep({ kind: 'fb_opening' });

    window.FB.login(async (response) => {
      if (!response.authResponse?.accessToken) {
        // User closed/cancelled
        setStep({ kind: 'idle' });
        return;
      }

      const { accessToken } = response.authResponse;
      setStep({ kind: 'processing' });

      try {
        const result = await api.whatsapp.meta.embeddedSignup(accessToken);

        if (result.auto_connected && result.session) {
          setStep({ kind: 'connected', session: result.session });
          return;
        }

        if (result.needs_selection && result.accounts) {
          setStep({ kind: 'pick_phone', accounts: result.accounts, access_token: accessToken });
          return;
        }

        // Fallback to manual, pre-fill the access token
        setStep({ kind: 'manual', access_token: accessToken });
        setManualData(d => ({ ...d, access_token: accessToken }));
      } catch (err) {
        setStep({ kind: 'manual', access_token: accessToken });
        setManualData(d => ({ ...d, access_token: accessToken }));
      }
    }, {
      scope: 'whatsapp_business_management,whatsapp_business_messaging',
      extras: {
        feature:  'whatsapp_embedded_signup',
        setup:    {},
      },
    });
  }, []);

  // ── Select a specific phone after account picker ──────────────────────────
  async function handleSelectPhone(
    phone_number_id: string, waba_id: string, access_token: string,
    phone_number: string, display_name: string
  ) {
    setSaving(true); setSaveError('');
    try {
      const r = await api.whatsapp.meta.selectPhone({ phone_number_id, waba_id, access_token, phone_number, display_name });
      setStep({ kind: 'connected', session: r.session! });
    } catch (err) { setSaveError((err as Error).message); }
    finally { setSaving(false); }
  }

  // ── Manual form submit ────────────────────────────────────────────────────
  async function handleManualConnect(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveError('');
    try {
      const r = await api.whatsapp.meta.connect(manualData);
      setStep({ kind: 'connected', session: r.session });
    } catch (err) { setSaveError((err as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDisconnect() {
    setSaving(true);
    try { await api.whatsapp.meta.disconnect(); setStep({ kind: 'idle' }); }
    catch (err) { setSaveError((err as Error).message); }
    finally { setSaving(false); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  function WhatsAppIcon() {
    return (
      <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 flex items-center justify-center">
        <div className="w-full max-w-lg">
          <div className="bg-[#141414] border border-white/8 rounded-2xl p-8">

            {/* ── SDK Loading ── */}
            {step.kind === 'sdk_loading' && (
              <div className="text-center">
                <WhatsAppIcon />
                <h2 className="text-xl font-bold text-white mb-1">WhatsApp Business</h2>
                <p className="text-white/40 text-sm mb-6">Cargando Facebook SDK…</p>
                <div className="flex items-center justify-center gap-2 text-white/30 text-sm">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Iniciando…
                </div>
              </div>
            )}

            {/* ── SDK Error ── */}
            {step.kind === 'sdk_error' && (
              <div className="text-center">
                <WhatsAppIcon />
                <h2 className="text-xl font-bold text-white mb-1">WhatsApp Business</h2>
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4 text-left">
                  <p className="font-semibold mb-1">No se pudo cargar el SDK de Facebook</p>
                  <p className="text-red-400/70 text-xs">{step.reason}</p>
                </div>
                <button
                  onClick={() => { setStep({ kind: 'sdk_loading' }); window.location.reload(); }}
                  className="w-full bg-white/8 hover:bg-white/12 text-white font-semibold py-2.5 rounded-xl transition-all mb-3"
                >
                  Reintentar
                </button>
                <button
                  onClick={() => setStep({ kind: 'manual' })}
                  className="w-full border border-white/10 hover:border-white/20 text-white/50 hover:text-white/70 text-sm py-2.5 rounded-xl transition-all"
                >
                  Conectar manualmente con token
                </button>
              </div>
            )}

            {/* ── Idle (SDK ready, show connect button) ── */}
            {step.kind === 'idle' && (
              <div>
                <div className="text-center mb-6">
                  <WhatsAppIcon />
                  <h2 className="text-xl font-bold text-white mb-1">WhatsApp Business</h2>
                  <p className="text-white/40 text-sm">Número real, sin QR, sin cortes. API oficial de Meta.</p>
                </div>

                {saveError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{saveError}</div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={handleEmbeddedSignup}
                    className="w-full bg-[#1877F2] hover:bg-[#1565d8] text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2.5"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Conectar con Facebook
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/8" />
                    <span className="text-white/25 text-xs">o</span>
                    <div className="flex-1 h-px bg-white/8" />
                  </div>

                  <button
                    onClick={() => setStep({ kind: 'manual' })}
                    className="w-full border border-white/10 hover:border-white/20 text-white/50 hover:text-white/70 text-sm py-2.5 rounded-xl transition-all"
                  >
                    Ingresar token manualmente
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {[
                      { icon: '✓', text: 'Sin escanear QR' },
                      { icon: '✓', text: 'No se desconecta' },
                      { icon: '✓', text: 'Número real' },
                      { icon: '✓', text: 'API oficial Meta' },
                    ].map((b, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-white/35">
                        <span className="text-green-400 font-bold">{b.icon}</span>{b.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── FB popup opening ── */}
            {step.kind === 'fb_opening' && (
              <div className="text-center py-4">
                <WhatsAppIcon />
                <h2 className="text-xl font-bold text-white mb-2">Abriendo Facebook…</h2>
                <p className="text-white/40 text-sm mb-6">Completá el inicio de sesión en la ventana emergente.</p>
                <div className="flex items-center justify-center gap-2 text-white/30 text-sm">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Esperando…
                </div>
                <button
                  onClick={() => setStep({ kind: 'idle' })}
                  className="mt-6 text-xs text-white/20 hover:text-white/40 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}

            {/* ── Processing (backend call) ── */}
            {step.kind === 'processing' && (
              <div className="text-center py-4">
                <WhatsAppIcon />
                <h2 className="text-xl font-bold text-white mb-2">Conectando…</h2>
                <p className="text-white/40 text-sm mb-6">Detectando tu cuenta de WhatsApp Business.</p>
                <div className="flex items-center justify-center gap-2 text-white/30 text-sm">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Verificando con Meta…
                </div>
              </div>
            )}

            {/* ── Pick phone (multiple accounts) ── */}
            {step.kind === 'pick_phone' && (
              <div>
                <div className="text-center mb-6">
                  <WhatsAppIcon />
                  <h2 className="text-xl font-bold text-white mb-1">Elegí un número</h2>
                  <p className="text-white/40 text-sm">Encontramos varias cuentas. Seleccioná cuál conectar.</p>
                </div>
                {saveError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{saveError}</div>
                )}
                <div className="space-y-2">
                  {step.accounts.map(acct =>
                    acct.phones.map(phone => (
                      <button
                        key={phone.phone_number_id}
                        disabled={saving}
                        onClick={() => handleSelectPhone(
                          phone.phone_number_id, acct.waba_id, step.access_token,
                          phone.phone_number, phone.verified_name
                        )}
                        className="w-full text-left border border-white/10 hover:border-[#F5A623]/40 rounded-xl px-4 py-3.5 transition-all group disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-semibold text-sm group-hover:text-[#F5A623] transition-colors">
                              {phone.verified_name || acct.waba_name}
                            </p>
                            <p className="text-white/40 text-xs font-mono mt-0.5">{phone.phone_number}</p>
                            <p className="text-white/20 text-[10px] mt-0.5">WABA: {acct.waba_name}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {phone.verified && <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Verificado</span>}
                            <span className="text-white/20 text-lg">→</span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <button
                  onClick={() => setStep({ kind: 'idle' })}
                  className="w-full mt-3 text-xs text-white/25 hover:text-white/50 transition-colors py-2"
                >
                  Cancelar
                </button>
              </div>
            )}

            {/* ── Connected ── */}
            {step.kind === 'connected' && (
              <div>
                <div className="text-center mb-5">
                  <WhatsAppIcon />
                  <h2 className="text-xl font-bold text-white mb-1">WhatsApp Business</h2>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 mb-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-400 font-semibold text-sm">Conectado</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {step.session.display_name && (
                      <div className="flex justify-between">
                        <span className="text-white/40">Cuenta</span>
                        <span className="text-white font-medium">{step.session.display_name}</span>
                      </div>
                    )}
                    {step.session.phone_number && (
                      <div className="flex justify-between">
                        <span className="text-white/40">Número</span>
                        <span className="text-white font-medium">{step.session.phone_number}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-white/40">Phone Number ID</span>
                      <span className="text-white/50 font-mono text-xs">{step.session.phone_number_id}</span>
                    </div>
                  </div>
                </div>
                {saveError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-xl mb-3">{saveError}</div>
                )}
                <button
                  onClick={handleDisconnect}
                  disabled={saving}
                  className="w-full text-sm text-white/30 hover:text-white/60 border border-white/10 py-2.5 rounded-xl transition-all disabled:opacity-50"
                >
                  {saving ? 'Desconectando…' : 'Desconectar'}
                </button>
              </div>
            )}

            {/* ── Manual form ── */}
            {step.kind === 'manual' && (
              <div>
                <div className="text-center mb-5">
                  <WhatsAppIcon />
                  <h2 className="text-xl font-bold text-white mb-1">Conectar manualmente</h2>
                  <p className="text-white/35 text-xs">Ingresá los datos de tu cuenta de Meta Business</p>
                </div>

                {saveError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{saveError}</div>
                )}

                {step.access_token && (
                  <div className="bg-[#F5A623]/8 border border-[#F5A623]/20 text-[#F5A623]/80 text-xs px-3 py-2 rounded-xl mb-4">
                    Token de Facebook detectado automáticamente. Solo ingresá el Phone Number ID y el WABA ID.
                  </div>
                )}

                <form onSubmit={handleManualConnect} className="space-y-3">
                  {[
                    { key: 'phone_number_id', label: 'Phone Number ID *', placeholder: '1159481137238408' },
                    { key: 'waba_id',         label: 'WABA ID *',          placeholder: '1002415845870920' },
                    { key: 'access_token',    label: 'Access Token *',     placeholder: 'EAASpm3...' },
                    { key: 'phone_number',    label: 'Número (opcional)',   placeholder: '+54 9 11 2756-9518' },
                    { key: 'display_name',   label: 'Nombre (opcional)',   placeholder: 'Mi Negocio' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="block text-xs text-white/40 mb-1">{label}</label>
                      <input
                        type={key === 'access_token' ? 'password' : 'text'}
                        required={label.endsWith('*')}
                        placeholder={placeholder}
                        value={manualData[key as keyof typeof manualData]}
                        onChange={e => setManualData(d => ({ ...d, [key]: e.target.value }))}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/50"
                      />
                    </div>
                  ))}

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold py-2.5 rounded-xl transition-all disabled:opacity-50"
                  >
                    {saving ? 'Conectando…' : 'Conectar'}
                  </button>
                </form>

                <button
                  onClick={() => { setSaveError(''); setStep({ kind: 'idle' }); }}
                  className="w-full mt-3 text-xs text-white/25 hover:text-white/50 transition-colors py-2"
                >
                  ← Volver
                </button>
              </div>
            )}

          </div>

          {/* Help text */}
          {(step.kind === 'idle' || step.kind === 'sdk_error') && (
            <p className="text-center text-white/20 text-xs mt-4">
              Necesitás una cuenta de{' '}
              <a
                href="https://business.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white/40"
              >
                Meta Business Manager
              </a>{' '}
              con WhatsApp Business Platform habilitado.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
