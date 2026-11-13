import mysql from 'mysql2/promise';
import type { PoolConnection } from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true, // DECIMAL dibaca sebagai number (nilai Rupiah bulat, aman)
  timezone: '+07:00',
});
pool.on('connection', (c: any) => c.query("SET time_zone='+07:00'"));

export type Row = any;
type Conn = PoolConnection | typeof pool;

export async function q<T = Row>(sql: string, params: any[] = [], conn: Conn = pool): Promise<T[]> {
  const [rows] = await conn.query(sql, params);
  return rows as T[];
}
export async function q1<T = Row>(sql: string, params: any[] = [], conn: Conn = pool): Promise<T | undefined> {
  return (await q<T>(sql, params, conn))[0];
}
export async function exec(sql: string, params: any[] = [], conn: Conn = pool) {
  const [res] = await conn.query(sql, params);
  return res as { insertId: number; affectedRows: number };
}
export async function tx<T>(fn: (c: PoolConnection) => Promise<T>): Promise<T> {
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const r = await fn(c);
    await c.commit();
    return r;
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
