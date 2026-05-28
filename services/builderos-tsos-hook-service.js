import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export async function emitTSOSHookReading(pool, data) {
  try {
    const result = await pool.query(
      `
        INSERT INTO autonomous_telemetry_events (
          task_type,
          model_used,
          total_token_estimate,
          task_description,
          metadata
        )
        VALUES (
          'tsos_internal_hook',
          $1,
          0,
          'builderos_governed_loop_commit',
          to_jsonb($2)
        )
        RETURNING id
      `,
      [data.modelUsed, data]
    );
    return { ok: true, row_id: result.rows[0].id };
  } catch (error) {
    console.error('Error emitting TSOS hook reading:', error);
    return { ok: false, error };
  }
}