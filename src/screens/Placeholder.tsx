export function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-8 overflow-y-auto h-full">
      <h1 className="font-display text-2xl font-bold text-white mb-1">{title}</h1>
      <p className="text-[12px] text-slate-500">Раздел в разработке</p>

      <div className="mt-8 glass rounded-2xl p-12 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold/[0.06] ring-1 ring-gold/15 text-gold/50 mb-4">
          <span className="font-mono text-2xl">ᛏ</span>
        </div>
        <p className="text-[14px] text-slate-300 font-bold">Скоро здесь будет раздел</p>
        <p className="text-[11px] text-slate-600 mt-1">Работаем над этим</p>
      </div>
    </div>
  );
}
