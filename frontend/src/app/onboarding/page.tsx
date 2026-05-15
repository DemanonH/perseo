'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const CAMPAIGN_COLORS = ['#F5A623', '#6366F1', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

type Step = 'welcome' | 'whatsapp' | 'campaign' | 'sheets' | 'done';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
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
              <p className="text-white/50 text-sm mb-6">Usamos la API oficial de Meta para recibir mensajes sin QR ni desconexiones.</p>

              <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-5 mb-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium mb-1">WhatsApp Business API (Meta)</p>
                    <p className="text-white/40 text-xs leading-relaxed">Sin escanear QR · No se desconecta · Número real · API oficial</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => router.push('/connect-whatsapp')}
                className="w-full bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold py-3 rounded-xl transition-all mb-3">
                Conectar WhatsApp →
              </button>

              <button onClick={() => setStep('campaign')} className="w-full text-white/40 hover:text-white/60 border border-white/10 py-3 rounded-xl text-sm transition-all">
                Omitir por ahora
              </button>
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
