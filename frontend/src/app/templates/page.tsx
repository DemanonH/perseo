'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { api, WaTemplate } from '@/lib/api';

const STATUS_STYLES: Record<string, string> = {
  APPROVED: 'text-green-400 bg-green-500/10 border-green-500/20',
  PENDING:  'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  REJECTED: 'text-red-400 bg-red-500/10 border-red-500/20',
  PAUSED:   'text-orange-400 bg-orange-500/10 border-orange-500/20',
  DISABLED: 'text-white/30 bg-white/5 border-white/10',
};

const CATEGORIES = [
  { value: 'MARKETING',      label: 'Marketing',     desc: 'Promociones y ofertas' },
  { value: 'UTILITY',        label: 'Utilidad',      desc: 'Confirmaciones y avisos' },
  { value: 'AUTHENTICATION', label: 'Autenticación', desc: 'Códigos de verificación' },
];

const LANGUAGES = [
  { value: 'es',    label: 'Español' },
  { value: 'es_AR', label: 'Español (Argentina)' },
  { value: 'es_MX', label: 'Español (México)' },
  { value: 'en_US', label: 'English (US)' },
  { value: 'pt_BR', label: 'Portugués (Brasil)' },
];

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'MARKETING', language: 'es', body: '', header: '', footer: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('perseo_token')) { router.push('/login'); return; }
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const data = await api.templates.list();
      setTemplates(data.templates);
      setSource(data.source);
    } catch (err) { setError((err as Error).message); }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.body) { setError('Nombre y cuerpo del mensaje son requeridos'); return; }
    setCreating(true); setError('');
    try {
      const payload: Parameters<typeof api.templates.create>[0] = {
        name: form.name, category: form.category, language: form.language, body: form.body,
      };
      if (form.header.trim()) payload.header = form.header.trim();
      if (form.footer.trim()) payload.footer = form.footer.trim();
      await api.templates.create(payload);
      setShowForm(false);
      setForm({ name: '', category: 'MARKETING', language: 'es', body: '', header: '', footer: '' });
      await loadTemplates();
    } catch (err) { setError((err as Error).message); }
    setCreating(false);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-xl font-bold text-white">Templates de WhatsApp</h1>
              <p className="text-white/40 text-sm mt-1">
                Mensajes pre-aprobados por Meta para iniciar conversaciones
                {source === 'meta' && <span className="ml-2 text-green-400/60 text-xs">· Sincronizado con Meta</span>}
              </p>
            </div>
            <button onClick={() => { setShowForm(!showForm); setError(''); }}
              className="bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold px-4 py-2.5 rounded-xl text-sm transition-all">
              {showForm ? 'Cancelar' : '+ Nuevo template'}
            </button>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">{error}</div>}

          {showForm && (
            <div className="bg-[#141414] border border-white/8 rounded-2xl p-6 mb-6">
              <h2 className="text-sm font-semibold text-white mb-5">Nuevo template</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Nombre *</label>
                    <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="mi_template"
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/40" />
                    <p className="text-[10px] text-white/20 mt-1">Solo minúsculas, números y guión bajo</p>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Idioma *</label>
                    <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#F5A623]/40">
                      {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Categoría *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat.value} type="button" onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                        className={`text-left p-3 rounded-xl border text-xs transition-all ${
                          form.category === cat.value ? 'border-[#F5A623]/40 bg-[#F5A623]/8 text-white' : 'border-white/8 text-white/40 hover:border-white/15'
                        }`}>
                        <p className="font-semibold mb-0.5">{cat.label}</p>
                        <p className="text-[10px] opacity-60">{cat.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Encabezado <span className="text-white/20">(opcional)</span></label>
                  <input type="text" value={form.header} onChange={e => setForm(f => ({ ...f, header: e.target.value }))}
                    placeholder="Texto del encabezado..."
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/40" />
                </div>

                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Cuerpo *</label>
                  <textarea required rows={4} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                    placeholder={"Hola {{1}}, gracias por contactarnos. ¿En qué podemos ayudarte?"}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/40 resize-none" />
                  <p className="text-[10px] text-white/20 mt-1">Usá {`{{1}}, {{2}}`} para variables dinámicas</p>
                </div>

                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Pie de página <span className="text-white/20">(opcional)</span></label>
                  <input type="text" value={form.footer} onChange={e => setForm(f => ({ ...f, footer: e.target.value }))}
                    placeholder="Texto del pie..."
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#F5A623]/40" />
                </div>

                <button type="submit" disabled={creating}
                  className="w-full bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold py-2.5 rounded-xl transition-all disabled:opacity-50">
                  {creating ? 'Enviando a Meta...' : 'Crear template'}
                </button>

                <div className="bg-blue-500/8 border border-blue-500/15 rounded-xl px-4 py-3">
                  <p className="text-blue-300/60 text-xs leading-relaxed">
                    💡 Los templates deben ser aprobados por Meta. El proceso tarda entre unos minutos y 24 horas.
                  </p>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-32"><p className="text-white/30 text-sm">Cargando templates...</p></div>
          ) : templates.length === 0 ? (
            <div className="bg-[#141414] border border-white/8 rounded-2xl p-12 text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-white/60 font-semibold mb-2">No hay templates</h3>
              <p className="text-white/30 text-sm">Creá tu primer template para iniciar conversaciones con leads</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t, i) => (
                <div key={t.id || i} className="bg-[#141414] border border-white/8 rounded-2xl p-5">
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <h3 className="text-sm font-semibold text-white font-mono">{t.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[t.status] || STATUS_STYLES.DISABLED}`}>
                      {t.status}
                    </span>
                    <span className="text-[10px] text-white/25 bg-white/5 px-2 py-0.5 rounded-full">{t.category}</span>
                    <span className="text-[10px] text-white/25 bg-white/5 px-2 py-0.5 rounded-full">{t.language}</span>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
                    {t.header_text && <p className="text-xs font-bold text-white mb-2">{t.header_text}</p>}
                    <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                      {t.body_text || t.components?.find(c => c.type === 'BODY')?.text || '—'}
                    </p>
                    {t.footer_text && <p className="text-xs text-white/30 mt-2 border-t border-white/5 pt-2">{t.footer_text}</p>}
                  </div>
                  {t.status === 'REJECTED' && (
                    <p className="mt-3 text-xs text-red-400/70">⚠️ Template rechazado. Revisá el contenido y creá uno nuevo.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
