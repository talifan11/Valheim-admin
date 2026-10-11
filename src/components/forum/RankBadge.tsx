// Скандинавские ранги — тот же стиль что в лаунчере.

export interface ForumRank {
  name: string;
  rune: string;
  tier: 'jarl' | 'legend' | 'viking' | 'novice';
}

interface Props {
  rank: ForumRank;
  size?: 'sm' | 'md';
}

function rankColor(tier: ForumRank['tier']): string {
  switch (tier) {
    case 'jarl': return 'text-gold border-gold/40 bg-gold/10';
    case 'legend': return 'text-blizzard border-blizzard/40 bg-blizzard/10';
    case 'viking': return 'text-blood border-blood/40 bg-blood/10';
    default: return 'text-slate-400 border-white/15 bg-white/5';
  }
}

export function RankBadge({ rank, size = 'sm' }: Props) {
  const cls = rankColor(rank.tier);
  const padding = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border font-bold uppercase tracking-wider ${padding} ${cls}`}
    >
      <span className="font-mono leading-none" style={{ fontSize: size === 'sm' ? 11 : 12 }}>
        {rank.rune}
      </span>
      {rank.name}
    </span>
  );
}
