interface Props {
  score: 'FRIO' | 'TIBIO' | 'CALIENTE' | null | undefined;
  size?: 'sm' | 'md';
}

const CONFIG = {
  CALIENTE: { label: 'Caliente', icon: '🟢', classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  TIBIO:    { label: 'Tibio',    icon: '🟡', classes: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  FRIO:     { label: 'Frío',     icon: '🔴', classes: 'bg-red-500/15    text-red-400    border-red-500/30'   },
};

export default function ScoreBadge({ score, size = 'sm' }: Props) {
  if (!score) return <span className="text-white/25 text-xs">—</span>;
  const { label, icon, classes } = CONFIG[score];
  const px = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${classes} ${px}`}>
      <span>{icon}</span> {label}
    </span>
  );
}
