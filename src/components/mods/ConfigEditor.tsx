import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Save, RotateCcw } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import * as api from '../../lib/api';

interface Props {
  relPath: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ConfigEditor({ relPath, onClose, onSaved }: Props) {
  const token = useAuthStore((s) => s.token);
  const [content, setContent] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!relPath || !token) return;
    setLoading(true);
    setError(null);
    api.readModConfig(token, relPath)
      .then((res) => {
        setContent(res.content);
        setOriginal(res.content);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка'))
      .finally(() => setLoading(false));
  }, [relPath, token]);

  const handleSave = async () => {
    if (!relPath || !token) return;
    setBusy(true);
    setError(null);
    try {
      await api.saveModConfig(token, relPath, content);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    if (content !== original) {
      if (!confirm('Отменить все изменения?')) return;
    }
    setContent(original);
  };

  if (!relPath) return null;

  const isDirty = content !== original;
  const lines = content.split('\n').length;

  const modal = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 modal-backdrop" />
      <div
        className="relative w-[900px] max-w-full h-[80vh] glass-popover rounded-[24px] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="font-display text-[15px] font-bold text-white truncate">
              {relPath}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              {lines} строк · {content.length} символов
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={busy}
              spellCheck={false}
              className="w-full h-full bg-black/40 text-[12px] font-mono text-slate-200 outline-none p-5 resize-none leading-relaxed"
            />
          )}
        </div>

        {error && (
          <div className="px-5 py-3 border-t border-blood/30 bg-blood/5 text-[12px] text-blood">
            {error}
          </div>
        )}

        <div className="p-4 border-t border-white/[0.06] flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            disabled={busy || !isDirty}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-[11px] uppercase tracking-[0.12em] font-semibold disabled:opacity-30"
          >
            <RotateCcw size={13} />
            Отменить
          </button>
          {isDirty && (
            <span className="text-[10px] font-mono text-gold px-2 py-1 rounded bg-gold/10">
              есть изменения
            </span>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl text-slate-300 hover:bg-white/5 transition-colors text-[11px] uppercase tracking-[0.12em] font-semibold disabled:opacity-40"
          >
            Закрыть
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy || !isDirty}
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
