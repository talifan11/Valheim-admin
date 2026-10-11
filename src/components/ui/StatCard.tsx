import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

type Tone = 'gold' | 'emerald' | 'blizzard' | 'blood' | 'slate';

interface Props {
  label: string;
  value: string | number;
  delta?: number | null;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  onClick?: () => void;
}

const TONE_BG: Record<Tone, string> = {
  gold: 'bg-gold/10 text-gold ring-gold/25',
  emerald: 'bg-emerald/10 text-emerald ring-emerald/25',
  blizzard: 'bg-blizzard/10 text-blizzard ring-blizzard/25',
  blood: 'bg-blood/10 text-blood ring-blood/25',
  slate: 'bg-white/[0.04] text-slate-400 ring-white/10',
};

export function StatCard({ label, value, delta, icon: Icon, tone = 'gold', hint, onClick }: Props) {
  const hasDelta = delta !== undefined && delta !== null;
  const positive = hasDelta && delta! > 0;
  const negative = hasDelta && delta! < 0;

  return (
    <div
      className={`group relative rounded-2xl p-5 border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent transition-all ${
        onClick ? 'cursor-pointer hover:border-gold/30 hover:from-white/[0.04]' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ring-1 ring-inset flex items-center justify-center ${TONE_BG[tone]}`}>
          <Icon size={18} strokeWidth={2.2} />
        </div>
        {hasDelta && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded ${
              positive ? 'text-emerald bg-emerald/10' : negative ? 'text-blood bg-blood/10' : 'text-slate-500 bg-white/5'
            }`}
          >
            {positive && <ArrowUpRight size={11} />}
            {negative && <ArrowDownRight size={11} />}
            {positive ? '+' : ''}{delta}%
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[28px] font-bold text-white leading-none tracking-tight">
          {value}
        </span>
      </div>
      <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mt-2.5">
        {label}
      </div>
      {hint && (
        <div className="text-[11px] text-slate-600 mt-1">{hint}</div>
      )}
    </div>
  );
}
