/**
 * Seed development. JANGAN dipakai di produksi.
 *   npm run seed        -> data dasar (outlet, akun owner & kasir, layanan)
 *   npm run seed:demo   -> + pelanggan, transaksi, pembayaran, pengeluaran contoh 45 hari
 */
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { exec, pool, q, q1 } from './db.js';

const demo = process.argv.includes('--demo');
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pad = (n: number) => String(n).padStart(2, '0');
const wib = (d: Date) => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 19).replace('T', ' ');

async function base() {
  if (await q1('SELECT id FROM outlets LIMIT 1')) return console.log('Data dasar sudah ada, dilewati.');
  const o = await exec('INSERT INTO outlets (name,tagline,address,phone,open_hours) VALUES (?,?,?,?,?)', [
    'Laundry Bersih Jaya', 'Cucian wangi, rapi, tepat waktu.', 'Jl. Contoh No. 12, Padang, Sumatera Barat', '0812-3456-7890', 'Setiap hari 07.00 – 21.00 WIB']);
  await exec('INSERT INTO users (outlet_id,name,username,email,password_hash,role,can_discount,can_correct,can_payment,must_change_password) VALUES (?,?,?,?,?,?,1,1,1,1)',
    [o.insertId, 'Owner Demo', 'owner', 'owner@laundry.local', await bcrypt.hash('owner12345', 10), 'owner']);
  await exec('INSERT INTO users (outlet_id,name,username,email,password_hash,role,can_discount,can_correct,can_payment,must_change_password) VALUES (?,?,?,?,?,?,0,0,1,1)',
    [o.insertId, 'Kasir Demo', 'kasir', 'kasir@laundry.local', await bcrypt.hash('kasir12345', 10), 'karyawan']);
  const svc: any[] = [
    ['Cuci Kering', 'Dicuci dan dikeringkan, dilipat rapi', 'kiloan', 'kg', 6000, 48],
    ['Cuci Setrika', 'Cuci, kering, setrika uap, kemas plastik', 'kiloan', 'kg', 8000, 48],
    ['Setrika Saja', 'Setrika pakaian bersih', 'kiloan', 'kg', 5000, 24],
    ['Bed Cover', 'Bed cover single / double', 'satuan', 'pcs', 35000, 72],
    ['Selimut', 'Selimut tebal / bulu', 'satuan', 'pcs', 25000, 72],
    ['Jaket', 'Jaket kulit sintetis, parka, hoodie', 'satuan', 'pcs', 20000, 48],
    ['Sepatu', 'Cuci sepatu luar-dalam', 'satuan', 'pasang', 30000, 72],
    ['Karpet', 'Karpet per meter persegi', 'satuan', 'm²', 15000, 96],
    ['Paket Hemat Keluarga', 'Cuci setrika 10 kg, hemat', 'paket', 'paket', 70000, 48],
  ];
  for (const s of svc) await exec('INSERT INTO services (outlet_id,name,description,category,unit,price,est_hours) VALUES (?,?,?,?,?,?,?)', [o.insertId, ...s]);
  console.log('Data dasar dibuat. Login: owner / owner12345 , kasir / kasir12345 (wajib diganti!)');
}

async function demoData() {
  if ((await q1('SELECT COUNT(*) n FROM transactions'))!.n > 0) return console.log('Transaksi sudah ada, demo dilewati.');
  const outlet = (await q1('SELECT id FROM outlets LIMIT 1'))!.id;
  const users = await q('SELECT id FROM users WHERE outlet_id=?', [outlet]);
  const services = await q('SELECT * FROM services WHERE outlet_id=?', [outlet]);
  const names = ['Budi Santoso', 'Siti Aminah', 'Rina Wulandari', 'Andi Pratama', 'Dewi Lestari', 'Fajar Hidayat', 'Maya Sari', 'Rudi Hartono', 'Nina Kurnia', 'Hendra Gunawan', 'Putri Ayu', 'Agus Salim', 'Lia Marlina', 'Doni Saputra', 'Yuni Astuti', 'Bayu Nugroho', 'Citra Dewi', 'Eko Prasetyo', 'Fitri Handayani', 'Gilang Ramadhan', 'Heni Susanti', 'Irfan Maulana', 'Jihan Aulia', 'Kevin Wijaya'];
  const cust: number[] = [];
  for (let i = 0; i < names.length; i++) {
    const r = await exec('INSERT INTO customers (outlet_id,name,phone,is_member,points,created_at) VALUES (?,?,?,?,?,?)',
      [outlet, names[i], `08${ri(11, 99)}${ri(1000000, 9999999)}`, i % 4 === 0 ? 1 : 0, 0, wib(new Date(Date.now() - ri(10, 60) * 864e5))]);
    cust.push(r.insertId);
  }
  const flow = ['diterima', 'menunggu_antrean', 'sedang_dicuci', 'pengeringan', 'penyetrikaan', 'pengemasan', 'siap_diambil', 'sudah_diambil'];
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let n = 0;
  for (let back = 44; back >= 0; back--) {
    const perDay = ri(3, 7) + (back % 7 === 5 ? 2 : 0);
    for (let k = 0; k < perDay; k++) {
      const created = new Date(Date.now() - back * 864e5);
      created.setUTCHours(ri(1, 12), ri(0, 59), 0); // 08.00–19.59 WIB
      if (created.getTime() > Date.now()) created.setTime(Date.now() - ri(1, 5) * 3600e3);
      const lines = Array.from({ length: ri(1, 2) }, () => {
        const s = back % 5 === 0 && Math.random() < 0.4 ? pick(services.filter((x: any) => x.category !== 'kiloan')) : pick(services);
        const qty = s.category === 'kiloan' ? ri(20, 90) / 10 : s.category === 'satuan' ? ri(1, 3) : 1;
        return { s, qty, subtotal: Math.round(s.price * qty) };
      });
      const speed = pick(['reguler', 'reguler', 'reguler', 'express', 'kilat']);
      const subtotal = lines.reduce((a, l) => a + l.subtotal, 0);
      const fee = Math.round(subtotal * (speed === 'express' ? 0.3 : speed === 'kilat' ? 0.6 : 0));
      const total = subtotal + fee;
      const ageH = back * 24 + ri(0, 6);
      const idx = ageH > 100 ? 7 : ageH > 60 ? pick([6, 7, 7]) : ageH > 30 ? ri(3, 6) : ageH > 8 ? ri(1, 4) : ri(0, 2);
      const status = Math.random() < 0.03 && idx < 7 ? 'dibatalkan' : flow[idx];
      const paidFull = status === 'sudah_diambil' || (status !== 'dibatalkan' && Math.random() < 0.45);
      const dp = !paidFull && status !== 'dibatalkan' && Math.random() < 0.5 ? Math.round(total * 0.5 / 1000) * 1000 : 0;
      const paid = status === 'dibatalkan' ? 0 : paidFull ? total : dp;
      const est = new Date(created.getTime() + Math.max(...lines.map((l) => l.s.est_hours)) * 3600e3);
      const uid = pick(users).id;
      const t = await exec(
        `INSERT INTO transactions (outlet_id,invoice_no,tracking_token,customer_id,received_by,speed,subtotal,speed_fee,total,paid_amount,payment_status,status,est_done,cancel_reason,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [outlet, `LDY-${wib(created).slice(2, 10).replace(/-/g, '')}-${Array.from(randomBytes(4), (b) => ALPHA[b % 32]).join('')}`, randomBytes(9).toString('base64url'),
          pick(cust), uid, speed, subtotal, fee, total, paid, paid >= total ? 'lunas' : paid > 0 ? 'dp' : 'belum_lunas', status, wib(est),
          status === 'dibatalkan' ? 'Pelanggan membatalkan order' : null, wib(created)]);
      for (const l of lines)
        await exec('INSERT INTO transaction_items (transaction_id,service_id,service_name,category,unit,qty,price,subtotal) VALUES (?,?,?,?,?,?,?,?)', [t.insertId, l.s.id, l.s.name, l.s.category, l.s.unit, l.qty, l.s.price, l.subtotal]);
      const upto = status === 'dibatalkan' ? 0 : idx;
      for (let i = 0; i <= upto; i++)
        await exec('INSERT INTO status_histories (transaction_id,from_status,to_status,user_id,note,created_at) VALUES (?,?,?,?,?,?)',
          [t.insertId, i ? flow[i - 1] : null, flow[i], uid, i ? null : 'Order dibuat', wib(new Date(created.getTime() + i * ((ageH * 3600e3) / 9)))]);
      if (status === 'dibatalkan') await exec("INSERT INTO status_histories (transaction_id,from_status,to_status,user_id,note,created_at) VALUES (?,'diterima','dibatalkan',?,?,?)", [t.insertId, uid, 'Pelanggan membatalkan order', wib(created)]);
      const method = pick(['tunai', 'tunai', 'transfer', 'qris']);
      if (paidFull && dp === 0 && paid > 0) {
        if (Math.random() < 0.3 && total >= 20000) {
          const half = Math.round(total * 0.4 / 1000) * 1000;
          await exec('INSERT INTO payments (outlet_id,transaction_id,amount,method,user_id,created_at) VALUES (?,?,?,?,?,?)', [outlet, t.insertId, half, method, uid, wib(created)]);
          await exec('INSERT INTO payments (outlet_id,transaction_id,amount,method,user_id,created_at) VALUES (?,?,?,?,?,?)', [outlet, t.insertId, total - half, method, uid, wib(new Date(Math.min(Date.now(), est.getTime())))]);
        } else await exec('INSERT INTO payments (outlet_id,transaction_id,amount,method,user_id,created_at) VALUES (?,?,?,?,?,?)', [outlet, t.insertId, total, method, uid, wib(created)]);
      } else if (paid > 0) await exec('INSERT INTO payments (outlet_id,transaction_id,amount,method,user_id,created_at) VALUES (?,?,?,?,?,?)', [outlet, t.insertId, paid, method, uid, wib(created)]);
      n++;
    }
  }
  const owner = (await q1("SELECT id FROM users WHERE role='owner'"))!.id;
  const ex = [['Sewa', 'Sewa ruko bulanan', 1500000, 1], ['Gaji', 'Gaji karyawan', 2400000, 28], ['Internet', 'Internet bulanan', 350000, 5]];
  for (let m = 0; m < 2; m++) for (const [c, d, a, day] of ex) {
    const dt = new Date(Date.now() - (m * 30 + 10) * 864e5); dt.setUTCDate(day as number);
    if (dt.getTime() <= Date.now()) await exec('INSERT INTO expenses (outlet_id,spent_on,category,description,amount,user_id) VALUES (?,?,?,?,?,?)', [outlet, wib(dt).slice(0, 10), c, d, a, owner]);
  }
  for (let w = 0; w < 7; w++) {
    const day = (k: number) => wib(new Date(Date.now() - (w * 7 + k) * 864e5)).slice(0, 10);
    await exec('INSERT INTO expenses (outlet_id,spent_on,category,description,amount,user_id) VALUES (?,?,?,?,?,?)', [outlet, day(1), 'Deterjen', 'Deterjen & pelembut', ri(180, 320) * 1000, owner]);
    await exec('INSERT INTO expenses (outlet_id,spent_on,category,description,amount,user_id) VALUES (?,?,?,?,?,?)', [outlet, day(3), 'Listrik', 'Token listrik', ri(150, 300) * 1000, owner]);
    await exec('INSERT INTO expenses (outlet_id,spent_on,category,description,amount,user_id) VALUES (?,?,?,?,?,?)', [outlet, day(4), 'Air', 'Tagihan air', ri(60, 120) * 1000, owner]);
    if (w % 2 === 0) await exec('INSERT INTO expenses (outlet_id,spent_on,category,description,amount,user_id) VALUES (?,?,?,?,?,?)', [outlet, day(2), 'Plastik', 'Plastik kemasan & hanger', ri(60, 110) * 1000, owner]);
  }
  await exec("INSERT INTO activity_logs (outlet_id,user_id,user_name,action,summary) VALUES (?,?,?,?,?)", [outlet, owner, 'Owner Demo', 'seed', `Data demo dibuat: ${n} transaksi`]);
  console.log(`Data demo dibuat: ${n} transaksi, ${names.length} pelanggan.`);
}

await base();
if (demo) await demoData();
await pool.end();
