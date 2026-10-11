import { useEffect, useState } from 'react';
import {
  Loader2, Rocket, Play, Trash2, Clock, ChevronDown, ChevronUp,
  Package, Hammer, RefreshCw, GitBranch, AlertCircle, Terminal,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import * as api from '../../lib/api';
import { StatusPill } from '../ui/StatusPill';

const ICONS: Record<string, typeof Rocket> = {
  'build-admin': Package,
  'build-launcher': Hammer,
  'sync-client': RefreshCw,
  'git-push-admin': GitBranch,
  'git-push-launcher': GitBranch,
};

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return '';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} с`;
  return `${Math.floor(ms / 60000)} мин ${Math.round((ms % 60000) / 1000)} с`;
}

export function CommandsTab() {
  const token = useAuthStore((s) => s.token);
  const [templates, setTemplates] = useState<api.DevopsCommandTemplate[]>([]);
  const [commands, setCommands] = useState<api.DevopsCommand[]>([]);
  const [bridge, setBridge] = useState<api.DevopsBridgeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = async () => {
    if (!token) return;
    try {
      const [t, c, b] = await Promise.all([
        api.getDevopsCommandsAvailable(token),
        api.getDevopsCommandsList(token),
        api.getDevopsBridgeStatus(token),
      ]);
      setTemplates(t.commands);
      setCommands(c.commands);
      setBridge(b);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const interval = setInterval(() => { void load(); }, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const handleRun = async (key: string, label: string) => {
    if (!token) return;
    if (!bridge?.connected) { setError('Bridge offline — запусти devops_bridge.py'); return; }
    if (!confirm(`Запустить "${label}" на ПК?`)) return;
    setBusyKey(key); setError(null);
    try {
      await api.createDevopsCommand(token, key, {});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally { setBusyKey(null); }
  };

  const handleDelete = async (cmd: api.DevopsCommand) => {
    if (!token) return;
    if (cmd.status === 'running' || cmd.status === 'pending') return;
    if (!confirm('Удалить из истории?')) return;
    try { await api.deleteDevopsCommand(token, cmd.id); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Ошибка'); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-500"><Loader2 size={20} className="animate-spin" /></div>;
  }

  const pending = commands.filter((c) => c.status === 'pending' || c.status === 'running').length;

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5 overflow-hidden">
      <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">Команды</span>
          {pending > 0 && <StatusPill tone="gold">{pending} в очереди</StatusPill>}
        </div>

        {!bridge?.connected && (
          <div className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/5 p-3 text-[11px] text-gold/90 leading-relaxed">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span><strong>Bridge offline.</strong> Запусти <span className="font-mono">devops_bridge.py</span> на ПК.</span>
          </div>
        )}

        {error && <div className="rounded-xl border border-blood/30 bg-blood/5 p-3 text-[12px] text-blood">{error}</div>}

        {templates.map((t) => {
          const Icon = ICONS[t.key] ?? Rocket;
          const isBusy = busyKey === t.key;
          return (
            <div key={t.key} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/[0.12] transition-colors">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 ring-1 ring-gold/25 flex items-center justify-center text-gold shrink-0"><Icon size={16} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-white">{t.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{t.description}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRun(t.key, t.label)}
                disabled={isBusy || !bridge?.connected}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gold text-abyss font-bold text-[11px] uppercase tracking-[0.12em] hover:shadow-glow-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                Запустить
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col min-h-0 rounded-2xl border border-white/[0.06] bg-white/[0.01] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Terminal size={13} className="text-slate-500" />
            <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">История</span>
          </div>
          <StatusPill tone="slate">{commands.length}</StatusPill>
        </div>

        {commands.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
            <Rocket size={24} className="text-slate-700 mb-2" />
            <p className="text-[12px] text-slate-500">Команды ещё не запускались</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
            {commands.map((cmd) => {
              const expanded = expandedId === cmd.id;
              const tone: 'emerald' | 'gold' | 'blood' | 'slate' =
                cmd.status === 'done' ? 'emerald' : cmd.status === 'running' ? 'gold' : cmd.status === 'failed' ? 'blood' : 'slate';
              const statusLabel = cmd.status === 'done' ? 'готово' : cmd.status === 'running' ? 'работает' : cmd.status === 'failed' ? 'ошибка' : cmd.status === 'pending' ? 'в очереди' : cmd.status;
              return (
                <div key={cmd.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  <div className="p-3">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[13px] font-bold text-slate-200">{cmd.label}</span>
                          <StatusPill tone={tone}>
                            {cmd.status === 'running' && <Loader2 size={9} className="animate-spin" />}
                            {statusLabel}
                          </StatusPill>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
                          <span>#{cmd.id}</span><span>·</span><span>{fmtDate(cmd.created_at)}</span>
                          {cmd.duration_ms != null && <><span>·</span><span className="flex items-center gap-1"><Clock size={9} />{fmtDuration(cmd.duration_ms)}</span></>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {cmd.status !== 'running' && cmd.status !== 'pending' && (
                          <button type="button" onClick={() => handleDelete(cmd)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-blood hover:bg-blood/10 transition-colors" title="Удалить"><Trash2 size={11} /></button>
                        )}
                        {cmd.output && (
                          <button type="button" onClick={() => setExpandedId(expanded ? null : cmd.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
                            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {expanded && cmd.output && (
                    <div className="px-3 pb-3">
                      <pre className="text-[11px] font-mono text-slate-400 whitespace-pre-wrap break-words max-h-64 overflow-y-auto no-scrollbar rounded-lg bg-black/50 p-3 leading-relaxed">{cmd.output}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
