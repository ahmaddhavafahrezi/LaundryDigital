import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, BadgeDollarSign, CheckCircle2, ClipboardList, Clock, PackageCheck, PackagePlus, Search, Shirt, TrendingUp, Wallet } from 'lucide-react';
import { api, qs } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtDateTime, rp, rpShort, STATUS } from '../lib/format';
import { ErrorBox, Loading, PageHeader, Stat, StatusBadge, PayBadge } from '../components/ui';

export const RANGES = [['hari_ini', 'Hari ini'], ['7_hari', '7 hari'], ['bulan_ini', 'Bulan ini'], ['bulan_lalu', 'Bulan lalu'], ['tahun_ini', 'Tahun ini'], ['custom', 'Pilih tanggal']];
const COLORS = ['#1488d8', '#fbc41f', '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4', '#f97316', '#64748b'];

export function RangePicker({ range, setRange, from, setFrom, to, setTo }: any) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-soft">
        {RANGES.map(([k, l]) => <button key={k} onClick={() => setRange(k)} className={`min-h-[40px] whitespace-nowrap rounded-xl px-3.5 text-sm font-semibold ${range === k ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-brand-50'}`}>{l}</button>)}
      </div>
      {range === 'custom' && <div className="flex items-center gap-2"><input type="date" className="input !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dari" /><span className="text-slate-400">–</span><input type="date" className="input !w-auto" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Sampai" /></div>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  return user?.role === 'owner' ? <OwnerDash /> : <EmployeeDash />;
}

function OwnerDash() {
  const [range, setRange] = useState('bulan_ini');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const ok = range !== 'custom' || (from && to);
  const { data, isLoading, error } = useQuery({ queryKey: ['dash-owner', range, from, to], enabled: !!ok, queryFn: () => api<any>('/dashboard/owner' + qs({ range, from, to })) });
  const d = data, k = d?.kpi;
  const tick = (s: string) => (d?.period.bucket === 'bulan' ? s : s.slice(5).split('-').reverse().join('/'));

  return (
    <>
      <PageHeader title="Ringkasan usaha" sub="Semua angka dihitung langsung dari database." />
      <RangePicker {...{ range, setRange, from, setFrom, to, setTo }} />
      {error && <ErrorBox error={error} />}
      {isLoading && <Loading />}
      {d && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Stat label="Omzet (nilai order)" value={rp(k.omzet)} icon={<TrendingUp />} hint={`${k.order_masuk} order masuk`} />
            <Stat label="Kas masuk" value={rp(k.kas_masuk)} icon={<Wallet />} tone="green" hint="Uang yang benar-benar diterima" />
            <Stat label="Piutang" value={rp(k.piutang)} icon={<AlertTriangle />} tone="rose" hint={`${k.piutang_order} order belum lunas`} />
            <Stat label="Pengeluaran" value={rp(k.pengeluaran)} icon={<ArrowDownCircle />} tone="amber" />
            <Stat label="Laba akrual (omzet − biaya)" value={<span className={k.laba_akrual < 0 ? 'text-rose-600' : ''}>{rp(k.laba_akrual)}</span>} icon={<BadgeDollarSign />} tone="violet" />
            <Stat label="Arus kas bersih (kas − biaya)" value={<span className={k.arus_kas_bersih < 0 ? 'text-rose-600' : ''}>{rp(k.arus_kas_bersih)}</span>} icon={<ArrowUpCircle />} tone="green" hint="Bukan laba — lihat definisi di Keuangan" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Order masuk" value={k.order_masuk} icon={<ClipboardList />} /><Stat label="Order selesai" value={k.order_selesai} icon={<CheckCircle2 />} tone="green" />
            <Stat label="Pekerjaan terlambat" value={d.late} icon={<Clock />} tone={d.late ? 'rose' : 'green'} />
          </div>

          <div className="card p-4 sm:p-5">
            <h3 className="mb-1 font-bold">Pendapatan, kas masuk, dan pengeluaran</h3><p className="mb-3 text-xs text-slate-500">Per {d.period.bucket}</p>
            <div className="h-72"><ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.series} margin={{ left: -8, right: 8 }}>
                <defs>{[['o', '#1488d8'], ['k', '#10b981'], ['p', '#fbc41f']].map(([id, c]) => <linearGradient key={id} id={`g${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity={0.35} /><stop offset="100%" stopColor={c} stopOpacity={0} /></linearGradient>)}</defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="date" tickFormatter={tick} fontSize={12} tickLine={false} axisLine={false} minTickGap={24} /><YAxis tickFormatter={rpShort} fontSize={12} tickLine={false} axisLine={false} width={54} />
                <Tooltip formatter={(v: any) => rp(v)} labelFormatter={tick} /><Legend />
                <Area type="monotone" dataKey="omzet" name="Omzet" stroke="#1488d8" strokeWidth={2.5} fill="url(#go)" />
                <Area type="monotone" dataKey="kas_masuk" name="Kas masuk" stroke="#10b981" strokeWidth={2.5} fill="url(#gk)" />
                <Area type="monotone" dataKey="pengeluaran" name="Pengeluaran" stroke="#fbc41f" strokeWidth={2.5} fill="url(#gp)" />
              </AreaChart></ResponsiveContainer></div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card p-4 sm:p-5"><h3 className="mb-3 font-bold">Laba akrual per {d.period.bucket}</h3>
              <div className="h-60"><ResponsiveContainer width="100%" height="100%"><BarChart data={d.series} margin={{ left: -8 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="date" tickFormatter={tick} fontSize={12} tickLine={false} axisLine={false} minTickGap={24} /><YAxis tickFormatter={rpShort} fontSize={12} tickLine={false} axisLine={false} width={54} /><Tooltip formatter={(v: any) => rp(v)} labelFormatter={tick} />
                <Bar dataKey="laba_akrual" name="Laba akrual" radius={[6, 6, 0, 0]}>{d.series.map((s: any, i: number) => <Cell key={i} fill={s.laba_akrual >= 0 ? '#1488d8' : '#f43f5e'} />)}</Bar></BarChart></ResponsiveContainer></div></div>
            <div className="card p-4 sm:p-5"><h3 className="mb-3 font-bold">Pengeluaran per kategori</h3>
              {d.byCategory.length ? <div className="h-60"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={d.byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>{d.byCategory.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: any) => rp(v)} /><Legend /></PieChart></ResponsiveContainer></div> : <p className="py-16 text-center text-sm text-slate-500">Belum ada pengeluaran pada periode ini.</p>}</div>
            <div className="card p-4 sm:p-5"><h3 className="mb-3 font-bold">Penjualan per layanan</h3>
              <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={d.byService} layout="vertical" margin={{ left: 12 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} /><XAxis type="number" tickFormatter={rpShort} fontSize={12} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" width={110} fontSize={12} tickLine={false} axisLine={false} /><Tooltip formatter={(v: any) => rp(v)} /><Bar dataKey="value" name="Nilai" fill="#1488d8" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div></div>
            <div className="card p-4 sm:p-5"><h3 className="mb-3 font-bold">Order per status</h3>
              <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={d.byStatus.map((s: any) => ({ ...s, label: STATUS[s.name]?.label || s.name }))} margin={{ left: -16, bottom: 28 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="label" fontSize={11} interval={0} angle={-30} textAnchor="end" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="value" name="Order" fill="#fbc41f" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
          </div>

          <div className="card p-4 sm:p-5"><h3 className="mb-3 font-bold">Aktivitas terbaru</h3>
            <ul className="divide-y divide-slate-100">{d.recent.map((r: any) => <li key={r.id} className="flex items-start justify-between gap-3 py-2.5 text-sm"><span><b>{r.user_name || 'Sistem'}</b> · {r.summary}</span><span className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(r.created_at)}</span></li>)}</ul></div>
        </div>
      )}
    </>
  );
}

function EmployeeDash() {
  const { data, isLoading, error } = useQuery({ queryKey: ['dash-emp'], queryFn: () => api<any>('/dashboard/employee'), refetchInterval: 30_000 });
  return (
    <>
      <PageHeader title="Pekerjaan hari ini" sub="Daftar yang perlu diproses, diurutkan dari yang paling mendesak." actions={<Link to="/app/transaksi/baru" className="btn-primary"><PackagePlus className="h-5 w-5" />Transaksi baru</Link>} />
      {error && <ErrorBox error={error} />}{isLoading && <Loading />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Order hari ini" value={data.order_hari_ini} icon={<ClipboardList />} /><Stat label="Baru diterima" value={data.baru} icon={<PackagePlus />} tone="amber" />
            <Stat label="Diproses" value={data.diproses} icon={<Shirt />} tone="violet" /><Stat label="Siap diambil" value={data.siap_diambil} icon={<PackageCheck />} tone="green" />
            <Stat label="Terlambat" value={data.terlambat} icon={<AlertTriangle />} tone={data.terlambat ? 'rose' : 'green'} />
          </div>
          <div className="card"><div className="flex items-center justify-between p-4"><h3 className="font-bold">Antrean kerja</h3><Link to="/app/transaksi" className="text-sm font-semibold text-brand-700"><Search className="mr-1 inline h-4 w-4" />Cari nota</Link></div>
            <ul className="divide-y divide-slate-100">
              {data.queue.map((o: any) => (
                <li key={o.id}><Link to={`/app/transaksi/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-foam">
                  <div><p className="font-semibold">{o.invoice_no} <span className="font-normal text-slate-500">· {o.customer_name}</span></p><p className={`text-xs ${o.late ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>{o.late ? 'Terlambat · ' : 'Estimasi '}{fmtDateTime(o.est_done)}{o.speed !== 'reguler' && ` · ${o.speed}`}</p></div>
                  <div className="flex gap-2"><StatusBadge s={o.status} /><PayBadge s={o.payment_status} /></div></Link></li>
              ))}
              {!data.queue.length && <li className="p-10 text-center text-sm text-slate-500">Tidak ada pekerjaan tertunda. Kerja bagus!</li>}
            </ul></div>
        </div>
      )}
    </>
  );
}
