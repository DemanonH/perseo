'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { TempBadge, TempSelector } from '@/components/ui/TempBadge';
import { api, Conversation, Message } from '@/lib/api';

const AVATAR_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316',
  '#eab308','#22c55e','#14b8a6','#0ea5e9','#3b82f6',
];
function avatarColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);
const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const IconEmptyInbox = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const SCORE_LABEL: Record<string, { cls: string; emoji: string }> = {
  CALIENTE: { cls: 'text-red-400 bg-red-500/10 border border-red-500/20',    emoji: '🔥' },
  TIBIO:    { cls: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20', emoji: '🌡' },
  FRIO:     { cls: 'text-blue-400 bg-blue-500/10 border border-blue-500/20',  emoji: '❄️' },
};

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
function groupByDate(msgs: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  for (const msg of msgs) {
    const d = formatDate(msg.received_at);
    if (!groups.length || groups[groups.length - 1].date !== d) groups.push({ date: d, messages: [msg] });
    else groups[groups.length - 1].messages.push(msg);
  }
  return groups;
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  const color = avatarColor(name || '?');
  const cls = size === 'sm' ? 'w-8 h-8 text-sm' : size === 'lg' ? 'w-10 h-10 text-base' : 'w-9 h-9 text-sm';
  return (
    <div className={`${cls} rounded-full flex items-center justify-center flex-shrink-0 font-semibold`}
      style={{ backgroundColor: color + '25', color }}>
      {initial}
    </div>
  );
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  function isNearBottom() {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }
  function scrollToBottom(smooth = true) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }

  useEffect(() => {
    if (!localStorage.getItem('perseo_token')) { router.push('/login'); return; }
    loadConversations('');
  }, []);
  useEffect(() => {
    const t = setTimeout(() => loadConversations(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { if (selectedId) loadMessages(selectedId); }, [selectedId]);
  useEffect(() => { if (loadingMsgs) return; scrollToBottom(); }, [loadingMsgs]);
  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(async () => {
      const id = selectedIdRef.current;
      if (!id) return;
      try {
        const data = await api.inbox.messages(id);
        setMessages(prev => {
          if (data.messages.length <= prev.length) return prev;
          if (isNearBottom()) setTimeout(() => scrollToBottom(false), 50);
          return data.messages;
        });
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedId]);
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await api.inbox.conversations(search ? { search } : {});
        setConversations(data.conversations);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [search]);

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
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <Sidebar />
      <div className="flex-1 flex overflow-hidden" style={{ height: '100vh' }}>

        {/* ── Conversation list ── */}
        <div className="w-[300px] flex-shrink-0 flex flex-col"
          style={{ backgroundColor: 'var(--bg-elevated)', borderRight: '1px solid var(--border)' }}>
          <div className="px-4 pt-5 pb-3">
            <h1 className="text-base font-bold mb-3 tracking-tight" style={{ color: 'var(--text-1)' }}>Inbox</h1>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-4)' }}>
                <IconSearch />
              </span>
              <input
                type="text" placeholder="Buscar conversación..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-1)',
                }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'var(--border-md)', borderTopColor: 'var(--text-3)' }} />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 px-6 text-center gap-2">
                <span style={{ color: 'var(--text-5)' }}><IconEmptyInbox /></span>
                <p className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Sin conversaciones</p>
                <p className="text-[11px]" style={{ color: 'var(--text-5)' }}>Los mensajes de WhatsApp aparecen aquí</p>
              </div>
            ) : conversations.map(conv => {
              const displayName = conv.name || conv.phone;
              const isActive = selectedId === conv.id;
              const score = conv.ai_score ? SCORE_LABEL[conv.ai_score] : null;
              return (
                <button key={conv.id} onClick={() => selectConversation(conv)}
                  className="w-full text-left px-3 py-3 mx-1 rounded-xl mb-0.5 transition-all"
                  style={{
                    width: 'calc(100% - 8px)',
                    backgroundColor: isActive ? 'var(--gold-text)' : 'transparent',
                  }}>
                  <div className="flex items-start gap-2.5">
                    <Avatar name={displayName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-xs font-semibold truncate"
                          style={{ color: isActive ? 'var(--gold)' : 'var(--text-1)' }}>
                          {displayName}
                        </p>
                        <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-4)' }}>
                          {timeAgo(conv.last_message_at || conv.received_at)}
                        </span>
                      </div>
                      {conv.name && (
                        <p className="text-[10px] mb-0.5 truncate" style={{ color: 'var(--text-4)' }}>{conv.phone}</p>
                      )}
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[11px] truncate flex-1" style={{ color: 'var(--text-3)' }}>
                          {conv.last_from_me && <span style={{ color: 'var(--text-4)', marginRight: 4 }}>Vos:</span>}
                          {conv.last_message || <span style={{ color: 'var(--text-5)', fontStyle: 'italic' }}>Sin mensajes</span>}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {score && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${score.cls}`}>{score.emoji}</span>
                          )}
                          {conv.unread_count > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full text-black text-[9px] font-bold flex items-center justify-center"
                              style={{ backgroundColor: 'var(--gold)' }}>
                              {conv.unread_count > 9 ? '9+' : conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Chat area ── */}
        {selectedId && selectedLead ? (
          <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>

            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-between flex-shrink-0"
              style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <Avatar name={selectedLead.name || selectedLead.phone} size="md" />
                <div>
                  <p className="text-sm font-semibold leading-none" style={{ color: 'var(--text-1)' }}>{selectedLead.name || selectedLead.phone}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{selectedLead.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                {selectedLead.campaign_name && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedLead.campaign_color || 'var(--gold)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>{selectedLead.campaign_name}</span>
                  </div>
                )}
                {selectedLead.ai_score && (() => {
                  const s = SCORE_LABEL[selectedLead.ai_score];
                  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${s.cls}`}>{s.emoji} {selectedLead.ai_score}</span>;
                })()}
                <div className="flex items-center gap-1.5 pl-3" style={{ borderLeft: '1px solid var(--border)' }}>
                  <TempBadge temp={selectedLead.lead_temperature} />
                  <TempSelector
                    leadId={selectedLead.id}
                    current={selectedLead.lead_temperature}
                    compact
                    onUpdate={temp => {
                      setSelectedLead(prev => prev ? { ...prev, lead_temperature: temp } : prev);
                      setConversations(prev => prev.map(c => c.id === selectedLead.id ? { ...c, lead_temperature: temp } : c));
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-5">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-5 h-5 border-2 rounded-full animate-spin"
                    style={{ borderColor: 'var(--border-md)', borderTopColor: 'var(--text-3)' }} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <span style={{ color: 'var(--text-5)' }}><IconEmptyInbox /></span>
                  <p className="text-sm" style={{ color: 'var(--text-4)' }}>Sin mensajes aún</p>
                </div>
              ) : groupByDate(messages).map(group => (
                <div key={group.date}>
                  <div className="flex items-center justify-center my-5">
                    <span className="text-[10px] px-3 py-1 rounded-full tracking-wide"
                      style={{ color: 'var(--text-4)', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                      {group.date}
                    </span>
                  </div>
                  {group.messages.map(msg => (
                    <div key={msg.id} className={`flex mb-2.5 ${msg.from_me ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[68%] px-4 py-2.5 text-sm leading-relaxed"
                        style={msg.from_me ? {
                          backgroundColor: 'var(--gold)',
                          color: '#000',
                          borderRadius: '1rem 1rem 0.375rem 1rem',
                        } : {
                          backgroundColor: 'var(--bg-msg-in)',
                          color: 'var(--text-1)',
                          borderRadius: '1rem 1rem 1rem 0.375rem',
                          border: '1px solid var(--border)',
                        }}>
                        <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                        <p className="text-[10px] mt-1.5 text-right"
                          style={{ color: msg.from_me ? 'rgba(0,0,0,0.4)' : 'var(--text-4)' }}>
                          {formatTime(msg.received_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Reply bar */}
            <div className="px-5 pb-5 pt-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              {sendError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-xl mb-3">{sendError}</div>
              )}
              <form onSubmit={handleSend} className="flex gap-2.5 items-end">
                <textarea
                  value={reply} onChange={e => setReply(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Escribí un mensaje... (Enter para enviar)"
                  rows={2}
                  className="flex-1 rounded-2xl px-4 py-3 text-sm focus:outline-none resize-none"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-1)',
                  }}
                />
                <button type="submit" disabled={!reply.trim() || sending}
                  className="px-4 py-3 rounded-2xl flex-shrink-0 h-[52px] flex items-center justify-center transition-all disabled:opacity-30"
                  style={{ backgroundColor: 'var(--gold)', color: '#000', boxShadow: '0 4px 12px var(--gold-glow)' }}>
                  {sending
                    ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    : <IconSend />
                  }
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ backgroundColor: 'var(--bg)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-5)' }}><IconEmptyInbox /></span>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>Seleccioná una conversación</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-5)' }}>Los mensajes de WhatsApp aparecerán aquí</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
