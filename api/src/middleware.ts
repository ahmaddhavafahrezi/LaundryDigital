import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import { config } from './config.js';
import { q1 } from './db.js';
import { fail } from './lib/util.js';

export type AuthUser = {
  id: number; outletId: number; name: string; username: string; role: 'owner' | 'karyawan';
  canDiscount: boolean; canCorrect: boolean; canPayment: boolean;
};
export type Env = { Variables: { user: AuthUser } };

export const auth: MiddlewareHandler<Env> = async (c, next) => {
  const token = getCookie(c, 'token') ?? c.req.header('Authorization')?.replace(/^Bearer /, '');
  if (!token) throw fail(401, 'Silakan login terlebih dahulu');
  let payload: any;
  try { payload = await verify(token, config.jwtSecret, 'HS256'); } catch { throw fail(401, 'Sesi berakhir, silakan login kembali'); }
  const u = await q1('SELECT * FROM users WHERE id=?', [payload.sub]);
  if (!u || !u.is_active) throw fail(401, 'Akun tidak aktif');
  c.set('user', {
    id: u.id, outletId: u.outlet_id, name: u.name, username: u.username, role: u.role,
    canDiscount: !!u.can_discount, canCorrect: !!u.can_correct, canPayment: !!u.can_payment,
  });
  await next();
};

export const ownerOnly: MiddlewareHandler<Env> = async (c, next) => {
  if (c.get('user').role !== 'owner') throw fail(403, 'Hanya owner yang dapat mengakses fitur ini');
  await next();
};
