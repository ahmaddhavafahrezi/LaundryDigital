import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useMutation } from '@tanstack/react-query';
import { Activity, BadgeDollarSign, KeyRound, LayoutDashboard, LogOut, Menu, PackagePlus, Receipt, Shirt, Tags, UserCog, Users, WashingMachine, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Field, Modal, useToast } from '../components/ui';

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/transaksi/baru', label: 'Transaksi baru', icon: PackagePlus },
  { to: '/app/transaksi', label: 'Pesanan', icon: Receipt, end: true },
  { to: '/app/pelanggan', label: 'Pelanggan', icon: Users },
  { to: '/app/layanan', label: 'Layanan & tarif', icon: Tags, owner: true },
  { to: '/app/keuangan', label: 'Keuangan', icon: BadgeDollarSign, owner: true },
  { to: '/app/karyawan', label: 'Karyawan', icon: UserCog, owner: true },
  { to: '/app/aktivitas', label: 'Activity log', icon: Activity, owner: true },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState(false);
  const items = NAV.filter((n) => !n.owner || user?.role === 'owner');
  const current = items.find((n) => (n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to)))?.label ?? 'Dashboard';

  const side = (
    <div className="flex h-full flex-col bg-brand-950 text-brand-100">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-lemon-400 text-brand-950"><WashingMachine className="h-6 w-6" /></div>
        <div className="leading-tight"><p className="font-display text-lg font-extrabold text-white">Laundry Digital</p><p className="text-xs text-brand-300">{user?.role === 'owner' ? 'Panel Owner' : 'Panel Kasir'}</p></div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
            className={({ isActive }) => clsx('flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition', isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40' : 'text-brand-200 hover:bg-white/5 hover:text-white')}>
            <Icon className="h-5 w-5" />{label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <NavLink to="/" className="flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 text-sm text-brand-200 hover:bg-white/5"><Shirt className="h-5 w-5" />Lihat website</NavLink>
        <button onClick={() => setPw(true)} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 text-sm text-brand-200 hover:bg-white/5"><KeyRound className="h-5 w-5" />Ganti password</button>
        <button onClick={async () => { await logout(); nav('/login'); }} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 text-sm text-rose-300 hover:bg-white/5"><LogOut className="h-5 w-5" />Keluar</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{side}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-brand-950/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw]">{side}</div></div>
      )}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-brand-100 bg-white/85 px-4 backdrop-blur sm:px-6">
        <button className="grid h-11 w-11 place-items-center rounded-xl text-brand-900 hover:bg-brand-50 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
        <div className="min-w-0 flex-1"><p className="truncate text-xs text-slate-400">Beranda / {current}</p><p className="truncate font-display text-lg font-bold">{current}</p></div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block"><p className="text-sm font-semibold">{user?.name}</p><p className="text-xs capitalize text-slate-500">{user?.role}</p></div>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-800 font-bold text-white">{user?.name?.[0]}</div>
        </div>
      </header>
      {user?.must_change_password && (
        <div className="bg-lemon-300 px-4 py-2.5 text-center text-sm font-medium text-brand-950">
          Akun ini masih memakai password awal. <button className="underline" onClick={() => setPw(true)}>Ganti password sekarang</button> sebelum dipakai di produksi.
        </div>
      )}
      <main className="mx-auto max-w-7xl p-4 sm:p-6"><Outlet /></main>
      <PasswordModal open={pw} onClose={() => setPw(false)} />
    </div>
  );
}

function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast(); const { refresh } = useAuth();
  const [f, setF] = useState({ current: '', next: '' });
  const m = useMutation({ mutationFn: () => api('/auth/change-password', { method: 'POST', body: f }), onSuccess: () => { toast('Password berhasil diganti'); setF({ current: '', next: '' }); refresh(); onClose(); }, onError: (e: any) => toast(e.message, false) });
  return (
    <Modal open={open} onClose={onClose} title="Ganti password">
      <div className="space-y-4">
        <Field label="Password saat ini"><input type="password" className="input" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} autoComplete="current-password" /></Field>
        <Field label="Password baru" hint="Minimal 8 karakter"><input type="password" className="input" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} autoComplete="new-password" /></Field>
        <button className="btn-primary w-full" disabled={m.isPending} onClick={() => m.mutate()}>Simpan password</button>
      </div>
    </Modal>
  );
}
