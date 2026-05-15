'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Status = 'processing' | 'success' | 'error';

export default function MetaOAuthCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('processing');
  const [detail, setDetail]   = useState('');

  useEffect(() => {
    const code        = searchParams.get('code');
    const state       = searchParams.get('state');
    const error       = searchParams.get('error');
    const errorReason = searchParams.get('error_reason') || searchParams.get('error_description');

    console.log('[Meta Callback] params:', { code: code?.slice(0, 10) + '…', state, error, errorReason });

    // ── User denied / Meta error ───────────────────────────────────────────
    if (error) {
      const msg = errorReason || 'El usuario canceló la autorización.';
      console.warn('[Meta Callback] OAuth error:', error, msg);
      setStatus('error');
      setDetail(msg);
      notifyParent({ type: 'meta_oauth_error', message: msg });
      closeAfter(2500);
      return;
    }

    // ── No code (direct navigation) ────────────────────────────────────────
    if (!code) {
      const msg = 'No se recibió el código de autorización.';
      console.warn('[Meta Callback] No code in URL');
      setStatus('error');
      setDetail(msg);
      notifyParent({ type: 'meta_oauth_error', message: msg });
      closeAfter(2500);
      return;
    }

    // ── Success: forward code to parent ────────────────────────────────────
    console.log('[Meta Callback] Code received — forwarding to parent');
    setStatus('success');
    notifyParent({ type: 'meta_oauth_code', code, state: state ?? '' });
    closeAfter(1200);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function notifyParent(data: object) {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(data, window.location.origin);
      console.log('[Meta Callback] postMessage sent:', (data as { type: string }).type);
    } else {
      // Not in popup — fall back: redirect parent via localStorage
      console.warn('[Meta Callback] window.opener not available, using localStorage fallback');
      try {
        localStorage.setItem('meta_oauth_pending', JSON.stringify(data));
      } catch {}
      window.location.href = '/connect-whatsapp';
    }
  }

  function closeAfter(ms: number) {
    setTimeout(() => {
      try { window.close(); } catch {}
      // If close fails (not a popup), redirect
      setTimeout(() => { window.location.href = '/connect-whatsapp'; }, 300);
    }, ms);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">

        {status === 'processing' && (
          <>
            <div className="relative mx-auto w-14 h-14 mb-5">
              <div className="absolute inset-0 rounded-full border-2 border-white/10" />
              <div className="absolute inset-0 rounded-full border-2 border-t-[#F5A623] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#F5A623]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
            </div>
            <p className="text-white font-semibold text-base mb-1">Conectando WhatsApp…</p>
            <p className="text-white/35 text-sm">Procesando tu cuenta de Meta</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-semibold text-base mb-1">¡Autorización recibida!</p>
            <p className="text-white/35 text-sm">Cerrando esta ventana…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-white font-semibold text-base mb-1">Autorización denegada</p>
            <p className="text-white/40 text-sm mb-5">{detail}</p>
            <button
              onClick={() => window.close()}
              className="text-xs text-white/25 hover:text-white/50 border border-white/10 px-4 py-2 rounded-lg transition-colors"
            >
              Cerrar ventana
            </button>
          </>
        )}
      </div>
    </div>
  );
}
