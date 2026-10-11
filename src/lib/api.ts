// API-клиент админки. Все запросы идут на HTTPS через sslip.io.

export const API_BASE = 'https://panel.62.217.178.72.sslip.io/api';

export interface AuthResponse {
  token: string;
  user_id: number;
  email: string;
  username: string;
  avatar_url?: string | null;
}

export interface AdminStats {
  users_total: number;
  users_admin: number;
  online: number;
  forum_threads: number;
  forum_posts: number;
  messages_general: number;
  messages_dm: number;
}

export interface AdminUser {
  id: number;
  email: string;
  username: string;
  avatar_url?: string | null;
  is_admin: boolean;
  created_at: string;
  last_seen: string | null;
  online: boolean;
  banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
}

export interface AdminUsersResponse {
  total: number;
  limit: number;
  offset: number;
  users: AdminUser[];
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.detail || `Ошибка ${res.status}`;
  } catch {
    return `Ошибка ${res.status}`;
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function adminPing(token: string): Promise<{ user_id: number; username: string; message: string }> {
  const res = await fetch(`${API_BASE}/admin/ping`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getAdminStats(token: string): Promise<AdminStats> {
  const res = await fetch(`${API_BASE}/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getAdminUsers(token: string, limit = 100, offset = 0): Promise<AdminUsersResponse> {
  const res = await fetch(`${API_BASE}/admin/users?limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function toggleAdmin(token: string, userId: number, enable: boolean): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/admin?enable=${enable}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export function resolveAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `https://panel.62.217.178.72.sslip.io${url}`;
}


// ============================================================
// АДМИН: ЛАУНЧЕР
// ============================================================

export interface LauncherFile {
  name: string;
  size: number;
  modified: string;
}

export interface LauncherManifest {
  version: string;
  download_url: string;
  release_notes: string;
  published_at: string;
}

export interface LauncherCurrent {
  version: string | null;
  manifest: LauncherManifest | null;
  files: LauncherFile[];
}

export interface LauncherUploadResult {
  status: string;
  version: string;
  filename: string;
  size: number;
  download_url: string;
}

export async function getLauncherCurrent(token: string): Promise<LauncherCurrent> {
  const res = await fetch(`${API_BASE}/admin/launcher/current`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/**
 * Загрузка нового exe с прогрессом.
 * fetch не умеет upload progress — используем XHR.
 */
export function uploadLauncher(
  token: string,
  file: File,
  version: string,
  releaseNotes: string,
  onProgress?: (percent: number) => void,
): Promise<LauncherUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const params = new URLSearchParams({
      version,
      release_notes: releaseNotes,
    });
    xhr.open(
      'POST',
      `${API_BASE}/admin/launcher/upload?${params.toString()}`,
    );
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Некорректный ответ сервера'));
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          reject(new Error(data.detail || `Ошибка ${xhr.status}`));
        } catch {
          reject(new Error(`Ошибка ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Сетевая ошибка при загрузке'));

    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

export async function deleteLauncherFile(token: string, filename: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/admin/launcher/files/${encodeURIComponent(filename)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error(await parseError(res));
}


// ============================================================
// АДМИН: НОВОСТИ
// ============================================================

export interface AdminNewsItem {
  id: number;
  title: string;
  description: string;
  imageUrl: string | null;
  tag: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  pinned: boolean;
  author: { username: string; avatarUrl: string | null } | null;
}

export interface NewsCreatePayload {
  title: string;
  body: string;
  image_url?: string | null;
  tag?: string | null;
  published?: boolean;
  pinned?: boolean;
}

export interface NewsUpdatePayload {
  title?: string;
  body?: string;
  image_url?: string | null;
  tag?: string | null;
  published?: boolean;
  pinned?: boolean;
}

export async function getAdminNews(token: string): Promise<AdminNewsItem[]> {
  const res = await fetch(`${API_BASE}/admin/news`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createNews(token: string, payload: NewsCreatePayload): Promise<{ id: number }> {
  const res = await fetch(`${API_BASE}/admin/news`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateNews(token: string, id: number, payload: NewsUpdatePayload): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/news/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function deleteNews(token: string, id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/news/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

/**
 * Загрузка картинки к новости. С XHR ради прогресс-бара.
 */
export function uploadNewsImage(
  token: string,
  newsId: number,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ imageUrl: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/admin/news/${newsId}/image`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(new Error('Некорректный ответ')); }
      } else {
        try {
          const d = JSON.parse(xhr.responseText);
          reject(new Error(d.detail || `Ошибка ${xhr.status}`));
        } catch {
          reject(new Error(`Ошибка ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Сетевая ошибка'));

    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

// ============================================================
// АДМИН: МОДЕРАЦИЯ ФОРУМА
// ============================================================

export interface AdminThread {
  id: number;
  title: string;
  body_preview: string;
  created_at: string;
  updated_at: string;
  pinned: boolean;
  locked: boolean;
  views: number;
  author: { user_id: number; username: string; avatar_url: string | null };
  category: { id: number; slug: string; title: string };
  reply_count: number;
}

export interface AdminThreadsResponse {
  total: number;
  threads: AdminThread[];
}

export async function getAdminThreads(token: string, limit = 100, offset = 0): Promise<AdminThreadsResponse> {
  const res = await fetch(`${API_BASE}/admin/forum/threads?limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteThread(token: string, threadId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/forum/threads/${threadId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function deletePost(token: string, postId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/forum/posts/${postId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function pinThread(token: string, threadId: number, pinned: boolean): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/forum/threads/${threadId}/pin?pinned=${pinned}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function lockThread(token: string, threadId: number, locked: boolean): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/forum/threads/${threadId}/lock?locked=${locked}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

// ============================================================
// АДМИН: БАН ИГРОКОВ
// ============================================================

export async function banUser(token: string, userId: number, reason: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/admin/users/${userId}/ban?reason=${encodeURIComponent(reason)}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error(await parseError(res));
}

export async function unbanUser(token: string, userId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/unban`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

// ============================================================
// АДМИН: МОДЕРАЦИЯ ЧАТА
// ============================================================

export interface AdminChatMessage {
  id: number;
  from_user_id: number;
  text: string;
  created_at: string;
  author: { user_id: number; username: string; avatar_url: string | null };
}

export interface AdminGeneralChat {
  total: number;
  messages: AdminChatMessage[];
}

export interface AdminChatUser {
  user_id: number;
  username: string;
  avatar_url: string | null;
}

export interface AdminDmMessage {
  id: number;
  from_user_id: number;
  to_user_id: number;
  text: string;
  created_at: string;
  author: { user_id: number; username: string; avatar_url: string | null };
}

export async function getAdminGeneralChat(token: string, limit = 200, offset = 0): Promise<AdminGeneralChat> {
  const res = await fetch(`${API_BASE}/admin/chat/general?limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteGeneralMessage(token: string, messageId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/chat/general/${messageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function getAdminChatUsers(token: string): Promise<AdminChatUser[]> {
  const res = await fetch(`${API_BASE}/admin/chat/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getAdminDm(
  token: string,
  userA: number,
  userB: number,
): Promise<AdminDmMessage[]> {
  const res = await fetch(`${API_BASE}/admin/chat/dm/${userA}/${userB}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteDmMessage(token: string, messageId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/chat/dm/${messageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

// ============================================================
// АДМИН: ИСТОРИЯ СТАТИСТИКИ
// ============================================================

export interface StatsHistoryPoint {
  date: string;
  users: number;
  messages: number;
  general: number;
  posts: number;
  threads: number;
}

export interface StatsHistoryResponse {
  days: number;
  data: StatsHistoryPoint[];
}

export async function getAdminStatsHistory(token: string, days = 30): Promise<StatsHistoryResponse> {
  const res = await fetch(`${API_BASE}/admin/stats/history?days=${days}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

// ============================================================
// АДМИН: ЗАДАЧИ РАЗРАБОТКИ (KANBAN)
// ============================================================

export type DevStatus = 'backlog' | 'in_progress' | 'review' | 'done';
export type DevPriority = 'low' | 'medium' | 'high' | 'critical';

export interface DevTask {
  id: number;
  title: string;
  description: string;
  status: DevStatus;
  priority: DevPriority;
  tags: string[];
  order_index: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export async function getDevTasks(token: string): Promise<{ tasks: DevTask[] }> {
  const res = await fetch(`${API_BASE}/admin/dev/tasks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createDevTask(
  token: string,
  payload: { title: string; description?: string; status?: DevStatus; priority?: DevPriority; tags?: string[] },
): Promise<{ id: number }> {
  const res = await fetch(`${API_BASE}/admin/dev/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateDevTask(
  token: string,
  id: number,
  payload: Partial<{ title: string; description: string; status: DevStatus; priority: DevPriority; tags: string[]; order_index: number }>,
): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/dev/tasks/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function moveDevTask(token: string, id: number, status: DevStatus, orderIndex: number): Promise<void> {
  const res = await fetch(
    `${API_BASE}/admin/dev/tasks/${id}/move?status=${status}&order_index=${orderIndex}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error(await parseError(res));
}

export async function deleteDevTask(token: string, id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/dev/tasks/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

// ============================================================
// АДМИН: MOD MANAGER
// ============================================================

export interface ModPlugin {
  name: string;
  filename: string;
  size: number;
  modified: string;
  disabled: boolean;
  ext: string;
}

export interface ModConfig {
  name: string;
  rel_path: string;
  size: number;
  modified: string;
}

export interface ModsList {
  plugins: ModPlugin[];
  configs: ModConfig[];
  plugins_dir: string;
  configs_dir: string;
}

export interface RebuildResult {
  status: string;
  version: string;
  files_count: number;
  output: string;
}

export async function getModsList(token: string): Promise<ModsList> {
  const res = await fetch(`${API_BASE}/admin/mods/list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export function uploadMod(
  token: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ status: string; filename: string; size: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/admin/mods/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(new Error('Некорректный ответ')); }
      } else {
        try {
          const d = JSON.parse(xhr.responseText);
          reject(new Error(d.detail || `Ошибка ${xhr.status}`));
        } catch {
          reject(new Error(`Ошибка ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Сетевая ошибка'));

    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

export async function toggleMod(token: string, filename: string): Promise<{ enabled: boolean }> {
  const res = await fetch(`${API_BASE}/admin/mods/${encodeURIComponent(filename)}/toggle`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteMod(token: string, filename: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/mods/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function readModConfig(token: string, relPath: string): Promise<{ rel_path: string; content: string }> {
  const res = await fetch(`${API_BASE}/admin/mods/config/${relPath.split('/').map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function saveModConfig(token: string, relPath: string, content: string): Promise<{ status: string; backup: string }> {
  const res = await fetch(`${API_BASE}/admin/mods/config/${relPath.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function rebuildManifest(token: string, version: string): Promise<RebuildResult> {
  const res = await fetch(`${API_BASE}/admin/mods/rebuild-manifest?version=${encodeURIComponent(version)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}


// ============================================================
// DEVOPS PANEL
// ============================================================

export interface DevopsSystem {
  vps: {
    disk_total?: number;
    disk_used?: number;
    disk_free?: number;
    disk_percent?: number;
    ram_total?: number;
    ram_used?: number;
    ram_percent?: number;
    uptime_seconds?: number;
    load?: number[];
    cpu_count?: number;
    error?: string;
  };
}

export interface DevopsCommandTemplate {
  key: string;
  label: string;
  description: string;
  timeout: number;
}

export interface DevopsCommand {
  id: number;
  command_key: string;
  label: string;
  args: Record<string, unknown>;
  status: 'pending' | 'running' | 'done' | 'failed';
  output: string | null;
  exit_code: number | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
}

export interface DevopsPatch {
  id: number;
  name: string;
  backup: string | null;
  success: boolean;
  output: string;
  created_at: string;
  duration_ms: number;
}

export interface DevopsBridgeStatus {
  connected: boolean;
  has_token: boolean;
  message?: string;
  hostname?: string;
  platform?: string;
  version?: string;
  last_ping?: string;
}

export interface DevopsSqlResult {
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  truncated: boolean;
}

export async function getDevopsSystem(token: string): Promise<DevopsSystem> {
  const res = await fetch(`${API_BASE}/devops/system`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getDevopsBridgeStatus(token: string): Promise<DevopsBridgeStatus> {
  const res = await fetch(`${API_BASE}/devops/bridge/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getDevopsCommandsAvailable(token: string): Promise<{ commands: DevopsCommandTemplate[] }> {
  const res = await fetch(`${API_BASE}/devops/commands/available`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getDevopsCommandsList(token: string, limit = 50): Promise<{ commands: DevopsCommand[] }> {
  const res = await fetch(`${API_BASE}/devops/commands/list?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createDevopsCommand(token: string, key: string, args: Record<string, unknown> = {}): Promise<{ command_id: number }> {
  const params = new URLSearchParams({ command_key: key, args: JSON.stringify(args) });
  const res = await fetch(`${API_BASE}/devops/commands/create?${params}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteDevopsCommand(token: string, id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/devops/commands/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function applyDevopsPatch(token: string, name: string, code: string): Promise<{
  status: string;
  patch_id: number;
  backup: string;
  duration_ms: number;
  output: string;
  success: boolean;
}> {
  const res = await fetch(`${API_BASE}/devops/patch/apply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, code }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getDevopsPatchHistory(token: string, limit = 30): Promise<{ patches: DevopsPatch[] }> {
  const res = await fetch(`${API_BASE}/devops/patch/history?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function rollbackDevopsPatch(token: string, patchId: number): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/devops/patch/rollback/${patchId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function devopsSqlQuery(token: string, query: string): Promise<DevopsSqlResult> {
  const res = await fetch(`${API_BASE}/devops/sql/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getDevopsLogs(token: string, lines = 200): Promise<{ logs: string; lines: number }> {
  const res = await fetch(`${API_BASE}/devops/logs/tail?lines=${lines}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

// ============================================================
// DEVOPS TERMINAL
// ============================================================

export interface TerminalResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
}

export interface TerminalHistoryEntry {
  id: number;
  scope: 'vps' | 'local';
  command: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
  created_at: string;
}

export async function execVpsCommand(token: string, command: string, timeout = 30): Promise<TerminalResult> {
  const res = await fetch(`${API_BASE}/devops/terminal/exec`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, timeout }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function execLocalCommand(token: string, command: string, timeout = 300): Promise<{ command_id: number }> {
  const res = await fetch(`${API_BASE}/devops/terminal/local`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, timeout }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getLocalCommandResult(token: string, commandId: number): Promise<{
  status: string;
  stdout?: string;
  exit_code?: number;
  duration_ms?: number;
  message?: string;
}> {
  const res = await fetch(`${API_BASE}/devops/terminal/local/result/${commandId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getTerminalHistory(token: string, scope = '', limit = 50): Promise<TerminalHistoryEntry[]> {
  const q = scope ? `?scope=${scope}&limit=${limit}` : `?limit=${limit}`;
  const res = await fetch(`${API_BASE}/devops/terminal/history${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteTerminalHistory(token: string, id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/devops/terminal/history/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}


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


// ============================================================
// МОДЫ (метаданные для админа)
// ============================================================

export interface ModMeta {
  name: string;
  filename: string;
  mandatory: boolean;
  enabled_default: boolean;
  description: string;
  category: string;
  disabled_by_users: number;
}

export async function getAdminModsMeta(token: string): Promise<ModMeta[]> {
  const res = await fetch(`${API_BASE}/admin/mods/meta`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateModMeta(
  token: string,
  modName: string,
  patch: { mandatory?: boolean; enabled_default?: boolean; description?: string },
): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/mods/${encodeURIComponent(modName)}/meta`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

// ============================================================
// СОБЫТИЯ (для админки)
// ============================================================

export interface EventParticipant {
  user_id: number;
  username: string;
  avatar_url: string | null;
}

export interface AdminEvent {
  id: number;
  title: string;
  description: string;
  starts_at: string;
  category: string;
  location: string | null;
  max_slots: number | null;
  author_id: number;
  created_at: string;
  status: string;
  author: { user_id: number; username: string; avatar_url: string | null };
  participants: EventParticipant[];
  participants_count: number;
  joined: boolean;
}

export async function getAdminEvents(token: string): Promise<AdminEvent[]> {
  const res = await fetch(`${API_BASE}/events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteEvent(token: string, id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}


// ============================================================
// АДМИН: МОДЕРАЦИЯ КОММЕНТАРИЕВ
// ============================================================

export interface AdminComment {
  id: number;
  body: string;
  created_at: string;
  changelog_id: number;
  author: { user_id: number; username: string; avatar_url: string | null };
  changelog_title: string;
  changelog_version: string | null;
}

export async function getAllComments(token: string, limit = 200): Promise<AdminComment[]> {
  const res = await fetch(`${API_BASE}/admin/changelog/comments?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteAdminComment(token: string, id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/changelog/comments/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}
