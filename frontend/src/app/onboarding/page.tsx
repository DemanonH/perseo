'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const CAMPAIGN_COLORS = ['#F5A623', '#6366F1', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

type Step = 'welcome' | 'whatsapp' | 'campaign' | 'sheets' | 'done';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [wpStatus, setWpStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [qr, setQr] = useState<string | null>(null);
  const [campName, setCampName] = useState('');
  const [campKeywords, setCampKeywords] = useState('');
  const [campColor, setCampColor] = useState('#F5A623');
  const [campAdId, setCampAdId] = useState('');
  const [sheetsId, setSheetsId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('perseo_token')) { router.push('/login'); return; }
    api.onboarding.status().then(res => {
      if (res.onboarding_completed) router.push('/dashboard');
    }).catch(() => {});
  }, [router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (wpStatus === 'connecting') {
      timer = setInterval(async () => {
        try {
          const res = await api.whatsapp.status();
          setWpStatus(res.status as typeof wpStatus);
          if (res.qr) setQr(res.qr);
          if (res.status === 'connected') clearInterval(timer);
        } catch {}
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [wpStatus]);

  async function handleConnectWA() {
    setLoading(true); setError('');
    try {
      const res = await api.whatsapp.connect();
      if (res.qr) setQr(res.qr);
      setWpStatus('connecting');
    } catch (err) { setError((err as Error).message); }
    setLoading(false);
  }

  async function handleCreateCampaign() {
    if (!campName.trim()) { setError('El nombre de campaña es requerido'); return; }
    setLoading(true); setError('');
    try {
      const keywords = campKeywords.split(',').map(k => k.trim()).filter(Boolean);
      await api.campaigns.create({ name: campName.trim(), ad_id: campAdId.trim() || undefined, color: campColor, keywords });
      setStep('sheets');
    } catch (err) { setError((err as Error).message); }
    setLoading(false);
  }

  async function handleConnectSheets() {
    if (!sheetsId.trim()) { setError('El ID del spreadsheet es requerido'); return; }
    setLoading(true); setError('');
    try {
      await api.sheets.connect(sheetsId.trim());
      const { url } = await api.sheets.authUrl();
      window.location.href = url;
    } catch (err) { setError((err as Error).message); }
    setLoading(false);
  }

  async function handleSkipSheets() {
    await api.onboarding.complete().catch(() => {});
    router.push('/dashboard');
  }

  async function handleFinish() {
    await api.onboarding.complete().catch(() => {});
    router.push('/dashboard');
  }

  const stepsMeta = [
    { key: 'welcome', label: 'Bienvenida' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'campaign', label: 'Campaña' },
    { key: 'sheets', label: 'Google Sheets' },
    { key: 'done', label: 'Listo' },
  ];
  const currentIdx = stepsMeta.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-[#F5A623]">Perseo</span>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {stepsMeta.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < currentIdx ? 'bg-[#F5A623] text-black' :
                i === currentIdx ? 'bg-[#F5A623]/20 border-2 border-[#F5A623] text-[#F5A623]' :
                'bg-white/5 text-white/25'
              }`}>
                {i < currentIdx ? '✓' : i + 1}
              </div>
              {i < stepsMeta.length - 1 && (
                <div className={`w-8 h-0.5 transition-all ${i < currentIdx ? 'bg-[#F5A623]' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-[#141414] border border-white/8 rounded-2xl p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-5">
              {error}
            </div>
          )}

          {step === 'welcome' && (
            <div className="text-center">
              <div className="text-5xl mb-4">👋</div>
              <h2 className="text-xl font-bold text-white mb-2">¡Bienvenido a Perseo!</h2>
              <p className="text-white/50 text-sm mb-8 leading-relaxed">
                En los próximos minutos vas a conectar WhatsApp, crear tu primera campaña y vincular tu Google Sheets.
                Después de eso, Perseo trabaja solo.
              </p>
              <button onClick={() => setStep('whatsapp')} className="w-full bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold py-3 rounded-xl transition-all">
                Empezar setup →
              </button>
            </div>
          )}

          {step === 'whatsapp' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Conectá WhatsApp</h2>
              <p className="text-white/50 text-sm mb-6">Escaneá el QR con tu WhatsApp para comenzar a capturar leads.</p>

              <div className="flex items-center gap-2 mb-5">
                <span className={`w-2 h-2 rounded-full ${
                  wpStatus === 'connected' ? 'bg-green-400' :
                  wpStatus === 'connecting' ? 'bg-[#F5A623] animate-pulse' : 'bg-white/20'
                }`} />
                <span className={`text-sm ${
                  wpStatus === 'connected' ? 'text-green-400' :
                  wpStatus === 'connecting' ? 'text-[#F5A623]' : 'text-white/40'
                }`}>
                  {wpStatus === 'connected' ? 'Conectado ✓' : wpStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
                </span>
              </div>

              {wpStatus === 'connected' ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-5 text-center">
                  <p className="text-green-400 font-semibold">¡WhatsApp conectado!</p>
                </div>
              ) : wpStatus === 'connecting' && qr ? (
                <div className="flex flex-col items-center mb-5">
                  <div className="p-3 bg-white rounded-xl mb-2">
                    <img src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`} alt="QR" className="w-44 h-44" />
                  </div>
                  <p className="text-xs text-white/30 text-center">WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
                </div>
              ) : (
                <button onClick={handleConnectWA} disabled={loading} className="w-full bg-white/8 hover:bg-white/12 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 mb-5">
                  {loading ? 'Generando QR...' : 'Generar código QR'}
                </button>
              )}

              <div className="flex gap-3">
                {wpStatus === 'connected' ? (
                  <button onClick={() => setStep('campaign')} className="flex-1 bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold py-3 rounded-xl transition-all">
                    Continuar →
                  </button>
                ) : (
                  <button onClick={() => setStep('campaign')} className="flex-1 text-white/40 hover:text-white/60 border border-white/10 py-3 rounded-xl text-sm transition-all">
                    Omitir por ahora
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 'campaign' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Creá tu primera campaña</h2>
              <p className="text-white/50 text-sm mb-6">Las campañas organizan tus leads por anuncio o producto.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">Nombre de campaña *</label>
                  <input value={campName} onChange={e => setCampName(e.target.value)} placeholder='Ej: "Campaña Mesas"'
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/40" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">ID del anuncio <span className="text-white/25">(opcional)</span></label>
                  <input value={campAdId} onChange={e => setCampAdId(e.target.value)} placeholder='Ej: "fb_ad_123"'
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/40" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">Keywords fallback <span className="text-white/25">(separadas por coma)</span></label>
                  <input value={campKeywords} onChange={e => setCampKeywords(e.target.value)} placeholder='mesa, madera, precio'
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/40" />
                  <p className="text-xs text-white/25 mt-1">Cuando un lead escriba estas palabras, se asignará a esta campaña.</p>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2">Color de campaña</label>
                  <div className="flex gap-2 flex-wrap">
                    {CAMPAIGN_COLORS.map(c => (
                      <button key={c} onClick={() => setCampColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${campColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={handleCreateCampaign} disabled={loading}
                  className="flex-1 bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50">
                  {loading ? 'Creando...' : 'Crear campaña →'}
                </button>
              </div>
            </div>
          )}

          {step === 'sheets' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Conectá Google Sheets</h2>
              <p className="text-white/50 text-sm mb-6">Tus leads se registrarán automáticamente en tu spreadsheet.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">Spreadsheet ID</label>
                  <input value={sheetsId} onChange={e => setSheetsId(e.target.value)}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/40 font-mono" />
                  <p className="text-xs text-white/25 mt-1">
                    Buscá el ID en la URL de tu Sheet: docs.google.com/spreadsheets/d/<strong className="text-white/40">[ESTE CÓDIGO]</strong>/edit
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={handleConnectSheets} disabled={loading}
                  className="flex-1 bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50">
                  {loading ? 'Redirigiendo...' : 'Autorizar con Google →'}
                </button>
              </div>
              <button onClick={handleSkipSheets} className="w-full mt-2 text-white/30 hover:text-white/50 text-sm py-2 transition-colors">
                Configurar después
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-white mb-2">¡Todo listo!</h2>
              <p className="text-white/50 text-sm mb-8 leading-relaxed">
                Perseo está configurado. A partir de ahora cada lead que llegue a tu WhatsApp
                quedará registrado, organizado y calificado automáticamente.
              </p>
              <button onClick={handleFinish} className="w-full bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold py-3 rounded-xl transition-all">
                Ir al Dashboard →
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-4">
          Podés cambiar cualquier configuración después desde el menú.
        </p>
      </div>
    </div>
  );
}
