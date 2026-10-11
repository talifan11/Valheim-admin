import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Save, Server, Rocket, Package, PartyPopper } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import * as api from '../../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES = [
  { id: 'server',   label: 'Сервер',   icon: Server,      cls: 'text-gold' },
  { id: 'launcher', label: 'Лаунчер',  icon: Rocket,      cls: 'text-blizzard' },
  { id: 'client',   label: 'Клиент',   icon: Package,     cls: 'text-emerald' },
  { id: 'event',    label: 'Событие',  icon: PartyPopper, cls: 'text-blood' },
];

export function ChangelogEditorModal({ open, onClose, onSaved }: Props) {
  const token = useAuthStore((s) => s.token);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [version, setVersion] = useState('');
  const [category, setCategory] = useState('server');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle('');
    setBody('');
    setVersion('');
    setCategory('server');
    setError(null);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!token) return;
    const t = title.trim();
    const b = body.trim();
    if (t.length < 3) { setError('Заголовок минимум 3 символа'); return; }
    if (b.length < 10) { setError('Текст минимум 10 символов'); return; }

    setBusy(true);
    setError(null);
    try {
      await api.createChangelogEntry(token, {
        title: t,
        body: b,
        version: version.trim() || null,
        category,
      });
      onSaved();
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const modal = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6" onClick={handleClose}>
      <div className="absolute inset-0 modal-backdrop" />
      <div
        className="relative w-[600px] max-h-[90vh] glass-popover rounded-[24px] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <h3 className="font-display text-lg font-bold text-white">Новая запись в обновлениях</h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
              Категория
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                      active
                        ? `${c.cls} border-current/40 bg-white/[0.04]`
                        : 'border-white/[0.06] text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_140px] gap-4">
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
                placeholder="Что нового..."
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-gold transition-colors disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
                Версия
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={busy}
                maxLength={20}
                placeholder="1.0.19"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 outline-none focus:border-gold transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
              Описание
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={busy}
              rows={6}
              maxLength={3000}
              placeholder="Что изменилось, что добавилось, что починили..."
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-gold transition-colors resize-none disabled:opacity-50"
            />
            <div className="text-[10px] font-mono text-slate-600 mt-1 text-right">
              {body.length} / 3000
            </div>
          </div>

          {error && <p className="text-[12px] text-blood text-center">{error}</p>}
        </div>

        <div className="p-4 border-t border-white/[0.06] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={handleClose}
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
            Опубликовать
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
