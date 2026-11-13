import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Loader2, Minus, Plus, Search, UserPlus } from 'lucide-react';
import { api, qs } from '../lib/api';
import { useAuth } from '../lib/auth';
import { rp, SPEED } from '../lib/format';
import { Field, Loading, Modal, PageHeader, useToast } from '../components/ui';

export default function NewOrder() {
  const nav = useNavigate(); const qc = useQueryClient(); const toast = useToast(); const { user } = useAuth();
  const [custQ, setCustQ] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [speed, setSpeed] = useState('reguler');
  const [qty, setQty] = useState<Record<number, number>>({});
  const [extra, setExtra] = useState(0); const [discount, setDiscount] = useState(0); const [notes, setNotes] = useState('');
  const [pay, setPay] = useState({ amount: 0, method: 'tunai' });

  const services = useQuery({ queryKey: ['services'], queryFn: () => api<any[]>('/services') });
  const outlet = useQuery({ queryKey: ['pub-outlet'], queryFn: () => api<any>('/public/outlet') });
  const custs = useQuery({ queryKey: ['cust-search', custQ], enabled: custQ.length >= 2, queryFn: () => api<any>('/customers' + qs({ q: custQ, size: 6 })) });

  const calc = useMemo(() => {
    const lines = (services.data || []).filter((s) => qty[s.id] > 0).map((s) => ({ s, q: qty[s.id], sub: Math.round(s.price * qty[s.id]) }));
    const subtotal = lines.reduce((a, l) => a + l.sub, 0);
    const pct = speed === 'express' ? Number(outlet.data?.express_pct || 0) : speed === 'kilat' ? Number(outlet.data?.kilat_pct || 0) : 0;
    const fee = Math.round((subtotal * pct) / 100);
    return { lines, subtotal, fee, total: Math.max(0, subtotal + fee + extra - discount) };
  }, [services.data, qty, speed, outlet.data, extra, discount]);

  const create = useMutation({
    mutationFn: () => api<any>('/transactions', { method: 'POST', body: { customer_id: customer.id, speed, items: calc.lines.map((l) => ({ service_id: l.s.id, qty: l.q })), extra_fee: extra, discount, notes, pay: pay.amount > 0 ? pay : undefined } }),
    onSuccess: (r) => { toast(`Order ${r.invoice_no} tersimpan`); qc.invalidateQueries(); nav(`/app/transaksi/${r.id}`); },
    onError: (e: any) => toast(e.message, false),
  });
  const canSubmit = customer && calc.lines.length > 0 && !create.isPending;
  const step = (id: number, cat: string, d: number) => setQty((o) => ({ ...o, [id]: Math.max(0, Math.round(((o[id] || 0) + d * (cat === 'kiloan' ? 0.5 : 1)) * 100) / 100) }));

  return (
    <>
      <PageHeader title="Transaksi baru" sub="Berat kiloan diisi dari hasil timbangan outlet. Total final dihitung ulang oleh server." />
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <section className="card p-4 sm:p-5">
            <h3 className="mb-3 font-bold">1. Pelanggan</h3>
            {customer ? (
              <div className="flex items-center justify-between rounded-xl bg-brand-50 p-3.5"><div><p className="font-semibold">{customer.name}</p><p className="text-sm text-slate-600">{customer.phone}</p></div><button className="btn-ghost !min-h-[38px]" onClick={() => setCustomer(null)}>Ganti</button></div>
            ) : (
              <>
                <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" /><input className="input pl-10" placeholder="Cari nama atau nomor telepon" value={custQ} onChange={(e) => setCustQ(e.target.value)} aria-label="Cari pelanggan" /></div>
                  <button className="btn-soft" onClick={() => setAddOpen(true)}><UserPlus className="h-5 w-5" /><span className="hidden sm:inline">Baru</span></button></div>
                {custs.data?.data.map((c: any) => <button key={c.id} onClick={() => setCustomer(c)} className="mt-2 flex w-full items-center justify-between rounded-xl border border-slate-200 px-3.5 py-3 text-left hover:bg-foam"><span className="font-medium">{c.name}</span><span className="text-sm text-slate-500">{c.phone}</span></button>)}
                {custs.data && !custs.data.data.length && <p className="mt-2 text-sm text-slate-500">Tidak ditemukan. Tekan “Baru” untuk mendaftarkan.</p>}
              </>
            )}
          </section>

          <section className="card p-4 sm:p-5">
            <h3 className="mb-3 font-bold">2. Layanan</h3>
            {services.isLoading ? <Loading /> : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {services.data?.map((s) => (
                  <div key={s.id} className={clsx('rounded-xl border p-3.5 transition', qty[s.id] > 0 ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-100' : 'border-slate-200')}>
                    <div className="flex justify-between gap-2"><p className="font-semibold">{s.name}</p><p className="whitespace-nowrap text-sm font-bold text-brand-700">{rp(s.price)}/{s.unit}</p></div>
                    <p className="mb-2 text-xs text-slate-500">{s.category === 'kiloan' ? 'Isi berat hasil timbang (kg)' : 'Jumlah'}</p>
                    <div className="flex items-center gap-2">
                      <button className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white" onClick={() => step(s.id, s.category, -1)} aria-label="Kurangi"><Minus className="h-4 w-4" /></button>
                      <input inputMode="decimal" className="input text-center font-semibold" value={qty[s.id] ?? ''} placeholder="0" onChange={(e) => { const v = parseFloat(e.target.value.replace(',', '.')); setQty({ ...qty, [s.id]: isNaN(v) ? 0 : v }); }} aria-label={`Jumlah ${s.name}`} />
                      <button className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white" onClick={() => step(s.id, s.category, 1)} aria-label="Tambah"><Plus className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <div className="sm:col-span-2"><h3 className="mb-3 font-bold">3. Jenis pengerjaan & biaya</h3>
              <div className="grid grid-cols-3 gap-2">{Object.entries(SPEED).map(([k, v]) => <button key={k} onClick={() => setSpeed(k)} className={clsx('min-h-[48px] rounded-xl border text-sm font-semibold', speed === k ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white')}>{v}{k !== 'reguler' && outlet.data && <span className="block text-[11px] font-normal opacity-80">+{Number(outlet.data[k + '_pct'])}%</span>}</button>)}</div></div>
            <Field label="Biaya tambahan (Rp)"><input type="number" min={0} className="input" value={extra || ''} onChange={(e) => setExtra(+e.target.value || 0)} /></Field>
            <Field label="Diskon (Rp)" hint={user?.role === 'owner' || user?.can_discount ? undefined : 'Anda tidak memiliki izin diskon'}><input type="number" min={0} className="input" disabled={user?.role !== 'owner' && !user?.can_discount} value={discount || ''} onChange={(e) => setDiscount(+e.target.value || 0)} /></Field>
            <div className="sm:col-span-2"><Field label="Catatan"><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Mis. noda di lengan, pisahkan baju putih" /></Field></div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden">
            <div className="bg-brand-950 p-4 text-white"><p className="text-sm text-brand-200">Ringkasan</p><p className="font-display text-3xl font-extrabold">{rp(calc.total)}</p></div>
            <div className="space-y-2 p-4 text-sm">
              {calc.lines.length === 0 && <p className="text-slate-500">Belum ada layanan dipilih.</p>}
              {calc.lines.map((l) => <div key={l.s.id} className="flex justify-between gap-2"><span>{l.s.name} <span className="text-slate-500">× {l.q} {l.s.unit}</span></span><span className="font-medium">{rp(l.sub)}</span></div>)}
              {calc.fee > 0 && <div className="flex justify-between text-slate-600"><span>Biaya {SPEED[speed]}</span><span>{rp(calc.fee)}</span></div>}
              {extra > 0 && <div className="flex justify-between text-slate-600"><span>Biaya tambahan</span><span>{rp(extra)}</span></div>}
              {discount > 0 && <div className="flex justify-between text-emerald-700"><span>Diskon</span><span>−{rp(discount)}</span></div>}
              <div className="border-t border-dashed border-slate-300 pt-3">
                <p className="mb-2 font-semibold">Pembayaran awal (opsional)</p>
                <div className="grid grid-cols-[1fr_auto] gap-2"><input type="number" min={0} className="input" placeholder="Nominal / DP" value={pay.amount || ''} onChange={(e) => setPay({ ...pay, amount: Math.min(+e.target.value || 0, calc.total) })} disabled={user?.role !== 'owner' && !user?.can_payment} aria-label="Nominal pembayaran" />
                  <select className="input !w-auto" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} aria-label="Metode"><option value="tunai">Tunai</option><option value="transfer">Transfer</option><option value="qris">QRIS</option></select></div>
                <div className="mt-2 flex gap-2"><button className="btn-ghost !min-h-[36px] flex-1 text-xs" onClick={() => setPay({ ...pay, amount: calc.total })}>Bayar lunas</button><button className="btn-ghost !min-h-[36px] flex-1 text-xs" onClick={() => setPay({ ...pay, amount: 0 })}>Bayar nanti</button></div>
                <p className="mt-2 text-xs text-slate-500">Sisa tagihan: <b>{rp(Math.max(0, calc.total - pay.amount))}</b></p>
              </div>
              <button className="btn-primary mt-2 w-full" disabled={!canSubmit} onClick={() => create.mutate()}>{create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Simpan transaksi</button>
              {!customer && <p className="text-center text-xs text-slate-500">Pilih pelanggan terlebih dahulu.</p>}
            </div>
          </div>
        </aside>
      </div>
      <CustomerModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={(c) => { setCustomer(c); setAddOpen(false); }} />
    </>
  );
}

export function CustomerModal({ open, onClose, onSaved, edit }: { open: boolean; onClose: () => void; onSaved: (c: any) => void; edit?: any }) {
  const toast = useToast(); const qc = useQueryClient();
  const [f, setF] = useState<any>(edit || { name: '', phone: '', address: '', notes: '', is_member: false });
  const [key, setKey] = useState(edit?.id);
  if (edit?.id !== key) { setKey(edit?.id); setF(edit || { name: '', phone: '', address: '', notes: '', is_member: false }); }
  const m = useMutation({
    mutationFn: () => api<any>(edit ? `/customers/${edit.id}` : '/customers', { method: edit ? 'PATCH' : 'POST', body: { name: f.name, phone: f.phone, address: f.address || '', notes: f.notes || '', is_member: !!f.is_member } }),
    onSuccess: (r) => { toast(edit ? 'Pelanggan diperbarui' : 'Pelanggan ditambahkan'); qc.invalidateQueries({ queryKey: ['customers'] }); onSaved(edit ? { ...f } : r); if (!edit) setF({ name: '', phone: '', address: '', notes: '', is_member: false }); },
    onError: (e: any) => toast(e.message, false),
  });
  return (
    <Modal open={open} onClose={onClose} title={edit ? 'Ubah pelanggan' : 'Pelanggan baru'}>
      <div className="space-y-4">
        <Field label="Nama"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <Field label="Nomor WhatsApp / telepon"><input className="input" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="08xxxxxxxxxx" /></Field>
        <Field label="Alamat (opsional)"><input className="input" value={f.address || ''} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        <label className="flex min-h-[44px] items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-brand-600" checked={!!f.is_member} onChange={(e) => setF({ ...f, is_member: e.target.checked })} />Member</label>
        <button className="btn-primary w-full" disabled={m.isPending || f.name.length < 2 || f.phone.length < 8} onClick={() => m.mutate()}>Simpan pelanggan</button>
      </div>
    </Modal>
  );
}
