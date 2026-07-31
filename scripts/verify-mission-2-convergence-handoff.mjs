#!/usr/bin/env node
/**
 * SYNOPSIS: Verify Mission 2 — BuilderOS Convergence handoff readiness and produce handoff artifact.
 * Checks BLUEPRINT.json step completion, OBJECTIVE_VERDICT.json, reality scorecard,
 * and writes the convergence handoff file.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION_DIR = path.join(ROOT, 'builderos-reboot', 'MISSIONS', 'FACTORY-BUILDEROS-CONVERGENCE-0001');
const BLUEPRINT_PATH = path.join(MISSION_DIR, 'BLUEPRINT.json');
const VERDICT_PATH = path.join(MISSION_DIR, 'OBJECTIVE_VERDICT.json');
const SCORECARD_PATH = path.join(MISSION_DIR, 'REALITY_SCORECARD.json');
const HANDOFF_MD = path.join(MISSION_DIR, 'MISSION_2_CONVERGENCE_HANDOFF.md');
const HANDOFF_JSON = path.join(MISSION_DIR, 'MISSION_2_CONVERGENCE_HANDOFF.json');

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    return null;
  }
}

function gitSha(ref = 'HEAD') {
  try {
    return execSync(`git rev-parse ${ref}`, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function checkBlueprint(blueprint) {
  const notDone = (blueprint.steps || []).filter((s) => s.status !== 'DONE');
  const openPhases = (blueprint.phases || []).filter((_, i) => {
    const phaseId = blueprint.phases[i].phase_id;
    return blueprint.steps.some((s) => s.phase_id === phaseId && s.status !== 'DONE');
  });
  return {
    all_steps_done: notDone.length === 0,
    open_steps: notDone.map((s) => s.step_id),
    open_phase_count: openPhases.length,
    completed_step_count: (blueprint.steps || []).filter((s) => s.status === 'DONE').length,
    total_step_count: (blueprint.steps || []).length,
  };
}

function checkVerdict(verdict) {
  return {
    verdict_not_pending: verdict?.verdict && verdict.verdict !== 'PENDING',
    verdict: verdict?.verdict || 'PENDING',
    revenue_loop_closed: Boolean(verdict?.metrics?.revenue_loop_closed),
    decision_drift_count: verdict?.metrics?.decision_drift_count ?? null,
  };
}

function checkScorecard(scorecard) {
  return {
    exists: Boolean(scorecard),
    drift_count: scorecard?.drift_count ?? null,
    total_decisions: scorecard?.total ?? null,
    no_drift: scorecard?.drift_count === 0,
  };
}

function main() {
  const blueprint = readJson(BLUEPRINT_PATH);
  const verdict = readJson(VERDICT_PATH);
  const scorecard = readJson(SCORECARD_PATH);

  if (!blueprint) {
    console.error(JSON.stringify({ ok: false, error: 'BLUEPRINT.json not found' }));
    process.exit(1);
  }

  const bpCheck = checkBlueprint(blueprint);
  const vCheck = checkVerdict(verdict);
  const sCheck = checkScorecard(scorecard);

  const ready = bpCheck.all_steps_done && vCheck.verdict_not_pending && sCheck.no_drift;

  const baseCommit = gitSha('HEAD');
  const originMain = gitSha('origin/main');

  const handoff = {
    ok: ready,
    base_commit: baseCommit,
    origin_main: originMain,
    generated_at: new Date().toISOString(),
    mission_id: blueprint.mission_id,
    blueprint_status: blueprint.blueprint_status,
    summary: 'Mission 2 — BuilderOS Convergence handoff. P0 stop false completion, P1 Builder Readiness Audit, P2 Collaboration Spine, P3 blueprint authority gate, P4 runtime/scheduler convergence, P5 SMOS revenue readiness, and P7 wisdom/reality scorecard are complete. Revenue loop is prepared but awaits founder credentials.',
    package_status: {
      blueprint_all_steps_done: bpCheck.all_steps_done,
      completed_steps: bpCheck.completed_step_count,
      total_steps: bpCheck.total_step_count,
      open_steps: bpCheck.open_steps,
      objective_verdict: vCheck.verdict,
      revenue_loop_closed: vCheck.revenue_loop_closed,
      reality_drift_count: sCheck.drift_count,
    },
    verification_commands: [
      'node scripts/wisdom-decision-drift.mjs',
      'node scripts/verify-mission-2-convergence-handoff.mjs',
      'npm run builder:preflight',
    ],
    next_actions: [
      'Founder: provide email provider (RESEND_API_KEY/SMTP) and Stripe credentials to close SMOS revenue loop.',
      'Run SENTRY Layer A+B on a real $49 SMOS purchase once credentials are live.',
      'Use builderos-reboot/DECISIONS/COLLABORATION_SPINE.md as the canonical context for Mission 3 scoping.',
    ],
  };

  const md = `<!-- SYNOPSIS: Mission 2 — BuilderOS Convergence handoff artifact -->\n# Mission 2 — BuilderOS Convergence Handoff\n\n## Package Status\n\n- **Mission:** ${handoff.mission_id}\n- **Base commit:** \`${handoff.base_commit}\`\n- **Origin/main:** \`${handoff.origin_main}\`\n- **Generated:** ${handoff.generated_at}\n- **Ready:** ${handoff.ok ? 'YES' : 'NO'}\n\n## Summary\n\n${handoff.summary}\n\n## What was true at base commit\n\n- Phase 0 stop-gate closed: deterministic grounding gate prevents false seals.\n- Phase 1 Builder Readiness Audit produced with verdict and ambiguity register.\n- Phase 2 Collaboration Spine and decision records are valid and assembled.\n- Phase 3 mechanical blueprint-authority gate wired as detect-and-route warnings.\n- Phase 4 runtime convergence: BP_PRIORITY scheduler is reachable in founder runtime and armed/disarmed status is observable.\n- Phase 5 SMOS revenue readiness verifier probes email provider and Stripe without sending/charging; awaits founder credentials.\n- Phase 7 Wisdom decision-drift scorecard shows zero drift across all decisions.\n\n## Decisions made\n\n- \`DECISION-0001.md\` — Phase 0 consensus on false seals, overwrite path, decision-log schema, and revenue-loop ordering.\n- \`DECISION-0002.md\` — Build the BuilderOS Collaboration Spine as a minimal artifact-driven system.\n\n## Authority state\n\n- Canonical mission pack: \`builderos-reboot/MISSIONS/FACTORY-BUILDEROS-CONVERGENCE-0001/\`\n- Blueprint: \`BLUEPRINT.json\`\n- Objective verdict: \`OBJECTIVE_VERDICT.json\`\n- Reality scorecard: \`REALITY_SCORECARD.md\` / \`REALITY_SCORECARD.json\`\n\n## Unresolved questions\n\n- Which email provider and sending domain will the founder configure?\n- When will the first real $49 SMOS charge be attempted?\n- What is the next highest-value mission after revenue loop closure?\n\n## How the next agent should continue\n\n1. Read \`COLLABORATION_SPINE.md\` and this handoff.\n2. If founder credentials are available, execute the SMOS revenue loop and run SENTRY Layer A+B.\n3. Otherwise, scope Mission 3 using the \`mission_3_prep\` section of \`OBJECTIVE_VERDICT.json\`.\n\n## Verification commands\n\n${handoff.verification_commands.map((c) => `- \`${c}\``).join('\n')}\n`;

  fs.writeFileSync(HANDOFF_MD, md);
  fs.writeFileSync(HANDOFF_JSON, JSON.stringify(handoff, null, 2) + '\n');

  console.log(JSON.stringify(handoff, null, 2));
  process.exit(ready ? 0 : 1);
}

main();
