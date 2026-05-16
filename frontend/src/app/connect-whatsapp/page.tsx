'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { api, MetaSession, EmbeddedSignupAccount } from '@/lib/api';

// ─── Config ──────────────────────────────────────────────────────────────────
const META_APP_ID      = process.env.NEXT_PUBLIC_META_APP_ID    || '1312384980822827';
const META_CONFIG_ID   = process.env.NEXT_PUBLIC_META_CONFIG_ID || '965883536321565';
const POPUP_W          = 660;
const POPUP_H          = 700;
const GRAPH_VERSION    = 'v22.0';

// ─── State machine ────────────────────────────────────────────────────────────
type Step =
  | { kind: 'idle' }
  | { kind: 'opening' }
  | { kind: 'waiting' }                                                  // popup open, waiting for callback
  | { kind: 'processing'; label: string }                                // calling our backend
  | { kind: 'pick_phone'; accounts: EmbeddedSignupAccount[]; token: string }
  | { kind: 'connected'; session: MetaSession }
  | { kind: 'manual'; prefillToken?: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildOAuthUrl(redirectUri: string, state: string): string {
  // Standard Facebook Login OAuth — does NOT require BSP/TP status.
  // Embedded Signup (config_id / extras.feature=whatsapp_embedded_signup) is
  // restricted to approved BSPs/TPs only; we use plain OAuth until approved.
  // The backend handles code → token exchange and WABA auto-detection regardless.
  const p = new URLSearchParams({
    client_id:     META_APP_ID,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'whatsapp_business_management,whatsapp_business_messaging,business_management',
    state,
  });
  console.log('[ConnectWA] OAuth URL:', `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${p.toString()}`);
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${p.toString()}`;
}

function openCenteredPopup(url: string): Window | null {
  const left = window.screenX + Math.round((window.outerWidth  - POPUP_W) / 2);
  const top  = window.screenY + Math.round((window.outerHeight - POPUP_H) / 2);
  return window.open(
    url,
    'meta_embedded_signup',
    `width=${POPUP_W},height=${POPUP_H},left=${left},top=${top},popup=1,scrollbars=yes,resizable=yes`
  );
}

function randomState(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ConnectWhatsAppPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [step,      setStep]      = useState<Step>({ kind: 'idle' });
  const [error,     setError]     = useState('');
  const [saving,    setSaving]    = useState(false);
  const [manualData, setManualData] = useState({
    phone_number_id: '', waba_id: '', access_token: '', phone_number: '', display_name: '',
  });

  const popupRef    = useRef<Window | null>(null);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef    = useRef('');

  // ── Auth guard + existing session ────────────────────────────────────────
  useEffect(() => {
    if (!localStorage.getItem('perseo_token')) { router.push('/login'); return; }
    api.whatsapp.meta.status()
      .then(r => { if (r.session) { setStep({ kind: 'connected', session: r.session }); } })
      .catch(() => {});
  }, [router]);

  // ── localStorage fallback (when popup wasn't really a popup) ─────────────
  useEffect(() => {
    const pending = localStorage.getItem('meta_oauth_pending');
    if (pending) {
      localStorage.removeItem('meta_oauth_pending');
      try {
        const data = JSON.parse(pending) as { type: string; code?: string; state?: string; message?: string };
        if (data.type === 'meta_oauth_code' && data.code) {
          console.log('[ConnectWA] localStorage fallback — processing pending code');
          void processCode(data.code);
        } else if (data.type === 'meta_oauth_error') {
          setError(data.message || 'Error en la autenticación con Meta.');
        }
      } catch {}
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Listen for postMessage from callback popup ────────────────────────────
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // Only accept messages from our own origin
      if (e.origin !== window.location.origin) return;

      const data = e.data as { type?: string; code?: string; state?: string; message?: string };
      if (!data?.type) return;

      console.log('[ConnectWA] postMessage received:', data.type);

      clearPoll();

      if (data.type === 'meta_oauth_code' && data.code) {
        // Verify CSRF state
        if (stateRef.current && data.state && data.state !== stateRef.current) {
          console.error('[ConnectWA] State mismatch — possible CSRF');
          setError('Error de seguridad (state mismatch). Intentá de nuevo.');
          setStep({ kind: 'idle' });
          return;
        }
        void processCode(data.code);
      } else if (data.type === 'meta_oauth_error') {
        setError(data.message || 'La autenticación con Meta falló.');
        setStep({ kind: 'idle' });
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Core: open OAuth popup ────────────────────────────────────────────────
  const handleConnectFacebook = useCallback(() => {
    setError('');

    if (!META_APP_ID) {
      setError('NEXT_PUBLIC_META_APP_ID no está configurado.');
      return;
    }

    const state       = randomState();
    stateRef.current  = state;
    const redirectUri = `${window.location.origin}/auth/meta/callback`;
    const url         = buildOAuthUrl(redirectUri, state);

    console.log('[ConnectWA] Opening OAuth popup:', url);
    setStep({ kind: 'opening' });

    const popup = openCenteredPopup(url);

    if (!popup || popup.closed) {
      setError('El popup fue bloqueado por el navegador. Habilitá los popups para este sitio e intentá de nuevo.');
      setStep({ kind: 'idle' });
      return;
    }

    popupRef.current = popup;
    setStep({ kind: 'waiting' });

    // Poll every 600ms to detect manual close
    pollRef.current = setInterval(() => {
      if (popup.closed) {
        clearPoll();
        setStep(s => (s.kind === 'waiting' || s.kind === 'opening') ? { kind: 'idle' } : s);
        console.log('[ConnectWA] Popup closed by user');
      }
    }, 600);
  }, []);

  function clearPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (popupRef.current && !popupRef.current.closed) { try { popupRef.current.close(); } catch {} }
  }

  // ── Process the OAuth code via backend ────────────────────────────────────
  async function processCode(code: string) {
    const redirectUri = `${window.location.origin}/auth/meta/callback`;
    console.log('[ConnectWA] Calling backend /meta/embedded-signup with code');
    setStep({ kind: 'processing', label: 'Verificando con Meta…' });

    try {
      const result = await api.whatsapp.meta.embeddedSignup({ code, redirect_uri: redirectUri });

      console.log('[ConnectWA] Backend result:', result.success, {
        auto: result.auto_connected,
        phones: result.accounts?.flatMap(a => a.phones).length,
        manual: result.needs_manual,
      });

      if (result.auto_connected && result.session) {
        setStep({ kind: 'connected', session: result.session });
        return;
      }
      if (result.needs_selection && result.accounts) {
        setStep({ kind: 'pick_phone', accounts: result.accounts, token: result.access_token! });
        return;
      }
      // Fallback: manual with pre-filled token
      setManualData(d => ({ ...d, access_token: result.access_token || '' }));
      setStep({ kind: 'manual', prefillToken: result.access_token });
      if (result.message) setError(result.message);
    } catch (err) {
      console.error('[ConnectWA] Backend error:', err);
      setError((err as Error).message);
      setStep({ kind: 'idle' });
    }
  }

  // ── Select phone after picker ─────────────────────────────────────────────
  async function handleSelectPhone(
    phone_number_id: string, waba_id: string, access_token: string,
    phone_number: string, display_name: string
  ) {
    setSaving(true); setError('');
    try {
      const r = await api.whatsapp.meta.selectPhone({ phone_number_id, waba_id, access_token, phone_number, display_name });
      setStep({ kind: 'connected', session: r.session! });
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  }

  // ── Manual form ───────────────────────────────────────────────────────────
  async function handleManualConnect(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const r = await api.whatsapp.meta.connect(manualData);
      setStep({ kind: 'connected', session: r.session });
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDisconnect() {
    setSaving(true); setError('');
    try {
      await api.whatsapp.meta.disconnect();
      setStep({ kind: 'idle' });
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Sub-components
  // ─────────────────────────────────────────────────────────────────────────
  const Header = ({ title, sub }: { title: string; sub?: string }) => (
    <div className="text-center mb-6">
      <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <WaIcon />
      </div>
      <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
      {sub && <p className="text-white/40 text-sm">{sub}</p>}
    </div>
  );

  const Spinner = ({ label }: { label: string }) => (
    <div className="flex items-center justify-center gap-2 py-3 text-white/35 text-sm">
      <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      {label}
    </div>
  );

  const ErrorBanner = () => error ? (
    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4 flex items-start gap-2">
      <span className="mt-0.5 flex-shrink-0">⚠</span>
      <span>{error}</span>
    </div>
  ) : null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 flex items-center justify-center">
        <div className="w-full max-w-lg space-y-4">
          <div className="bg-[#141414] border border-white/8 rounded-2xl p-8">

            {/* ── IDLE ── */}
            {step.kind === 'idle' && (
              <>
                <Header title="WhatsApp Business" sub="Número real, sin QR, sin cortes. API oficial de Meta." />
                <ErrorBanner />
                <div className="space-y-3">

                  <button
                    onClick={handleConnectFacebook}
                    className="w-full bg-[#1877F2] hover:bg-[#1565d8] active:bg-[#1255c0] text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2.5 select-none"
                  >
                    <FbIcon />
                    Conectar con Facebook
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/8" />
                    <span className="text-white/20 text-xs">o</span>
                    <div className="flex-1 h-px bg-white/8" />
                  </div>

                  <button
                    onClick={() => { setError(''); setStep({ kind: 'manual' }); }}
                    className="w-full border border-white/10 hover:border-white/20 text-white/50 hover:text-white/70 text-sm py-2.5 rounded-xl transition-all"
                  >
                    Ingresar credenciales manualmente
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {[
                      'Sin escanear QR', 'No se desconecta',
                      'Número real', 'API oficial Meta',
                    ].map(t => (
                      <div key={t} className="flex items-center gap-1.5 text-xs text-white/30">
                        <span className="text-green-400">✓</span>{t}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── OPENING popup ── */}
            {(step.kind === 'opening') && (
              <>
                <Header title="Abriendo Meta…" />
                <Spinner label="Iniciando ventana de Facebook…" />
              </>
            )}

            {/* ── WAITING (popup open) ── */}
            {step.kind === 'waiting' && (
              <>
                <Header title="Completá el proceso en Facebook" sub="Se abrió una ventana de Meta. Seguí los pasos allí." />

                <div className="bg-[#1877F2]/8 border border-[#1877F2]/20 rounded-xl p-4 mb-5 text-sm text-white/60">
                  <p className="font-semibold text-white/80 mb-1">¿No ves la ventana?</p>
                  <p className="text-xs">Tu navegador puede haberla minimizado o bloqueado. Buscala en la barra de tareas o habilitá los popups para este sitio.</p>
                </div>

                <Spinner label="Esperando que completes el proceso…" />

                <button
                  onClick={() => { clearPoll(); setStep({ kind: 'idle' }); }}
                  className="w-full mt-4 text-xs text-white/20 hover:text-white/50 border border-white/8 py-2 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              </>
            )}

            {/* ── PROCESSING (backend call) ── */}
            {step.kind === 'processing' && (
              <>
                <Header title="Conectando…" sub="Detectando tu cuenta de WhatsApp Business." />
                <Spinner label={step.label} />
              </>
            )}

            {/* ── PICK PHONE ── */}
            {step.kind === 'pick_phone' && (
              <>
                <Header title="Elegí un número" sub="Encontramos varias cuentas. Seleccioná cuál conectar." />
                <ErrorBanner />
                <div className="space-y-2">
                  {step.accounts.map(acct =>
                    acct.phones.map(phone => (
                      <button
                        key={phone.phone_number_id}
                        disabled={saving}
                        onClick={() => handleSelectPhone(
                          phone.phone_number_id, acct.waba_id, step.token,
                          phone.phone_number, phone.verified_name,
                        )}
                        className="w-full text-left border border-white/10 hover:border-[#F5A623]/50 rounded-xl px-4 py-3.5 transition-all group disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-white font-semibold text-sm group-hover:text-[#F5A623] transition-colors truncate">
                              {phone.verified_name || acct.waba_name}
                            </p>
                            <p className="text-white/40 font-mono text-xs mt-0.5">{phone.phone_number}</p>
                            <p className="text-white/20 text-[10px] mt-0.5">{acct.waba_name}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            {phone.verified && <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Verificado</span>}
                            <span className="text-white/30 group-hover:text-[#F5A623] text-base transition-colors">→</span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <button
                  onClick={() => setStep({ kind: 'idle' })}
                  className="w-full mt-3 text-xs text-white/20 hover:text-white/50 py-2 transition-colors"
                >
                  ← Volver
                </button>
              </>
            )}

            {/* ── CONNECTED ── */}
            {step.kind === 'connected' && (
              <>
                <Header title="WhatsApp Business" />
                <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-5 mb-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-400 font-semibold text-sm">Conectado</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    {step.session.display_name && (
                      <Row label="Cuenta" value={step.session.display_name} />
                    )}
                    {step.session.phone_number && (
                      <Row label="Número" value={step.session.phone_number} />
                    )}
                    <Row label="Phone Number ID" value={step.session.phone_number_id} mono />
                  </div>
                </div>
                {error && <ErrorBanner />}
                <button
                  onClick={handleDisconnect}
                  disabled={saving}
                  className="w-full text-sm text-white/30 hover:text-white/60 border border-white/10 py-2.5 rounded-xl transition-all disabled:opacity-50"
                >
                  {saving ? 'Desconectando…' : 'Desconectar'}
                </button>
              </>
            )}

            {/* ── MANUAL FORM ── */}
            {step.kind === 'manual' && (
              <>
                <Header title="Conectar manualmente" sub="Ingresá los datos de tu cuenta de Meta Business." />
                <ErrorBanner />
                {step.prefillToken && (
                  <div className="bg-[#F5A623]/8 border border-[#F5A623]/20 text-[#F5A623]/70 text-xs px-3 py-2 rounded-xl mb-4 flex gap-2">
                    <span>✓</span>
                    <span>Token de Facebook detectado. Solo completá el Phone Number ID y WABA ID.</span>
                  </div>
                )}
                <form onSubmit={handleManualConnect} className="space-y-3">
                  {([
                    { key: 'phone_number_id', label: 'Phone Number ID *', ph: '1159481137238408' },
                    { key: 'waba_id',         label: 'WABA ID *',          ph: '1002415845870920' },
                    { key: 'access_token',    label: 'Access Token *',     ph: 'EAASpm3…' },
                    { key: 'phone_number',    label: 'Número (opcional)',   ph: '+54 9 11 2756-9518' },
                    { key: 'display_name',   label: 'Nombre (opcional)',   ph: 'Mi Negocio' },
                  ] as const).map(({ key, label, ph }) => (
                    <div key={key}>
                      <label className="block text-xs text-white/40 mb-1">{label}</label>
                      <input
                        type={key === 'access_token' ? 'password' : 'text'}
                        required={label.endsWith('*')}
                        placeholder={ph}
                        value={manualData[key]}
                        onChange={e => setManualData(d => ({ ...d, [key]: e.target.value }))}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/15 focus:outline-none focus:border-[#F5A623]/50"
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
                  onClick={() => { setError(''); setStep({ kind: 'idle' }); }}
                  className="w-full mt-3 text-xs text-white/20 hover:text-white/50 py-2 transition-colors"
                >
                  ← Volver
                </button>
              </>
            )}

          </div>

          {/* Help text */}
          {step.kind === 'idle' && (
            <p className="text-center text-white/18 text-xs">
              Necesitás una cuenta de{' '}
              <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white/40 transition-colors">
                Meta Business Manager
              </a>
              {' '}con WhatsApp Business Platform activo.
            </p>
          )}

          {/* Redirect URI info card (for Meta App config) */}
          {step.kind === 'idle' && META_APP_ID && (
            <div className="bg-[#141414] border border-white/5 rounded-xl px-4 py-3">
              <p className="text-white/25 text-xs mb-1 font-semibold uppercase tracking-wide">OAuth Redirect URI (Meta App)</p>
              <p className="text-white/50 font-mono text-xs break-all select-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/auth/meta/callback` : '/auth/meta/callback'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Small icon components ────────────────────────────────────────────────────
function WaIcon() {
  return (
    <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function FbIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-white/40 flex-shrink-0">{label}</span>
      <span className={`text-white/80 truncate text-right ${mono ? 'font-mono text-xs text-white/50' : 'font-medium'}`}>{value}</span>
    </div>
  );
}
