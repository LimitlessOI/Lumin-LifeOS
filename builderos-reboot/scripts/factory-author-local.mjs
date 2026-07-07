/**
 * SYNOPSIS: Conductor harness — run the GOVERNED FACTORY authoring+SENTRY pipe
 * LOCALLY so the cheapest model hands author a server-code module, SENTRY proves
 * it against the blueprint's assertion_spec, and (only on PASS) the proven file is
 * left in the working tree for the conductor to commit. This exists because
 * factory-core/builder/run-step.js writes to disk but does NOT commit to git, so
 * running the pipe on the prod container is ephemeral — the durable, cheap path is
 * to run the same pipe here and commit its SENTRY-proven output.
 *
 * SO-001 (Chair receipt LIFERE_COUNCIL_1783456053893): Devin authors the SPEC +
 * assertion_spec ONLY; the code itself is authored by the cheap tier and proven by
 * SENTRY. This harness is conductor-glue (scripts/), not the shipped module.
 *
 * Usage: node builderos-reboot/scripts/factory-author-local.mjs <step-spec.json>
 * The step-spec.json is a BUILD_QUEUE-style step: { id, target_file, task, spec,
 * expected_exports?, file_contains?, max_output_tokens? }.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dispatchExecuteStep, resolveRepoPath, REPO_ROOT as REPO_ROOT_DIR } from '../../factory-staging/factory-core/builder/run-step.js';
import { extractContent } from '../../factory-staging/factory-core/builder/authoring.js';
import { toGovernedShipStep } from '../../factory-staging/factory-core/bpb/build-queue-step-adapter.js';
import { attachAuthoredAssertions } from '../../factory-staging/factory-core/bpb/author-assertions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cheapest capable hands first, escalate only on failure. Direct provider calls
// (OpenAI-compatible chat completions) so the harness has no heavy deps.
const TIERS = [
  { member: 'cerebras_llama', provider: 'cerebras', model: 'llama3.1-8b', url: 'https://api.cerebras.ai/v1/chat/completions', key: process.env.CEREBRAS_API_KEY },
  { member: 'openai', provider: 'openai', model: 'gpt-4o-mini', url: 'https://api.openai.com/v1/chat/completions', key: process.env.OPENAI_API_KEY },
];

async function callTier(tier, prompt, maxTokens) {
  const body = {
    model: tier.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: maxTokens || 4000,
  };
  const res = await fetch(tier.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tier.key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${tier.provider} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return json?.choices?.[0]?.message?.content || '';
}

const codegenRunner = {
  generate: async ({ task, target_file, spec, max_output_tokens }) => {
    const prompt = [
      'You are a code-authoring hand for a governed build factory.',
      'Output ONLY the exact, complete file content for the target file.',
      'No explanation, no commentary. A single markdown code fence is allowed.',
      'The file is an ES module (import/export). Node 18+. No external deps beyond what the spec names.',
      `TARGET FILE: ${target_file}`,
      task ? `TASK: ${task}` : '',
      spec ? `SPEC:\n${typeof spec === 'string' ? spec : JSON.stringify(spec, null, 2)}` : '',
    ].filter(Boolean).join('\n\n');
    let lastError = null;
    for (let i = 0; i < TIERS.length; i += 1) {
      const tier = TIERS[i];
      if (!tier.key) { lastError = `no_key:${tier.provider}`; continue; }
      try {
        const raw = await callTier(tier, prompt, max_output_tokens);
        const content = extractContent(raw);
        if (content && content.trim()) return { content, model_tier: tier.member, escalated: i > 0 };
        lastError = `empty_output:${tier.member}`;
      } catch (err) {
        lastError = String(err?.message || err);
        console.error(`  tier ${tier.member} failed: ${lastError}`);
      }
    }
    return { content: null, error: lastError || 'all_tiers_failed' };
  },
};

// SENTRY assertion runner (local): file reads from the working tree.
const assertionRunner = {
  readFile: async (relPath) => fs.readFileSync(resolveRepoPath(relPath), 'utf8'),
};

async function main() {
  const specPath = process.argv[2];
  if (!specPath) { console.error('usage: factory-author-local.mjs <step-spec.json>'); process.exit(2); }
  const bqStep = JSON.parse(fs.readFileSync(path.resolve(specPath), 'utf8'));

  const converted = toGovernedShipStep(bqStep, { product_id: bqStep.product_id });
  if (!converted.ok) { console.error('NOT PROVABLE:', converted.reason); process.exit(1); }
  // BPB authorship: turn the blueprint's assertion_spec into concrete
  // behavior_assertions (provenance 'bpb', never codegen) so SENTRY can prove it.
  const authored = attachAuthoredAssertions(converted.step);
  if (!authored.ok) { console.error('ASSERTION AUTHORSHIP FAILED:', authored.reason); process.exit(1); }
  const baseSpec = authored.step.authoring?.spec || bqStep.spec || '';
  console.log(`BPB authored ${authored.step.behavior_assertions.length} assertion(s) [${authored.provenance}].`);

  // Conductor behavioral proof (runs AFTER SENTRY's file gate). This is the real
  // correctness bar; file_contains only proves the interface exists. On failure the
  // cheap hands re-author with the proof output as feedback — the conductor never
  // hand-fixes the module.
  const proofCommand = bqStep.proof_command || null;
  const maxAttempts = Number(bqStep.max_attempts) || 4;
  let feedback = null;
  let lastReceipt = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const spec = feedback
      ? `${baseSpec}\n\n--- PREVIOUS ATTEMPT FAILED THIS BEHAVIORAL PROOF (fix it, return the COMPLETE corrected file) ---\n${feedback}`
      : baseSpec;
    const step = {
      ...authored.step,
      authoring: { ...authored.step.authoring, spec, max_output_tokens: bqStep.max_output_tokens },
    };

    console.log(`\n[attempt ${attempt}/${maxAttempts}] authoring ${step.target_file} via cheapest tier → SENTRY → proof…`);
    const { body } = await dispatchExecuteStep(
      { mission_id: bqStep.mission_id || 'browser-agent-runtime', blueprint_id: bqStep.blueprint_id || 'ad-hoc', step, skip_intake_gate: true },
      { assertionRunner, codegenRunner },
    );

    if (!body.ok) {
      feedback = `SENTRY/build rejected the file: ${body.status} ${JSON.stringify(body.sentry?.verify || body.summary || '')}`.slice(0, 800);
      console.error(`  ✗ ${feedback}`);
      continue;
    }
    lastReceipt = { model_tier: body.codegen?.model_tier, content_sha256: body.codegen?.content_sha256, assertion_provenance: body.codegen?.assertion_provenance, assertions: body.sentry?.behavior_proof?.results?.length };
    console.log(`  ✓ SENTRY PASS (tier=${body.codegen?.model_tier}, sha=${(body.codegen?.content_sha256 || '').slice(0, 12)})`);

    if (!proofCommand) { break; }
    try {
      execFileSync('node', [proofCommand], { cwd: REPO_ROOT_DIR, stdio: 'pipe' });
      console.log(`  ✓ BEHAVIORAL PROOF PASSED (${proofCommand})`);
      console.log(`\n✅ DONE. Proven file at ${step.target_file}.`);
      console.log(`FACTORY-RECEIPT: local-ship ${lastReceipt.model_tier} sha=${(lastReceipt.content_sha256 || '').slice(0, 16)} SENTRY=PASS assertions=${lastReceipt.assertions} proof=${proofCommand}`);
      return;
    } catch (err) {
      const out = `${err.stdout?.toString() || ''}\n${err.stderr?.toString() || ''}`.trim();
      feedback = `Behavioral proof '${proofCommand}' FAILED:\n${out}`.slice(0, 1200);
      console.error(`  ✗ behavioral proof failed:\n${out.slice(-400)}`);
    }
  }

  console.error(`\nFACTORY could not produce a file passing the behavioral proof in ${maxAttempts} attempts.`);
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
