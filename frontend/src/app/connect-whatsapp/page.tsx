'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { api, MetaSession } from '@/lib/api';

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || '1312384980822827';

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

export default function ConnectWhatsAppPage() {
  const router = useRouter();

  const [metaSession, setMetaSession] = useState<MetaSession | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState('');
  const [sdkReady, setSdkReady] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualData, setManualData] = useState({
    phone_number_id: '', waba_id: '', access_token: '', phone_number: '', display_name: '',
  });

  useEffect(() => {
    if (!localStorage.getItem('perseo_token')) { router.push('/login'); return; }

    api.whatsapp.meta.status().then(r => setMetaSession(r.session)).catch(() => {});

    window.fbAsyncInit = () => {
      window.FB.init({ appId: META_APP_ID, autoLogAppEvents: true, xfbml: true, version: 'v22.0' });
      setSdkReady(true);
    };
    loadFbSdk();
  }, [router]);

  const handleEmbeddedSignup = useCallback(() => {
    if (!sdkReady) { setMetaError('Facebook SDK aún no está listo, intentá en unos segundos.'); return; }
    setMetaError('');
    setMetaLoading(true);
    window.FB.login(async (response) => {
      if (!response.authResponse?.code) {
        setMetaLoading(false);
        setMetaError('Conexión cancelada o denegada.');
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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 flex items-center justify-center">
        <div className="w-full max-w-lg">

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
                        <input
                          type={key === 'access_token' ? 'password' : 'text'}
                          required={required}
                          placeholder={placeholder}
                          value={manualData[key as keyof typeof manualData]}
                          onChange={e => setManualData(d => ({ ...d, [key]: e.target.value }))}
                          className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/50"
                        />
                      </div>
                    ))}
                    <button type="submit" disabled={metaLoading}
                      className="w-full bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold py-2.5 rounded-xl transition-all disabled:opacity-50">
                      {metaLoading ? 'Conectando...' : 'Conectar'}
                    </button>
                  </form>
                )}

                <div className="mt-4 border-t border-white/8 pt-4 grid grid-cols-2 gap-2">
                  {[
                    { icon: '✓', text: 'Sin escanear QR' },
                    { icon: '✓', text: 'No se desconecta' },
                    { icon: '✓', text: 'Número real' },
                    { icon: '✓', text: 'API oficial Meta' },
                  ].map((b, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-white/40">
                      <span className="text-green-400 font-bold">{b.icon}</span>{b.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
