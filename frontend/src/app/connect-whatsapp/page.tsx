'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { api, MetaSession, Dialog360Session, TwilioSession } from '@/lib/api';

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || '1312384980822827';

// ─── Facebook SDK ────────────────────────────────────────────────────────────
declare global {
  interface Window {
    FB: {
      init: (opts: object) => void;
      login: (cb: (r: { authResponse?: { code: string } }) => void, opts: object) => void;
    };
    fbAsyncInit: () => void;
  }
}

function loadFbSdk() {
  if (document.getElementById('facebook-jssdk')) return;
  const script = document.createElement('script');
  script.id = 'facebook-jssdk';
  script.src = 'https://connect.facebook.net/en_US/sdk.js';
  script.async = true;
  script.defer = true;
  document.body.appendChild(script);
}

// ─── Tipos ───────────────────────────────────────────────────────────────────
type Tab = 'twilio' | 'dialog360' | 'meta' | 'qr';
type QrStatus = 'disconnected' | 'connecting' | 'connected';

export default function ConnectWhatsAppPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('twilio');

  // ── Twilio state ─────────────────────────────────────────────────────────
  const [twilioSession, setTwilioSession] = useState<TwilioSession | null>(null);
  const [twilioLoading, setTwilioLoading] = useState(false);
  const [twilioError,   setTwilioError]   = useState('');
  const [twilioData,    setTwilioData]    = useState({
    account_sid: '', auth_token: '', phone_number: '',
    phone_number_sid: '', display_name: '',
  });

  // ── 360dialog state ──────────────────────────────────────────────────────
  const [d360session, setD360session] = useState<Dialog360Session | null>(null);
  const [d360loading, setD360loading] = useState(false);
  const [d360error,   setD360error]   = useState('');
  const [d360manual,  setD360manual]  = useState(false);
  const [d360data,    setD360data]    = useState({ api_key: '', phone_number: '', display_name: '' });

  // ── Meta state ──────────────────────────────────────────────────────────
  const [metaSession, setMetaSession] = useState<MetaSession | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState('');
  const [sdkReady, setSdkReady] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualData, setManualData] = useState({ phone_number_id: '', waba_id: '', access_token: '', phone_number: '', display_name: '' });

  // ── QR (Evolution) state ─────────────────────────────────────────────────
  const [qrStatus, setQrStatus] = useState<QrStatus>('disconnected');
  const [qr, setQr] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState('');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!localStorage.getItem('perseo_token')) { router.push('/login'); return; }

    api.whatsapp.twilio.status().then(r => setTwilioSession(r.session)).catch(() => {});
    api.whatsapp.dialog360.status().then(r => setD360session(r.session)).catch(() => {});
    api.whatsapp.meta.status().then(r => setMetaSession(r.session)).catch(() => {});
    api.whatsapp.status().then(r => {
      setQrStatus(r.status as QrStatus);
      if (r.qr) setQr(r.qr);
    }).catch(() => {});

    window.fbAsyncInit = () => {
      window.FB.init({ appId: META_APP_ID, autoLogAppEvents: true, xfbml: true, version: 'v22.0' });
      setSdkReady(true);
    };
    loadFbSdk();
  }, [router]);

  // ── QR polling ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (qrStatus === 'connecting') {
      pollRef.current = setInterval(async () => {
        try {
          const r = await api.whatsapp.status();
          setQrStatus(r.status as QrStatus);
          if (r.qr) setQr(r.qr);
          if (r.status === 'connected') clearInterval(pollRef.current!);
        } catch {}
      }, 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [qrStatus]);

  // ── Twilio handlers ───────────────────────────────────────────────────────
  async function handleTwilioConnect(e: React.FormEvent) {
    e.preventDefault();
    setTwilioError(''); setTwilioLoading(true);
    try {
      const r = await api.whatsapp.twilio.connect(twilioData);
      setTwilioSession(r.session);
    } catch (err) { setTwilioError((err as Error).message); }
    finally { setTwilioLoading(false); }
  }

  async function handleTwilioDisconnect() {
    setTwilioLoading(true);
    try { await api.whatsapp.twilio.disconnect(); setTwilioSession(null); }
    catch (err) { setTwilioError((err as Error).message); }
    finally { setTwilioLoading(false); }
  }

  // ── 360dialog handlers ────────────────────────────────────────────────────
  async function handleD360OAuth() {
    setD360error(''); setD360loading(true);
    try {
      const { url } = await api.whatsapp.dialog360.connectUrl();
      window.open(url, '_blank', 'width=600,height=700');
    } catch { setD360error('Configurá DIALOG360_PARTNER_ID en el servidor primero.'); }
    finally { setD360loading(false); }
  }

  async function handleD360ManualConnect(e: React.FormEvent) {
    e.preventDefault();
    setD360error(''); setD360loading(true);
    try {
      const r = await api.whatsapp.dialog360.connect(d360data);
      setD360session(r.session);
      setD360manual(false);
    } catch (err) { setD360error((err as Error).message); }
    finally { setD360loading(false); }
  }

  async function handleD360Disconnect() {
    setD360loading(true);
    try { await api.whatsapp.dialog360.disconnect(); setD360session(null); }
    catch (err) { setD360error((err as Error).message); }
    finally { setD360loading(false); }
  }

  // ── Meta handlers ─────────────────────────────────────────────────────────
  const handleEmbeddedSignup = useCallback(() => {
    if (!sdkReady) { setMetaError('Facebook SDK aún no está listo, intentá en unos segundos.'); return; }
    setMetaError('');
    setMetaLoading(true);
    window.FB.login(async (response) => {
      if (!response.authResponse?.code) {
        setMetaLoading(false);
        setMetaError('Conectación cancelada o denegada.');
        return;
      }
      try {
        setMetaError('Flujo OAuth completado. Implementá el intercambio de código en el backend para producción.');
      } catch (err) { setMetaError((err as Error).message); }
      finally { setMetaLoading(false); }
    }, {
      scope: 'whatsapp_business_management,whatsapp_business_messaging',
      extras: { feature: 'whatsapp_embedded_signup', setup: {} },
    });
  }, [sdkReady]);

  async function handleManualConnect(e: React.FormEvent) {
    e.preventDefault();
    setMetaError(''); setMetaLoading(true);
    try {
      const r = await api.whatsapp.meta.connect(manualData);
      setMetaSession(r.session);
      setShowManual(false);
    } catch (err) { setMetaError((err as Error).message); }
    finally { setMetaLoading(false); }
  }

  async function handleMetaDisconnect() {
    setMetaLoading(true);
    try { await api.whatsapp.meta.disconnect(); setMetaSession(null); }
    catch (err) { setMetaError((err as Error).message); }
    finally { setMetaLoading(false); }
  }

  // ── QR handlers ──────────────────────────────────────────────────────────
  async function handleQrConnect() {
    setQrError(''); setQrLoading(true);
    try {
      const r = await api.whatsapp.connect();
      if (r.qr) setQr(r.qr);
      setQrStatus((r.status as QrStatus) || 'connecting');
    } catch (err) { setQrError((err as Error).message); }
    finally { setQrLoading(false); }
  }

  async function handleQrDisconnect() {
    try { await api.whatsapp.disconnect(); setQrStatus('disconnected'); setQr(null); }
    catch (err) { setQrError((err as Error).message); }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 flex items-center justify-center">
        <div className="w-full max-w-lg">

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-[#141414] border border-white/8 rounded-xl p-1">
            <button onClick={() => setTab('twilio')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tab === 'twilio' ? 'bg-[#F5A623] text-black' : 'text-white/40 hover:text-white/70'}`}>
              Twilio ⭐
            </button>
            <button onClick={() => setTab('dialog360')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tab === 'dialog360' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>
              360dialog
            </button>
            <button onClick={() => setTab('meta')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tab === 'meta' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>
              Meta Cloud
            </button>
            <button onClick={() => setTab('qr')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tab === 'qr' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>
              QR
            </button>
          </div>

          {/* ── TWILIO TAB ── */}
          {tab === 'twilio' && (
            <div className="bg-[#141414] border border-white/8 rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-[#F5A623]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">📞</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Twilio WhatsApp</h2>
                <p className="text-white/40 text-sm">Tu número sigue en el celular. Coexistencia real. Sin costo inicial.</p>
              </div>

              {twilioError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{twilioError}</div>
              )}

              {twilioSession ? (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-green-400 font-semibold">Conectado via Twilio</span>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      {twilioSession.display_name && (
                        <div className="flex justify-between">
                          <span className="text-white/40">Nombre</span>
                          <span className="text-white font-medium">{twilioSession.display_name}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-white/40">Número</span>
                        <span className="text-white font-medium">{twilioSession.phone_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Account SID</span>
                        <span className="text-white/50 font-mono text-xs">{twilioSession.account_sid.slice(0, 20)}...</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={handleTwilioDisconnect} disabled={twilioLoading}
                    className="w-full text-sm text-white/30 hover:text-white/60 border border-white/10 py-2.5 rounded-xl transition-all disabled:opacity-50">
                    Desconectar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleTwilioConnect} className="space-y-3">
                  {[
                    { key: 'account_sid',      label: 'Account SID',                placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', required: true,  type: 'text'     },
                    { key: 'auth_token',        label: 'Auth Token',                 placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',   required: true,  type: 'password' },
                    { key: 'phone_number',      label: 'Número de WhatsApp',         placeholder: '+14155238886',                       required: true,  type: 'text'     },
                    { key: 'phone_number_sid',  label: 'Phone Number SID (opcional, para webhook automático)', placeholder: 'PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', required: false, type: 'text' },
                    { key: 'display_name',      label: 'Nombre (opcional)',          placeholder: 'Mi Negocio',                        required: false, type: 'text'     },
                  ].map(({ key, label, placeholder, required, type }) => (
                    <div key={key}>
                      <label className="block text-xs text-white/40 mb-1">{label}</label>
                      <input type={type} required={required} placeholder={placeholder}
                        value={twilioData[key as keyof typeof twilioData]}
                        onChange={e => setTwilioData(d => ({ ...d, [key]: e.target.value }))}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/50" />
                    </div>
                  ))}

                  <button type="submit" disabled={twilioLoading}
                    className="w-full bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50">
                    {twilioLoading ? 'Conectando...' : 'Conectar con Twilio'}
                  </button>

                  <div className="mt-4 border-t border-white/8 pt-4 grid grid-cols-2 gap-2">
                    {['WhatsApp sigue en tu celular', 'Número existente', 'Coexistencia oficial', 'Sin costo inicial'].map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-white/40">
                        <span className="text-green-400 font-bold">✓</span>{t}
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-white/20 text-xs pt-1">
                    ~$0.005 USD/mensaje · <a href="https://www.twilio.com/whatsapp" target="_blank" rel="noreferrer" className="underline hover:text-white/40">twilio.com</a>
                  </p>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
                    <p className="text-blue-300/70 text-xs">
                      💡 Encontrás el <strong>Account SID</strong> y <strong>Auth Token</strong> en{' '}
                      <a href="https://console.twilio.com" target="_blank" rel="noreferrer" className="underline">console.twilio.com</a>.
                      El <strong>Phone Number SID</strong> (empieza con PN...) lo ves en Phone Numbers → Manage → Active Numbers.
                    </p>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── 360DIALOG TAB ── */}
          {tab === 'dialog360' && (
            <div className="bg-[#141414] border border-white/8 rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-[#F5A623]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">💬</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-1">360dialog</h2>
                <p className="text-white/40 text-sm">Tu número sigue en el celular. Coexistencia real con WhatsApp Business.</p>
              </div>

              {d360error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{d360error}</div>
              )}

              {d360session ? (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-green-400 font-semibold">Conectado via 360dialog</span>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      {d360session.display_name && (
                        <div className="flex justify-between">
                          <span className="text-white/40">Nombre</span>
                          <span className="text-white font-medium">{d360session.display_name}</span>
                        </div>
                      )}
                      {d360session.phone_number && (
                        <div className="flex justify-between">
                          <span className="text-white/40">Número</span>
                          <span className="text-white font-medium">{d360session.phone_number}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-white/40">Channel ID</span>
                        <span className="text-white/60 font-mono text-xs">{d360session.channel_id}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={handleD360Disconnect} disabled={d360loading}
                    className="w-full text-sm text-white/30 hover:text-white/60 border border-white/10 py-2.5 rounded-xl transition-all disabled:opacity-50">
                    Desconectar
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button onClick={handleD360OAuth} disabled={d360loading}
                    className="w-full bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    <span>💬</span>
                    {d360loading ? 'Abriendo...' : 'Conectar con 360dialog'}
                  </button>

                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-white/30 text-xs">o ingresá tu API key</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  <button onClick={() => setD360manual(!d360manual)}
                    className="w-full border border-white/10 hover:border-white/20 text-white/60 hover:text-white/80 text-sm py-2.5 rounded-xl transition-all">
                    {d360manual ? 'Ocultar' : 'Ingresar API key manualmente'}
                  </button>

                  {d360manual && (
                    <form onSubmit={handleD360ManualConnect} className="space-y-3 pt-2">
                      {[
                        { key: 'api_key', label: 'API Key de 360dialog', placeholder: 'abc123...', required: true, type: 'password' },
                        { key: 'phone_number', label: 'Número (opcional)', placeholder: '+54 9 11 2756-9518', required: false, type: 'text' },
                        { key: 'display_name', label: 'Nombre del negocio (opcional)', placeholder: 'Mi Negocio', required: false, type: 'text' },
                      ].map(({ key, label, placeholder, required, type }) => (
                        <div key={key}>
                          <label className="block text-xs text-white/40 mb-1">{label}</label>
                          <input type={type} required={required} placeholder={placeholder}
                            value={d360data[key as keyof typeof d360data]}
                            onChange={e => setD360data(d => ({ ...d, [key]: e.target.value }))}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/50" />
                        </div>
                      ))}
                      <button type="submit" disabled={d360loading}
                        className="w-full bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold py-2.5 rounded-xl transition-all disabled:opacity-50">
                        {d360loading ? 'Conectando...' : 'Conectar'}
                      </button>
                    </form>
                  )}

                  <div className="mt-4 border-t border-white/8 pt-4 grid grid-cols-2 gap-2">
                    {['WhatsApp sigue en tu celular', 'Número existente', 'Sin perder chats', 'Coexistencia oficial'].map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-white/40">
                        <span className="text-green-400 font-bold">✓</span>{t}
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-white/20 text-xs pt-1">~€4/mes por número · <a href="https://www.360dialog.com" target="_blank" rel="noreferrer" className="underline hover:text-white/40">360dialog.com</a></p>
                </div>
              )}
            </div>
          )}

          {/* ── META TAB ── */}
          {tab === 'meta' && (
            <div className="bg-[#141414] border border-white/8 rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-1">WhatsApp Business</h2>
                <p className="text-white/40 text-sm">Número real, sin QR, sin cortes. API oficial de Meta.</p>
              </div>

              {metaError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{metaError}</div>
              )}

              {metaSession ? (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-green-400 font-semibold">Conectado</span>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      {metaSession.display_name && (
                        <div className="flex justify-between">
                          <span className="text-white/40">Cuenta</span>
                          <span className="text-white font-medium">{metaSession.display_name}</span>
                        </div>
                      )}
                      {metaSession.phone_number && (
                        <div className="flex justify-between">
                          <span className="text-white/40">Número</span>
                          <span className="text-white font-medium">{metaSession.phone_number}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-white/40">Phone Number ID</span>
                        <span className="text-white/60 font-mono text-xs">{metaSession.phone_number_id}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={handleMetaDisconnect} disabled={metaLoading}
                    className="w-full text-sm text-white/30 hover:text-white/60 border border-white/10 py-2.5 rounded-xl transition-all disabled:opacity-50">
                    Desconectar
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button onClick={handleEmbeddedSignup} disabled={metaLoading}
                    className="w-full bg-[#1877F2] hover:bg-[#1565d8] text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Conectar con Facebook
                  </button>

                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-white/30 text-xs">o conectá manualmente</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  <button onClick={() => setShowManual(!showManual)}
                    className="w-full border border-white/10 hover:border-white/20 text-white/60 hover:text-white/80 text-sm py-2.5 rounded-xl transition-all">
                    {showManual ? 'Ocultar formulario' : 'Ingresar token manualmente'}
                  </button>

                  {showManual && (
                    <form onSubmit={handleManualConnect} className="space-y-3 pt-2">
                      {[
                        { key: 'phone_number_id', label: 'Phone Number ID', placeholder: '1159481137238408', required: true },
                        { key: 'waba_id', label: 'WABA ID', placeholder: '1002415845870920', required: true },
                        { key: 'access_token', label: 'Access Token', placeholder: 'EAASpm3...', required: true },
                        { key: 'phone_number', label: 'Número (opcional)', placeholder: '+54 9 11 2756-9518', required: false },
                        { key: 'display_name', label: 'Nombre (opcional)', placeholder: 'Mi Negocio', required: false },
                      ].map(({ key, label, placeholder, required }) => (
                        <div key={key}>
                          <label className="block text-xs text-white/40 mb-1">{label}</label>
                          <input type={key === 'access_token' ? 'password' : 'text'} required={required} placeholder={placeholder}
                            value={manualData[key as keyof typeof manualData]}
                            onChange={e => setManualData(d => ({ ...d, [key]: e.target.value }))}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/50" />
                        </div>
                      ))}
                      <button type="submit" disabled={metaLoading}
                        className="w-full bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold py-2.5 rounded-xl transition-all disabled:opacity-50">
                        {metaLoading ? 'Conectando...' : 'Conectar'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {!metaSession && (
                <div className="mt-6 border-t border-white/8 pt-5 grid grid-cols-2 gap-2">
                  {[{ icon: '✓', text: 'Sin escanear QR' }, { icon: '✓', text: 'No se desconecta' }, { icon: '✓', text: 'Número real' }, { icon: '✓', text: 'API oficial Meta' }].map((b, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-white/40">
                      <span className="text-green-400 font-bold">{b.icon}</span>{b.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── QR TAB ── */}
          {tab === 'qr' && (
            <div className="bg-[#141414] border border-white/8 rounded-2xl p-8">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-1">WhatsApp Web</h2>
                <p className="text-white/40 text-sm">Vinculá tu WhatsApp escaneando un código QR</p>
              </div>

              <div className="flex items-center justify-center gap-2 mb-5">
                <span className={`w-2 h-2 rounded-full ${qrStatus === 'connected' ? 'bg-green-400' : qrStatus === 'connecting' ? 'bg-[#F5A623] animate-pulse' : 'bg-white/30'}`} />
                <span className={`text-sm font-medium ${qrStatus === 'connected' ? 'text-green-400' : qrStatus === 'connecting' ? 'text-[#F5A623]' : 'text-white/40'}`}>
                  {qrStatus === 'connected' ? 'Conectado ✓' : qrStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
                </span>
              </div>

              {qrError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{qrError}</div>
              )}

              {qrStatus === 'connected' && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 text-center mb-4">
                  <p className="text-green-400 font-semibold">¡WhatsApp conectado!</p>
                  <p className="text-white/50 text-sm mt-1">Capturando leads automáticamente.</p>
                </div>
              )}

              {qrStatus === 'connecting' && qr && (
                <div className="flex flex-col items-center gap-4 mb-4">
                  <div className="p-3 bg-white rounded-xl">
                    <img src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`} alt="QR" className="w-52 h-52" />
                  </div>
                  <p className="text-white/40 text-xs text-center">Abrí WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
                </div>
              )}

              {qrStatus === 'disconnected' && (
                <button onClick={handleQrConnect} disabled={qrLoading}
                  className="w-full bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50">
                  {qrLoading ? 'Generando QR...' : 'Generar código QR'}
                </button>
              )}

              {(qrStatus === 'connected' || qrStatus === 'connecting') && (
                <button onClick={handleQrDisconnect}
                  className="w-full mt-3 text-sm text-white/30 hover:text-white/60 border border-white/10 py-2.5 rounded-xl transition-all">
                  Desconectar
                </button>
              )}

              <div className="mt-5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
                <p className="text-yellow-400/80 text-xs">⚠️ WhatsApp Web se desconecta si el celular pierde internet. Recomendamos usar Twilio o Meta Cloud API para producción.</p>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
