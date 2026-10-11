import { useEffect, useRef, useState } from 'react';
import {
  Rocket,
  Upload,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileBox,
  Calendar,
  Download,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import * as api from '../lib/api';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function Launcher() {
  const token = useAuthStore((s) => s.token);

  const [data, setData] = useState<api.LauncherCurrent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Форма
  const [version, setVersion] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Удаление
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getLauncherCurrent(token);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.exe')) {
      setError('Только .exe файлы');
      return;
    }
    if (f.size > 200 * 1024 * 1024) {
      setError('Файл больше 200 MB');
      return;
    }
    setFile(f);
    setError(null);
  };

  const handleUpload = async () => {
    if (!token || !file) return;
    if (!version.trim() || !/^\d+(\.\d+){1,3}$/.test(version.trim())) {
      setError('Версия должна быть в формате X.Y.Z (например, 1.0.17)');
      return;
    }
    if (releaseNotes.trim().length < 3) {
      setError('Добавь release notes (минимум 3 символа)');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.uploadLauncher(
        token,
        file,
        version.trim(),
        releaseNotes.trim(),
        setProgress,
      );
      setSuccess(`Опубликована версия ${res.version} (${formatSize(res.size)})`);
      setFile(null);
      setVersion('');
      setReleaseNotes('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!token) return;
    if (!confirm(`Удалить файл?\n\n${filename}`)) return;
    setDeletingFile(filename);
    try {
      await api.deleteLauncherFile(token, filename);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setDeletingFile(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 overflow-y-auto h-full">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white">Лаунчер</h1>
        <p className="text-[12px] text-slate-500 mt-1">
          Загрузка новых версий и управление файлами
        </p>
      </div>

      {/* Текущая версия */}
      {data?.manifest && (
        <div className="glass rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 ring-1 ring-inset ring-gold/25 flex items-center justify-center text-gold shrink-0">
              <Rocket size={20} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-500">
                  Текущая версия
                </span>
                <span className="font-mono text-lg font-bold text-gold">
                  v{data.manifest.version}
                </span>
                <span className="text-[11px] text-slate-600">
                  опубликовано {data.manifest.published_at}
                </span>
              </div>
              <p className="text-[13px] text-slate-300 mt-2 leading-relaxed">
                {data.manifest.release_notes}
              </p>
              <a
                href={data.manifest.download_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-[11px] text-blizzard hover:text-white transition-colors font-mono"
              >
                <Download size={11} />
                {data.manifest.download_url}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Форма загрузки */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload size={14} className="text-gold" />
          <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">
            Загрузить новую версию
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
              Версия
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              disabled={uploading}
              placeholder="1.0.17"
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 outline-none focus:border-gold transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
              Файл .exe
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".exe"
              className="hidden"
              onChange={handlePickFile}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center gap-3 bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-left hover:bg-black/60 transition-colors disabled:opacity-50"
            >
              <FileBox size={14} className="text-slate-500 shrink-0" />
              <span className={`truncate flex-1 ${file ? 'text-white' : 'text-slate-600'}`}>
                {file ? file.name : 'Выбрать файл...'}
              </span>
              {file && (
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  {formatSize(file.size)}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-2">
            Release Notes
          </label>
          <textarea
            value={releaseNotes}
            onChange={(e) => setReleaseNotes(e.target.value)}
            disabled={uploading}
            rows={3}
            maxLength={500}
            placeholder="Что нового в этой версии..."
            className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-gold transition-colors resize-none disabled:opacity-50"
          />
        </div>

        {/* Прогресс */}
        {uploading && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 text-[11px]">
              <span className="text-slate-500">Загрузка на сервер...</span>
              <span className="font-mono text-gold">{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gold transition-all duration-200 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Статусы */}
        {error && (
          <div className="flex items-start gap-2 text-[12px] text-blood mb-3">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 text-[12px] text-emerald mb-3">
            <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !file || !version.trim() || !releaseNotes.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold text-abyss font-bold text-[11px] uppercase tracking-[0.14em] hover:shadow-glow-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            Опубликовать
          </button>
        </div>
      </div>

      {/* Файлы */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">
            Файлы на сервере
          </span>
          <span className="text-[11px] font-mono text-slate-600">
            {data?.files.length ?? 0} шт.
          </span>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500">
              <th className="px-5 py-3">Файл</th>
              <th className="px-5 py-3">Размер</th>
              <th className="px-5 py-3">Дата</th>
              <th className="px-5 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {data?.files.map((f) => {
              const isCurrent = data.manifest
                ? f.name === data.manifest.download_url.split('/').pop()?.replace(/%20/g, ' ')
                : false;
              return (
                <tr
                  key={f.name}
                  className={`border-b border-white/[0.04] transition-colors ${
                    isCurrent ? 'bg-gold/[0.04]' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <FileBox size={13} className={isCurrent ? 'text-gold' : 'text-slate-600'} />
                      <span className="text-[12px] font-mono text-slate-300">{f.name}</span>
                      {isCurrent && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gold bg-gold/10 px-1.5 py-0.5 rounded">
                          текущая
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[12px] font-mono text-slate-500">
                    {formatSize(f.size)}
                  </td>
                  <td className="px-5 py-3 text-[12px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={11} />
                      {formatDate(f.modified)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(f.name)}
                      disabled={deletingFile === f.name || isCurrent}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-blood hover:bg-blood/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {deletingFile === f.name ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                      Удалить
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
