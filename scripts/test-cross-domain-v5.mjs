#!/usr/bin/env node
/**
 * SYNOPSIS: Exhaustive V5 Cross-Domain Personal Intelligence test transcript.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Domain, PersonalIntelligence } from './prototype-cross-domain-v5.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRANSCRIPT_PATH = path.resolve(__dirname, '../products/receipts/COMMUNICATION_SYSTEM_V5_TEST_TRANSCRIPT.json');

class TestLog {
  constructor() { this.tests = []; this.startedAt = new Date().toISOString(); }
  add({ suite, name, ok, error, details }) { this.tests.push({ suite, name, result: ok ? 'PASS' : 'FAIL', error: error || null, details: details || null, at: new Date().toISOString() }); }
  summary() { return { total: this.tests.length, pass: this.tests.filter((t) => t.result === 'PASS').length, fail: this.tests.filter((t) => t.result === 'FAIL').length }; }
  toJSON(extra = {}) { return { schema: 'communication_system_v5_test_transcript_v1', generatedAt: new Date().toISOString(), startedAt: this.startedAt, summary: this.summary(), ...extra, tests: this.tests }; }
}

const log = new TestLog();

async function domainSuite() {
  const d = new Domain('calendar', 'Calendar');
  d.addRecord({ title: 'Lunch', time: '12pm' });
  try {
    assert.strictEqual(d.records.length, 1, 'record stored');
    assert.strictEqual(d.query().length, 1, 'query returns record');
    assert.ok(d.accessLog.length === 1, 'access logged');
    log.add({ suite: 'domain', name: 'store_and_query', ok: true, details: d.records });
  } catch (err) {
    log.add({ suite: 'domain', name: 'store_and_query', ok: false, error: err.message, details: d.records });
  }
}

async function firewallSuite() {
  const pi = new PersonalIntelligence('u1');
  const finance = pi.addDomain(new Domain('finance', 'Finance'));
  finance.addRecord({ type: 'account', balance: 10000 });

  try {
    assert.strictEqual(finance.canShare('assistant', 'balance'), false, 'sensitive field blocked by default');
    assert.strictEqual(finance.canShare('assistant', 'institution'), false, 'unknown field blocked');
    log.add({ suite: 'firewall', name: 'default_deny', ok: true, details: finance.policy });
  } catch (err) {
    log.add({ suite: 'firewall', name: 'default_deny', ok: false, error: err.message, details: finance.policy });
  }

  pi.requestShare('finance', 'assistant', ['balance'], 'affordability check');
  try {
    assert.strictEqual(finance.canShare('assistant', 'balance'), true, 'consent opens balance');
    assert.strictEqual(finance.canShare('assistant', 'transactions'), false, 'non-granted field still blocked');
    log.add({ suite: 'firewall', name: 'granular_consent', ok: true, details: finance.sharedWith });
  } catch (err) {
    log.add({ suite: 'firewall', name: 'granular_consent', ok: false, error: err.message, details: finance.sharedWith });
  }

  finance.revokeConsent('assistant');
  try {
    assert.strictEqual(finance.canShare('assistant', 'balance'), false, 'revoke closes access');
    log.add({ suite: 'firewall', name: 'revoke_consent', ok: true, details: finance.sharedWith });
  } catch (err) {
    log.add({ suite: 'firewall', name: 'revoke_consent', ok: false, error: err.message, details: finance.sharedWith });
  }
}

async function inferenceSuite() {
  const pi = new PersonalIntelligence('u2');
  const calendar = pi.addDomain(new Domain('calendar', 'Calendar'));
  calendar.addRecord({ title: 'Sprint review', time: '3pm', date: '2026-08-07' });
  calendar.addRecord({ title: 'Dinner', time: '7pm', date: '2026-08-07' });

  const finance = pi.addDomain(new Domain('finance', 'Finance'));

  const q1 = pi.queryCrossDomain('Am I free at 3pm?');
  try {
    assert.ok(q1.answer && q1.answer.free === false, 'detects conflict at 3pm');
    assert.ok(q1.sources.some((s) => s.domain === 'calendar'), 'calendar source cited');
    log.add({ suite: 'inference', name: 'calendar_availability', ok: true, details: q1 });
  } catch (err) {
    log.add({ suite: 'inference', name: 'calendar_availability', ok: false, error: err.message, details: q1 });
  }

  const q2 = pi.queryCrossDomain('Can I afford a $500 laptop?');
  try {
    assert.ok(q2.blocked.some((b) => b.domain === 'finance' && b.field === 'balance'), 'finance blocked without consent');
    log.add({ suite: 'inference', name: 'finance_blocked_without_consent', ok: true, details: q2 });
  } catch (err) {
    log.add({ suite: 'inference', name: 'finance_blocked_without_consent', ok: false, error: err.message, details: q2 });
  }

  finance.addRecord({ type: 'account', balance: 600 });
  pi.requestShare('finance', 'assistant', ['balance'], 'affordability');
  const q3 = pi.queryCrossDomain('Can I afford a $500 laptop?');
  try {
    assert.ok(q3.answer.assessment, 'finance assesses');
    assert.ok(q3.sources.some((s) => s.domain === 'finance'), 'finance source cited');
    log.add({ suite: 'inference', name: 'finance_affordability', ok: true, details: q3 });
  } catch (err) {
    log.add({ suite: 'inference', name: 'finance_affordability', ok: false, error: err.message, details: q3 });
  }

  const health = pi.addDomain(new Domain('health', 'Health'));
  health.addRecord({ sleep: 5, energy: 3, date: '2026-08-07' });
  const q4 = pi.queryCrossDomain('Why am I tired?');
  try {
    assert.ok(q4.answer.includes('consent required'), 'health blocked without consent');
    log.add({ suite: 'inference', name: 'health_blocked', ok: true, details: q4 });
  } catch (err) {
    log.add({ suite: 'inference', name: 'health_blocked', ok: false, error: err.message, details: q4 });
  }

  pi.requestShare('health', 'assistant', ['sleep', 'energy'], 'tiredness analysis');
  const q5 = pi.queryCrossDomain('Why am I tired?');
  try {
    assert.strictEqual(q5.answer.sleep, 5, 'health shared');
    log.add({ suite: 'inference', name: 'health_consented', ok: true, details: q5 });
  } catch (err) {
    log.add({ suite: 'inference', name: 'health_consented', ok: false, error: err.message, details: q5 });
  }
}

async function crossDomainFusionSuite() {
  const pi = new PersonalIntelligence('u3');
  const calendar = pi.addDomain(new Domain('calendar', 'Calendar'));
  calendar.addRecord({ title: 'Investor call', time: '10am', date: '2026-08-07' });
  const tasks = pi.addDomain(new Domain('tasks', 'Tasks'));
  tasks.addRecord({ title: 'Prep slides', due: '9am', status: 'done' });
  const contacts = pi.addDomain(new Domain('contacts', 'Contacts'));
  contacts.addRecord({ name: 'Investor X', role: 'VC' });

  const q = pi.queryCrossDomain('Do I have any prep work before my 10am meeting?');
  try {
    assert.ok(q.sources.length >= 2, 'multi-domain sources');
    log.add({ suite: 'fusion', name: 'multi_domain_meeting_prep', ok: true, details: q });
  } catch (err) {
    log.add({ suite: 'fusion', name: 'multi_domain_meeting_prep', ok: false, error: err.message, details: q });
  }
}

async function profileSuite() {
  const pi = new PersonalIntelligence('u4');
  pi.addDomain(new Domain('calendar', 'Calendar')).addRecord({ title: 'A' });
  pi.addDomain(new Domain('finance', 'Finance')).addRecord({ balance: 100 });

  const profile = pi.getUnifiedProfile(true);
  try {
    assert.ok(profile.domains.calendar, 'calendar in profile');
    assert.ok(profile.domains.finance, 'finance in profile');
    assert.strictEqual(profile.domains.finance.visibleFields.length, 0, 'finance hides sensitive fields by default');
    log.add({ suite: 'profile', name: 'unified_profile_respects_consent', ok: true, details: profile });
  } catch (err) {
    log.add({ suite: 'profile', name: 'unified_profile_respects_consent', ok: false, error: err.message, details: profile });
  }
}

async function auditSuite() {
  const pi = new PersonalIntelligence('u5');
  pi.addDomain(new Domain('calendar', 'Calendar')).addRecord({ title: 'A' });
  pi.queryCrossDomain('Am I free at 3pm?');
  try {
    assert.ok(pi.receipts.length > 0, 'receipts produced');
    assert.ok(pi.receipts.some((r) => r.action === 'cross_domain_query'), 'query receipt logged');
    log.add({ suite: 'audit', name: 'receipt_logging', ok: true, details: pi.receipts });
  } catch (err) {
    log.add({ suite: 'audit', name: 'receipt_logging', ok: false, error: err.message, details: pi.receipts });
  }
}

async function main() {
  await domainSuite();
  await firewallSuite();
  await inferenceSuite();
  await crossDomainFusionSuite();
  await profileSuite();
  await auditSuite();

  const summary = log.summary();
  const report = log.toJSON({ prototype: 'scripts/prototype-cross-domain-v5.mjs' });

  fs.mkdirSync(path.dirname(TRANSCRIPT_PATH), { recursive: true });
  fs.writeFileSync(TRANSCRIPT_PATH, JSON.stringify(report, null, 2));

  console.log(`V5 Cross-Domain test transcript: ${summary.pass}/${summary.total} passed.`);
  if (summary.fail > 0) {
    console.log('Failures:');
    for (const t of log.tests.filter((t) => t.result === 'FAIL')) console.log(`  [${t.suite}] ${t.name}: ${t.error}`);
    process.exit(1);
  } else {
    console.log(`All V5 tests passed. Transcript written to ${TRANSCRIPT_PATH}`);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
