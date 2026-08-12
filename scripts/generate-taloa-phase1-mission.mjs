#!/usr/bin/env node
/**
 * SYNOPSIS: Turn the sealed Taloa Phase 1 blueprint into an executable factory mission.
 *
 * The Overlay blueprint reached MANUFACTURING_AUTHORIZED on 2026-08-11 and then
 * sat there: authorized, scheduled into two lanes, and never executed, because
 * nothing converted `products/artifacts/OVERLAY_AMENDED_BLUEPRINT.json` into the
 * mission shape `builderos-reboot/scripts/execute-mission.mjs` actually runs.
 * Two days of planning produced zero files. This is the missing seam.
 *
 * Every task prompt here is derived mechanically from the sealed contract --
 * factory_signature, exports, table columns, test_assertions -- so the builder
 * is told what the blueprint already decided and nothing more. Where the
 * blueprint is silent on something the SQL cannot omit (column types), a single
 * stated rule covers every column rather than a per-column judgement call, so
 * two runs produce the same schema.
 *
 * Usage: node scripts/generate-taloa-phase1-mission.mjs [--lane 1|2] [--all]
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BLUEPRINT = path.join(ROOT, 'products/artifacts/OVERLAY_AMENDED_BLUEPRINT.json');
const SSOT = 'docs/products/universal-overlay/PRODUCT_HOME.md';
const MISSION_ID = 'TALOA-OVERLAY-P1-0001';
const MISSION_DIR = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION_ID);

// The acceptance script is hand-authored (SO-001 permits scripts/CI) and lives
// at the path the blueprint's own step 16 names, so the sealed file list still
// describes reality.
const ACCEPTANCE = 'node scripts/verify-universaloverlay.mjs';
const ACCEPTANCE_STEP = 'TALOA-P1-016';

const blueprint = JSON.parse(fs.readFileSync(BLUEPRINT, 'utf8'));

function exportedFactoryName(step) {
  const signature = step.contract?.factory_signature || '';
  const match = signature.match(/export\s+function\s+(\w+)/);
  if (match) return match[1];
  return (step.contract?.exports || [])[0] || null;
}

function methodsFromAssertions(step) {
  return (step.contract?.test_assertions || [])
    .map((a) => (String(a).match(/\.(\w+)\s+is callable/) || [])[1])
    .filter(Boolean);
}

function sqlTask(step) {
  const reuse = step.contract?.reuses_existing_table;
  const header = `The file MUST begin with a SQL comment line exactly "-- @ssot ${SSOT}".`;

  if (reuse) {
    return [
      header,
      `This migration creates NO new table. ${step.purpose}`,
      `Write idempotent SQL that does exactly two things and nothing else:`,
      `(1) Inside a DO $$ ... $$ block, if to_regclass('public.${reuse}') IS NULL then RAISE NOTICE that the bind is deferred and RETURN — do NOT RAISE EXCEPTION. These files are dated 20240101 and can run before the table's own CREATE (lifeos_tasks is 20260723). Crashing boot of the whole app is the wrong fail-closed.`,
      `(2) If the table exists, COMMENT ON TABLE ${reuse} from inside that same DO block (EXECUTE) recording the Taloa Phase 1 binding. Never COMMENT outside the guard — a missing table would then fail the COMMENT.`,
      `Do NOT write CREATE TABLE. Do NOT ALTER or DROP anything. Do NOT insert rows.`,
    ].join(' ');
  }

  const table = (step.contract?.tables || [])[0] || {};
  const columns = table.columns || [];
  return [
    header,
    step.purpose,
    `Write CREATE TABLE IF NOT EXISTS ${table.name} containing exactly these columns and no others: ${columns.join(', ')}.`,
    `Assign types by this rule, and do not invent any other type:`,
    `a column named id -> UUID PRIMARY KEY DEFAULT gen_random_uuid();`,
    `any column whose name ends in _at -> TIMESTAMPTZ NOT NULL DEFAULT now();`,
    `any column whose name ends in _count -> INTEGER NOT NULL DEFAULT 0;`,
    `any column named component_tree, params, payload, metadata or capabilities -> JSONB NOT NULL DEFAULT '{}'::jsonb;`,
    `every remaining column -> TEXT.`,
    `Then add CREATE INDEX IF NOT EXISTS statements for any column that is a lookup key (a column whose name ends in _key, or named product, variant, or platform).`,
    `The whole file must be safely re-runnable. Do NOT drop anything.`,
  ].join(' ');
}

function esmTask(step) {
  const factory = exportedFactoryName(step);
  const methods = methodsFromAssertions(step);
  const signature = step.contract?.factory_signature;
  const tables = (step.contract?.tables || []).map((t) => t?.name).filter(Boolean);
  return [
    `The file MUST begin with a JSDoc block comment containing a line exactly "@ssot ${SSOT}" (mandatory, enforced by a commit gate).`,
    `${step.purpose}`,
    signature ? `Export exactly this factory function, with this exact name and destructured parameter shape: ${signature}.` : `Export a factory function named ${factory}.`,
    methods.length
      ? `The object it returns MUST expose these methods, each a real async function, not a stub or a thrown "not implemented": ${methods.join(', ')}.`
      : `The object it returns MUST expose the behaviour described above as named async methods.`,
    `Constraints: ES module syntax (import/export, no require); no top-level side effects, no timers started at import, no network calls, and no AI/model calls;`,
    tables.length
      ? `SQL is allowed only against these sealed tables: ${tables.join(', ')} — all of it through the injected pool, no other client.`
      : `Sealed contract tables is []. Do not query, CREATE, or name any SQL table. Use only injected collaborators. Inventing a table is a grounding failure.`,
    `validate required constructor dependencies up front and throw a clear Error naming the missing one;`,
    `every method must return a plain serialisable object, never undefined;`,
    `depend only on node builtins and the injected dependencies -- add no new npm packages.`,
  ].join(' ');
}

function behaviorAssertions(step) {
  if (step.type === 'sql') {
    const reuse = step.contract?.reuses_existing_table;
    const table = (step.contract?.tables || [])[0];
    const needle = reuse || table?.name;
    const assertions = [{ type: 'file_contains', target: step.file, substring: '@ssot' }];
    if (needle) assertions.push({ type: 'file_contains', target: step.file, substring: needle });
    assertions.push({
      type: 'file_contains',
      target: step.file,
      substring: reuse ? 'RAISE EXCEPTION' : 'CREATE TABLE IF NOT EXISTS',
    });
    return assertions;
  }
  const factory = exportedFactoryName(step);
  const assertions = [{ type: 'exports_smoke', target: step.file }];
  if (factory) assertions.push({ type: 'file_contains', target: step.file, substring: factory });
  for (const method of methodsFromAssertions(step)) {
    assertions.push({ type: 'file_contains', target: step.file, substring: method });
  }
  return assertions;
}

function sandboxFor(step) {
  if (step.file.startsWith('db/migrations/')) return 'db/migrations/**';
  if (step.file.startsWith('services/taloa/')) return 'services/taloa/**';
  return `${path.dirname(step.file)}/**`;
}

function toMissionStep(step, index) {
  const isSql = step.type === 'sql';
  const factory = exportedFactoryName(step);
  return {
    step_id: step.id,
    phase_id: 'P1',
    title: `${isSql ? 'Migration' : 'Service'}: ${step.file}`,
    target_file: step.file,
    target_files: [step.file],
    action_type: 'author_then_write',
    patch_mode: false,
    task: isSql ? sqlTask(step) : esmTask(step),
    // The frozen contract travels as the spec so the authoring model is bound to
    // what the Architect sealed, not to a paraphrase of it. ship-queue also
    // requires task+spec+assertion_spec together before a step is rebuildable.
    spec: JSON.stringify(
      {
        step_id: step.id,
        purpose: step.purpose,
        sealed_contract: step.contract,
        ssot_tag: SSOT,
        amended_by: step._amended_by || null,
      },
      null,
      2,
    ),
    // No tiers override: these are load-bearing server modules, so SO-003's
    // strong-first default chain applies rather than a cheap-first list.
    expected_exports: isSql || !factory ? [] : [factory],
    assertion_spec: {
      expected_exports: isSql || !factory ? [] : [factory],
      file_contains: behaviorAssertions(step)
        .filter((a) => a.type === 'file_contains')
        .map((a) => a.substring),
    },
    behavior_assertions: behaviorAssertions(step),
    sandbox_boundary: sandboxFor(step),
    authority_owner: 'BPB',
    on_block: 'BLOCKED_RETURN_TO_BPB',
    blocked_return_type_on_failure: 'BLOCKED_RETURN_TO_BPB',
    non_goals: [
      'Do not modify any file other than the target file.',
      'Do not widen any Body capability or authority -- Gate 0 (blueprint 45a) is still open.',
    ],
    dependencies: step.deps || [],
    acceptance_test_ids: [`AT-${step.id}`],
    _blueprint_index: index + 1,
  };
}

const sourceSteps = blueprint.steps.filter((s) => s.id !== ACCEPTANCE_STEP);
const steps = sourceSteps.map(toMissionStep);

// Source coverage: every sealed step is either emitted or the hand-authored
// acceptance script. Silence here is how 16 steps became 0 files.
const accounted = new Set([...steps.map((s) => s.step_id), ACCEPTANCE_STEP]);
const missing = blueprint.steps.map((s) => s.id).filter((id) => !accounted.has(id));
if (missing.length) {
  console.error(`REFUSING: ${missing.length} sealed step(s) unaccounted for: ${missing.join(', ')}`);
  process.exit(1);
}

const mission = {
  mission_id: MISSION_ID,
  blueprint_id: `${MISSION_ID}-BP1`,
  scope:
    'Taloa Universal Overlay & Fluid UI, Phase 1: seven store bindings (five reusing existing canonical tables, two net-new) and eight services under services/taloa/ implementing the overlay host, body adapter, perception fusion, task orchestration, strategy routing, capsule runtime, verification and receipt ledger.',
  authority: 'BPB',
  acceptance_command: ACCEPTANCE,
  allowed_action_types: ['author_then_write'],
  blueprint_status: 'handoff_ready',
  derived_from: {
    sealed_blueprint: 'products/artifacts/OVERLAY_AMENDED_BLUEPRINT.json',
    plan_receipt: 'products/receipts/TWO_FACTORY_PLAN_RECEIPT.json',
    generator: 'scripts/generate-taloa-phase1-mission.mjs',
    source_step_count: blueprint.steps.length,
    emitted_step_count: steps.length,
    hand_authored_steps: [ACCEPTANCE_STEP],
  },
  steps,
};

fs.mkdirSync(MISSION_DIR, { recursive: true });
fs.writeFileSync(path.join(MISSION_DIR, 'BLUEPRINT.json'), `${JSON.stringify(mission, null, 2)}\n`);

console.log(`Wrote ${path.relative(ROOT, path.join(MISSION_DIR, 'BLUEPRINT.json'))}`);
console.log(`  ${steps.length} authored steps + 1 hand-authored acceptance script`);
console.log(`  sql: ${steps.filter((s) => s.target_file.endsWith('.sql')).length}, esm: ${steps.filter((s) => s.target_file.endsWith('.js')).length}`);
console.log(`  acceptance: ${ACCEPTANCE}`);
