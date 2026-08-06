#!/usr/bin/env node
/**
 * SYNOPSIS: Prototype V1 — Conversational Contracts + Interruption Decay.
 * Runs standalone on synthetic fixtures or against a real `voice_rail_messages` session.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const FIXTURES = {
  abandoned_list: [
    { role: 'assistant', text: 'Here are the 25 things you asked for. One: the budget report. Two: the meeting notes. Three: the competitor summary. Four: the design mockups. Five: the launch checklist.', ts: 0, durationMs: 6000 },
    { role: 'user', text: 'stop', ts: 3200 },
  ],
  interrupted_explanation: [
    { role: 'assistant', text: 'The reason the number changed is that we reclassified the Q1 spend into operational instead of capital, which means the', ts: 0, durationMs: 4500 },
    { role: 'user', text: 'got it', ts: 1900 },
  ],
  contract_creation: [
    { role: 'user', text: 'I want to build a voice contract prototype' },
    { role: 'assistant', text: "I will build a Conversational Contracts prototype that extracts promises and tracks fulfillment. I'll stop mid-sentence if you interrupt and then ask what changed.", ts: 0, durationMs: 7000 },
    { role: 'user', text: 'great, and I will test it by tomorrow.', ts: 2200 },
  ],
};

// --- Conversational Contract extractor ---

function normalize(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
}

// Same clause-boundary split used by prototype-overlay-action-v4.mjs's parseCommand —
// reused here rather than re-derived, since it's the same underlying problem
// (one turn can contain multiple independent clauses).
function splitClauses(text) {
  return String(text || '')
    // clause separators (and/,/then) plus sentence boundaries (lookbehind keeps the
    // terminal punctuation on the preceding clause, e.g. "Great." stays "Great.")
    .split(/(?:\s+and\s+|\s*,\s+|\s+then\s+|(?<=[.!?])\s+)/i)
    .map((c) => c.trim().replace(/^(?:and|but|so|then|well|also)\s+/i, ''))
    .filter(Boolean);
}

export function extractContracts(turns, { now = new Date().toISOString() } = {}) {
  const contracts = [];

  // Promise / commitment patterns — matched per-clause, not against the whole turn.
  // BUG (found in a live test transcript, fixed here): matching these against the
  // full turn text let a later clause's match (e.g. "i want") greedily swallow an
  // earlier clause's own match (e.g. "i'll call the restaurant") because none of
  // the patterns were anchored to a clause boundary — "I want pizza and I'll call
  // the restaurant." produced a "request" contract whose promise text was
  // "pizza and I'll call the restaurant.", overlapping the real "i'll" promise.
  const promisePatterns = [
    { re: /^(?:i will|i'll)\s+(.+?)(?:\s+(?:when|after|if|by|before)\s+(.+))?$/i, type: 'promise' },
    { re: /^(?:let me|we should|i can)\s+(.+?)(?:\s+(?:when|after|if|by|before)\s+(.+))?$/i, type: 'offer' },
    { re: /^(?:i want|i need)\s+(?:to\s+)?(.+?)(?:\s+(?:when|after|if|by|before)\s+(.+))?$/i, type: 'request' },
  ];

  for (let i = 0; i < turns.length; i += 1) {
    const turn = turns[i];
    const text = normalize(turn.text);
    const speaker = turn.role === 'assistant' ? 'assistant' : 'user';

    for (const clause of splitClauses(text)) {
      for (const pat of promisePatterns) {
        const m = clause.match(pat.re);
        if (!m) continue;
        const promise = normalize(m[1]);
        const completionCondition = m[2] ? normalize(m[2]) : null;
        contracts.push({
          id: `${slug(speaker)}-${slug(promise).slice(0, 20)}-${i}`,
          session_sequence: i,
          speaker,
          type: pat.type,
          promise,
          completion_condition: completionCondition,
          status: 'pending',
          evidence: {
            source_turn_text: text,
            extracted_at: now,
          },
          created_at: now,
        });
        break; // one contract per clause — don't let a second pattern also match the same clause
      }
    }
  }
  return contracts;
}

// --- Evidence Fusion for turn completion ---

export function fuseTurnCompletion(turns, options = {}) {
  const {
    currentIndex = turns.length - 1,
    pauseMs = 0,
    finalTranscript = true,
    minimumPauseMs = 600,
    threshold = 90,
  } = options;

  const current = turns[currentIndex];
  const text = normalize(current?.text || '');
  const sources = [];
  let score = 0;

  if (finalTranscript) {
    score += 25;
    sources.push({ source: 'transcript_final', value: true, weight: 25 });
  }

  const trailingPunct = /[.!?…]\s*$/.test(text);
  if (trailingPunct) {
    score += 35;
    sources.push({ source: 'trailing_punctuation', value: true, weight: 35 });
  } else {
    score -= 15;
    sources.push({ source: 'no_trailing_punctuation', value: true, weight: -15 });
  }

  const trailingFiller = /\b(um|uh|like|you know)[.!?…]?\s*$/i.test(text);
  if (!trailingFiller) {
    score += 15;
    sources.push({ source: 'no_trailing_filler', value: true, weight: 15 });
  } else {
    score -= 35;
    sources.push({ source: 'trailing_filler', value: true, weight: -35 });
  }

  if (pauseMs >= minimumPauseMs) {
    score += 30;
    sources.push({ source: 'pause_duration', value: pauseMs, weight: 30 });
  } else if (pauseMs > 0) {
    const partial = Math.round((pauseMs / minimumPauseMs) * 30);
    score += partial;
    sources.push({ source: 'pause_duration', value: pauseMs, weight: partial });
  }

  // Last turn was assistant -> user is more likely finishing a reply
  if (currentIndex > 0 && turns[currentIndex - 1]?.role === 'assistant') {
    score += 5;
    sources.push({ source: 'reply_context', value: 'assistant_previous', weight: 5 });
  }

  score = Math.min(100, Math.max(0, score));
  return {
    finished: score >= threshold,
    confidence: score,
    pause_ms: pauseMs,
    sources,
  };
}

// --- Interruption Decay simulator ---

export class TtsTrack {
  constructor(text, options = {}) {
    this.text = normalize(text);
    this.wordDurationMs = options.wordDurationMs || 180;
    this.fadeMs = options.fadeMs || 150;
    this.wordGapMs = options.wordGapMs || 0;
    // A word is considered "inaudible" if interrupted before this much of it has been spoken.
    this.minSpokenMs = options.minSpokenMs || Math.max(10, Math.floor(this.wordDurationMs * 0.3));
    this.words = this.text.split(/\s+/).filter(Boolean);
    this.state = 'idle';
    this.currentWordIndex = -1;
    this.interruptedAt = null;
    this.wordsSpoken = 0;
    this.events = [];
    this._resolvers = new Set();
    this._timeouts = [];
    this._startedAt = null;
    this._prePlayInterrupt = false;
  }

  _log(event) {
    this.events.push({ at: Date.now(), ...event });
  }

  _schedule(fn, delay) {
    if (this.state !== 'playing') return null;
    const t = setTimeout(() => {
      if (this.state !== 'playing') return;
      fn();
    }, Math.max(0, delay));
    this._timeouts.push(t);
    return t;
  }

  _clearTimeouts() {
    for (const t of this._timeouts) clearTimeout(t);
    this._timeouts = [];
  }

  async play() {
    return new Promise((resolve) => {
      this._resolvers.add(resolve);

      this._log({ type: 'play_start', words_total: this.words.length, word_duration_ms: this.wordDurationMs, fade_ms: this.fadeMs, word_gap_ms: this.wordGapMs });

      if (this._prePlayInterrupt) {
        this._finalizeStop({ trail_off: false });
        return;
      }

      this.state = 'playing';
      this._startedAt = Date.now();

      for (let i = 0; i < this.words.length; i += 1) {
        const wordStart = i * (this.wordDurationMs + this.wordGapMs);

        // Word start.
        this._schedule(() => {
          this.currentWordIndex = i;
          this._log({ type: 'word', index: i, word: this.words[i] });
        }, wordStart);

        // Word completed.
        this._schedule(() => {
          this.wordsSpoken += 1;
          this.currentWordIndex = -1;
        }, wordStart + this.wordDurationMs);
      }

      // Natural completion.
      const totalDuration = this.words.length * (this.wordDurationMs + this.wordGapMs) - this.wordGapMs;
      this._schedule(() => {
        if (this.state !== 'playing') return;
        this.state = 'completed';
        this._log({ type: 'completed', words_spoken: this.wordsSpoken, words_total: this.words.length });
        this._finish();
      }, totalDuration);
    });
  }

  interrupt(now = Date.now()) {
    if (this.state === 'stopped' || this.state === 'completed') return false;
    if (this.state === 'idle') {
      this._prePlayInterrupt = true;
      this.interruptedAt = now;
      return true;
    }
    if (this.state !== 'playing') return false;

    this.interruptedAt = now;
    this.state = 'interrupted';
    this._clearTimeouts();

    const elapsed = now - this._startedAt;
    const cycle = this.wordDurationMs + this.wordGapMs;
    const currentIndex = Math.max(-1, Math.min(this.words.length - 1, Math.floor(elapsed / cycle)));
    const intoWord = elapsed % cycle;
    const inGap = intoWord >= this.wordDurationMs;
    const tooEarly = !inGap && intoWord < this.minSpokenMs;

    if (currentIndex === -1 || inGap || tooEarly) {
      // No word has been audibly spoken yet; stop cleanly.
      this._log({
        type: 'interrupt_detected',
        word_index: currentIndex,
        word: currentIndex >= 0 ? this.words[currentIndex] : null,
        fade_ms: 0,
      });
      this._finalizeStop({ trail_off: false });
      return true;
    }

    // Finish current word, then fade.
    const remaining = Math.max(0, this.wordDurationMs - intoWord);
    this._log({
      type: 'interrupt_detected',
      word_index: currentIndex,
      word: this.words[currentIndex],
      fade_ms: this.fadeMs,
    });

    setTimeout(() => {
      this.wordsSpoken += 1;
      this._finalizeStop({ trail_off: true });
    }, remaining + this.fadeMs);

    return true;
  }

  stop() {
    if (this.state === 'stopped' || this.state === 'completed') return;
    this._clearTimeouts();
    this._finalizeStop({ trail_off: false });
  }

  _finalizeStop({ trail_off }) {
    this.state = 'stopped';
    this._log({
      type: 'stopped',
      words_spoken: this.wordsSpoken,
      words_total: this.words.length,
      trail_off,
    });
    this._finish();
  }

  _finish() {
    this._resolvers.forEach((r) => r(this.summary()));
    this._resolvers.clear();
  }

  summary() {
    return {
      text: this.text,
      state: this.state,
      words_total: this.words.length,
      words_spoken: this.wordsSpoken,
      interrupted: this.interruptedAt !== null,
      interrupted_at_word_index: this.currentWordIndex,
      events: this.events,
    };
  }
}

// --- Scenario runner ---

export function runScenario(name, turns) {
  const contracts = extractContracts(turns);
  const assistantTurn = turns.find((t) => t.role === 'assistant');
  const assistantText = assistantTurn?.text || '';
  const assistantDurationMs = assistantTurn?.durationMs;

  const wordCount = assistantText.split(/\s+/).filter(Boolean).length || 1;
  const wordDurationMs = assistantDurationMs && assistantDurationMs > 0
    ? Math.max(50, Math.floor(assistantDurationMs / wordCount))
    : undefined;

  const tts = new TtsTrack(assistantText, { wordDurationMs, fadeMs: 150, wordGapMs: 0 });

  // Start playback first so scheduled interruptions see a playing track.
  const playPromise = tts.play();

  // Replay transcript timings against the TTS track.
  const startTs = Date.now();
  for (const turn of turns) {
    if (turn.role === 'user' && typeof turn.ts === 'number') {
      const scheduledAt = startTs + turn.ts;
      const delay = Math.max(0, scheduledAt - Date.now());
      setTimeout(() => tts.interrupt(), delay);
    }
  }

  return playPromise.then((ttsSummary) => {
    const completion = fuseTurnCompletion(turns, {
      pauseMs: 800,
      finalTranscript: true,
      currentIndex: turns.length - 1,
    });

    return {
      scenario: name,
      tts: ttsSummary,
      contracts,
      user_finished: completion,
    };
  });
}

// --- DB helper (optional) ---

async function loadVoiceRailSession(sessionId) {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await pool.query(
      'SELECT role, content AS text, created_at FROM voice_rail_messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId],
    );
    return result.rows.map((r, i) => ({
      role: r.role,
      text: r.text,
      ts: i * 1000, // relative second increments; real timings require duration column
    }));
  } finally {
    await pool.end();
  }
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const sessionIdx = args.indexOf('--session-id');
  const sessionId = sessionIdx !== -1 ? args[sessionIdx + 1] : null;
  const fixtureName = args.find((a) => FIXTURES[a]) || 'contract_creation';

  let turns;
  if (sessionId) {
    turns = await loadVoiceRailSession(sessionId);
    if (!turns.length) {
      console.error(`No voice_rail_messages found for session ${sessionId}`);
      process.exit(1);
    }
  } else {
    turns = FIXTURES[fixtureName];
  }

  const result = await runScenario(sessionId || fixtureName, turns);
  console.log(JSON.stringify(result, null, 2));
}

// --- Self-tests (run when executed directly or with --test) ---

function selfTest() {
  const turns = [
    { role: 'assistant', text: 'I will email the report when I finish the review.', ts: 0 },
    { role: 'user', text: 'And I will read it by Friday.', ts: 2000 },
  ];
  const contracts = extractContracts(turns);
  assert.strictEqual(contracts.length, 2, 'should extract both assistant and user contracts');
  assert.ok(contracts.some((c) => c.speaker === 'assistant' && c.promise.includes('email the report')), 'assistant promise');
  assert.ok(contracts.some((c) => c.speaker === 'user' && c.promise.includes('read it')), 'user promise');

  const completion = fuseTurnCompletion(turns, { pauseMs: 900, finalTranscript: true });
  assert.ok(completion.finished, 'user finished when pause is long and final');
  assert.ok(completion.confidence >= 75, 'confidence high');

  const track = new TtsTrack('One two three four five', { wordDurationMs: 50, fadeMs: 20 });
  setTimeout(() => track.interrupt(), 85); // interrupt during word two
  return track.play().then((summary) => {
    assert.strictEqual(summary.interrupted, true, 'track should be interrupted');
    assert.ok(summary.words_spoken < summary.words_total, 'track should not finish all words');
    assert.ok(summary.events.some((e) => e.type === 'interrupt_detected'), 'has interrupt event');
    assert.ok(summary.events.some((e) => e.type === 'stopped'), 'has stopped event');
    console.log('Self-tests passed.');
  });
}

if (process.argv.includes('--test')) {
  selfTest().then(() => process.exit(0)).catch((err) => {
    console.error('Self-test failed:', err.message);
    process.exit(1);
  });
} else {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
