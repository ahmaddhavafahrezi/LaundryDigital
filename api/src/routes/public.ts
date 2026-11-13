import { Hono } from 'hono';
import { z } from 'zod';
import { q, q1 } from '../db.js';
import { body, fail, maskName, maskPhone } from '../lib/util.js';
import { rateLimit } from '../lib/rateLimit.js';

// Hanya endpoint BACA yang aman — tanpa login, tanpa mutasi.
const r = new Hono();

r.get('/outlet', async (c) => c.json(await q1('SELECT name,tagline,address,phone,open_hours,express_pct,kilat_pct,express_hours,kilat_hours FROM outlets ORDER BY id LIMIT 1')));
r.get('/services', async (c) => c.json(await q('SELECT id,name,description,category,unit,price,est_hours FROM services WHERE is_active=1 ORDER BY category,name')));

r.post('/tracking/lookup', rateLimit('track', 20, 5 * 60_000), async (c) => {
  const { code } = await body(c, z.object({ code: z.string().trim().min(6).max(40) }));
  const t = await q1(
    `SELECT t.id,t.invoice_no,t.status,t.payment_status,t.total,t.est_done,t.created_at,t.speed,c.name cname,c.phone cphone
     FROM transactions t JOIN customers c ON c.id=t.customer_id WHERE t.tracking_token=? OR t.invoice_no=?`, [code, code.toUpperCase()]);
  if (!t) throw fail(404, 'Kode tidak ditemukan. Periksa kembali nomor nota atau kode pada struk Anda.');
  const [items, history] = await Promise.all([
    q('SELECT service_name,qty,unit FROM transaction_items WHERE transaction_id=?', [t.id]),
    q('SELECT to_status,created_at FROM status_histories WHERE transaction_id=? ORDER BY created_at,id', [t.id]),
  ]);
  return c.json({
    invoice_no: t.invoice_no, status: t.status, payment_status: t.payment_status, total: t.total, speed: t.speed,
    est_done: t.est_done, created_at: t.created_at, customer: maskName(t.cname), phone: maskPhone(t.cphone), items, history,
  });
});

export default r;
