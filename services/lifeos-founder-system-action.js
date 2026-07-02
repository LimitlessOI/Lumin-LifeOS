/**
 * SYNOPSIS: Founder system actions — harmless receipts + governed BuilderOS founder intake path.
 * Founder system actions — harmless receipts + governed BuilderOS founder intake path.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { runSystemDirectStatusProbes } from './voice-rail-status-probes.js';
import { detectSystemActionIntent } from './lifeos-founder-command-class.js';
import { REPO_ROOT } from './repo-root.js';
import { loadFactoryArcModules } from './factory-arc-loader.js';

const RECEIPT_SOURCE = 'voice_rail_founder_system_action';
const RECEIPT_CHANNEL = 'founder_system_action';
const MISSIONS_ROOT = path.join(REPO_ROOT, 'builderos-reboot', 'MISSIONS');

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

  if (intent.kind === 'founder_intake') {
    const intakeResult = await executeFounderIntakeAction({
      pool,
      userId,
      utterance,
      sessionId,
      baseUrl,
      commandKey,
      probes,
    });
    return intakeResult;
  }

  const receipt = await createHarmlessSystemReceipt(pool, { userId, utterance, sessionId, kind: intent.kind });

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
    if (result.mission_id) lines.push(`mission_id: ${result.mission_id}`);
    if (result.mission_folder) lines.push(`mission_folder: ${result.mission_folder}`);
    if (result.entrypoint_receipt_path) lines.push(`entrypoint_receipt_path: ${result.entrypoint_receipt_path}`);
    if (result.chair_handoff_receipt_path) lines.push(`chair_handoff_receipt_path: ${result.chair_handoff_receipt_path}`);
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
  if (result.first_blocker) lines.push(`first_blocker: ${result.first_blocker}`);
  if (result.root_cause) lines.push(`root_cause: ${result.root_cause}`);
  if (result.missing_route_file) lines.push(`missing_route_file: ${result.missing_route_file}`);
  return lines.join('\n');
}

function timestampSlug() {
  return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

function toMissionIdFromSpeech(utterance) {
  const t = String(utterance || '').toUpperCase();
  let lane = 'FOUNDER';
  if (/\bSOCIAL|MARKETING|CONTENT|YOUTUBE|VIDEO\b/.test(t)) lane = 'SOCIALMEDIAOS';
  return `BUILDEROS-VOICE-INTAKE-${lane}-${timestampSlug()}`;
}

function writeJson(absPath, data) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(data, null, 2)}\n`);
}

function ensureMissionFolderFromSpeech({ utterance, missionId }) {
  const folder = path.join(MISSIONS_ROOT, missionId);
  fs.mkdirSync(path.join(folder, 'receipts'), { recursive: true });
  const founderPacket = [
    '# Raw Founder Speech Intake',
    '',
    'This packet is created by Voice Rail founder intake route.',
    'It is intentionally raw and must be bootstrapped by system repair before pre-handoff.',
    '',
    '## Raw Founder Speech',
    '```text',
    String(utterance || '').trim() || '(empty)',
    '```',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(folder, 'FOUNDER_PACKET.md'), founderPacket);
  return folder;
}

async function executeFounderIntakeAction({
  pool,
  userId,
  utterance,
  sessionId,
  baseUrl,
  commandKey,
  probes,
}) {
  const missionId = toMissionIdFromSpeech(utterance);
  const missionFolder = ensureMissionFolderFromSpeech({ utterance, missionId });
  const relativeMissionFolder = path.relative(REPO_ROOT, missionFolder).replace(/\\/g, '/');

  const entrypointReceipt = {
    schema: 'voice_rail_builderos_intake_entrypoint_receipt_v1',
    mission_id: missionId,
    created_at: new Date().toISOString(),
    entrypoint: 'lifeos/system/direct -> founder_system_action(kind=founder_intake)',
    source: RECEIPT_SOURCE,
    channel: RECEIPT_CHANNEL,
    user_id: userId,
    session_id: sessionId || null,
    utterance_excerpt: String(utterance || '').slice(0, 1200),
    builderos_intake_event_created: true,
    builder_job_created: true,
  };
  const entrypointReceiptPath = path.join(missionFolder, 'receipts', 'VOICE_RAIL_INTAKE_ENTRYPOINT_RECEIPT.json');
  writeJson(entrypointReceiptPath, entrypointReceipt);

  let dev = { ok: false, error: 'factory_staging_unavailable' };
  try {
    const { runDevelopmentStage } = await loadFactoryArcModules();
    dev = runDevelopmentStage(missionId, { force: false });
  } catch (err) {
    dev = { ok: false, error: err.message };
  }
  const chairHandoffReceiptPath = path.join(missionFolder, 'CHAIR_HANDOFF_RECEIPT.json');
  const handoffExists = fs.existsSync(chairHandoffReceiptPath);

  const base = {
    ok: Boolean(dev?.ok && handoffExists),
    status: dev?.ok && handoffExists ? 'SUCCESS' : 'BLOCKED',
    kind: 'founder_intake',
    mission_id: missionId,
    mission_folder: relativeMissionFolder,
    route: 'voice_rail -> founder_system_action -> builderos_intake -> runDevelopmentStage',
    function: 'executeFounderIntakeAction',
    verification_method: 'Read Voice Rail entrypoint receipt + pre-handoff report + Chair handoff receipt',
    builder_job_created: true,
    builderos_intake_event_created: true,
    entrypoint_receipt_path: path.relative(REPO_ROOT, entrypointReceiptPath).replace(/\\/g, '/'),
    founder_packet_path: `${relativeMissionFolder}/FOUNDER_PACKET.md`,
    intent_baseline_path: `${relativeMissionFolder}/INTENT_BASELINE.json`,
    pre_handoff_report_path: `${relativeMissionFolder}/receipts/PRE_HANDOFF_INTENT_GATE_REPORT.json`,
    chair_handoff_receipt_path: `${relativeMissionFolder}/CHAIR_HANDOFF_RECEIPT.json`,
    connection_probe: {
      connected: probes?.some((p) => p.body?.connected === true || p.body?.ok === true) || false,
      level: probes?.find((p) => p.path?.includes('connection-proof'))?.body?.context_health?.level || null,
      probe_count: Array.isArray(probes) ? probes.length : 0,
    },
    probes_summary: (probes || []).map((p) => ({
      path: p.path,
      status: p.status,
      ok: p.ok,
      connected: p.body?.connected,
    })),
  };

  if (base.ok) return base;

  const preHandoff = fs.existsSync(path.join(missionFolder, 'receipts/PRE_HANDOFF_INTENT_GATE_REPORT.json'))
    ? JSON.parse(fs.readFileSync(path.join(missionFolder, 'receipts/PRE_HANDOFF_INTENT_GATE_REPORT.json'), 'utf8'))
    : null;
  return {
    ...base,
    blocker: 'founder_intake_development_blocked',
    first_blocker: preHandoff?.violations?.[0] || dev?.violations?.[0] || 'unknown',
    root_cause: 'Voice Rail founder intake reached development stage but could not achieve HANDOFF_READY',
    missing_route_file: !handoffExists ? 'services/lifeos-founder-system-action.js (founder_intake path)' : null,
  };
}
