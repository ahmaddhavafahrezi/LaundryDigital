import { Hono } from 'hono';
import { z } from 'zod';
import { exec, q } from '../db.js';
import { auth, ownerOnly, type Env } from '../middleware.js';
import { body, fail } from '../lib/util.js';
import { log } from '../lib/audit.js';

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(255).optional().default(''),
  category: z.enum(['kiloan', 'satuan', 'paket']),
  unit: z.string().trim().min(1).max(20),
  price: z.number().min(0).max(100_000_000),
  est_hours: z.number().int().min(1).max(720),
  is_active: z.boolean().optional().default(true),
});

const r = new Hono<Env>();
r.use('*', auth);

r.get('/', async (c) => {
  const u = c.get('user');
  const all = u.role === 'owner' && c.req.query('all') === '1';
  return c.json(await q(`SELECT * FROM services WHERE outlet_id=? ${all ? '' : 'AND is_active=1'} ORDER BY category, name`, [u.outletId]));
});

r.post('/', ownerOnly, async (c) => {
  const u = c.get('user');
  const d = await body(c, schema);
  const res = await exec('INSERT INTO services (outlet_id,name,description,category,unit,price,est_hours,is_active) VALUES (?,?,?,?,?,?,?,?)',
    [u.outletId, d.name, d.description, d.category, d.unit, d.price, d.est_hours, d.is_active ? 1 : 0]);
  await log(null, u.outletId, u, 'create', 'service', res.insertId, `Menambah layanan ${d.name} (Rp${d.price})`);
  return c.json({ id: res.insertId }, 201);
});

r.patch('/:id', ownerOnly, async (c) => {
  const u = c.get('user');
  const d = await body(c, schema);
  const res = await exec('UPDATE services SET name=?,description=?,category=?,unit=?,price=?,est_hours=?,is_active=? WHERE id=? AND outlet_id=?',
    [d.name, d.description, d.category, d.unit, d.price, d.est_hours, d.is_active ? 1 : 0, c.req.param('id'), u.outletId]);
  if (!res.affectedRows) throw fail(404, 'Layanan tidak ditemukan');
  await log(null, u.outletId, u, 'update', 'service', c.req.param('id'), `Mengubah layanan ${d.name} (Rp${d.price}); hanya berlaku untuk order baru`);
  return c.json({ ok: true });
});

export default r;
