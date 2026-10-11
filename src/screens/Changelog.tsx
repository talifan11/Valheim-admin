import { useEffect, useState } from 'react';
import {
  Loader2, Plus, Server, Rocket, Package, PartyPopper, Trash2, AlertCircle, Sparkles, RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import * as api from '../lib/api';
import { ChangelogEditorModal } from '../components/changelog/ChangelogEditorModal';

const CATEGORY_META: Record<string, { label: string; icon: typeof Server; cls: string }> = {
  server:   { label: 'Сервер',  icon: Server,      cls: 'text-gold bg-gold/10 border-gold/25' },
  launcher: { label: 'Лаунчер', icon: Rocket,      cls: 'text-blizzard bg-blizzard/10 border-blizzard/25' },
  client:   { label: 'Клиент',  icon: Package,     cls: 'text-emerald bg-emerald/10 border-emerald/25' },
  event:    { label: 'Событие', icon: PartyPopper, cls: 'text-blood bg-blood/10 border-blood/25' },
};

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export function Changelog() {
  const token = useAuthStore((s) => s.token);
  const [items, setItems] = useState<api.AdminChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminChangelog(token);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [token]);

  const handleDelete = async (item: api.AdminChangelogEntry) => {
    if (!token) return;
    if (!confirm(`Удалить запись?\n\n${item.title}`)) return;
    setBusyId(item.id);
    try {
      await api.deleteChangelogEntry(token, item.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white flex items-center gap-3">
            <Sparkles size={22} className="text-gold" />
            Обновления
          </h1>
          <p className="text-[12px] text-slate-500 mt-1">
            Записи видны игрокам во вкладке «Обновления» в лаунчере
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-[11px] uppercase tracking-wider font-bold disabled:opacity-40"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          </button>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold text-abyss font-bold text-[11px] uppercase tracking-[0.14em] hover:shadow-glow-gold transition-all"
          >
            <Plus size={14} />
            Новая запись
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-blood/30 bg-blood/5 p-4 text-blood text-sm mb-4">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-slate-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] py-16 text-center">
          <Sparkles size={28} className="mx-auto text-slate-700 mb-3" />
          <p className="text-[13px] text-slate-400 font-semibold">Записей пока нет</p>
          <p className="text-[11px] text-slate-600 mt-1">Создай первую — игроки увидят её в лаунчере</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const meta = CATEGORY_META[item.category] ?? CATEGORY_META.server;
            const Icon = meta.icon;
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent p-4 hover:border-white/[0.12] transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={`shrink-0 w-11 h-11 rounded-xl ring-1 ring-inset flex items-center justify-center ${meta.cls}`}>
                    <Icon size={18} strokeWidth={2.2} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${meta.cls}`}>
                        {meta.label}
                      </span>
                      {item.version && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono font-bold text-slate-400">
                          v{item.version}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-600 font-mono">
                        #{item.id}
                      </span>
                    </div>

                    <h3 className="text-[15px] font-bold text-white leading-snug">{item.title}</h3>
                    <p className="text-[12px] text-slate-400 leading-relaxed mt-1.5 whitespace-pre-wrap break-words">
                      {item.body}
                    </p>

                    <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-600 font-mono">
                      <span>{fmtDate(item.created_at)}</span>
                      {item.author && (
                        <>
                          <span>·</span>
                          <span>@{item.author.username}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={busyId === item.id}
                    className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-blood hover:bg-blood/10 transition-colors disabled:opacity-40"
                    title="Удалить"
                  >
                    {busyId === item.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="mt-3 text-[11px] text-slate-600 font-mono text-right">
          Всего записей: {items.length}
        </div>
      )}

      <ChangelogEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
