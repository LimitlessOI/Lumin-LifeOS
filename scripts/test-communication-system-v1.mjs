#!/usr/bin/env node
/**
 * SYNOPSIS: Exhaustive V1 Communication System test transcript.
 * Tests Conversational Contracts extraction, turn-completion fusion, and
 * interruption decay across edge cases. Writes a JSON transcript report.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractContracts, fuseTurnCompletion, TtsTrack, runScenario } from './prototype-conversational-contracts-v1.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRANSCRIPT_PATH = path.resolve(__dirname, '../products/receipts/COMMUNICATION_SYSTEM_V1_TEST_TRANSCRIPT.json');

function normalize(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

class TestLog {
  constructor() {
    this.tests = [];
    this.startedAt = new Date().toISOString();
  }

  add({ suite, name, ok, error, details }) {
    this.tests.push({
      suite,
      name,
      result: ok ? 'PASS' : 'FAIL',
      error: error || null,
      details: details || null,
      at: new Date().toISOString(),
    });
  }

  summary() {
    const pass = this.tests.filter((t) => t.result === 'PASS').length;
    const fail = this.tests.filter((t) => t.result === 'FAIL').length;
    return { total: this.tests.length, pass, fail };
  }

  toJSON(extra = {}) {
    return {
      schema: 'communication_system_v1_test_transcript_v1',
      generatedAt: new Date().toISOString(),
      startedAt: this.startedAt,
      summary: this.summary(),
      ...extra,
      tests: this.tests,
    };
  }
}

const log = new TestLog();

function assertIncludes(haystack, needle, msg) {
  assert.ok(normalize(haystack).toLowerCase().includes(normalize(needle).toLowerCase()), msg);
}

async function contractExtractionSuite() {
  const cases = [
    { input: "I'll send the report by Friday.", expectType: 'promise', expectPromise: 'send the report', expectCondition: 'Friday' },
    { input: 'I will call you when the meeting ends.', expectType: 'promise', expectPromise: 'call you', expectCondition: 'the meeting ends' },
    { input: "I'm going to finish this later.", expectType: null, expectPromise: null }, // going to is not in patterns
    { input: 'I want to build a voice contract prototype', expectType: 'request', expectPromise: 'build a voice contract prototype', expectCondition: null },
    { input: 'I need to review the design by Tuesday.', expectType: 'request', expectPromise: 'review the design', expectCondition: 'Tuesday' },
    { input: 'Let me know when you are ready.', expectType: 'offer', expectPromise: 'know', expectCondition: 'you are ready' },
    { input: 'We should schedule a follow-up after the demo.', expectType: 'offer', expectPromise: 'schedule a follow-up', expectCondition: 'the demo' },
    { input: 'I can help with the integration if you give me access.', expectType: 'offer', expectPromise: 'help with the integration', expectCondition: 'you give me access' },
    { input: 'The sky is blue.', expectType: null, expectPromise: null },
    { input: "I want pizza and I'll call the restaurant.", expectCount: 2, expectTypes: ['promise', 'request'] },
    { input: 'Finish this tomorrow', expectType: null, expectPromise: null }, // no first-person trigger
  ];

  for (const c of cases) {
    const turns = [{ role: 'user', text: c.input }];
    const contracts = extractContracts(turns);
    try {
      if (c.expectType === null) {
        assert.strictEqual(contracts.length, 0, `should not extract contract from "${c.input}"`);
      } else if (c.expectCount) {
        assert.strictEqual(contracts.length, c.expectCount, `should extract ${c.expectCount} contracts from "${c.input}"`);
        for (let i = 0; i < c.expectTypes.length; i += 1) {
          assert.strictEqual(contracts[i].type, c.expectTypes[i], `contract ${i} type`);
        }
      } else {
        assert.strictEqual(contracts.length, 1, `should extract one contract from "${c.input}"`);
        assert.strictEqual(contracts[0].type, c.expectType, 'contract type');
        assertIncludes(contracts[0].promise, c.expectPromise, 'promise text');
        if (c.expectCondition) {
          assertIncludes(contracts[0].completion_condition, c.expectCondition, 'completion condition');
        } else {
          assert.strictEqual(contracts[0].completion_condition, null, 'no completion condition');
        }
      }
      log.add({ suite: 'contract_extraction', name: c.input, ok: true, details: contracts });
    } catch (err) {
      log.add({ suite: 'contract_extraction', name: c.input, ok: false, error: err.message, details: contracts });
    }
  }

  // Multi-turn mixed extraction.
  const mixedTurns = [
    { role: 'assistant', text: "I'll build the prototype and send it by end of day." },
    { role: 'user', text: 'Great. I will test it by tomorrow and I want a summary before then.' },
  ];
  const mixedContracts = extractContracts(mixedTurns);
  try {
    assert.strictEqual(mixedContracts.length, 3, 'three contracts extracted from mixed turn');
    assert.ok(mixedContracts.some((c) => c.speaker === 'assistant' && normalize(c.promise).includes('build the prototype')), 'assistant promise');
    assert.ok(mixedContracts.some((c) => c.speaker === 'user' && normalize(c.promise).includes('test it')), 'user promise');
    assert.ok(mixedContracts.some((c) => c.speaker === 'user' && c.type === 'request' && normalize(c.promise).includes('summary')), 'user request');
    log.add({ suite: 'contract_extraction', name: 'mixed_turn_extraction', ok: true, details: mixedContracts });
  } catch (err) {
    log.add({ suite: 'contract_extraction', name: 'mixed_turn_extraction', ok: false, error: err.message, details: mixedContracts });
  }
}

async function turnCompletionSuite() {
  const baseTurns = (text, role = 'user') => [{ role: 'assistant', text: 'prev' }, { role, text }];

  const cases = [
    { name: 'final_with_punctuation_long_pause', text: 'That makes sense.', pauseMs: 900, expectFinished: true, minConfidence: 90 },
    { name: 'final_with_question_long_pause', text: 'What do you think?', pauseMs: 900, expectFinished: true, minConfidence: 90 },
    { name: 'final_no_punctuation_long_pause', text: 'I am not sure', pauseMs: 900, expectFinished: false, reason: 'missing punctuation lowers confidence' },
    { name: 'final_with_punctuation_short_pause', text: 'Done.', pauseMs: 100, expectFinished: false, reason: 'pause too short' },
    { name: 'trailing_filler_only', text: 'well um', pauseMs: 900, expectFinished: false, reason: 'trailing filler penalized' },
    { name: 'trailing_filler_then_punctuation', text: 'well um.', pauseMs: 900, expectFinished: false, reason: 'trailing filler still penalized' },
    { name: 'pause_zero', text: 'Stop.', pauseMs: 0, expectFinished: false, reason: 'no pause evidence' },
    { name: 'continuation_without_punctuation', text: 'and then we', pauseMs: 100, expectFinished: false, reason: 'mid-utterance fragment' },
    { name: 'exclamation_long_pause', text: 'Exactly!', pauseMs: 900, expectFinished: true, minConfidence: 90 },
    { name: 'ellipsis_long_pause', text: 'I guess…', pauseMs: 900, expectFinished: true, minConfidence: 90 },
  ];

  for (const c of cases) {
    const turns = baseTurns(c.text);
    const completion = fuseTurnCompletion(turns, { pauseMs: c.pauseMs, finalTranscript: true, currentIndex: 1 });
    try {
      if (c.expectFinished) {
        assert.ok(completion.finished, `expected finished for ${c.name}`);
        assert.ok(completion.confidence >= c.minConfidence, `expected confidence >= ${c.minConfidence} for ${c.name}`);
      } else {
        assert.ok(!completion.finished, `expected not finished for ${c.name}`);
      }
      log.add({ suite: 'turn_completion', name: c.name, ok: true, details: completion });
    } catch (err) {
      log.add({ suite: 'turn_completion', name: c.name, ok: false, error: err.message, details: completion });
    }
  }

  // Score monotonicity with pause.
  const text = 'We are done.';
  const confidences = [0, 200, 400, 600, 800, 1000].map((pauseMs) => fuseTurnCompletion(baseTurns(text), { pauseMs, finalTranscript: true, currentIndex: 1 }).confidence);
  try {
    for (let i = 1; i < confidences.length; i += 1) {
      assert.ok(confidences[i] >= confidences[i - 1], `confidence should not decrease with longer pause: ${confidences}`);
    }
    log.add({ suite: 'turn_completion', name: 'pause_monotonicity', ok: true, details: { confidences } });
  } catch (err) {
    log.add({ suite: 'turn_completion', name: 'pause_monotonicity', ok: false, error: err.message, details: { confidences } });
  }
}

async function interruptionDecaySuite() {
  // Cycle = wordDurationMs + wordGapMs = 50 + 20 = 70ms.
  // Word 0: 0-50, gap 50-70; Word 1: 70-120, gap 120-140; Word 2: 140-190, gap 190-210; Word 3: 210-260.
  const base = { wordDurationMs: 50, fadeMs: 20, wordGapMs: 20 };

  // Cycle = wordDurationMs + wordGapMs = 50 + 20 = 70ms.
  // Word 0: 0-50, gap 50-70; Word 1: 70-120, gap 120-140; Word 2: 140-190, gap 190-210; Word 3: 210-260.
  const cases = [
    { name: 'interrupt_before_play', setup: (t) => t.interrupt(), expectWordsSpoken: 0, expectInterrupted: true, expectTrailOff: false },
    { name: 'interrupt_before_first_word', interruptAt: 10, expectWordsSpoken: 0, expectInterrupted: true, expectTrailOff: false },
    { name: 'interrupt_mid_first_word', interruptAt: 25, expectWordsSpoken: 1, expectInterrupted: true, expectTrailOff: true },
    { name: 'interrupt_between_first_and_second', interruptAt: 60, expectWordsSpoken: 1, expectInterrupted: true, expectTrailOff: false },
    { name: 'interrupt_mid_second_word', interruptAt: 95, expectWordsSpoken: 2, expectInterrupted: true, expectTrailOff: true },
    { name: 'interrupt_after_completion', interruptAt: 400, expectWordsSpoken: 4, expectInterrupted: false, expectTrailOff: false },
    { name: 'interrupt_after_two_words', interruptAt: 165, expectWordsSpoken: 3, expectInterrupted: true, expectTrailOff: true },
    { name: 'double_interrupt_only_first_counts', interruptAt: 95, secondInterruptAt: 115, expectWordsSpoken: 2, expectInterrupted: true, expectTrailOff: true },
    { name: 'stop_before_first_word_completes', stopAt: 30, expectWordsSpoken: 0, expectInterrupted: false, expectTrailOff: false },
    { name: 'stop_after_two_words', stopAt: 135, expectWordsSpoken: 2, expectInterrupted: false, expectTrailOff: false },
    { name: 'stop_during_gap_after_two', stopAt: 145, expectWordsSpoken: 2, expectInterrupted: false, expectTrailOff: false },
    { name: 'long_fade_respects_timing', interruptAt: 95, fadeMs: 200, expectWordsSpoken: 2, expectInterrupted: true, expectTrailOff: true },
  ];

  for (const c of cases) {
    const opts = { ...base, fadeMs: c.fadeMs !== undefined ? c.fadeMs : base.fadeMs };
    const track = new TtsTrack('one two three four', opts);

    if (c.setup) {
      c.setup(track);
    } else {
      if (c.interruptAt !== undefined && c.interruptAt >= 0) setTimeout(() => track.interrupt(), c.interruptAt);
      if (c.secondInterruptAt !== undefined) setTimeout(() => track.interrupt(), c.secondInterruptAt);
      if (c.stopAt !== undefined) setTimeout(() => track.stop(), c.stopAt);
    }

    const summary = await track.play();
    try {
      assert.strictEqual(summary.interrupted, c.expectInterrupted, `${c.name}: interrupted flag`);
      assert.strictEqual(summary.words_spoken, c.expectWordsSpoken, `${c.name}: words spoken`);
      const stopped = summary.events.some((e) => e.type === 'stopped');
      if (c.expectInterrupted || c.stopAt !== undefined || c.setup) {
        assert.ok(stopped, `${c.name}: should have stopped event`);
      }
      const completed = summary.events.some((e) => e.type === 'completed');
      assert.strictEqual(completed, !c.expectInterrupted && c.stopAt === undefined && !c.setup, `${c.name}: completed flag`);
      log.add({ suite: 'interruption_decay', name: c.name, ok: true, details: summary });
    } catch (err) {
      log.add({ suite: 'interruption_decay', name: c.name, ok: false, error: err.message, details: summary });
    }
  }
}

async function scenarioSuite() {
  const scenarios = [
    { name: 'abandoned_list', fixture: [
      { role: 'assistant', text: 'Here are the 25 things. One: a. Two: b. Three: c. Four: d. Five: e.', ts: 0, durationMs: 6000 },
      { role: 'user', text: 'stop', ts: 3200 },
    ] },
    { name: 'interrupted_explanation', fixture: [
      { role: 'assistant', text: 'The reason changed because we reclassified Q1 spend into operational instead of capital, which means the', ts: 0, durationMs: 4500 },
      { role: 'user', text: 'got it', ts: 1900 },
    ] },
    { name: 'contract_creation', fixture: [
      { role: 'user', text: 'I want to build a voice contract prototype' },
      { role: 'assistant', text: "I will build a Conversational Contracts prototype that extracts promises and tracks fulfillment. I'll stop mid-sentence if you interrupt and then ask what changed.", ts: 0, durationMs: 7000 },
      { role: 'user', text: 'great, and I will test it by tomorrow.', ts: 2200 },
    ] },
    { name: 'user_interrupts_with_pause_then_finishes', fixture: [
      { role: 'assistant', text: 'Let me walk through the plan. First, we validate.', ts: 0, durationMs: 2500 },
      { role: 'user', text: 'wait', ts: 600 },
      { role: 'user', text: 'ok go on.', ts: 1400 },
    ] },
  ];

  for (const s of scenarios) {
    try {
      const result = await runScenario(s.name, s.fixture);
      const tts = result.tts;
      const contracts = result.contracts;
      const userFinished = result.user_finished;

      if (s.name === 'abandoned_list') {
        assert.ok(tts.interrupted, 'abandoned list should interrupt');
        assert.ok(tts.words_spoken < tts.words_total, 'did not finish all words');
      }
      if (s.name === 'interrupted_explanation') {
        assert.ok(tts.interrupted, 'explanation interrupted');
        assert.ok(tts.words_spoken < tts.words_total, 'explanation did not finish');
      }
      if (s.name === 'contract_creation') {
        assert.ok(contracts.some((c) => c.speaker === 'assistant'), 'assistant contract extracted');
        assert.ok(contracts.some((c) => c.speaker === 'user'), 'user contract extracted');
        assert.ok(userFinished.finished, 'user finished after final turn with pause');
      }
      if (s.name === 'user_interrupts_with_pause_then_finishes') {
        assert.ok(tts.interrupted, 'user interrupted assistant');
        assert.strictEqual(userFinished.finished, true, 'final user turn with pause is finished');
      }
      log.add({ suite: 'scenario', name: s.name, ok: true, details: result });
    } catch (err) {
      log.add({ suite: 'scenario', name: s.name, ok: false, error: err.message, details: null });
    }
  }
}

async function main() {
  await contractExtractionSuite();
  await turnCompletionSuite();
  await interruptionDecaySuite();
  await scenarioSuite();

  const summary = log.summary();
  const report = log.toJSON({ prototype: 'scripts/prototype-conversational-contracts-v1.mjs' });

  fs.mkdirSync(path.dirname(TRANSCRIPT_PATH), { recursive: true });
  fs.writeFileSync(TRANSCRIPT_PATH, JSON.stringify(report, null, 2));

  console.log(`V1 Communication System test transcript: ${summary.pass}/${summary.total} passed.`);
  if (summary.fail > 0) {
    console.log('Failures:');
    for (const t of log.tests.filter((t) => t.result === 'FAIL')) {
      console.log(`  [${t.suite}] ${t.name}: ${t.error}`);
    }
    process.exit(1);
  } else {
    console.log(`All V1 tests passed. Transcript written to ${TRANSCRIPT_PATH}`);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
