/**
 * SYNOPSIS: STEP 5g proof — the governed AUTONOMOUS shipping loop.
 * Proves, with NO network + NO codegen spend (the ship call is dependency-
 * injected), that the loop:
 *   (1) is fenced OFF when GOVERNED_FACTORY_ONLY is not active (returns fence_off),
 *   (2) when the fence is ON, plans the shippable BUILD_QUEUE steps across
 *       products and converts them to governed author_then_write ship steps,
 *   (3) posts exactly those governed steps to the ship-queue shipper,
 *   (4) on a successful ship, marks the shipped BUILD_QUEUE steps DONE + persists,
 *   (5) does NOT mark steps done when the ship fails (fail-closed),
 *   (6) surfaces non-provable steps as gaps and never ships them.
 * Uses a throwaway product queue under docs/products/_gov_autoship_proof/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.COMMAND_CENTER_KEY = process.env.COMMAND_CENTER_KEY || 'proof-key-value-1234567890';
process.env.NEVER_STOP_DAILY_STEP_CAP = '0'; // unlimited during the proof

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PROOF_PRODUCT = '_gov_autoship_proof';
const PROOF_DIR = path.join(REPO_ROOT, 'docs/products', PROOF_PRODUCT);
const QUEUE_PATH = path.join(PROOF_DIR, 'BUILD_QUEUE.json');

const results = [];
const assert = (name, cond, detail = {}) => {
  results.push({ name, pass: Boolean(cond), ...detail });
  if (!cond) console.error('FAIL', name, JSON.stringify(detail));
  else console.log('PASS', name);
};

function writeQueue() {
  fs.mkdirSync(PROOF_DIR, { recursive: true });
  const queue = {
    schema: 'product_build_queue_v1',
    product_id: PROOF_PRODUCT,
    steps: [
      {
        id: 'step-provable',
        status: 'pending',
        target_file: 'docs/products/_gov_autoship_proof/_scratch_module.js',
        task: 'emit a trivial module',
        expected_exports: ['authored'],
      },
      {
        id: 'step-not-provable',
        status: 'pending',
        target_file: 'services/_gov_autoship_proof_no_expectation.js',
        task: 'server-code with no declared expectation — must be a gap',
      },
    ],
  };
  fs.writeFileSync(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`);
}

function cleanup() {
  try { fs.rmSync(PROOF_DIR, { recursive: true, force: true }); } catch { /* noop */ }
}

async function main() {
  cleanup();
  writeQueue();

  const mod = await import('../../services/governed-autonomous-shipping-loop.js');
  const { runGovernedAutonomousShipOnce, listProductsWithQueues } = mod;

  assert('proof product discovered by queue lister', listProductsWithQueues().includes(PROOF_PRODUCT));

  // (1) fence OFF → no shipping
  delete process.env.GOVERNED_FACTORY_ONLY;
  const off = await runGovernedAutonomousShipOnce({});
  assert('fence off => skipped fence_off', off.skipped === true && off.reason === 'fence_off', { off });

  // Turn the fence ON for the remaining assertions.
  process.env.GOVERNED_FACTORY_ONLY = '1';

  // (2)+(3) capture what the loop ships
  const shipped = [];
  const okShip = async ({ product_id, ship_steps }) => {
    shipped.push({ product_id, ship_steps });
    return { status: 200, body: { ok: true, complete: true, shipped: ship_steps.map((s) => ({ step_id: s.step_id })) } };
  };
  const run1 = await runGovernedAutonomousShipOnce({ shipFn: okShip, maxStepsPerProduct: 10 });

  const proofShip = shipped.find((s) => s.product_id === PROOF_PRODUCT);
  assert('shipped exactly the provable step', proofShip && proofShip.ship_steps.length === 1 && proofShip.ship_steps[0].step_id === 'step-provable', { proofShip });
  assert('governed step is author_then_write with assertion_spec', proofShip && proofShip.ship_steps[0].action_type === 'author_then_write' && !!proofShip.ship_steps[0].assertion_spec, { step: proofShip?.ship_steps?.[0] });
  assert('run reports shipped >= 1 and gaps >= 1', run1.ok === true && run1.shipped >= 1 && run1.gaps >= 1, { run1 });

  // (4) the shipped step is now DONE in the persisted queue; the gap step is NOT
  const after = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
  const doneStep = after.steps.find((s) => s.id === 'step-provable');
  const gapStep = after.steps.find((s) => s.id === 'step-not-provable');
  assert('provable step persisted as done', doneStep && doneStep.status === 'done' && doneStep.shipped_via === 'governed_ship_queue', { doneStep });
  assert('non-provable step left pending (never shipped)', gapStep && gapStep.status === 'pending', { gapStep });

  // (5) fail-closed: reset queue, ship fails → step stays pending
  writeQueue();
  const failShip = async () => ({ status: 422, body: { ok: false, error: 'BLOCKED' } });
  const run2 = await runGovernedAutonomousShipOnce({ shipFn: failShip, maxStepsPerProduct: 10 });
  const after2 = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
  const stillPending = after2.steps.find((s) => s.id === 'step-provable');
  assert('failed ship does NOT mark step done (fail-closed)', run2.ok === true && run2.shipped === 0 && stillPending.status === 'pending', { run2, stillPending });

  cleanup();

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  console.log(`\n[STEP-5g PROOF] ${passed}/${total} assertions passed`);
  if (passed !== total) process.exit(1);
}

main().catch((err) => { console.error('PROOF THREW', err); cleanup(); process.exit(1); });
