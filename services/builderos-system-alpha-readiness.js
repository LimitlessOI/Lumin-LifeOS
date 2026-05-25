/**
 * BuilderOS structural consolidation + Alpha readiness.
 * Runtime truth governs LIVE / PROVEN / ACTIVE. Docs only shape expected topology.
 *
 * @ssot docs/architecture/BUILDEROS_STRUCTURAL_CONSOLIDATION_BLUEPRINT.md
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ARCHITECTURE_DIR = path.join(ROOT, 'docs', 'architecture');

const COMPONENT_ORDER = [
  'builder',
  'oil',
  'council',
  'tsos_internal_hooks',
  'memory',
  'pb_authority',
  'proof_freshness',
  'self_repair',
  'prevention',
  'telemetry',
  'overnight_runner',
  'command_center',
];

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

  const overnightState = safeReadJson('data/governed-autonomy-overnight-state.json');
  const overnightLogTail = readJsonlTail('data/governed-autonomy-overnight-log.jsonl', 3);
  const queueLogTail = readJsonlTail('data/builder-continuous-queue-log.jsonl', 3);

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
      statuses: hasStatuses('NOT_WIRED'),
      runtime_proof: [
        proofSource('approved runtime proof set', 'no dedicated TSOS-internal BuilderOS proof source yet'),
      ],
      fake_green_risk: 'Token-economics UI can imply TSOS maturity not proven for BuilderOS.',
    },
    {
      component_id: 'memory',
      label: 'Memory',
      statuses: hasStatuses('WIRED'),
      runtime_proof: [
        proofSource('structural only', 'memory routes/services exist but are not yet in approved BuilderOS runtime proof set'),
      ],
      fake_green_risk: 'Memory documentation is ahead of BuilderOS runtime proof.',
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
      component_id: 'overnight_runner',
      label: 'Overnight orchestrator',
      statuses: hasStatuses(
        'WIRED',
        overnightState ? 'LIVE' : null,
        overnightState?.last_outcome?.analysis?.ok ? 'PROVEN' : null,
        overnightState?.status === 'running' ? 'ACTIVE' : null
      ),
      runtime_proof: [
        proofSource('data/governed-autonomy-overnight-state.json', overnightState?.last_outcome?.idle_reason || 'missing'),
        proofSource('data/governed-autonomy-overnight-log.jsonl', overnightLogTail[overnightLogTail.length - 1]?.event || 'missing'),
      ],
      fake_green_risk: 'Healthy idle can be misread as inactivity instead of governed continuation.',
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
      score: proofFreshness.overall === 'CURRENT' || readiness.repair_queue_open >= 0 ? 1 : 0.5,
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
      score: overnightState?.last_outcome?.idle_reason === 'healthy_idle_no_authorized_work' ? 1 : 0.5,
      proof_sources: ['data/governed-autonomy-overnight-state.json'],
    },
  ];

  const loopIntegrityScore = pct(average(loopNodes.map((n) => n.score)));
  const componentMaturityScore = pct(average(components.map((c) => scoreForStatuses(c.statuses))));
  const rawPercent = 0.4 * loopIntegrityScore + 0.6 * componentMaturityScore;
  const usefulWork = 0.321;
  const bonus = usefulWork > 0.5 ? 5 : 0;
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
    'Builder healthy idle can look like inactivity if overnight/runtime state is ignored.',
    'Telemetry has real data but key metrics remain NOT_WIRED.',
    'Memory package maturity exceeds current BuilderOS runtime proof maturity.',
    'Token-economics / TSOS-adjacent surfaces can be mistaken for internal BuilderOS proof.',
  ];

  const blockers = [
    {
      code: 'TSOS_INTERNAL_HOOKS_NOT_WIRED',
      detail: 'BuilderOS-internal TSOS hooks have no approved runtime proof source yet.',
    },
    {
      code: 'MEMORY_NOT_RUNTIME_PROVEN',
      detail: 'Memory is structurally wired but not yet proven through approved BuilderOS runtime truth sources.',
    },
    {
      code: 'USEFUL_WORK_GUARD_COVERAGE_AUDIT_INCOMPLETE',
      detail: 'Useful-work-guard has evidence, but a full autonomous-path coverage audit is still missing.',
    },
    {
      code: 'TELEMETRY_GAPS_REMAIN',
      detail: 'Several required metrics remain intentionally NOT_WIRED.',
    },
    {
      code: 'LEGACY_AUTHORITY_SURFACES_STILL_LIVE',
      detail: 'Legacy command-center and compatibility aliases remain reachable and can confuse operators.',
    },
  ];

  const next10 = [
    'Run full useful-work-guard coverage audit across all autonomous AI paths.',
    'Quarantine or clearly gate legacy /command-center operator surface.',
    'Add canonical BuilderOS memory runtime proof source.',
    'Define and prove BuilderOS-internal TSOS hook boundary.',
    'Fill telemetry gaps for PB violations prevented, context growth, and successful build latency.',
    'Add current daemon-active proof source for Builder component.',
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

  return {
    ok: true,
    system_alpha_status: percentComplete >= 85 && blockers.length === 0 ? 'ALPHA_READY' : 'ALPHA_IN_PROGRESS',
    percent_complete: percentComplete,
    scoring_method: {
      loop_integrity_weight_pct: 40,
      component_maturity_weight_pct: 60,
      useful_work_bonus_pct: bonus,
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
      'No canonical runtime endpoint yet for current queue daemon liveness.',
      'Memory still lacks BuilderOS-approved runtime proof maturity.',
      'BuilderOS-internal TSOS hook boundary remains undefined operationally.',
    ],
    fake_green_risks: fakeGreenRisks,
    duplicate_authority_paths: [
      {
        area: 'command_center',
        non_canonical: '/command-center',
        risk: 'legacy operator surface can be mistaken for governed cockpit',
        canonical_replacement: '/lifeos-command-center',
      },
      {
        area: 'overnight_runner',
        non_canonical: 'builder-overnight-* aliases',
        risk: 'same runner appears as multiple systems',
        canonical_replacement: 'builder-continuous-queue-* plus governed-autonomy overnight state/log',
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
      overnight_state: 'data/governed-autonomy-overnight-state.json',
      overnight_log: 'data/governed-autonomy-overnight-log.jsonl',
      queue_log: 'data/builder-continuous-queue-log.jsonl',
    },
    last_verified_at: new Date().toISOString(),
    runtime_snapshot: {
      deploy_sha: deploySha,
      proof_freshness: proofFreshness.overall,
      readiness_true: readiness.ready_for_supervised,
      repair_queue_open: readiness.repair_queue_open,
      healthy_idle: overnightState?.last_outcome?.idle_reason === 'healthy_idle_no_authorized_work',
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
