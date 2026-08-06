#!/usr/bin/env node
/**
 * SYNOPSIS: Exhaustive V4 Verbal AI Director & Overlay Action test transcript.
 * Proves that natural-language commands are parsed into deterministic, auditable
 * browser action plans, with mandatory stop/confirmation gates before submit.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCommand, resolveSelector, approvePlan, runOverlayAction } from './prototype-overlay-action-v4.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FORM_PATH = path.resolve(__dirname, 'test-form-v4.html');
const TRANSCRIPT_PATH = path.resolve(__dirname, '../products/receipts/COMMUNICATION_SYSTEM_V4_TEST_TRANSCRIPT.json');

class TestLog {
  constructor() { this.tests = []; this.startedAt = new Date().toISOString(); }
  add({ suite, name, ok, error, details }) { this.tests.push({ suite, name, result: ok ? 'PASS' : 'FAIL', error: error || null, details: details || null, at: new Date().toISOString() }); }
  summary() { return { total: this.tests.length, pass: this.tests.filter((t) => t.result === 'PASS').length, fail: this.tests.filter((t) => t.result === 'FAIL').length }; }
  toJSON(extra = {}) { return { schema: 'communication_system_v4_test_transcript_v1', generatedAt: new Date().toISOString(), startedAt: this.startedAt, summary: this.summary(), ...extra, tests: this.tests }; }
}

const log = new TestLog();

async function parserSuite() {
  const cases = [
    {
      name: 'fill_two_fields_stop',
      command: 'Fill the full name with Alice Smith and the email with alice@example.com and stop before submitting',
      expectSteps: [
        { action: 'fill', field: 'full name', value: 'Alice Smith' },
        { action: 'fill', field: 'email', value: 'alice@example.com' },
        { action: 'stop' },
      ],
    },
    {
      name: 'type_budget_select_plan',
      command: 'Type 5000 into the budget and select Pro from the plan dropdown',
      expectSteps: [
        { action: 'fill', field: 'budget', value: '5000' },
        { action: 'select', field: 'plan', option: 'Pro' },
      ],
    },
    {
      name: 'click_reset',
      command: 'Click the reset button',
      expectSteps: [
        { action: 'click', target: 'reset' },
      ],
    },
    {
      name: 'submit_blocked',
      command: 'Click the submit button',
      expectRisk: true,
    },
    {
      name: 'navigate_settings',
      command: 'Go to the settings page',
      expectSteps: [
        { action: 'navigate', target: 'settings' },
      ],
    },
  ];

  for (const c of cases) {
    const plan = parseCommand(c.command);
    try {
      assert.ok(plan.intent === 'action_plan' || plan.intent === 'unknown', 'intent present');
      if (c.expectSteps) {
        for (const expect of c.expectSteps) {
          const match = plan.steps.find((s) => {
            if (s.action !== expect.action) return false;
            if (expect.field !== undefined) return s.field === expect.field;
            if (expect.target !== undefined) return s.target === expect.target;
            if (expect.option !== undefined) return s.option === expect.option;
            return true;
          });
          assert.ok(match, `expected step ${JSON.stringify(expect)} in ${JSON.stringify(plan.steps)}`);
          if (expect.value !== undefined) assert.strictEqual(match.value, expect.value, 'value matches');
          if (expect.option !== undefined) assert.strictEqual(match.option, expect.option, 'option matches');
        }
      }
      if (c.expectRisk) {
        const app = approvePlan(plan);
        assert.strictEqual(app.approved, false, 'risky submit plan blocked');
      }
      log.add({ suite: 'parser', name: c.name, ok: true, details: plan });
    } catch (err) {
      log.add({ suite: 'parser', name: c.name, ok: false, error: err.message, details: plan });
    }
  }
}

async function selectorSuite() {
  const cases = [
    { step: { field: 'full name' }, expect: 'input[name="fullName"],#fullName,input[name="name"]' },
    { step: { field: 'email' }, expect: 'input[name="email"],#email,input[type="email"]' },
    { step: { field: 'phone' }, expect: 'input[name="phone"],#phone' },
    { step: { target: 'submit' }, expect: '#submitBtn,[type="submit"]' },
  ];
  for (const c of cases) {
    try {
      assert.strictEqual(resolveSelector(c.step), c.expect);
      log.add({ suite: 'selector', name: c.step.field || c.step.target, ok: true, details: c });
    } catch (err) {
      log.add({ suite: 'selector', name: c.step.field || c.step.target, ok: false, error: err.message, details: c });
    }
  }
}

async function browserSuite() {
  let browserResult;
  try {
    browserResult = await runOverlayAction(
      'Fill the full name with Bob Jones and the email with bob@example.com and the phone with 555-1234 and stop before submitting',
      'file://' + FORM_PATH,
    );
    const { plan, receipt } = browserResult;
    assert.ok(plan.steps.some((s) => s.action === 'fill' && s.field === 'full name' && s.value === 'Bob Jones'), 'full name step');
    assert.ok(plan.steps.some((s) => s.action === 'fill' && s.field === 'email' && s.value === 'bob@example.com'), 'email step');
    assert.ok(plan.steps.some((s) => s.action === 'fill' && s.field === 'phone' && s.value === '555-1234'), 'phone step');
    assert.ok(plan.steps.some((s) => s.action === 'stop'), 'stop step');
    assert.ok(!plan.steps.some((s) => s.action === 'click' && /submit/i.test(s.target || '')), 'no submit click in plan');
    assert.ok(receipt.steps.length > 0, 'receipt has steps');
    log.add({ suite: 'browser', name: 'fill_form_and_stop', ok: true, details: { plan, receipt } });
  } catch (err) {
    log.add({ suite: 'browser', name: 'fill_form_and_stop', ok: false, error: err.message, details: browserResult || null });
    // Do not fatal; keep parsing tests but fail at end.
  }
}

async function main() {
  await parserSuite();
  await selectorSuite();
  await browserSuite();

  const summary = log.summary();
  const report = log.toJSON({ prototype: 'scripts/prototype-overlay-action-v4.mjs' });

  fs.mkdirSync(path.dirname(TRANSCRIPT_PATH), { recursive: true });
  fs.writeFileSync(TRANSCRIPT_PATH, JSON.stringify(report, null, 2));

  console.log(`V4 Overlay Action test transcript: ${summary.pass}/${summary.total} passed.`);
  if (summary.fail > 0) {
    console.log('Failures:');
    for (const t of log.tests.filter((t) => t.result === 'FAIL')) console.log(`  [${t.suite}] ${t.name}: ${t.error}`);
    process.exit(1);
  } else {
    console.log(`All V4 tests passed. Transcript written to ${TRANSCRIPT_PATH}`);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
