/**
 * SYNOPSIS: Regression: Zone-1 audit script PBB spec must not contradict operator instructions.
 * Regression: Zone-1 audit script PBB spec must not contradict operator instructions.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generatePbbPlanFromOilAudit,
  canonicalizeZone1AuditInstruction,
} from '../services/builderos-pbb-plan.js';

const FAILED_JOB = {
  id: '179427a8-b18b-4a33-a670-b56c58edac0d',
  instruction:
    'Build scripts/builderos-ollama-token-audit.mjs — read-only CLI that queries token_usage_log for provider ollama. Use pg Pool + dotenv. Export main().',
  metadata_json: {
    target_file: 'scripts/builderos-ollama-token-audit.mjs',
    domain: 'operational',
  },
};

describe('builderos-pbb-plan zone-1 audit', () => {
  it('uses audit spec without npm+pg contradiction', () => {
    const plan = generatePbbPlanFromOilAudit(FAILED_JOB, { ok: true, findings: [] });
    assert.equal(plan.ok, true);
    assert.match(plan.spec, /ZONE-1 READ-ONLY AUDIT MODULE REQUIREMENTS/);
    assert.doesNotMatch(plan.spec, /OPERATOR INSTRUCTION:[\s\S]*pg Pool \+ dotenv/);
    assert.match(plan.spec, /CANONICAL INTERPRETATION/);
    assert.match(plan.spec, /fetch\(\)/);
  });

  it('canonicalize rewrites pg/dotenv/cli to fetch + exports', () => {
    const out = canonicalizeZone1AuditInstruction(FAILED_JOB.instruction, FAILED_JOB.metadata_json.target_file);
    assert.doesNotMatch(out, /pg Pool \+ dotenv/i);
    assert.match(out, /fetch\(\)/i);
    assert.doesNotMatch(out, /Export main\(\)/i);
  });
});
