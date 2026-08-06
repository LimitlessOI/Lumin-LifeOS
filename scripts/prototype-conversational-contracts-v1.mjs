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
    { role: 'assistant', text: "I will build a Conversational Contracts prototype that extracts promises and tracks fulfillment. I'll stop mid-sentence if you interrupt and then ask what changed.", ts: 0 },
    { role: 'user', text: 'great, and I will test it by tomorrow', ts: 2200 },
  ],
};

// --- Conversational Contract extractor ---

function normalize(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
}

export function extractContracts(turns, { now = new Date().toISOString() } = {}) {
  const contracts = [];
  for (let i = 0; i < turns.length; i += 1) {
    const turn = turns[i];
    const text = normalize(turn.text);
    const speaker = turn.role === 'assistant' ? 'assistant' : 'user';

    // Promise / commitment patterns
    const promisePatterns = [
      { re: /(?:i will|i'll)\s+(.+?)(?:\s+(?:when|after|if|by|before)\s+(.+))?$/i, type: 'promise' },
      { re: /(?:let me|we should|i can)\s+(.+?)(?:\s+(?:when|after|if|by|before)\s+(.+))?$/i, type: 'offer' },
      { re: /(?:i want|i need)\s+(?:to\s+)?(.+?)(?:\s+(?:when|after|if|by|before)\s+(.+))?$/i, type: 'request' },
    ];

    for (const pat of promisePatterns) {
      const m = text.match(pat.re);
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
  }

  const trailingFiller = /\b(um|uh|like|you know)\s*$/i.test(text);
  if (!trailingFiller) {
    score += 15;
    sources.push({ source: 'no_trailing_filler', value: true, weight: 15 });
  } else {
    score -= 20;
    sources.push({ source: 'trailing_filler', value: true, weight: -20 });
  }

  if (pauseMs >= minimumPauseMs) {
    score += 30;
    sources.push({ source: 'pause_duration', value: pauseMs, weight: 30 });
  } else if (pauseMs > 0) {
    score += Math.round((pauseMs / minimumPauseMs) * 30);
    sources.push({ source: 'pause_duration', value: pauseMs, weight: Math.round((pauseMs / minimumPauseMs) * 30) });
  }

  // Last turn was assistant -> user is more likely finishing a reply
  if (currentIndex > 0 && turns[currentIndex - 1]?.role === 'assistant') {
    score += 5;
    sources.push({ source: 'reply_context', value: 'assistant_previous', weight: 5 });
  }

  score = Math.min(100, Math.max(0, score));
  return {
    finished: score >= 75,
    confidence: score,
    pause_ms: pauseMs,
    sources,
  };
}

// --- Interruption Decay simulator ---

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TtsTrack {
  constructor(text, options = {}) {
    this.text = normalize(text);
    this.wordDurationMs = options.wordDurationMs || 180;
    this.fadeMs = options.fadeMs || 150;
    this.words = this.text.split(/\s+/).filter(Boolean);
    this.state = 'idle';
    this.currentWordIndex = -1;
    this.interruptedAt = null;
    this.events = [];
    this._resolvers = new Set();
    this._interruptPromise = null;
    this._interruptResolve = null;
    this._pendingInterrupt = false;
  }

  _log(event) {
    this.events.push({ at: Date.now(), ...event });
  }

  _resetInterruptPromise() {
    this._interruptPromise = new Promise((resolve) => {
      this._interruptResolve = resolve;
    });
    if (this._pendingInterrupt && this._interruptResolve) {
      this._interruptResolve('interrupt');
    }
  }

  async play() {
    this.state = 'playing';
    this._pendingInterrupt = false;
    this._log({ type: 'play_start', words_total: this.words.length });

    return new Promise((resolve) => {
      this._resolvers.add(resolve);

      const loop = async () => {
        for (let i = 0; i < this.words.length; i += 1) {
          this._resetInterruptPromise();

          if (this._pendingInterrupt) {
            this.state = 'stopped';
            this._log({
              type: 'stopped',
              words_spoken: i,
              words_total: this.words.length,
              trail_off: true,
            });
            this._finish();
            return;
          }

          this.currentWordIndex = i;
          this._log({ type: 'word', index: i, word: this.words[i] });

          const wordStart = Date.now();
          const timer = sleep(this.wordDurationMs);
          const winner = await Promise.race([timer, this._interruptPromise]);

          if (winner === 'interrupt' || this.state === 'interrupted') {
            const elapsed = Date.now() - wordStart;
            const remaining = Math.max(0, this.wordDurationMs - elapsed);
            await sleep(remaining + this.fadeMs);
            this.state = 'stopped';
            this._log({
              type: 'stopped',
              words_spoken: i + 1,
              words_total: this.words.length,
              trail_off: true,
            });
            this._finish();
            return;
          }
        }

        this.state = 'completed';
        this._log({ type: 'completed', words_spoken: this.words.length });
        this._finish();
      };

      loop();
    });
  }

  interrupt(now = Date.now()) {
    if (this.state !== 'playing') return false;
    this.interruptedAt = now;
    this.state = 'interrupted';
    this._pendingInterrupt = true;
    this._log({
      type: 'interrupt_detected',
      word_index: this.currentWordIndex,
      word: this.words[this.currentWordIndex],
      fade_ms: this.fadeMs,
    });
    if (this._interruptResolve) this._interruptResolve('interrupt');
    return true;
  }

  stop() {
    if (this.state === 'stopped' || this.state === 'completed') return;
    this.state = 'stopped';
    this._log({
      type: 'stopped',
      words_spoken: this.currentWordIndex + 1,
      words_total: this.words.length,
      trail_off: false,
    });
    this._finish();
  }

  _finish() {
    this._resolvers.forEach((r) => r(this.summary()));
    this._resolvers.clear();
    if (this._interruptResolve) this._interruptResolve('stop');
  }

  summary() {
    return {
      text: this.text,
      state: this.state,
      words_total: this.words.length,
      words_spoken: this.currentWordIndex + 1,
      interrupted: this.interruptedAt !== null,
      interrupted_at_word_index: this.currentWordIndex,
      events: this.events,
    };
  }
}

// --- Scenario runner ---

export function runScenario(name, turns) {
  const contracts = extractContracts(turns);
  const tts = new TtsTrack(turns.find((t) => t.role === 'assistant')?.text || '');

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
