import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-hanya-untuk-development';
if (isProd && (jwtSecret.length < 32 || jwtSecret.startsWith('dev-') || jwtSecret.startsWith('ganti'))) {
  throw new Error('JWT_SECRET produksi harus diisi string acak minimal 32 karakter.');
}

export const config = {
  port: Number(process.env.PORT || 3001),
  isProd,
  jwtSecret,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'laundry_db',
  },
};
