import { useState } from 'react';
import { Loader2, Database, Play, AlertCircle, Check } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import * as api from '../../lib/api';

const SAMPLE = `SELECT id, username, is_admin, banned
FROM users
ORDER BY id DESC
LIMIT 20`;

export function SqlTab() {
  const token = useAuthStore((s) => s.token);
  const [query, setQuery] = useState(SAMPLE);
  const [result, setResult] = useState<api.DevopsSqlResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);

  const handleRun = async () => {
    if (!token) return;
    const q = query.trim();
    if (!q) return;
    setBusy(true); setError(null);
    const start = performance.now();
    try {
      const res = await api.devopsSqlQuery(token, q);
      setResult(res);
      setDuration(Math.round(performance.now() - start));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
      setResult(null);
    } finally { setBusy(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); void handleRun(); }
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Database size={13} className="text-blizzard" />
            <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">SQL запрос</span>
            <span className="text-[10px] text-slate-600 font-mono">только SELECT</span>
          </div>
          <span className="text-[10px] text-slate-600 font-mono">Ctrl+Enter</span>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-black/40 overflow-hidden">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={busy}
            spellCheck={false}
            rows={6}
            className="w-full bg-transparent text-[13px] font-mono text-slate-200 outline-none p-4 resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.04] bg-white/[0.01]">
            <span className="text-[10px] font-mono text-slate-600">{query.length} символов</span>
            <button
              type="button"
              onClick={handleRun}
              disabled={busy || !query.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blizzard text-white font-bold text-[11px] uppercase tracking-[0.1em] hover:shadow-glow-blue transition-all disabled:opacity-40"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Выполнить
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-blood/30 bg-blood/5 p-3 text-blood text-[12px]">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 rounded-2xl border border-white/[0.06] bg-white/[0.01] overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">Результат</span>
            {result && <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald"><Check size={10} />{result.total} строк · {duration} ms</span>}
          </div>
          {result?.truncated && <span className="text-[10px] text-gold font-mono">Показано 500</span>}
        </div>

        {!result ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Database size={24} className="text-slate-700 mb-2" />
            <p className="text-[12px] text-slate-500">Запрос ещё не выполнен</p>
          </div>
        ) : result.rows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-[12px]">Пусто</div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-[#0f1420] z-10">
                <tr className="border-b border-white/[0.06]">
                  {result.columns.map((col: string) => (
                    <th key={col} className="px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-slate-500 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row: Record<string, unknown>, i: number) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    {result.columns.map((col: string) => {
                      const v = row[col];
                      const display = v === null ? 'NULL' : typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v);
                      return (
                        <td key={col} className={`px-3 py-1.5 text-[12px] font-mono whitespace-nowrap ${v === null ? 'text-slate-700 italic' : 'text-slate-300'}`} title={display}>
                          {display.length > 80 ? display.slice(0, 80) + '…' : display}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
