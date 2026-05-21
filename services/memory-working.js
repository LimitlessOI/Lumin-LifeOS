import { createCandidate } from './memory-candidate.js';

/**
 * Writes a new entry into working memory.
 * @param {string} sessionId - The ID of the current session.
 * @param {string} capsuleId - The ID of the capsule associated with this entry.
 * @param {string} taskScope - The scope of the task this entry relates to.
 * @param {string} lane - The retrieval lane this entry was placed in.
 * @param {object} content - The actual content of the memory entry (JSONB).
 * @param {object} pool - The database connection pool.
 * @returns {Promise<{id: string}>} The ID of the newly created working memory entry.
 */
export async function writeWorkingMemoryEntry(sessionId, capsuleId, taskScope, lane, content, pool) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO working_memory_entries (session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at, used_in_decision)
       VALUES ($1, $2, $3, $4, $5, NOW(), FALSE)
       RETURNING id`,
      [sessionId, capsuleId, taskScope, lane, content]
    );
    return { id: result.rows[0].id };
  } finally {
    client.release();
  }
}

/**
 * Marks a working memory entry as used in a decision.
 * @param {string} entryId - The ID of the working memory entry.
 * @param {string} decisionRef - A reference to the decision where this entry was used.
 * @param {object} pool - The database connection pool.
 * @returns {Promise<void>}
 */
export async function markUsedInDecision(entryId, decisionRef, pool) {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE working_memory_entries
       SET used_in_decision = TRUE, decision_ref = $2
       WHERE id = $1`,
      [entryId, decisionRef]
    );
  } finally {
    client.release();
  }
}

/**
 * Deletes all unused working memory entries for a given session.
 * @param {string} sessionId - The ID of the session.
 * @param {object} pool - The database connection pool.
 * @returns {Promise<{deleted_count: number}>} The number of entries deleted.
 */
export async function discardUnusedEntries(sessionId, pool) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `DELETE FROM working_memory_entries
       WHERE session_id = $1 AND used_in_decision = FALSE
       RETURNING id`, // Returning id to count deleted rows
      [sessionId]
    );
    return { deleted_count: result.rowCount };
  } finally {
    client.release();
  }
}

/**
 * Retrieves all working memory entries for a given session, ordered by injection time.
 * @param {string} sessionId - The ID of the session.
 * @param {object} pool - The database connection pool.
 * @returns {Promise<Array<object>>} An array of working memory entries.
 */
export async function replayWorkingMemory(sessionId, pool) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM working_memory_entries
       WHERE session_id = $1
       ORDER BY injected_at ASC`,
      [sessionId]
    );
    return result.rows;
  } finally {
    client.release();