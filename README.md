# Management Laundry Digital

Website manajemen laundry: **Hono + TypeScript** (backend), **React + Vite + Tailwind** (frontend), **MySQL / MariaDB** (database).
Tiga sisi pengguna: **Owner** (dashboard keuangan penuh), **Karyawan/Kasir** (order, status, pembayaran), **Pelanggan** (website publik + cek status tanpa login).

## Prasyarat
- Node.js 18+ (disarankan 20)
- MySQL 8 / MariaDB 10.4+ (XAMPP / Laragon / Docker boleh)

## Instalasi (5 langkah)

**1. Import database** — pilih salah satu:
- `database/laundry_demo.sql`  → struktur + data contoh (±240 order, grafik langsung terisi)
- `database/laundry_kosong.sql` → struktur + akun & layanan dasar saja
- `database/schema.sql` → struktur kosong sepenuhnya (lalu `npm run seed` / `seed:demo` di backend)

phpMyAdmin: tab **Import** → pilih file. Atau terminal: `mysql -u root -p < database/laundry_demo.sql`
(file membuat database `laundry_db`).

**2. Konfigurasi backend**
```bash
cd backend
cp .env.example .env      # sesuaikan DB_USER / DB_PASSWORD (XAMPP: root, kosong)
```

**3. Install dependensi**
```bash
cd ..            # kembali ke folder utama
npm run install:all
```

**4. Jalankan** (dua terminal)
```bash
npm run dev:backend      # API  → http://localhost:3001/api/v1
npm run dev:frontend     # Web  → http://localhost:5173
```

**5. Buka** http://localhost:5173
- Website pelanggan: `/` dan `/cek`
- Login staf: `/login`

### Akun demo (HANYA development)
| Peran | Username | Password |
|---|---|---|
| Owner | `owner` | `owner12345` |
| Kasir | `kasir` | `kasir12345` |

Aplikasi menampilkan banner agar password segera diganti (menu **Ganti password**). **Hapus/ganti akun ini sebelum produksi.**

## Fitur yang sudah ada
- Login owner/karyawan (JWT di cookie HttpOnly, bcrypt, rate limit login), tanpa registrasi publik
- RBAC dicek **di backend** (owner-only: laporan, tarif, karyawan, activity log); izin karyawan: pembayaran, diskon, koreksi/void
- Transaksi kiloan & satuan/paket, jenis pengerjaan reguler/express/kilat; **harga & total dihitung ulang di server**, snapshot harga per item
- Pembayaran tunai/transfer/QRIS(manual): DP, pelunasan, refund saat pembatalan; status pembayaran dihitung otomatis
- Alur status 8 tahap + dibatalkan, validasi urutan, tahap opsional bisa dilewati, riwayat status
- Koreksi berat dengan alasan wajib + audit log; order terbayar tidak dihapus, hanya dibatalkan
- Nota cetak (80 mm) dengan QR menuju halaman tracking; tracking publik dengan token acak, data tersamarkan, rate limit
- Dashboard owner (KPI + 6 grafik dari database, filter periode) dan dashboard karyawan
- Keuangan: laporan, pengeluaran per kategori, piutang, ekspor CSV (Excel), halaman definisi rumus
- Pelanggan (anti-duplikat nomor), layanan & tarif, karyawan, activity log

## Definisi keuangan
Omzet = nilai order · Kas masuk = pembayaran diterima · Piutang = sisa tagihan · Pengeluaran = biaya dicatat ·
Laba akrual = Omzet − Pengeluaran · Arus kas bersih = Kas masuk − Pengeluaran (**bukan laba**).

## Belum dikerjakan (tahap lanjutan sesuai PDF, Tahap 8)
Stok/persediaan, promo & voucher, poin member, antar-jemput, notifikasi in-app & WhatsApp, multi-outlet/SaaS billing, ekspor PDF
(sementara: Cetak nota → *Simpan sebagai PDF* dari browser; laporan → CSV).
Kolom `outlet_id` sudah ada di semua tabel bisnis sebagai fondasi multi-outlet.

## Pengujian
```bash
npm run typecheck
npm test
```

## Produksi
1. `NODE_ENV=production`, isi `JWT_SECRET` (≥32 karakter acak) — aplikasi menolak start jika masih default.
2. Pakai HTTPS; isi `CORS_ORIGINS` dengan domain frontend.
3. `npm run build` → sajikan `frontend/dist` lewat Nginx/Apache dan proxy `/api` ke backend (`npm --prefix backend start`).
4. Buat user database khusus (bukan root) dan jadwalkan backup: `mysqldump -u user -p laundry_db > backup.sql`; uji restore.
5. Ganti/hapus akun demo.

## Catatan penyimpangan dari PDF
- **MySQL** (sesuai permintaan) menggantikan PostgreSQL, dan **mysql2 + SQL langsung** menggantikan Prisma agar skema bisa diimport sebagai file `.sql`.
- UI memakai komponen Tailwind sendiri, tidak memakai shadcn/ui.
- Logout menghapus cookie; token tidak ada daftar pencabutan di server (masa berlaku 12 jam; akun nonaktif ditolak di setiap request).
