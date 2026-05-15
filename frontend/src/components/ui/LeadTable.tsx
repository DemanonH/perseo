'use client';
import { useState } from 'react';
import { Lead, api } from '@/lib/api';
import ConversationModal from './ConversationModal';
import ScoreBadge from './ScoreBadge';
import { TempBadge, TempSelector } from './TempBadge';

interface Props {
  leads: Lead[];
  onConvert: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (lead: Lead) => void;
}

export default function LeadTable({ leads, onConvert, onDelete, onUpdate }: Props) {
  const [conversationLead, setConversationLead] = useState<Lead | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  async function handleConvert(lead: Lead) {
    if (converting) return;
    setConverting(lead.id);
    try {
      await api.leads.convert(lead.id);
      onConvert(lead.id);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setConverting(null);
    }
  }

  async function handleDelete(lead: Lead) {
    if (!confirm(`¿Resetear el lead de ${lead.name || lead.phone}? Se eliminará el registro completo y el próximo mensaje de ese número entrará como lead nuevo.`)) return;
    setDeleting(lead.id);
    try {
      await api.leads.delete(lead.id);
      onDelete?.(lead.id);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setDeleting(null);
    }
  }

  async function handleSavePhone(lead: Lead) {
    if (!phoneInput.trim()) return;
    setSavingPhone(true);
    try {
      const updated = await api.leads.updatePhone(lead.id, phoneInput.trim());
      onUpdate?.(updated);
      setEditingPhone(null);
      setPhoneInput('');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingPhone(false);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 bg-white/2">
              {['Fecha', 'Nombre', 'Teléfono', 'Campaña', 'Temp. Manual', 'Score IA', 'Estado', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-white/30 font-medium text-xs uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-14 text-white/20 text-sm">
                  No hay leads que coincidan con los filtros seleccionados.
                </td>
              </tr>
            )}
            {leads.map(lead => {
              const rowBg =
                lead.lead_temperature === 'hot'  ? 'bg-red-500/4 hover:bg-red-500/7' :
                lead.lead_temperature === 'warm' ? 'bg-amber-500/4 hover:bg-amber-500/7' :
                lead.lead_temperature === 'cold' ? 'bg-slate-500/4 hover:bg-slate-500/7' :
                'hover:bg-white/2';
              return (
              <tr key={lead.id} className={`border-b border-white/4 transition-colors ${rowBg}`}>
                <td className="px-4 py-3 text-white/40 whitespace-nowrap text-xs">
                  {new Date(lead.received_at).toLocaleDateString('es-AR')}
                </td>
                <td className="px-4 py-3 text-white font-medium">
                  {lead.name || <span className="text-white/25">Sin nombre</span>}
                </td>
                <td className="px-4 py-3">
                  {lead.phone_unresolved ? (
                    editingPhone === lead.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          type="text"
                          value={phoneInput}
                          onChange={e => setPhoneInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSavePhone(lead); if (e.key === 'Escape') setEditingPhone(null); }}
                          placeholder="5491132012067"
                          className="bg-white/8 border border-[#F5A623]/40 rounded-lg px-2 py-1 text-white text-xs font-mono w-36 focus:outline-none focus:border-[#F5A623]"
                        />
                        <button onClick={() => handleSavePhone(lead)} disabled={savingPhone}
                          className="text-xs bg-[#F5A623] text-black px-2 py-1 rounded-lg font-bold disabled:opacity-50">
                          {savingPhone ? '...' : '✓'}
                        </button>
                        <button onClick={() => setEditingPhone(null)} className="text-xs text-white/30 hover:text-white/60">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingPhone(lead.id); setPhoneInput(''); }}
                        className="flex items-center gap-1.5 group"
                        title="Número no resuelto — click para ingresar el número real"
                      >
                        <span className="text-amber-400/70 text-xs font-mono">{lead.phone}</span>
                        <span className="text-amber-400 text-xs bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md group-hover:bg-amber-400/20 transition-all">
                          ⚠ Ingresar nº
                        </span>
                      </button>
                    )
                  ) : (
                    <span className="text-white/40 font-mono text-xs">{lead.phone}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {lead.campaign_name ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
                      {lead.campaign_color && (
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lead.campaign_color }} />
                      )}
                      {lead.campaign_name}
                    </span>
                  ) : (
                    <span className="text-white/20 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <TempBadge temp={lead.lead_temperature} />
                    <TempSelector
                      leadId={lead.id}
                      current={lead.lead_temperature}
                      compact
                      onUpdate={temp => onUpdate?.({ ...lead, lead_temperature: temp })}
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ScoreBadge score={lead.ai_score} />
                </td>
                <td className="px-4 py-3 text-white/40 text-xs max-w-[180px]">
                  <span className="line-clamp-2">{lead.ai_reason || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  {lead.status === 'converted'
                    ? <span className="text-xs text-emerald-400 font-medium">Convertido ✓</span>
                    : <span className="text-xs text-white/30">Nuevo</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setConversationLead(lead)}
                      className="text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/25 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap">
                      Ver chat
                    </button>
                    {lead.status === 'new' && (
                      <button onClick={() => handleConvert(lead)} disabled={converting === lead.id}
                        className="text-xs text-black bg-[#F5A623] hover:bg-[#d4880a] px-2.5 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50 whitespace-nowrap">
                        {converting === lead.id ? '...' : 'Convertir'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(lead)}
                      disabled={deleting === lead.id}
                      title="Resetear lead"
                      className="text-white/15 hover:text-red-400 border border-white/8 hover:border-red-500/20 px-2 py-1.5 rounded-lg transition-all disabled:opacity-50 text-xs"
                    >
                      {deleting === lead.id ? '...' : '↺'}
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {conversationLead && (
        <ConversationModal
          leadId={conversationLead.id}
          leadName={conversationLead.name}
          onClose={() => setConversationLead(null)}
        />
      )}
    </>
  );
}
