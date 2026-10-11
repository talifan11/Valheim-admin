import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Save, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import * as api from '../../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: api.DevTask | null;
  defaultStatus?: api.DevStatus;
}

const PRIORITIES: { id: api.DevPriority; label: string; color: string }[] = [
  { id: 'low', label: 'Низкий', color: 'text-slate-400' },
  { id: 'medium', label: 'Средний', color: 'text-blizzard' },
  { id: 'high', label: 'Высокий', color: 'text-gold' },
  { id: 'critical', label: 'Критично', color: 'text-blood' },
];

const STATUSES: { id: api.DevStatus; label: string }[] = [
  { id: 'backlog', label: 'Бэклог' },
  { id: 'in_progress', label: 'В работе' },
  { id: 'review', label: 'Ревью' },
  { id: 'done', label: 'Готово' },
];

export function TaskModal({ open, onClose, onSaved, editing, defaultStatus }: Props) {
  const token = useAuthStore((s) => s.token);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<api.DevStatus>('backlog');
  const [priority, setPriority] = useState<api.DevPriority>('medium');
  const [tagsInput, setTagsInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editing) {
        setTitle(editing.title);
        setDescription(editing.description);
        setStatus(editing.status);
        setPriority(editing.priority);
        setTagsInput(editing.tags.join(', '));
      } else {
        setTitle('');
        setDescription('');
        setStatus(defaultStatus ?? 'backlog');
        setPriority('medium');
        setTagsInput('');
      }
      setError(null);
    }
  }, [open, editing, defaultStatus]);

  const handleSave = async () => {
    if (!token) return;
    const t = title.trim();
    if (t.length < 2) { setError('Заголовок минимум 2 символа'); return; }

    const tags = tagsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await api.updateDevTask(token, editing.id, {
          title: t,
          description: description.trim(),
          status,
          priority,
          tags,
        });
      } else {
        await api.createDevTask(token, {
          title: t,
          description: description.trim(),
          status,
          priority,
          tags,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !editing) return;
    if (!confirm(`Удалить задачу?\n\n${editing.title}`)) return;
    setBusy(true);
    try {
      await api.deleteDevTask(token, editing.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const modal = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 modal-backdrop" />
      <div
        className="relative w-[560px] max-h-[90vh] glass-popover rounded-[24px] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <h3 className="font-display text-lg font-bold text-white">
            {editing ? 'Редактировать задачу' : 'Новая задача'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
              Заголовок
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
              maxLength={200}
              autoFocus
              placeholder="Что нужно сделать..."
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-gold transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
              rows={4}
              maxLength={2000}
              placeholder="Детали, требования, ссылки..."
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-gold transition-colors resize-none disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
                Статус
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as api.DevStatus)}
                disabled={busy}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold transition-colors disabled:opacity-50"
              >
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#141923]">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
                Приоритет
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as api.DevPriority)}
                disabled={busy}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold transition-colors disabled:opacity-50"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#141923]">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
              Теги <span className="text-slate-600 normal-case tracking-normal">(через запятую)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              disabled={busy}
              placeholder="ui, auth, bug"
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-gold transition-colors disabled:opacity-50"
            />
          </div>

          {error && <p className="text-[12px] text-blood text-center">{error}</p>}
        </div>

        <div className="p-4 border-t border-white/[0.06] flex items-center gap-2 shrink-0">
          {editing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-blood hover:bg-blood/10 transition-colors text-[11px] uppercase tracking-[0.12em] font-semibold disabled:opacity-40"
            >
              <Trash2 size={13} />
              Удалить
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl text-slate-300 hover:bg-white/5 transition-colors text-[11px] uppercase tracking-[0.12em] font-semibold disabled:opacity-40"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold text-abyss font-bold text-[11px] uppercase tracking-[0.12em] hover:shadow-glow-gold transition-all disabled:opacity-40"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
