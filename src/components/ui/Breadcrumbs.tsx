import { ChevronRight } from 'lucide-react';

interface Props {
  items: { label: string; onClick?: () => void }[];
}

export function Breadcrumbs({ items }: Props) {
  return (
    <nav className="flex items-center gap-1.5 text-[12px]">
      {items.map((item, idx) => {
        const last = idx === items.length - 1;
        return (
          <div key={idx} className="flex items-center gap-1.5">
            {idx > 0 && <ChevronRight size={12} className="text-slate-700" />}
            {item.onClick && !last ? (
              <button
                type="button"
                onClick={item.onClick}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span className={last ? 'text-slate-200 font-semibold' : 'text-slate-500'}>
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
