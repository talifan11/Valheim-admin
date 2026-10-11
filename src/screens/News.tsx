import { useEffect, useState } from 'react';
import {
  Plus, Loader2, Pin, EyeOff, Eye, Pencil, Trash2, Newspaper,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import * as api from '../lib/api';
import { NewsEditorModal } from '../components/news/NewsEditorModal';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export function News() {
  const token = useAuthStore((s) => s.token);
  const [items, setItems] = useState<api.AdminNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<api.AdminNewsItem | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminNews(token);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [token]);

  const handleCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const handleEdit = (item: api.AdminNewsItem) => {
    setEditing(item);
    setEditorOpen(true);
  };

  const handleTogglePublish = async (item: api.AdminNewsItem) => {
    if (!token) return;
    setBusyId(item.id);
    try {
      await api.updateNews(token, item.id, { published: !item.published });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePin = async (item: api.AdminNewsItem) => {
    if (!token) return;
    setBusyId(item.id);
    try {
      await api.updateNews(token, item.id, { pinned: !item.pinned });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: api.AdminNewsItem) => {
    if (!token) return;
    if (!confirm(`Удалить новость?\n\n${item.title}`)) return;
    setBusyId(item.id);
    try {
      await api.deleteNews(token, item.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-8 overflow-y-auto h-full">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Новости</h1>
          <p className="text-[12px] text-slate-500 mt-1">
            Публикация без пересборки лаунчера
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold text-abyss font-bold text-[11px] uppercase tracking-[0.14em] hover:shadow-glow-gold transition-all"
        >
          <Plus size={14} />
          Новая
        </button>
      </div>

      {error && (
        <div className="glass rounded-2xl p-5 border border-blood/30 text-blood text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center">
          <Newspaper size={28} className="mx-auto text-slate-700 mb-3" />
          <p className="text-[13px] text-slate-400 font-semibold">Новостей пока нет</p>
          <p className="text-[11px] text-slate-600 mt-1">Создай первую</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className={`glass rounded-2xl p-4 transition-all ${
                !n.published ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {n.imageUrl && (
                  <img
                    src={api.resolveAvatarUrl(n.imageUrl) ?? ''}
                    alt=""
                    className="w-24 h-20 rounded-xl object-cover bg-abyss shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {n.pinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gold">
                        <Pin size={10} /> Закреп
                      </span>
                    )}
                    {!n.published && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <EyeOff size={10} /> Черновик
                      </span>
                    )}
                    {n.tag && (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-blizzard">
                        {n.tag}
                      </span>
                    )}
                  </div>
                  <h3 className="text-[14px] font-bold text-white truncate">{n.title}</h3>
                  <p className="text-[12px] text-slate-500 line-clamp-2 mt-1 leading-relaxed whitespace-pre-wrap break-words">
                    {n.description}
                  </p>
                  <div className="text-[10px] text-slate-600 font-mono mt-2">
                    {formatDate(n.createdAt)}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEdit(n)}
                    disabled={busyId === n.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-40"
                  >
                    <Pencil size={11} /> Правка
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePin(n)}
                    disabled={busyId === n.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                      n.pinned ? 'text-gold hover:bg-gold/10' : 'text-slate-500 hover:bg-white/5'
                    }`}
                  >
                    <Pin size={11} /> {n.pinned ? 'Открепить' : 'Закрепить'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(n)}
                    disabled={busyId === n.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:bg-white/5 transition-colors disabled:opacity-40"
                  >
                    {n.published ? <EyeOff size={11} /> : <Eye size={11} />}
                    {n.published ? 'Скрыть' : 'Опубликовать'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(n)}
                    disabled={busyId === n.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-blood hover:bg-blood/10 transition-colors disabled:opacity-40"
                  >
                    {busyId === n.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewsEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={load}
        editing={editing}
      />
    </div>
  );
}
