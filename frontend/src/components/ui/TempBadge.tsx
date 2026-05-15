'use client';
import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';

type Temp = 'cold' | 'warm' | 'hot';

export const TEMP_CONFIG: Record<Temp, { label: string; icon: string; badge: string; dot: string }> = {
  hot:  { label: 'Caliente', icon: '🔥', badge: 'bg-red-500/15 text-red-400 border-red-500/30',       dot: 'bg-red-400' },
  warm: { label: 'Tibio',    icon: '🌡',  badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  cold: { label: 'Frío',     icon: '❄️',  badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30', dot: 'bg-slate-500' },
};

interface BadgeProps {
  temp: Temp | null | undefined;
  size?: 'sm' | 'md';
}

export function TempBadge({ temp, size = 'sm' }: BadgeProps) {
  if (!temp) return <span className="text-white/25 text-xs">—</span>;
  const { label, icon, badge } = TEMP_CONFIG[temp];
  const px = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${badge} ${px}`}>
      <span>{icon}</span> {label}
    </span>
  );
}

interface SelectorProps {
  leadId: string;
  current: Temp | null | undefined;
  onUpdate: (temp: Temp) => void;
  compact?: boolean;
}

export function TempSelector({ leadId, current, onUpdate, compact = false }: SelectorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function select(temp: Temp) {
    if (loading || temp === current) { setOpen(false); return; }
    setLoading(true);
    try {
      await api.leads.updateTemperature(leadId, temp);
      onUpdate(temp);
    } catch (err) {
      console.error('Temperature update error:', err);
    }
    setLoading(false);
    setOpen(false);
  }

  const options: Temp[] = ['hot', 'warm', 'cold'];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className={`flex items-center gap-1.5 transition-all disabled:opacity-50 ${
          compact
            ? 'text-xs text-white/40 hover:text-white/70 border border-white/10 hover:border-white/25 px-2 py-1 rounded-lg'
            : 'text-xs text-white/40 hover:text-white/70'
        }`}
        title="Cambiar temperatura manual"
      >
        {loading ? (
          <span className="text-white/30">···</span>
        ) : current ? (
          <>
            <span>{TEMP_CONFIG[current].icon}</span>
            {!compact && <span>{TEMP_CONFIG[current].label}</span>}
            <span className="text-white/20 text-[10px]">▾</span>
          </>
        ) : (
          <>
            <span className="text-white/20">○</span>
            {!compact && <span className="text-white/30">Sin temp.</span>}
            <span className="text-white/20 text-[10px]">▾</span>
          </>
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[130px]">
          {options.map(temp => {
            const { label, icon, dot } = TEMP_CONFIG[temp];
            return (
              <button key={temp} onClick={() => select(temp)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-white/5 transition-colors text-left ${
                  current === temp ? 'text-white bg-white/5' : 'text-white/60'
                }`}>
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                <span>{icon}</span>
                <span>{label}</span>
                {current === temp && <span className="ml-auto text-white/30">✓</span>}
              </button>
            );
          })}
          {current && (
            <>
              <div className="border-t border-white/5 mx-2" />
              <button onClick={() => select(null as unknown as Temp)}
                className="w-full text-left px-3 py-2 text-xs text-white/25 hover:text-white/50 hover:bg-white/3 transition-colors">
                Limpiar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
