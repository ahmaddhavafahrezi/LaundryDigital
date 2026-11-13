import { q, q1 } from '../db.js';
import { addDays } from './util.js';

function bucketKeys(from: string, end: string, monthly: boolean) {
  const keys: string[] = [];
  if (monthly) {
    let y = +from.slice(0, 4), m = +from.slice(5, 7);
    while (`${y}-${String(m).padStart(2, '0')}` <= end.slice(0, 7)) {
      keys.push(`${y}-${String(m).padStart(2, '0')}`);
      if (++m > 12) { m = 1; y++; }
    }
  } else for (let d = from; d <= end; d = addDays(d, 1)) keys.push(d);
  return keys;
}

/**
 * Definisi (konsisten di dashboard & laporan):
 *  - Omzet            = total nilai order (tidak dibatalkan) yang dibuat pada periode
 *  - Kas masuk        = pembayaran yang benar-benar diterima pada periode (refund mengurangi)
 *  - Piutang          = sisa tagihan seluruh order aktif yang belum lunas (posisi saat ini)
 *  - Pengeluaran      = biaya yang dicatat pada periode
 *  - Laba akrual      = Omzet − Pengeluaran
 *  - Arus kas bersih  = Kas masuk − Pengeluaran   (BUKAN laba)
 */
export async function financeSummary(outletId: number, from: string, end: string, to: string) {
  const a = `${from} 00:00:00`, b = `${to} 00:00:00`;
  const days = (Date.parse(end) - Date.parse(from)) / 864e5 + 1;
  const monthly = days > 62;
  const fmt = monthly ? '%Y-%m' : '%Y-%m-%d';

  const [orders, cash, exp, piutang] = await Promise.all([
    q1('SELECT COALESCE(SUM(total),0) omzet, COUNT(*) masuk, COALESCE(SUM(status IN ("siap_diambil","sudah_diambil")),0) selesai FROM transactions WHERE outlet_id=? AND status<>"dibatalkan" AND created_at>=? AND created_at<?', [outletId, a, b]),
    q1('SELECT COALESCE(SUM(amount),0) v FROM payments WHERE outlet_id=? AND created_at>=? AND created_at<?', [outletId, a, b]),
    q1('SELECT COALESCE(SUM(amount),0) v FROM expenses WHERE outlet_id=? AND spent_on>=? AND spent_on<?', [outletId, from, to]),
    q1('SELECT COALESCE(SUM(total-paid_amount),0) v, COUNT(*) n FROM transactions WHERE outlet_id=? AND status<>"dibatalkan" AND payment_status<>"lunas"', [outletId]),
  ]);

  const [sOmzet, sCash, sExp, byCategory, byService] = await Promise.all([
    q(`SELECT DATE_FORMAT(created_at,'${fmt}') k, SUM(total) v FROM transactions WHERE outlet_id=? AND status<>'dibatalkan' AND created_at>=? AND created_at<? GROUP BY k`, [outletId, a, b]),
    q(`SELECT DATE_FORMAT(created_at,'${fmt}') k, SUM(amount) v FROM payments WHERE outlet_id=? AND created_at>=? AND created_at<? GROUP BY k`, [outletId, a, b]),
    q(`SELECT DATE_FORMAT(spent_on,'${fmt}') k, SUM(amount) v FROM expenses WHERE outlet_id=? AND spent_on>=? AND spent_on<? GROUP BY k`, [outletId, from, to]),
    q('SELECT category name, SUM(amount) value FROM expenses WHERE outlet_id=? AND spent_on>=? AND spent_on<? GROUP BY category ORDER BY value DESC', [outletId, from, to]),
    q(`SELECT i.service_name name, SUM(i.subtotal) value, COUNT(DISTINCT i.transaction_id) orders FROM transaction_items i JOIN transactions t ON t.id=i.transaction_id
       WHERE t.outlet_id=? AND t.status<>'dibatalkan' AND t.created_at>=? AND t.created_at<? GROUP BY i.service_name ORDER BY value DESC LIMIT 8`, [outletId, a, b]),
  ]);
  const m = (rows: any[]) => new Map(rows.map((r) => [r.k, Number(r.v)]));
  const mo = m(sOmzet), mc = m(sCash), me = m(sExp);
  const series = bucketKeys(from, end, monthly).map((k) => {
    const omzet = mo.get(k) || 0, kas = mc.get(k) || 0, peng = me.get(k) || 0;
    return { date: k, omzet, kas_masuk: kas, pengeluaran: peng, laba_akrual: omzet - peng, arus_kas_bersih: kas - peng };
  });
  const omzet = Number(orders!.omzet), kas = Number(cash!.v), peng = Number(exp!.v);
  return {
    period: { from, to: end, bucket: monthly ? 'bulan' : 'hari' },
    kpi: {
      omzet, kas_masuk: kas, piutang: Number(piutang!.v), piutang_order: Number(piutang!.n), pengeluaran: peng,
      laba_akrual: omzet - peng, arus_kas_bersih: kas - peng,
      order_masuk: Number(orders!.masuk), order_selesai: Number(orders!.selesai),
    },
    series, byCategory, byService,
    definitions: {
      omzet: 'Total nilai order (tidak dibatalkan) yang dibuat pada periode.',
      kas_masuk: 'Pembayaran yang benar-benar diterima pada periode (DP dan pelunasan masing-masing dihitung sekali; refund mengurangi).',
      piutang: 'Sisa tagihan semua order aktif yang belum lunas, per hari ini.',
      pengeluaran: 'Biaya yang dicatat pada periode.',
      laba_akrual: 'Omzet − Pengeluaran. Laba sederhana berbasis nilai order, bukan uang kas.',
      arus_kas_bersih: 'Kas masuk − Pengeluaran. Ini arus kas, bukan laba bersih.',
    },
  };
}
