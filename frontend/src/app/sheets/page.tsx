'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { api } from '@/lib/api';

export default function SheetsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (!localStorage.getItem('perseo_token')) { router.push('/login'); return; }

    api.sheets.status().then(res => {
      setIsConnected(res.is_connected);
      setCurrentId(res.spreadsheet_id);
      if (res.spreadsheet_id) setSpreadsheetId(res.spreadsheet_id);
    }).finally(() => setLoading(false));

    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected) { setMessage('¡Google Sheets conectado exitosamente!'); setMessageType('success'); }
    if (error)     { setMessage('Error al conectar con Google. Intentá de nuevo.'); setMessageType('error'); }
  }, [router, searchParams]);

  async function handleSaveId(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.sheets.connect(spreadsheetId.trim());
      setCurrentId(spreadsheetId.trim());
      setMessage('Spreadsheet guardado correctamente');
      setMessageType('success');
    } catch (err) {
      setMessage((err as Error).message);
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  async function handleAuth() {
    try {
      const { url } = await api.sheets.authUrl();
      window.location.href = url;
    } catch (err) {
      setMessage((err as Error).message);
      setMessageType('error');
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      await api.sheets.test();
      setMessage('Fila de prueba enviada a la pestaña "Test" de tu spreadsheet');
      setMessageType('success');
    } catch (err) {
      setMessage((err as Error).message);
      setMessageType('error');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Google Sheets</h2>
            <p className="text-white/40 text-sm mt-1">Conectá tu spreadsheet para registrar leads automáticamente</p>
          </div>

          {message && (
            <div className={`mb-5 px-4 py-3 rounded-xl text-sm border ${
              messageType === 'success'
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {message}
            </div>
          )}

          {loading ? (
            <p className="text-white/30 text-sm">Cargando...</p>
          ) : (
            <div className="space-y-5">
              <div className="bg-[#141414] border border-white/8 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">Paso 1: Spreadsheet ID</h3>
                  {currentId && (
                    <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                      Guardado
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/40 mb-4">
                  Abrí tu Google Sheet. El ID está en la URL:{' '}
                  <code className="text-[#F5A623]/80 bg-white/5 px-1.5 py-0.5 rounded">
                    docs.google.com/spreadsheets/d/<strong>[ID_AQUÍ]</strong>/edit
                  </code>
                </p>
                <form onSubmit={handleSaveId} className="flex gap-3">
                  <input
                    value={spreadsheetId}
                    onChange={e => setSpreadsheetId(e.target.value)}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                    required
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#F5A623]/40 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-white/10 hover:bg-white/15 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-50"
                  >
                    {saving ? '...' : 'Guardar'}
                  </button>
                </form>
              </div>

              <div className="bg-[#141414] border border-white/8 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">Paso 2: Autorizar con Google</h3>
                  {isConnected && (
                    <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                      Conectado ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/40 mb-4">
                  Otorgá permisos para que Perseo pueda escribir en tu spreadsheet. Solo se pide acceso a Sheets.
                </p>
                <button
                  onClick={handleAuth}
                  className="w-full bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold py-2.5 rounded-xl transition-all text-sm"
                >
                  {isConnected ? 'Reconectar con Google' : 'Autorizar con Google'}
                </button>
              </div>

              {isConnected && currentId && (
                <div className="bg-[#141414] border border-white/8 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-white mb-2">Verificar conexión</h3>
                  <p className="text-xs text-white/40 mb-4">
                    Enviá una fila de prueba a la pestaña "Test" para verificar que todo funciona.
                  </p>
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="w-full border border-[#F5A623]/30 text-[#F5A623] hover:bg-[#F5A623]/10 font-medium py-2.5 rounded-xl transition-all text-sm disabled:opacity-50"
                  >
                    {testing ? 'Enviando...' : 'Enviar fila de prueba'}
                  </button>
                </div>
              )}

              <div className="bg-[#141414] border border-white/8 rounded-2xl p-5">
                <p className="text-xs text-white/30 font-medium mb-3 uppercase tracking-wide">Estructura del sheet</p>
                <div className="flex gap-1 flex-wrap">
                  {['Fecha', 'Nombre', 'Teléfono', 'Mensaje inicial', 'Campaña', 'Temperatura', 'Razón IA', 'Estado'].map((col, i) => (
                    <span key={i} className="text-xs bg-white/5 text-white/50 px-2 py-1 rounded-md border border-white/8">
                      {col}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-white/25 mt-3">
                  Cada campaña/anuncio tiene su propia pestaña. Las filas se colorean según la temperatura del lead.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
