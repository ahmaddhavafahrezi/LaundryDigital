import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { HTTPException } from 'hono/http-exception';
import { config } from './config.js';
import authR from './routes/auth.js';
import customers from './routes/customers.js';
import services from './routes/services.js';
import transactions from './routes/transactions.js';
import expenses from './routes/expenses.js';
import dashboard from './routes/dashboard.js';
import reports from './routes/reports.js';
import employees from './routes/employees.js';
import publicR from './routes/public.js';
import activity from './routes/activity.js';

export const app = new Hono();

app.use('*', secureHeaders());
app.use('/api/*', cors({ origin: config.corsOrigins, credentials: true }));

app.get('/api/v1/health', (c) => c.json({ ok: true }));
app.route('/api/v1/auth', authR);
app.route('/api/v1/customers', customers);
app.route('/api/v1/services', services);
app.route('/api/v1/transactions', transactions);
app.route('/api/v1/expenses', expenses);
app.route('/api/v1/dashboard', dashboard);
app.route('/api/v1/reports', reports);
app.route('/api/v1/employees', employees);
app.route('/api/v1/public', publicR);
app.route('/api/v1/activity', activity);

app.notFound((c) => c.json({ error: { message: 'Endpoint tidak ditemukan' } }, 404));
app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: { message: err.message } }, err.status);
  console.error(err); // detail hanya di log server, tidak dikirim ke klien
  return c.json({ error: { message: 'Terjadi kesalahan pada server' } }, 500);
});
