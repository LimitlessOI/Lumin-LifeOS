/**
 * SYNOPSIS: Script — Wellness Studio Backfill.
 */
import pg from 'pg';

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const client = new Client({
  connectionString: DATABASE_URL,
});

const BACKFILL_SQL = `
WITH candidate_users AS (
  SELECT DISTINCT user_id
  FROM (
    SELECT user_id FROM joy_checkins
    UNION
    SELECT user_id FROM integrity_score_log
  ) AS activity
  WHERE user_id IS NOT NULL
),
users_needing_sessions AS (
  SELECT c.user_id
  FROM candidate_users c
  WHERE NOT EXISTS (
    SELECT 1
    FROM wellness_studio_sessions s
    WHERE s.user_id = c.user_id
      AND s.created_at >= NOW() - INTERVAL '30 days'
  )
)
INSERT INTO wellness_studio_sessions (user_id, session_type, created_at, updated_at)
SELECT user_id, $1, NOW(), NOW()
FROM users_needing_sessions
RETURNING id;
`;

async function main() {
  await client.connect();

  try {
    const result = await client.query(BACKFILL_SQL, ['onboarding-backfill']);
    process.stdout.write(`${result.rowCount ?? 0}\n`);
  } finally {
    await client.end();
  }
}

await main();