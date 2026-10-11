from pathlib import Path

ROOT = Path(".")

# 1. api.ts — методы
p = ROOT / "src" / "lib" / "api.ts"
text = p.read_text(encoding="utf-8")

if "getAdminChangelog" not in text:
    text += '''

// ============================================================
// ADM: CHANGELOG
// ============================================================

export interface AdminChangelogEntry {
  id: number;
  version: string | null;
  title: string;
  body: string;
  category: string;
  created_at: string;
  author: { username: string; avatar_url: string | null } | null;
}

export interface ChangelogCreatePayload {
  title: string;
  body: string;
  version?: string | null;
  category?: string;
}

export async function getAdminChangelog(token: string): Promise<AdminChangelogEntry[]> {
  const res = await fetch(`${API_BASE}/admin/changelog`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createChangelogEntry(token: string, payload: ChangelogCreatePayload): Promise<{ id: number }> {
  const res = await fetch(`${API_BASE}/admin/changelog`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteChangelogEntry(token: string, id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/changelog/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}
'''
    p.write_text(text, encoding="utf-8")
    print("OK: api.ts + changelog методы")
else:
    print("SKIP: api.ts уже есть")

# 2. ChangelogEditorModal.tsx
(ROOT / "src" / "components" / "changelog").mkdir(parents=True, exist_ok=True)
(ROOT / "src" / "components" / "changelog" / "ChangelogEditorModal.tsx").write_text('''import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Save, Server, Rocket, Package, PartyPopper } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import * as api from '../../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES = [
  { id: 'server',   label: 'Сервер',   icon: Server,      cls: 'text-gold' },
  { id: 'launcher', label: 'Лаунчер',  icon: Rocket,      cls: 'text-blizzard' },
  { id: 'client',   label: 'Клиент',   icon: Package,     cls: 'text-emerald' },
  { id: 'event',    label: 'Событие',  icon: PartyPopper, cls: 'text-blood' },
];

export function ChangelogEditorModal({ open, onClose, onSaved }: Props) {
  const token = useAuthStore((s) => s.token);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [version, setVersion] = useState('');
  const [category, setCategory] = useState('server');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle('');
    setBody('');
    setVersion('');
    setCategory('server');
    setError(null);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!token) return;
    const t = title.trim();
    const b = body.trim();
    if (t.length < 3) { setError('Заголовок минимум 3 символа'); return; }
    if (b.length < 10) { setError('Текст минимум 10 символов'); return; }

    setBusy(true);
    setError(null);
    try {
      await api.createChangelogEntry(token, {
        title: t,
        body: b,
        version: version.trim() || null,
        category,
      });
      onSaved();
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const modal = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6" onClick={handleClose}>
      <div className="absolute inset-0 modal-backdrop" />
      <div
        className="relative w-[600px] max-h-[90vh] glass-popover rounded-[24px] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <h3 className="font-display text-lg font-bold text-white">Новая запись в обновлениях</h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
              Категория
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                      active
                        ? `${c.cls} border-current/40 bg-white/[0.04]`
                        : 'border-white/[0.06] text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_140px] gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
                Заголовок
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={busy}
                maxLength={200}
                autoFocus
                placeholder="Что нового..."
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-gold transition-colors disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
                Версия
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={busy}
                maxLength={20}
                placeholder="1.0.19"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 outline-none focus:border-gold transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
              Описание
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={busy}
              rows={6}
              maxLength={3000}
              placeholder="Что изменилось, что добавилось, что починили..."
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-gold transition-colors resize-none disabled:opacity-50"
            />
            <div className="text-[10px] font-mono text-slate-600 mt-1 text-right">
              {body.length} / 3000
            </div>
          </div>

          {error && <p className="text-[12px] text-blood text-center">{error}</p>}
        </div>

        <div className="p-4 border-t border-white/[0.06] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl text-slate-300 hover:bg-white/5 transition-colors text-[11px] uppercase tracking-[0.12em] font-semibold disabled:opacity-40"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold text-abyss font-bold text-[11px] uppercase tracking-[0.12em] hover:shadow-glow-gold transition-all disabled:opacity-40"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Опубликовать
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
''', encoding="utf-8")
print("OK: ChangelogEditorModal.tsx")

# 3. Changelog screen
(ROOT / "src" / "screens" / "Changelog.tsx").write_text('''import { useEffect, useState } from 'react';
import {
  Loader2, Plus, Server, Rocket, Package, PartyPopper, Trash2, AlertCircle, Sparkles, RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import * as api from '../lib/api';
import { ChangelogEditorModal } from '../components/changelog/ChangelogEditorModal';
import { StatusPill } from '../components/ui/StatusPill';

const CATEGORY_META: Record<string, { label: string; icon: typeof Server; cls: string }> = {
  server:   { label: 'Сервер',  icon: Server,      cls: 'text-gold bg-gold/10 border-gold/25' },
  launcher: { label: 'Лаунчер', icon: Rocket,      cls: 'text-blizzard bg-blizzard/10 border-blizzard/25' },
  client:   { label: 'Клиент',  icon: Package,     cls: 'text-emerald bg-emerald/10 border-emerald/25' },
  event:    { label: 'Событие', icon: PartyPopper, cls: 'text-blood bg-blood/10 border-blood/25' },
};

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export function Changelog() {
  const token = useAuthStore((s) => s.token);
  const [items, setItems] = useState<api.AdminChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminChangelog(token);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [token]);

  const handleDelete = async (item: api.AdminChangelogEntry) => {
    if (!token) return;
    if (!confirm(`Удалить запись?\\n\\n${item.title}`)) return;
    setBusyId(item.id);
    try {
      await api.deleteChangelogEntry(token, item.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white flex items-center gap-3">
            <Sparkles size={22} className="text-gold" />
            Обновления
          </h1>
          <p className="text-[12px] text-slate-500 mt-1">
            Записи видны игрокам во вкладке «Обновления» в лаунчере
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-[11px] uppercase tracking-wider font-bold disabled:opacity-40"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          </button>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold text-abyss font-bold text-[11px] uppercase tracking-[0.14em] hover:shadow-glow-gold transition-all"
          >
            <Plus size={14} />
            Новая запись
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-blood/30 bg-blood/5 p-4 text-blood text-sm mb-4">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-slate-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] py-16 text-center">
          <Sparkles size={28} className="mx-auto text-slate-700 mb-3" />
          <p className="text-[13px] text-slate-400 font-semibold">Записей пока нет</p>
          <p className="text-[11px] text-slate-600 mt-1">Создай первую — игроки увидят её в лаунчере</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const meta = CATEGORY_META[item.category] ?? CATEGORY_META.server;
            const Icon = meta.icon;
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent p-4 hover:border-white/[0.12] transition-colors"
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
                      {item.version && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono font-bold text-slate-400">
                          v{item.version}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-600 font-mono">
                        #{item.id}
                      </span>
                    </div>

                    <h3 className="text-[15px] font-bold text-white leading-snug">{item.title}</h3>
                    <p className="text-[12px] text-slate-400 leading-relaxed mt-1.5 whitespace-pre-wrap break-words">
                      {item.body}
                    </p>

                    <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-600 font-mono">
                      <span>{fmtDate(item.created_at)}</span>
                      {item.author && (
                        <>
                          <span>·</span>
                          <span>@{item.author.username}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={busyId === item.id}
                    className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-blood hover:bg-blood/10 transition-colors disabled:opacity-40"
                    title="Удалить"
                  >
                    {busyId === item.id ? (
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

      {!loading && items.length > 0 && (
        <div className="mt-3 text-[11px] text-slate-600 font-mono text-right">
          Всего записей: {items.length}
        </div>
      )}

      <ChangelogEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
''', encoding="utf-8")
print("OK: Changelog.tsx")

# 4. App.tsx
p = ROOT / "src" / "App.tsx"
text = p.read_text(encoding="utf-8")

if "from './screens/Changelog'" not in text:
    text = text.replace(
        "import { Devops } from './screens/Devops';",
        "import { Devops } from './screens/Devops';\nimport { Changelog } from './screens/Changelog';",
    )
    print("OK: App.tsx импорт")

if "{screen === 'changelog'" not in text:
    old = "{screen === 'devops' && <Devops />}"
    new = "{screen === 'devops' && <Devops />}\n          {screen === 'changelog' && <Changelog />}"
    if old in text:
        text = text.replace(old, new)
        print("OK: App.tsx рендер")

p.write_text(text, encoding="utf-8")

# 5. Sidebar
p = ROOT / "src" / "components" / "layout" / "Sidebar.tsx"
text = p.read_text(encoding="utf-8")

old_id = "export type ScreenId = 'dashboard' | 'users' | 'launcher' | 'news' | 'forum' | 'chat' | 'dev' | 'mods' | 'devops';"
new_id = "export type ScreenId = 'dashboard' | 'users' | 'launcher' | 'news' | 'forum' | 'chat' | 'dev' | 'mods' | 'devops' | 'changelog';"
if old_id in text:
    text = text.replace(old_id, new_id)
    print("OK: Sidebar ScreenId")

# Импорт Sparkles
if 'Sparkles' not in text.split('\n')[0:12][0]:
    import re
    m = re.search(r"import \{([^}]+)\} from 'lucide-react'", text)
    if m:
        new_imports = m.group(1).rstrip().rstrip(',') + ", Sparkles "
        text = text.replace(m.group(0), f"import {{{new_imports}}} from 'lucide-react'")
        print("OK: Sidebar + Sparkles")

# Добавить в контент после Новостей
old_nav = "      { id: 'news', label: 'Новости', icon: Newspaper },"
new_nav = "      { id: 'news', label: 'Новости', icon: Newspaper },\n      { id: 'changelog', label: 'Обновления', icon: Sparkles },"
if old_nav in text and "id: 'changelog'" not in text:
    text = text.replace(old_nav, new_nav)
    print("OK: Sidebar вкладка")

p.write_text(text, encoding="utf-8")

# 6. TopBar
p = ROOT / "src" / "components" / "layout" / "TopBar.tsx"
text = p.read_text(encoding="utf-8")

if "changelog:" not in text:
    text = text.replace(
        "  news: 'Новости',",
        "  news: 'Новости',\n  changelog: 'Обновления',",
    )
    p.write_text(text, encoding="utf-8")
    print("OK: TopBar label")

print()
print("=== ГОТОВО ===")
