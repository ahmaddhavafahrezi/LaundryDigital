import { Hono } from 'hono';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { exec, q, q1 } from '../db.js';
import { auth, ownerOnly, type Env } from '../middleware.js';
import { body, fail } from '../lib/util.js';
import { log } from '../lib/audit.js';

const base = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email('email tidak valid').max(160).optional().or(z.literal('')),
  phone: z.string().max(30).optional().default(''),
  can_discount: z.boolean().default(false),
  can_correct: z.boolean().default(false),
  can_payment: z.boolean().default(true),
});
const createSchema = base.extend({
  username: z.string().trim().min(3).max(40).regex(/^[a-z0-9._-]+$/i, 'hanya huruf, angka, titik, strip'),
  password: z.string().min(8, 'minimal 8 karakter').max(100),
});
const COLS = 'id,name,username,email,phone,role,can_discount,can_correct,can_payment,is_active,last_login,created_at';

const r = new Hono<Env>();
r.use('*', auth, ownerOnly);

r.get('/', async (c) => c.json(await q(`SELECT ${COLS} FROM users WHERE outlet_id=? ORDER BY role, name`, [c.get('user').outletId])));

r.post('/', async (c) => {
  const u = c.get('user');
  const d = await body(c, createSchema);
  try {
    const res = await exec('INSERT INTO users (outlet_id,name,username,email,phone,password_hash,role,can_discount,can_correct,can_payment,must_change_password) VALUES (?,?,?,?,?,?,?,?,?,?,1)',
      [u.outletId, d.name, d.username.toLowerCase(), d.email || null, d.phone, await bcrypt.hash(d.password, 10), 'karyawan', +d.can_discount, +d.can_correct, +d.can_payment]);
    await log(null, u.outletId, u, 'create', 'user', res.insertId, `Menambah karyawan ${d.name}`);
    return c.json({ id: res.insertId }, 201);
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') throw fail(409, 'Username atau email sudah dipakai');
    throw e;
  }
});

r.patch('/:id', async (c) => {
  const u = c.get('user');
  const d = await body(c, base.extend({ is_active: z.boolean() }));
  const target = await q1('SELECT * FROM users WHERE id=? AND outlet_id=?', [c.req.param('id'), u.outletId]);
  if (!target) throw fail(404, 'Karyawan tidak ditemukan');
  if (target.role === 'owner' && !d.is_active) throw fail(409, 'Akun owner tidak dapat dinonaktifkan');
  try {
    await exec('UPDATE users SET name=?,email=?,phone=?,can_discount=?,can_correct=?,can_payment=?,is_active=? WHERE id=?',
      [d.name, d.email || null, d.phone, +d.can_discount, +d.can_correct, +d.can_payment, +d.is_active, target.id]);
  } catch (e: any) { if (e.code === 'ER_DUP_ENTRY') throw fail(409, 'Email sudah dipakai'); throw e; }
  await log(null, u.outletId, u, 'update', 'user', target.id, `Mengubah ${target.name} (aktif=${d.is_active}, diskon=${d.can_discount}, koreksi=${d.can_correct}, bayar=${d.can_payment})`);
  return c.json({ ok: true });
});

r.post('/:id/reset-password', async (c) => {
  const u = c.get('user');
  const target = await q1("SELECT * FROM users WHERE id=? AND outlet_id=? AND role='karyawan'", [c.req.param('id'), u.outletId]);
  if (!target) throw fail(404, 'Karyawan tidak ditemukan');
  const temp = randomBytes(8).toString('base64url');
  await exec('UPDATE users SET password_hash=?, must_change_password=1 WHERE id=?', [await bcrypt.hash(temp, 10), target.id]);
  await log(null, u.outletId, u, 'reset', 'user', target.id, `Reset password ${target.name}`);
  return c.json({ temp_password: temp });
});

export default r;
