/**
 * SYNOPSIS: Deterministic BuilderOS improvement loop planner.
 * SNT finds gaps, Wisdom contributes lessons, CFO ranks spend/ROI, Chair prepares ARC-ready proposals.
 *
 * @ssot builderos-reboot/BP_PRIORITY.json
 * @ssot docs/products/AUTHORITY_BOUNDARIES.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCompoundImprovementSummary } from './builderos-compound-improvement.js';
import { getBpPrioritySchedulerStatus } from './builderos-bp-priority-scheduler.js';
import { buildImprovementDeltaContract } from './builderos-improvement-contract.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPTS_DIR = path.join(ROOT, 'products', 'receipts');

function uniq(list = []) {
  return [...new Set(list.filter(Boolean))];
}

// Fold the per-product SENTRY self-fix feeds (written by scripts/sentry-prealpha-gate.mjs
// via the system-authored closer) into the improvement queue. This is the last mile of
// SO-002 self-fix: a SENTRY finding+solution becomes a governed improvement proposal —
// no secondary queue. Best-effort: never throws, so a missing/malformed feed can't break
// the loop status.
function readSentryFindings() {
  let files = [];
  try {
    files = fs.readdirSync(RECEIPTS_DIR).filter((f) => /^SENTRY_FINDINGS_FEED.*\.json$/.test(f));
  } catch {
    return [];
  }
  const findings = [];
  for (const file of files) {
    let feed;
    try {
      feed = JSON.parse(fs.readFileSync(path.join(RECEIPTS_DIR, file), 'utf8'));
    } catch {
      continue;
    }
    const product = String(feed?.product || 'unknown');
    // Prefer the top-level findings array: it carries proposed_solution (solution-mandatory).
    // readiness.blockers is a stripped code+detail view and loses the fix, so it's only a fallback.
    const raw = Array.isArray(feed?.findings) && feed.findings.length
      ? feed.findings
      : (Array.isArray(feed?.readiness?.blockers) ? feed.readiness.blockers : []);
    for (const f of raw) {
      const baseCode = String(f?.code || f?.id || 'FINDING');
      findings.push({
        code: `SENTRY_${product}_${baseCode}`.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
        detail: String(f?.detail || f?.note || 'SENTRY finding').slice(0, 400),
        proposed_solution: f?.proposed_solution || null,
        product,
      });
    }
  }
  return findings;
}

function classifyProposalOwner(code = '') {
  if (/TELEMETRY|TSOS|MODEL|TOKEN|COST|ROUTING/i.test(code)) return 'CFO';
  if (/FAKE_GREEN|LEGACY|AUTHORITY|MEMORY|USEFUL_WORK|PROOF|REPAIR|DEPLOY/i.test(code)) return 'SNT';
  return 'Chair';
}

function classifyProposalLane(code = '') {
  if (/FOUNDER_USABILITY|DIRECT_ACTION|UI|LIFERE|CHAIR/i.test(code)) return 'product';
  if (/TELEMETRY|TSOS|MODEL|TOKEN|COST/i.test(code)) return 'optimization';
  return 'governance';
}

function proposalPriority(code = '', blocker = true) {
  if (/FALSE_GREEN|LEGACY_AUTHORITY|USEFUL_WORK|PROOF|MEMORY_NOT_RUNTIME_PROVEN/i.test(code)) return blocker ? 'P0' : 'P1';
  if (/TELEMETRY|TSOS|SCHEDULER|DEPLOY/i.test(code)) return blocker ? 'P1' : 'P2';
  return blocker ? 'P1' : 'P2';
}

function buildProposalFromFinding(finding = {}, kind = 'blocker') {
  const code = String(finding.code || finding.id || 'UNKNOWN');
  const isBlocker = kind === 'blocker' || kind === 'sentry';
  const detail = String(finding.detail || finding.note || 'Repair runtime gap').slice(0, 120);
  const whyBase = String(finding.detail || finding.note || 'Runtime gap detected').slice(0, 400);
  const whyNow = finding.proposed_solution
    ? `${whyBase} | Proposed solution: ${String(finding.proposed_solution).slice(0, 240)}`
    : whyBase;
  const proposal = {
    proposal_id: `${kind}:${code}`,
    source: kind,
    source_code: code,
    priority: proposalPriority(code, isBlocker),
    owner: classifyProposalOwner(code),
    lane: classifyProposalLane(code),
    title: `${code}: ${detail}`,
    why_now: whyNow,
    consensus_path: ['SNT', 'CFO', 'Chair', 'ARC'],
    arc_handoff_required: true,
  };
  return {
    ...proposal,
    blueprint_delta: buildImprovementDeltaContract({
      source: proposal.source,
      sourceCode: proposal.source_code,
      priority: proposal.priority,
      owner: proposal.owner,
      title: proposal.title,
      whyNow: proposal.why_now,
    }),
  };
}

function buildProposalFromLever(lever = {}) {
  const proposal = {
    proposal_id: `lever:${lever.playbook || 'UNKNOWN'}:${lever.lever || 'unknown'}`,
    source: 'wisdom',
    source_code: lever.playbook || 'UNKNOWN',
    priority: lever.count >= 3 ? 'P1' : 'P2',
    owner: /routing|model|cost/i.test(lever.lever || '') ? 'CFO' : 'Wisdom',
    lane: /routing|model|cost/i.test(lever.lever || '') ? 'optimization' : 'governance',
    title: `${lever.playbook || 'UNKNOWN'} recurring ${lever.count || 0}x — institutionalize ${lever.lever || 'repair'}`,
    why_now: `Compound improvement log shows repeated ${lever.playbook || 'unknown'} failures. Convert repeated repair into permanent prevention.`,
    consensus_path: ['Wisdom', 'SNT', 'Chair', 'ARC'],
    arc_handoff_required: true,
  };
  return {
    ...proposal,
    blueprint_delta: buildImprovementDeltaContract({
      source: proposal.source,
      sourceCode: proposal.source_code,
      priority: proposal.priority,
      owner: proposal.owner,
      title: proposal.title,
      whyNow: proposal.why_now,
    }),
  };
}

function rankPriority(priority = 'P2') {
  return { P0: 0, P1: 1, P2: 2, P3: 3 }[priority] ?? 4;
}

export function buildBuilderOSImprovementLoopStatus({
  readiness,
  schedulerStatus = getBpPrioritySchedulerStatus(),
} = {}) {
  const compound = getCompoundImprovementSummary();
  const blockers = readiness?.blockers || [];
  const warnings = readiness?.warnings || [];
  const sentryFindings = readSentryFindings();
  const fakeGreenRisks = (readiness?.fake_green_risks || []).map((detail, index) => ({
    code: `FAKE_GREEN_RISK_${index + 1}`,
    detail,
  }));

  const proposals = [
    ...blockers.map((b) => buildProposalFromFinding(b, 'blocker')),
    ...sentryFindings.map((s) => buildProposalFromFinding(s, 'sentry')),
    ...warnings.slice(0, 5).map((w) => buildProposalFromFinding(w, 'warning')),
    ...fakeGreenRisks.slice(0, 3).map((r) => buildProposalFromFinding(r, 'fake_green')),
    ...(compound.levers || []).slice(0, 5).map((lever) => buildProposalFromLever(lever)),
  ]
    .sort((a, b) => rankPriority(a.priority) - rankPriority(b.priority))
    .slice(0, 12);

  const departments = {
    SNT: {
      findings_count: blockers.length + warnings.length + fakeGreenRisks.length + sentryFindings.length,
      sentry_findings_count: sentryFindings.length,
      top_findings: uniq(
        blockers.map((b) => b.code)
          .concat(sentryFindings.map((s) => s.code))
          .concat(warnings.map((w) => w.code))
      ).slice(0, 8),
    },
    Wisdom: {
      total_failures_logged: compound.total_failures_logged || 0,
      unique_levers: compound.unique_levers || 0,
      last_improvement_at: compound.last_improvement_at || null,
    },
    CFO: {
      scheduler_enabled: schedulerStatus.scheduler.enabled,
      scheduler_healthy: schedulerStatus.scheduler.healthy,
      queue_has_incomplete_work: schedulerStatus.scheduler.queue_has_incomplete_work,
      cost_focus: [
        'Use cheaper-first model routing until reasoning failure is proven.',
        'Do not escalate model tier for infra/deploy/env/schema blockers.',
        'Convert repeated failure families into permanent prevention hooks.',
      ],
    },
    Chair: {
      ready_for_consensus: proposals.length > 0,
      recommended_next_owner: proposals[0]?.owner || null,
      recommended_next_proposal_id: proposals[0]?.proposal_id || null,
    },
    ARC: {
      handoff_required_count: proposals.filter((p) => p.arc_handoff_required).length,
    },
  };

  return {
    ok: true,
    schema: 'builderos_improvement_loop_status_v1',
    generated_at: new Date().toISOString(),
    scheduler: schedulerStatus.scheduler,
    departments,
    proposals,
    blueprint_deltas: proposals.map((proposal) => proposal.blueprint_delta),
    consensus_contract: {
      required: true,
      path: ['SNT', 'CFO', 'Chair', 'ARC'],
      note: 'Improvement output is a deterministic blueprint-delta contract. No secondary queue is allowed.',
    },
  };
}
