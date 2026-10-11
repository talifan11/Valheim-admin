import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  userId: number | null;
  username: string;
  setAuth: (token: string, userId: number, username: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      username: '',
      setAuth: (token, userId, username) => set({ token, userId, username }),
      logout: () => set({ token: null, userId: null, username: '' }),
    }),
    { name: 'valheim-admin:auth' },
  ),
);
