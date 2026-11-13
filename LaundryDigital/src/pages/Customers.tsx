import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, Pencil, Search, Trash2, UserPlus } from 'lucide-react';
import { api, qs } from '../lib/api';
import { fmtDate, fmtDateTime, rp } from '../lib/format';
import { Empty, ErrorBox, Loading, Modal, PageHeader, Pager, PayBadge, StatusBadge } from '../components/ui';
import { CustomerModal } from './NewOrder';

export default function Customers() {
  const qc = useQueryClient();
  const [q, setQ] = useState(''); const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ open: boolean; edit?: any }>({ open: false });
  const [detail, setDetail] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<any | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ['customers', q, page], queryFn: () => api<any>('/customers' + qs({ q, page })) });
  const det = useQuery({ queryKey: ['customer', detail], enabled: !!detail, queryFn: () => api<any>(`/customers/${detail}`) });

  const del = useMutation({
    mutationFn: (id: number) => api<any>(`/customers/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setToDelete(null); },
  });
  const closeDelete = () => { setToDelete(null); del.reset(); };

  return (
    <>
      <PageHeader title="Pelanggan" sub="Data pelanggan dan riwayat order." actions={<button className="btn-primary" onClick={() => setForm({ open: true })}><UserPlus className="h-5 w-5" />Tambah pelanggan</button>} />
      <div className="relative mb-4"><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" /><input className="input pl-10" placeholder="Cari nama atau nomor telepon" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Cari pelanggan" /></div>
      {error && <ErrorBox error={error} />}
      <div className="card overflow-hidden">
        {isLoading ? <Loading /> : !data?.data.length ? <Empty title="Belum ada pelanggan" hint="Tambahkan pelanggan pertama Anda." /> : (
          <ul className="divide-y divide-slate-100">{data.data.map((c: any) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3.5">
              <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setDetail(c.id)}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 font-bold text-white">{c.name[0]}</span>
                <span className="min-w-0"><span className="flex items-center gap-1.5 font-semibold">{c.name}{!!c.is_member && <Crown className="h-4 w-4 text-lemon-500" aria-label="Member" />}</span><span className="block truncate text-sm text-slate-500">{c.phone}</span></span></button>
              <div className="hidden text-right text-sm sm:block"><p className="font-semibold">{rp(c.total_spent)}</p><p className="text-slate-500">{c.order_count} order</p></div>
              <button className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-brand-50" onClick={() => setForm({ open: true, edit: c })} aria-label="Ubah"><Pencil className="h-4 w-4" /></button>
              <button className="grid h-11 w-11 place-items-center rounded-xl text-red-500 hover:bg-red-50" onClick={() => setToDelete(c)} aria-label="Hapus"><Trash2 className="h-4 w-4" /></button>
            </li>))}</ul>)}
        {data && <Pager page={page} total={data.total} size={data.size} onPage={setPage} />}
      </div>

      <CustomerModal open={form.open} edit={form.edit} onClose={() => setForm({ open: false })} onSaved={() => setForm({ open: false })} />

      <Modal open={!!toDelete} onClose={closeDelete} title="Hapus pelanggan">
        {toDelete && (
          <div className="space-y-4 text-sm">
            <p>Hapus pelanggan <b>{toDelete.name}</b> ({toDelete.phone})? Tindakan ini tidak bisa dibatalkan.</p>
            {toDelete.order_count > 0 && <p className="text-slate-500">Pelanggan ini punya {toDelete.order_count} riwayat order, sehingga server akan menolak penghapusan.</p>}
            {del.error && <ErrorBox error={del.error} />}
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={closeDelete}>Batal</button>
              <button className="btn-primary !bg-red-600 hover:!bg-red-700" disabled={del.isPending} onClick={() => del.mutate(toDelete.id)}>{del.isPending ? 'Menghapus…' : 'Hapus'}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={det.data?.name || 'Pelanggan'} wide>
        {det.isLoading ? <Loading /> : det.data && (
          <div className="space-y-4 text-sm"><div className="grid grid-cols-2 gap-3"><div><p className="text-slate-500">Telepon</p><p className="font-semibold">{det.data.phone}</p></div><div><p className="text-slate-500">Terdaftar</p><p className="font-semibold">{fmtDate(det.data.created_at)}</p></div></div>
            <h4 className="font-bold">Riwayat order</h4>
            <ul className="divide-y divide-slate-100">{det.data.orders.map((o: any) => <li key={o.id}><Link to={`/app/transaksi/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5"><span><b>{o.invoice_no}</b><span className="block text-xs text-slate-500">{fmtDateTime(o.created_at)}</span></span><span className="flex items-center gap-2"><StatusBadge s={o.status} /><PayBadge s={o.payment_status} /><b>{rp(o.total)}</b></span></Link></li>)}{!det.data.orders.length && <li className="py-4 text-slate-500">Belum ada order.</li>}</ul></div>)}
      </Modal>
    </>
  );
}