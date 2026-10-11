import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';

export interface ActionItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  tone?: 'default' | 'blood' | 'gold';
  disabled?: boolean;
}

interface Props {
  items: ActionItem[];
}

export function ActionMenu({ items }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-48 glass-popover rounded-xl overflow-hidden py-1">
          {items.map((item, idx) => {
            const Icon = item.icon;
            const toneCls =
              item.tone === 'blood'
                ? 'text-blood hover:bg-blood/10'
                : item.tone === 'gold'
                ? 'text-gold hover:bg-gold/10'
                : 'text-slate-300 hover:bg-white/5';
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (item.disabled) return;
                  item.onClick();
                  setOpen(false);
                }}
                disabled={item.disabled}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed ${toneCls}`}
              >
                {Icon && <Icon size={13} />}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
