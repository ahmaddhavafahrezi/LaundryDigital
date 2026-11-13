import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Ban, Check, Pencil, Printer, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtDateTime, rp, SPEED, STATUS, STATUS_FLOW } from '../lib/format';
import { ErrorBox, Field, Loading, Modal, PayBadge, StatusBadge, useToast } from '../components/ui';

const SKIPPABLE = ['menunggu_antrean', 'pengeringan', 'penyetrikaan', 'pengemasan'];

export default function OrderDetail() {
  const { id } = useParams(); const { user } = useAuth(); const toast = useToast(); const qc = useQueryClient();
  const [modal, setModal] = useState<'pay' | 'cancel' | 'nota' | null>(null);
  const [edit, setEdit] = useState<any>(null);
  const [pay, setPay] = useState({ amount: 0, method: 'tunai', reference: '' });
  const [reason, setReason] = useState(''); const [newQty, setNewQty] = useState(0);
  const { data: t, isLoading, error } = useQuery({ queryKey: ['order', id], queryFn: () => api<any>(`/transactions/${id}`) });
  const done = () => { qc.invalidateQueries(); setModal(null); setEdit(null); setReason(''); };
  const mut = (path: string, body: any, method = 'POST', msg = 'Tersimpan') => ({ mutationFn: () => api(`/transactions/${id}${path}`, { method, body }), onSuccess: () => { toast(msg); done(); }, onError: (e: any) => toast(e.message, false) });
  const status = useMutation({ mutationFn: (s: string) => api(`/transactions/${id}/status`, { method: 'POST', body: { status: s } }), onSuccess: () => { toast('Status diperbarui'); done(); }, onError: (e: any) => toast(e.message, false) });
  const payM = useMutation(mut('/payments', pay, 'POST', 'Pembayaran dicatat'));
  const cancelM = useMutation(mut('/cancel', { reason }, 'POST', 'Order dibatalkan'));
  const editM = useMutation({ mutationFn: () => api(`/transactions/${id}/items/${edit.id}`, { method: 'PATCH', body: { qty: newQty, reason } }), onSuccess: () => { toast('Koreksi tersimpan & tercatat di log'); done(); }, onError: (e: any) => toast(e.message, false) });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const remaining = t.total - t.paid_amount;
  const final = ['sudah_diambil', 'dibatalkan'].includes(t.status);
  const idx = STATUS_FLOW.indexOf(t.status);
  // tahap berikutnya yang boleh dipilih: langkah berikut + tahap yang bisa dilewati
  const nexts: string[] = []; for (let i = idx + 1; i < STATUS_FLOW.length && !final; i++) { nexts.push(STATUS_FLOW[i]); if (!SKIPPABLE.includes(STATUS_FLOW[i])) break; }
  const reached = new Set(t.history.map((h: any) => h.to_status));
  const canCorrect = user?.role === 'owner' || user?.can_correct;
  const trackUrl = `${location.origin}/cek/${t.tracking_token}`;

  return (
    <>
      <Link to="/app/transaksi" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700"><ArrowLeft className="h-4 w-4" />Kembali ke pesanan</Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold sm:text-3xl">{t.invoice_no}</h1><p className="mt-1 text-slate-500">{t.customer_name} · {t.customer_phone} · {SPEED[t.speed]}</p></div>
        <div className="flex flex-wrap gap-2"><StatusBadge s={t.status} /><PayBadge s={t.payment_status} /><button className="btn-ghost !min-h-[40px]" onClick={() => setModal('nota')}><Printer className="h-4 w-4" />Nota</button></div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <section className="card p-4 sm:p-5">
            <h3 className="mb-4 font-bold">Proses cucian</h3>
            {t.status === 'dibatalkan' ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Dibatalkan: {t.cancel_reason}</p> : (
              <ol className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STATUS_FLOW.map((s) => <li key={s} className={clsx('flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold', s === t.status ? 'bg-brand-600 text-white' : reached.has(s) ? 'bg-brand-50 text-brand-700' : 'bg-slate-50 text-slate-400')}>{reached.has(s) && s !== t.status && <Check className="h-3.5 w-3.5" />}{STATUS[s].label}</li>)}
              </ol>
            )}
            {!final && (
              <div className="flex flex-wrap gap-2">{nexts.map((s, i) => <button key={s} className={i === 0 || nexts.length === 1 ? 'btn-primary' : 'btn-ghost'} disabled={status.isPending} onClick={() => status.mutate(s)}>{i === 0 ? '' : 'Lewati ke '}{STATUS[s].label}</button>)}</div>
            )}
            {t.status === 'siap_diambil' && remaining > 0 && <p className="mt-3 rounded-xl bg-lemon-300/40 p-3 text-sm">Tagihan belum lunas. Catat pelunasan sebelum cucian diserahkan.</p>}
            <h4 className="mb-2 mt-6 text-sm font-bold">Riwayat status</h4>
            <ul className="space-y-2 text-sm">{[...t.history].reverse().map((h: any) => <li key={h.id} className="flex justify-between gap-2"><span><b>{STATUS[h.to_status]?.label}</b>{h.note && <span className="text-slate-500"> — {h.note}</span>}<span className="text-slate-400"> · {h.user_name || 'Sistem'}</span></span><span className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(h.created_at)}</span></li>)}</ul>
          </section>

          <section className="card p-4 sm:p-5">
            <h3 className="mb-3 font-bold">Rincian layanan</h3>
            <ul className="divide-y divide-slate-100">{t.items.map((it: any) => (
              <li key={it.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-semibold">{it.service_name}</p><p className="text-sm text-slate-500">{it.qty} {it.unit} × {rp(it.price)}</p></div>
                <div className="flex items-center gap-2"><p className="font-semibold">{rp(it.subtotal)}</p>{canCorrect && !final && <button className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-brand-50" aria-label="Koreksi" onClick={() => { setEdit(it); setNewQty(it.qty); }}><Pencil className="h-4 w-4" /></button>}</div></li>))}</ul>
            <div className="mt-3 space-y-1 border-t border-dashed border-slate-300 pt-3 text-sm">
              <Row l="Subtotal" v={rp(t.subtotal)} />{t.speed_fee > 0 && <Row l={`Biaya ${SPEED[t.speed]}`} v={rp(t.speed_fee)} />}{t.extra_fee > 0 && <Row l="Biaya tambahan" v={rp(t.extra_fee)} />}{t.discount > 0 && <Row l="Diskon" v={`−${rp(t.discount)}`} />}
              <div className="flex justify-between pt-1 font-display text-xl font-extrabold"><span>Total</span><span>{rp(t.total)}</span></div></div>
            {t.notes && <p className="mt-3 rounded-xl bg-foam p-3 text-sm text-slate-600">Catatan: {t.notes}</p>}
          </section>
        </div>

        <div className="space-y-5">
          <section className="card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Pembayaran</h3></div>
            <div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-emerald-700">Sudah dibayar</p><p className="font-display text-lg font-extrabold">{rp(t.paid_amount)}</p></div><div className={clsx('rounded-xl p-3', remaining > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500')}><p>Sisa tagihan</p><p className="font-display text-lg font-extrabold">{rp(remaining)}</p></div></div>
            {t.status !== 'dibatalkan' && remaining > 0 && (user?.role === 'owner' || user?.can_payment) && <button className="btn-primary mt-3 w-full" onClick={() => { setPay({ amount: remaining, method: 'tunai', reference: '' }); setModal('pay'); }}><Wallet className="h-5 w-5" />Catat pembayaran</button>}
            <ul className="mt-4 space-y-2 text-sm">{t.payments.map((p: any) => <li key={p.id} className="flex justify-between gap-2"><span>{p.kind === 'refund' ? 'Refund' : 'Bayar'} · <span className="uppercase">{p.method}</span><span className="text-slate-400"> · {p.user_name}</span></span><span className={clsx('font-semibold', p.amount < 0 && 'text-rose-600')}>{rp(p.amount)}</span></li>)}{!t.payments.length && <li className="text-slate-500">Belum ada pembayaran.</li>}</ul>
          </section>
          <section className="card p-4 sm:p-5 text-sm"><h3 className="mb-2 font-bold">Info order</h3>
            <p className="text-slate-500">Masuk</p><p className="mb-2 font-medium">{fmtDateTime(t.created_at)} oleh {t.received_name}</p><p className="text-slate-500">Estimasi selesai</p><p className="mb-2 font-medium">{fmtDateTime(t.est_done)}</p><p className="text-slate-500">Tautan tracking pelanggan</p><p className="break-all font-medium text-brand-700">{trackUrl}</p></section>
          {canCorrect && !final && <button className="btn-danger w-full" onClick={() => setModal('cancel')}><Ban className="h-5 w-5" />Batalkan order</button>}
        </div>
      </div>

      <Modal open={modal === 'pay'} onClose={() => setModal(null)} title="Catat pembayaran">
        <div className="space-y-4"><Field label="Nominal" hint={`Sisa tagihan ${rp(remaining)}`}><input type="number" className="input" value={pay.amount || ''} onChange={(e) => setPay({ ...pay, amount: +e.target.value || 0 })} /></Field>
          <Field label="Metode"><select className="input" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}><option value="tunai">Tunai</option><option value="transfer">Transfer</option><option value="qris">QRIS (catat manual)</option></select></Field>
          <Field label="Referensi (opsional)"><input className="input" value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></Field>
          <button className="btn-primary w-full" disabled={payM.isPending || pay.amount <= 0 || pay.amount > remaining} onClick={() => payM.mutate()}>Simpan pembayaran</button></div>
      </Modal>
      <Modal open={modal === 'cancel'} onClose={() => setModal(null)} title="Batalkan order">
        <div className="space-y-4"><p className="text-sm text-slate-600">{t.paid_amount > 0 ? `Pembayaran ${rp(t.paid_amount)} akan dicatat sebagai refund.` : 'Order belum dibayar.'} Tindakan ini tidak bisa dibatalkan.</p>
          <Field label="Alasan pembatalan"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <button className="btn-danger w-full" disabled={cancelM.isPending || reason.length < 5} onClick={() => cancelM.mutate()}>Ya, batalkan order</button></div>
      </Modal>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Koreksi berat / jumlah">
        <div className="space-y-4"><p className="text-sm text-slate-600">{edit?.service_name}: {edit?.qty} {edit?.unit} → nilai baru. Perubahan dicatat dengan alasan, pengguna, dan waktu.</p>
          <Field label={`Nilai baru (${edit?.unit})`}><input type="number" step="0.1" className="input" value={newQty || ''} onChange={(e) => setNewQty(+e.target.value)} /></Field>
          <Field label="Alasan koreksi"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mis. salah baca timbangan" /></Field>
          <button className="btn-primary w-full" disabled={editM.isPending || reason.length < 5 || newQty <= 0} onClick={() => editM.mutate()}>Simpan koreksi</button></div>
      </Modal>
      <Modal open={modal === 'nota'} onClose={() => setModal(null)} title="Nota">
        <Nota t={t} url={trackUrl} />
        <button className="btn-primary mt-4 w-full" onClick={() => window.print()}><Printer className="h-5 w-5" />Cetak / simpan PDF</button>
      </Modal>
    </>
  );
}

const Row = ({ l, v }: { l: string; v: string }) => <div className="flex justify-between text-slate-600"><span>{l}</span><span>{v}</span></div>;

function Nota({ t, url }: { t: any; url: string }) {
  return (
    <div id="nota" className="mx-auto w-full max-w-[320px] rounded-xl border border-slate-200 bg-white p-4 font-mono text-[12px] leading-relaxed text-black">
      <div className="text-center"><p className="text-base font-bold">{t.outlet.name}</p><p>{t.outlet.address}</p><p>{t.outlet.phone}</p></div>
      <hr className="my-2 border-dashed border-black" />
      <p>Nota : {t.invoice_no}</p><p>Tanggal: {fmtDateTime(t.created_at)}</p><p>Pelanggan: {t.customer_name}</p><p>Petugas: {t.received_name}</p><p>Selesai: {fmtDateTime(t.est_done)} ({SPEED[t.speed]})</p>
      <hr className="my-2 border-dashed border-black" />
      {t.items.map((it: any) => <div key={it.id} className="mb-1"><p>{it.service_name}</p><div className="flex justify-between"><span>{it.qty} {it.unit} x {Number(it.price).toLocaleString('id-ID')}</span><span>{Number(it.subtotal).toLocaleString('id-ID')}</span></div></div>)}
      <hr className="my-2 border-dashed border-black" />
      {t.speed_fee > 0 && <div className="flex justify-between"><span>Biaya {SPEED[t.speed]}</span><span>{Number(t.speed_fee).toLocaleString('id-ID')}</span></div>}
      {t.extra_fee > 0 && <div className="flex justify-between"><span>Biaya tambahan</span><span>{Number(t.extra_fee).toLocaleString('id-ID')}</span></div>}
      {t.discount > 0 && <div className="flex justify-between"><span>Diskon</span><span>-{Number(t.discount).toLocaleString('id-ID')}</span></div>}
      <div className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{rp(t.total)}</span></div>
      <div className="flex justify-between"><span>Dibayar</span><span>{rp(t.paid_amount)}</span></div>
      <div className="flex justify-between font-bold"><span>Sisa</span><span>{rp(t.total - t.paid_amount)}</span></div>
      <hr className="my-2 border-dashed border-black" />
      <div className="flex flex-col items-center gap-1"><QRCodeSVG value={url} size={96} /><p>Scan untuk cek status cucian</p><p className="text-[10px]">Berat final dari timbangan outlet.</p></div>
    </div>
  );
}
