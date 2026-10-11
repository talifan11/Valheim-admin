import { useEffect, useState } from 'react';
import { HardDrive, Cpu, Clock, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import * as api from '../../lib/api';

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(0)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}д ${h}ч`;
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

export function SystemWidget() {
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState<api.DevopsSystem | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!token) return;
    api.getDevopsSystem(token).then(setData).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] text-slate-500 text-[11px]">
        <Loader2 size={12} className="animate-spin" />
      </div>
    );
  }

  const vps = data?.vps;
  if (!vps || vps.error) return null;

  const diskPct = vps.disk_percent ?? 0;
  const ramPct = vps.ram_percent ?? 0;
  const diskColor = diskPct > 90 ? 'text-blood' : diskPct > 75 ? 'text-gold' : 'text-emerald';
  const ramColor = ramPct > 90 ? 'text-blood' : ramPct > 75 ? 'text-gold' : 'text-blizzard';

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center gap-1.5" title={`Диск: ${fmtBytes(vps.disk_used ?? 0)} / ${fmtBytes(vps.disk_total ?? 0)}`}>
        <HardDrive size={12} className={diskColor} />
        <span className={`text-[11px] font-mono font-bold ${diskColor}`}>{diskPct}%</span>
      </div>
      <span className="w-px h-3 bg-white/[0.06]" />
      <div className="flex items-center gap-1.5" title={`RAM: ${fmtBytes(vps.ram_used ?? 0)} / ${fmtBytes(vps.ram_total ?? 0)}`}>
        <Cpu size={12} className={ramColor} />
        <span className={`text-[11px] font-mono font-bold ${ramColor}`}>{ramPct}%</span>
      </div>
      <span className="w-px h-3 bg-white/[0.06]" />
      <div className="flex items-center gap-1.5 text-slate-500" title="Uptime VPS">
        <Clock size={12} />
        <span className="text-[11px] font-mono">{fmtUptime(vps.uptime_seconds ?? 0)}</span>
      </div>
    </div>
  );
}
