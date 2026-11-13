import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { rp } from '../lib/format';
import { Badge, ErrorBox, Field, Loading, Modal, PageHeader, useToast } from '../components/ui';

const blank = { name: '', description: '', category: 'kiloan', unit: 'kg', price: 0, est_hours: 48, is_active: true };

export default function Services() {
  const toast = useToast(); const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ['services-all'], queryFn: () => api<any[]>('/services?all=1') });
  const save = useMutation({
    mutationFn: () => api(form.id ? `/services/${form.id}` : '/services', { method: form.id ? 'PATCH' : 'POST', body: { name: form.name, description: form.description || '', category: form.category, unit: form.unit, price: +form.price, est_hours: +form.est_hours, is_active: !!form.is_active } }),
    onSuccess: () => { toast('Layanan disimpan'); qc.invalidateQueries(); setForm(null); }, onError: (e: any) => toast(e.message, false),
  });
  return (
    <>
      <PageHeader title="Layanan & tarif" sub="Perubahan tarif hanya berlaku untuk order baru; order lama menyimpan harga saat dibuat." actions={<button className="btn-primary" onClick={() => setForm({ ...blank })}><Plus className="h-5 w-5" />Tambah layanan</button>} />
      {error && <ErrorBox error={error} />}{isLoading && <Loading />}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data?.map((s) => (
          <button key={s.id} onClick={() => setForm({ ...s })} className="card p-4 text-left transition hover:border-brand-300">
            <div className="flex items-start justify-between gap-2"><p className="font-bold">{s.name}</p><Badge cls={s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}>{s.is_active ? 'Aktif' : 'Nonaktif'}</Badge></div>
            <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">{s.description}</p>
            <p className="mt-3 font-display text-xl font-extrabold text-brand-700">{rp(s.price)}<span className="text-sm font-normal text-slate-500"> / {s.unit}</span></p>
            <p className="text-xs capitalize text-slate-500">{s.category} · ±{s.est_hours} jam</p></button>
        ))}
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Ubah layanan' : 'Layanan baru'}>
        {form && <div className="space-y-4">
          <Field label="Nama layanan"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Deskripsi"><input className="input" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Kategori"><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, unit: e.target.value === 'kiloan' ? 'kg' : 'pcs' })}><option value="kiloan">Kiloan</option><option value="satuan">Satuan</option><option value="paket">Paket</option></select></Field>
            <Field label="Satuan"><input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
            <Field label="Harga (Rp)"><input type="number" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
            <Field label="Estimasi (jam)"><input type="number" className="input" value={form.est_hours} onChange={(e) => setForm({ ...form, est_hours: e.target.value })} /></Field></div>
          <label className="flex min-h-[44px] items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-brand-600" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Layanan aktif (tampil di kasir dan website)</label>
          <button className="btn-primary w-full" disabled={save.isPending || form.name.length < 2} onClick={() => save.mutate()}>Simpan layanan</button></div>}
      </Modal>
    </>
  );
}
