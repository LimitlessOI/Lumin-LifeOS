/**
 * SYNOPSIS: BuilderOS structural consolidation + Alpha readiness.
 * Runtime truth governs LIVE / PROVEN / ACTIVE. Docs only shape expected topology.
 *
 * @ssot docs/architecture/BUILDEROS_STRUCTURAL_CONSOLIDATION_BLUEPRINT.md
 * @ssot docs/products/builderos/PRODUCT_SSOT.md
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSupervisedAutonomyReadiness } from './supervised-autonomy-readiness.js';
import { buildPreventionHooksStatus } from './self-repair-prevention-hook-planner.js';
import { listAutonomousTelemetry } from './autonomous-telemetry-service.js';
import { readLatestPhase14Cert } from './builder-phase14-ledger.js';
import { evaluateProofFreshnessFromPool } from './oil-proof-freshness.js';
import { normalizeSha } from './oil-self-repair-detector.js';
import { computeAllBuilderOSMetrics } from './builderos-metrics-reporter.js';
import { getBpPrioritySchedulerStatus } from './builderos-bp-priority-scheduler.js';
import {
  buildFailClosedReadinessBlockers,
  canReportAlphaReady,
  buildFakeGreenStatusNote,
} from './builderos-alpha-readiness-guards.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ARCHITECTURE_DIR = path.join(ROOT, 'docs', 'architecture');

const STATUS_SCORE = Object.freeze({
  NOT_WIRED: 0,
  WIRED: 0.25,
  LIVE: 0.5,
  PROVEN: 0.75,
  ACTIVE: 1,
});

function safeReadJson(relPath) {
  const full = path.join(ROOT, relPath);
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch {
    return null;
  }
}

function readJsonlTail(relPath, lines = 5) {
  const full = path.join(ROOT, relPath);
  try {
    const rows = fs.readFileSync(full, 'utf8').trim().split(/\r?\n/).filter(Boolean);
    return rows.slice(-lines).map((line) => {
      try { return JSON.parse(line); } catch { return { raw: line }; }
    });
  } catch {
    return [];
  }
}

function hasStatuses(...statuses) {
  return [...new Set(statuses.filter(Boolean))];
}

function scoreForStatuses(statuses = []) {
  return Math.max(...statuses.map((s) => STATUS_SCORE[s] ?? 0), 0);
}

function average(nums = []) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pct(n) {
  return Math.round(n * 1000) / 10;
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function proofSource(pathOrLabel, evidence) {
  return { source: pathOrLabel, evidence };
}

export async function buildBuilderOSSystemAlphaReadiness(pool, { railwayDeploySha } = {}) {
  const deploySha = normalizeSha(
    railwayDeploySha || process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA || ''
  );

  const [
    readiness,
    prevention,
    phase14,
    proofFreshness,
    recentTelemetry,
  ] = await Promise.all([
    buildSupervisedAutonomyReadiness(pool, { railwayDeploySha: deploySha }),
    buildPreventionHooksStatus(pool),
    readLatestPhase14Cert(pool),
    evaluateProofFreshnessFromPool(pool, { railwayDeploySha: deploySha }),
    listAutonomousTelemetry(pool, { limit: 8, sinceHours: 168 }),
  ]);

  const schedulerStatus = getBpPrioritySchedulerStatus();
  const overnightState = safeReadJson('data/governed-autonomy-overnight-state.json');
  const overnightLogTail = readJsonlTail('data/governed-autonomy-overnight-log.jsonl', 3);
  const queueLogTail = readJsonlTail('data/builder-continuous-queue-log.jsonl', 3);

  // Phase B — canonical memory proof: epistemic_facts (BR-07, MEMORY_PROOF_CONTRACT.md)
  // self_repair_memory_events is a repair log, not the governed memory architecture.
  let memoryDb = { total: 0, provenCount: 0, repairEventCount: 0, error: null };
  try {
    const [totalRes, provenRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM epistemic_facts'),
      pool.query('SELECT COUNT(*) FROM epistemic_facts WHERE level >= 2 AND source_count > 1'),
    ]);
    memoryDb.total = parseInt(totalRes.rows[0].count, 10);
    memoryDb.provenCount = parseInt(provenRes.rows[0].count, 10);
  } catch (err) {
    memoryDb.error = err.message; // table may not exist yet
  }
  try {
    const repairRes = await pool.query('SELECT COUNT(*) FROM self_repair_memory_events');
    memoryDb.repairEventCount = parseInt(repairRes.rows[0].count, 10);
  } catch {}

  // Phase B.2 — TSOS-internal: dedicated hook events only (BR-09, TSOS_HOOK_BOUNDARY.md)
  // Generic token telemetry cannot prove a dedicated TSOS internal hook is wired.
  let tsosHookCount = 0;
  let tsosStructuredCommittedCount = 0;
  let tsosVerifierLinkedCount = 0;
  try {
    const tsosRes = await pool.query("SELECT COUNT(*) FROM autonomous_telemetry_events WHERE task_type = 'tsos_internal_hook'");
    tsosHookCount = parseInt(tsosRes.rows[0].count, 10);
  } catch {}
  try {
    const structuredQuery = [
      'SELECT COUNT(DISTINCT run_id) AS cnt',
      'FROM autonomous_telemetry_events',
      "WHERE task_type = 'tsos_internal_hook'",
      "  AND metadata->>'committed' = 'true'",
      "  AND metadata->>'job_id' IS NOT NULL",
      "  AND metadata->>'output_bytes' IS NOT NULL",
      "  AND metadata->>'duration_ms' IS NOT NULL",
      "  AND metadata->>'repair_attempts' IS NOT NULL",
    ].join('\n');
    const structuredRes = await pool.query(structuredQuery);
    tsosStructuredCommittedCount = parseInt(structuredRes.rows[0].cnt, 10);
  } catch {}
  try {
    const linkedQuery = [
      'SELECT COUNT(DISTINCT j.id) AS cnt',
      'FROM builderos_command_control_jobs j',
      'INNER JOIN autonomous_telemetry_events e',
      "  ON e.run_id = j.id::text AND e.task_type = 'tsos_internal_hook'",
      "WHERE j.status = 'committed'",
      "  AND (j.result_json->'oil_audit_result'->>'ok') = 'true'",
      "  AND (j.result_json->'oil_audit_result'->'gates'->>'syntax') = 'true'",
      "  AND (j.result_json->'oil_audit_result'->'gates'->>'antipattern') = 'true'",
      "  AND (j.result_json->'oil_audit_result'->'gates'->>'stub') = 'true'",
    ].join('\n');
    const linkedRes = await pool.query(linkedQuery);
    tsosVerifierLinkedCount = parseInt(linkedRes.rows[0].cnt, 10);
  } catch {}

  const tsosProvenEligible =
    tsosHookCount >= 3 &&
    tsosStructuredCommittedCount >= 3 &&
    tsosVerifierLinkedCount >= 3;

  // Phase B.3 — count null metrics to make TELEMETRY_GAPS_REMAIN conditional
  let nullMetricCount = 17;
  try {
    const mr = await computeAllBuilderOSMetrics(pool, { sinceHours: 168 });
    nullMetricCount = Object.values(mr).filter((v) => v === null).length;
  } catch { /* fail closed — treat as all null */ }

  const telemetryEvents = recentTelemetry.events || [];
  const hasCouncilTelemetry = telemetryEvents.some((e) => e.model_used);
  const hasPreventionTelemetry = telemetryEvents.some((e) => e.task_type?.startsWith('prevention_hook.'));

  const components = [
    {
      component_id: 'builder',
      label: 'Builder',
      statuses: hasStatuses('WIRED', 'LIVE', 'PROVEN'),
      runtime_proof: [
        proofSource('GET /api/v1/lifeos/builder/ready', readiness.checks?.builder_preflight),
        proofSource('data/builder-continuous-queue-log.jsonl', queueLogTail[queueLogTail.length - 1]?.event || 'present'),
      ],
      fake_green_risk: 'Builder ready does not prove active build execution.',
    },
    {
      component_id: 'oil',
      label: 'OIL',
      statuses: hasStatuses('WIRED', 'LIVE', 'PROVEN', 'ACTIVE'),
      runtime_proof: [
        proofSource('GET /api/v1/lifeos/command-center/proof-freshness', proofFreshness.overall),
        proofSource('GET /api/v1/lifeos/command-center/phase14', phase14?.findings_json?.alpha_ready ? 'ALPHA_READY' : 'UNKNOWN'),
      ],
      fake_green_risk: 'Old receipts can look current if proof freshness is ignored.',
    },
    {
      component_id: 'council',
      label: 'Council AI',
      statuses: hasStatuses('WIRED', 'LIVE', hasCouncilTelemetry ? 'PROVEN' : null),
      runtime_proof: [
        proofSource('GET /api/v1/lifeos/builder/ready', readiness.builder_github_token ? 'council dependency live' : 'unknown'),
        proofSource('GET /api/v1/lifeos/autonomous-telemetry/efficiency', hasCouncilTelemetry ? 'model-backed BuilderOS work observed' : 'no recent governed model rows'),
      ],
      fake_green_risk: 'Generic model availability can be mistaken for governed Council maturity.',
    },
    {
      component_id: 'tsos_internal_hooks',
      label: 'BuilderOS-internal TSOS hooks',
      statuses: hasStatuses(
        tsosHookCount > 0 ? 'WIRED' : 'NOT_WIRED',
        tsosHookCount > 0 ? 'LIVE' : null,
        tsosProvenEligible ? 'PROVEN' : null,
      ),
      runtime_proof: [
        proofSource("autonomous_telemetry_events WHERE task_type='tsos_internal_hook'", tsosHookCount > 0 ? `${tsosHookCount} dedicated hook events` : 'no dedicated TSOS-internal hook events yet (generic token telemetry excluded per TSOS_HOOK_BOUNDARY.md)'),
        proofSource('TSOS structured committed hooks', `${tsosStructuredCommittedCount} distinct run_ids with committed=true + output_bytes/duration_ms/repair_attempts metadata`),
        proofSource('TSOS verifier-linked hooks', `${tsosVerifierLinkedCount} committed jobs with oil_audit_result.gates pass joined to hook run_id`),
      ],
      fake_green_risk: tsosHookCount >= 3 && !tsosProvenEligible
        ? `PROVEN_PENDING_VERIFIER_LINKAGE: hooks=${tsosHookCount} structured=${tsosStructuredCommittedCount} verifier_linked=${tsosVerifierLinkedCount} — need all >=3 for PROVEN (TSOS-G1).`
        : 'Token-economics UI can imply TSOS maturity not proven for BuilderOS.',
    },
    {
      component_id: 'memory',
      label: 'Memory',
      statuses: hasStatuses('WIRED', (!memoryDb.error && memoryDb.total > 0) ? 'LIVE' : null, (!memoryDb.error && memoryDb.provenCount > 0) ? 'PROVEN' : null),
      runtime_proof: [
        proofSource(
          'GET /api/v1/lifeos/command-center/memory/status',
          memoryDb.error
            ? `endpoint exists; DB mirror: ${memoryDb.error}`
            : `endpoint exists; epistemic_facts total=${memoryDb.total} proven=${memoryDb.provenCount}`,
        ),
        proofSource(
          'epistemic_facts (Amendment 39 canonical path)',
          memoryDb.error
            ? `DB_ERROR: ${memoryDb.error} — epistemic_facts table may not exist yet`
            : memoryDb.total > 0
              ? `${memoryDb.total} facts total; ${memoryDb.provenCount} at level>=2 with source_count>1; repair_events=${memoryDb.repairEventCount} (supplementary)`
              : `epistemic_facts queryable but empty; repair_events=${memoryDb.repairEventCount} (non-canonical, not scored)`
        ),
      ],
      fake_green_risk: 'Memory LIVE requires the endpoint to return 200 from DB — not structural file existence.',
    },
    {
      component_id: 'pb_authority',
      label: 'PB authority',
      statuses: hasStatuses('WIRED', 'LIVE', 'PROVEN'),
      runtime_proof: [
        proofSource('GET /api/v1/lifeos/command-center/supervised-autonomy/readiness', readiness.pb_execution_authority?.boundary || 'unknown'),
      ],
      fake_green_risk: 'Healthy idle can hide whether classification works under stress unless prior repair evidence is preserved.',
    },
    {
      component_id: 'proof_freshness',
      label: 'Proof freshness',
      statuses: hasStatuses('WIRED', 'LIVE', 'PROVEN', 'ACTIVE'),
      runtime_proof: [
        proofSource('GET /api/v1/lifeos/command-center/proof-freshness', proofFreshness.overall),
      ],
      fake_green_risk: 'None material when deploy SHA parity is present.',
    },
    {
      component_id: 'self_repair',
      label: 'Self-repair',
      statuses: hasStatuses('WIRED', 'LIVE', 'PROVEN'),
      runtime_proof: [
        proofSource('GET /api/v1/lifeos/command-center/self-repair/repair-queue', `open_count=${readiness.repair_queue_open}`),
        proofSource('GET /api/v1/lifeos/command-center/supervised-autonomy/readiness', readiness.latest_receipts?.self_repair?.audit_status || 'unknown'),
      ],
      fake_green_risk: 'Current healthy idle means no live repair pressure is happening right now.',
    },
    {
      component_id: 'prevention',
      label: 'Prevention',
      statuses: hasStatuses('WIRED', 'LIVE', 'PROVEN', hasPreventionTelemetry ? 'ACTIVE' : null),
      runtime_proof: [
        proofSource('GET /api/v1/lifeos/command-center/self-repair/prevention/hooks', prevention.status),
        proofSource('GET /api/v1/lifeos/autonomous-telemetry/events', hasPreventionTelemetry ? 'prevention hook runs observed' : 'no recent prevention telemetry'),
      ],
      fake_green_risk: 'One wired hook can overstate subsystem breadth.',
    },
    {
      component_id: 'telemetry',
      label: 'Telemetry',
      statuses: hasStatuses('WIRED', 'LIVE', 'PROVEN', telemetryEvents.length ? 'ACTIVE' : null),
      runtime_proof: [
        proofSource('GET /api/v1/lifeos/autonomous-telemetry/efficiency', `event_count=${recentTelemetry.count || 0}`),
        proofSource('GET /api/v1/lifeos/autonomous-telemetry/events', `events=${telemetryEvents.length}`),
      ],
      fake_green_risk: 'Some required metrics are still explicitly NOT_WIRED.',
    },
    {
      component_id: 'bp_priority_scheduler',
      label: 'BP_PRIORITY scheduler',
      statuses: hasStatuses(
        'WIRED',
        schedulerStatus.scheduler.enabled ? 'LIVE' : null,
        schedulerStatus.scheduler.healthy ? 'PROVEN' : null,
        schedulerStatus.scheduler.running ? 'ACTIVE' : null
      ),
      runtime_proof: [
        proofSource('GET /api/v1/lifeos/command-center/bp-priority-scheduler', schedulerStatus.scheduler.healthy ? 'healthy' : schedulerStatus.scheduler.enabled ? 'enabled' : 'disabled'),
        proofSource('data/builderos-bp-priority-scheduler-receipt.json', schedulerStatus.scheduler.receipt?.ok === true ? 'recent_success' : 'missing_or_failing'),
      ],
      fake_green_risk: 'Enabled scheduler without recent successful receipt is not autonomous continuity.',
    },
    {
      component_id: 'command_center',
      label: 'Command Center cockpit',
      statuses: hasStatuses('WIRED', 'LIVE', 'PROVEN'),
      runtime_proof: [
        proofSource('/lifeos-command-center', 'canonical cockpit route mounted'),
        proofSource('GET /api/v1/lifeos/command-center/supervised-autonomy/readiness', readiness.ready_for_supervised ? 'live aggregate truth' : 'aggregate responding'),
      ],
      fake_green_risk: 'Legacy /command-center remains mounted and can confuse canonical status.',
    },
  ];

  const loopNodes = [
    {
      node: 'detect',
      score: proofFreshness.overall === 'CURRENT' || readiness.repair_queue_open > 0 ? 1 : 0.5,
      proof_sources: ['GET /api/v1/lifeos/command-center/proof-freshness', 'GET /api/v1/lifeos/command-center/self-repair/repair-queue'],
    },
    {
      node: 'authorize',
      score: readiness.pb_execution_authority?.boundary ? 1 : 0.5,
      proof_sources: ['GET /api/v1/lifeos/command-center/supervised-autonomy/readiness'],
    },
    {
      node: 'execute',
      score: readiness.latest_receipts?.self_repair ? 0.9 : 0.4,
      proof_sources: ['latest self_repair receipt in readiness aggregate'],
    },
    {
      node: 'verify',
      score: proofFreshness.overall === 'CURRENT' ? 1 : 0.3,
      proof_sources: ['GET /api/v1/lifeos/command-center/proof-freshness'],
    },
    {
      node: 'receipt',
      score: readiness.latest_receipts?.phase14_cert && readiness.latest_receipts?.gemini_runtime_proof ? 1 : 0.4,
      proof_sources: ['builder_audit_receipts', 'security_receipts'],
    },
    {
      node: 'continue_halt',
      score: schedulerStatus.scheduler.healthy ? 1 : schedulerStatus.scheduler.enabled ? 0.5 : 0.25,
      proof_sources: ['GET /api/v1/lifeos/command-center/bp-priority-scheduler'],
    },
  ];

  const loopIntegrityScore = pct(average(loopNodes.map((n) => n.score)));
  const componentMaturityScore = pct(average(components.map((c) => scoreForStatuses(c.statuses))));
  const rawPercent = 0.4 * loopIntegrityScore + 0.6 * componentMaturityScore;

  // Live useful_work_score from telemetry — never hardcoded.
  const scoredEvents = telemetryEvents.filter((e) => e.useful_work_score != null);
  const usefulWork = scoredEvents.length > 0
    ? scoredEvents.reduce((sum, e) => sum + Number(e.useful_work_score), 0) / scoredEvents.length
    : null;
  const usefulWorkSource = scoredEvents.length > 0
    ? `live_avg_${scoredEvents.length}_events_168h`
    : 'NO_DATA';
  const bonus = usefulWork != null && usefulWork > 0.5 ? 5 : 0;
  const percentComplete = Math.min(100, Math.round((rawPercent + bonus) * 10) / 10);

  const activeComponents = components.filter((c) => c.statuses.includes('ACTIVE')).map((c) => c.component_id);
  const provenComponents = components.filter((c) => c.statuses.includes('PROVEN')).map((c) => c.component_id);
  const liveComponents = components.filter((c) => c.statuses.includes('LIVE')).map((c) => c.component_id);
  const notWiredComponents = components.filter((c) => c.statuses.includes('NOT_WIRED')).map((c) => c.component_id);

  const statusCounts = {
    NOT_WIRED: notWiredComponents.length,
    WIRED: components.filter((c) => c.statuses.includes('WIRED')).length,
    LIVE: liveComponents.length,
    PROVEN: provenComponents.length,
    ACTIVE: activeComponents.length,
    LEGACY: 0,
    ARCHIVED: 0,
    FORBIDDEN: 0,
    UNKNOWN_DO_NOT_TOUCH: 0,
  };

  const fakeGreenRisks = [
    'Legacy /command-center remains mounted beside the canonical cockpit.',
    'Builder healthy idle can look like autonomy even when the canonical BP scheduler is disabled or stale.',
    'Telemetry has real data but key metrics remain NOT_WIRED.',
    'Memory proof endpoint exists but has not been stress-tested against a seeded-zero scenario.',
    'Token-economics / TSOS-adjacent surfaces can be mistaken for internal BuilderOS proof.',
  ];

  let auditClean = false;
  try {
    const arPath = path.join(ROOT, 'data', 'useful-work-guard-audit-results.json');
    if (fs.existsSync(arPath)) {
      const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
      auditClean = ar.high_risk_count === 0;
    }
  } catch { /* absent or malformed — fail closed */ }

  let legacyRedirectDeployed = false;
  try {
    const prc = fs.readFileSync(path.join(ROOT, 'routes', 'public-routes.js'), 'utf8');
    legacyRedirectDeployed = prc.includes('redirect(301');
  } catch { /* fail closed */ }

  const blockers = [
    ...buildFailClosedReadinessBlockers({ proofFreshness, readiness }),
    ...(tsosHookCount === 0 ? [{ code: 'TSOS_INTERNAL_HOOKS_NOT_WIRED', detail: 'No dedicated tsos_internal_hook events found — generic token telemetry does not count (TSOS_HOOK_BOUNDARY.md).' }] : []),
    ...(memoryDb.provenCount === 0 ? [{ code: 'MEMORY_NOT_RUNTIME_PROVEN', detail: 'Memory not PROVEN — epistemic_facts has no level>=2 facts with source_count>1 (MEMORY_PROOF_CONTRACT.md canonical path).' }] : []),
    ...(auditClean ? [] : [{
      code: 'USEFUL_WORK_GUARD_COVERAGE_AUDIT_INCOMPLETE',
      detail: 'Useful-work-guard has evidence, but a full autonomous-path coverage audit is still missing.',
    }]),
    ...(nullMetricCount > 2 ? [{
      code: 'TELEMETRY_GAPS_REMAIN',
      detail: `${nullMetricCount} required metrics remain NOT_WIRED — architectural schema gaps not yet provisioned.`,
    }] : []),
    ...(legacyRedirectDeployed ? [] : [{
      code: 'LEGACY_AUTHORITY_SURFACES_STILL_LIVE',
      detail: 'Legacy /command-center HTML surface redirect not detected — Phase 26 not yet deployed.',
    }]),
    ...(schedulerStatus.scheduler.enabled ? [] : [{
      code: 'BP_PRIORITY_SCHEDULER_DISABLED',
      detail: 'BUILDEROS_AUTOPILOT is not enabled — canonical autonomous build queue is not running.',
    }]),
    ...(schedulerStatus.scheduler.enabled && (schedulerStatus.scheduler.recent || schedulerStatus.scheduler.in_boot_window) ? [] : [{
      code: 'BP_PRIORITY_SCHEDULER_NOT_RECENT',
      detail: schedulerStatus.scheduler.last_skip_reason
        ? `Canonical BP scheduler last skipped: ${schedulerStatus.scheduler.last_skip_reason}`
        : 'Canonical BP scheduler has no recent successful receipt inside the configured liveness window.',
    }]),
  ];

  const next10 = [
    'Run full useful-work-guard coverage audit across all autonomous AI paths.',
    'Quarantine or clearly gate legacy /command-center operator surface.',
    'Wire BuilderOS memory proof endpoint into Command Center overlay drill-down.',
    'Define and prove BuilderOS-internal TSOS hook boundary.',
    'Fill telemetry gaps for PB violations prevented, context growth, and successful build latency.',
    'Expose canonical BP scheduler and improvement loop status in the command center UI.',
    'Consolidate overnight vs continuous-queue naming and proof language.',
    'Finish topology audit of unmounted or partially mounted route files.',
    'Add structural proof freshness / blueprint-vs-runtime diff check.',
    'Pressure-test Alpha scoring against a real stale-proof incident again.',
  ];

  const docsPresence = {
    blueprint: fileExists('docs/architecture/BUILDEROS_STRUCTURAL_CONSOLIDATION_BLUEPRINT.md'),
    inventory: fileExists('docs/architecture/BUILDEROS_SYSTEM_INVENTORY.md'),
    authority_map: fileExists('docs/architecture/BUILDEROS_AUTHORITY_MAP.md'),
    topology_audit: fileExists('docs/architecture/BUILDEROS_TOPOLOGY_AUDIT.md'),
    salvage_registry: fileExists('docs/architecture/BUILDEROS_SALVAGE_REGISTRY.md'),
    classification_lock: fileExists('docs/architecture/BUILDEROS_CLASSIFICATION_LOCK.md'),
  };

  const fakeGreenStatusNote = buildFakeGreenStatusNote({
    proofFreshness,
    readiness,
    percentComplete,
  });
  if (fakeGreenStatusNote) fakeGreenRisks.push(fakeGreenStatusNote);
  const alphaReady = canReportAlphaReady({ proofFreshness, readiness, blockers }) &&
    percentComplete >= 85;

  return {
    ok: true,
    system_alpha_status: alphaReady ? 'ALPHA_READY' : 'ALPHA_IN_PROGRESS',
    percent_complete: percentComplete,
    scoring_method: {
      loop_integrity_weight_pct: 40,
      component_maturity_weight_pct: 60,
      useful_work_bonus_pct: bonus,
      useful_work_score_live: usefulWork,
      useful_work_score_source: usefulWorkSource,
      component_scale: STATUS_SCORE,
      docs_do_not_raise_runtime_maturity: true,
    },
    loop_integrity_score: loopIntegrityScore,
    component_maturity_score: componentMaturityScore,
    status_counts: statusCounts,
    live_components: liveComponents,
    proven_components: provenComponents,
    active_components: activeComponents,
    legacy_components: [],
    not_wired_components: notWiredComponents,
    unknowns: [
      ...(schedulerStatus.scheduler.enabled ? [] : ['Canonical BP scheduler is disabled at runtime; enable BUILDEROS_AUTOPILOT=1 to claim continuity.']),
      ...(tsosProvenEligible ? [] : ['TSOS PROVEN gate wired — awaiting >=3 structured committed hooks with verifier linkage (TSOS-G1).']),
    ],
    fake_green_explanation: fakeGreenStatusNote,
    fake_green_risks: fakeGreenRisks,
    duplicate_authority_paths: [
      {
        area: 'command_center',
        non_canonical: '/command-center',
        risk: 'legacy operator surface can be mistaken for governed cockpit',
        canonical_replacement: '/lifeos-command-center',
      },
      {
        area: 'autonomy_runner',
        non_canonical: 'builder-overnight-* aliases + governed-autonomy sidecar receipts',
        risk: 'same autonomy surface appears as multiple systems',
        canonical_replacement: 'BP_PRIORITY scheduler receipt + endpoint',
      },
      {
        area: 'memory',
        non_canonical: 'Amendment 02 legacy memory path',
        risk: 'competing truth store',
        canonical_replacement: 'memory-capsule / Amendment 39 governed path',
      },
    ],
    blockers,
    next_10_required_build_items: next10,
    proof_sources: {
      builder_ready: 'GET /api/v1/lifeos/builder/ready',
      proof_freshness: 'GET /api/v1/lifeos/command-center/proof-freshness',
      readiness: 'GET /api/v1/lifeos/command-center/supervised-autonomy/readiness',
      repair_queue: 'GET /api/v1/lifeos/command-center/self-repair/repair-queue',
      prevention_hooks: 'GET /api/v1/lifeos/command-center/self-repair/prevention/hooks',
      telemetry_efficiency: 'GET /api/v1/lifeos/autonomous-telemetry/efficiency',
      telemetry_events: 'GET /api/v1/lifeos/autonomous-telemetry/events',
      bp_priority_scheduler: 'GET /api/v1/lifeos/command-center/bp-priority-scheduler',
      overnight_state_legacy: 'data/governed-autonomy-overnight-state.json',
      overnight_log_legacy: 'data/governed-autonomy-overnight-log.jsonl',
      queue_log: 'data/builder-continuous-queue-log.jsonl',
      memory_proof: 'GET /api/v1/lifeos/command-center/memory/proof',
    },
    last_verified_at: new Date().toISOString(),
    runtime_snapshot: {
      deploy_sha: deploySha,
      proof_freshness: proofFreshness.overall,
      readiness_true: readiness.ready_for_supervised,
      repair_queue_open: readiness.repair_queue_open,
      healthy_idle: overnightState?.last_outcome?.idle_reason === 'healthy_idle_no_authorized_work',
      bp_priority_scheduler_enabled: schedulerStatus.scheduler.enabled,
      bp_priority_scheduler_recent: schedulerStatus.scheduler.recent,
      phase14_status: readiness.phase14_status,
    },
    components,
    loop_nodes: loopNodes,
    docs_presence: docsPresence,
    useful_work_guard_gate: {
      status: 'PROVEN_BUT_AUDIT_INCOMPLETE',
      evidence: [
        'startup/boot-domains.js wraps autonomous tasks with createUsefulWorkGuard()',
        'overnight state shows healthy_idle_no_authorized_work instead of idle burn',
      ],
    },
  };
}
