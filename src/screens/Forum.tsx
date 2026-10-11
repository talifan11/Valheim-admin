import { useEffect, useMemo, useState } from 'react';
import {
  Loader2, Pin, PinOff, Lock, LockOpen, Trash2, MessageCircle, Eye,
  MessageSquare, AlertCircle, Search, X,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import * as api from '../lib/api';
import { StatusPill } from '../components/ui/StatusPill';
import { ActionMenu, type ActionItem } from '../components/ui/ActionMenu';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

type Filter = 'all' | 'pinned' | 'locked' | 'unanswered';

export function Forum() {
  const token = useAuthStore((s) => s.token);
  const [threads, setThreads] = useState<api.AdminThread[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminThreads(token, 200, 0);
      setThreads(res.threads);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [token]);

  const handlePin = async (t: api.AdminThread) => {
    if (!token) return;
    setBusyId(t.id);
    try {
      await api.pinThread(token, t.id, !t.pinned);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusyId(null);
    }
  };

  const handleLock = async (t: api.AdminThread) => {
    if (!token) return;
    setBusyId(t.id);
    try {
      await api.lockThread(token, t.id, !t.locked);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (t: api.AdminThread) => {
    if (!token) return;
    if (!confirm(`Удалить тред?\n\n${t.title}\n\nВсе ${t.reply_count} ответов тоже удалятся.`)) return;
    setBusyId(t.id);
    try {
      await api.deleteThread(token, t.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusyId(null);
    }
  };

  const counts = useMemo(() => ({
    all: threads.length,
    pinned: threads.filter((t) => t.pinned).length,
    locked: threads.filter((t) => t.locked).length,
    unanswered: threads.filter((t) => t.reply_count === 0).length,
  }), [threads]);

  const filtered = useMemo(() => {
    let list = threads.slice();
    if (filter === 'pinned') list = list.filter((t) => t.pinned);
    if (filter === 'locked') list = list.filter((t) => t.locked);
    if (filter === 'unanswered') list = list.filter((t) => t.reply_count === 0);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (t) => t.title.toLowerCase().includes(q) || t.author.username.toLowerCase().includes(q),
      );
    }
    return list;
  }, [threads, filter, query]);

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'pinned', label: 'Закреп' },
    { id: 'locked', label: 'Закрыты' },
    { id: 'unanswered', label: 'Без ответа' },
  ];

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Форум</h1>
          <p className="text-[12px] text-slate-500 mt-1">
            Модерация тредов и обсуждений
          </p>
        </div>
        <StatusPill tone="blizzard" icon={MessageSquare}>
          {total} тредов
        </StatusPill>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-blood/30 bg-blood/5 p-4 text-blood text-sm mb-4">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-0.5 border-b border-white/[0.06]">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`relative px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${
                filter === f.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-[10px] font-mono text-slate-600">
                {counts[f.id]}
              </span>
              {filter === f.id && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gold rounded-t" />
              )}
            </button>
          ))}
        </div>

        <div className="ml-auto relative w-72">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по заголовку или автору..."
            className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl pl-8 pr-8 py-2 text-[12px] text-slate-200 placeholder-slate-600 outline-none focus:border-gold/40 transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] py-16 text-center">
          <MessageSquare size={24} className="mx-auto text-slate-700 mb-3" />
          <p className="text-[13px] text-slate-400 font-semibold">Ничего не найдено</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const actions: ActionItem[] = [
              {
                label: t.pinned ? 'Открепить' : 'Закрепить',
                icon: t.pinned ? PinOff : Pin,
                tone: t.pinned ? 'default' : 'gold',
                onClick: () => handlePin(t),
              },
              {
                label: t.locked ? 'Открыть' : 'Закрыть',
                icon: t.locked ? LockOpen : Lock,
                onClick: () => handleLock(t),
              },
              {
                label: 'Удалить',
                icon: Trash2,
                tone: 'blood',
                onClick: () => handleDelete(t),
              },
            ];

            return (
              <div
                key={t.id}
                className={`rounded-2xl border transition-all ${
                  t.locked
                    ? 'border-white/[0.03] bg-white/[0.005] opacity-75'
                    : 'border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent hover:border-white/[0.1]'
                } p-4`}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  {t.author.avatar_url ? (
                    <img
                      src={api.resolveAvatarUrl(t.author.avatar_url) ?? ''}
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover bg-abyss ring-1 ring-white/[0.08] shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[14px] font-bold text-slate-500 ring-1 ring-white/[0.08] shrink-0">
                      {t.author.username.slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      {t.pinned && (
                        <StatusPill tone="gold" icon={Pin}>
                          Закреп
                        </StatusPill>
                      )}
                      {t.locked && (
                        <StatusPill tone="blood" icon={Lock}>
                          Закрыт
                        </StatusPill>
                      )}
                      <StatusPill tone="blizzard">
                        {t.category.title}
                      </StatusPill>
                    </div>

                    <h3 className="text-[15px] font-bold text-white leading-snug">
                      {t.title}
                    </h3>
                    <p className="text-[12px] text-slate-500 line-clamp-2 mt-1.5 leading-relaxed whitespace-pre-wrap break-words">
                      {t.body_preview}
                    </p>

                    <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-semibold">
                          @{t.author.username}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle size={11} />
                        <span className="font-mono">{t.reply_count}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={11} />
                        <span className="font-mono">{t.views}</span>
                      </span>
                      <span className="text-slate-600 font-mono ml-auto">
                        {formatDate(t.updated_at)}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {busyId === t.id ? (
                      <Loader2 size={16} className="animate-spin text-slate-500" />
                    ) : (
                      <ActionMenu items={actions} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && (
        <div className="mt-3 text-[11px] text-slate-600 font-mono text-right">
          Показано {filtered.length} из {total}
        </div>
      )}
    </div>
  );
}
