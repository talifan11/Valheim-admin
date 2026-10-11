import { Bell, Settings2, Command, Plus } from 'lucide-react';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import type { ScreenId } from './Sidebar';

interface Props {
  screen: ScreenId;
  onChange: (id: ScreenId) => void;
  onQuickAdd?: () => void;
}

const SCREEN_LABELS: Record<ScreenId, string> = {
  dashboard: 'Дашборд',
  dev: 'Задачи',
  devops: 'DevOps',
  users: 'Игроки',
  launcher: 'Лаунчер',
  mods: 'Моды',
  news: 'Новости',
  forum: 'Форум',
  chat: 'Чат',
};

export function TopBar({ screen, onChange, onQuickAdd }: Props) {
  return (
    <header className="h-16 border-b border-white/[0.05] flex items-center px-6 bg-abyss/50 backdrop-blur-md shrink-0">
      <Breadcrumbs
        items={[
          { label: 'Тинг', onClick: () => onChange('dashboard') },
          { label: SCREEN_LABELS[screen] },
        ]}
      />

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-slate-300 hover:border-white/[0.12] transition-all text-[12px]"
        >
          <Command size={12} />
          <span>Поиск</span>
          <span className="ml-4 text-[10px] font-mono text-slate-700 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
            ⌘K
          </span>
        </button>

        <button
          type="button"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
          title="Уведомления"
        >
          <Bell size={15} />
        </button>

        <button
          type="button"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
          title="Настройки"
        >
          <Settings2 size={15} />
        </button>

        {onQuickAdd && (
          <button
            type="button"
            onClick={onQuickAdd}
            className="ml-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gold text-abyss font-bold text-[11px] uppercase tracking-[0.12em] hover:shadow-glow-gold transition-all"
          >
            <Plus size={13} />
            Создать
          </button>
        )}
      </div>
    </header>
  );
}
