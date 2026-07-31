/**
 * SYNOPSIS: End-to-end FACTORY-MASTER-A-TO-Z-0001 demo.
 * Proves: intent → Reasoning Plan → Lens reasoning → Chair synthesis →
 * Blueprint → factory execution → SENTRY PASS receipt.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runCognitiveStep } from '../factory-staging/factory-core/builder/cognitive-step-runner.mjs';
import { dispatchExecuteMission } from '../factory-staging/factory-core/builder/run-mission.js';
import { auditStepReceipt } from '../factory-staging/factory-core/builder/receipt-auditor-gate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const receiptDir = path.join(repoRoot, 'products', 'receipts');

const mission = 'Build and verify a tiny public widget that proves the BuilderOS end-to-end pipeline: reasoning, blueprint, execution, and SENTRY validation.';

function fakeCallModel({ prompt, options }) {
  const lensId = options?.lens_id || 'unknown';
  const responsibility = options?.responsibility || 'chair';
  const isChair = prompt.includes('You are the CHAIR');

  if (isChair) {
    return {
      content: JSON.stringify({
        chair_position: 'Run the FACTORY-DEMO-SAMPLE-0001 mission and produce a SENTRY PASS receipt.',
        tradeoffs: ['No revenue or customer data in demo', 'Layer B browser walkthrough skipped'],
        named_disagreements: [],
        why_this_wins: 'The demo proves intent-to-receipt autonomy with zero reversible risk.',
        confidence_by_lens: { 'chair/founder-philosophy': 0.9, 'chair/steve-jobs': 0.85, 'cfo/cfo-roi': 0.8 },
        propagated_confidence: 0.82,
        limiting_factor: 'Layer B browser walkthrough is skipped in this local demo.',
        unknowns: ['Whether production deploy parity still holds'],
        assumptions: ['Demo assertions are representative of real SENTRY gating'],
        risks: ['Local success may not reflect production runtime'],
        evidence_needed: ['Production parity receipt after deploy'],
        next_action: 'Execute FACTORY-DEMO-SAMPLE-0001 through dispatchExecuteMission.',
      }),
      usage: { total_tokens: 200, estimated_usd: 0 },
    };
  }

  return {
    content: JSON.stringify({
      lens_id: lensId,
      responsibility,
      summary: 'Proceed with the verified public widget demo.',
      position: 'This is a reversible, low-risk mission that validates the full pipeline.',
      knowledge: ['FACTORY-DEMO-SAMPLE-0001 blueprint exists', 'SENTRY behavior assertions are defined'],
      judgment: 'Run the demo mission and capture the SENTRY PASS receipt.',
      confidence: 0.85,
      evidence: ['existing demo blueprint', 'behavior_assertions in step'],
      disagreements: [],
      recommended_action: 'Run dispatchExecuteMission for FACTORY-DEMO-SAMPLE-0001.',
    }),
    usage: { total_tokens: 120, estimated_usd: 0 },
  };
}

const assertionRunner = {
  readFile: async (relPath) => fs.readFileSync(path.join(repoRoot, relPath), 'utf8'),
  importModule: async (relPath) => {
    const target = path.join(repoRoot, relPath);
    if (!fs.existsSync(target)) return undefined;
    return import(new URL(pathToFileURL(target).href));
  },
  http: async ({ method = 'GET', path: p, headers = {} }) => {
    const url = `http://127.0.0.1:${process.env.PORT || 8080}${p}`;
    try {
      const res = await fetch(url, { method, headers });
      return { status: res.status };
    } catch {
      return { status: 0 };
    }
  },
};

async function main() {
  // 1. Cognitive step: reasoning plan + lens synthesis + blueprint.
  const cognitive = await runCognitiveStep({
    mission,
    callModel: fakeCallModel,
    dryRun: false,
  });

  if (!cognitive.blueprint || !cognitive.blueprintReview?.ok) {
    console.error(JSON.stringify({ ok: false, stage: 'cognitive', cognitive }, null, 2));
    process.exit(1);
  }

  // 2. Factory execution: write file and SENTY behavior assertions.
  const exec = await dispatchExecuteMission(
    { mission_id: 'FACTORY-DEMO-SAMPLE-0001' },
    { assertionRunner, publicBaseUrl: process.env.PUBLIC_BASE_URL },
  );

  if (exec.httpStatus !== 200) {
    console.error(JSON.stringify({ ok: false, stage: 'execution', exec }, null, 2));
    process.exit(1);
  }

  // 3. Receipt.
  const receipt = {
    schema: 'master_a_to_z_demo_receipt_v1',
    mission: 'FACTORY-MASTER-A-TO-Z-0001',
    run_at: new Date().toISOString(),
    cognitive_plan_id: cognitive.reasoningPlan?.id || null,
    blueprint_id: cognitive.blueprint?.id || null,
    blueprint_review: cognitive.blueprintReview,
    execution: exec.body,
    verdict: 'DEMO_PASS',
    verified_by: 'run-master-a-to-z-demo.mjs',
    verify_command: 'node scripts/verify-master-a-to-z-demo.mjs',
    skip_git_checkout: true,
  };

  fs.mkdirSync(receiptDir, { recursive: true });
  const receiptPath = path.join(receiptDir, 'MASTER_A_TO_Z_DEMO_RECEIPT.json');
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));

  // 3b. Receipt Auditor replay: fail-closed if the verification command does not reproduce PASS.
  const audit = await auditStepReceipt(null, receiptPath);
  if (!audit.ok) {
    console.error(JSON.stringify({ ok: false, stage: 'receipt_audit', audit }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, receipt: { ...receipt, audit: audit.result } }, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message, stack: err.stack }, null, 2));
  process.exit(1);
});
