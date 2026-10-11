import { type LucideIcon } from 'lucide-react';

type Tone = 'emerald' | 'gold' | 'blood' | 'blizzard' | 'slate';

interface Props {
  tone: Tone;
  icon?: LucideIcon;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

const TONE_MAP: Record<Tone, string> = {
  emerald: 'text-emerald bg-emerald/10 border-emerald/25',
  gold: 'text-gold bg-gold/10 border-gold/25',
  blood: 'text-blood bg-blood/10 border-blood/25',
  blizzard: 'text-blizzard bg-blizzard/10 border-blizzard/25',
  slate: 'text-slate-400 bg-white/5 border-white/10',
};

export function StatusPill({ tone, icon: Icon, children, size = 'sm' }: Props) {
  const cls = TONE_MAP[tone];
  const sizeCls = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-bold uppercase tracking-wider ${sizeCls} ${cls}`}
    >
      {Icon && <Icon size={size === 'sm' ? 9 : 11} />}
      {children}
    </span>
  );
}
