import { useState } from 'react';
import { Wrench, Terminal, Database, FileCode2, Rocket } from 'lucide-react';
import { PatchesTab } from '../components/devops/PatchesTab';
import { CommandsTab } from '../components/devops/CommandsTab';
import { SqlTab } from '../components/devops/SqlTab';
import { LogsTab } from '../components/devops/LogsTab';
import { TerminalTab } from '../components/devops/TerminalTab';
import { SystemWidget } from '../components/devops/SystemWidget';
import { BridgeWidget } from '../components/devops/BridgeWidget';

type Tab = 'patches' | 'commands' | 'sql' | 'terminal' | 'logs';

const TABS: { id: Tab; label: string; icon: typeof Wrench }[] = [
  { id: 'patches', label: 'Патчи', icon: FileCode2 },
  { id: 'commands', label: 'Команды', icon: Rocket },
  { id: 'sql', label: 'SQL', icon: Database },
  { id: 'terminal', label: 'Терминал', icon: Terminal },
  { id: 'logs', label: 'Логи', icon: Terminal },
];

export function Devops() {
  const [tab, setTab] = useState<Tab>('patches');

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="mb-5 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">DevOps</h1>
            <p className="text-[12px] text-slate-500 mt-1">Управление бэкендом, сборки, логи, SQL</p>
          </div>
          <div className="flex items-center gap-3">
            <SystemWidget />
            <BridgeWidget />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0.5 border-b border-white/[0.06] mb-5 shrink-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors inline-flex items-center gap-2 ${tab === t.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Icon size={12} />
              {t.label}
              {tab === t.id && <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gold rounded-t" />}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {tab === 'patches' && <PatchesTab />}
        {tab === 'commands' && <CommandsTab />}
        {tab === 'sql' && <SqlTab />}
        {tab === 'terminal' && <TerminalTab />}
        {tab === 'logs' && <LogsTab />}
      </div>
    </div>
  );
}
