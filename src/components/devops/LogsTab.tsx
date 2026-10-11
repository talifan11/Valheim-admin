import { useEffect, useMemo, useState } from 'react';
import { Loader2, Terminal, RefreshCw, Search, X, Pause, Play } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import * as api from '../../lib/api';

type Level = 'all' | 'info' | 'warning' | 'error';

export function LogsTab() {
  const token = useAuthStore((s) => s.token);
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lines, setLines] = useState(200);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<Level>('all');

  const load = async () => {
    if (!token) return;
    try {
      const res = await api.getDevopsLogs(token, lines);
      setLogs(res.logs);
    } catch {
      // тихо
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [token, lines]);
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [autoRefresh, token, lines]);

  const filtered = useMemo(() => {
    let arr = logs.split('\n');
    if (level !== 'all') {
      arr = arr.filter((l) => {
        const up = l.toUpperCase();
        if (level === 'error') return up.includes('ERROR') || up.includes('EXCEPTION') || up.includes('TRACEBACK');
        if (level === 'warning') return up.includes('WARN');
        if (level === 'info') return up.includes('INFO');
        return true;
      });
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((l) => l.toLowerCase().includes(q));
    }
    return arr.join('\n');
  }, [logs, level, query]);

  const highlightLine = (line: string): string => {
    const up = line.toUpperCase();
    if (up.includes('ERROR') || up.includes('TRACEBACK') || up.includes('EXCEPTION')) return 'text-blood';
    if (up.includes('WARN')) return 'text-gold';
    if (up.includes('INFO')) return 'text-slate-400';
    if (up.includes('OK')) return 'text-emerald';
    return 'text-slate-300';
  };

  const LEVELS: { id: Level; label: string; tone: string }[] = [
    { id: 'all', label: 'Все', tone: 'text-slate-400' },
    { id: 'info', label: 'INFO', tone: 'text-slate-400' },
    { id: 'warning', label: 'WARN', tone: 'text-gold' },
    { id: 'error', label: 'ERROR', tone: 'text-blood' },
  ];

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-0.5">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLevel(l.id)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${level === l.id ? 'bg-white/[0.06] ' + l.tone : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.03]'}`}
            >{l.label}</button>
          ))}
        </div>

        <div className="relative w-64">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск..."
            className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl pl-8 pr-8 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:border-gold/40 transition-colors"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-white"><X size={11} /></button>
          )}
        </div>

        <select
          value={lines}
          onChange={(e) => setLines(Number(e.target.value))}
          className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-1.5 text-[11px] text-slate-300 outline-none focus:border-gold/40 transition-colors"
        >
          <option value={100}>100</option>
          <option value={200}>200</option>
          <option value={500}>500</option>
          <option value={1000}>1000</option>
          <option value={2000}>2000</option>
        </select>

        <button
          type="button"
          onClick={() => setAutoRefresh((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${autoRefresh ? 'text-emerald bg-emerald/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'}`}
        >
          {autoRefresh ? <Pause size={11} /> : <Play size={11} />}
          {autoRefresh ? 'Авто' : 'Пауза'}
        </button>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-colors disabled:opacity-40"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          Обновить
        </button>
      </div>

      <div className="flex-1 min-h-0 rounded-2xl border border-white/[0.06] bg-black/60 overflow-hidden flex flex-col">
        <div className="px-4 py-2 border-b border-white/[0.04] flex items-center gap-2 shrink-0 bg-white/[0.01]">
          <Terminal size={12} className="text-slate-500" />
          <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500">journalctl -u valheim-api</span>
          <span className="ml-auto text-[10px] text-slate-600 font-mono">{filtered.split('\n').length} строк</span>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4">
          {loading && !logs ? (
            <div className="flex items-center justify-center h-full text-slate-500"><Loader2 size={18} className="animate-spin" /></div>
          ) : !filtered.trim() ? (
            <div className="text-slate-600 text-[12px] font-mono">Пусто</div>
          ) : (
            <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words">
              {filtered.split('\n').map((line, i) => (
                <div key={i} className={highlightLine(line)}>{line || ' '}</div>
              ))}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
