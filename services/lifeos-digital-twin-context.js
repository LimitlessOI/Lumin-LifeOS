/**
 * SYNOPSIS: Exports getTwinContextForUser — services/lifeos-digital-twin-context.js.
 */
import { Client } from 'pg';

export async function getTwinContextForUser(db, userId) {
  const identityQuery = 'SELECT id, name FROM users WHERE id = $1';
  const notesQuery = 'SELECT note FROM lifeos_notes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5';
  const commitmentsQuery = 'SELECT commitment FROM twin_simulator WHERE user_id = $1 AND status = $2';
  const emotionalStateQuery = 'SELECT state FROM flourishing_preferences WHERE user_id = $1';
  const uiDirectivesQuery = 'SELECT directive FROM ui_directives WHERE user_id = $1';
  const energyLevelQuery = 'SELECT energy_level FROM users WHERE id = $1';

  const identityResult = await db.query(identityQuery, [userId]);
  const notesResult = await db.query(notesQuery, [userId]);
  const commitmentsResult = await db.query(commitmentsQuery, [userId, 'open']);
  const emotionalStateResult = await db.query(emotionalStateQuery, [userId]);
  const uiDirectivesResult = await db.query(uiDirectivesQuery, [userId]);
  const energyLevelResult = await db.query(energyLevelQuery, [userId]);

  return {
    identity: identityResult.rows[0],
    recentNotes: notesResult.rows.map(row => row.note),
    openCommitments: commitmentsResult.rows.map(row => row.commitment),
    emotionalState: emotionalStateResult.rows[0]?.state,
    uiDirectives: uiDirectivesResult.rows.map(row => row.directive),
    energyLevel: energyLevelResult.rows[0]?.energy_level,
  };
}

export function injectTwinContext(prompt, userId) {
  return `${prompt} | User Twin Context: ${userId}`;
}

export async function updateTwinFromInteraction(db, userId, message, reply) {
  const insertQuery = 'INSERT INTO twin_store (user_id, message, reply, created_at) VALUES ($1, $2, $3, NOW())';
  await db.query(insertQuery, [userId, message, reply]);
}