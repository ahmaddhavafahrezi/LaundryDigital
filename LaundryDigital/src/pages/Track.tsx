import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Check, Search, WashingMachine } from 'lucide-react';
import { api } from '../lib/api';
import { fmtDateTime, rp, STATUS, STATUS_FLOW } from '../lib/format';
import { Loading, PayBadge, StatusBadge } from '../components/ui';

export default function Track() {
  const { code } = useParams();
  const nav = useNavigate();
  const [input, setInput] = useState(code || '');
  const res = useQuery({ queryKey: ['track', code], enabled: !!code, queryFn: () => api<any>('/public/tracking/lookup', { method: 'POST', body: { code } }) });
  const submit = (e: FormEvent) => { e.preventDefault(); if (input.trim()) nav('/cek/' + encodeURIComponent(input.trim())); };
  const t = res.data;
  const reached = new Set((t?.history || []).map((h: any) => h.to_status));
  const flow = t?.status === 'dibatalkan' ? ['diterima', 'dibatalkan'] : STATUS_FLOW;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-950 via-brand-900 to-foam pb-16">
      <div className="mx-auto max-w-xl px-4 pt-6">
        <Link to="/" className="inline-flex items-center gap-2 text-white"><span className="grid h-9 w-9 place-items-center rounded-lg bg-lemon-400 text-brand-950"><WashingMachine className="h-5 w-5" /></span><span className="font-display font-bold">Laundry Digital</span></Link>
        <h1 className="mt-8 text-4xl font-extrabold text-white">Cek status cucian</h1>
        <p className="mt-2 text-brand-200">Masukkan nomor nota atau kode pada struk Anda.</p>
        <form onSubmit={submit} className="mt-5 flex gap-2">
          <input className="input !bg-white !py-3.5" placeholder="Contoh: LDY-261113-AB7K" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Kode nota" />
          <button className="btn-primary !bg-lemon-400 !text-brand-950 hover:!bg-lemon-300"><Search className="h-5 w-5" /><span className="hidden sm:inline">Cek</span></button>
        </form>

        {code && res.isLoading && <Loading />}
        {res.error && <div className="mt-5 rounded-2xl bg-white p-5 text-sm text-rose-700 shadow-soft" role="alert">{(res.error as Error).message}</div>}
        {t && (
          <div className="card mt-5 overflow-hidden">
            <div className="border-b border-dashed border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">Nomor nota</p><p className="font-display text-xl font-extrabold">{t.invoice_no}</p></div><StatusBadge s={t.status} /></div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-500">Pelanggan</p><p className="font-semibold">{t.customer}</p></div>
                <div><p className="text-slate-500">Kontak</p><p className="font-semibold">{t.phone}</p></div>
                <div><p className="text-slate-500">Masuk</p><p className="font-semibold">{fmtDateTime(t.created_at)}</p></div>
                <div><p className="text-slate-500">Estimasi selesai</p><p className="font-semibold">{fmtDateTime(t.est_done)}</p></div>
              </div>
            </div>
            <div className="p-5">
              <ol className="space-y-0">
                {flow.map((s, i) => {
                  const done = reached.has(s); const hist = t.history.find((h: any) => h.to_status === s);
                  return (
                    <li key={s} className="flex gap-3">
                      <div className="flex flex-col items-center"><span className={clsx('grid h-7 w-7 place-items-center rounded-full border-2 text-xs', done ? (s === 'dibatalkan' ? 'border-rose-500 bg-rose-500 text-white' : 'border-brand-600 bg-brand-600 text-white') : 'border-slate-200 bg-white text-slate-300')}>{done ? <Check className="h-4 w-4" /> : ''}</span>
                        {i < flow.length - 1 && <span className={clsx('w-0.5 flex-1', done ? 'bg-brand-300' : 'bg-slate-200')} style={{ minHeight: 22 }} />}</div>
                      <div className="pb-4"><p className={clsx('text-sm font-semibold', done ? '' : 'text-slate-400')}>{STATUS[s].label}</p>{hist && <p className="text-xs text-slate-500">{fmtDateTime(hist.created_at)}</p>}</div>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-2 rounded-xl bg-foam p-4 text-sm">
                {t.items.map((it: any, i: number) => <div key={i} className="flex justify-between py-0.5"><span>{it.service_name}</span><span className="text-slate-500">{it.qty} {it.unit}</span></div>)}
                <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2"><span className="font-semibold">Total tagihan</span><span className="font-display text-lg font-extrabold">{rp(t.total)}</span></div>
                <div className="mt-1 flex justify-end"><PayBadge s={t.payment_status} /></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
