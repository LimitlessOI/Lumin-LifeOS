#!/usr/bin/env node
/**
 * SYNOPSIS: SocialMediaOS session MVP acceptance test — coaching Q&A, content generation, export.
 * scripts/run-socialmediaos-session-acceptance.mjs
 *
 * Usage: node scripts/run-socialmediaos-session-acceptance.mjs
 * Env:   PUBLIC_BASE_URL, COMMAND_CENTER_KEY
 * Exit:  0 = PASS, 1 = FAIL
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'PRODUCT-SOCIALMEDIAOS-SESSION-MVP-0001';
const RECEIPT_REL = 'products/receipts/SOCIALMEDIAOS_SESSION_MVP_ACCEPTANCE.json';
const RECEIPT = path.join(ROOT, RECEIPT_REL);
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const KEY = process.env.COMMAND_CENTER_KEY || '';
const BASE_CANDIDATES = [
  process.env.PUBLIC_BASE_URL,
  process.env.BASE_URL,
  'http://127.0.0.1:3000',
].filter(Boolean).map((v) => String(v).replace(/\/$/, ''));

let ACTIVE_BASE = '';

const report = {
  mission_id: MISSION,
  run_at: new Date().toISOString(),
  tests_passed: [],
  tests_failed: [],
  skipped: false,
  runtime_target: null,
  base_resolution: null,
};

async function probeBase(base) {
  try {
    const res = await fetch(`${base}/healthz`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch { return false; }
}

async function resolveBase() {
  for (const base of [...new Set(BASE_CANDIDATES)]) {
    if (await probeBase(base)) return { base, mode: 'configured' };
  }
  return { base: '', mode: 'unreachable' };
}

async function req(method, reqPath, body, headers = {}) {
  try {
    const res = await fetch(`${ACTIVE_BASE}${reqPath}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-command-key': KEY, ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, body: json };
  } catch (e) {
    return { status: 0, ok: false, body: { error: e.message } };
  }
}

function pass(id) { report.tests_passed.push(id); console.log(`  ✅ ${id}`); }
function fail(id, reason) { report.tests_failed.push(id); console.error(`  ❌ ${id}: ${reason}`); }
function check(id, cond, reason) { cond ? pass(id) : fail(id, reason); }

const COACHING_PREFIX = '/api/v1/socialmediaos/coaching';
const TEST_ANSWERS = [
  'I help real estate agents grow their business using social media. I specialise in helping new agents get listings faster.',
  "The biggest mistake I see is posting generic content — every agent posts the same 'just sold' and 'market update' content. It blends into the background.",
  'I had a client who was ready to quit real estate after 8 months with no listings. In 6 weeks using our content system she got 3 listings and her first $15k month.',
  'The one thing I wish they understood is that authenticity converts more than perfection. Your real story is more powerful than any template.',
  "If you're on the fence — every week you wait is content that could have been building your pipeline. The compounding effect of consistent content is real.",
];

async function run() {
  console.log(`\n=== SocialMediaOS Session MVP Acceptance ===`);
  console.log(`Mission: ${MISSION}\n`);

  const resolved = await resolveBase();
  if (!resolved.base) {
    console.error('SKIP — no reachable base URL');
    report.skipped = true;
    await finishBpAcceptance({ report, receiptPath: RECEIPT, verdictPath: VERDICT });
    process.exit(0);
  }
  ACTIVE_BASE = resolved.base;
  report.base_resolution = resolved;
  report.runtime_target = ACTIVE_BASE;
  console.log(`Base: ${ACTIVE_BASE}\n`);

  // AT-SSM-001: Start coaching session
  console.log('AT-SSM-001: Start coaching session');
  const startRes = await req('POST', `${COACHING_PREFIX}/start`, {
    niche: 'Real estate agent coaching',
    goal: 'More listing appointments',
  });
  check('AT-SSM-001-ok', startRes.ok, `status=${startRes.status} body=${JSON.stringify(startRes.body)}`);
  check('AT-SSM-001-sessionId', typeof startRes.body.sessionId === 'string', 'sessionId missing');
  check('AT-SSM-001-question', !!startRes.body.question?.text, 'question.text missing');
  check('AT-SSM-001-q1of5', startRes.body.questionNumber === 1, `questionNumber=${startRes.body.questionNumber}`);

  const sessionId = startRes.body.sessionId;
  if (!sessionId) { console.error('ABORT — no sessionId'); process.exit(1); }

  // AT-SSM-002: Submit all 5 answers
  console.log('\nAT-SSM-002: Submit 5 answers');
  let lastAnswerRes;
  for (let i = 0; i < TEST_ANSWERS.length; i++) {
    lastAnswerRes = await req('POST', `${COACHING_PREFIX}/${sessionId}/answer`, { answer: TEST_ANSWERS[i] });
    check(`AT-SSM-002-answer-${i + 1}`, lastAnswerRes.ok, `status=${lastAnswerRes.status}`);
    if (!lastAnswerRes.ok) { console.error(`  Stopped after answer ${i+1}`); break; }
  }
  check('AT-SSM-002-complete-flag', lastAnswerRes?.body.complete === true, 'last answer should return complete:true');

  // AT-SSM-003: Verify session state is coaching_complete
  console.log('\nAT-SSM-003: Verify session state');
  const stateRes = await req('GET', `${COACHING_PREFIX}/${sessionId}/state`);
  check('AT-SSM-003-ok', stateRes.ok, `status=${stateRes.status}`);
  check('AT-SSM-003-status', stateRes.body.status === 'coaching_complete', `status=${stateRes.body.status}`);
  check('AT-SSM-003-answers', stateRes.body.answers_given === 5, `answers_given=${stateRes.body.answers_given}`);

  // AT-SSM-004: Generate content pack
  console.log('\nAT-SSM-004: Generate content pack (AI call)');
  const genRes = await req('POST', `${COACHING_PREFIX}/${sessionId}/generate`, {});
  check('AT-SSM-004-ok', genRes.ok, `status=${genRes.status} body=${JSON.stringify(genRes.body)}`);
  check('AT-SSM-004-packId', typeof genRes.body.packId === 'string', 'packId missing');
  const pack = genRes.body.pack;
  check('AT-SSM-004-linkedin', Array.isArray(pack?.linkedin_posts) && pack.linkedin_posts.length >= 3, `linkedin_posts=${pack?.linkedin_posts?.length}`);
  check('AT-SSM-004-hooks', Array.isArray(pack?.youtube_hooks) && pack.youtube_hooks.length >= 1, `youtube_hooks=${pack?.youtube_hooks?.length}`);
  check('AT-SSM-004-email', Array.isArray(pack?.email_subjects) && pack.email_subjects.length >= 1, `email_subjects=${pack?.email_subjects?.length}`);
  check('AT-SSM-004-story', typeof pack?.core_story === 'string' && pack.core_story.length > 10, 'core_story missing or empty');

  // AT-SSM-005: Retrieve content pack
  console.log('\nAT-SSM-005: Retrieve content pack');
  const packRes = await req('GET', `${COACHING_PREFIX}/${sessionId}/content-pack`);
  check('AT-SSM-005-ok', packRes.ok, `status=${packRes.status}`);
  check('AT-SSM-005-content', !!packRes.body.content, 'content field missing');

  // AT-SSM-006: Export as text
  console.log('\nAT-SSM-006: Export as text');
  try {
    const exportRes = await fetch(`${ACTIVE_BASE}${COACHING_PREFIX}/${sessionId}/export`, {
      headers: { 'x-command-key': KEY },
      signal: AbortSignal.timeout(10000),
    });
    check('AT-SSM-006-ok', exportRes.ok, `status=${exportRes.status}`);
    const exportText = await exportRes.text();
    check('AT-SSM-006-content-type', exportRes.headers.get('content-type')?.includes('text/plain'), `content-type=${exportRes.headers.get('content-type')}`);
    check('AT-SSM-006-has-linkedin', exportText.includes('LINKEDIN'), 'LINKEDIN section missing from export');
    check('AT-SSM-006-has-hooks', exportText.includes('YOUTUBE'), 'YOUTUBE section missing from export');
  } catch (e) { fail('AT-SSM-006-ok', e.message); }

  // Summary
  console.log('\n--- Results ---');
  console.log(`PASS: ${report.tests_passed.length}`);
  console.log(`FAIL: ${report.tests_failed.length}`);
  if (report.tests_failed.length) console.log('Failed:', report.tests_failed);

  const verdict = report.tests_failed.length === 0 ? 'TECHNICAL_PASS' : 'TECHNICAL_FAIL';
  await finishBpAcceptance({ report, receiptPath: RECEIPT, verdictPath: VERDICT });

  process.exit(verdict === 'TECHNICAL_PASS' ? 0 : 1);
}

run().catch((err) => { console.error('Fatal:', err); process.exit(1); });
