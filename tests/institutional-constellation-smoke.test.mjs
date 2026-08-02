/**
 * SYNOPSIS: Institutional Constellation smoke test.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInstitutionalConstellation,
  addBelief,
  addOffice,
  addProduct,
  weightAgreement,
  recordPrediction,
  recordOutcome,
  getCalibrationReport,
  getDriftSignals,
  getBlindSpots,
  getConstellationSummary,
  version,
} from '../services/institutional-constellation.js';

describe('institutional constellation smoke', () => {
  it('exports version and all expected functions', () => {
    assert.equal(version, '2026-08-02');
    assert.equal(typeof createInstitutionalConstellation, 'function');
    assert.equal(typeof addBelief, 'function');
    assert.equal(typeof addOffice, 'function');
    assert.equal(typeof addProduct, 'function');
    assert.equal(typeof weightAgreement, 'function');
    assert.equal(typeof recordPrediction, 'function');
    assert.equal(typeof recordOutcome, 'function');
    assert.equal(typeof getCalibrationReport, 'function');
    assert.equal(typeof getDriftSignals, 'function');
    assert.equal(typeof getBlindSpots, 'function');
    assert.equal(typeof getConstellationSummary, 'function');
  });

  it('builds a constellation with offices, beliefs, predictions and outcomes', () => {
    const c = createInstitutionalConstellation();
    const chair = addOffice(c, 'Chair');
    const solomon = addOffice(c, 'Solomon');
    const belief = addBelief(c, 'Reality has final authority', ['constitution-v1', 'chair-precedent'], 0.95);
    weightAgreement(c, chair.id, belief.id, { strength: 0.9, source: 'Chair' });
    weightAgreement(c, solomon.id, belief.id, { strength: 0.85, source: 'Solomon' });

    const pred = recordPrediction(c, chair.id, 'The build will pass preflight', 0.92);
    assert.ok(pred);
    recordOutcome(c, pred.id, { matching_score: 0.95 });

    const report = getCalibrationReport(c);
    assert.ok(report.total_nodes >= 4);
    assert.ok(report.total_edges >= 3);
    assert.ok(report.accuracy > 0);
  });

  it('detects drift signals and blind spots', () => {
    const c = createInstitutionalConstellation();
    const office = addOffice(c, 'Builder');
    const pred = recordPrediction(c, office.id, 'Everything is fine', 0.99);
    const spots = getBlindSpots(c);
    assert.ok(Array.isArray(spots));
    const drifts = getDriftSignals(c);
    assert.ok(drifts.some((d) => d.type === 'overconfidence'));
  });

  it('returns a human-readable summary', () => {
    const c = createInstitutionalConstellation();
    addOffice(c, 'Chair');
    const summary = getConstellationSummary(c);
    assert.ok(summary.includes('office'));
    assert.ok(summary.includes('No significant drift signals') || summary.includes('drift'));
  });
});
