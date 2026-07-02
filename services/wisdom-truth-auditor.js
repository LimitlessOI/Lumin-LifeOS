/**
 * SYNOPSIS: Wisdom truth auditor — red-team truth gates, scan enforcement gaps, challenge assumptions.
 * No moral judgment: does it work for the system or not? Deception never works. Founder input = GUESS until confirmed.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyAiProseTruthEnvelope } from './ai-prose-truth-envelope.js';
import { enforceTruthLockdown } from './truth-lockdown.js';
import { createUsefulWorkGuard } from './useful-work-guard.js';

export const WISDOM_TRUTH_AUDITOR_VERSION = 'wisdom_truth_auditor_v1';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ASSUMPTION_PATTERNS = [
  {
    id: 'lock_bearing',
    re: /\b(from now on|always|never|must always|every time|ignore the gate|skip the gate|bypass|without asking)\b/i,
    kind: 'lock_bearing',
    weight: 3,
    clarify: (m) => `When you said "${m[0]}", is that a permanent system rule, or a one-time instruction for this session?`,
  },
  {
    id: 'state_as_fact',
    re: /\b(is (broken|ready|done|live|deployed|fixed)|already works|we (shipped|fixed|deployed)|it's working)\b/i,
    kind: 'state_without_receipt',
    weight: 2,
    clarify: (m) => `When you said "${m[0]}", what receipt or screen should I treat as proof — or is that your impression (THINK) pending verification?`,
  },
  {
    id: 'constitutional',
    re: /\b(north star|ssot|amendment|constitutional|change the law|new law|ratify)\b/i,
    kind: 'constitutional',
    weight: 3,
    clarify: (m) => `When you said "${m[0]}", do you want a doctrine note, a Change Receipt, or a full gate-change — and what exact text should change?`,
  },
  {
    id: 'destructive',
    re: /\b(delete all|drop table|force push|wipe|purge everything|remove all)\b/i,
    kind: 'destructive',
    weight: 4,
    clarify: (m) => `When you said "${m[0]}", name the exact scope (paths/tables) — I will not treat this as truth until you confirm scope in plain English.`,
  },
  {
    id: 'ambiguous_ref',
    re: /\b(that|this one|the thing|what we discussed|like before)\b/i,
    kind: 'ambiguous_reference',
    weight: 1,
    clarify: (m) => `When you said "${m[0]}", what specifically does that refer to? (File, feature, or prior message.)`,
  },
  {
    id: 'absolute_certainty',
    re: /\b(obviously|clearly|everyone knows|no doubt|guaranteed|100%)\b/i,
    kind: 'unlabeled_certainty',
    weight: 1,
    clarify: (m) => `When you said "${m[0]}", is that KNOW (you verified), THINK (likely), or GUESS (hypothesis)?`,
  },
];

const ADVERSARIAL_PROBES = [
  {
    id: 'envelope_blocks_open_theater',
    run: () => {
      const { text, envelope } = applyAiProseTruthEnvelope('LifeOS is now open. What would you like to do first?', {
        command_truth: 'NO_COMMAND_RAN',
        taskType: 'wisdom_probe',
      });
      return envelope.theater_blocked === true || !/LifeOS is now open/i.test(text);
    },
  },
  {
    id: 'envelope_blocks_background_work_lie',
    run: () => {
      const { envelope } = applyAiProseTruthEnvelope('I started the build in the background and will notify you when done.', {
        command_truth: 'NO_COMMAND_RAN',
        taskType: 'wisdom_probe',
      });
      return envelope.voice_lie_blocked === true || envelope.theater_blocked === true;
    },
  },
  {
    id: 'lockdown_downgrades_pass_without_command',
    run: () => {
      const out = enforceTruthLockdown({
        pass_fail: 'PASS',
        ok: true,
        command_truth: 'NO_COMMAND_RAN',
        human_summary: 'All good.',
      }, 'chair');
      return out.pass_fail !== 'PASS';
    },
  },
  {
    id: 'lockdown_fail_carries_lesson',
    run: () => {
      const out = enforceTruthLockdown({
        pass_fail: 'FAIL',
        ok: false,
        command_truth: 'NO_COMMAND_RAN',
        first_blocker: 'probe',
      }, 'build_async');
      return Boolean(out.execution_receipt?.lesson);
    },
  },
  {
    id: 'lockdown_blocks_alpha_without_usability',
    run: () => {
      const out = enforceTruthLockdown({
        pass_fail: 'PASS',
        ok: true,
        founder_usability_pass: false,
        command_truth: 'COMMAND_RAN',
        human_summary: 'Point B reached.',
      }, 'mission_pipeline');
      return out.pass_fail === 'FAIL';
    },
  },
];

function rel(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, '/');
}

function walkJs(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const r = rel(abs);
    if (r.includes('node_modules') || r.includes('factory-staging') || r.includes('.git')) continue;
    const st = fs.statSync(abs);
    if (st.isDirectory()) walkJs(abs, out);
    else if (name.endsWith('.js') && !name.endsWith('.test.js')) out.push(abs);
  }
  return out;
}

export function runAdversarialTruthProbes() {
  const results = [];
  for (const probe of ADVERSARIAL_PROBES) {
    let passed = false;
    let error = null;
    try {
      passed = probe.run() === true;
    } catch (err) {
      error = err.message;
    }
    results.push({ id: probe.id, passed, error });
  }
  return results;
}

export function scanTruthEnforcementGaps() {
  const gaps = [];
  const scanDirs = ['routes', 'services', 'core', 'middleware', 'startup'];

  for (const dir of scanDirs) {
    for (const file of walkJs(path.join(ROOT, dir))) {
      const r = rel(file);
      const src = fs.readFileSync(file, 'utf8');

      if (/res\.end\s*\(\s*JSON\.stringify/.test(src) && !src.includes('truthGateOutbound') && !src.includes('enforceTruthOnResponseBody')) {
        gaps.push({ type: 'RES_END_JSON_BYPASS', file: r });
      }
      if (/\.writeHead\s*\([^)]*\)[\s\S]{0,120}res\.end/.test(src) && r.startsWith('routes/') && !src.includes('truth-response-enforcer')) {
        gaps.push({ type: 'WRITEHEAD_END_BYPASS', file: r });
      }
      if (/pass_fail\s*:\s*['"]PASS['"]/.test(src) && !src.includes('enforceTruth') && !src.includes('truth_spine') && !r.includes('test')) {
        if (!r.includes('truth-lockdown') && !r.includes('lifeos-execution-truth') && !r.includes('wisdom-truth-auditor')) {
          gaps.push({ type: 'UNGUARDED_PASS_LITERAL', file: r });
        }
      }
      if (/founder_usability_pass\s*:\s*true/.test(src) && !r.includes('test')) {
        gaps.push({ type: 'FOUNDER_USABILITY_PASS_HARDCODED', file: r });
      }
    }
  }

  // server.js is a bootstrap-only composition root (CLAUDE.md protected boundary)
  // that selects a runtime lane. The outbound truth-response enforcer lives in the
  // runtime files it delegates to, so every runtime that can serve founder responses
  // must wire it.
  for (const runtimeFile of ['server-founder-runtime.js', 'server-full-runtime.js']) {
    const runtimeSrc = fs.readFileSync(path.join(ROOT, runtimeFile), 'utf8');
    if (!runtimeSrc.includes('createTruthResponseEnforcer')) {
      gaps.push({ type: 'SERVER_MISSING_TRUTH_MIDDLEWARE', file: runtimeFile });
    }
  }

  return gaps;
}

/**
 * Founder input is never auto-KNOW. Honest attempts can still be wrong.
 */
export function assessFounderUtteranceWisdom(utterance = '', ctx = {}) {
  const text = String(utterance || '').trim();
  const confirmIntent = ctx.confirmIntent === true;
  const assumptions = [];
  let score = 0;

  if (!text) {
    return {
      version: WISDOM_TRUTH_AUDITOR_VERSION,
      needs_clarification: false,
      epistemic_label: 'DON\'T KNOW',
      assumptions: [],
      questions: [],
      risk: 'low',
      founder_input_treated_as: 'empty',
    };
  }

  for (const pat of ASSUMPTION_PATTERNS) {
    const m = text.match(pat.re);
    if (!m) continue;
    score += pat.weight;
    assumptions.push({
      id: pat.id,
      kind: pat.kind,
      phrase: m[0],
      clarify_question: pat.clarify(m),
    });
  }

  if (text.length < 48 && assumptions.some((a) => a.kind === 'ambiguous_reference')) {
    score += 1;
  }

  const risk = score >= 5 ? 'high' : score >= 2 ? 'medium' : 'low';
  const needs_clarification = !confirmIntent && assumptions.length > 0 && (risk !== 'low' || assumptions.length >= 2);

  const questions = assumptions
    .slice(0, 4)
    .map((a) => a.clarify_question);

  if (needs_clarification && !questions.length) {
    questions.push('What do you mean by that? Please explain further so I do not act on a wrong assumption.');
  }

  let epistemic_label = 'THINK';
  if (confirmIntent) epistemic_label = 'THINK';
  else if (risk === 'high') epistemic_label = 'GUESS';
  else if (assumptions.length === 0) epistemic_label = 'THINK';

  return {
    version: WISDOM_TRUTH_AUDITOR_VERSION,
    needs_clarification,
    epistemic_label,
    assumptions,
    questions,
    risk,
    founder_input_treated_as: confirmIntent
      ? 'confirmed_intent_this_turn'
      : 'grain_of_salt_until_clarified',
    wisdom_note: 'No good/bad judgment — only: does this work for the system? Deception never works.',
  };
}

export function formatWisdomClarifySummary(wisdom = {}) {
  const lines = [
    'Wisdom (truth overseer) — clarity before lock',
    wisdom.wisdom_note || '',
    '',
    'I treat founder input as honest but fallible — not automatic law. A tired moment or wrong assumption must not script the system.',
    '',
  ];

  if (wisdom.assumptions?.length) {
    lines.push('Assumptions I need to challenge:');
    for (const a of wisdom.assumptions.slice(0, 4)) {
      lines.push(`• ${a.clarify_question}`);
    }
    lines.push('');
  }

  lines.push('Reply with plain English answers, or confirm: **yes, execute as stated** to lock this turn.');
  lines.push(`Epistemic label on your input this turn: **${wisdom.epistemic_label || 'GUESS'}** (not KNOW until reality receipts agree).`);
  return lines.filter(Boolean).join('\n');
}

export async function runWisdomTruthAudit({ logger } = {}) {
  const probes = runAdversarialTruthProbes();
  const gaps = scanTruthEnforcementGaps();
  const probeFailures = probes.filter((p) => !p.passed);
  const criticalGaps = gaps.filter((g) => g.type === 'FOUNDER_USABILITY_PASS_HARDCODED' || g.type === 'SERVER_MISSING_TRUTH_MIDDLEWARE');

  const report = {
    schema: 'wisdom_truth_audit_v1',
    version: WISDOM_TRUTH_AUDITOR_VERSION,
    at: new Date().toISOString(),
    ok: probeFailures.length === 0 && criticalGaps.length === 0,
    adversarial_probes: probes,
    enforcement_gaps: gaps,
    probe_fail_count: probeFailures.length,
    gap_count: gaps.length,
    critical_gap_count: criticalGaps.length,
  };

  logger?.info?.({
    ok: report.ok,
    probe_fail_count: report.probe_fail_count,
    gap_count: report.gap_count,
  }, '[WISDOM] Truth audit complete');

  return report;
}

export function registerWisdomTruthAuditorScheduler({ logger, intervalMs = 6 * 60 * 60 * 1000 } = {}) {
  const guarded = createUsefulWorkGuard({
    taskName: 'Wisdom Truth Auditor',
    purpose: 'Red-team truth gates and scan for enforcement bypass paths — like Sentry for deception',
    prerequisites: async () => ({ ok: true }),
    workCheck: async () => 1,
    execute: async () => {
      const report = await runWisdomTruthAudit({ logger });
      const outPath = path.join(ROOT, 'products/receipts/WISDOM_TRUTH_AUDIT.json');
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
      const logPath = path.join(ROOT, 'data/chair-live/wisdom-truth-audit.jsonl');
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      fs.appendFileSync(logPath, `${JSON.stringify({ at: report.at, ok: report.ok, probe_fail_count: report.probe_fail_count, gap_count: report.gap_count })}\n`);
      if (!report.ok) {
        logger?.warn?.({ probe_fail_count: report.probe_fail_count, critical_gap_count: report.critical_gap_count }, '[WISDOM] Truth audit found weaknesses');
      }
      return report;
    },
    logger,
  });

  const timer = setInterval(guarded, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  guarded().catch(() => {});
  return { timer, audit: guarded };
}
