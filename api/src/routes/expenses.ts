import { Hono } from 'hono';
import { z } from 'zod';
import { exec, q, q1 } from '../db.js';
import { auth, ownerOnly, type Env } from '../middleware.js';
import { body, fail } from '../lib/util.js';
import { log } from '../lib/audit.js';

export const EXPENSE_CATEGORIES = ['Listrik', 'Air', 'Deterjen', 'Pewangi', 'Plastik', 'Gaji', 'Sewa', 'Internet', 'Perawatan mesin', 'Transportasi', 'Promosi', 'Lainnya'];
const schema = z.object({
  spent_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'tanggal tidak valid'),
  category: z.enum(EXPENSE_CATEGORIES as [string, ...string[]]),
  description: z.string().max(255).optional().default(''),
  amount: z.number().positive('nominal harus lebih dari 0').max(1_000_000_000),
  method: z.enum(['tunai', 'transfer', 'qris']).default('tunai'),
});

const r = new Hono<Env>();
r.use('*', auth, ownerOnly);

r.get('/categories', (c) => c.json(EXPENSE_CATEGORIES));

r.get('/', async (c) => {
  const u = c.get('user');
  const { from = '', to = '', category = '' } = c.req.query();
  const page = Math.max(1, +(c.req.query('page') || 1)), size = 20;
  const w = ['outlet_id=?'], p: any[] = [u.outletId];
  if (from) { w.push('spent_on>=?'); p.push(from); }
  if (to) { w.push('spent_on<=?'); p.push(to); }
  if (category) { w.push('category=?'); p.push(category); }
  const rows = await q(`SELECT e.*, DATE_FORMAT(e.spent_on,'%Y-%m-%d') spent_on FROM expenses e WHERE ${w.join(' AND ')} ORDER BY e.spent_on DESC, e.id DESC LIMIT ? OFFSET ?`, [...p, size, (page - 1) * size]);
  const agg = await q1(`SELECT COUNT(*) n, COALESCE(SUM(amount),0) total FROM expenses WHERE ${w.join(' AND ')}`, p);
  return c.json({ data: rows, total: agg!.n, sum: agg!.total, page, size });
});

r.post('/', async (c) => {
  const u = c.get('user');
  const d = await body(c, schema);
  const res = await exec('INSERT INTO expenses (outlet_id,spent_on,category,description,amount,method,user_id) VALUES (?,?,?,?,?,?,?)', [u.outletId, d.spent_on, d.category, d.description, d.amount, d.method, u.id]);
  await log(null, u.outletId, u, 'create', 'expense', res.insertId, `Pengeluaran ${d.category} Rp${d.amount}`);
  return c.json({ id: res.insertId }, 201);
});

r.patch('/:id', async (c) => {
  const u = c.get('user');
  const d = await body(c, schema);
  const old = await q1('SELECT * FROM expenses WHERE id=? AND outlet_id=?', [c.req.param('id'), u.outletId]);
  if (!old) throw fail(404, 'Data tidak ditemukan');
  await exec('UPDATE expenses SET spent_on=?,category=?,description=?,amount=?,method=? WHERE id=?', [d.spent_on, d.category, d.description, d.amount, d.method, old.id]);
  await log(null, u.outletId, u, 'update', 'expense', old.id, `Ubah pengeluaran ${old.category}: Rp${old.amount} → ${d.category} Rp${d.amount}`);
  return c.json({ ok: true });
});

export default r;
