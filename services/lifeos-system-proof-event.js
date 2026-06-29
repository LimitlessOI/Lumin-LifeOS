/**
 * SYNOPSIS: Harmless LifeOS system proof events — DB records for provider API → tool → action proof.
 * Harmless LifeOS system proof events — DB records for provider API → tool → action proof.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
const PROOF_SOURCE = 'provider_tool_action';
const PROOF_CHANNEL = 'system_proof_event';
const PROOF_SCHEMA = 'lifeos_system_proof_event_v1';

export const PROOF_TOOL_NAME = 'create_lifeos_system_proof_event';

export function proofToolDefinition() {
  return {
    name: PROOF_TOOL_NAME,
    description:
      'Create a harmless timestamped proof event record in LifeOS. Call when asked to prove API-to-system action.',
    parameters: {
      type: 'object',
      properties: {
        note: {
          type: 'string',
          description: 'Optional short note stored on the proof record',
        },
      },
      additionalProperties: false,
    },
  };
}

export function verificationPathForProofEvent(id, baseUrl = null) {
  const path = `/api/v1/lifeos/system-proof-event/${id}`;
  if (baseUrl) return `${String(baseUrl).replace(/\/$/, '')}${path}`;
  return path;
}

export function verificationCurlForProofEvent(id, baseUrl = null) {
  const url = verificationPathForProofEvent(id, baseUrl || '${PUBLIC_BASE_URL}');
  return `curl -sS -H "x-command-key: $COMMAND_CENTER_KEY" "${url}"`;
}

/**
 * Insert a system proof event into lifeos_event_stream (Neon). No repo writes.
 */
export async function createSystemProofEvent(pool, {
  userId,
  provider = null,
  model = null,
  providerRequestId = null,
  toolName = PROOF_TOOL_NAME,
  note = null,
  utterance = null,
  sessionId = null,
  toolInput = null,
}) {
  if (!pool?.query) {
    return {
      ok: false,
      error: 'database_pool_unavailable',
      detail: 'lifeos_event_stream requires DATABASE_URL pool',
    };
  }
  if (!userId) {
    return { ok: false, error: 'user_id_required' };
  }

  const createdAt = new Date().toISOString();
  const metadata = {
    schema: PROOF_SCHEMA,
    kind: 'system_proof_event',
    created_at: createdAt,
    provider: provider || null,
    model: model || null,
    provider_request_id: providerRequestId || null,
    tool_name: toolName || PROOF_TOOL_NAME,
    tool_input: toolInput || null,
    note: note || null,
    session_id: sessionId || null,
    no_repo_edit: true,
    requested_utterance: utterance ? String(utterance).slice(0, 2000) : null,
  };

  try {
    const { rows } = await pool.query(
      `INSERT INTO lifeos_event_stream
         (user_id, source, channel, text_content, status, detected_command, metadata, processed_at)
       VALUES ($1, $2, $3, $4, 'processed', $5, $6::jsonb, NOW())
       RETURNING id, created_at, user_id, source, channel, status, metadata`,
      [
        userId,
        PROOF_SOURCE,
        PROOF_CHANNEL,
        `[system_proof_event] ${(note || 'provider_api_tool_proof').slice(0, 1500)}`,
        PROOF_TOOL_NAME,
        JSON.stringify(metadata),
      ],
    );
    const row = rows[0];
    return {
      ok: true,
      proof_event_id: row.id,
      record_id: String(row.id),
      created_at: row.created_at,
      timestamp: row.created_at,
      source: row.source,
      channel: row.channel,
      metadata: row.metadata,
      verification_endpoint: verificationPathForProofEvent(row.id),
    };
  } catch (err) {
    return {
      ok: false,
      error: 'lifeos_event_stream_insert_failed',
      detail: err.message,
    };
  }
}

export async function listSystemProofEvents(pool, userId, { limit = 20 } = {}) {
  if (!pool?.query) {
    return { ok: false, error: 'database_pool_unavailable' };
  }
  if (!userId) {
    return { ok: false, error: 'user_id_required' };
  }
  const lim = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 50);
  const { rows } = await pool.query(
    `SELECT id, user_id, source, channel, status, detected_command, metadata, created_at
     FROM lifeos_event_stream
     WHERE user_id = $1 AND source = $2 AND channel = $3
     ORDER BY created_at DESC
     LIMIT $4`,
    [userId, PROOF_SOURCE, PROOF_CHANNEL, lim],
  );
  return {
    ok: true,
    count: rows.length,
    events: rows.map((row) => ({
      proof_event_id: row.id,
      record_id: String(row.id),
      provider: row.metadata?.provider || null,
      model: row.metadata?.model || null,
      provider_request_id: row.metadata?.provider_request_id || null,
      tool_name: row.detected_command,
      status: row.status,
      created_at: row.created_at,
      timestamp: row.created_at,
      verified: row.metadata?.schema === PROOF_SCHEMA,
    })),
  };
}

export async function getSystemProofEvent(pool, id) {
  if (!pool?.query) {
    return { ok: false, error: 'database_pool_unavailable' };
  }
  const proofId = parseInt(String(id), 10);
  if (!Number.isFinite(proofId) || proofId <= 0) {
    return { ok: false, error: 'invalid_proof_event_id' };
  }

  const { rows } = await pool.query(
    `SELECT id, user_id, source, channel, text_content, status, detected_command, metadata, created_at, processed_at
     FROM lifeos_event_stream
     WHERE id = $1 AND source = $2 AND channel = $3
     LIMIT 1`,
    [proofId, PROOF_SOURCE, PROOF_CHANNEL],
  );
  if (!rows[0]) {
    return { ok: false, error: 'proof_event_not_found', proof_event_id: proofId };
  }
  const row = rows[0];
  return {
    ok: true,
    proof_event_id: row.id,
    record_id: String(row.id),
    user_id: row.user_id,
    source: row.source,
    channel: row.channel,
    status: row.status,
    tool_name: row.detected_command,
    metadata: row.metadata,
    created_at: row.created_at,
    timestamp: row.created_at,
    verified: row.metadata?.schema === PROOF_SCHEMA,
  };
}
