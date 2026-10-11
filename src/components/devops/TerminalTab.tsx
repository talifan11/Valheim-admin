import { useEffect, useRef, useState } from 'react';
import {
  Loader2, Terminal, Play, Clock, Trash2, Server, Laptop, Copy, Check,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import * as api from '../../lib/api';
import { StatusPill } from '../ui/StatusPill';

type Scope = 'vps' | 'local';

interface LogLine {
  id: string;
  cmd: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
  scope: Scope;
  ts: Date;
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export function TerminalTab() {
  const token = useAuthStore((s) => s.token);
  const [scope, setScope] = useState<Scope>('vps');

  // Отдельные ленты для каждого scope
  const [linesByScope, setLinesByScope] = useState<Record<Scope, LogLine[]>>({
    vps: [],
    local: [],
  });

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<api.TerminalHistoryEntry[]>([]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [copied, setCopied] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const currentLines = linesByScope[scope];

  // Загрузка истории с сервера при смене scope
  useEffect(() => {
    if (!token) return;
    api.getTerminalHistory(token, scope, 30).then(setHistory).catch(() => {});
  }, [token, scope]);

  // Автоскролл вниз при новом выводе или переключении scope
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentLines, scope]);

  const addLine = (line: LogLine) => {
    setLinesByScope((prev) => ({
      ...prev,
      [line.scope]: [...prev[line.scope], line],
    }));
  };

  const runVps = async (cmd: string) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.execVpsCommand(token, cmd, 30);
      addLine({
        id: `vps-${Date.now()}-${Math.random()}`,
        cmd,
        stdout: res.stdout,
        stderr: res.stderr,
        exit_code: res.exit_code,
        duration_ms: res.duration_ms,
        scope: 'vps',
        ts: new Date(),
      });
      api.getTerminalHistory(token, 'vps', 30).then(setHistory).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const runLocal = async (cmd: string) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const { command_id } = await api.execLocalCommand(token, cmd, 300);

      let tries = 0;
      const maxTries = 240;
      while (tries < maxTries) {
        await new Promise((r) => setTimeout(r, 1000));
        const r = await api.getLocalCommandResult(token, command_id);

        if (r.status === 'done' || r.status === 'failed') {
          addLine({
            id: `local-${command_id}`,
            cmd,
            stdout: r.stdout || '',
            stderr: r.status === 'failed' ? (r.stdout || 'Ошибка') : '',
            exit_code: r.exit_code ?? 1,
            duration_ms: r.duration_ms ?? 0,
            scope: 'local',
            ts: new Date(),
          });
          break;
        }
        if (r.status === 'pending' && tries > 10) {
          addLine({
            id: `local-${command_id}`,
            cmd,
            stdout: '',
            stderr: '⏱ Bridge не отвечает. Проверь что окно devops_bridge.py открыто.',
            exit_code: 1,
            duration_ms: 0,
            scope: 'local',
            ts: new Date(),
          });
          break;
        }
        tries++;
      }
      if (tries >= maxTries) {
        setError('Таймаут (4 минуты)');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const handleRun = () => {
    const cmd = input.trim();
    if (!cmd || busy) return;

    setCmdHistory((prev) => [cmd, ...prev.filter((c) => c !== cmd)].slice(0, 50));
    setHistoryIdx(-1);
    setInput('');

    if (scope === 'vps') void runVps(cmd);
    else void runLocal(cmd);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleRun();
    }
    if (e.key === 'ArrowUp' && !input) {
      e.preventDefault();
      const idx = Math.min(historyIdx + 1, cmdHistory.length - 1);
      if (idx >= 0) {
        setHistoryIdx(idx);
        setInput(cmdHistory[idx]);
      }
    }
    if (e.key === 'ArrowDown' && historyIdx >= 0) {
      e.preventDefault();
      const idx = historyIdx - 1;
      setHistoryIdx(idx);
      setInput(idx >= 0 ? cmdHistory[idx] : '');
    }
  };

  // Очищает только текущий scope
  const handleClear = () => {
    setLinesByScope((prev) => ({ ...prev, [scope]: [] }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleDeleteHistory = async (h: api.TerminalHistoryEntry) => {
    if (!token) return;
    if (!confirm('Удалить из истории?')) return;
    try {
      await api.deleteTerminalHistory(token, h.id);
      const fresh = await api.getTerminalHistory(token, scope, 30);
      setHistory(fresh);
    } catch {
      // тихо
    }
  };

  const historyMatchingScope = history.filter((h) => h.scope === scope);

  const SCOPES: { id: Scope; label: string; icon: typeof Server; desc: string }[] = [
    { id: 'vps', label: 'VPS', icon: Server, desc: 'Команды на сервере (Ubuntu)' },
    { id: 'local', label: 'Мой ПК', icon: Laptop, desc: 'Команды на твоём ПК через Git Bash' },
  ];

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 overflow-hidden">
      {/* ЛЕВАЯ: терминал */}
      <div className="flex flex-col min-h-0">
        {/* Scope selector — как отдельные окна терминала */}
        <div className="flex items-stretch gap-0 mb-3 shrink-0 rounded-xl border border-white/[0.06] bg-white/[0.01] overflow-hidden">
          {SCOPES.map((s) => {
            const Icon = s.icon;
            const active = scope === s.id;
            const count = linesByScope[s.id].length;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setScope(s.id)}
                className={`relative flex-1 flex items-center gap-2.5 px-4 py-3 text-left transition-all ${
                  active
                    ? s.id === 'vps'
                      ? 'bg-blizzard/[0.08] text-blizzard'
                      : 'bg-emerald/[0.08] text-emerald'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'
                }`}
              >
                {active && (
                  <span className={`absolute bottom-0 left-0 right-0 h-[2px] ${
                    s.id === 'vps' ? 'bg-blizzard' : 'bg-emerald'
                  }`} />
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  active
                    ? s.id === 'vps' ? 'bg-blizzard/15' : 'bg-emerald/15'
                    : 'bg-white/[0.04]'
                }`}>
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-bold uppercase tracking-wider ${
                      active ? '' : 'text-slate-400'
                    }`}>
                      {s.label}
                    </span>
                    {count > 0 && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        active
                          ? s.id === 'vps' ? 'bg-blizzard/15' : 'bg-emerald/15'
                          : 'bg-white/[0.04] text-slate-600'
                      }`}>
                        {count}
                      </span>
                    )}
                  </div>
                  <div className={`text-[10px] truncate mt-0.5 ${active ? 'opacity-70' : 'text-slate-600'}`}>
                    {s.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Terminal output — только текущий scope */}
        <div
          ref={scrollRef}
          className={`flex-1 min-h-0 rounded-2xl border overflow-y-auto no-scrollbar p-4 transition-colors ${
            scope === 'vps'
              ? 'border-blizzard/20 bg-black/70'
              : 'border-emerald/20 bg-black/70'
          }`}
        >
          {currentLines.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-600">
              <Terminal size={24} className="mb-3" />
              <p className="text-[12px] font-bold uppercase tracking-wider">
                {scope === 'vps' ? 'VPS терминал' : 'Локальный терминал (ПК)'}
              </p>
              <p className="text-[10px] mt-2 max-w-sm leading-relaxed">
                {scope === 'vps'
                  ? 'Команды выполняются на сервере. Например: df -h, systemctl status valheim-api, ls /var/www/valheim'
                  : 'Команды выполняются на твоём ПК через Git Bash. Например: git status, ls, cd admin && npm run build'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentLines.map((line) => (
                <div key={line.id}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      line.scope === 'vps'
                        ? 'bg-blizzard/10 text-blizzard'
                        : 'bg-emerald/10 text-emerald'
                    }`}>
                      {line.scope === 'vps' ? <Server size={9} /> : <Laptop size={9} />}
                      {line.scope === 'vps' ? 'VPS' : 'LOCAL'}
                    </span>
                    <span className="text-[13px] font-mono text-gold font-bold">
                      $ {line.cmd}
                    </span>
                    <span className="ml-auto flex items-center gap-2 text-[10px] font-mono text-slate-600">
                      <Clock size={10} />
                      {line.duration_ms} ms
                      {line.exit_code !== 0 && (
                        <span className="text-blood">exit {line.exit_code}</span>
                      )}
                    </span>
                  </div>
                  {line.stdout && (
                    <pre className="text-[12px] font-mono text-slate-300 whitespace-pre-wrap break-words leading-relaxed pl-3 border-l-2 border-white/[0.06]">
                      {line.stdout}
                    </pre>
                  )}
                  {line.stderr && (
                    <pre className="text-[12px] font-mono text-blood whitespace-pre-wrap break-words leading-relaxed pl-3 border-l-2 border-blood/40 mt-1">
                      {line.stderr}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-blood/30 bg-blood/5 p-2.5 text-[11px] text-blood shrink-0">
            {error}
          </div>
        )}

        {/* Input */}
        <div className="mt-3 shrink-0">
          <div className={`rounded-2xl border bg-black/40 overflow-hidden transition-colors focus-within:border-gold/40 ${
            scope === 'vps' ? 'border-blizzard/15' : 'border-emerald/15'
          }`}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={busy}
              rows={2}
              spellCheck={false}
              placeholder={scope === 'vps' ? 'df -h' : 'git status'}
              className="w-full bg-transparent text-[13px] font-mono text-slate-200 placeholder-slate-700 outline-none p-3 resize-none leading-relaxed disabled:opacity-50"
            />
            <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.04] bg-white/[0.01]">
              <span className="text-[10px] font-mono text-slate-600">
                {scope === 'vps' ? 'VPS · Ubuntu' : 'ПК · Git Bash'} · Enter · ↑↓ история
              </span>
              <div className="flex items-center gap-2">
                {currentLines.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-colors"
                  >
                    Очистить
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={busy || !input.trim()}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    scope === 'vps'
                      ? 'bg-blizzard text-white hover:shadow-glow-blue'
                      : 'bg-emerald text-abyss hover:shadow-[0_0_24px_rgba(47,191,113,0.5)]'
                  }`}
                >
                  {busy ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                  {busy ? 'Выполняется...' : 'Выполнить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ПРАВАЯ: история */}
      <div className="flex flex-col min-h-0 rounded-2xl border border-white/[0.06] bg-white/[0.01] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {scope === 'vps' ? (
              <Server size={12} className="text-blizzard" />
            ) : (
              <Laptop size={12} className="text-emerald" />
            )}
            <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">
              История · {scope === 'vps' ? 'VPS' : 'ПК'}
            </span>
          </div>
          <StatusPill tone="slate">{historyMatchingScope.length}</StatusPill>
        </div>

        {historyMatchingScope.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <Terminal size={22} className="text-slate-700 mb-2" />
            <p className="text-[11px] text-slate-500">История пуста</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1.5">
            {historyMatchingScope.map((h) => (
              <div
                key={h.id}
                className="group rounded-lg border border-white/[0.05] bg-white/[0.02] p-2 hover:border-white/[0.12] transition-colors cursor-pointer"
                onClick={() => setInput(h.command)}
                title="Клик — вставить в поле ввода"
              >
                <div className="flex items-start gap-2">
                  <span className={`shrink-0 mt-0.5 w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold ${
                    h.exit_code === 0 ? 'bg-emerald/15 text-emerald' : 'bg-blood/15 text-blood'
                  }`}>
                    {h.exit_code === 0 ? '✓' : '✗'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-mono text-slate-300 truncate">
                      {h.command}
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-slate-600 font-mono mt-0.5">
                      <span>{fmtDate(h.created_at)}</span>
                      <span>·</span>
                      <span>{h.duration_ms} ms</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleCopy(h.command, `h-${h.id}`); }}
                    className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-gold opacity-0 group-hover:opacity-100 transition-all"
                    title="Скопировать команду"
                  >
                    {copied === `h-${h.id}` ? <Check size={10} /> : <Copy size={10} />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDeleteHistory(h); }}
                    className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-blood opacity-0 group-hover:opacity-100 transition-all"
                    title="Удалить из истории"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
