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
WITH eligible_users AS (
  SELECT DISTINCT user_id
  FROM (
    SELECT user_id FROM joy_checkins
    UNION
    SELECT user_id FROM integrity_score_log
  ) src
  WHERE user_id IS NOT NULL
),
missing_sessions AS (
  SELECT eu.user_id
  FROM eligible_users eu
  WHERE NOT EXISTS (
    SELECT 1
    FROM wellness_studio_sessions wss
    WHERE wss.user_id = eu.user_id
      AND wss.created_at >= NOW() - INTERVAL '30 days'
  )
)
INSERT INTO wellness_studio_sessions (user_id, session_type, created_at, updated_at)
SELECT user_id, $1, NOW(), NOW()
FROM missing_sessions
RETURNING id;
`;

async function main() {
  await client.connect();
  try {
    const result = await client.query(BACKFILL_SQL, ['onboarding-backfill']);
    console.log(result.rowCount ?? 0);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});