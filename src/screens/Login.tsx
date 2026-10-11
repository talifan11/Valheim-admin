import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import * as api from '../lib/api';

export function Login() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.login(email.trim(), password);
      // Проверим что этот юзер — админ
      try {
        await api.adminPing(res.token);
      } catch {
        throw new Error('У вас нет доступа к админке');
      }
      setAuth(res.token, res.user_id, res.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="theme-bg min-h-screen w-full flex items-center justify-center px-6">
      <div className="w-full max-w-[400px] animate-fade-in-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold/10 ring-1 ring-gold/30 text-gold mb-5">
            <span className="font-mono text-3xl leading-none">ᛏ</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white tracking-[0.15em]">
            VALHEIM ROUGE
          </h1>
          <p className="text-[11px] uppercase tracking-[0.4em] text-gold mt-3 font-bold">
            Панель управления
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-strong rounded-[24px] p-7">
          <div className="mb-5">
            <label className="block text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold mb-2.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              autoFocus
              spellCheck={false}
              className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-gold focus:shadow-[0_0_0_3px_rgba(255,194,75,0.15)] transition-all"
              placeholder="admin@example.com"
            />
          </div>

          <div className="mb-6">
            <label className="block text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold mb-2.5">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              spellCheck={false}
              className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-gold focus:shadow-[0_0_0_3px_rgba(255,194,75,0.15)] transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-[12px] text-blood text-center mb-5 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full h-12 rounded-xl font-bold text-[12px] uppercase tracking-[0.3em] text-abyss transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(180deg, #ffd479 0%, #ffc24b 40%, #e3a730 100%)' }}
          >
            {busy ? 'Проверка...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
