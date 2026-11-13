import { Hono } from 'hono';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { exec, q, q1, tx } from '../db.js';
import { auth, type Env } from '../middleware.js';
import { SKIPPABLE, STATUS_ORDER, body, fail, paymentStatus, rupiah } from '../lib/util.js';
import { log } from '../lib/audit.js';
import { clientIp } from '../lib/rateLimit.js';

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rand = (n: number) => Array.from(randomBytes(n), (b) => ALPHA[b % ALPHA.length]).join('');
const ymd = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(2, 10).replace(/-/g, '');

const createSchema = z.object({
  customer_id: z.number().int().positive(),
  speed: z.enum(['reguler', 'express', 'kilat']).default('reguler'),
  items: z.array(z.object({ service_id: z.number().int().positive(), qty: z.number().positive().max(9999) })).min(1, 'pilih minimal satu layanan'),
  extra_fee: z.number().min(0).max(100_000_000).default(0),
  discount: z.number().min(0).max(100_000_000).default(0),
  notes: z.string().max(500).optional().default(''),
  pay: z.object({ amount: z.number().positive(), method: z.enum(['tunai', 'transfer', 'qris']), reference: z.string().max(80).optional() }).optional(),
});

const r = new Hono<Env>();
r.use('*', auth);

r.get('/', async (c) => {
  const u = c.get('user');
  const { q: search = '', status = '', payment_status = '', outstanding = '', from = '', to = '' } = c.req.query();
  const page = Math.max(1, +(c.req.query('page') || 1)), size = Math.min(100, +(c.req.query('size') || 20));
  const w: string[] = ['t.outlet_id=?'], p: any[] = [u.outletId];
  if (search) { w.push('(t.invoice_no LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)'); p.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (status === 'aktif') w.push("t.status NOT IN ('sudah_diambil','dibatalkan')");
  else if (status) { w.push('t.status=?'); p.push(status); }
  if (payment_status) { w.push('t.payment_status=?'); p.push(payment_status); }
  if (outstanding === '1') w.push("t.payment_status<>'lunas' AND t.status<>'dibatalkan'");
  if (from) { w.push('t.created_at>=?'); p.push(`${from} 00:00:00`); }
  if (to) { w.push('t.created_at<?'); p.push(`${to} 23:59:59`); }
  const where = w.join(' AND ');
  const rows = await q(
    `SELECT t.id,t.invoice_no,t.total,t.paid_amount,t.status,t.payment_status,t.speed,t.est_done,t.created_at,c.name customer_name,c.phone customer_phone
     FROM transactions t JOIN customers c ON c.id=t.customer_id WHERE ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`, [...p, size, (page - 1) * size]);
  const total = (await q1(`SELECT COUNT(*) n FROM transactions t JOIN customers c ON c.id=t.customer_id WHERE ${where}`, p))!.n;
  return c.json({ data: rows, total, page, size });
});

r.get('/:id', async (c) => {
  const u = c.get('user');
  const t = await q1(
    `SELECT t.*, c.name customer_name, c.phone customer_phone, c.address customer_address, us.name received_name
     FROM transactions t JOIN customers c ON c.id=t.customer_id JOIN users us ON us.id=t.received_by WHERE t.id=? AND t.outlet_id=?`, [c.req.param('id'), u.outletId]);
  if (!t) throw fail(404, 'Transaksi tidak ditemukan');
  const [items, payments, history, outlet] = await Promise.all([
    q('SELECT * FROM transaction_items WHERE transaction_id=? ORDER BY id', [t.id]),
    q('SELECT p.*, us.name user_name FROM payments p LEFT JOIN users us ON us.id=p.user_id WHERE transaction_id=? ORDER BY p.created_at, p.id', [t.id]),
    q('SELECT h.*, us.name user_name FROM status_histories h LEFT JOIN users us ON us.id=h.user_id WHERE transaction_id=? ORDER BY h.created_at, h.id', [t.id]),
    q1('SELECT name,address,phone FROM outlets WHERE id=?', [u.outletId]),
  ]);
  return c.json({ ...t, items, payments, history, outlet });
});

r.post('/', async (c) => {
  const u = c.get('user');
  const d = await body(c, createSchema);
  if (d.discount > 0 && u.role !== 'owner' && !u.canDiscount) throw fail(403, 'Anda tidak memiliki izin memberi diskon');
  if (d.pay && u.role !== 'owner' && !u.canPayment) throw fail(403, 'Anda tidak memiliki izin mencatat pembayaran');

  const customer = await q1('SELECT id FROM customers WHERE id=? AND outlet_id=?', [d.customer_id, u.outletId]);
  if (!customer) throw fail(422, 'Pelanggan tidak ditemukan');
  const outlet = (await q1('SELECT * FROM outlets WHERE id=?', [u.outletId]))!;
  const ids = [...new Set(d.items.map((i) => i.service_id))];
  const services = await q('SELECT * FROM services WHERE id IN (?) AND outlet_id=? AND is_active=1', [ids, u.outletId]);
  if (services.length !== ids.length) throw fail(422, 'Ada layanan yang tidak tersedia');

  // Harga & total SELALU dihitung ulang di backend
  const lines = d.items.map((i) => {
    const s = services.find((x) => x.id === i.service_id)!;
    const qty = Math.round(i.qty * 100) / 100;
    if (s.category === 'kiloan' && qty < 1) throw fail(422, `Berat minimum ${s.name} adalah 1 kg`);
    if (s.category !== 'kiloan' && !Number.isInteger(qty)) throw fail(422, `Jumlah ${s.name} harus bilangan bulat`);
    return { s, qty, subtotal: rupiah(s.price * qty) };
  });
  const subtotal = lines.reduce((a, l) => a + l.subtotal, 0);
  const pct = d.speed === 'express' ? outlet.express_pct : d.speed === 'kilat' ? outlet.kilat_pct : 0;
  const speedFee = rupiah((subtotal * pct) / 100);
  if (d.discount > subtotal + speedFee + d.extra_fee) throw fail(422, 'Diskon melebihi total tagihan');
  const total = subtotal + speedFee + d.extra_fee - d.discount;
  if (d.pay && d.pay.amount > total) throw fail(422, 'Pembayaran melebihi total tagihan');
  const baseHours = Math.max(...lines.map((l) => l.s.est_hours));
  const hours = d.speed === 'express' ? Math.min(outlet.express_hours, baseHours) : d.speed === 'kilat' ? Math.min(outlet.kilat_hours, baseHours) : baseHours;
  const paid = d.pay?.amount ?? 0;

  const result = await tx(async (conn) => {
    let id = 0, invoice = '', token = '';
    for (let attempt = 0; attempt < 6 && !id; attempt++) {
      invoice = `LDY-${ymd()}-${rand(4)}`; token = randomBytes(9).toString('base64url');
      try {
        const res = await exec(
          `INSERT INTO transactions (outlet_id,invoice_no,tracking_token,customer_id,received_by,speed,subtotal,speed_fee,extra_fee,discount,total,paid_amount,payment_status,status,est_done,notes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'diterima',DATE_ADD(NOW(), INTERVAL ? HOUR),?)`,
          [u.outletId, invoice, token, d.customer_id, u.id, d.speed, subtotal, speedFee, d.extra_fee, d.discount, total, paid, paymentStatus(total, paid), hours, d.notes], conn);
        id = res.insertId;
      } catch (e: any) { if (e.code !== 'ER_DUP_ENTRY') throw e; }
    }
    if (!id) throw fail(409, 'Gagal membuat nomor nota, coba lagi');
    for (const l of lines)
      await exec('INSERT INTO transaction_items (transaction_id,service_id,service_name,category,unit,qty,price,subtotal) VALUES (?,?,?,?,?,?,?,?)',
        [id, l.s.id, l.s.name, l.s.category, l.s.unit, l.qty, l.s.price, l.subtotal], conn);
    await exec("INSERT INTO status_histories (transaction_id,from_status,to_status,user_id,note) VALUES (?,NULL,'diterima',?,'Order dibuat')", [id, u.id], conn);
    if (d.pay) await exec('INSERT INTO payments (outlet_id,transaction_id,amount,method,reference,user_id) VALUES (?,?,?,?,?,?)', [u.outletId, id, d.pay.amount, d.pay.method, d.pay.reference ?? null, u.id], conn);
    await log(conn, u.outletId, u, 'create', 'transaction', id, `Membuat order ${invoice} total Rp${total}${paid ? `, dibayar Rp${paid}` : ''}`, clientIp(c));
    return { id, invoice_no: invoice, total };
  });
  return c.json(result, 201);
});

r.post('/:id/status', async (c) => {
  const u = c.get('user');
  const { status, note } = await body(c, z.object({ status: z.enum(STATUS_ORDER), note: z.string().max(255).optional() }));
  const t = await q1('SELECT * FROM transactions WHERE id=? AND outlet_id=?', [c.req.param('id'), u.outletId]);
  if (!t) throw fail(404, 'Transaksi tidak ditemukan');
  if (t.status === 'dibatalkan' || t.status === 'sudah_diambil') throw fail(409, 'Status order ini sudah final');
  const from = STATUS_ORDER.indexOf(t.status), to = STATUS_ORDER.indexOf(status);
  if (to <= from) throw fail(422, 'Status tidak boleh mundur');
  for (let i = from + 1; i < to; i++) if (!SKIPPABLE.has(STATUS_ORDER[i])) throw fail(422, `Selesaikan tahap "${STATUS_ORDER[i].replace(/_/g, ' ')}" terlebih dahulu`);
  if (status === 'sudah_diambil' && t.payment_status !== 'lunas') throw fail(409, 'Lunasi tagihan sebelum cucian diserahkan');
  await tx(async (conn) => {
    await exec('UPDATE transactions SET status=? WHERE id=?', [status, t.id], conn);
    await exec('INSERT INTO status_histories (transaction_id,from_status,to_status,user_id,note) VALUES (?,?,?,?,?)', [t.id, t.status, status, u.id, note ?? null], conn);
    await log(conn, u.outletId, u, 'status', 'transaction', t.id, `${t.invoice_no}: ${t.status} → ${status}`, clientIp(c));
  });
  return c.json({ ok: true });
});

r.post('/:id/payments', async (c) => {
  const u = c.get('user');
  if (u.role !== 'owner' && !u.canPayment) throw fail(403, 'Anda tidak memiliki izin mencatat pembayaran');
  const d = await body(c, z.object({ amount: z.number().positive(), method: z.enum(['tunai', 'transfer', 'qris']), reference: z.string().max(80).optional() }));
  await tx(async (conn) => {
    const [t] = await q('SELECT * FROM transactions WHERE id=? AND outlet_id=? FOR UPDATE', [c.req.param('id'), u.outletId], conn);
    if (!t) throw fail(404, 'Transaksi tidak ditemukan');
    if (t.status === 'dibatalkan') throw fail(409, 'Order sudah dibatalkan');
    const remaining = t.total - t.paid_amount;
    if (d.amount > remaining) throw fail(422, `Pembayaran melebihi sisa tagihan (Rp${remaining})`);
    await exec('INSERT INTO payments (outlet_id,transaction_id,amount,method,reference,user_id) VALUES (?,?,?,?,?,?)', [u.outletId, t.id, d.amount, d.method, d.reference ?? null, u.id], conn);
    const paid = t.paid_amount + d.amount;
    await exec('UPDATE transactions SET paid_amount=?, payment_status=? WHERE id=?', [paid, paymentStatus(t.total, paid), t.id], conn);
    await log(conn, u.outletId, u, 'payment', 'transaction', t.id, `${t.invoice_no}: pembayaran Rp${d.amount} (${d.method})`, clientIp(c));
  });
  return c.json({ ok: true }, 201);
});

// Koreksi berat/jumlah setelah tersimpan — wajib alasan, tercatat di audit log
r.patch('/:id/items/:itemId', async (c) => {
  const u = c.get('user');
  if (u.role !== 'owner' && !u.canCorrect) throw fail(403, 'Anda tidak memiliki izin koreksi transaksi');
  const d = await body(c, z.object({ qty: z.number().positive().max(9999), reason: z.string().trim().min(5, 'alasan minimal 5 karakter').max(255) }));
  await tx(async (conn) => {
    const [t] = await q('SELECT * FROM transactions WHERE id=? AND outlet_id=? FOR UPDATE', [c.req.param('id'), u.outletId], conn);
    if (!t) throw fail(404, 'Transaksi tidak ditemukan');
    if (['dibatalkan', 'sudah_diambil'].includes(t.status)) throw fail(409, 'Order sudah final, tidak dapat dikoreksi');
    const [it] = await q('SELECT * FROM transaction_items WHERE id=? AND transaction_id=?', [c.req.param('itemId'), t.id], conn);
    if (!it) throw fail(404, 'Item tidak ditemukan');
    const qty = Math.round(d.qty * 100) / 100;
    if (it.category !== 'kiloan' && !Number.isInteger(qty)) throw fail(422, 'Jumlah harus bilangan bulat');
    await exec('UPDATE transaction_items SET qty=?, subtotal=? WHERE id=?', [qty, rupiah(it.price * qty), it.id], conn);
    const [{ s }] = await q('SELECT SUM(subtotal) s FROM transaction_items WHERE transaction_id=?', [t.id], conn);
    const o = (await q1('SELECT express_pct, kilat_pct FROM outlets WHERE id=?', [u.outletId], conn))!;
    const speedFee = rupiah((s * (t.speed === 'express' ? o.express_pct : t.speed === 'kilat' ? o.kilat_pct : 0)) / 100);
    const total = Math.max(0, s + speedFee + t.extra_fee - t.discount);
    if (total < t.paid_amount) throw fail(422, 'Total baru lebih kecil dari yang sudah dibayar. Lakukan refund/pembatalan.');
    await exec('UPDATE transactions SET subtotal=?, speed_fee=?, total=?, payment_status=? WHERE id=?', [s, speedFee, total, paymentStatus(total, t.paid_amount), t.id], conn);
    await log(conn, u.outletId, u, 'correct', 'transaction', t.id, `${t.invoice_no}: ${it.service_name} ${it.qty} → ${qty} ${it.unit}. Alasan: ${d.reason}`, clientIp(c));
  });
  return c.json({ ok: true });
});

r.post('/:id/cancel', async (c) => {
  const u = c.get('user');
  if (u.role !== 'owner' && !u.canCorrect) throw fail(403, 'Anda tidak memiliki izin membatalkan transaksi');
  const { reason } = await body(c, z.object({ reason: z.string().trim().min(5, 'alasan minimal 5 karakter').max(255) }));
  await tx(async (conn) => {
    const [t] = await q('SELECT * FROM transactions WHERE id=? AND outlet_id=? FOR UPDATE', [c.req.param('id'), u.outletId], conn);
    if (!t) throw fail(404, 'Transaksi tidak ditemukan');
    if (['dibatalkan', 'sudah_diambil'].includes(t.status)) throw fail(409, 'Order tidak dapat dibatalkan');
    if (t.paid_amount > 0)
      await exec("INSERT INTO payments (outlet_id,transaction_id,kind,amount,method,reference,user_id) VALUES (?,?,'refund',?,'tunai','Refund pembatalan',?)", [u.outletId, t.id, -t.paid_amount, u.id], conn);
    await exec("UPDATE transactions SET status='dibatalkan', cancel_reason=?, paid_amount=0, payment_status='belum_lunas' WHERE id=?", [reason, t.id], conn);
    await exec("INSERT INTO status_histories (transaction_id,from_status,to_status,user_id,note) VALUES (?,?,'dibatalkan',?,?)", [t.id, t.status, u.id, reason], conn);
    await log(conn, u.outletId, u, 'cancel', 'transaction', t.id, `${t.invoice_no} dibatalkan${t.paid_amount ? `, refund Rp${t.paid_amount}` : ''}. Alasan: ${reason}`, clientIp(c));
  });
  return c.json({ ok: true });
});

export default r;
