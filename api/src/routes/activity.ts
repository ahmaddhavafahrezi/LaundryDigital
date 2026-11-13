import { Hono } from 'hono';
import { q, q1 } from '../db.js';
import { auth, ownerOnly, type Env } from '../middleware.js';

const r = new Hono<Env>();
r.use('*', auth, ownerOnly);

r.get('/', async (c) => {
  const u = c.get('user');
  const page = Math.max(1, +(c.req.query('page') || 1)), size = 30;
  const search = `%${(c.req.query('q') || '').trim()}%`;
  const rows = await q('SELECT * FROM activity_logs WHERE outlet_id=? AND (summary LIKE ? OR user_name LIKE ? OR action LIKE ?) ORDER BY id DESC LIMIT ? OFFSET ?', [u.outletId, search, search, search, size, (page - 1) * size]);
  const total = (await q1('SELECT COUNT(*) n FROM activity_logs WHERE outlet_id=? AND (summary LIKE ? OR user_name LIKE ? OR action LIKE ?)', [u.outletId, search, search, search]))!.n;
  return c.json({ data: rows, total, page, size });
});

export default r;
