import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PackagePlus, Search } from 'lucide-react';
import { api, qs } from '../lib/api';
import { fmtDateTime, rp, STATUS, PAY } from '../lib/format';
import { Empty, ErrorBox, Loading, PageHeader, Pager, PayBadge, StatusBadge } from '../components/ui';

export default function Orders() {
  const [f, setF] = useState({ q: '', status: '', payment_status: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({ queryKey: ['orders', f, page], queryFn: () => api<any>('/transactions' + qs({ ...f, page })) });
  const set = (k: string, v: string) => { setF({ ...f, [k]: v }); setPage(1); };
  return (
    <>
      <PageHeader title="Pesanan" sub="Cari nota, filter status, dan buka detail." actions={<Link to="/app/transaksi/baru" className="btn-primary"><PackagePlus className="h-5 w-5" />Transaksi baru</Link>} />
      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2"><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" /><input className="input pl-10" placeholder="Nomor nota, nama, atau telepon" value={f.q} onChange={(e) => set('q', e.target.value)} aria-label="Cari" /></div>
        <select className="input" value={f.status} onChange={(e) => set('status', e.target.value)} aria-label="Status"><option value="">Semua status</option><option value="aktif">Masih aktif</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <select className="input" value={f.payment_status} onChange={(e) => set('payment_status', e.target.value)} aria-label="Pembayaran"><option value="">Semua pembayaran</option>{Object.entries(PAY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <div className="flex gap-2"><input type="date" className="input" value={f.from} onChange={(e) => set('from', e.target.value)} aria-label="Dari tanggal" /><input type="date" className="input" value={f.to} onChange={(e) => set('to', e.target.value)} aria-label="Sampai tanggal" /></div>
      </div>
      {error && <ErrorBox error={error} />}
      <div className="card overflow-hidden">
        {isLoading ? <Loading /> : !data?.data.length ? <Empty title="Tidak ada pesanan" hint="Ubah filter atau buat transaksi baru." /> : (
          <ul className="divide-y divide-slate-100">
            {data.data.map((o: any) => (
              <li key={o.id}><Link to={`/app/transaksi/${o.id}`} className="grid gap-2 px-4 py-3.5 hover:bg-foam md:grid-cols-[1.3fr_1fr_auto_auto] md:items-center">
                <div><p className="font-semibold">{o.invoice_no}</p><p className="text-sm text-slate-500">{o.customer_name} · {o.customer_phone}</p></div>
                <div className="text-sm text-slate-500">{fmtDateTime(o.created_at)}<br />Est. {fmtDateTime(o.est_done)}</div>
                <div className="flex flex-wrap gap-1.5"><StatusBadge s={o.status} /><PayBadge s={o.payment_status} /></div>
                <p className="font-display text-lg font-bold md:text-right">{rp(o.total)}</p>
              </Link></li>
            ))}
          </ul>
        )}
        {data && <Pager page={page} total={data.total} size={data.size} onPage={setPage} />}
      </div>
    </>
  );
}
