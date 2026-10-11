import { useEffect, useState } from 'react';
import {
  Users, Radio, Send, MessageSquare, TrendingUp, Activity, Loader2, AlertCircle,
  ArrowRight, Trophy,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts';
import { useAuthStore } from '../store/useAuthStore';
import * as api from '../lib/api';
import { StatCard } from '../components/ui/StatCard';
import { StatusPill } from '../components/ui/StatusPill';
import { Card } from '../components/ui/Card';
import { RankBadge } from '../components/forum/RankBadge';

interface TopAuthor {
  user_id: number;
  username: string;
  avatar_url: string | null;
  post_count: number;
  thread_count: number;
  reputation: number;
  rank: { name: string; rune: string; tier: 'jarl' | 'legend' | 'viking' | 'novice' };
}

function fmtNum(n: number): string {
  return n.toLocaleString('ru-RU');
}

function fmtDateShort(iso: string): string {
  const parts = iso.split('-');
  return `${parts[2]}.${parts[1]}`;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="glass-popover rounded-xl px-3 py-2 border border-white/10">
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
        {label ? fmtDateShort(String(label)) : ''}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}</span>
          <span className="ml-auto font-mono font-bold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Dashboard() {
  const token = useAuthStore((s) => s.token);
  const [stats, setStats] = useState<api.AdminStats | null>(null);
  const [history, setHistory] = useState<api.StatsHistoryPoint[]>([]);
  const [topAuthors, setTopAuthors] = useState<TopAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.getAdminStats(token),
      api.getAdminStatsHistory(token, 30),
      fetch(`https://panel.62.217.178.72.sslip.io/api/forum/authors/top?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([s, h, top]) => {
        setStats(s);
        setHistory(h.data);
        setTopAuthors(top);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-blood/30 bg-blood/5 p-6 text-blood text-sm flex items-start gap-3">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const last7 = history.slice(-7);
  const prev7 = history.slice(-14, -7);
  const sum = (arr: api.StatsHistoryPoint[], key: keyof api.StatsHistoryPoint) =>
    arr.reduce((s, d) => s + (d[key] as number), 0);

  const deltaPct = (now: number, prev: number) =>
    prev === 0 ? (now > 0 ? 100 : 0) : Math.round(((now - prev) / prev) * 100);

  const messagesNow = sum(last7, 'messages') + sum(last7, 'general');
  const messagesPrev = sum(prev7, 'messages') + sum(prev7, 'general');
  const postsNow = sum(last7, 'posts') + sum(last7, 'threads');
  const postsPrev = sum(prev7, 'posts') + sum(prev7, 'threads');
  const usersNow = sum(last7, 'users');
  const usersPrev = sum(prev7, 'users');

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Дашборд</h1>
          <p className="text-[12px] text-slate-500 mt-1">
            Общая статистика сервера за последние 30 дней
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone="emerald" icon={Radio}>
            {(stats?.online ?? 0) > 0 ? 'Живой' : 'Тишина'}
          </StatusPill>
          <StatusPill tone="gold" icon={Activity}>
            30 дней
          </StatusPill>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Игроков"
          value={fmtNum(stats?.users_total ?? 0)}
          delta={usersPrev > 0 ? deltaPct(usersNow, usersPrev) : null}
          icon={Users}
          tone="gold"
          hint={`+${usersNow} за неделю`}
        />
        <StatCard
          label="Онлайн сейчас"
          value={stats?.online ?? 0}
          icon={Radio}
          tone="emerald"
          hint="за последние 2 минуты"
        />
        <StatCard
          label="Сообщений / нед"
          value={fmtNum(messagesNow)}
          delta={messagesPrev > 0 ? deltaPct(messagesNow, messagesPrev) : null}
          icon={Send}
          tone="blizzard"
          hint="чат + DM"
        />
        <StatCard
          label="Форум / нед"
          value={fmtNum(postsNow)}
          delta={postsPrev > 0 ? deltaPct(postsNow, postsPrev) : null}
          icon={MessageSquare}
          tone="blood"
          hint="треды + посты"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card
          title="Активность"
          subtitle="Сообщения и регистрации по дням"
          actions={<StatusPill tone="gold" icon={TrendingUp}>30 дней</StatusPill>}
        >
          <div className="h-[240px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="gMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0e9cff" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0e9cff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffc24b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ffc24b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDateShort}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Area type="monotone" dataKey="messages" name="DM" stroke="#0e9cff" strokeWidth={2} fill="url(#gMessages)" />
                <Area type="monotone" dataKey="users" name="Регистрации" stroke="#ffc24b" strokeWidth={2} fill="url(#gUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="Форум"
          subtitle="Треды и ответы по дням"
          actions={<StatusPill tone="blood" icon={MessageSquare}>30 дней</StatusPill>}
        >
          <div className="h-[240px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDateShort}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="threads" name="Треды" fill="#ffc24b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="posts" name="Ответы" fill="#ff5566" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title="Топ авторов форума"
          subtitle="По репутации"
          actions={<StatusPill tone="gold" icon={Trophy}>Топ-5</StatusPill>}
        >
          {topAuthors.length === 0 ? (
            <p className="text-[12px] text-slate-500 py-4 text-center">Пока пусто</p>
          ) : (
            <div className="space-y-2.5">
              {topAuthors.map((a, i) => {
                const maxRep = topAuthors[0].reputation || 1;
                const pct = Math.round((a.reputation / maxRep) * 100);
                return (
                  <div key={a.user_id} className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-slate-600 w-4 shrink-0">
                      {i + 1}
                    </span>
                    {a.avatar_url ? (
                      <img
                        src={api.resolveAvatarUrl(a.avatar_url) ?? ''}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover bg-abyss ring-1 ring-white/[0.06] shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[11px] font-bold text-slate-500 shrink-0">
                        {a.username.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-bold text-slate-200 truncate">
                          @{a.username}
                        </span>
                        <RankBadge rank={a.rank} />
                      </div>
                      <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-gold to-gold/40 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[12px] font-mono font-bold text-gold shrink-0">
                      {a.reputation}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Быстрые действия" subtitle="Частые задачи">
          <div className="grid grid-cols-2 gap-3">
            <QuickAction label="Новости" sub="Создать" icon={ArrowRight} tone="gold" />
            <QuickAction label="Лаунчер" sub="Загрузить exe" icon={ArrowRight} tone="blizzard" />
            <QuickAction label="Игроки" sub="Забанить" icon={ArrowRight} tone="blood" />
            <QuickAction label="Форум" sub="Модерация" icon={ArrowRight} tone="emerald" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({
  label, sub, icon: Icon, tone,
}: {
  label: string;
  sub: string;
  icon: typeof ArrowRight;
  tone: 'gold' | 'blizzard' | 'blood' | 'emerald';
}) {
  const toneCls = {
    gold: 'text-gold hover:border-gold/40 hover:bg-gold/5',
    blizzard: 'text-blizzard hover:border-blizzard/40 hover:bg-blizzard/5',
    blood: 'text-blood hover:border-blood/40 hover:bg-blood/5',
    emerald: 'text-emerald hover:border-emerald/40 hover:bg-emerald/5',
  }[tone];

  return (
    <button
      type="button"
      className={`group flex items-center justify-between gap-2 px-3.5 py-3 rounded-xl border border-white/[0.06] bg-white/[0.01] transition-all text-left ${toneCls}`}
    >
      <div className="min-w-0">
        <div className="text-[12px] font-bold truncate">{label}</div>
        <div className="text-[10px] text-slate-600 truncate">{sub}</div>
      </div>
      <Icon
        size={14}
        className="shrink-0 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
      />
    </button>
  );
}
