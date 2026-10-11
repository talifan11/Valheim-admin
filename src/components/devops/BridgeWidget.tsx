import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import * as api from '../../lib/api';

export function BridgeWidget() {
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState<api.DevopsBridgeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!token) return;
    api.getDevopsBridgeStatus(token).then(setStatus).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] text-slate-500 text-[11px]">
        <Loader2 size={12} className="animate-spin" />
      </div>
    );
  }

  if (!status) return null;

  const connected = status.connected;
  const hasToken = status.has_token;

  let label = 'Bridge';
  let tone: 'emerald' | 'blood' | 'slate' = 'slate';
  if (!hasToken) { label = 'Bridge: нет токена'; tone = 'slate'; }
  else if (connected) { label = 'Bridge online'; tone = 'emerald'; }
  else { label = 'Bridge offline'; tone = 'blood'; }

  const colorCls = {
    emerald: 'text-emerald border-emerald/25 bg-emerald/[0.04]',
    blood: 'text-blood border-blood/25 bg-blood/[0.04]',
    slate: 'text-slate-500 border-white/[0.06] bg-white/[0.02]',
  }[tone];

  const Icon = connected ? Wifi : WifiOff;
  const dotColor = {
    emerald: 'bg-emerald shadow-[0_0_8px_#2fbf71]',
    blood: 'bg-blood',
    slate: 'bg-slate-600',
  }[tone];

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${colorCls}`}
      title={status.hostname ? `${status.hostname} · ${status.platform}` : status.message || ''}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${connected ? 'animate-pulse' : ''}`} />
      <Icon size={12} />
      <span className="text-[11px] font-bold">{label}</span>
    </div>
  );
}
