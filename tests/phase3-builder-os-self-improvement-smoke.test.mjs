/**
 * SYNOPSIS: Phase 3 BuilderOS self-improvement smoke test.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as bq from '../services/blueprint-quality-index.js';
import * as va from '../services/variance-attribution-engine.js';
import * as gc from '../services/governance-cost-index.js';
import * as oc from '../services/organizational-calibration-engine.js';
import * as dc from '../services/discovery-classification-engine.js';
import * as il from '../services/independent-laboratory-architecture.js';
import * as ml from '../services/meta-learning-system.js';
import * as si from '../services/builderos-self-improvement-loop.js';

describe('phase3 builderos self-improvement smoke', () => {
  it('blueprint-quality-index exports scoreBlueprint, compareBlueprints, recommendImprovements, getDefaultBlueprintSchema', () => {
    assert.equal(typeof bq.scoreBlueprint, 'function');
    assert.equal(typeof bq.compareBlueprints, 'function');
    assert.equal(typeof bq.recommendImprovements, 'function');
    assert.equal(typeof bq.getDefaultBlueprintSchema, 'function');
  });

  it('variance-attribution-engine exports attributeVariance, rankCauses, extractLesson, getVarianceTypes', () => {
    assert.equal(typeof va.attributeVariance, 'function');
    assert.equal(typeof va.rankCauses, 'function');
    assert.equal(typeof va.extractLesson, 'function');
    assert.equal(typeof va.getVarianceTypes, 'function');
  });

  it('governance-cost-index exports measureGovernanceCost, compareProcessCosts, suggestCheaperPath, getCostMetrics', () => {
    assert.equal(typeof gc.measureGovernanceCost, 'function');
    assert.equal(typeof gc.compareProcessCosts, 'function');
    assert.equal(typeof gc.suggestCheaperPath, 'function');
    assert.equal(typeof gc.getCostMetrics, 'function');
  });

  it('organizational-calibration-engine exports calibrateOffice, compareOffices, suggestRecalibration, getSupportedOffices', () => {
    assert.equal(typeof oc.calibrateOffice, 'function');
    assert.equal(typeof oc.compareOffices, 'function');
    assert.equal(typeof oc.suggestRecalibration, 'function');
    assert.equal(typeof oc.getSupportedOffices, 'function');
  });

  it('discovery-classification-engine exports classifyIdea, promoteIdea, listPromotionCriteria, getTierLadder', () => {
    assert.equal(typeof dc.classifyIdea, 'function');
    assert.equal(typeof dc.promoteIdea, 'function');
    assert.equal(typeof dc.listPromotionCriteria, 'function');
    assert.equal(typeof dc.getTierLadder, 'function');
  });

  it('independent-laboratory-architecture exports runIndependentAnalysis, compareFindings, recommendConvergence, getSupportedOffices', () => {
    assert.equal(typeof il.runIndependentAnalysis, 'function');
    assert.equal(typeof il.compareFindings, 'function');
    assert.equal(typeof il.recommendConvergence, 'function');
    assert.equal(typeof il.getSupportedOffices, 'function');
  });

  it('meta-learning-system exports recordExperiment, rankApproaches, recommendConfig, getMetaScore', () => {
    assert.equal(typeof ml.recordExperiment, 'function');
    assert.equal(typeof ml.rankApproaches, 'function');
    assert.equal(typeof ml.recommendConfig, 'function');
    assert.equal(typeof ml.getMetaScore, 'function');
  });

  it('builderos-self-improvement-loop exports runImprovementLoop, generateNextBlueprint, summarizeImprovementReport', () => {
    assert.equal(typeof si.runImprovementLoop, 'function');
    assert.equal(typeof si.generateNextBlueprint, 'function');
    assert.equal(typeof si.summarizeImprovementReport, 'function');
  });

  it('runImprovementLoop returns improved blueprint, report, and next actions', () => {
    const blueprint = { steps: [{ id: 's1', acceptance: { criteria: 'ok' } }], dependencies: [], risk_notes: [] };
    const outcome = {
      prediction: { quality_score: 0.9 },
      actual: { quality_score: 0.7 },
      logs: [{ office: 'Builder', action: 'timeout', timestamp: '2026-08-02T00:00:00Z', tokens: 1 }],
    };
    const result = si.runImprovementLoop(outcome, blueprint, []);
    assert.ok(Array.isArray(result.improved_blueprint.improvement_notes));
    assert.ok(Array.isArray(result.improvement_report.variance_lessons));
    assert.ok(result.improvement_report.governance_cost);
    assert.ok(Array.isArray(result.next_actions));
  });
});
