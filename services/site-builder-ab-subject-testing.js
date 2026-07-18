/**
 * SYNOPSIS: Exports createTest — services/site-builder-ab-subject-testing.js.
 */
export async function createTest(db, siteId, variantA, variantB) {
  const client = db?.query ? db : null;
  if (!client) throw new Error("createTest requires a pg client or pool with query()");
  const result = await client.query(
    `
    INSERT INTO subject_line_tests (site_id, variant_a, variant_b, status, winner, created_at, updated_at)
    VALUES ($1, $2, $3, 'active', NULL, NOW(), NOW())
    RETURNING id, site_id, variant_a, variant_b, status, winner, created_at, updated_at
    `,
    [siteId, variantA, variantB]
  );
  return result.rows[0];
}

export async function recordEvent(db, testId, variant, eventType) {
  const client = db?.query ? db : null;
  if (!client) throw new Error("recordEvent requires a pg client or pool with query()");
  const normalizedVariant = String(variant).toLowerCase();
  const normalizedEventType = String(eventType).toLowerCase();

  const result = await client.query(
    `
    INSERT INTO subject_line_test_events (test_id, variant, event_type, created_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING id, test_id, variant, event_type, created_at
    `,
    [testId, normalizedVariant, normalizedEventType]
  );
  return result.rows[0];
}

async function getCounts(db, testId) {
  const client = db?.query ? db : null;
  if (!client) throw new Error("db client required");

  const result = await client.query(
    `
    SELECT
      variant,
      COUNT(*) FILTER (WHERE event_type = 'sent')::int AS sent_count,
      COUNT(*) FILTER (WHERE event_type = 'open')::int AS open_count
    FROM subject_line_test_events
    WHERE test_id = $1
    GROUP BY variant
    `,
    [testId]
  );

  const counts = {
    a: { sent: 0, open: 0 },
    b: { sent: 0, open: 0 },
  };

  for (const row of result.rows) {
    const variant = String(row.variant).toLowerCase();
    if (variant === "a" || variant === "b") {
      counts[variant] = {
        sent: Number(row.sent_count) || 0,
        open: Number(row.open_count) || 0,
      };
    }
  }

  return counts;
}

function openRate(stat) {
  if (!stat || stat.sent <= 0) return 0;
  return stat.open / stat.sent;
}

export async function pickVariant(db, testId) {
  const counts = await getCounts(db, testId);
  const aRate = openRate(counts.a);
  const bRate = openRate(counts.b);

  const aHasData = counts.a.sent > 0 || counts.a.open > 0;
  const bHasData = counts.b.sent > 0 || counts.b.open > 0;

  if (!aHasData && !bHasData) return "a";
  if (aRate > bRate) return "a";
  if (bRate > aRate) return "b";
  return "a";
}

export async function concludeTest(db, testId) {
  const client = db?.query ? db : null;
  if (!client) throw new Error("concludeTest requires a pg client or pool with query()");

  const counts = await getCounts(db, testId);
  const aRate = openRate(counts.a);
  const bRate = openRate(counts.b);

  let winner = null;
  if (aRate > bRate) winner = "a";
  else if (bRate > aRate) winner = "b";

  const result = await client.query(
    `
    UPDATE subject_line_tests
    SET status = 'concluded',
        winner = $2,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, site_id, variant_a, variant_b, status, winner, created_at, updated_at
    `,
    [testId, winner]
  );

  return result.rows[0] || null;
}