// Простой Avatar для админки (без SVG-фолбэка лаунчера)
import { resolveAvatarUrl } from '../../lib/api';

interface Props {
  size?: number;
  avatarUrl?: string | null;
  friendId?: string;
  className?: string;
}

export function Avatar({ size = 32, avatarUrl, friendId, className = '' }: Props) {
  const fullUrl = resolveAvatarUrl(avatarUrl);
  const initial = (friendId?.replace(/^u-?/, '') || '?').slice(0, 1).toUpperCase();

  if (fullUrl) {
    return (
      <img
        src={fullUrl}
        alt=""
        className={`rounded-full bg-abyss object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-slate-500 font-bold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.4) }}
    >
      {initial}
    </div>
  );
}
