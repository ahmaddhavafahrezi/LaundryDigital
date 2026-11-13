import { createContext, useContext, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export type User = { id: number; name: string; username: string; role: 'owner' | 'karyawan'; can_discount: boolean; can_correct: boolean; can_payment: boolean; must_change_password: boolean };
type Ctx = { user: User | null; loading: boolean; login: (u: string, p: string) => Promise<void>; logout: () => Promise<void>; refresh: () => void };
const AuthCtx = createContext<Ctx>(null as any);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<{ user: User }>('/auth/me').then((r) => r.user).catch(() => null), staleTime: 60_000, retry: false });

  // Hapus cache data lain (pesanan, pelanggan, dll.) supaya tidak bocor antar akun,
  // tetapi JANGAN hapus query ['me'] karena itu yang dipantau oleh useQuery di atas.
  const clearOtherCache = () => qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });

  const value: Ctx = {
    user: me.data ?? null,
    loading: me.isLoading,
    login: async (username, password) => {
      const r = await api<{ user: User }>('/auth/login', { method: 'POST', body: { username, password } });
      clearOtherCache();
      qc.setQueryData(['me'], r.user);
    },
    logout: async () => {
      await api('/auth/logout', { method: 'POST' });
      clearOtherCache();
      qc.setQueryData(['me'], null);
    },
    refresh: () => qc.invalidateQueries({ queryKey: ['me'] }),
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}