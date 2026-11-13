import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, ShieldCheck, UserPlus } from 'lucide-react';
import { api } from '../lib/api';
import { fmtDateTime } from '../lib/format';
import { Badge, ErrorBox, Field, Loading, Modal, PageHeader, useToast } from '../components/ui';

export default function Employees() {
  const toast = useToast(); const qc = useQueryClient();
  const [form, setForm] = useState<any>(null); const [temp, setTemp] = useState('');
  const { data, isLoading, error } = useQuery({ queryKey: ['employees'], queryFn: () => api<any[]>('/employees') });
  const save = useMutation({
    mutationFn: () => api(form.id ? `/employees/${form.id}` : '/employees', { method: form.id ? 'PATCH' : 'POST', body: { name: form.name, email: form.email || '', phone: form.phone || '', can_discount: !!form.can_discount, can_correct: !!form.can_correct, can_payment: !!form.can_payment, ...(form.id ? { is_active: !!form.is_active } : { username: form.username, password: form.password }) } }),
    onSuccess: () => { toast('Data karyawan disimpan'); qc.invalidateQueries({ queryKey: ['employees'] }); setForm(null); }, onError: (e: any) => toast(e.message, false),
  });
  const reset = useMutation({ mutationFn: (id: number) => api<any>(`/employees/${id}/reset-password`, { method: 'POST' }), onSuccess: (r) => { setTemp(r.temp_password); setForm(null); }, onError: (e: any) => toast(e.message, false) });
  const perm = (u: any) => [u.can_payment && 'Pembayaran', u.can_discount && 'Diskon', u.can_correct && 'Koreksi/void'].filter(Boolean).join(' · ') || 'Hanya input order';
  return (
    <>
      <PageHeader title="Karyawan" sub="Kelola akun dan izin. Izin diperiksa di server, bukan hanya di tampilan." actions={<button className="btn-primary" onClick={() => setForm({ name: '', username: '', password: '', can_payment: true })}><UserPlus className="h-5 w-5" />Tambah karyawan</button>} />
      {error && <ErrorBox error={error} />}{isLoading && <Loading />}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((u) => (
          <button key={u.id} onClick={() => setForm({ ...u })} className="card flex items-start gap-3 p-4 text-left hover:border-brand-300">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 font-bold text-white">{u.name[0]}</span>
            <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 font-bold">{u.name}{u.role === 'owner' && <Badge cls="bg-lemon-300/60 text-brand-950"><ShieldCheck className="mr-1 h-3.5 w-3.5" />Owner</Badge>}{!u.is_active && <Badge cls="bg-slate-100 text-slate-500">Nonaktif</Badge>}</span>
              <span className="block text-sm text-slate-500">@{u.username}</span><span className="mt-1 block text-xs text-slate-500">{u.role === 'owner' ? 'Akses penuh' : perm(u)}</span><span className="block text-xs text-slate-400">Login terakhir: {fmtDateTime(u.last_login)}</span></span>
          </button>
        ))}
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Ubah karyawan' : 'Karyawan baru'}>
        {form && <div className="space-y-4">
          <Field label="Nama lengkap"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          {!form.id && <div className="grid grid-cols-2 gap-3"><Field label="Username"><input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="off" /></Field><Field label="Password awal" hint="Min. 8 karakter"><input type="text" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="off" /></Field></div>}
          <div className="grid grid-cols-2 gap-3"><Field label="Email (opsional)"><input className="input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field><Field label="Telepon"><input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field></div>
          {form.role !== 'owner' && <fieldset className="space-y-1 rounded-xl bg-foam p-3"><legend className="px-1 text-sm font-semibold">Izin</legend>
            {[['can_payment', 'Mencatat pembayaran'], ['can_discount', 'Memberi diskon'], ['can_correct', 'Koreksi berat/harga & membatalkan order']].map(([k, l]) => <label key={k} className="flex min-h-[40px] items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-brand-600" checked={!!form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} />{l}</label>)}
            {form.id && <label className="flex min-h-[40px] items-center gap-3 border-t border-slate-200 pt-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-brand-600" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Akun aktif (nonaktif = tidak bisa login)</label>}</fieldset>}
          <button className="btn-primary w-full" disabled={save.isPending || form.name.length < 2 || (!form.id && (form.username.length < 3 || form.password.length < 8))} onClick={() => save.mutate()}>Simpan</button>
          {form.id && form.role !== 'owner' && <button className="btn-ghost w-full" disabled={reset.isPending} onClick={() => confirm(`Reset password ${form.name}?`) && reset.mutate(form.id)}><KeyRound className="h-4 w-4" />Reset password</button>}
        </div>}
      </Modal>
      <Modal open={!!temp} onClose={() => setTemp('')} title="Password sementara"><p className="text-sm text-slate-600">Berikan ke karyawan. Password ini hanya tampil sekali dan harus diganti saat login.</p><p className="my-4 select-all rounded-xl bg-foam p-4 text-center font-mono text-xl font-bold">{temp}</p><button className="btn-primary w-full" onClick={() => setTemp('')}>Sudah saya catat</button></Modal>
    </>
  );
}
