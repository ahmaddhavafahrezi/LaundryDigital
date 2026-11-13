import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, Info, Plus } from 'lucide-react';
import { api, qs } from '../lib/api';
import { fmtDate, rp, rpShort, todayWib } from '../lib/format';
import { Empty, ErrorBox, Field, Loading, Modal, PageHeader, Pager, PayBadge, Stat, Tabs, useToast } from '../components/ui';
import { RangePicker } from './Dashboard';

export default function Finance() {
  const [tab, setTab] = useState('laporan');
  return (
    <>
      <PageHeader title="Keuangan" sub="Omzet, kas, piutang, pengeluaran, dan laba — dengan definisi yang jelas." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'laporan', label: 'Laporan' }, { id: 'pengeluaran', label: 'Pengeluaran' }, { id: 'piutang', label: 'Piutang' }]} />
      {tab === 'laporan' ? <Report /> : tab === 'pengeluaran' ? <Expenses /> : <Receivables />}
    </>
  );
}

function Report() {
  const [range, setRange] = useState('bulan_ini'); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const ok = range !== 'custom' || (from && to);
  const { data: d, isLoading, error } = useQuery({ queryKey: ['report', range, from, to], enabled: !!ok, queryFn: () => api<any>('/reports/summary' + qs({ range, from, to })) });
  const k = d?.kpi;
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3"><RangePicker {...{ range, setRange, from, setFrom, to, setTo }} />
        {ok && <a className="btn-ghost" href={`/api/v1/reports/export${qs({ range, from, to })}`}><Download className="h-4 w-4" />Unduh Excel (CSV)</a>}</div>
      {error && <ErrorBox error={error} />}{isLoading && <Loading />}
      {d && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Stat label="Omzet" value={rp(k.omzet)} icon={<span className="font-bold">Σ</span>} /><Stat label="Kas masuk" value={rp(k.kas_masuk)} icon={<span className="font-bold">+</span>} tone="green" /><Stat label="Piutang" value={rp(k.piutang)} icon={<span className="font-bold">!</span>} tone="rose" />
            <Stat label="Pengeluaran" value={rp(k.pengeluaran)} icon={<span className="font-bold">−</span>} tone="amber" /><Stat label="Laba akrual" value={rp(k.laba_akrual)} icon={<span className="font-bold">=</span>} tone="violet" /><Stat label="Arus kas bersih" value={rp(k.arus_kas_bersih)} icon={<span className="font-bold">≈</span>} tone="green" /></div>
          <div className="card p-4 sm:p-5"><h3 className="mb-3 font-bold">Omzet vs kas masuk vs pengeluaran</h3>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={d.series} margin={{ left: -8 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} minTickGap={24} tickFormatter={(s) => (s.length > 7 ? s.slice(8) : s)} /><YAxis tickFormatter={rpShort} fontSize={12} tickLine={false} axisLine={false} width={54} /><Tooltip formatter={(v: any) => rp(v)} /><Legend />
              <Bar dataKey="omzet" name="Omzet" fill="#1488d8" radius={[4, 4, 0, 0]} /><Bar dataKey="kas_masuk" name="Kas masuk" fill="#10b981" radius={[4, 4, 0, 0]} /><Bar dataKey="pengeluaran" name="Pengeluaran" fill="#fbc41f" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
          <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead className="bg-foam text-left text-slate-500"><tr>{['Periode', 'Omzet', 'Kas masuk', 'Pengeluaran', 'Laba akrual', 'Arus kas'].map((h, i) => <th key={h} className={`px-4 py-3 font-semibold ${i ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{d.series.map((s: any) => <tr key={s.date}><td className="px-4 py-2.5">{s.date}</td><td className="px-4 py-2.5 text-right">{rp(s.omzet)}</td><td className="px-4 py-2.5 text-right">{rp(s.kas_masuk)}</td><td className="px-4 py-2.5 text-right">{rp(s.pengeluaran)}</td><td className="px-4 py-2.5 text-right font-medium">{rp(s.laba_akrual)}</td><td className="px-4 py-2.5 text-right font-medium">{rp(s.arus_kas_bersih)}</td></tr>)}</tbody></table></div></div>
          <div className="card p-4 sm:p-5"><h3 className="mb-3 flex items-center gap-2 font-bold"><Info className="h-5 w-5 text-brand-600" />Definisi rumus</h3>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">{Object.entries(d.definitions).map(([k2, v]: any) => <div key={k2}><dt className="font-semibold capitalize">{k2.replace(/_/g, ' ')}</dt><dd className="text-slate-600">{v}</dd></div>)}</dl></div>
        </div>
      )}
    </>
  );
}

function Expenses() {
  const toast = useToast(); const qc = useQueryClient();
  const [page, setPage] = useState(1); const [cat, setCat] = useState('');
  const [form, setForm] = useState<any>(null);
  const cats = useQuery({ queryKey: ['exp-cats'], queryFn: () => api<string[]>('/expenses/categories') });
  const { data, isLoading, error } = useQuery({ queryKey: ['expenses', page, cat], queryFn: () => api<any>('/expenses' + qs({ page, category: cat })) });
  const save = useMutation({
    mutationFn: () => api(form.id ? `/expenses/${form.id}` : '/expenses', { method: form.id ? 'PATCH' : 'POST', body: { spent_on: form.spent_on, category: form.category, description: form.description || '', amount: +form.amount, method: form.method } }),
    onSuccess: () => { toast('Pengeluaran disimpan'); qc.invalidateQueries(); setForm(null); }, onError: (e: any) => toast(e.message, false),
  });
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <select className="input !w-auto" value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }} aria-label="Kategori"><option value="">Semua kategori</option>{cats.data?.map((c) => <option key={c}>{c}</option>)}</select>
        <button className="btn-primary" onClick={() => setForm({ spent_on: todayWib(), category: 'Deterjen', description: '', amount: '', method: 'tunai' })}><Plus className="h-5 w-5" />Catat pengeluaran</button></div>
      {error && <ErrorBox error={error} />}
      <div className="card overflow-hidden">
        {isLoading ? <Loading /> : !data?.data.length ? <Empty title="Belum ada pengeluaran" hint="Catat biaya listrik, bahan, gaji, dan lainnya." /> : (
          <>
            <div className="border-b border-slate-100 bg-foam px-4 py-3 text-sm">Total terfilter: <b>{rp(data.sum)}</b></div>
            <ul className="divide-y divide-slate-100">{data.data.map((e: any) => (
              <li key={e.id}><button className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-foam" onClick={() => setForm({ ...e })}>
                <span><span className="font-semibold">{e.category}</span><span className="block text-sm text-slate-500">{e.description || '-'} · {fmtDate(e.spent_on + 'T00:00:00+07:00')}</span></span><span className="font-display font-bold">{rp(e.amount)}</span></button></li>))}</ul>
          </>)}
        {data && <Pager page={page} total={data.total} size={data.size} onPage={setPage} />}
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Ubah pengeluaran' : 'Catat pengeluaran'}>
        {form && <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3"><Field label="Tanggal"><input type="date" className="input" value={form.spent_on} onChange={(e) => setForm({ ...form, spent_on: e.target.value })} /></Field>
            <Field label="Kategori"><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{cats.data?.map((c) => <option key={c}>{c}</option>)}</select></Field></div>
          <Field label="Deskripsi"><input className="input" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Nominal (Rp)"><input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Metode"><select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}><option value="tunai">Tunai</option><option value="transfer">Transfer</option><option value="qris">QRIS</option></select></Field></div>
          <button className="btn-primary w-full" disabled={save.isPending || !(+form.amount > 0)} onClick={() => save.mutate()}>Simpan pengeluaran</button></div>}
      </Modal>
    </>
  );
}

function Receivables() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({ queryKey: ['piutang', page], queryFn: () => api<any>('/transactions' + qs({ outstanding: 1, page })) });
  return (
    <div className="card overflow-hidden">
      {error ? <ErrorBox error={error} /> : isLoading ? <Loading /> : !data?.data.length ? <Empty title="Tidak ada piutang" hint="Semua order sudah lunas." /> : (
        <ul className="divide-y divide-slate-100">{data.data.map((o: any) => (
          <li key={o.id}><Link to={`/app/transaksi/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 hover:bg-foam"><span><b>{o.invoice_no}</b><span className="block text-sm text-slate-500">{o.customer_name} · {o.customer_phone}</span></span>
            <span className="flex items-center gap-3"><PayBadge s={o.payment_status} /><span className="text-right"><span className="block font-display font-bold text-rose-600">{rp(o.total - o.paid_amount)}</span><span className="text-xs text-slate-500">dari {rp(o.total)}</span></span></span></Link></li>))}</ul>)}
      {data && <Pager page={page} total={data.total} size={data.size} onPage={setPage} />}
    </div>
  );
}
