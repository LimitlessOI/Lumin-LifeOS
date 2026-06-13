/**
 * Founder harmless system actions — DB/event writes without repo patches or BuilderOS.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { runSystemDirectStatusProbes } from './voice-rail-system-direct.js';
import { detectSystemActionIntent } from './lifeos-founder-command-class.js';

const RECEIPT_SOURCE = 'voice_rail_founder_system_action';
const RECEIPT_CHANNEL = 'founder_system_action';

/**
 * Insert a timestamped founder system receipt into lifeos_event_stream (Neon).
 * No git commit, no builder job, no repo file write.
 */
export async function createHarmlessSystemReceipt(pool, {
  userId,
  utterance,
  sessionId = null,
  kind = 'harmless_system_receipt',
}) {
  if (!pool?.query) {
    return {
      ok: false,
      status: 'BLOCKED',
      blocker: 'database_pool_unavailable',
      detail: 'lifeos_event_stream requires DATABASE_URL pool on Railway',
      route: null,
      builder_job_created: false,
    };
  }

  const text = String(utterance || '').trim();
  const createdAt = new Date().toISOString();
  const metadata = {
    schema: 'founder_system_receipt_v1',
    kind,
    created_at: createdAt,
    session_id: sessionId || null,
    no_repo_edit: true,
    requested_utterance: text.slice(0, 2000),
  };

  try {
    const { rows } = await pool.query(
      `INSERT INTO lifeos_event_stream
         (user_id, source, channel, text_content, status, detected_command, metadata, processed_at)
       VALUES ($1, $2, $3, $4, 'processed', $5, $6::jsonb, NOW())
       RETURNING id, created_at, user_id, source, channel, status`,
      [
        userId,
        RECEIPT_SOURCE,
        RECEIPT_CHANNEL,
        `[founder_system_receipt] ${text.slice(0, 1500)}`,
        'founder_system_receipt',
        JSON.stringify(metadata),
      ],
    );
    const row = rows[0];
    return {
      ok: true,
      status: 'SUCCESS',
      event_id: row.id,
      record_id: String(row.id),
      created_at: row.created_at,
      route: 'lifeos_event_stream INSERT (Neon)',
      function: 'createHarmlessSystemReceipt',
      verification_method: 'GET /api/v1/lifeos/voice-rail/connection-proof + event row id',
      builder_job_created: false,
      metadata,
    };
  } catch (err) {
    return {
      ok: false,
      status: 'BLOCKED',
      blocker: 'lifeos_event_stream_insert_failed',
      detail: err.message,
      route: 'lifeos_event_stream INSERT',
      missing_service: err.message?.includes('does not exist') ? 'lifeos_event_stream table' : null,
      builder_job_created: false,
    };
  }
}

export async function executeFounderSystemAction({
  pool,
  userId,
  utterance,
  sessionId,
  baseUrl,
  commandKey,
  connectionProbe,
}) {
  const intent = detectSystemActionIntent(utterance);
  if (!intent) {
    return {
      ok: false,
      status: 'BLOCKED',
      blocker: 'not_a_system_action',
      detail: 'Utterance did not match system-action classifier',
      builder_job_created: false,
    };
  }

  const probes = await runSystemDirectStatusProbes({ baseUrl, commandKey, connectionProbe });
  const connProbe = probes.find((p) => p.path?.includes('connection-proof') || p.path === 'probeFounderContext');
  const connected = connProbe?.body?.connected === true || connProbe?.body?.ok === true;

  const receipt = await createHarmlessSystemReceipt(pool, {
    userId,
    utterance,
    sessionId,
    kind: intent.kind,
  });

  return {
    ...receipt,
    connection_probe: {
      connected,
      level: connProbe?.body?.context_health?.level || connProbe?.body?.level || null,
      probe_count: probes.length,
    },
    probes_summary: probes.map((p) => ({
      path: p.path,
      status: p.status,
      ok: p.ok,
      connected: p.body?.connected,
    })),
  };
}

export function formatFounderSystemActionReply(route, result) {
  const lines = [
    'INTENT-FIRST ROUTING',
    `lane: ${route.lane}`,
    `confidence: ${route.confidence}`,
    `reason: ${route.reason || '—'}`,
    '',
    'LIFEOS SYSTEM ACTION',
    `status: ${result.status}`,
  ];

  if (result.status === 'SUCCESS') {
    lines.push(`record_id: ${result.record_id || result.event_id || '—'}`);
    lines.push(`created_at: ${result.created_at || '—'}`);
    lines.push(`route: ${result.route || '—'}`);
    lines.push(`function: ${result.function || '—'}`);
    lines.push(`verification: ${result.verification_method || '—'}`);
    lines.push(`builder_job_created: ${result.builder_job_created === true}`);
    if (result.connection_probe) {
      lines.push(`connection_connected: ${result.connection_probe.connected}`);
      lines.push(`context_level: ${result.connection_probe.level || '—'}`);
    }
    return lines.join('\n');
  }

  lines.push(`blocker: ${result.blocker || '—'}`);
  lines.push(`detail: ${result.detail || '—'}`);
  if (result.missing_service) lines.push(`missing_service: ${result.missing_service}`);
  lines.push(`builder_job_created: ${result.builder_job_created === true}`);
  lines.push('repo_edit_attempted: false');
  return lines.join('\n');
}
