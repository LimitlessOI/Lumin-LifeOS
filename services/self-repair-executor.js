/**
 * Bounded autonomous self-repair executor.
 *
 * Runs only SYSTEM_AUTHORIZED_UNDER_PB repairs inside the approved Builder/OIL PB.
 * No secret logging, no destructive DB operations, no autonomy escalation.
 *
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 * @ssot docs/SSOT_NORTH_STAR.md Article II §2.16
 * @ssot docs/SSOT_COMPANION.md §0.5J
 */

import { buildSupervisedAutonomyReadiness } from './supervised-autonomy-readiness.js';
import { writeSecurityReceipt, SECURITY_RECEIPT_TYPES } from './oil-security-receipts.js';
import { normalizeSha, writeOilMissedIssueReceipt } from './oil-self-repair-detector.js';
import {
  OIL_AUDITOR_ROLE,
  writeOILAuditReceipt,
  createBuildSessionId,
  createAuditSessionId,
} from './builder-audit-before-done.js';

export const EXECUTOR_MAX_ATTEMPTS = 2;

const SUPPORTED_REPAIR_IDS = new Set([
  'DR-003-RECEIPT-STALE',
  'all_authorized',
]);

const CHAIN_STEPS = Object.freeze([
  {
    code: 'PF-001',
    endpoint: '/api/v1/gemini/proof',
    method: 'POST',
    description: 'Refresh runtime proof at current deploy SHA',
  },
  {
    code: 'PF-002',
    endpoint: '/api/v1/lifeos/command-center/phase14/run-proofs',
    method: 'POST',
    description: 'Run Railway-canonical Phase 14 proofs after runtime proof refresh',
  },
  {
    code: 'PF-003',
    endpoint: '/api/v1/lifeos/command-center/self-repair/audit/run',
    method: 'POST',
    description: 'Persist self-repair audit receipt after proof refresh chain',
  },
]);

const VERIFY_ENDPOINTS = Object.freeze({
  proof_freshness: '/api/v1/lifeos/command-center/proof-freshness',
  readiness: '/api/v1/lifeos/command-center/supervised-autonomy/readiness',
});

function nowIso() {
  return new Date().toISOString();
}

function getBaseUrl(req) {
  const explicit = process.env.PUBLIC_BASE_URL || process.env.BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const proto = req.get?.('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get?.('host');
  if (!host) throw new Error('executor_base_url_unavailable');
  return `${proto}://${host}`;
}

function getCommandKey(req) {
  return (
    req.get?.('x-command-key') ||
    process.env.COMMAND_CENTER_KEY ||
    process.env.LIFEOS_KEY ||
    process.env.API_KEY ||
    null
  );
}

function sanitizeStepResult(step, response) {
  const body = response?.body || {};
  const receiptIds = [];
  if (body?.receipt_id) receiptIds.push(body.receipt_id);
  if (body?.receipt?.receipt_id) receiptIds.push(body.receipt.receipt_id);
  if (body?.cert_receipt_id) receiptIds.push(body.cert_receipt_id);
  return {
    code: step.code,
    endpoint: step.endpoint,
    method: step.method,
    ok: response.ok,
    status: response.status,
    receipt_ids: receiptIds,
    summary: {
      confirmed: body?.confirmed ?? null,
      alpha_ready: body?.alpha_ready ?? null,
      status: body?.status ?? body?.runtime_proof?.status ?? null,
      proof_overall: body?.proof_freshness?.overall ?? body?.freshness?.overall ?? null,
      triggered_by: body?.triggered_by ?? null,
    },
  };
}

function buildExecutorReceiptPayload({
  status,
  repairId,
  dryRun,
  authority,
  stepsPlanned,
  stepsExecuted,
  verification,
  stoppedReason = null,
  attemptsUsed = 0,
}) {
  return {
    type: 'self_repair_executor_run',
    status,
    subject: repairId,
    summary: `Self-repair executor ${dryRun ? 'dry-run' : 'execute'}: ${status}`.slice(0, 240),
    repair_id: repairId,
    dry_run: dryRun,
    authority,
    max_attempts: EXECUTOR_MAX_ATTEMPTS,
    attempts_used: attemptsUsed,
    steps_planned: stepsPlanned,
    steps_executed: stepsExecuted,
    verification,
    stopped_reason: stoppedReason,
    runtime: { proof_source: 'self_repair_executor' },
  };
}

function hasP0OrAdamStop(readiness) {
  return Boolean(
    readiness?.adam_required_actions?.length ||
    readiness?.blockers?.some((b) => b.severity === 'P0')
  );
}

function containsRequiredAuthorityCodes(readiness) {
  const codes = new Set((readiness?.system_authorized_actions || []).map((a) => a.code));
  return codes.has('PF-001') && codes.has('PF-002') && (codes.has('RECEIPT_STALE_RUNTIME_SHA') || codes.has('DR-003-RECEIPT-STALE'));
}

function buildPlan(repairId, readiness) {
  if (!SUPPORTED_REPAIR_IDS.has(repairId)) {
    return { ok: false, stoppedReason: 'repair_id_not_supported', steps: [] };
  }
  if (!readiness?.can_continue_under_approved_pb) {
    return { ok: false, stoppedReason: 'pb_boundary_not_authorized', steps: [] };
  }
  if (hasP0OrAdamStop(readiness)) {
    return { ok: false, stoppedReason: 'adam_required_or_p0_stop', steps: [] };
  }
  if (!containsRequiredAuthorityCodes(readiness)) {
    return { ok: false, stoppedReason: 'required_authority_codes_missing', steps: [] };
  }
  if ((readiness?.repair_queue_open ?? 0) < 1 && repairId !== 'all_authorized') {
    return { ok: false, stoppedReason: 'authorized_repair_not_open', steps: [] };
  }
  return { ok: true, stoppedReason: null, steps: [...CHAIN_STEPS] };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text.slice(0, 500) };
  }
  return { ok: response.ok, status: response.status, body };
}

async function verifyState(baseUrl, commandKey) {
  const headers = {
    'x-command-key': commandKey,
  };
  const [proofFreshness, readiness] = await Promise.all([
    fetchJson(`${baseUrl}${VERIFY_ENDPOINTS.proof_freshness}`, { headers }),
    fetchJson(`${baseUrl}${VERIFY_ENDPOINTS.readiness}`, { headers }),
  ]);
  return {
    proof_freshness: proofFreshness.body,
    readiness: readiness.body,
    current:
      proofFreshness.ok &&
      proofFreshness.body?.freshness?.overall === 'CURRENT' &&
      readiness.ok &&
      readiness.body?.proof_freshness_overall === 'CURRENT',
  };
}

async function writeExecutorReceipt(pool, payload) {
  try {
    return await writeSecurityReceipt(SECURITY_RECEIPT_TYPES.AUDIT_VERIFICATION, payload, pool);
  } catch (secErr) {
    const buildId = createBuildSessionId(99703);
    const auditId = createAuditSessionId(99703, buildId);
    const verdict =
      payload.status === 'PASS'
        ? 'PASS'
        : payload.status === 'FAILED'
          ? 'CONDITIONAL_PASS'
          : 'CONDITIONAL_PASS';
    const receiptId = await writeOILAuditReceipt(pool, OIL_AUDITOR_ROLE, {
      projectSlug: 'oil-self-repair-executor',
      verdict,
      confidencePct: payload.status === 'PASS' ? 95 : 80,
      findings: `Self-repair executor ${payload.dry_run ? 'dry-run' : 'execute'}: ${payload.status}`.slice(0, 500),
      findingsJson: {
        ...payload,
        security_receipt_fallback_reason: secErr.message?.slice(0, 200),
      },
      auditSessionId: auditId,
      buildSessionId: buildId,
    });
    return {
      receipt_id: receiptId,
      channel: 'builder_audit_receipts',
      fallback_reason: secErr.message?.slice(0, 200),
    };
  }
}

async function writeMissedIssueIfNeeded(pool, verification) {
  const readiness = verification?.readiness || {};
  const freshness = verification?.proof_freshness || {};
  const stillStale =
    freshness?.freshness?.overall === 'STALE' ||
    readiness?.proof_freshness_overall === 'STALE';
  if (!stillStale) return null;
  if ((readiness?.oil_misses_active ?? 0) > 0) return null;
  return writeOilMissedIssueReceipt(pool, {
    findingId: `OIL-SELF-REPAIR-${Date.now()}`,
    severity: 'P1',
    whatMissed: 'Bounded self-repair executor detected stale proof after authorized repair attempts',
    howFound: 'POST /api/v1/lifeos/command-center/self-repair/execute verification',
    requiredRepair: 'Investigate runtime proof chain and repair queue truth after failed executor attempts',
    verificationPath: 'GET /api/v1/lifeos/command-center/proof-freshness',
    missCategory: 'repair_loop_gap',
    detectedBy: 'Builder',
  });
}

export async function runSelfRepairExecutor({
  pool,
  req,
  dryRun = true,
  repairId = 'DR-003-RECEIPT-STALE',
}) {
  const baseUrl = getBaseUrl(req);
  const commandKey = getCommandKey(req);
  if (!commandKey) {
    throw new Error('self_repair_executor_missing_command_key');
  }

  const railwayDeploySha = normalizeSha(
    process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA || ''
  );
  const initialReadiness = await buildSupervisedAutonomyReadiness(pool, { railwayDeploySha });
  const plan = buildPlan(repairId, initialReadiness);
  const authority = {
    can_continue_under_approved_pb: initialReadiness.can_continue_under_approved_pb,
    pb_boundary: initialReadiness.pb_execution_authority?.boundary || 'approved_builder_oil_self_repair_pb',
    governance_rule: initialReadiness.pb_execution_authority?.rule || 'SSOT_NORTH_STAR §2.16 / SSOT_COMPANION §0.5J',
    adam_required_actions: initialReadiness.adam_required_actions || [],
    system_authorized_actions: initialReadiness.system_authorized_actions || [],
  };

  if (!plan.ok) {
    const verification = await verifyState(baseUrl, commandKey);
    const payload = buildExecutorReceiptPayload({
      status: 'BLOCKED',
      repairId,
      dryRun,
      authority,
      stepsPlanned: plan.steps,
      stepsExecuted: [],
      verification,
      stoppedReason: plan.stoppedReason,
    });
    const { receipt_id } = await writeExecutorReceipt(pool, payload);
    return {
      authority,
      steps_planned: plan.steps,
      steps_executed: [],
      receipts_written: [{ receipt_id, type: SECURITY_RECEIPT_TYPES.AUDIT_VERIFICATION, purpose: 'executor_run' }],
      verification_result: verification,
      stopped_reason: plan.stoppedReason,
      audit_before: initialReadiness,
      audit_result: 'BLOCKED',
    };
  }

  if (dryRun) {
    const verification = await verifyState(baseUrl, commandKey);
    const payload = buildExecutorReceiptPayload({
      status: 'DRY_RUN',
      repairId,
      dryRun: true,
      authority,
      stepsPlanned: plan.steps,
      stepsExecuted: [],
      verification,
    });
    const { receipt_id } = await writeExecutorReceipt(pool, payload);
    return {
      authority,
      steps_planned: plan.steps,
      steps_executed: [],
      receipts_written: [{ receipt_id, type: SECURITY_RECEIPT_TYPES.AUDIT_VERIFICATION, purpose: 'executor_run' }],
      verification_result: verification,
      stopped_reason: null,
      audit_before: initialReadiness,
      audit_result: 'DRY_RUN',
    };
  }

  const headers = {
    'x-command-key': commandKey,
    'content-type': 'application/json',
  };
  const stepsExecuted = [];
  const receiptsWritten = [];
  let verification = null;
  let stoppedReason = null;
  let attemptsUsed = 0;

  for (let attempt = 1; attempt <= EXECUTOR_MAX_ATTEMPTS; attempt += 1) {
    attemptsUsed = attempt;
    const readiness = await buildSupervisedAutonomyReadiness(pool, { railwayDeploySha });
    if (hasP0OrAdamStop(readiness) || !readiness.can_continue_under_approved_pb) {
      stoppedReason = hasP0OrAdamStop(readiness) ? 'adam_required_or_p0_stop' : 'pb_boundary_not_authorized';
      break;
    }

    for (const step of plan.steps) {
      const response = await fetchJson(`${baseUrl}${step.endpoint}`, {
        method: step.method,
        headers,
        body: '{}',
      });
      const shaped = sanitizeStepResult(step, response);
      shaped.attempt = attempt;
      stepsExecuted.push(shaped);
      if (shaped.receipt_ids?.length) {
        for (const id of shaped.receipt_ids) {
          receiptsWritten.push({ receipt_id: id, type: step.code, purpose: step.endpoint });
        }
      }
      if (!response.ok) {
        stoppedReason = `step_failed:${step.code}`;
        break;
      }
    }

    if (stoppedReason) break;
    verification = await verifyState(baseUrl, commandKey);
    if (verification.current) break;
  }

  if (!verification) {
    verification = await verifyState(baseUrl, commandKey);
  }

  let status = 'PASS';
  if (stoppedReason) status = 'BLOCKED';
  else if (!verification.current) {
    status = 'FAILED';
    stoppedReason = 'proof_remains_stale_after_max_attempts';
  }

  let oilMissedReceipt = null;
  if (status === 'FAILED') {
    oilMissedReceipt = await writeMissedIssueIfNeeded(pool, verification);
    if (oilMissedReceipt?.receipt_id) {
      receiptsWritten.push({
        receipt_id: oilMissedReceipt.receipt_id,
        type: 'oil_missed_issue',
        purpose: 'executor_failure_detection',
      });
    }
  }

  const payload = buildExecutorReceiptPayload({
    status,
    repairId,
    dryRun: false,
    authority,
    stepsPlanned: plan.steps,
    stepsExecuted,
    verification,
    stoppedReason,
    attemptsUsed,
  });
  const { receipt_id } = await writeExecutorReceipt(pool, payload);
  receiptsWritten.unshift({
    receipt_id,
    type: SECURITY_RECEIPT_TYPES.AUDIT_VERIFICATION,
    purpose: 'executor_run',
  });

  return {
    authority,
    steps_planned: plan.steps,
    steps_executed: stepsExecuted,
    receipts_written: receiptsWritten,
    verification_result: verification,
    stopped_reason: stoppedReason,
    audit_before: initialReadiness,
    audit_result: status,
  };
}
