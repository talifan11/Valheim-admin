import {
  LayoutDashboard, Users, Rocket, Newspaper, MessageSquare, MessageCircle,
  LogOut, Settings, ChevronDown, Kanban, Package, Wrench, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export type ScreenId = 'dashboard' | 'users' | 'launcher' | 'news' | 'forum' | 'chat' | 'dev' | 'mods' | 'devops' | 'changelog';

interface Props {
  active: ScreenId;
  onChange: (id: ScreenId) => void;
}

interface NavItem {
  id: ScreenId;
  label: string;
  icon: typeof LayoutDashboard;
}

interface Section {
  title: string;
  items: NavItem[];
}

const SECTIONS: Section[] = [
  {
    title: 'Главное',
    items: [
      { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Разработка',
    items: [
      { id: 'dev', label: 'Задачи', icon: Kanban },
      { id: 'devops', label: 'DevOps', icon: Wrench },
    ],
  },
  {
    title: 'Контент',
    items: [
      { id: 'news', label: 'Новости', icon: Newspaper },
      { id: 'changelog', label: 'Обновления', icon: Sparkles },
      { id: 'launcher', label: 'Лаунчер', icon: Rocket },
      { id: 'mods', label: 'Моды', icon: Package },
    ],
  },
  {
    title: 'Модерация',
    items: [
      { id: 'users', label: 'Игроки', icon: Users },
      { id: 'forum', label: 'Форум', icon: MessageSquare },
      { id: 'chat', label: 'Чат', icon: MessageCircle },
    ],
  },
];

export function Sidebar({ active, onChange }: Props) {
  const logout = useAuthStore((s) => s.logout);
  const username = useAuthStore((s) => s.username);

  return (
    <aside className="w-[240px] shrink-0 border-r border-white/[0.05] flex flex-col bg-abyss/80 backdrop-blur-sm">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 ring-1 ring-gold/30 flex items-center justify-center text-gold shrink-0">
            <span className="font-mono text-xl leading-none font-bold">ᛏ</span>
          </div>
          <div className="min-w-0">
            <div className="font-display text-[13px] font-bold text-white tracking-widest leading-none">
              VALHEIM
            </div>
            <div className="text-[10px] text-gold/70 uppercase tracking-[0.18em] mt-0.5 font-bold">
              Панель
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="px-3 mb-1.5 text-[9px] uppercase tracking-[0.2em] font-bold text-slate-600">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChange(item.id)}
                    className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                      isActive
                        ? 'bg-gradient-to-r from-gold/[0.12] to-transparent text-gold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2.5 bottom-2.5 w-[2px] bg-gold rounded-r" />
                    )}
                    <Icon size={15} className="shrink-0" />
                    <span className="text-[13px] font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: user + actions */}
      <div className="p-3 border-t border-white/[0.05] space-y-1">
        <button
          type="button"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] transition-colors text-left"
        >
          <Settings size={15} />
          <span className="text-[13px] font-semibold">Настройки</span>
        </button>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-blood/80 hover:text-blood hover:bg-blood/10 transition-colors text-left"
        >
          <LogOut size={15} />
          <span className="text-[13px] font-semibold">Выйти</span>
        </button>

        <div className="mt-3 pt-3 border-t border-white/[0.05]">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 ring-1 ring-gold/30 flex items-center justify-center text-gold text-[13px] font-bold shrink-0">
              {username.slice(0, 1).toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-bold text-white truncate">{username || 'Админ'}</div>
            </div>
            <ChevronDown size={14} className="text-slate-600 shrink-0" />
          </div>
        </div>
      </div>
    </aside>
  );
}
