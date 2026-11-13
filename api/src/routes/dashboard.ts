import { Hono } from 'hono';
import { q, q1 } from '../db.js';
import { auth, ownerOnly, type Env } from '../middleware.js';
import { financeSummary } from '../lib/finance.js';
import { getRange, wibDate } from '../lib/util.js';

const r = new Hono<Env>();
r.use('*', auth);

r.get('/owner', ownerOnly, async (c) => {
  const u = c.get('user');
  const { from, end, to } = getRange(c);
  const [fin, status, recent, lateCount] = await Promise.all([
    financeSummary(u.outletId, from, end, to),
    q("SELECT status name, COUNT(*) value FROM transactions WHERE outlet_id=? AND created_at>=? AND created_at<? GROUP BY status", [u.outletId, `${from} 00:00:00`, `${to} 00:00:00`]),
    q('SELECT id, user_name, action, summary, created_at FROM activity_logs WHERE outlet_id=? ORDER BY id DESC LIMIT 8', [u.outletId]),
    q1("SELECT COUNT(*) n FROM transactions WHERE outlet_id=? AND est_done<NOW() AND status NOT IN ('siap_diambil','sudah_diambil','dibatalkan')", [u.outletId]),
  ]);
  return c.json({ ...fin, byStatus: status, recent, late: lateCount!.n });
});

r.get('/employee', async (c) => {
  const u = c.get('user');
  const today = wibDate();
  const [counts, today_n, queue] = await Promise.all([
    q("SELECT status name, COUNT(*) value FROM transactions WHERE outlet_id=? AND status NOT IN ('sudah_diambil','dibatalkan') GROUP BY status", [u.outletId]),
    q1('SELECT COUNT(*) n FROM transactions WHERE outlet_id=? AND created_at>=? AND status<>"dibatalkan"', [u.outletId, `${today} 00:00:00`]),
    q(`SELECT t.id, t.invoice_no, t.status, t.payment_status, t.est_done, t.speed, c.name customer_name, (t.est_done<NOW()) late
       FROM transactions t JOIN customers c ON c.id=t.customer_id
       WHERE t.outlet_id=? AND t.status NOT IN ('sudah_diambil','dibatalkan') ORDER BY late DESC, t.est_done LIMIT 12`, [u.outletId]),
  ]);
  const by = Object.fromEntries(counts.map((x: any) => [x.name, x.value]));
  const proses = ['menunggu_antrean', 'sedang_dicuci', 'pengeringan', 'penyetrikaan', 'pengemasan'].reduce((a, k) => a + (by[k] || 0), 0);
  const late = queue.filter((x: any) => x.late).length;
  return c.json({ order_hari_ini: today_n!.n, baru: by.diterima || 0, diproses: proses, siap_diambil: by.siap_diambil || 0, terlambat: late, queue });
});

export default r;
