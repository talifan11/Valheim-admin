from pathlib import Path

ROOT = Path(".")

# 1. api.ts
p = ROOT / "src" / "lib" / "api.ts"
text = p.read_text(encoding="utf-8")

if "getAdminModsMeta" not in text:
    text += '''

// ============================================================
// МОДЫ (метаданные для админа)
// ============================================================

export interface ModMeta {
  name: string;
  filename: string;
  mandatory: boolean;
  enabled_default: boolean;
  description: string;
  category: string;
  disabled_by_users: number;
}

export async function getAdminModsMeta(token: string): Promise<ModMeta[]> {
  const res = await fetch(`${API_BASE}/admin/mods/meta`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateModMeta(
  token: string,
  modName: string,
  patch: { mandatory?: boolean; enabled_default?: boolean; description?: string },
): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/mods/${encodeURIComponent(modName)}/meta`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

// ============================================================
// СОБЫТИЯ (для админки)
// ============================================================

export interface EventParticipant {
  user_id: number;
  username: string;
  avatar_url: string | null;
}

export interface AdminEvent {
  id: number;
  title: string;
  description: string;
  starts_at: string;
  category: string;
  location: string | null;
  max_slots: number | null;
  author_id: number;
  created_at: string;
  status: string;
  author: { user_id: number; username: string; avatar_url: string | null };
  participants: EventParticipant[];
  participants_count: number;
  joined: boolean;
}

export async function getAdminEvents(token: string): Promise<AdminEvent[]> {
  const res = await fetch(`${API_BASE}/events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteEvent(token: string, id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}
'''
    p.write_text(text, encoding="utf-8")
    print("OK: api.ts + моды meta + события")
else:
    print("SKIP: api.ts уже есть")

# 2. Events.tsx — экран админки
(ROOT / "src" / "screens" / "Events.tsx").write_text('''import { useEffect, useMemo, useState } from 'react';
import {
  Loader2, Plus, AlertCircle, Trash2, Calendar, MapPin, Users,
  Swords, MessageCircle, Trophy, Hammer, Sparkles, Clock, X, Search,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import * as api from '../lib/api';
import { StatusPill } from '../components/ui/StatusPill';
import { Avatar } from '../components/ui/Avatar';

const CATEGORY_META: Record<string, { label: string; icon: typeof Swords; cls: string }> = {
  raid:       { label: 'Рейд',      icon: Swords,        cls: 'text-blood bg-blood/10 border-blood/25' },
  meeting:    { label: 'Встреча',   icon: MessageCircle, cls: 'text-blizzard bg-blizzard/10 border-blizzard/25' },
  tournament: { label: 'Турнир',    icon: Trophy,        cls: 'text-gold bg-gold/10 border-gold/25' },
  build:      { label: 'Строительство', icon: Hammer,    cls: 'text-emerald bg-emerald/10 border-emerald/25' },
  other:      { label: 'Другое',    icon: Sparkles,      cls: 'text-slate-400 bg-white/5 border-white/10' },
};

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

export function Events() {
  const token = useAuthStore((s) => s.token);
  const [events, setEvents] = useState<api.AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'past'>('all');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminEvents(token);
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [token]);

  const handleDelete = async (ev: api.AdminEvent) => {
    if (!token) return;
    if (!confirm(`Удалить событие?\\n\\n${ev.title}`)) return;
    setBusyId(ev.id);
    try {
      await api.deleteEvent(token, ev.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    let list = events.slice();
    if (filter === 'active') list = list.filter((e) => !isPast(e.starts_at));
    if (filter === 'past') list = list.filter((e) => isPast(e.starts_at));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [events, filter, query]);

  const counts = useMemo(() => ({
    all: events.length,
    active: events.filter((e) => !isPast(e.starts_at)).length,
    past: events.filter((e) => isPast(e.starts_at)).length,
  }), [events]);

  const FILTERS: { id: typeof filter; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'active', label: 'Активные' },
    { id: 'past', label: 'Прошедшие' },
  ];

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white flex items-center gap-3">
            <Calendar size={22} className="text-gold" />
            События
          </h1>
          <p className="text-[12px] text-slate-500 mt-1">
            Игровые события, созданные игроками
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone="emerald">{counts.active} активных</StatusPill>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-blood/30 bg-blood/5 p-4 text-blood text-sm mb-4">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

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
              <span className="ml-1.5 text-[10px] font-mono text-slate-600">{counts[f.id]}</span>
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
            placeholder="Поиск событий..."
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

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] py-16 text-center">
          <Calendar size={28} className="mx-auto text-slate-700 mb-3" />
          <p className="text-[13px] text-slate-400 font-semibold">
            {query ? 'Ничего не найдено' : 'Событий пока нет'}
          </p>
          <p className="text-[11px] text-slate-600 mt-1">
            {query ? 'Попробуй другой запрос' : 'Игроки создают события в лаунчере'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ev) => {
            const meta = CATEGORY_META[ev.category] ?? CATEGORY_META.other;
            const Icon = meta.icon;
            const past = isPast(ev.starts_at);
            return (
              <div
                key={ev.id}
                className={`rounded-2xl border p-4 transition-colors ${
                  past
                    ? 'border-white/[0.03] bg-white/[0.005] opacity-60'
                    : 'border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent hover:border-white/[0.12]'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`shrink-0 w-11 h-11 rounded-xl ring-1 ring-inset flex items-center justify-center ${meta.cls}`}>
                    <Icon size={18} strokeWidth={2.2} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${meta.cls}`}>
                        {meta.label}
                      </span>
                      {past && <StatusPill tone="slate">Прошло</StatusPill>}
                      <span className="text-[10px] text-slate-600 font-mono">#{ev.id}</span>
                    </div>

                    <h3 className="text-[15px] font-bold text-white leading-snug">{ev.title}</h3>
                    <p className="text-[12px] text-slate-400 leading-relaxed mt-1.5 whitespace-pre-wrap break-words">
                      {ev.description}
                    </p>

                    <div className="flex items-center gap-4 mt-3 flex-wrap text-[11px] text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Clock size={11} />
                        {fmtDate(ev.starts_at)}
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin size={11} />
                          {ev.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Users size={11} />
                        {ev.participants_count}
                        {ev.max_slots ? ` / ${ev.max_slots}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                      <Avatar
                        size={20}
                        avatarUrl={ev.author.avatar_url}
                        friendId={`u-${ev.author.user_id}`}
                      />
                      <span className="text-[10px] text-slate-600">
                        Автор: <span className="text-slate-400">{ev.author.username}</span>
                      </span>

                      {ev.participants.length > 1 && (
                        <>
                          <span className="text-slate-700 mx-1">·</span>
                          <div className="flex items-center -space-x-1.5">
                            {ev.participants.slice(0, 5).map((p) => (
                              <div key={p.user_id} className="ring-2 ring-[#0a0e14] rounded-full">
                                <Avatar
                                  size={20}
                                  avatarUrl={p.avatar_url}
                                  friendId={`u-${p.user_id}`}
                                />
                              </div>
                            ))}
                            {ev.participants.length > 5 && (
                              <span className="ml-2 text-[10px] text-slate-600 font-mono">
                                +{ev.participants.length - 5}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(ev)}
                    disabled={busyId === ev.id}
                    className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-blood hover:bg-blood/10 transition-colors disabled:opacity-40"
                    title="Удалить событие"
                  >
                    {busyId === ev.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="mt-3 text-[11px] text-slate-600 font-mono text-right">
          Показано {filtered.length} из {counts.all}
        </div>
      )}
    </div>
  );
}
''', encoding="utf-8")
print("OK: Events.tsx создан")

# 3. App.tsx — рендер
p = ROOT / "src" / "App.tsx"
text = p.read_text(encoding="utf-8")

if "from './screens/Events'" not in text:
    text = text.replace(
        "import { Changelog } from './screens/Changelog';",
        "import { Changelog } from './screens/Changelog';\nimport { Events } from './screens/Events';",
    )
    print("OK: App.tsx импорт")

if "{screen === 'events'" not in text:
    text = text.replace(
        "{screen === 'changelog' && <Changelog />}",
        "{screen === 'changelog' && <Changelog />}\n          {screen === 'events' && <Events />}",
    )
    print("OK: App.tsx рендер")

p.write_text(text, encoding="utf-8")

# 4. Sidebar
p = ROOT / "src" / "components" / "layout" / "Sidebar.tsx"
text = p.read_text(encoding="utf-8")

old_id = "export type ScreenId = 'dashboard' | 'users' | 'launcher' | 'news' | 'forum' | 'chat' | 'dev' | 'mods' | 'devops' | 'changelog';"
new_id = "export type ScreenId = 'dashboard' | 'users' | 'launcher' | 'news' | 'forum' | 'chat' | 'dev' | 'mods' | 'devops' | 'changelog' | 'events';"
if old_id in text:
    text = text.replace(old_id, new_id)
    print("OK: Sidebar ScreenId + events")

# Импорт Calendar
if 'Calendar' not in text.split('\n')[0:12][0]:
    import re
    m = re.search(r"import \{([^}]+)\} from 'lucide-react'", text)
    if m:
        new_imports = m.group(1).rstrip().rstrip(',') + ", Calendar "
        text = text.replace(m.group(0), f"import {{{new_imports}}} from 'lucide-react'")
        print("OK: Sidebar + Calendar")

old_nav = "      { id: 'changelog', label: 'Обновления', icon: Sparkles },"
new_nav = "      { id: 'changelog', label: 'Обновления', icon: Sparkles },\n      { id: 'events', label: 'События', icon: Calendar },"
if old_nav in text and "id: 'events'" not in text:
    text = text.replace(old_nav, new_nav)
    print("OK: Sidebar вкладка События")

p.write_text(text, encoding="utf-8")

# 5. TopBar
p = ROOT / "src" / "components" / "layout" / "TopBar.tsx"
text = p.read_text(encoding="utf-8")

if "events:" not in text:
    text = text.replace(
        "  changelog: 'Обновления',",
        "  changelog: 'Обновления',\n  events: 'События',",
    )
    p.write_text(text, encoding="utf-8")
    print("OK: TopBar label events")

print()
print("=== ГОТОВО ===")
