import { fileURLToPath } from 'url';
import path from 'path';

// @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIN_INSTRUCTION_LENGTH = 5;
const DANGEROUS_STRINGS = [
  'DROP TABLE',
  'DELETE DATABASE',
  'EXPOSE SECRET',
  'ROTATE PROD SECRET',
  'IRREVERSIBLE_LAUNCH',
];

/**
 * Retrieves the current global halt state for BuilderOS.
 * @param {object} pool - PostgreSQL connection pool.
 * @returns {Promise<{active: boolean, reason: string|null}>} The global halt state.
 */
export async function getCommandControlHaltState(pool) {
  const query = `
    SELECT value
    FROM builderos_command_control_state
    WHERE key = 'global_halt';
  `;
  const result = await pool.query(query);
  if (result.rows.length > 0) {
    const state = result.rows[0].value;
    return {
      active: state.active === true,
      reason: typeof state.reason === 'string' ? state.reason : null,
    };
  }
  return { active: false, reason: null };
}

/**
 * Sets or updates the global halt state for BuilderOS.
 * @param {object} pool - PostgreSQL connection pool.
 * @param {{active: boolean, reason?: string|null}} payload - The halt state to set.
 * @returns {Promise<void>}
 */
export async function setCommandControlHalt(pool, payload) {
  const { active, reason = null } = payload;
  const haltValue = { active: !!active, reason: active ? (reason || 'Manual halt') : null };

  const query = `
    INSERT INTO builderos_command_control_state (key, value, created_at, updated_at)
    VALUES ('global