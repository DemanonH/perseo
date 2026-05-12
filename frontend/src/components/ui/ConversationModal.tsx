'use client';
import { useEffect, useState, useRef } from 'react';
import { api, Message } from '@/lib/api';

interface Props {
  leadId: string;
  leadName: string | null;
  onClose: () => void;
}

export default function ConversationModal({ leadId, leadName, onClose }: Props) {
  const [messages, setMessages]     = useState<Message[]>([]);
  const [loading, setLoading]       = useState(true);
  const [replyText, setReplyText]   = useState('');
  const [sending, setSending]       = useState(false);
  const [sendError, setSendError]   = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.leads.messages(leadId).then(setMessages).finally(() => setLoading(false));
  }, [leadId]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!replyText.trim() || sending) return;
    setSending(true);
    setSendError('');
    try {
      const msg = await api.leads.reply(leadId, replyText.trim());
      setMessages(prev => [...prev, msg]);
      setReplyText('');
    } catch (err) {
      setSendError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#141414] border border-white/10 rounded-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div>
            <h3 className="font-semibold text-white">{leadName || 'Sin nombre'}</h3>
            <p className="text-xs text-white/40 mt-0.5">{messages.length} mensajes</p>
          </div>
          <button onClick={onClose}
            className="text-white/40 hover:text-white text-xl leading-none transition-colors">×</button>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <p className="text-white/30 text-sm text-center py-8">Cargando conversación...</p>
          )}
          {!loading && messages.length === 0 && (
            <p className="text-white/30 text-sm text-center py-8">Sin mensajes registrados</p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                msg.from_me
                  ? 'bg-[#F5A623]/20 text-white rounded-br-sm'
                  : 'bg-white/8 text-white/80 rounded-bl-sm'
              }`}>
                <p>{msg.body}</p>
                <p className={`text-xs mt-1 ${msg.from_me ? 'text-[#F5A623]/60 text-right' : 'text-white/30'}`}>
                  {new Date(msg.received_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  {' '}
                  {new Date(msg.received_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                  {msg.from_me && <span className="ml-1 opacity-60">✓</span>}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Reply bar */}
        <div className="border-t border-white/10 p-3 shrink-0">
          {sendError && (
            <p className="text-red-400 text-xs mb-2 px-1">{sendError}</p>
          )}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí un mensaje..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#F5A623]/40 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={sending || !replyText.trim()}
              className="bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-40 shrink-0"
            >
              {sending ? (
                <span className="inline-block w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
              ) : (
                '↑'
              )}
            </button>
          </div>
          <p className="text-white/20 text-xs mt-1.5 px-1">Requiere proveedor de WhatsApp activo (Meta, 360dialog o Twilio)</p>
        </div>

      </div>
    </div>
  );
}
