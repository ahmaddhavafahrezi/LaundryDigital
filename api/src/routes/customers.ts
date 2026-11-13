import { Hono } from 'hono';
import { z } from 'zod';
import { exec, q, q1 } from '../db.js';
import { auth, type Env } from '../middleware.js';
import { body, fail, normPhone } from '../lib/util.js';
import { log } from '../lib/audit.js';

const schema = z.object({
  name: z.string().trim().min(2, 'minimal 2 karakter').max(120),
  phone: z.string().trim().min(8, 'nomor tidak valid').max(20),
  address: z.string().max(255).optional().default(''),
  notes: z.string().max(255).optional().default(''),
  is_member: z.boolean().optional().default(false),
});

const r = new Hono<Env>();
r.use('*', auth);

r.get('/', async (c) => {
  const u = c.get('user');
  const search = (c.req.query('q') || '').trim();
  const page = Math.max(1, +(c.req.query('page') || 1)), size = Math.min(100, +(c.req.query('size') || 20));
  const like = `%${search}%`;
  const where = 'c.outlet_id=? AND (c.name LIKE ? OR c.phone LIKE ?)';
  const rows = await q(
    `SELECT c.*, COUNT(t.id) order_count, COALESCE(SUM(CASE WHEN t.status<>'dibatalkan' THEN t.total END),0) total_spent
     FROM customers c LEFT JOIN transactions t ON t.customer_id=c.id WHERE ${where} GROUP BY c.id ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
    [u.outletId, like, like, size, (page - 1) * size]);
  const total = (await q1(`SELECT COUNT(*) n FROM customers c WHERE ${where}`, [u.outletId, like, like]))!.n;
  return c.json({ data: rows, total, page, size });
});

r.get('/:id', async (c) => {
  const u = c.get('user');
  const cu = await q1('SELECT * FROM customers WHERE id=? AND outlet_id=?', [c.req.param('id'), u.outletId]);
  if (!cu) throw fail(404, 'Pelanggan tidak ditemukan');
  const orders = await q('SELECT id, invoice_no, total, status, payment_status, created_at FROM transactions WHERE customer_id=? ORDER BY created_at DESC LIMIT 50', [cu.id]);
  return c.json({ ...cu, orders });
});

r.post('/', async (c) => {
  const u = c.get('user');
  const d = await body(c, schema);
  const phone = normPhone(d.phone);
  const dup = await q1('SELECT id, name FROM customers WHERE outlet_id=? AND phone=?', [u.outletId, phone]);
  if (dup) throw fail(409, `Nomor ini sudah terdaftar atas nama ${dup.name}. Gunakan data pelanggan yang ada.`);
  const res = await exec('INSERT INTO customers (outlet_id,name,phone,address,notes,is_member) VALUES (?,?,?,?,?,?)', [u.outletId, d.name, phone, d.address, d.notes, d.is_member ? 1 : 0]);
  await log(null, u.outletId, u, 'create', 'customer', res.insertId, `Menambah pelanggan ${d.name}`);
  return c.json({ id: res.insertId, name: d.name, phone }, 201);
});

r.patch('/:id', async (c) => {
  const u = c.get('user');
  const d = await body(c, schema);
  const phone = normPhone(d.phone);
  const id = c.req.param('id');
  const dup = await q1('SELECT id FROM customers WHERE outlet_id=? AND phone=? AND id<>?', [u.outletId, phone, id]);
  if (dup) throw fail(409, 'Nomor telepon sudah dipakai pelanggan lain');
  const res = await exec('UPDATE customers SET name=?,phone=?,address=?,notes=?,is_member=? WHERE id=? AND outlet_id=?', [d.name, phone, d.address, d.notes, d.is_member ? 1 : 0, id, u.outletId]);
  if (!res.affectedRows) throw fail(404, 'Pelanggan tidak ditemukan');
  await log(null, u.outletId, u, 'update', 'customer', id, `Mengubah pelanggan ${d.name}`);
  return c.json({ ok: true });
});

r.delete('/:id', async (c) => {
  const u = c.get('user');
  if (u.role !== 'owner') throw fail(403, 'Hanya owner yang dapat menghapus pelanggan');
  const id = c.req.param('id');
  const cu = await q1('SELECT id, name FROM customers WHERE id=? AND outlet_id=?', [id, u.outletId]);
  if (!cu) throw fail(404, 'Pelanggan tidak ditemukan');
  const n = (await q1('SELECT COUNT(*) n FROM transactions WHERE customer_id=?', [id]))!.n;
  if (n > 0) throw fail(409, `${cu.name} punya ${n} riwayat order, sehingga tidak bisa dihapus`);
  await exec('DELETE FROM customers WHERE id=? AND outlet_id=?', [id, u.outletId]);
  await log(null, u.outletId, u, 'delete', 'customer', id, `Menghapus pelanggan ${cu.name}`);
  return c.json({ ok: true });
});

export default r;