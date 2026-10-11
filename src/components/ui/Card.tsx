interface Props {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Card({ title, subtitle, actions, children, className = '', noPadding }: Props) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent ${className}`}>
      {(title || actions) && (
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.04]">
          <div>
            {title && (
              <h3 className="text-[13px] font-bold text-white">{title}</h3>
            )}
            {subtitle && (
              <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
}
