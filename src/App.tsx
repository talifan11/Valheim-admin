import { useState } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { Login } from './screens/Login';
import { Dashboard } from './screens/Dashboard';
import { Users } from './screens/Users';
import { Launcher } from './screens/Launcher';
import { News } from './screens/News';
import { Forum } from './screens/Forum';
import { Chat } from './screens/Chat';
import { DevBoard } from './screens/DevBoard';
import { Mods } from './screens/Mods';
import { Devops } from './screens/Devops';
import { Changelog } from './screens/Changelog';
import { Events } from './screens/Events';
import { Sidebar, type ScreenId } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';

export function App() {
  const token = useAuthStore((s) => s.token);
  const [screen, setScreen] = useState<ScreenId>('dashboard');

  if (!token) {
    return <Login />;
  }

  return (
    <div className="theme-bg h-screen w-screen flex overflow-hidden">
      <Sidebar active={screen} onChange={setScreen} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar screen={screen} onChange={setScreen} />
        <main className="flex-1 min-h-0">
          {screen === 'dashboard' && <Dashboard />}
          {screen === 'users' && <Users />}
          {screen === 'launcher' && <Launcher />}
          {screen === 'mods' && <Mods />}
          {screen === 'news' && <News />}
          {screen === 'forum' && <Forum />}
          {screen === 'chat' && <Chat />}
          {screen === 'dev' && <DevBoard />}
          {screen === 'devops' && <Devops />}
          {screen === 'changelog' && <Changelog />}
          {screen === 'events' && <Events />}
        </main>
      </div>
    </div>
  );
}
