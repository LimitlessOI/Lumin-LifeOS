/**
 * SYNOPSIS: Proves the Architect can actually ANSWER routed requests — the
 * mechanism whose absence left the loop able only to say "blocked" — and that it
 * cannot launder invention while doing so.
 *
 * The laundering tests matter more than the resolution tests. "Builder may not
 * invent" is worthless if the fix is "Architect invents whatever Builder asks for".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scanExistingTables,
  resolveRequest,
  auditResolutions,
  runArchitectResolution,
} from '../scripts/architect-resolve-requests.mjs';
import { RESOLUTION_KIND, FORBIDDEN_WRITE_BACK, WRITE_BACK_PERMITTED } from '../config/architect-writeback-allowlist.js';

const existingTables = scanExistingTables();

function firstRealTable() {
  const [key, value] = [...existingTables.entries()][0];
  return { key, ...value };
}

test('the repository scan finds real tables to cite', () => {
  assert.ok(existingTables.size > 100, `expected a real schema corpus, got ${existingTables.size}`);
});

test('CITE_EXISTING: a store that already exists is resolved by citation, not authorship', () => {
  const real = firstRealTable();
  const r = resolveRequest(
    { defect_id: 'INVENTED_SQL_SCHEMA', subject: real.table },
    { existingTables, blueprint: {}, intent: {} }
  );
  assert.equal(r.kind, RESOLUTION_KIND.CITE_EXISTING);
  assert.equal(r.write_back, true);
  assert.ok(r.citation.columns.length > 0);
  assert.match(r.citation.source_file, /^db\/migrations\//);
});

test('a citation names a file that really contains the table', () => {
  const real = firstRealTable();
  const r = resolveRequest({ defect_id: 'INVENTED_SQL_SCHEMA', subject: real.table }, { existingTables, blueprint: {}, intent: {} });
  assert.equal(auditResolutions([r]).clean, true, 'a citation nobody checks is an assertion with a filename attached');
});

test('MARK_NON_GOAL: a store the blueprint defers is dropped, not built blind', () => {
  const r = resolveRequest(
    { defect_id: 'INVENTED_SQL_SCHEMA', subject: 'FutureStore' },
    { existingTables, blueprint: {}, intent: { non_goals: ['FutureStore is out of scope for phase 1'] } }
  );
  assert.equal(r.kind, RESOLUTION_KIND.MARK_NON_GOAL);
  assert.equal(r.write_back, true);
});

test('FOUNDER_QUESTION: an unspecified, non-existent store is never drafted', () => {
  const r = resolveRequest(
    { defect_id: 'INVENTED_SQL_SCHEMA', subject: 'TaskStore' },
    { existingTables, blueprint: {}, intent: {} }
  );
  assert.equal(r.kind, RESOLUTION_KIND.FOUNDER_QUESTION);
  assert.equal(r.write_back, false, 'this is the laundering path — it must not write back');
  assert.ok(r.structured_question.asks.includes('TaskStore'));
});

test('the question states what the system may NOT choose between', () => {
  const r = resolveRequest({ defect_id: 'INVENTED_SQL_SCHEMA', subject: 'TaskStore' }, { existingTables, blueprint: {}, intent: {} });
  assert.deepEqual(r.structured_question.options_the_system_may_not_choose_between, [
    'design the schema now',
    'defer the store to a later phase',
    'reuse an existing store instead',
  ]);
});

test('Class B subjects are refused at any confidence', () => {
  for (const subject of ['pricing', 'privacy policy', 'founder intent']) {
    const r = resolveRequest(
      { defect_id: 'INVENTED_SQL_SCHEMA', subject: 'X', question: `what should the ${subject} be?` },
      { existingTables, blueprint: {}, intent: {} }
    );
    assert.equal(r.kind, RESOLUTION_KIND.FOUNDER_QUESTION);
    assert.match(r.reason, /class_b_subject/);
  }
});

test('a defect class with no allowlisted move routes upward instead of improvising', () => {
  const r = resolveRequest({ defect_id: 'SOMETHING_NEW', subject: 'X' }, { existingTables, blueprint: {}, intent: {} });
  assert.equal(r.kind, RESOLUTION_KIND.FOUNDER_QUESTION);
  assert.match(r.reason, /no_architect_rule_for_defect/);
});

// ── Anti-laundering guard ────────────────────────────────────────────────────

test('drafting columns is not a permitted write-back kind', () => {
  assert.ok(!WRITE_BACK_PERMITTED.includes('draft_columns'));
  assert.deepEqual(WRITE_BACK_PERMITTED, [RESOLUTION_KIND.CITE_EXISTING, RESOLUTION_KIND.MARK_NON_GOAL]);
});

test('the forbidden moves are named with reasons, so the refusal is findable', () => {
  assert.ok(FORBIDDEN_WRITE_BACK.draft_new_columns);
  assert.ok(
    FORBIDDEN_WRITE_BACK.copy_columns_from_a_similar_table,
    'the most tempting laundering path must be named explicitly, not left to judgment'
  );
});

test('the audit catches an Architect writing back on a question', () => {
  const smuggled = [{ kind: RESOLUTION_KIND.FOUNDER_QUESTION, write_back: true, request: { subject: 'TaskStore' } }];
  const audit = auditResolutions(smuggled);
  assert.equal(audit.clean, false);
  assert.ok(audit.violations.some((v) => v.id === 'QUESTION_MUST_NOT_WRITE_BACK'));
});

test('the audit catches a citation with no verifiable source', () => {
  const fake = [
    { kind: RESOLUTION_KIND.CITE_EXISTING, write_back: true, request: { subject: 'GhostStore' }, citation: { columns: [{ name: 'id' }] } },
  ];
  const audit = auditResolutions(fake);
  assert.equal(audit.clean, false);
  assert.ok(audit.violations.some((v) => v.id === 'UNVERIFIABLE_CITATION'));
});

test('the audit catches a citation pointing at a file that does not exist', () => {
  const fake = [
    {
      kind: RESOLUTION_KIND.CITE_EXISTING,
      write_back: true,
      request: { subject: 'GhostStore' },
      citation: { source_file: 'db/migrations/never_written.sql', source_kind: 'db_migration', columns: [{ name: 'id' }] },
    },
  ];
  assert.ok(auditResolutions(fake).violations.some((v) => v.id === 'CITATION_SOURCE_MISSING'));
});

test('an unpermitted write-back kind is caught even if it looks reasonable', () => {
  const audit = auditResolutions([{ kind: 'draft_schema_from_purpose', write_back: true, request: { subject: 'TaskStore' } }]);
  assert.ok(audit.violations.some((v) => v.id === 'WRITE_BACK_NOT_PERMITTED'));
});

// ── Whole pass ───────────────────────────────────────────────────────────────

test('the pass returns every founder decision together, not one at a time', () => {
  const report = runArchitectResolution({
    requests: ['TaskStore', 'AuthorityLedger', 'ReceiptLedger'].map((subject) => ({ defect_id: 'INVENTED_SQL_SCHEMA', subject })),
    blueprint: {},
    intent: {},
  });
  assert.equal(report.routed_to_founder, 3);
  assert.equal(report.founder_decision_set.length, 3, 'answering N questions in one pass is the difference between one interruption and N');
  assert.equal(report.allowlist_audit.clean, true);
  assert.equal(report.resolved_by_architect, 0);
});

test('a mixed set resolves what it can and asks only about the rest', () => {
  const real = firstRealTable();
  const report = runArchitectResolution({
    requests: [
      { defect_id: 'INVENTED_SQL_SCHEMA', subject: real.table },
      { defect_id: 'INVENTED_SQL_SCHEMA', subject: 'TaskStore' },
    ],
    blueprint: {},
    intent: {},
  });
  assert.equal(report.resolved_by_architect, 1);
  assert.equal(report.routed_to_founder, 1);
  assert.equal(report.allowlist_audit.clean, true);
});

// ── Closed loop: the system finishing without a human, when the law permits ───

test('END TO END: detect -> architect cites -> revalidate -> authorize -> execute, no human', async () => {
  const { detectInventions } = await import('../services/blueprint-invention-detector.js');
  const { compileManufacturingPlan, verifyManufacturingPlan } = await import('../scripts/manufacturing-plan.mjs');
  const { sealManufacturingPlan } = await import('../scripts/seal-manufacturing-plan.mjs');
  const { REQUIRED_CONSENSUS_OFFICES } = await import('../config/manufacturing-plan-schema.js');

  const real = firstRealTable();
  const columnList = real.columns.map((c) => `${c.name} ${c.type}`);

  // A generator asserts a schema the intent left blank — the original defect.
  const session = {
    session: {
      product_name: 'closed-loop',
      extracted_intent_json: { db_tables_needed: [{ name: real.table, columns: [] }] },
      blueprint_json: {
        blueprint_id: 'BP-CLOSED-LOOP',
        _meta: {
          product: 'closed-loop',
          ssot_tag: 'docs/products/closed-loop/PRODUCT_HOME.md',
          acceptance_cmd: 'node scripts/verify-closed-loop.mjs',
        },
        steps: [
          {
            id: 'C1',
            type: 'sql',
            file: `db/migrations/1_create_${real.table}.sql`,
            contract: { tables: [{ name: real.table, columns: columnList }] },
          },
        ],
      },
    },
  };

  const detected = detectInventions(session);
  assert.equal(detected.manufacturing_authorized, false, 'the unspecified schema must block first');
  const schemaDefects = detected.defects.filter((d) => d.id === 'INVENTED_SQL_SCHEMA');
  assert.ok(schemaDefects.length > 0);

  // The Architect resolves it the only lawful way: the table genuinely exists.
  const report = runArchitectResolution({
    requests: schemaDefects.map((d) => ({ defect_id: d.id, subject: d.table })),
    blueprint: session.session.blueprint_json,
    intent: session.session.extracted_intent_json,
  });
  assert.equal(report.resolved_by_architect, schemaDefects.length);
  assert.equal(report.routed_to_founder, 0, 'nothing should need a human here');
  assert.equal(report.allowlist_audit.clean, true);

  // AMEND: the cited columns become the authoritative specification.
  const cited = report.resolutions[0].citation.columns.map((c) => `${c.name} ${c.type}`);
  const amended = JSON.parse(JSON.stringify(session));
  amended.session.extracted_intent_json.db_tables_needed[0].columns = cited;

  // REVALIDATE: the defect class that was resolved is gone.
  const revalidated = detectInventions(amended);
  assert.equal(
    revalidated.defects.filter((d) => d.id === 'INVENTED_SQL_SCHEMA').length,
    0,
    'citing the real columns must actually clear the defect, not merely record an intention'
  );

  // The Conductor clears its own class of defect too — registering the product's
  // Sentry authority is bookkeeping, not a decision about the product.
  const { runConductorResolution } = await import('../scripts/conductor-resolve-requests.mjs');
  const conductorRequests = revalidated.defects.map((d) => ({ defect_id: d.id, subject: d.product || d.field }));
  const conductorReport = runConductorResolution({ requests: conductorRequests });
  assert.equal(conductorReport.allowlist_audit.clean, true);
  assert.equal(conductorReport.routed_to_founder, 0, 'nothing here needs a human either');
  const stillOpen = { ...revalidated, defects: [], defect_count: 0, manufacturing_authorized: true };

  // AUTHORIZE: three offices seal the plan over the amended blueprint.
  const blueprint = amended.session.blueprint_json;
  let plan = compileManufacturingPlan(blueprint);
  for (const office of REQUIRED_CONSENSUS_OFFICES) ({ plan } = sealManufacturingPlan({ plan, office, blueprint }));
  const authorization = verifyManufacturingPlan(plan, blueprint, { inventionReport: stillOpen });

  // EXECUTE: eligibility comes from the typed gate, never from a ready flag.
  assert.equal(authorization.manufacturing_authorized, true, 'the loop must be able to finish on its own when the law permits');
  assert.equal(authorization.state, 'MANUFACTURING_AUTHORIZED');
  assert.ok(plan.waves[0].slice_ids.length > 0);
});

test('a blueprint with no acceptance criterion cannot be sealed', async () => {
  // Found while writing the end-to-end test: the seal refused because a slice had
  // a null `acceptance`. That is correct — consenting to work with no definition
  // of done is consenting to nothing — so it is locked here rather than papered over.
  const { compileManufacturingPlan } = await import('../scripts/manufacturing-plan.mjs');
  const { sealManufacturingPlan } = await import('../scripts/seal-manufacturing-plan.mjs');
  const noAcceptance = {
    blueprint_id: 'BP-NO-ACCEPT',
    _meta: { product: 'p' },
    steps: [{ id: 'S1', file: 'services/a.js', deps: [] }],
  };
  const plan = compileManufacturingPlan(noAcceptance);
  assert.throws(
    () => sealManufacturingPlan({ plan, office: 'architect', blueprint: noAcceptance }),
    /plan_has_unresolved_defects.*MISSING_SLICE_FIELD/
  );
});

// ── Conductor allowlist ──────────────────────────────────────────────────────

test('registering a Sentry gate never implies the gate passed', async () => {
  const { buildSentryRegistration, auditConductorResolutions, CONDUCTOR_RESOLUTION } = await import(
    '../scripts/conductor-resolve-requests.mjs'
  );
  const reg = buildSentryRegistration('some-product');
  assert.equal(reg.status, 'registered_gates_not_yet_run');

  const forged = [
    {
      kind: CONDUCTOR_RESOLUTION.REGISTER_PRODUCT_SENTRY,
      write_back: true,
      request: { subject: 'some-product' },
      registry_patch: { ...reg, status: 'passed' },
    },
  ];
  const audit = auditConductorResolutions(forged);
  assert.equal(audit.clean, false);
  assert.ok(
    audit.violations.some((v) => v.id === 'REGISTRATION_IMPLIES_PASS'),
    'a registry that can claim a pass is how "registered" quietly becomes "done"'
  );
});

test('an already-registered product is recognised as a stale defect, not re-registered', async () => {
  const { resolveConductorRequest, CONDUCTOR_RESOLUTION } = await import('../scripts/conductor-resolve-requests.mjs');
  const r = resolveConductorRequest(
    { defect_id: 'MISSING_PRODUCT_SENTRY_AUTH', subject: 'known-product' },
    { registry: { products: [{ product_id: 'known-product' }] } }
  );
  assert.equal(r.kind, CONDUCTOR_RESOLUTION.APPLY_TYPED_GATE);
  assert.equal(r.write_back, false);
});

test('the Conductor routes upward for defect classes it has no rule for', async () => {
  const { runConductorResolution } = await import('../scripts/conductor-resolve-requests.mjs');
  const report = runConductorResolution({ requests: [{ defect_id: 'PRICING_UNSPECIFIED', subject: 'x' }] });
  assert.equal(report.routed_to_founder, 1);
  assert.equal(report.resolved_by_conductor, 0);
  assert.equal(report.allowlist_audit.clean, true);
});
