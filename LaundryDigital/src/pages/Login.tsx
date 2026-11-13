import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, WashingMachine } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ username: '', password: '' });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/app" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.username || !f.password) return setErr('Isi username dan password.');
    setBusy(true); setErr('');
    try { await login(f.username, f.password); nav('/app'); } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {[...Array(9)].map((_, i) => <span key={i} className="bubble" style={{ left: `${8 + i * 10}%`, width: 14 + (i % 4) * 14, height: 14 + (i % 4) * 14, animationDuration: `${7 + (i % 5) * 2}s`, animationDelay: `${i * 0.8}s` }} />)}
        <div className="relative flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-lemon-400 text-brand-950"><WashingMachine /></div><span className="font-display text-xl font-extrabold">Laundry Digital</span></div>
        <div className="relative"><h2 className="max-w-md text-5xl font-extrabold leading-[1.05]">Cucian beres, pembukuan rapi.</h2>
          <p className="mt-4 max-w-sm text-brand-200">Catat order, pantau status, dan lihat uang masuk dalam satu layar.</p></div>
        <p className="relative text-sm text-brand-300">Khusus owner dan karyawan outlet.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div><h1 className="text-3xl font-extrabold">Masuk</h1><p className="mt-1 text-sm text-slate-500">Gunakan akun yang diberikan owner.</p></div>
          {err && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div>}
          <label className="block"><span className="label">Username atau email</span><input className="input" autoComplete="username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoFocus /></label>
          <label className="block"><span className="label">Password</span>
            <div className="relative"><input className="input pr-12" type={show ? 'text' : 'password'} autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-1 top-1 grid h-10 w-10 place-items-center text-slate-500" aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}>{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></label>
          <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Masuk</button>
          <p className="text-center text-sm text-slate-500">Pelanggan? <Link to="/cek" className="font-semibold text-brand-700 underline">Cek status cucian</Link></p>
        </form>
      </div>
    </div>
  );
}
