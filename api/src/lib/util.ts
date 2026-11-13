import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

export const fail = (status: 400 | 401 | 403 | 404 | 409 | 422 | 429, message: string) =>
  new HTTPException(status, { message });

export async function body<T extends z.ZodTypeAny>(c: Context, schema: T): Promise<z.infer<T>> {
  let json: unknown = {};
  try { json = await c.req.json(); } catch { /* body kosong */ }
  const r = schema.safeParse(json);
  if (!r.success) throw fail(422, r.error.issues.map((i) => `${i.path.join('.') || 'data'}: ${i.message}`).join('; '));
  return r.data;
}

/** Tanggal (YYYY-MM-DD) dalam zona Asia/Jakarta */
export const wibDate = (d = new Date()) => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10);
export function addDays(ymd: string, n: number) {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Rentang laporan: from (inklusif) dan to (eksklusif) */
export function getRange(c: Context) {
  const today = wibDate();
  const r = c.req.query('range') || 'bulan_ini';
  let from = today.slice(0, 8) + '01';
  let end = today;
  if (r === 'hari_ini') from = today;
  else if (r === '7_hari') from = addDays(today, -6);
  else if (r === 'bulan_lalu') {
    const first = today.slice(0, 8) + '01';
    end = addDays(first, -1);
    from = end.slice(0, 8) + '01';
  } else if (r === 'tahun_ini') from = today.slice(0, 4) + '-01-01';
  else if (r === 'custom') {
    const f = c.req.query('from'), t = c.req.query('to');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f || '') || !/^\d{4}-\d{2}-\d{2}$/.test(t || '')) throw fail(422, 'Rentang tanggal tidak valid');
    from = f!; end = t!;
    if (from > end) throw fail(422, 'Tanggal awal harus sebelum tanggal akhir');
  }
  return { from, end, to: addDays(end, 1) };
}

export const paymentStatus = (total: number, paid: number) =>
  paid <= 0 && total > 0 ? 'belum_lunas' : paid >= total ? 'lunas' : 'dp';

export const rupiah = (n: number) => Math.round(n);
export const normPhone = (p: string) => p.replace(/[^\d+]/g, '');

export function maskName(n: string) {
  return n.split(/\s+/).map((w) => w[0] + '*'.repeat(Math.max(2, w.length - 1))).join(' ');
}
export function maskPhone(p: string) {
  return p.length <= 4 ? '****' : p.slice(0, 2) + '•'.repeat(Math.max(3, p.length - 5)) + p.slice(-3);
}

export const STATUS_ORDER = ['diterima', 'menunggu_antrean', 'sedang_dicuci', 'pengeringan', 'penyetrikaan', 'pengemasan', 'siap_diambil', 'sudah_diambil'] as const;
export const SKIPPABLE = new Set(['menunggu_antrean', 'pengeringan', 'penyetrikaan', 'pengemasan']);
