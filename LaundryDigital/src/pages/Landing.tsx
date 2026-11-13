import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, MapPin, Phone, QrCode, Scale, Search, Shirt, WashingMachine, Zap } from 'lucide-react';
import { api } from '../lib/api';
import { rp } from '../lib/format';

export default function Landing() {
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const outlet = useQuery({ queryKey: ['pub-outlet'], queryFn: () => api<any>('/public/outlet') });
  const services = useQuery({ queryKey: ['pub-services'], queryFn: () => api<any[]>('/public/services') });
  const o = outlet.data;
  const go = (e: FormEvent) => { e.preventDefault(); if (code.trim()) nav('/cek/' + encodeURIComponent(code.trim())); };
  const groups = [['kiloan', 'Kiloan', 'Ditimbang di depan Anda, harga final setelah timbang.'], ['satuan', 'Satuan', 'Untuk barang besar dan perawatan khusus.'], ['paket', 'Paket', 'Harga tetap, lebih hemat.']];

  return (
    <div>
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5 text-white"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lemon-400 text-brand-950"><WashingMachine className="h-6 w-6" /></span><span className="font-display text-lg font-extrabold">{o?.name || 'Laundry'}</span></div>
          <nav className="flex items-center gap-1 text-sm font-medium text-brand-100">
            <a href="#harga" className="hidden rounded-lg px-3 py-2 hover:bg-white/10 sm:block">Harga</a>
            <a href="#kontak" className="hidden rounded-lg px-3 py-2 hover:bg-white/10 sm:block">Kontak</a>
            <Link to="/login" className="rounded-xl bg-white/10 px-4 py-2.5 font-semibold text-white hover:bg-white/20">Login</Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-brand-950 pb-24 pt-28 text-white sm:pb-32 sm:pt-36">
        {[...Array(12)].map((_, i) => <span key={i} className="bubble" style={{ left: `${4 + i * 8}%`, width: 12 + (i % 5) * 12, height: 12 + (i % 5) * 12, animationDuration: `${8 + (i % 5) * 2}s`, animationDelay: `${i * 0.7}s`, bottom: 0 }} />)}
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <h1 className="text-5xl font-extrabold leading-[1.02] sm:text-7xl">Pakaian bersih,<br />tanpa perlu menebak.</h1>
            <p className="mt-5 max-w-lg text-lg text-brand-200">{o?.tagline || 'Setiap cucian punya nomor nota. Pantau statusnya dari ponsel, kapan saja.'}</p>
            <form onSubmit={go} className="mt-8 flex max-w-lg gap-2 rounded-2xl bg-white p-2 shadow-2xl">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Masukkan nomor nota, mis. LDY-261113-AB7K" aria-label="Nomor nota" className="min-w-0 flex-1 rounded-xl px-4 py-3 text-brand-950 placeholder:text-slate-400 focus:outline-none" />
              <button className="btn-primary !bg-lemon-400 !text-brand-950 hover:!bg-lemon-300"><Search className="h-5 w-5" />Cek status</button>
            </form>
          </div>
          {/* Nota contoh — bentuk struk yang akan diterima pelanggan */}
          <div className="relative mx-auto w-full max-w-sm rotate-[2deg]">
            <div className="rounded-3xl bg-white p-6 text-brand-950 shadow-2xl">
              <div className="flex items-start justify-between"><div><p className="text-xs text-slate-500">Nomor nota</p><p className="font-display text-lg font-extrabold">LDY-261113-AB7K</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Siap diambil</span></div>
              <div className="my-4 border-t border-dashed border-slate-300" />
              {['Cuci Setrika · 4,5 kg', 'Jaket · 1 pcs'].map((l) => <div key={l} className="flex justify-between py-1 text-sm"><span>{l.split(' · ')[0]}</span><span className="text-slate-500">{l.split(' · ')[1]}</span></div>)}
              <div className="my-4 border-t border-dashed border-slate-300" />
              <div className="flex items-end justify-between"><div><p className="text-xs text-slate-500">Total</p><p className="font-display text-2xl font-extrabold">Rp56.000</p></div><div className="grid h-16 w-16 place-items-center rounded-xl bg-brand-950 text-white"><QrCode className="h-10 w-10" /></div></div>
            </div>
            <div className="absolute -bottom-4 -left-4 -z-10 h-full w-full rounded-3xl bg-lemon-400/90" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-14 sm:grid-cols-3 sm:px-6">
        {[[Scale, 'Ditimbang transparan', 'Berat dicatat petugas di depan Anda. Harga final dihitung setelah timbang.'], [Zap, 'Express & kilat', o ? `Selesai ${o.express_hours} jam atau ${o.kilat_hours} jam dengan biaya tambahan.` : 'Butuh cepat? Pilih jalur express atau kilat.'], [QrCode, 'Lacak lewat QR', 'Scan QR pada nota untuk melihat posisi cucian tanpa login.']].map(([I, t, d]: any) => (
          <div key={t} className="card p-6"><div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><I className="h-6 w-6" /></div><h3 className="text-lg font-bold">{t}</h3><p className="mt-1 text-sm text-slate-600">{d}</p></div>
        ))}
      </section>

      <section id="harga" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Daftar harga</h2>
          <p className="mt-2 text-slate-600">Harga kiloan dihitung dari berat hasil timbang di outlet.</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {groups.map(([k, title, sub]) => (
              <div key={k} className="rounded-2xl border border-brand-100 bg-foam p-5">
                <h3 className="text-xl font-bold">{title}</h3><p className="mb-4 text-sm text-slate-500">{sub}</p>
                <ul className="divide-y divide-brand-100">
                  {(services.data || []).filter((s) => s.category === k).map((s) => (
                    <li key={s.id} className="flex items-start justify-between gap-3 py-3"><div><p className="font-semibold">{s.name}</p><p className="text-xs text-slate-500">{s.description} · ±{Math.round(s.est_hours / 24 * 10) / 10} hari</p></div><p className="whitespace-nowrap font-display font-bold text-brand-700">{rp(s.price)}<span className="text-xs font-normal text-slate-500">/{s.unit}</span></p></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {o && <p className="mt-6 flex flex-wrap items-center gap-2 rounded-xl bg-lemon-300/40 px-4 py-3 text-sm"><Zap className="h-4 w-4" />Express +{Number(o.express_pct)}% (±{o.express_hours} jam) · Kilat +{Number(o.kilat_pct)}% (±{o.kilat_hours} jam) dari subtotal layanan.</p>}
        </div>
      </section>

      <section id="kontak" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Kunjungi kami</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[[MapPin, 'Alamat', o?.address], [Clock, 'Jam buka', o?.open_hours], [Phone, 'Telepon / WhatsApp', o?.phone]].map(([I, t, v]: any) => (
            <div key={t} className="card flex items-start gap-3 p-5"><I className="mt-0.5 h-5 w-5 text-brand-600" /><div><p className="text-sm text-slate-500">{t}</p><p className="font-semibold">{v || '-'}</p></div></div>
          ))}
        </div>
      </section>
      <footer className="bg-brand-950 py-6 text-center text-sm text-brand-300"><Shirt className="mr-2 inline h-4 w-4" />{o?.name} · Dibuat dengan Management Laundry Digital</footer>
    </div>
  );
}
