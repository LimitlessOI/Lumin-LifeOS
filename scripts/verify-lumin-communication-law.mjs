#!/usr/bin/env node
/**
 * SYNOPSIS: Verify Lumin Communication Law wiring — anti-formula + twin-matched translation.
 * Usage: node scripts/verify-lumin-communication-law.mjs
 * @ssot builderos-reboot/governance/LUMIN_COMMUNICATION_LAW.json
 */
import {
  auditLuminCommunicationWiring,
  detectFormulaViolations,
  enforceCommunicationLaw,
  isLuminCommunicationLawEnforced,
} from '../services/lumin-communication-guard.js';

const wiring = auditLuminCommunicationWiring();
const sample = "Great question! I'm happy to help. Here's the thing: let me break this down.";
const enforced = enforceCommunicationLaw(sample);
const stillBad = detectFormulaViolations(enforced.text);

const report = {
  schema: 'lumin_communication_verify_v1',
  generated_at: new Date().toISOString(),
  enforced: isLuminCommunicationLawEnforced(),
  wiring,
  sample_scrub: {
    input_preview: sample.slice(0, 80),
    output_preview: enforced.text.slice(0, 120),
    formula_free: stillBad.length === 0,
    receipt: enforced.receipt,
  },
  ok: wiring.ok && stillBad.length === 0,
};

console.log(JSON.stringify(report, null, 2));

if (!report.ok) {
  for (const c of wiring.checks.filter((x) => !x.ok)) {
    console.error(`FAIL ${c.id}: ${c.detail}`);
  }
  if (stillBad.length) {
    console.error('FAIL sample scrub — formula phrases survived enforcement');
  }
  process.exit(1);
}

process.exit(0);
