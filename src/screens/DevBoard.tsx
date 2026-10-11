import { useEffect, useMemo, useState } from 'react';
import {
  Loader2, Plus, Search, X, AlertCircle, GripVertical, Flag,
  Inbox, Zap, Eye, CheckCircle2, Pencil, Trash2,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import * as api from '../lib/api';
import { TaskModal } from '../components/dev/TaskModal';

const COLUMNS: {
  id: api.DevStatus;
  label: string;
  icon: typeof Inbox;
  gradient: string;
  border: string;
  text: string;
  dot: string;
}[] = [
  {
    id: 'backlog',
    label: 'Бэклог',
    icon: Inbox,
    gradient: 'from-slate-500/[0.06]',
    border: 'border-slate-500/20',
    text: 'text-slate-400',
    dot: 'bg-slate-500',
  },
  {
    id: 'in_progress',
    label: 'В работе',
    icon: Zap,
    gradient: 'from-blizzard/[0.08]',
    border: 'border-blizzard/25',
    text: 'text-blizzard',
    dot: 'bg-blizzard',
  },
  {
    id: 'review',
    label: 'Ревью',
    icon: Eye,
    gradient: 'from-gold/[0.08]',
    border: 'border-gold/25',
    text: 'text-gold',
    dot: 'bg-gold',
  },
  {
    id: 'done',
    label: 'Готово',
    icon: CheckCircle2,
    gradient: 'from-emerald/[0.08]',
    border: 'border-emerald/25',
    text: 'text-emerald',
    dot: 'bg-emerald',
  },
];

const PRIORITY_STYLES: Record<
  api.DevPriority,
  { label: string; cls: string; border: string }
> = {
  low: {
    label: 'Низкий',
    cls: 'text-slate-400 bg-white/5',
    border: 'border-l-slate-600',
  },
  medium: {
    label: 'Средний',
    cls: 'text-blizzard bg-blizzard/10',
    border: 'border-l-blizzard',
  },
  high: {
    label: 'Высокий',
    cls: 'text-gold bg-gold/10',
    border: 'border-l-gold',
  },
  critical: {
    label: 'Критично',
    cls: 'text-blood bg-blood/10',
    border: 'border-l-blood',
  },
};

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'сейчас';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} дн`;
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
  } catch { return ''; }
}

export function DevBoard() {
  const token = useAuthStore((s) => s.token);
  const [tasks, setTasks] = useState<api.DevTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<api.DevTask | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<api.DevStatus>('backlog');
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ status: api.DevStatus; index: number } | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDevTasks(token);
      setTasks(res.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [token]);

  const byStatus = useMemo(() => {
    const map: Record<api.DevStatus, api.DevTask[]> = {
      backlog: [],
      in_progress: [],
      review: [],
      done: [],
    };
    const filtered = query.trim()
      ? tasks.filter((t) =>
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          t.description.toLowerCase().includes(query.toLowerCase()) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase())),
        )
      : tasks;
    for (const t of filtered) {
      map[t.status].push(t);
    }
    for (const k of Object.keys(map) as api.DevStatus[]) {
      map[k].sort((a, b) => a.order_index - b.order_index || b.id - a.id);
    }
    return map;
  }, [tasks, query]);

  const handleCreate = (status: api.DevStatus) => {
    setEditing(null);
    setDefaultStatus(status);
    setModalOpen(true);
  };

  const handleEdit = (task: api.DevTask) => {
    setEditing(task);
    setModalOpen(true);
  };

  const handleQuickDelete = async (e: React.MouseEvent, task: api.DevTask) => {
    e.stopPropagation();
    if (!token) return;
    if (!confirm(`Удалить задачу?\n\n${task.title}`)) return;
    try {
      await api.deleteDevTask(token, task.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleDragStart = (e: React.DragEvent, task: api.DevTask) => {
    setDraggingId(task.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(task.id));
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, status: api.DevStatus, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dropTarget || dropTarget.status !== status || dropTarget.index !== index) {
      setDropTarget({ status, index });
    }
  };

  const handleDrop = async (e: React.DragEvent, status: api.DevStatus, index: number) => {
    e.preventDefault();
    if (!token || draggingId === null) return;

    const task = tasks.find((t) => t.id === draggingId);
    if (!task) return;

    const columnTasks = byStatus[status].filter((t) => t.id !== draggingId);
    let newOrder: number;

    if (columnTasks.length === 0) {
      newOrder = 0;
    } else if (index === 0) {
      newOrder = columnTasks[0].order_index - 1;
    } else if (index >= columnTasks.length) {
      newOrder = columnTasks[columnTasks.length - 1].order_index + 1;
    } else {
      newOrder = (columnTasks[index - 1].order_index + columnTasks[index].order_index) / 2;
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggingId ? { ...t, status, order_index: newOrder } : t,
      ),
    );

    setDraggingId(null);
    setDropTarget(null);

    try {
      await api.moveDevTask(token, draggingId, status, Math.round(newOrder));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка перемещения');
      await load();
    }
  };

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const progressPct = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-5 flex items-start justify-between shrink-0">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Разработка</h1>
          <p className="text-[12px] text-slate-500 mt-1">
            Kanban-доска задач проекта
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress summary */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500">
                Прогресс
              </div>
              <div className="text-[13px] font-bold text-white font-mono leading-tight">
                {doneTasks} / {totalTasks}
              </div>
            </div>
            <div className="w-20 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald to-emerald/50 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[12px] font-mono font-bold text-emerald">
              {progressPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3 shrink-0">
        <div className="relative w-80">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию, описанию, тегам..."
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

        <button
          type="button"
          onClick={() => handleCreate('backlog')}
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gold text-abyss font-bold text-[11px] uppercase tracking-[0.12em] hover:shadow-glow-gold transition-all"
        >
          <Plus size={13} />
          Новая задача
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-blood/30 bg-blood/5 p-4 text-blood text-sm mb-4 shrink-0">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-0">
          {COLUMNS.map((col) => {
            const colTasks = byStatus[col.id];
            const Icon = col.icon;
            const isDropActive = dropTarget?.status === col.id;

            return (
              <div
                key={col.id}
                className={`flex flex-col min-h-0 rounded-2xl border bg-gradient-to-b ${col.gradient} to-transparent overflow-hidden transition-colors ${
                  isDropActive ? 'border-gold/40' : 'border-white/[0.05]'
                }`}
              >
                {/* Заголовок колонки */}
                <div className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${
                  isDropActive ? 'border-gold/30 bg-gold/[0.03]' : 'border-white/[0.04]'
                }`}>
                  <div className="flex items-center gap-2">
                    <Icon size={13} className={col.text} />
                    <span className={`text-[11px] font-bold uppercase tracking-[0.1em] ${col.text}`}>
                      {col.label}
                    </span>
                    <span className="text-[11px] font-mono text-slate-600 ml-0.5">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCreate(col.id)}
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-slate-500 transition-colors hover:bg-white/[0.05] ${col.text}`}
                    title="Добавить задачу"
                  >
                    <Plus size={13} />
                  </button>
                </div>

                {/* Прогресс-полоска колонки */}
                <div className="h-0.5 bg-white/[0.02] shrink-0">
                  <div
                    className={`h-full ${col.dot} opacity-60 transition-all duration-500`}
                    style={{
                      width: totalTasks === 0 ? '0%' : `${(colTasks.length / totalTasks) * 100}%`,
                    }}
                  />
                </div>

                {/* Карточки */}
                <div
                  className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2 min-h-0"
                  onDragOver={(e) => handleDragOver(e, col.id, colTasks.length)}
                  onDrop={(e) => handleDrop(e, col.id, colTasks.length)}
                >
                  {colTasks.length === 0 && (
                    <div
                      className={`rounded-xl border border-dashed py-8 text-center transition-colors ${
                        isDropActive
                          ? 'border-gold/50 bg-gold/[0.04]'
                          : 'border-white/[0.06]'
                      }`}
                    >
                      <p className="text-[11px] text-slate-600">Пусто</p>
                    </div>
                  )}

                  {colTasks.map((task, index) => {
                    const isDragging = draggingId === task.id;
                    const isDropHere =
                      dropTarget?.status === col.id && dropTarget.index === index;
                    const prio = PRIORITY_STYLES[task.priority];
                    return (
                      <div key={task.id}>
                        {isDropHere && (
                          <div className="h-1 bg-gold/60 rounded-full mb-1" />
                        )}
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, task)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => {
                            e.stopPropagation();
                            handleDragOver(e, col.id, index);
                          }}
                          onDrop={(e) => {
                            e.stopPropagation();
                            handleDrop(e, col.id, index);
                          }}
                          onClick={() => handleEdit(task)}
                          className={`group relative rounded-xl border border-white/[0.06] border-l-[3px] ${prio.border} bg-white/[0.02] p-3 cursor-pointer transition-all hover:bg-white/[0.04] hover:border-white/[0.12] ${
                            isDragging ? 'opacity-40 border-gold/40' : ''
                          }`}
                        >
                          {/* Hover actions */}
                          <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(task);
                              }}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                              title="Редактировать"
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleQuickDelete(e, task)}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-blood hover:bg-blood/10 transition-colors"
                              title="Удалить"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>

                          <div className="flex items-start gap-2 mb-2">
                            <GripVertical
                              size={12}
                              className="text-slate-700 group-hover:text-slate-500 transition-colors shrink-0 mt-0.5 cursor-grab"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap pr-12">
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${prio.cls}`}
                                >
                                  <Flag size={8} />
                                  {prio.label}
                                </span>
                              </div>
                              <div className="text-[13px] font-semibold text-slate-200 leading-snug">
                                {task.title}
                              </div>
                            </div>
                          </div>

                          {task.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed ml-[22px] whitespace-pre-wrap break-words">
                              {task.description}
                            </p>
                          )}

                          {task.tags.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mt-2 ml-[22px]">
                              {task.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-500 border border-white/[0.06]"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-end mt-2 ml-[22px]">
                            <span className="text-[9px] text-slate-600 font-mono">
                              {fmtDate(task.updated_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {dropTarget?.status === col.id && dropTarget.index === colTasks.length && colTasks.length > 0 && (
                    <div className="h-1 bg-gold/60 rounded-full" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        editing={editing}
        defaultStatus={defaultStatus}
      />
    </div>
  );
}
