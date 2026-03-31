import { test } from 'node:test';
import assert from 'node:assert';
import { classifyR4RAttachment } from '../services/tc-r4r-attachment-classify.js';

test('classifyR4RAttachment: repair request filenames', () => {
  assert.strictEqual(classifyR4RAttachment('BINSR.pdf'), 'repair_request');
  assert.strictEqual(classifyR4RAttachment('buyer_repair_request.pdf'), 'repair_request');
  assert.strictEqual(classifyR4RAttachment('R4R-6453.pdf'), 'repair_request');
});

test('classifyR4RAttachment: inspection report filenames', () => {
  assert.strictEqual(classifyR4RAttachment('Home_Inspection_Report.pdf'), 'inspection_report');
  assert.strictEqual(classifyR4RAttachment('inspection-summary.pdf'), 'inspection_report');
});

test('classifyR4RAttachment: ambiguous / other', () => {
  assert.strictEqual(classifyR4RAttachment('disclosure.pdf'), 'other');
  assert.strictEqual(classifyR4RAttachment(''), 'other');
});
