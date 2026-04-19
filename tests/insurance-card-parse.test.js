/**
 * @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
 * Deterministic tests for insurance card text parsing (no OCR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseInsuranceCardText } from '../services/insurance-card-parse.js';

describe('parseInsuranceCardText', () => {
  it('extracts Cigna physical-card style blob', () => {
    const text = `
      Administered By Cigna Health and Life Ins. Co.
      Coverage Effective Date 02/13/2026 Open Access Plus
      Group 3344292
      ID U90474268 OI Specialist 20%
      Name Yanhari Leyva Pedraza Hospital ER
      INN DED Ind $1900
    `;
    const p = parseInsuranceCardText(text);
    assert.match(p.payer_name || '', /Cigna Health and Life/i);
    assert.equal(p.member_id, 'U90474268 01');
    assert.equal(p.group_number, '3344292');
    assert.equal(p.subscriber_name, 'Yanhari Leyva Pedraza');
    assert.equal(p.effective_date, '02/13/2026');
    assert.match(p.plan_name || '', /Open Access Plus/i);
    assert.equal(p.deductible_inn, '1900');
  });

  it('extracts mobile app style fields', () => {
    const text = `
      Name Carol Delgadillo Romero Member ID 112006993 01
      Group number 00615649 Effective date 01/01/2026
      Call us 24/7 866-494-2111 myCigna.com
    `;
    const p = parseInsuranceCardText(text);
    assert.match(p.payer_name || '', /Cigna/i);
    assert.ok((p.member_id || '').includes('112006993'));
    assert.equal(p.group_number, '00615649');
    assert.equal(p.subscriber_name, 'Carol Delgadillo Romero');
    assert.equal(p.effective_date, '01/01/2026');
    assert.match(p.support_phone || '', /866-494-2111/);
  });
});
