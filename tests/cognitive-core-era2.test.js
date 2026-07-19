/**
 * SYNOPSIS: Cognitive Core Era-2 unit tests — outcome detection, advisor lenses,
 * program hypothesis invariants (Law 1/Law 2), ref matching. Pure/fake-pool only (no live DB).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectOutcomeTurn,
  extractChosenOption,
  resolveCapsuleContracts,
  suppressTextForCapsule,
} from '../config/judgment-capsule-contracts.js';
import { listAdvisors, ADVISOR_CONTRACTS } from '../config/cognitive-core-advisors.js';
import { createCognitiveCorePrograms } from '../services/cognitive-core-programs.js';

test('detectOutcomeTurn: explicit self-report fires + extracts option', () => {
  const d = detectOutcomeTurn('In the end I went with pausing auth to make chat human.');
  assert.equal(d.is_outcome_turn, true);
  assert.ok(d.chosen_option && d.chosen_option.length > 0);
});

test('detectOutcomeTurn: a question is NOT an outcome', () => {
  assert.equal(detectOutcomeTurn('Should I hire Jane or keep contracting?').is_outcome_turn, false);
});

test('extractChosenOption stops at because/punctuation', () => {
  assert.equal(extractChosenOption('I chose Jane because she ships fast'), 'Jane');
  assert.equal(extractChosenOption('we went with the in-house build.'), 'the in-house build');
});

test('resolveCapsuleContracts resolves advisor + future-self lenses', () => {
  const caps = resolveCapsuleContracts(['founder', 'munger', 'future_self', 'nope']);
  assert.deepEqual(caps.map((c) => c.id), ['founder', 'munger', 'future_self']);
});

test('every advisor carries an explicit simulation_note (honesty invariant)', () => {
  const advisors = listAdvisors();
  assert.ok(advisors.length >= 8);
  for (const a of advisors) {
    assert.ok(a.simulation_note && /NOT the real person|lens, not a prophecy/i.test(a.simulation_note));
  }
  assert.ok(advisors.some((a) => a.id === 'future_self' && a.kind === 'future_self'));
});

test('advisor deny_patterns suppress off-lens text', () => {
  const munger = ADVISOR_CONTRACTS.munger;
  const t = suppressTextForCapsule('this will go viral', munger);
  assert.match(t, /\[suppressed\]/);
});

function fakeProgramsPool(activeRows) {
  return {
    calls: [],
    async query(sql, params) {
      this.calls.push({ sql, params });
      if (/INSERT INTO judgment_programs/.test(sql)) {
        return { rows: [{ program_id: 'p-new', label: params[1], confidence: params[8], status: 'active' }] };
      }
      if (/UPDATE judgment_programs/.test(sql)) {
        return {
          rows: [{
            program_id: params[0], confidence: params[1], change_trajectory: params[2],
            evidence_for: JSON.parse(params[3]), evidence_against: JSON.parse(params[4]), status: params[5],
          }],
        };
      }
      if (/SELECT \* FROM judgment_programs WHERE program_id/.test(sql)) {
        return { rows: [{ program_id: params[0], confidence: 0.9, change_trajectory: 'stable', evidence_for: [], evidence_against: [], status: 'active' }] };
      }
      if (/FROM judgment_programs/.test(sql)) {
        return { rows: activeRows || [] };
      }
      return { rows: [] };
    },
  };
}

test('createProgram requires label + hypothesis (Law: no empty models)', async () => {
  const programs = createCognitiveCorePrograms({ pool: fakeProgramsPool() });
  await assert.rejects(() => programs.createProgram({ userId: '1' }), /label_and_hypothesis/);
});

test('adjustConfidence clamps delta and confidence to [0,1] (Law 2: evidence, bounded)', async () => {
  const programs = createCognitiveCorePrograms({ pool: fakeProgramsPool() });
  const up = await programs.adjustConfidence({ programId: 'p1', delta: 0.9, supports: true, evidenceNote: 'strong hit' });
  assert.equal(up.confidence, 1); // 0.9 + clamp(0.9->0.34) => 1.0 clamp
  assert.equal(up.change_trajectory, 'strengthening');
  assert.equal(up.evidence_for.length, 1);

  const down = await programs.adjustConfidence({ programId: 'p1', delta: -0.9, supports: false });
  assert.ok(down.confidence >= 0 && down.confidence <= 1);
  assert.equal(down.change_trajectory, 'weakening');
});

test('matchProgramsByRefs links free-text refs to concrete program rows', async () => {
  const programs = createCognitiveCorePrograms({
    pool: fakeProgramsPool([
      { program_id: 'a', label: 'Scarcity response', confidence: 0.4, status: 'active' },
      { program_id: 'b', label: 'Proving worth', confidence: 0.5, status: 'active' },
    ]),
  });
  const byExact = await programs.matchProgramsByRefs('1', ['proving worth']);
  assert.deepEqual(byExact.map((p) => p.program_id), ['b']);
  const bySubstring = await programs.matchProgramsByRefs('1', ['scarcity']);
  assert.deepEqual(bySubstring.map((p) => p.program_id), ['a']);
});