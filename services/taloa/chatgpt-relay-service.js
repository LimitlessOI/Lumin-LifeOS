/**
 * SYNOPSIS: Exports createChatGptRelayService — services/taloa/chatgpt-relay-service.js.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

import { randomUUID } from 'node:crypto';

export function createChatGptRelayService({ pool, logger, envelope }) {
  if (!pool) {
    throw new Error('createChatGptRelayService: Missing required dependency: pool');
  }
  if (!logger) {
    throw new Error('createChatGptRelayService: Missing required dependency: logger');
  }
  if (!envelope) {
    throw new Error('createChatGptRelayService: Missing required dependency: envelope');
  }

  const allowedRoles = ['founder', 'chatgpt', 'claude'];
  const allowedSources = ['overlay_capsule', 'manual'];

  async function startRelayTask(founderInstruction, agentId) {
    const taskId = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now

    const result = await envelope.create(agentId, taskId, { scope: 'chatgpt_relay', expires_at: expiresAt }, { founderInstruction });

    return { task_id: taskId, authorized: result.authorized };
  }

  async function recordTurn(taskId, { role, content, source }) {
    if (!allowedRoles.includes(role)) {
      throw new Error(`recordTurn: Invalid role "${role}". Must be one of: ${allowedRoles.join(', ')}`);
    }
    if (!allowedSources.includes(source)) {
      throw new Error(`recordTurn: Invalid source "${source}". Must be one of: ${allowedSources.join(', ')}`);
    }

    await pool.query(
      `INSERT INTO taloa_chatgpt_relay_turns (task_id, role, content, source)
       VALUES ($1, $2, $3, $4)`,
      [taskId, role, content, source]
    );

    return {};
  }

  async function getRelayState(taskId) {
    const { rows } = await pool.query(
      `SELECT id, task_id, role, content, source, created_at
       FROM taloa_chatgpt_relay_turns
       WHERE task_id = $1
       ORDER BY created_at ASC`,
      [taskId]
    );

    return {
      task_id: taskId,
      turn_count: rows.length,
      turns: rows.map(row => ({
        id: row.id,
        role: row.role,
        content: row.content,
        source: row.source,
        created_at: row.created_at.toISOString(),
      })),
    };
  }

  async function authorizeAction(taskId, agentId, actionType) {
    // The actionType parameter is not directly used by envelope.verify
    // but is kept in the signature for potential future expansion or clarity.
    // The scope 'chatgpt_relay' is hardcoded here as per the spec.
    return await envelope.verify(agentId, taskId, 'chatgpt_relay');
  }

  return {
    startRelayTask,
    recordTurn,
    getRelayState,
    authorizeAction,
  };
}