#!/usr/bin/env node
/**
 * SYNOPSIS: Runs the frozen Overlay intake as an EXAM against the repaired
 * governance path. Verifies fixture bytes first — a run that passes because the
 * fixture was softened is a failure, so the sha256 pin is checked before any
 * detection happens and a mismatch aborts rather than reports.
 *
 * Passing requires three things, not one:
 *   1. every required defect detected, with no human explaining them;
 *   2. no Nth defect invented while reporting (defects must cite fixture bytes);
 *   3. fail-closed — manufacturing must NOT be authorized.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectInventions } from '../services/blueprint-invention-detector.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE_DIR = 'docs/products/builderos/fixtures/intake-regression-2026-08-11';
const RECEIPT_REL = 'products/receipts/OVERLAY_REGRESSION_EXAM_RECEIPT.json';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

export function runOverlayExam() {
  const expected = JSON.parse(read(`${FIXTURE_DIR}/EXPECTED_DEFECTS.json`));
  const sessionRel = `${FIXTURE_DIR}/SESSION_000146ae_ready_invented_architecture.json`;
  const raw = read(sessionRel);

  // Integrity first: a softened exam is worthless.
  const sha256 = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  const bytes = Buffer.byteLength(raw, 'utf8');
  const integrity = {
    expected_sha256: expected.sha256_of_fixture,
    actual_sha256: sha256,
    expected_bytes: expected.bytes,
    actual_bytes: bytes,
    intact: sha256 === expected.sha256_of_fixture && bytes === expected.bytes,
  };
  if (!integrity.intact) {
    return {
      verdict: 'EXAM_FAIL',
      failure_reason: 'FIXTURE_MODIFIED',
      integrity,
      detail: 'The frozen exam was altered. Any pass from here is meaningless — restore the pinned bytes.',
    };
  }

  // Judge the frozen intake against the governance state it was captured in. One of
  // the required detections is that universal-overlay had no SO-002 gate registered,
  // which stops being true the moment the Conductor lawfully registers it — reading
  // live state would turn that improvement into an exam failure.
  const snapshot = JSON.parse(read(`${FIXTURE_DIR}/GOVERNANCE_SNAPSHOT_AT_CAPTURE.json`));
  const report = detectInventions(JSON.parse(raw), {
    registrySnapshot: { products: snapshot.sentry_registered_product_ids.map((id) => ({ id })) },
  });

  const requiredIds = (expected.required_detections || []).map((d) => d.id);
  const detectedIds = new Set(report.defects.map((d) => d.id));
  const missed = requiredIds.filter((id) => !detectedIds.has(id));
  const extraIds = [...detectedIds].filter((id) => !requiredIds.includes(id));

  // "No Nth invention": every reported defect must cite something. A defect with
  // no evidence field is the detector inventing work, which is the same sin.
  const uncited = report.defects.filter(
    (d) => !d.table && !d.field && !d.scope && !d.product && !d.former_term
  );

  const checks = [
    { id: 'fixture_bytes_intact', pass: integrity.intact },
    { id: 'all_required_defects_detected', pass: missed.length === 0, missed },
    { id: 'fail_closed_not_authorized', pass: report.manufacturing_authorized === false },
    { id: 'every_defect_cites_evidence', pass: uncited.length === 0, uncited: uncited.map((d) => d.id) },
    { id: 'every_defect_routed_to_an_authority', pass: report.defects.every((d) => Boolean(d.authority)) },
    {
      id: 'every_defect_states_required_resolution',
      pass: report.defects.every((d) => Boolean(d.resolution_required)),
    },
    { id: 'no_human_rescue_required', pass: true, note: 'detection path is a pure function of fixture bytes; no operator input is read' },
  ];

  const failed = checks.filter((c) => !c.pass);
  return {
    ok: failed.length === 0,
    // Not 'PASS': that token is reserved for BP-registered mission acceptance (§2.18).
    verdict: failed.length === 0 ? 'EXAM_PASS' : 'EXAM_FAIL',
    failure_reason: failed.length ? failed.map((c) => c.id).join(',') : null,
    acceptance_criterion: expected.acceptance_criterion,
    stage_proven: 'DETECT -> CLASSIFY -> ROUTE',
    stages_not_yet_proven: ['RESOLVE', 'AMEND', 'INVALIDATE', 'REVALIDATE', 'AUTHORIZE', 'EXECUTE'],
    integrity,
    checks,
    required_defect_ids: requiredIds,
    detected_defect_ids: [...detectedIds],
    additional_defect_ids: extraIds,
    report,
  };
}

function main() {
  const result = runOverlayExam();
  const receipt = {
    schema: 'overlay_regression_exam_receipt_v1',
    generated_at: new Date().toISOString(),
    produced_by: 'scripts/run-overlay-regression-exam.mjs',
    separation_collapsed: true,
    separation_note:
      'The same script detects and grades. Mitigation: the graded input is a byte-pinned fixture this script never writes, its sha256 is verified before grading, and every check is a pure function of those bytes — reproducible byte-identically by any third party via `npm run builderos:overlay:exam`. No model judgment is in the verdict path.',
    independent_reproduction_command: 'npm run builderos:overlay:exam',
    ...result,
  };
  const abs = path.join(ROOT, RECEIPT_REL);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(receipt, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        verdict: result.verdict,
        failure_reason: result.failure_reason,
        fixture_intact: result.integrity?.intact,
        defects_detected: result.report?.defect_count ?? 0,
        by_id: result.report?.by_id ?? {},
        routing: result.report?.routing ?? {},
        stage_proven: result.stage_proven,
        receipt: RECEIPT_REL,
      },
      null,
      2
    )
  );
  if (result.verdict !== 'EXAM_PASS') process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('run-overlay-regression-exam.mjs')) {
  main();
}
