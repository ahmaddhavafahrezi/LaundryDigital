import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { CheckCircle2, Inbox, Loader2, X, XCircle } from 'lucide-react';
import { PAY, STATUS } from '../lib/format';

/* ---------- Toast ---------- */
type T = { id: number; msg: string; ok: boolean };
const ToastCtx = createContext<(msg: string, ok?: boolean) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<T[]>([]);
  const push = useCallback((msg: string, ok = true) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l, { id, msg, ok }]);
    setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed inset-x-3 bottom-3 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={clsx('flex max-w-sm items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg', t.ok ? 'bg-brand-950' : 'bg-rose-600')}>
            {t.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Dasar ---------- */
export const Spinner = ({ className }: { className?: string }) => <Loader2 className={clsx('h-5 w-5 animate-spin text-brand-600', className)} />;
export const Loading = () => <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div>;
export const Empty = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-500"><Inbox className="h-6 w-6" /></div>
    <p className="font-semibold">{title}</p>{hint && <p className="max-w-xs text-sm text-slate-500">{hint}</p>}
  </div>
);
export const ErrorBox = ({ error }: { error: unknown }) => (
  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{(error as Error)?.message || 'Gagal memuat data'}</div>
);
export const Badge = ({ cls, children }: { cls: string; children: ReactNode }) => <span className={clsx('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold', cls)}>{children}</span>;
export const StatusBadge = ({ s }: { s: string }) => <Badge cls={STATUS[s]?.cls || ''}>{STATUS[s]?.label || s}</Badge>;
export const PayBadge = ({ s }: { s: string }) => <Badge cls={PAY[s]?.cls || ''}>{PAY[s]?.label || s}</Badge>;

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block"><span className="label">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}</label>;
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>{sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={title}>
      <div className={clsx('max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Tutup"><X className="h-5 w-5" /></button></div>
        {children}
      </div>
    </div>
  );
}

export function Pager({ page, total, size, onPage }: { page: number; total: number; size: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm">
      <span className="text-slate-500">Halaman {page} dari {pages} · {total} data</span>
      <div className="flex gap-2"><button className="btn-ghost !min-h-[38px]" disabled={page <= 1} onClick={() => onPage(page - 1)}>Sebelumnya</button>
        <button className="btn-ghost !min-h-[38px]" disabled={page >= pages} onClick={() => onPage(page + 1)}>Berikutnya</button></div>
    </div>
  );
}

export function Stat({ label, value, icon, tone = 'brand', hint }: { label: string; value: ReactNode; icon: ReactNode; tone?: 'brand' | 'green' | 'amber' | 'rose' | 'violet'; hint?: string }) {
  const tones = { brand: 'from-brand-500 to-brand-700', green: 'from-emerald-400 to-emerald-600', amber: 'from-lemon-400 to-amber-500', rose: 'from-rose-400 to-rose-600', violet: 'from-violet-400 to-violet-600' };
  return (
    <div className="card flex items-start gap-3.5 p-4 sm:p-5">
      <div className={clsx('grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm', tones[tone])}>{icon}</div>
      <div className="min-w-0"><p className="text-sm text-slate-500">{label}</p><p className="truncate font-display text-xl font-extrabold sm:text-2xl">{value}</p>{hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}</div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-soft" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={clsx('min-h-[40px] whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition', value === t.id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-brand-50')}>{t.label}</button>
      ))}
    </div>
  );
}
