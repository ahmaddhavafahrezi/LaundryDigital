export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch('/api/v1' + path, {
      method: opts.method || 'GET', credentials: 'include',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch { throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi Anda.', 0); }
  let data: any = null;
  try { data = await res.json(); } catch { /* kosong */ }
  if (!res.ok) throw new ApiError(data?.error?.message || 'Terjadi kesalahan', res.status);
  return data as T;
}

export const qs = (o: Record<string, any>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => v !== '' && v != null && p.set(k, String(v)));
  return p.toString() ? '?' + p.toString() : '';
};
