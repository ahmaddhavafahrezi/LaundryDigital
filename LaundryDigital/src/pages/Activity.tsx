import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api, qs } from '../lib/api';
import { fmtDateTime } from '../lib/format';
import { Badge, Empty, ErrorBox, Loading, PageHeader, Pager } from '../components/ui';

export default function Activity() {
  const [q, setQ] = useState(''); const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({ queryKey: ['activity', q, page], queryFn: () => api<any>('/activity' + qs({ q, page })) });
  return (
    <>
      <PageHeader title="Activity log" sub="Jejak audit: siapa melakukan apa dan kapan. Tidak dapat dihapus dari aplikasi." />
      <div className="relative mb-4"><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" /><input className="input pl-10" placeholder="Cari aktivitas, pengguna, atau nomor nota" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Cari log" /></div>
      {error && <ErrorBox error={error} />}
      <div className="card overflow-hidden">
        {isLoading ? <Loading /> : !data?.data.length ? <Empty title="Belum ada aktivitas" /> : <ul className="divide-y divide-slate-100">{data.data.map((l: any) => (
          <li key={l.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm"><span className="min-w-0 flex-1"><Badge cls="mr-2 bg-brand-50 text-brand-700">{l.action}</Badge><b>{l.user_name || 'Sistem'}</b> — {l.summary}</span><span className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(l.created_at)}{l.ip ? ` · ${l.ip}` : ''}</span></li>))}</ul>}
        {data && <Pager page={page} total={data.total} size={data.size} onPage={setPage} />}
      </div>
    </>
  );
}
