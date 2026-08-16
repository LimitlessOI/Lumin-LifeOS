/**
 * SYNOPSIS: Service module — Task Authorization Envelope.
 * @typedef {object} TaskAuthorizationEnvelope
 * @property {function(string, string, object, object): Promise<string>} create - Creates a new task authorization envelope.
 */

/**
 * Creates a Task Authorization Envelope service.
 * This service manages the persistence of task authorization envelopes in the `agent_task_authority` table.
 *
 * @param {object} dependencies - The dependencies for the service.
 * @param {import('pg').Pool} dependencies.pool - The PostgreSQL connection pool.
 * @param {object} dependencies.logger - The logger instance.
 * @returns {TaskAuthorizationEnvelope} An object containing the create function.
 *
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md Overlay print §64 item 6: Task Authorization Envelope.
 */
export const createTaskAuthorizationEnvelope = ({ pool, logger }) => {
  /**
   * Creates a new task authorization envelope record in the database.
   *
   * @param {string} agentId - The ID of the agent associated with the task.
   * @param {string} taskId - The ID of the task.
   * @param {object} envelopeData - The JSON data representing the task authorization envelope.
   * @param {object} metadata - Additional metadata for the envelope.
   * @returns {Promise<string>} The ID of the created envelope.
   *
   * @ssot docs/products/universal-overlay/PRODUCT_HOME.md Overlay print §64 item 6: Task Authorization Envelope.
   */
  const create = async (agentId, taskId, envelopeData, metadata) => {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        INSERT INTO agent_task_authority (
          agent_id,
          task_id,
          envelope_data,
          metadata
        ) VALUES ($1, $2, $3, $4)
        RETURNING id;
        `,
        [agentId, taskId, envelopeData, metadata]
      );

      const newEnvelopeId = result.rows[0].id;
      logger.info(`Created task authorization envelope with ID: ${newEnvelopeId} for agent: ${agentId}, task: ${taskId}`);
      return newEnvelopeId;
    } catch (error) {
      logger.error(`Error creating task authorization envelope for agent ${agentId}, task ${taskId}: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  };

  /**
   * Verifies an existing task authorization envelope.
   *
   * @param {string} agentId - The ID of the agent associated with the task.
   * @param {string} taskId - The ID of the task.
   * @param {string} requiredScope - The scope required for authorization.
   * @returns {Promise<{ authorized: boolean, reason: string, envelope_id: string|null }>} Authorization result.
   */
  const verify = async (agentId, taskId, requiredScope) => {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        SELECT id, envelope_data
        FROM agent_task_authority
        WHERE agent_id = $1 AND task_id = $2
        ORDER BY created_at DESC
        LIMIT 1;
        `,
        [agentId, taskId]
      );

      if (result.rows.length === 0) {
        return { authorized: false, reason: 'No matching envelope found', envelope_id: null };
      }

      const { id, envelope_data } = result.rows[0];
      const { scope, expires_at } = envelope_data;

      if (!scope || (scope !== '*' && scope !== requiredScope)) {
        return { authorized: false, reason: 'Scope mismatch', envelope_id: id };
      }

      if (expires_at) {
        const expirationDate = new Date(expires_at);
        if (expirationDate < new Date()) {
          return { authorized: false, reason: 'Envelope expired', envelope_id: id };
        }
      }

      return { authorized: true, reason: 'Authorized', envelope_id: id };
    } catch (error) {
      logger.error(`Error verifying task authorization envelope for agent ${agentId}, task ${taskId}: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  };

  return {
    create,
    verify,
  };
};