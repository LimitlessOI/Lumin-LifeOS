/**
 * SYNOPSIS: services/memory-working.js
 */
// services/memory-working.js
/** @ssot docs/products/memory-system/PRODUCT_HOME.md */
import { createCandidate } from './memory-candidate.js';

export async function writeWorkingMemoryEntry(sessionId, capsuleId, taskScope, lane, content, pool) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO working_memory_entries
         (session_id, capsule_id, task_scope, retrieval_lane, entry_content, injected_at, used_in_decision)
       VALUES ($1, $2, $3, $4, $5, NOW(), FALSE)
       RETURNING id`,
      [sessionId, capsuleId, taskScope, lane, content]
    );
    return { id: result.rows[0].id };
  } finally {
    client.release();
  }
}

export async function markUsedInDecision(entryId, decisionRef, pool) {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE working_memory_entries SET used_in_decision = TRUE, decision_ref = $2 WHERE id = $1`,
      [entryId, decisionRef]
    );
  } finally {
    client.release();
  }
}

export async function discardUnusedEntries(sessionId, pool) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `DELETE FROM working_memory_entries WHERE session_id = $1 AND used_in_decision = FALSE RETURNING id`,
      [sessionId]
    );
    return { deleted_count: result.rowCount };
  } finally {
    client.release();
  }
}

export async function replayWorkingMemory(sessionId, pool) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM working_memory_entries WHERE session_id = $1 ORDER BY injected_at ASC`,
      [sessionId]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

export async function promoteToCandidate(entryId, pool) {
  const client = await pool.connect();
  try {
    const entry = await client.query(
      `SELECT * FROM working_memory_entries WHERE id = $1 AND used_in_decision = TRUE`,
      [entryId]
    );
    if (!entry.rows[0]) {
      throw new Error(`Working memory entry ${entryId} not found or not used in a decision`);
    }
    const signal = {
      content: typeof entry.rows[0].entry_content === 'string'
        ? entry.rows[0].entry_content
        : JSON.stringify(entry.rows[0].entry_content),
      domain: entry.rows[0].task_scope || 'general',
    };
    const clientProxy = { query: (...args) => client.query(...args) };
    const candidate = await createCandidate(signal, clientProxy);
    return candidate;
  } finally {
    client.release();
  }
}
