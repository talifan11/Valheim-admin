import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Ban, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import * as api from '../../lib/api';

interface Props {
  user: api.AdminUser | null;
  onClose: () => void;
  onBanned: () => void;
}

export function BanModal({ user, onClose, onBanned }: Props) {
  const token = useAuthStore((s) => s.token);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleBan = async () => {
    if (!token) return;
    const r = reason.trim();
    if (r.length < 3) {
      setError('Укажи причину (минимум 3 символа)');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.banUser(token, user.id, r);
      onBanned();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 modal-backdrop" />
      <div
        className="relative w-[460px] glass-popover rounded-[24px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blood/10 ring-1 ring-blood/25 flex items-center justify-center text-blood">
              <Ban size={16} />
            </div>
            <h3 className="font-display text-lg font-bold text-white">Забанить игрока</h3>
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

        <div className="p-5 space-y-4">
          <div className="glass rounded-xl p-3 flex items-center gap-3">
            {user.avatar_url ? (
              <img
                src={api.resolveAvatarUrl(user.avatar_url) ?? ''}
                alt=""
                className="w-10 h-10 rounded-full object-cover bg-abyss"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 text-sm font-bold">
                {user.username.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-white truncate">{user.username}</div>
              <div className="text-[11px] text-slate-500 font-mono truncate">{user.email}</div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
              Причина
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
              rows={3}
              maxLength={200}
              placeholder="Например: читерство, гриффинг, оскорбления..."
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blood transition-colors resize-none disabled:opacity-50"
            />
            <div className="text-[10px] font-mono text-slate-600 mt-1 text-right">
              {reason.length} / 200
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Игрок не сможет зайти в лаунчер до разбана.
          </p>

          {error && <p className="text-[12px] text-blood text-center">{error}</p>}
        </div>

        <div className="p-4 border-t border-white/[0.06] flex items-center justify-end gap-2">
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
            onClick={handleBan}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blood text-white font-bold text-[11px] uppercase tracking-[0.12em] hover:shadow-[0_0_24px_rgba(255,85,102,0.5)] transition-all disabled:opacity-40"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
            Забанить
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
