import type { MiddlewareHandler } from 'hono';
import { fail } from './util.js';

const hits = new Map<string, number[]>();
setInterval(() => hits.clear(), 60 * 60_000).unref();

export const clientIp = (c: any) =>
  (c.req.header('x-forwarded-for') || '').split(',')[0].trim() || c.env?.incoming?.socket?.remoteAddress || 'local';

export const rateLimit = (name: string, max: number, windowMs: number): MiddlewareHandler => async (c, next) => {
  const key = `${name}:${clientIp(c)}`;
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) throw fail(429, 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.');
  list.push(now);
  hits.set(key, list);
  await next();
};
