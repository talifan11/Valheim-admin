import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Image as ImageIcon, Save, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import * as api from '../../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: api.AdminNewsItem | null;
}

export function NewsEditorModal({ open, onClose, onSaved, editing }: Props) {
  const token = useAuthStore((s) => s.token);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState('');
  const [published, setPublished] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editing) {
        setTitle(editing.title);
        setBody(editing.description);
        setTag(editing.tag ?? '');
        setPublished(editing.published);
        setPinned(editing.pinned);
        setImageUrl(editing.imageUrl);
      } else {
        setTitle('');
        setBody('');
        setTag('');
        setPublished(true);
        setPinned(false);
        setImageUrl(null);
      }
      setError(null);
    }
  }, [open, editing]);

  const handleSave = async () => {
    if (!token) return;
    const t = title.trim();
    const b = body.trim();
    if (t.length < 3) { setError('Заголовок минимум 3 символа'); return; }
    if (b.length < 10) { setError('Текст минимум 10 символов'); return; }

    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await api.updateNews(token, editing.id, {
          title: t,
          body: b,
          tag: tag.trim() || null,
          published,
          pinned,
          image_url: imageUrl,
        });
      } else {
        await api.createNews(token, {
          title: t,
          body: b,
          tag: tag.trim() || null,
          published,
          pinned,
          image_url: imageUrl,
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

  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !token) return;
    if (!f.type.startsWith('image/')) { setError('Только картинки'); return; }
    if (f.size > 5 * 1024 * 1024) { setError('Максимум 5 MB'); return; }

    // Сначала создадим новость если ещё не создана — иначе картинку некуда
    let newsId = editing?.id;
    if (!newsId) {
      setError('Сначала сохрани новость, потом загружай картинку');
      return;
    }

    setUploadingImage(true);
    setUploadProgress(0);
    setError(null);
    try {
      const res = await api.uploadNewsImage(token, newsId, f, setUploadProgress);
      setImageUrl(res.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
  };

  if (!open) return null;

  const modal = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 modal-backdrop" />
      <div
        className="relative w-[680px] max-h-[90vh] glass-popover rounded-[24px] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <h3 className="font-display text-lg font-bold text-white">
            {editing ? 'Редактировать новость' : 'Новая новость'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy || uploadingImage}
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
              placeholder="Что нового..."
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-gold transition-colors disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
                Тег
              </label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                disabled={busy}
                maxLength={30}
                placeholder="Анонс / Обновление / Событие"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-gold transition-colors disabled:opacity-50"
              />
            </div>

            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${published ? 'bg-gold border-gold' : 'border-white/30'}`}>
                  {published && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1 5L4 8L9 2" stroke="#0a0e14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="hidden" />
                <span className="text-[12px] text-slate-300">Опубликовано</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${pinned ? 'bg-gold border-gold' : 'border-white/30'}`}>
                  {pinned && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1 5L4 8L9 2" stroke="#0a0e14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="hidden" />
                <span className="text-[12px] text-slate-300">Закрепить</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
              Текст
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={busy}
              rows={8}
              maxLength={5000}
              placeholder="Подробности..."
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-gold transition-colors resize-none disabled:opacity-50"
            />
            <div className="text-[10px] font-mono text-slate-600 mt-1 text-right">
              {body.length} / 5000
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
              Картинка
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePickImage}
            />

            {imageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-white/10">
                <img
                  src={api.resolveAvatarUrl(imageUrl) ?? ''}
                  alt=""
                  className="w-full h-44 object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blood/90 text-white text-[11px] font-semibold hover:bg-blood transition-colors"
                >
                  <Trash2 size={12} />
                  Убрать
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={!editing || uploadingImage}
                className="w-full flex flex-col items-center gap-2 bg-black/40 border border-dashed border-white/15 rounded-xl px-4 py-8 hover:bg-black/60 hover:border-gold/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ImageIcon size={20} className="text-slate-500" />
                <span className="text-[12px] text-slate-500">
                  {editing ? 'Загрузить картинку' : 'Сохрани новость сначала, потом загрузи картинку'}
                </span>
                {uploadingImage && (
                  <span className="text-[11px] font-mono text-gold">{uploadProgress}%</span>
                )}
              </button>
            )}
          </div>

          {error && <p className="text-[12px] text-blood text-center">{error}</p>}
        </div>

        <div className="p-4 border-t border-white/[0.06] flex items-center justify-end gap-2 shrink-0">
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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold text-abyss font-bold text-[11px] uppercase tracking-[0.12em] hover:shadow-glow-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
