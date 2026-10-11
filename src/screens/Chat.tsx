import { useEffect, useMemo, useState } from 'react';
import {
  Loader2, Trash2, MessageSquare, Users, AlertCircle, Search, X, Send,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import * as api from '../lib/api';
import { StatusPill } from '../components/ui/StatusPill';

type Tab = 'general' | 'dm';

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export function Chat() {
  const token = useAuthStore((s) => s.token);
  const [tab, setTab] = useState<Tab>('general');
  const [error, setError] = useState<string | null>(null);

  // General
  const [general, setGeneral] = useState<api.AdminChatMessage[]>([]);
  const [generalTotal, setGeneralTotal] = useState(0);
  const [loadingGeneral, setLoadingGeneral] = useState(true);
  const [busyGeneralId, setBusyGeneralId] = useState<number | null>(null);
  const [generalQuery, setGeneralQuery] = useState('');

  // DM
  const [dmUsers, setDmUsers] = useState<api.AdminChatUser[]>([]);
  const [selectedA, setSelectedA] = useState<number | null>(null);
  const [selectedB, setSelectedB] = useState<number | null>(null);
  const [dmMessages, setDmMessages] = useState<api.AdminDmMessage[]>([]);
  const [loadingDm, setLoadingDm] = useState(false);
  const [busyDmId, setBusyDmId] = useState<number | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const loadGeneral = async () => {
    if (!token) return;
    setLoadingGeneral(true);
    setError(null);
    try {
      const res = await api.getAdminGeneralChat(token, 200, 0);
      setGeneral(res.messages);
      setGeneralTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoadingGeneral(false);
    }
  };

  const loadUsers = async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const users = await api.getAdminChatUsers(token);
      setDmUsers(users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadDm = async (a: number, b: number) => {
    if (!token) return;
    setLoadingDm(true);
    setError(null);
    try {
      const msgs = await api.getAdminDm(token, a, b);
      setDmMessages(msgs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoadingDm(false);
    }
  };

  useEffect(() => {
    if (tab === 'general') void loadGeneral();
    if (tab === 'dm') void loadUsers();
  }, [tab, token]);

  useEffect(() => {
    if (selectedA !== null && selectedB !== null && selectedA !== selectedB) {
      void loadDm(selectedA, selectedB);
    }
  }, [selectedA, selectedB, token]);

  const handleDeleteGeneral = async (id: number) => {
    if (!token) return;
    if (!confirm('Удалить сообщение?')) return;
    setBusyGeneralId(id);
    try {
      await api.deleteGeneralMessage(token, id);
      await loadGeneral();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusyGeneralId(null);
    }
  };

  const handleDeleteDm = async (id: number) => {
    if (!token) return;
    if (!confirm('Удалить сообщение?')) return;
    setBusyDmId(id);
    try {
      await api.deleteDmMessage(token, id);
      if (selectedA !== null && selectedB !== null) await loadDm(selectedA, selectedB);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusyDmId(null);
    }
  };

  const selectedNames = useMemo(() => {
    const nameOf = (id: number | null) =>
      id === null ? '—' : (dmUsers.find((u) => u.user_id === id)?.username ?? '—');
    return { a: nameOf(selectedA), b: nameOf(selectedB) };
  }, [selectedA, selectedB, dmUsers]);

  const filteredGeneral = useMemo(() => {
    if (!generalQuery.trim()) return general;
    const q = generalQuery.toLowerCase();
    return general.filter(
      (m) => m.text.toLowerCase().includes(q) || m.author.username.toLowerCase().includes(q),
    );
  }, [general, generalQuery]);

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Чат</h1>
          <p className="text-[12px] text-slate-500 mt-1">
            Модерация общего чата и личных сообщений
          </p>
        </div>
        <StatusPill tone="emerald">
          {tab === 'general' ? `${generalTotal} сообщений` : `${dmUsers.length} активных`}
        </StatusPill>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 border-b border-white/[0.06] mb-5">
        <button
          type="button"
          onClick={() => setTab('general')}
          className={`relative px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${
            tab === 'general' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Общий чат
          {tab === 'general' && (
            <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gold rounded-t" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('dm')}
          className={`relative px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${
            tab === 'dm' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Личные
          {tab === 'dm' && (
            <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gold rounded-t" />
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-blood/30 bg-blood/5 p-4 text-blood text-sm mb-4">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* GENERAL */}
      {tab === 'general' && (
        <div>
          <div className="mb-4 relative w-full max-w-md">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={generalQuery}
              onChange={(e) => setGeneralQuery(e.target.value)}
              placeholder="Поиск по сообщениям..."
              className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl pl-8 pr-8 py-2 text-[12px] text-slate-200 placeholder-slate-600 outline-none focus:border-gold/40 transition-colors"
            />
            {generalQuery && (
              <button
                type="button"
                onClick={() => setGeneralQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {loadingGeneral ? (
            <div className="flex items-center justify-center h-40 text-slate-500">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : filteredGeneral.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] py-16 text-center">
              <MessageSquare size={24} className="mx-auto text-slate-700 mb-3" />
              <p className="text-[13px] text-slate-400 font-semibold">
                {generalQuery ? 'Ничего не найдено' : 'Сообщений нет'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGeneral.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors"
                >
                  {m.author.avatar_url ? (
                    <img
                      src={api.resolveAvatarUrl(m.author.avatar_url) ?? ''}
                      alt=""
                      className="w-9 h-9 rounded-lg object-cover bg-abyss ring-1 ring-white/[0.06] shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-[12px] font-bold text-slate-500 ring-1 ring-white/[0.06] shrink-0">
                      {m.author.username.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-slate-200">
                        {m.author.username}
                      </span>
                      <span className="text-[10px] text-slate-600 font-mono">
                        {formatDateTime(m.created_at)}
                      </span>
                      <span className="text-[10px] text-slate-700 font-mono">
                        #{m.id}
                      </span>
                    </div>
                    <p className="text-[13px] text-slate-300 leading-relaxed mt-1 whitespace-pre-wrap break-words">
                      {m.text}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteGeneral(m.id)}
                    disabled={busyGeneralId === m.id}
                    className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blood hover:bg-blood/10 transition-colors disabled:opacity-40"
                  >
                    {busyGeneralId === m.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DM */}
      {tab === 'dm' && (
        <div>
          {loadingUsers ? (
            <div className="flex items-center justify-center h-40 text-slate-500">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : dmUsers.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] py-16 text-center">
              <Users size={24} className="mx-auto text-slate-700 mb-3" />
              <p className="text-[13px] text-slate-400 font-semibold">Нет переписок</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
                    Игрок A
                  </label>
                  <select
                    value={selectedA ?? ''}
                    onChange={(e) => setSelectedA(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold transition-colors"
                  >
                    <option value="">— выбери —</option>
                    {dmUsers.map((u) => (
                      <option key={u.user_id} value={u.user_id} className="bg-[#141923]">
                        {u.username} (#{u.user_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
                    Игрок B
                  </label>
                  <select
                    value={selectedB ?? ''}
                    onChange={(e) => setSelectedB(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-gold transition-colors"
                  >
                    <option value="">— выбери —</option>
                    {dmUsers.map((u) => (
                      <option key={u.user_id} value={u.user_id} className="bg-[#141923]">
                        {u.username} (#{u.user_id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedA !== null && selectedB !== null && selectedA === selectedB && (
                <div className="rounded-xl border border-blood/30 bg-blood/5 p-3 text-blood text-[12px] mb-4">
                  Выбери разных игроков
                </div>
              )}

              {selectedA !== null && selectedB !== null && selectedA !== selectedB && (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusPill tone="gold">{selectedNames.a}</StatusPill>
                      <span className="text-slate-600">↔</span>
                      <StatusPill tone="blizzard">{selectedNames.b}</StatusPill>
                    </div>
                    <span className="text-[10px] font-mono text-slate-600">
                      {dmMessages.length} сообщений
                    </span>
                  </div>

                  {loadingDm ? (
                    <div className="flex items-center justify-center h-40 text-slate-500">
                      <Loader2 size={20} className="animate-spin" />
                    </div>
                  ) : dmMessages.length === 0 ? (
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] py-12 text-center">
                      <Send size={22} className="mx-auto text-slate-700 mb-3" />
                      <p className="text-[12px] text-slate-500">Переписка пуста</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dmMessages.map((m) => {
                        const fromA = m.from_user_id === selectedA;
                        return (
                          <div
                            key={m.id}
                            className={`rounded-xl border p-3 flex items-start gap-3 transition-colors ${
                              fromA
                                ? 'border-gold/15 bg-gold/[0.02]'
                                : 'border-blizzard/15 bg-blizzard/[0.02]'
                            }`}
                          >
                            {m.author.avatar_url ? (
                              <img
                                src={api.resolveAvatarUrl(m.author.avatar_url) ?? ''}
                                alt=""
                                className="w-8 h-8 rounded-lg object-cover bg-abyss ring-1 ring-white/[0.06] shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[11px] font-bold text-slate-500 ring-1 ring-white/[0.06] shrink-0">
                                {m.author.username.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[12px] font-bold ${fromA ? 'text-gold' : 'text-blizzard'}`}>
                                  {m.author.username}
                                </span>
                                <span className="text-[10px] text-slate-600 font-mono">
                                  {formatDateTime(m.created_at)}
                                </span>
                                <span className="text-[10px] text-slate-700 font-mono">
                                  #{m.id}
                                </span>
                              </div>
                              <p className="text-[13px] text-slate-300 leading-relaxed mt-1 whitespace-pre-wrap break-words">
                                {m.text}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteDm(m.id)}
                              disabled={busyDmId === m.id}
                              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blood hover:bg-blood/10 transition-colors disabled:opacity-40"
                            >
                              {busyDmId === m.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Trash2 size={12} />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
