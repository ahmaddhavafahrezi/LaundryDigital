import { Hono } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { config } from '../config.js';
import { exec, q1 } from '../db.js';
import { auth, type Env } from '../middleware.js';
import { body, fail } from '../lib/util.js';
import { log } from '../lib/audit.js';
import { clientIp, rateLimit } from '../lib/rateLimit.js';

const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10); // cegah timing attack user enumeration
const publicUser = (u: any) => ({
  id: u.id, name: u.name, username: u.username, role: u.role,
  can_discount: !!u.can_discount, can_correct: !!u.can_correct, can_payment: !!u.can_payment,
  must_change_password: !!u.must_change_password,
});

const r = new Hono<Env>();

r.post('/login', rateLimit('login', 10, 10 * 60_000), async (c) => {
  const { username, password } = await body(c, z.object({ username: z.string().min(1).max(100), password: z.string().min(1).max(200) }));
  const u = await q1('SELECT * FROM users WHERE username=? OR email=?', [username, username]);
  const ok = await bcrypt.compare(password, u?.password_hash ?? DUMMY_HASH);
  if (!u || !ok || !u.is_active) throw fail(401, 'Username atau password salah');
  const token = await sign({ sub: u.id, exp: Math.floor(Date.now() / 1000) + 12 * 3600 }, config.jwtSecret, 'HS256');
  setCookie(c, 'token', token, { httpOnly: true, secure: config.isProd, sameSite: 'Lax', path: '/', maxAge: 12 * 3600 });
  await exec('UPDATE users SET last_login=NOW() WHERE id=?', [u.id]);
  await log(null, u.outlet_id, u, 'login', 'user', u.id, `${u.name} login`, clientIp(c));
  return c.json({ user: publicUser(u) });
});

r.post('/logout', async (c) => {
  deleteCookie(c, 'token', { path: '/' });
  return c.json({ ok: true });
});

r.get('/me', auth, async (c) => {
  const u = await q1('SELECT * FROM users WHERE id=?', [c.get('user').id]);
  return c.json({ user: publicUser(u) });
});

r.post('/change-password', auth, async (c) => {
  const me = c.get('user');
  const { current, next } = await body(c, z.object({ current: z.string(), next: z.string().min(8, 'minimal 8 karakter').max(100) }));
  const u = await q1('SELECT password_hash FROM users WHERE id=?', [me.id]);
  if (!(await bcrypt.compare(current, u.password_hash))) throw fail(422, 'Password saat ini salah');
  await exec('UPDATE users SET password_hash=?, must_change_password=0 WHERE id=?', [await bcrypt.hash(next, 10), me.id]);
  await log(null, me.outletId, me, 'password', 'user', me.id, 'Mengganti password', clientIp(c));
  return c.json({ ok: true });
});

export default r;
