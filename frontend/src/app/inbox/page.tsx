'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { TempBadge, TempSelector } from '@/components/ui/TempBadge';
import { api, Conversation, Message } from '@/lib/api';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)  return 'ahora';
  if (mins < 60) return `${mins}m`;
  if (hrs < 24)  return `${hrs}h`;
  if (days < 7)  return `${days}d`;
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Hoy';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const SCORE_COLOR: Record<string, string> = {
  CALIENTE: 'text-red-400 bg-red-500/10',
  TIBIO:    'text-yellow-400 bg-yellow-500/10',
  FRIO:     'text-blue-400 bg-blue-500/10',
};

function groupByDate(msgs: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  for (const msg of msgs) {
    const d = formatDate(msg.received_at);
    if (!groups.length || groups[groups.length - 1].date !== d) {
      groups.push({ date: d, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

export default function InboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('lead'));
  const [selectedLead, setSelectedLead] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!localStorage.getItem('perseo_token')) { router.push('/login'); return; }
    loadConversations('');
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadConversations(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations(q: string) {
    setLoadingConvs(true);
    try {
      const data = await api.inbox.conversations(q ? { search: q } : {});
      setConversations(data.conversations);
    } catch {}
    setLoadingConvs(false);
  }

  async function loadMessages(leadId: string) {
    setLoadingMsgs(true); setSendError('');
    try {
      const data = await api.inbox.messages(leadId);
      setMessages(data.messages);
    } catch {}
    setLoadingMsgs(false);
  }

  function selectConversation(conv: Conversation) {
    setSelectedId(conv.id);
    setSelectedLead(conv);
    setSendError(''); setReply('');
    router.replace(`/inbox?lead=${conv.id}`, { scroll: false });
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !selectedId || sending) return;
    setSending(true); setSendError('');
    try {
      const data = await api.inbox.reply(selectedId, reply.trim());
      setMessages(prev => [...prev, data.message]);
      setReply('');
      setConversations(prev => prev.map(c =>
        c.id === selectedId
          ? { ...c, last_message: reply.trim(), last_from_me: true, last_message_at: new Date().toISOString(), unread_count: 0 }
          : c
      ));
    } catch (err) { setSendError((err as Error).message); }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as unknown as React.FormEvent); }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex overflow-hidden" style={{ height: '100vh' }}>

        {/* Conversations list */}
        <div className="w-80 flex-shrink-0 border-r border-white/5 flex flex-col bg-[#0d0d0d]">
          <div className="px-4 py-4 border-b border-white/5">
            <h1 className="text-sm font-semibold text-white mb-3">Inbox</h1>
            <input
              type="text" placeholder="Buscar por nombre o número..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-white/20"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex items-center justify-center h-32"><p className="text-white/30 text-xs">Cargando...</p></div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 px-6 text-center">
                <div className="text-3xl mb-2">💬</div>
                <p className="text-white/30 text-xs">No hay conversaciones</p>
                <p className="text-white/15 text-xs mt-1">Los mensajes de WhatsApp aparecen aquí</p>
              </div>
            ) : conversations.map(conv => (
              <button key={conv.id} onClick={() => selectConversation(conv)}
                className={`w-full text-left px-4 py-3 border-b border-white/4 transition-colors ${
                  selectedId === conv.id ? 'bg-[#F5A623]/8 border-l-2 border-l-[#F5A623]' : 'hover:bg-white/3'
                }`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white/50">
                      {(conv.name || conv.phone).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{conv.name || conv.phone}</p>
                      {conv.name && <p className="text-[10px] text-white/30 truncate">{conv.phone}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] text-white/25">{timeAgo(conv.last_message_at || conv.received_at)}</span>
                    {conv.unread_count > 0 && (
                      <span className="w-4 h-4 rounded-full bg-[#F5A623] text-black text-[9px] font-bold flex items-center justify-center">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pl-9">
                  <p className="text-[11px] text-white/35 truncate flex-1">
                    {conv.last_from_me && <span className="text-white/20 mr-1">Vos:</span>}
                    {conv.last_message || <span className="italic text-white/20">Sin mensajes</span>}
                  </p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {conv.ai_score && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${SCORE_COLOR[conv.ai_score]}`}>
                        {conv.ai_score === 'CALIENTE' ? '🔥' : conv.ai_score === 'TIBIO' ? '🌡' : '❄️'}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        {selectedId && selectedLead ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0a]">
            {/* Header */}
            <div className="px-6 py-3.5 border-b border-white/5 bg-[#0d0d0d] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-sm font-semibold text-white/50">
                  {(selectedLead.name || selectedLead.phone).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{selectedLead.name || selectedLead.phone}</p>
                  <p className="text-xs text-white/30">{selectedLead.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedLead.campaign_name && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedLead.campaign_color || '#F5A623' }} />
                    <span className="text-xs text-white/40">{selectedLead.campaign_name}</span>
                  </div>
                )}
                {selectedLead.ai_score && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SCORE_COLOR[selectedLead.ai_score]}`}>
                    {selectedLead.ai_score}
                  </span>
                )}
                <div className="flex items-center gap-1.5 border-l border-white/8 pl-3">
                  <TempBadge temp={selectedLead.lead_temperature} />
                  <TempSelector
                    leadId={selectedLead.id}
                    current={selectedLead.lead_temperature}
                    compact
                    onUpdate={temp => {
                      setSelectedLead(prev => prev ? { ...prev, lead_temperature: temp } : prev);
                      setConversations(prev => prev.map(c =>
                        c.id === selectedLead.id ? { ...c, lead_temperature: temp } : c
                      ));
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full"><p className="text-white/30 text-sm">Cargando...</p></div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-white/20 text-sm">Sin mensajes</div>
              ) : groupByDate(messages).map(group => (
                <div key={group.date}>
                  <div className="flex items-center justify-center my-4">
                    <span className="text-[10px] text-white/20 bg-white/5 px-3 py-1 rounded-full">{group.date}</span>
                  </div>
                  {group.messages.map(msg => (
                    <div key={msg.id} className={`flex mb-2 ${msg.from_me ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.from_me ? 'bg-[#F5A623] text-black rounded-br-sm' : 'bg-[#1e1e1e] text-white/85 rounded-bl-sm'
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                        <p className={`text-[10px] mt-1 text-right ${msg.from_me ? 'text-black/40' : 'text-white/30'}`}>
                          {formatTime(msg.received_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Reply */}
            <div className="px-4 pb-4 pt-2 border-t border-white/5 flex-shrink-0">
              {sendError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg mb-2">{sendError}</div>
              )}
              <form onSubmit={handleSend} className="flex gap-2 items-end">
                <textarea
                  value={reply} onChange={e => setReply(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Escribí un mensaje... (Enter para enviar, Shift+Enter para nueva línea)"
                  rows={2}
                  className="flex-1 bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 resize-none"
                />
                <button type="submit" disabled={!reply.trim() || sending}
                  className="bg-[#F5A623] hover:bg-[#d4880a] text-black font-bold px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 flex-shrink-0 text-sm h-[52px]">
                  {sending ? '···' : '→'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a]">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-white/30 text-sm">Seleccioná una conversación</p>
            <p className="text-white/15 text-xs mt-1">Los mensajes de WhatsApp aparecerán aquí</p>
          </div>
        )}
      </div>
    </div>
  );
}
