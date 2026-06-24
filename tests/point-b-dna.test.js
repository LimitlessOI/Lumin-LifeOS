/**
 * SYNOPSIS: Point B DNA — supreme purpose enforcement tests.
 * @ssot docs/constitution/POINT_B_DNA.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertPointBDnaFilesExist,
  loadPointBDnaJson,
  stampPointBDna,
  detectProcessTheaterAsPointB,
  POINT_B_DNA_VERSION,
  getPointBDnaPromptBlock,
} from '../services/point-b-dna.js';

describe('point-b-dna', () => {
  it('constitution files exist and version matches', () => {
    const r = assertPointBDnaFilesExist();
    assert.equal(r.ok, true, r.failures?.join('; '));
    assert.equal(loadPointBDnaJson().version, POINT_B_DNA_VERSION);
  });

  it('prompt block states supreme purpose', () => {
    const block = getPointBDnaPromptBlock();
    assert.match(block, /Point A to Point B/i);
    assert.match(block, /synergy/i);
    assert.match(block, /mechanics.*NOT the destination/i);
  });

  it('detects process theater as Point B', () => {
    assert.equal(
      detectProcessTheaterAsPointB({
        human_summary: 'Point B reached — governance complete',
        founder_usability_pass: false,
        command_truth: 'NO_COMMAND_RAN',
      }),
      'PROCESS_THEATER_AS_POINT_B',
    );
  });

  it('stampPointBDna downgrades illegal PASS', () => {
    const out = stampPointBDna({
      pass_fail: 'PASS',
      ok: true,
      human_summary: 'Point B reached — receipt scan pass',
      founder_usability_pass: false,
      command_truth: 'NO_COMMAND_RAN',
    });
    assert.equal(out.pass_fail, 'FAIL');
    assert.equal(out.point_b_dna_version, POINT_B_DNA_VERSION);
  });

  it('allows honest still-at-A scoreboard', () => {
    const out = stampPointBDna({
      pass_fail: 'FAIL',
      ok: false,
      human_summary: 'Still at Point A — 100% intention, mechanics not solved yet.',
      command_truth: 'NO_COMMAND_RAN',
    });
    assert.equal(out.pass_fail, 'FAIL');
    assert.equal(out.system_purpose, 'point_a_to_point_b');
  });
});
