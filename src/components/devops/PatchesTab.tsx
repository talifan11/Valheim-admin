import { useEffect, useState } from 'react';
import {
  Loader2, Play, RotateCcw, FileCode2, Check, X, AlertCircle,
  ChevronDown, ChevronUp, Clock,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import * as api from '../../lib/api';
import { StatusPill } from '../ui/StatusPill';

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export function PatchesTab() {
  const token = useAuthStore((s) => s.token);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; output: string; duration_ms: number } | null>(null);

  const [history, setHistory] = useState<api.DevopsPatch[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rollingBack, setRollingBack] = useState<number | null>(null);

  const loadHistory = async () => {
    if (!token) return;
    setLoadingHistory(true);
    try {
      const res = await api.getDevopsPatchHistory(token);
      setHistory(res.patches);
    } catch {
      // тихо
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => { void loadHistory(); }, [token]);

  const handleApply = async () => {
    if (!token) return;
    const trimmed = code.trim();
    if (trimmed.length < 20) { setError('Патч слишком короткий'); return; }
    const patchName = name.trim() || 'Патч без названия';

    if (!confirm(`Применить патч "${patchName}"?\n\nСервис будет перезапущен. При ошибке — автооткат.`)) return;

    setBusy(true); setError(null); setResult(null);
    try {
      const res = await api.applyDevopsPatch(token, patchName, code);
      setResult({ success: res.success, output: res.output, duration_ms: res.duration_ms });
      if (res.success) { setCode(''); setName(''); }
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const handleRollback = async (patch: api.DevopsPatch) => {
    if (!token) return;
    if (!confirm(`Откатить патч "${patch.name}"?\n\nБудет восстановлен main.py от ${fmtDate(patch.created_at)}.\nСервис перезапустится.`)) return;
    setRollingBack(patch.id);
    try {
      await api.rollbackDevopsPatch(token, patch.id);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отката');
    } finally {
      setRollingBack(null);
    }
  };

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5 overflow-hidden">
      <div className="flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <FileCode2 size={14} className="text-gold" />
            <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">Новый патч</span>
          </div>
          <span className="text-[10px] text-slate-600 font-mono">Python 3 · subprocess</span>
        </div>

        <div className="mb-3 shrink-0">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            placeholder="Название патча (например: Добавить статистику форума)"
            maxLength={100}
            className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-gold transition-colors disabled:opacity-50"
          />
        </div>

        <div className="flex-1 relative min-h-0 rounded-2xl border border-white/[0.06] bg-black/40 overflow-hidden">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={busy}
            spellCheck={false}
            placeholder={'from pathlib import Path\n\np = Path("/opt/valheim-api/main.py")\ntext = p.read_text(encoding="utf-8")\n\n# твой патч тут\n\ntext += "\\n\\n# новый код"\np.write_text(text, encoding="utf-8")\nprint("OK: патч применён")'}
            className="w-full h-full bg-transparent text-[12px] font-mono text-slate-200 placeholder-slate-700 outline-none p-4 resize-none leading-relaxed"
          />
          <div className="absolute bottom-2 right-3 text-[10px] font-mono text-slate-700">{code.length} символов</div>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-blood/30 bg-blood/5 p-3 text-blood text-[12px] shrink-0">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className={`mt-3 rounded-xl border p-3 shrink-0 ${result.success ? 'border-emerald/30 bg-emerald/5' : 'border-blood/30 bg-blood/5'}`}>
            <div className={`flex items-center gap-2 mb-2 text-[12px] font-bold ${result.success ? 'text-emerald' : 'text-blood'}`}>
              {result.success ? <Check size={14} /> : <X size={14} />}
              {result.success ? 'Успешно' : 'Ошибка'}
              <span className="ml-auto flex items-center gap-1 text-slate-500 font-mono font-normal">
                <Clock size={10} />{result.duration_ms} ms
              </span>
            </div>
            <pre className="text-[11px] font-mono text-slate-400 whitespace-pre-wrap break-words max-h-32 overflow-y-auto no-scrollbar">{result.output || '(пусто)'}</pre>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleApply}
            disabled={busy || code.trim().length < 20}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gold text-abyss font-bold text-[11px] uppercase tracking-[0.12em] hover:shadow-glow-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {busy ? 'Применяется...' : 'Применить патч'}
          </button>
          <button
            type="button"
            onClick={() => setCode('')}
            disabled={busy || !code}
            className="px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-[11px] uppercase tracking-[0.12em] font-semibold disabled:opacity-30"
          >Очистить</button>
        </div>
      </div>

      <div className="flex flex-col min-h-0 rounded-2xl border border-white/[0.06] bg-white/[0.01] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between shrink-0">
          <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">История</span>
          <StatusPill tone="slate">{history.length}</StatusPill>
        </div>

        {loadingHistory ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
            <FileCode2 size={24} className="text-slate-700 mb-2" />
            <p className="text-[12px] text-slate-500">Патчей ещё не было</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
            {history.map((patch) => {
              const expanded = expandedId === patch.id;
              return (
                <div key={patch.id} className={`rounded-xl border transition-colors ${patch.success ? 'border-white/[0.06] bg-white/[0.02]' : 'border-blood/20 bg-blood/[0.03]'}`}>
                  <div className="p-3">
                    <div className="flex items-start gap-2 mb-1.5">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${patch.success ? 'bg-emerald/15 text-emerald' : 'bg-blood/15 text-blood'}`}>
                        {patch.success ? <Check size={11} /> : <X size={11} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-bold text-slate-200 truncate">{patch.name}</div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono mt-0.5">
                          <span>{fmtDate(patch.created_at)}</span>
                          {patch.duration_ms != null && <><span>·</span><span>{patch.duration_ms} ms</span></>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2 ml-7">
                      {patch.backup && (
                        <button
                          type="button"
                          onClick={() => handleRollback(patch)}
                          disabled={rollingBack === patch.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-gold hover:bg-gold/10 transition-colors disabled:opacity-40"
                        >
                          {rollingBack === patch.id ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
                          Откатить
                        </button>
                      )}
                      {patch.output && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : patch.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-slate-500 hover:bg-white/5 transition-colors"
                        >
                          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}Вывод
                        </button>
                      )}
                    </div>
                  </div>
                  {expanded && patch.output && (
                    <div className="px-3 pb-3">
                      <pre className="text-[10px] font-mono text-slate-500 whitespace-pre-wrap break-words max-h-40 overflow-y-auto no-scrollbar rounded-lg bg-black/40 p-2 leading-relaxed">{patch.output}</pre>
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
