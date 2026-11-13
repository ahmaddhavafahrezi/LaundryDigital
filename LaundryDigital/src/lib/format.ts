export const rp = (n: number | string | null | undefined) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n || 0));
export const rpShort = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.0', '')} jt` : Math.abs(n) >= 1e3 ? `${Math.round(n / 1e3)} rb` : String(n));
const tz = 'Asia/Jakarta';
export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: tz }) : '-');
export const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: tz }).replace(/\./g, ':') : '-';
export const todayWib = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

export const STATUS: Record<string, { label: string; cls: string }> = {
  diterima: { label: 'Diterima', cls: 'bg-slate-100 text-slate-700' },
  menunggu_antrean: { label: 'Menunggu antrean', cls: 'bg-amber-50 text-amber-700' },
  sedang_dicuci: { label: 'Sedang dicuci', cls: 'bg-sky-50 text-sky-700' },
  pengeringan: { label: 'Pengeringan', cls: 'bg-cyan-50 text-cyan-700' },
  penyetrikaan: { label: 'Penyetrikaan', cls: 'bg-violet-50 text-violet-700' },
  pengemasan: { label: 'Pengemasan', cls: 'bg-indigo-50 text-indigo-700' },
  siap_diambil: { label: 'Siap diambil', cls: 'bg-emerald-50 text-emerald-700' },
  sudah_diambil: { label: 'Sudah diambil', cls: 'bg-slate-100 text-slate-500' },
  dibatalkan: { label: 'Dibatalkan', cls: 'bg-rose-50 text-rose-700' },
};
export const STATUS_FLOW = ['diterima', 'menunggu_antrean', 'sedang_dicuci', 'pengeringan', 'penyetrikaan', 'pengemasan', 'siap_diambil', 'sudah_diambil'];
export const PAY: Record<string, { label: string; cls: string }> = {
  belum_lunas: { label: 'Belum lunas', cls: 'bg-rose-50 text-rose-700' },
  dp: { label: 'DP / sebagian', cls: 'bg-amber-50 text-amber-700' },
  lunas: { label: 'Lunas', cls: 'bg-emerald-50 text-emerald-700' },
};
export const SPEED: Record<string, string> = { reguler: 'Reguler', express: 'Express', kilat: 'Kilat' };
