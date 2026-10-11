import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2, Upload, Power, PowerOff, Trash2, FileCode2, FileCog,
  AlertCircle, RefreshCw, Package, Search, X, Check, Settings2, Crown } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import * as api from '../lib/api';
import { StatusPill } from '../components/ui/StatusPill';
import { ConfigEditor } from '../components/mods/ConfigEditor';

type Tab = 'plugins' | 'configs' | 'manifest';

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
  } catch { return ''; }
}

export function Mods() {
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState<api.ModsList | null>(null);
  const [meta, setMeta] = useState<api.ModMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('plugins');
  const [busyFile, setBusyFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [query, setQuery] = useState('');
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Rebuild manifest state
  const [version, setVersion] = useState('');
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildResult, setRebuildResult] = useState<api.RebuildResult | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [res, m] = await Promise.all([
        api.getModsList(token),
        api.getAdminModsMeta(token),
      ]);
      setData(res);
      setMeta(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [token]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const handleUpload = async (file: File) => {
    if (!token) return;
    if (!file.name.toLowerCase().endsWith('.dll')) {
      setError('Только .dll файлы');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Файл больше 50 MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const res = await api.uploadMod(token, file, setUploadProgress);
      setSuccess(`Загружен: ${res.filename} (${fmtSize(res.size)})`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) void handleUpload(f);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget === e.target) setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleUpload(f);
  };

  const handleToggle = async (filename: string) => {
    if (!token) return;
    setBusyFile(filename);
    setError(null);
    try {
      const res = await api.toggleMod(token, filename);
      setSuccess(res.enabled ? 'Мод включён' : 'Мод отключён');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusyFile(null);
    }
  };

  const handleDelete = async (mod: api.ModPlugin) => {
    if (!token) return;
    if (!confirm(`Удалить мод?\n\n${mod.name}`)) return;
    setBusyFile(mod.filename);
    try {
      await api.deleteMod(token, mod.filename);
      setSuccess('Мод удалён');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusyFile(null);
    }
  };

  const handleRebuild = async () => {
    if (!token) return;
    if (!version.trim() || !/^\d+(\.\d+){1,3}$/.test(version.trim())) {
      setError('Версия должна быть X.Y.Z');
      return;
    }
    if (!confirm(`Пересобрать манифест v${version}?\n\nЭто пересчитает все хэши файлов клиента. Может занять 1-2 минуты.`)) return;

    setRebuilding(true);
    setError(null);
    setRebuildResult(null);
    try {
      const res = await api.rebuildManifest(token, version.trim());
      setRebuildResult(res);
      setSuccess(`Манифест v${res.version}: ${res.files_count} файлов`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setRebuilding(false);
    }
  };

  const filteredPlugins = useMemo(() => {
    if (!data) return [];
    if (!query.trim()) return data.plugins;
    const q = query.toLowerCase();
    return data.plugins.filter((p) => p.name.toLowerCase().includes(q));
  }, [data, query]);

  const filteredConfigs = useMemo(() => {
    if (!data) return [];
    if (!query.trim()) return data.configs;
    const q = query.toLowerCase();
    return data.configs.filter((c) => c.rel_path.toLowerCase().includes(q));
  }, [data, query]);

  const getMetaFor = (name: string): api.ModMeta | undefined =>
    meta.find((m) => m.name === name.replace(/\.dll$/, ''));

  const handleToggleMandatory = async (modName: string, current: boolean) => {
    if (!token) return;
    try {
      await api.updateModMeta(token, modName, { mandatory: !current });
      const fresh = await api.getAdminModsMeta(token);
      setMeta(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const pluginsEnabled = data?.plugins.filter((p) => !p.disabled).length ?? 0;
  const pluginsDisabled = data?.plugins.filter((p) => p.disabled).length ?? 0;

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="mb-6 flex items-start justify-between shrink-0">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Моды</h1>
          <p className="text-[12px] text-slate-500 mt-1">
            Управление плагинами BepInEx, конфигами и манифестом клиента
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone="emerald" icon={Power}>
            {pluginsEnabled} вкл
          </StatusPill>
          {pluginsDisabled > 0 && (
            <StatusPill tone="slate" icon={PowerOff}>
              {pluginsDisabled} выкл
            </StatusPill>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-blood/30 bg-blood/5 p-4 text-blood text-sm mb-4 shrink-0">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald/30 bg-emerald/5 p-4 text-emerald text-sm mb-4 shrink-0">
          <Check size={16} className="shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-0.5 border-b border-white/[0.06] mb-5 shrink-0">
        <button
          type="button"
          onClick={() => setTab('plugins')}
          className={`relative px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors inline-flex items-center gap-2 ${
            tab === 'plugins' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Package size={12} />
          Плагины
          <span className="text-[10px] font-mono text-slate-600 normal-case tracking-normal">
            {data?.plugins.length ?? 0}
          </span>
          {tab === 'plugins' && (
            <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gold rounded-t" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('configs')}
          className={`relative px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors inline-flex items-center gap-2 ${
            tab === 'configs' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <FileCog size={12} />
          Конфиги
          <span className="text-[10px] font-mono text-slate-600 normal-case tracking-normal">
            {data?.configs.length ?? 0}
          </span>
          {tab === 'configs' && (
            <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gold rounded-t" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('manifest')}
          className={`relative px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors inline-flex items-center gap-2 ${
            tab === 'manifest' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Settings2 size={12} />
          Манифест
          {tab === 'manifest' && (
            <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gold rounded-t" />
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden min-h-0">
          {/* === ПЛАГИНЫ === */}
          {tab === 'plugins' && (
            <div className="h-full flex flex-col min-h-0">
              <div className="flex items-center gap-3 mb-4 shrink-0">
                <div className="relative w-72">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поиск плагинов..."
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

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="ml-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gold text-abyss font-bold text-[11px] uppercase tracking-[0.12em] hover:shadow-glow-gold transition-all disabled:opacity-40"
                >
                  {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  Загрузить .dll
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".dll"
                  className="hidden"
                  onChange={handleFilePick}
                />
              </div>

              {uploading && (
                <div className="mb-4 shrink-0">
                  <div className="flex items-center justify-between mb-2 text-[11px]">
                    <span className="text-slate-500">Загрузка мода...</span>
                    <span className="font-mono text-gold">{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-gold transition-all duration-200 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div
                className={`flex-1 overflow-y-auto no-scrollbar rounded-2xl border-2 border-dashed transition-colors ${
                  dragActive
                    ? 'border-gold/60 bg-gold/[0.04]'
                    : 'border-white/[0.06] bg-white/[0.005]'
                }`}
                onDragEnter={handleDragEnter}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {filteredPlugins.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-16">
                    <Package size={28} className="text-slate-700 mb-3" />
                    <p className="text-[13px] text-slate-400 font-semibold">
                      {query ? 'Ничего не найдено' : 'Плагинов нет'}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Перетащи .dll сюда или нажми «Загрузить»
                    </p>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {filteredPlugins.map((mod) => (
                      <div
                        key={mod.filename}
                        className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                          mod.disabled
                            ? 'border-white/[0.04] bg-white/[0.005] opacity-60'
                            : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            mod.disabled
                              ? 'bg-white/5 text-slate-600'
                              : 'bg-emerald/10 text-emerald ring-1 ring-emerald/25'
                          }`}
                        >
                          {mod.disabled ? <PowerOff size={15} /> : <Power size={15} />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-semibold text-slate-200 truncate">
                              {mod.name}
                            </span>
                            {mod.disabled && (
                              <StatusPill tone="slate">выкл</StatusPill>
                            )}
                            {(() => {
                              const m = getMetaFor(mod.name);
                              if (!m) return null;
                              return (
                                <>
                                  {m.mandatory && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gold/10 border border-gold/25 text-gold text-[9px] font-bold uppercase tracking-wider">
                                      <Crown size={9} /> Обязательный
                                    </span>
                                  )}
                                  {!m.mandatory && m.disabled_by_users > 0 && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-500 text-[9px] font-bold">
                                      {m.disabled_by_users} откл.
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-600 font-mono mt-0.5">
                            <span>{fmtSize(mod.size)}</span>
                            <span>·</span>
                            <span>{fmtDate(mod.modified)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggle(mod.filename)}
                            disabled={busyFile === mod.filename}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                              mod.disabled
                                ? 'text-emerald hover:bg-emerald/10'
                                : 'text-slate-400 hover:bg-white/5'
                            }`}
                          >
                            {busyFile === mod.filename ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : mod.disabled ? (
                              <Power size={11} />
                            ) : (
                              <PowerOff size={11} />
                            )}
                            {mod.disabled ? 'Включить' : 'Отключить'}
                          </button>
                          {(() => {
                            const m = getMetaFor(mod.name);
                            if (!m) return null;
                            return (
                              <button
                                type="button"
                                onClick={() => handleToggleMandatory(m.name, m.mandatory)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                  m.mandatory
                                    ? 'text-gold bg-gold/10 hover:bg-gold/20'
                                    : 'text-slate-500 hover:text-gold hover:bg-gold/10'
                                }`}
                                title={m.mandatory ? 'Снять обязательность' : 'Сделать обязательным'}
                              >
                                <Crown size={12} />
                              </button>
                            );
                          })()}
                          <button
                            type="button"
                            onClick={() => handleDelete(mod)}
                            disabled={busyFile === mod.filename}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blood hover:bg-blood/10 transition-colors disabled:opacity-40"
                            title="Удалить"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === КОНФИГИ === */}
          {tab === 'configs' && (
            <div className="h-full flex flex-col min-h-0">
              <div className="mb-4 shrink-0">
                <div className="relative w-72">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поиск конфигов..."
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

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                {filteredConfigs.length === 0 ? (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] py-16 text-center">
                    <FileCog size={28} className="mx-auto text-slate-700 mb-3" />
                    <p className="text-[13px] text-slate-400 font-semibold">
                      {query ? 'Ничего не найдено' : 'Конфигов нет'}
                    </p>
                  </div>
                ) : (
                  filteredConfigs.map((c) => (
                    <button
                      key={c.rel_path}
                      type="button"
                      onClick={() => setEditingConfig(c.rel_path)}
                      className="w-full text-left rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex items-center gap-3 hover:border-white/[0.12] hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-blizzard/10 text-blizzard ring-1 ring-blizzard/25">
                        <FileCode2 size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-slate-200 truncate font-mono">
                          {c.rel_path}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-600 font-mono mt-0.5">
                          <span>{fmtSize(c.size)}</span>
                          <span>·</span>
                          <span>{fmtDate(c.modified)}</span>
                        </div>
                      </div>
                      <FileCode2 size={13} className="text-slate-600 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* === МАНИФЕСТ === */}
          {tab === 'manifest' && (
            <div className="h-full flex flex-col">
              <div className="max-w-2xl">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-11 h-11 rounded-xl bg-gold/10 ring-1 ring-gold/25 flex items-center justify-center text-gold shrink-0">
                      <RefreshCw size={18} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-white">
                        Пересобрать манифест
                      </h3>
                      <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                        Пересчитывает SHA256 всех файлов клиента и обновляет manifest.json.
                        Игроки увидят обновление при следующем запуске лаунчера.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
                        Новая версия клиента
                      </label>
                      <input
                        type="text"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        disabled={rebuilding}
                        placeholder="1.0.6"
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 outline-none focus:border-gold transition-colors disabled:opacity-50"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleRebuild}
                      disabled={rebuilding || !version.trim()}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gold text-abyss font-bold text-[11px] uppercase tracking-[0.12em] hover:shadow-glow-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {rebuilding ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      {rebuilding ? 'Пересборка... (1-2 мин)' : 'Пересобрать'}
                    </button>
                  </div>

                  {rebuildResult && (
                    <div className="mt-5 pt-5 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2 text-emerald mb-2">
                        <Check size={14} />
                        <span className="text-[12px] font-bold">
                          Готово! Версия {rebuildResult.version}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Файлов в манифесте:{' '}
                        <span className="font-mono text-slate-300">
                          {rebuildResult.files_count}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-xl border border-gold/20 bg-gold/[0.03] p-4">
                  <div className="text-[11px] text-gold/80 leading-relaxed">
                    <strong>Как это работает:</strong> при пересборке скрипт проходит
                    по всем файлам в <span className="font-mono">/var/www/valheim/client/</span>,
                    считает SHA256 каждого, и обновляет manifest.json. Игроки при запуске
                    лаунчера сравнят хэши и скачают только изменённые файлы.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfigEditor
        relPath={editingConfig}
        onClose={() => setEditingConfig(null)}
        onSaved={load}
      />
    </div>
  );
}
