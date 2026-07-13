/**
 * SYNOPSIS: Script — Wellness Studio Backfill.
 */
import pg from 'pg';

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL
});

const SELECT_ELIGIBLE_USERS = `
  WITH recent_activity AS (
    SELECT user_id
    FROM joy_checkins
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY user_id

    UNION

    SELECT user_id
    FROM integrity_score_log
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY user_id
  ),
  recent_sessions AS (
    SELECT user_id
    FROM wellness_studio_sessions
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY user_id
  )
  SELECT DISTINCT ra.user_id
  FROM recent_activity ra
  LEFT JOIN recent_sessions rs ON rs.user_id = ra.user_id
  WHERE rs.user_id IS NULL
`;

const INSERT_SESSION = `
  INSERT INTO wellness_studio_sessions (
    user_id,
    session_type,
    created_at,
    updated_at
  )
  VALUES ($1, $2, NOW(), NOW())
`;

async function main() {
  await client.connect();

  try {
    const { rows } = await client.query(SELECT_ELIGIBLE_USERS);
    let created = 0;

    for (const row of rows) {
      await client.query(INSERT_SESSION, [row.user_id, 'onboarding-backfill']);
      created += 1;
    }

    process.stdout.write(`${created}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});