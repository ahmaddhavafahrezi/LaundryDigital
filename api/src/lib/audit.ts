import { exec, pool } from '../db.js';

export async function log(
  conn: any, outletId: number, user: { id?: number; name?: string } | null,
  action: string, entity: string | null, entityId: string | number | null, summary: string, ip?: string,
) {
  await exec(
    'INSERT INTO activity_logs (outlet_id,user_id,user_name,action,entity,entity_id,summary,ip) VALUES (?,?,?,?,?,?,?,?)',
    [outletId, user?.id ?? null, user?.name ?? null, action, entity, entityId == null ? null : String(entityId), summary.slice(0, 500), ip ?? null],
    conn ?? pool,
  );
}
