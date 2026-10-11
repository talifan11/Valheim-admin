import { useEffect, useMemo, useState } from 'react';
import {
  Loader2, Shield, ShieldOff, Circle, Ban, ShieldCheck, Search, Users as UsersIcon,
  Crown, X,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import * as api from '../lib/api';
import { StatusPill } from '../components/ui/StatusPill';
import { ActionMenu, type ActionItem } from '../components/ui/ActionMenu';
import { BanModal } from '../components/users/BanModal';

type Filter = 'all' | 'online' | 'admin' | 'banned';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'online', label: 'Онлайн' },
  { id: 'admin', label: 'Админы' },
  { id: 'banned', label: 'Забаненные' },
];

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export function Users() {
  const token = useAuthStore((s) => s.token);
  const myId = useAuthStore((s) => s.userId);
  const [data, setData] = useState<api.AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banningUser, setBanningUser] = useState<api.AdminUser | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminUsers(token, 500, 0);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [token]);

  const handleToggleAdmin = async (user: api.AdminUser) => {
    if (!token) return;
    if (user.id === myId && user.is_admin) return;
    setBusy(user.id);
    try {
      await api.toggleAdmin(token, user.id, !user.is_admin);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(null);
    }
  };

  const handleUnban = async (user: api.AdminUser) => {
    if (!token) return;
    if (!confirm(`Разбанить ${user.username}?`)) return;
    setBusy(user.id);
    try {
      await api.unbanUser(token, user.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(null);
    }
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.users.slice();
    if (filter === 'online') list = list.filter((u) => u.online);
    if (filter === 'admin') list = list.filter((u) => u.is_admin);
    if (filter === 'banned') list = list.filter((u) => u.banned);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, filter, query]);

  const counts = useMemo(() => {
    if (!data) return { all: 0, online: 0, admin: 0, banned: 0 };
    return {
      all: data.users.length,
      online: data.users.filter((u) => u.online).length,
      admin: data.users.filter((u) => u.is_admin).length,
      banned: data.users.filter((u) => u.banned).length,
    };
  }, [data]);

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Игроки</h1>
          <p className="text-[12px] text-slate-500 mt-1">
            Управление аккаунтами сервера
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone="emerald" icon={Circle}>
            {counts.online} онлайн
          </StatusPill>
          <StatusPill tone="gold" icon={Crown}>
            {counts.admin} админов
          </StatusPill>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-blood/30 bg-blood/5 p-4 text-blood text-sm mb-4">
          {error}
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
            placeholder="Поиск по имени или email..."
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

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.05] text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500">
              <th className="px-5 py-3 w-8"></th>
              <th className="px-3 py-3">Игрок</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Роль</th>
              <th className="px-3 py-3">Последний вход</th>
              <th className="px-3 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                  <Loader2 size={20} className="animate-spin mx-auto" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  <UsersIcon size={24} className="mx-auto text-slate-700 mb-2" />
                  <p className="text-[12px] text-slate-500">Ничего не найдено</p>
                </td>
              </tr>
            ) : (
              filtered.map((user) => {
                const isMe = user.id === myId;
                const actions: ActionItem[] = [
                  {
                    label: user.is_admin ? 'Снять админку' : 'Сделать админом',
                    icon: user.is_admin ? ShieldOff : Shield,
                    tone: user.is_admin ? 'blood' : 'gold',
                    disabled: isMe && user.is_admin,
                    onClick: () => handleToggleAdmin(user),
                  },
                ];
                if (user.banned) {
                  actions.push({
                    label: 'Разбанить',
                    icon: ShieldCheck,
                    onClick: () => handleUnban(user),
                  });
                } else {
                  actions.push({
                    label: 'Забанить',
                    icon: Ban,
                    tone: 'blood',
                    disabled: isMe,
                    onClick: () => setBanningUser(user),
                  });
                }

                return (
                  <tr
                    key={user.id}
                    className={`border-b border-white/[0.03] transition-colors ${
                      user.banned ? 'bg-blood/[0.03]' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="px-5 py-3">
                      <div className="relative">
                        {user.avatar_url ? (
                          <img
                            src={api.resolveAvatarUrl(user.avatar_url) ?? ''}
                            alt=""
                            className={`w-8 h-8 rounded-full object-cover bg-abyss ring-2 ${
                              user.banned
                                ? 'ring-blood/40'
                                : user.online
                                ? 'ring-emerald/40'
                                : 'ring-white/10'
                            }`}
                          />
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[11px] font-bold text-slate-500 ring-2 ${
                              user.online ? 'ring-emerald/40' : 'ring-white/10'
                            }`}
                          >
                            {user.username.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        {user.online && !user.banned && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald border-2 border-[#0a0e14]" />
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[13px] font-semibold ${
                            user.banned
                              ? 'text-blood/70 line-through'
                              : 'text-slate-200'
                          }`}
                        >
                          {user.username}
                        </span>
                        {isMe && (
                          <StatusPill tone="gold">вы</StatusPill>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <span className="text-[12px] text-slate-500 font-mono">
                        {user.email}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {user.banned && (
                          <StatusPill tone="blood" icon={Ban}>
                            Бан
                          </StatusPill>
                        )}
                        {user.is_admin && (
                          <StatusPill tone="gold" icon={Crown}>
                            Админ
                          </StatusPill>
                        )}
                        {!user.is_admin && !user.banned && (
                          <StatusPill tone="slate">Игрок</StatusPill>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-3 text-[12px] text-slate-500 font-mono">
                      {fmtDate(user.last_seen)}
                    </td>

                    <td className="px-3 py-3 text-right">
                      {busy === user.id ? (
                        <Loader2 size={14} className="animate-spin text-slate-500 inline-block" />
                      ) : (
                        <ActionMenu items={actions} />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer счётчик */}
      {!loading && (
        <div className="mt-3 text-[11px] text-slate-600 font-mono text-right">
          Показано {filtered.length} из {counts.all}
        </div>
      )}

      <BanModal
        user={banningUser}
        onClose={() => setBanningUser(null)}
        onBanned={load}
      />
    </div>
  );
}
