/**
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * SYNOPSIS: Exports getTwinContextForUser — services/lifeos-digital-twin-context.js.
 */

export async function getTwinContextForUser(db, userId) {
  const identity = await db.query('SELECT id, display_name FROM lifeos_users WHERE id = $1', [userId]).then(r => r.rows[0]).catch(() => null);
  const recentNotes = await db.query('SELECT content FROM lifeos_notes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5', [userId]).then(r => r.rows.map(row => row.content)).catch(() => []);

  return {
    identity,
    recentNotes,
    openCommitments: [],
    emotionalState: null,
    uiDirectives: [],
    energyLevel: null,
  };
}

export function injectTwinContext(prompt, userId) {
  return `${prompt} | User Twin Context: ${userId}`;
}

export async function updateTwinFromInteraction(db, userId, message, reply) {
  await db.query(
    'INSERT INTO twin_store (user_id, message, reply, created_at) VALUES ($1, $2, $3, NOW())',
    [userId, message, reply]
  );
}
