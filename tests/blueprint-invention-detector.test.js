/**
 * SYNOPSIS: Locks the deterministic no-invention detector (M1) against the frozen
 * Overlay fixture and against the ways a generator could comply literally while
 * still inventing. Asserts specific defect ids and routing, never bare counts.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  detectInventions,
  detectSchemaInvention,
  detectIdentityMismatch,
  detectStaleTerminology,
  detectOverloadedReadyFlag,
} from '../services/blueprint-invention-detector.js';
import { selectGrounding } from '../services/blueprint-intake.js';

const FIXTURE = JSON.parse(
  fs.readFileSync(
    'docs/products/builderos/fixtures/intake-regression-2026-08-11/SESSION_000146ae_ready_invented_architecture.json',
    'utf8'
  )
);
const EXPECTED = JSON.parse(
  fs.readFileSync('docs/products/builderos/fixtures/intake-regression-2026-08-11/EXPECTED_DEFECTS.json', 'utf8')
);

test('frozen Overlay fixture: every required defect is detected without human help', () => {
  const report = detectInventions(FIXTURE);
  const found = new Set(report.defects.map((d) => d.id));
  for (const required of EXPECTED.required_detections) {
    assert.ok(found.has(required.id), `missed required detection: ${required.id}`);
  }
  assert.equal(report.manufacturing_authorized, false);
  assert.equal(report.verdict, 'BLUEPRINT_DEFECTS_PRESENT');
});

test('every defect names the authority that must resolve it and the resolution required', () => {
  const report = detectInventions(FIXTURE);
  for (const d of report.defects) {
    assert.ok(d.authority, `defect ${d.id} has no routing authority`);
    assert.ok(d.resolution_required, `defect ${d.id} states no required resolution`);
  }
  // Schema decisions are the Architect's; they must never route to the Builder.
  assert.ok(!Object.keys(report.routing).includes('builder'));
});

test('an unspecified column list is not a licence to design the schema', () => {
  const defects = detectSchemaInvention({
    intent: { db_tables_needed: [{ name: 'TaskStore', columns: [] }] },
    blueprint: { steps: [{ id: 'S1', contract: { tables: [{ name: 'TaskStore', columns: ['id UUID', 'owner_id TEXT'] }] } }] },
  });
  assert.equal(defects.length, 1);
  assert.equal(defects[0].id, 'INVENTED_SQL_SCHEMA');
  assert.deepEqual(defects[0].invented_columns, ['id', 'owner_id']);
});

test('a table the intent never named is a defect even if its columns look reasonable', () => {
  const defects = detectSchemaInvention({
    intent: { db_tables_needed: [{ name: 'TaskStore', columns: [{ name: 'id' }] }] },
    blueprint: { steps: [{ id: 'S1', contract: { tables: [{ name: 'SecretAuditLog', columns: ['id UUID'] }] } }] },
  });
  assert.equal(defects[0].id, 'INVENTED_TABLE');
});

test('extra columns smuggled onto a specified table are caught', () => {
  const defects = detectSchemaInvention({
    intent: { db_tables_needed: [{ name: 'Tasks', columns: [{ name: 'id' }, { name: 'status' }] }] },
    blueprint: { steps: [{ id: 'S1', contract: { tables: [{ name: 'Tasks', columns: ['id UUID', 'status TEXT', 'is_admin BOOLEAN'] }] } }] },
  });
  assert.equal(defects.length, 1);
  assert.deepEqual(defects[0].invented_columns, ['is_admin']);
});

test('a fully specified table produces no defect', () => {
  const defects = detectSchemaInvention({
    intent: { db_tables_needed: [{ name: 'Tasks', columns: [{ name: 'id' }, { name: 'status' }] }] },
    blueprint: { steps: [{ id: 'S1', contract: { tables: [{ name: 'Tasks', columns: ['id UUID PRIMARY KEY', 'status TEXT NOT NULL'] }] } }] },
  });
  assert.deepEqual(defects, []);
});

test('product identity may not be derived from a document title', () => {
  const defects = detectIdentityMismatch({
    productName: 'universal-overlay',
    blueprint: { _meta: { product: 'TALOA Universal Overlay & Fluid UI', ssot_tag: 'docs/products/TALOA Universal Overlay & Fluid UI/HOME.md' } },
  });
  const fields = defects.map((d) => d.field);
  assert.ok(fields.includes('_meta.product'));
  assert.ok(fields.includes('_meta.ssot_tag'));
});

test('a correctly bound identity produces no defect', () => {
  const defects = detectIdentityMismatch({
    productName: 'builderos',
    blueprint: { _meta: { product: 'builderos', ssot_tag: 'docs/products/builderos/PRODUCT_HOME.md' } },
  });
  assert.deepEqual(defects, []);
});

test('superseded terminology in acceptance criteria is a defect, read from the bridge not prose', () => {
  const defects = detectStaleTerminology({
    intent: { acceptance_criteria: ['The Presiding Steward approves the plan'] },
  });
  assert.equal(defects[0].id, 'STALE_RATIFIED_TERMINOLOGY');
  assert.equal(defects[0].canonical_term, 'Conductor');
});

test('canonical terminology passes', () => {
  assert.deepEqual(detectStaleTerminology({ intent: { acceptance_criteria: ['The Conductor approves the plan'] } }), []);
});

test('structural validity alone cannot authorize execution', () => {
  const defects = detectOverloadedReadyFlag({
    arcReport: { ready_to_execute: true, validation_method: 'deterministic_structural_check' },
  });
  assert.equal(defects[0].id, 'OVERLOADED_READY_FLAG');
  assert.ok(defects[0].missing.includes('EXECUTION_AUTHORIZED'));
});

test('a ready flag backed by real intent validation is accepted', () => {
  assert.deepEqual(
    detectOverloadedReadyFlag({
      arcReport: { ready_to_execute: true, architect_intent_validated: true, execution_authorized: true },
    }),
    []
  );
});

test('grounding selection always includes tables the intent mentions, even beyond the budget', () => {
  const many = Array.from({ length: 200 }, (_, i) => `table_${String(i).padStart(3, '0')}`);
  many.push('taskstore');
  const g = selectGrounding(many, { mentioned: ['TaskStore'], budget: 5 });
  assert.ok(g.selected.includes('taskstore'), 'a mentioned table must never be truncated away');
  assert.equal(g.total, 201);
  assert.equal(g.truncated, true);
});
