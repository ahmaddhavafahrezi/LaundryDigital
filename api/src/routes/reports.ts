import { Hono } from 'hono';
import { q1 } from '../db.js';
import { auth, ownerOnly, type Env } from '../middleware.js';
import { financeSummary } from '../lib/finance.js';
import { getRange } from '../lib/util.js';

const r = new Hono<Env>();
r.use('*', auth, ownerOnly);

r.get('/summary', async (c) => {
  const u = c.get('user');
  const { from, end, to } = getRange(c);
  return c.json(await financeSummary(u.outletId, from, end, to));
});

// Ekspor CSV (bisa dibuka Excel). Memuat periode, ringkasan, tabel, tanggal cetak, dan identitas outlet.
r.get('/export', async (c) => {
  const u = c.get('user');
  const { from, end, to } = getRange(c);
  const [f, outlet] = await Promise.all([financeSummary(u.outletId, from, end, to), q1('SELECT name,address FROM outlets WHERE id=?', [u.outletId])]);
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const line = (...v: any[]) => v.map(esc).join(';');
  const k = f.kpi;
  const rows = [
    line('LAPORAN KEUANGAN', outlet!.name), line('Alamat', outlet!.address), line('Periode', `${from} s/d ${end}`),
    line('Dicetak', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })), line('Dicetak oleh', u.name), '',
    line('RINGKASAN', 'Nilai (Rp)', 'Definisi'),
    line('Omzet', k.omzet, f.definitions.omzet), line('Kas masuk', k.kas_masuk, f.definitions.kas_masuk),
    line('Piutang', k.piutang, f.definitions.piutang), line('Pengeluaran', k.pengeluaran, f.definitions.pengeluaran),
    line('Laba akrual', k.laba_akrual, f.definitions.laba_akrual), line('Arus kas bersih', k.arus_kas_bersih, f.definitions.arus_kas_bersih), '',
    line('Periode', 'Omzet', 'Kas masuk', 'Pengeluaran', 'Laba akrual', 'Arus kas bersih'),
    ...f.series.map((s) => line(s.date, s.omzet, s.kas_masuk, s.pengeluaran, s.laba_akrual, s.arus_kas_bersih)), '',
    line('Pengeluaran per kategori', 'Nilai (Rp)'), ...f.byCategory.map((x: any) => line(x.name, x.value)),
  ];
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="laporan-${from}_${end}.csv"`);
  return c.body('\uFEFF' + rows.join('\r\n'));
});

export default r;
