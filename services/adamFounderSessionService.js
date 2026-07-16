/**
 * SYNOPSIS: Exports startFounderSession — services/adamFounderSessionService.js.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */

export async function startFounderSession({ userId, metadata = {} } = {}) {
  return { ok: true, userId, session_started_at: new Date().toISOString(), metadata };
}

export async function startAdamFounderSession({ userId, metadata = {} } = {}) {
  return { ok: true, userId, session_started_at: new Date().toISOString(), metadata };
}

export async function endAdamFounderSession({ userId }) {
  return { ok: true, userId, session_ended_at: new Date().toISOString() };
}
