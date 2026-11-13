# Dokumentasi API  — prefix `/api/v1`
Semua respons error: `{ "error": { "message": "..." } }`. Auth: cookie `token` (HttpOnly).
Peran: **O** owner, **K** karyawan (dengan izin), **P** publik.

| Metode & path | Peran | Keterangan |
|---|---|---|
| POST /auth/login · /auth/logout · GET /auth/me · POST /auth/change-password | P / semua | Rate limit 10 percobaan / 10 menit |
| GET /dashboard/owner?range=hari_ini\|7_hari\|bulan_ini\|bulan_lalu\|tahun_ini\|custom&from&to | O | KPI, seri, kategori, layanan, status, aktivitas |
| GET /dashboard/employee | O,K | Ringkasan pekerjaan |
| GET/POST /customers · GET/PATCH /customers/:id | O,K | Cari `q`, `page`; nomor telepon unik |
| GET /services (`?all=1` owner) · POST/PATCH /services | GET: O,K · tulis: O | |
| GET/POST /transactions · GET /transactions/:id | O,K | Filter `q,status,payment_status,outstanding,from,to,page` |
| POST /transactions/:id/status | O,K | Hanya maju; tahap opsional boleh dilewati; ambil wajib lunas |
| POST /transactions/:id/payments | O, K(`can_payment`) | Tidak boleh melebihi sisa tagihan |
| PATCH /transactions/:id/items/:itemId | O, K(`can_correct`) | Koreksi qty, alasan wajib |
| POST /transactions/:id/cancel | O, K(`can_correct`) | Alasan wajib; refund otomatis bila sudah bayar |
| GET/POST/PATCH /expenses · GET /expenses/categories | O | |
| GET /reports/summary · GET /reports/export | O | Ekspor CSV (`;`, UTF-8 BOM) |
| GET/POST/PATCH /employees · POST /employees/:id/reset-password | O | |
| GET /activity | O | |
| GET /public/outlet · /public/services · POST /public/tracking/lookup | P | Lookup rate limit 20 / 5 menit; nama & telepon tersamarkan |
