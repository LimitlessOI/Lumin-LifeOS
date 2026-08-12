#!/usr/bin/env node
/**
 * SYNOPSIS: The gate every founder-facing question must pass. Questions that do
 * not meet the Founder Escalation Threshold are refused and routed back to the
 * office that owes the answer.
 *
 * This gate exists because of a specific failure it would have caught. On
 * 2026-08-11 the loop produced ten founder questions, and two of them were put to
 * him directly: which of four dependency-cycle repairs to choose, and how to
 * define seven database schemas. Both were implementation detail the Offices had
 * the machinery to settle. Chair: "Right now it's effectively using you as its
 * missing reasoning layer."
 *
 * The reason it needs to be mechanical rather than cultural is that escalation is
 * cheap for whoever escalates and expensive only for the person receiving it.
 * Asking is always defensible. So the gate makes it structurally expensive: name a
 * criterion from a closed set, show the evidence, or finish the work.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  mayEscalateToFounder,
  ESCALATION_CRITERION,
  INSUFFICIENT_ESCALATION_REASON,
} from '../config/founder-escalation-threshold.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_REL = 'products/receipts/ESCALATION_GATE_RECEIPT.json';

/**
 * Filter a question set. Returns what may reach the founder and what goes back,
 * with the office named for each rejection — a refusal with no owner is just a
 * question nobody answers.
 */
export function applyEscalationGate(questions = []) {
  const admitted = [];
  const routed_back = [];

  for (const q of questions) {
    const verdict = mayEscalateToFounder(q);
    if (verdict.allowed) {
      admitted.push({ ...q, escalation_criterion: verdict.criterion });
    } else {
      routed_back.push({
        subject: q?.subject ?? null,
        asks: q?.asks ?? null,
        refusal: verdict.reason,
        detail: verdict.detail,
        route_back_to: verdict.route_back_to,
        instruction: 'resolve this within your jurisdiction; escalate only if you hit a named criterion and can show it',
      });
    }
  }

  return {
    submitted: questions.length,
    admitted,
    routed_back,
    compression: questions.length > 0 ? Number((1 - admitted.length / questions.length).toFixed(3)) : 0,
    lawful_criteria: Object.values(ESCALATION_CRITERION),
    insufficient_reasons: Object.values(INSUFFICIENT_ESCALATION_REASON),
  };
}

function main() {
  // Audit the live decision set produced by the lifecycle exam.
  const receiptPath = path.join(ROOT, 'products/receipts/OVERLAY_LIFECYCLE_EXAM_RECEIPT.json');
  if (!fs.existsSync(receiptPath)) {
    console.error('no lifecycle exam receipt found — run npm run builderos:overlay:lifecycle first');
    process.exit(1);
  }
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  const questions =
    receipt.acceptance_assessment?.founder_decision_set ?? receipt.founder_decision_set ?? [];
  const result = applyEscalationGate(questions);

  fs.writeFileSync(
    path.join(ROOT, RECEIPT_REL),
    `${JSON.stringify(
      {
        schema: 'escalation_gate_receipt_v1',
        generated_at: new Date().toISOString(),
        produced_by: 'scripts/escalation-gate.mjs',
        purpose:
          'Decision compression: the organization absorbs internal uncertainty and the founder receives only what requires his unique authority.',
        independent_reproduction_command: 'node scripts/escalation-gate.mjs',
        ...result,
      },
      null,
      2
    )}\n`
  );

  console.log(
    JSON.stringify(
      {
        submitted: result.submitted,
        admitted_to_founder: result.admitted.length,
        routed_back: result.routed_back.length,
        compression: result.compression,
        route_back_summary: result.routed_back.map((r) => `${r.subject} -> ${r.route_back_to} (${r.refusal})`),
      },
      null,
      2
    )
  );
}

if (process.argv[1] && process.argv[1].endsWith('escalation-gate.mjs')) {
  main();
}
