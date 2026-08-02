/**
 * SYNOPSIS: Smoke tests for the Phase 1 and Phase 2 constitutional learning engines.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeRealityAlignment } from '../services/reality-alignment.js';
import { computeConfidenceVector, combineConfidenceVectors, calibrateConfidence, formatConfidence, DIMENSIONS } from '../services/confidence-vectors.js';
import { createConstellation, addObservation, weightEdge, projectForProduct } from '../services/human-constellation.js';
import { estimateCauses, proposeInterventions, scoreCausalModel } from '../services/causality-engine.js';
import { askBetterQuestion, generatePerspectiveSummary, identifyUnstatedNeeds } from '../services/perspective-expansion.js';
import { assessReadiness, selectForm } from '../services/readiness-engine.js';
import { calibrateMessage, estimateProfile } from '../services/founder-communication-calibration.js';
import { recordPrediction, recordOutcome, getCalibrationScore } from '../services/calibration-ledger.js';
import { updateTrust, getTrustScore, TRUST_DIMENSIONS } from '../services/office-trust-ledger.js';
import { inferState, describeState, detectStateShift, adaptCoachingForState } from '../services/state-modeling.js';
import { observe, becomeCurious, helpFeelUnderstood, expandLandscape, verifySharedUnderstanding, explorePaths } from '../services/lifeos-coaching-protocol.js';
import { detectTrajectory, isEscalationNeeded, getRiskTypes } from '../services/lifeos-risk-detection.js';
import { createCrisisPlan, verifyConsent, getGroundingTechnique } from '../services/lifeos-crisis-protocol.js';
import { detectAvoidancePattern, formatCuriousInvitation, trackTopicExposure } from '../services/lifeos-avoidance-pattern.js';
import { createEvidencePackage, addFinding, addRecommendation, getRevelation } from '../services/solomon-wisdom-lab.js';

describe('Phase 1 — Reality Alignment and Adaptive Human Model', () => {
  it('Reality Alignment Engine ingests and compares five reality layers', () => {
    const pkg = {
      observed: ['deadline met', 'team delivered'],
      experienced: ['relief', 'pressure'],
      remembered: ['past deadline stress'],
      predicted: ['stable launch'],
      shared: ['launch is on track']
    };
    const result = computeRealityAlignment(pkg, 'launch is on track');
    assert.equal(typeof result.alignment_score, 'number');
    assert(result.alignment_score >= 0 && result.alignment_score <= 1);
    assert(Array.isArray(result.drift_report));
    assert.equal(typeof result.reconciliation, 'string');
  });

  it('Confidence Vector Model computes eight dimensions and a confidence scalar', () => {
    const vector = computeConfidenceVector({ belief_strength: 0.8, evidence_support: 0.7 });
    for (const dim of DIMENSIONS) {
      assert.equal(typeof vector[dim], 'number', `dimension ${dim} missing`);
      assert(vector[dim] >= 0 && vector[dim] <= 1, `dimension ${dim} out of range`);
    }
  });

  it('Confidence vectors combine and calibrate deterministically', () => {
    const v1 = computeConfidenceVector({ belief_strength: 0.8, evidence_support: 0.8 });
    const v2 = computeConfidenceVector({ belief_strength: 0.4, evidence_support: 0.4 });
    const combined = combineConfidenceVectors([v1, v2]);
    assert.equal(typeof combined.confidence, 'number');
    const calibrated = calibrateConfidence(v1, { actual: 0.2, expected: 0.8 });
    assert(calibrated.confidence < v1.confidence);
    const formatted = formatConfidence(v1);
    assert.equal(typeof formatted, 'string');
  });

  it('Human Constellation builds a graph with weighted causal edges', () => {
    const c = createConstellation('user-1');
    const value = addObservation(c, 'value', { label: 'family' });
    const goal = addObservation(c, 'goal', { label: 'health' });
    const edge = weightEdge(c, value.id, goal.id, { strength: 0.85, stability: 0.9 });
    assert.equal(c.nodes.size, 2);
    assert.equal(c.edges.get(value.id).get(goal.id).strength, 0.85);
    const projection = projectForProduct(c, 'lifeos');
    assert.equal(projection.personId, 'user-1');
    assert(Array.isArray(projection.nodes));
  });

  it('Causality Engine estimates causes from event stream and constellation', () => {
    const constellation = {
      nodes: [{ name: 'stressorA', type: 'triggers' }, { name: 'anxiety', type: 'states' }],
      edges: [{ from: 'stressorA', to: 'anxiety', causal_confidence: 0.8 }],
      triggers: [{ name: 'stressorA' }]
    };
    const events = [
      { type: 'trigger', payload: 'stressorA', timestamp: 1 },
      { type: 'state_change', payload: 'anxiety', timestamp: 2 }
    ];
    const causal = estimateCauses(events, constellation);
    assert(Array.isArray(causal.edges));
    assert(causal.edges.length > 0);
    assert.equal(typeof causal.edges[0].confidence, 'number');
  });

  it('Causality Engine proposes interventions and scores models', () => {
    const interventions = proposeInterventions({ name: 'calm', type: 'states' }, [{ type: 'cost', value: 'low' }]);
    assert(Array.isArray(interventions));
    const model = { edges: [{ from: 'stressorA', to: 'anxiety', confidence: 0.8 }] };
    const score = scoreCausalModel(model, [{ cause: 'stressorA', effect: 'anxiety', observed: true }]);
    assert.equal(typeof score.accuracy, 'number');
    assert.equal(typeof score.fit, 'number');
  });

  it('Perspective Expansion asks better questions and identifies unstated needs', () => {
    const constellation = {
      nodes: [
        { type: 'needs', name: 'autonomy' },
        { type: 'goals', name: 'career growth' },
        { type: 'values', name: 'integrity' }
      ],
      edges: []
    };
    const question = askBetterQuestion(constellation);
    assert.equal(typeof question, 'string');
    assert(question.length > 0);
    const summary = generatePerspectiveSummary(constellation, 'I want to grow');
    assert.equal(typeof summary, 'string');
    const needs = identifyUnstatedNeeds(constellation);
    assert(Array.isArray(needs));
  });

  it('Readiness Engine returns a calibrated readiness score with evidence', () => {
    const recipient = {
      emotionalState: 'calm',
      cognitiveLoad: 0.3,
      context: {},
      history: [],
      constellation: { avoidances: [] }
    };
    const insight = { topic: 'test', complexity: 'low', emotionalWeight: 'low' };
    const result = assessReadiness(recipient, insight);
    assert.equal(typeof result.readiness_score, 'number');
    assert(result.readiness_score >= 0 && result.readiness_score <= 1);
    assert.equal(typeof result.risk_if_forced, 'string');
  });

  it('Founder Communication Calibration estimates a profile and calibrates a message', () => {
    const profile = estimateProfile(['Please fix the auth issue'], []);
    assert.equal(typeof profile.literalness, 'number');
    const calibrated = calibrateMessage('hello', profile);
    assert.equal(typeof calibrated.adjusted, 'string');
    assert(Array.isArray(calibrated.changes));
  });

  it('Calibration Ledger records predictions and outcomes for Chair and Solomon', () => {
    const chairId = recordPrediction({ officeId: 'chair', modelId: 'm1', prediction: 'success' });
    const solomonId = recordPrediction({ officeId: 'solomon', modelId: 'm2', prediction: 'caution' });
    assert(recordOutcome(chairId, 'success'));
    assert(recordOutcome(solomonId, 'caution'));
    assert.equal(getCalibrationScore('chair'), 1);
    assert.equal(getCalibrationScore('solomon'), 1);
  });

  it('Office Trust Ledger earns trust per office', () => {
    updateTrust('chair', TRUST_DIMENSIONS.TRACK_RECORD, 0.2);
    updateTrust('chair', TRUST_DIMENSIONS.CONSTITUTIONAL_ALIGNMENT, 0.1);
    const score = getTrustScore('chair');
    assert(score > 0 && score <= 1);
  });
});

describe('Phase 2 — Safety, Coaching, and Wisdom', () => {
  it('State Modeling infers state from constellation and recent events', () => {
    const constellation = {
      nodes: [{ name: 'tired', type: 'states' }, { name: 'rest', type: 'needs' }],
      edges: []
    };
    const state = inferState(constellation, ['I am exhausted']);
    assert.equal(typeof state.state, 'string');
    assert.equal(typeof state.confidence, 'number');
    assert.equal(typeof state.suggestions, 'object');
  });

  it('Coaching Protocol runs the full Observe-to-Explore flow', () => {
    const observed = observe('I feel stuck at work');
    assert.equal(typeof observed.observation, 'string');
    const question = becomeCurious(observed.observation);
    assert.equal(typeof question, 'string');
    const reflection = helpFeelUnderstood({ nodes: [], edges: [] }, 'I feel stuck at work');
    assert.equal(typeof reflection, 'string');
    const expansion = expandLandscape({ nodes: [], edges: [] }, 'work');
    assert(Array.isArray(expansion.perspectives));
    const shared = verifySharedUnderstanding('You feel stuck at work', 'Yes, exactly');
    assert.equal(typeof shared.aligned, 'boolean');
    const paths = explorePaths({ nodes: [], edges: [] }, 'work', true);
    assert.equal(paths.invited, true);
    assert(Array.isArray(paths.paths));
  });

  it('Early Risk Detection identifies trajectories and escalation need', () => {
    const constellation = {
      sleepDebtHours: 12,
      integrityScore: 50,
      commitmentOverdueCount: 6,
      energyLevel: 30,
      joyScore: 40,
      hrvAverage: 30,
      financialDebtToIncomeRatio: 0.6,
      socialInteractionFrequency: 1,
      hasSupportNetwork: false,
      emotionalCheckinNegativeRatio: 0.8,
      chronicPainLevel: 5,
      medicationAdherence: 80,
      alcoholConsumptionUnitsPerWeek: 3,
      substanceUseFrequency: 2,
      conflictResolutionScore: 50,
      purposeAlignmentScore: 40,
      pastViolentIncidents: 0
    };
    const events = [
      { type: 'isolation_indicator', description: 'alone', timestamp: 1, weight: 1 },
      { type: 'stress_event', description: 'deadline', timestamp: 2, weight: 1 }
    ];
    const result = detectTrajectory(constellation, events);
    assert(Array.isArray(result.risks));
    assert(result.risks.length > 0);
    assert(['low', 'moderate', 'high', 'critical'].includes(result.risks[0].severity));
    assert(getRiskTypes().includes('burnout'));
  });

  it('Crisis Protocol creates a consent-based plan', () => {
    const plan = createCrisisPlan({
      userId: 'u1',
      contacts: [{ name: 'Jane', type: 'family', phone: '555-0100', riskSeverity: ['low', 'medium'] }],
      groundingTechniques: ['Box breathing for 4 minutes', 'Hold a cold object'],
      avoidLanguage: ['calm down', 'just relax'],
      consent: true
    });
    assert.equal(plan.userId, 'u1');
    assert.equal(verifyConsent(plan), true);
    assert.equal(typeof getGroundingTechnique(plan, 'anxious'), 'string');
  });

  it('Avoidance Pattern Recognition tracks topic exposure and formats an invitation', () => {
    const events = [
      { topic: 'finances', action: 'approach', timestamp: 1 },
      { topic: 'finances', action: 'avoid', timestamp: 2 },
      { topic: 'finances', action: 'avoid', timestamp: 3 },
      { topic: 'finances', action: 'avoid', timestamp: 4 }
    ];
    const pattern = detectAvoidancePattern({}, 'finances', events);
    assert.equal(typeof pattern.detected, 'boolean');
    const invitation = formatCuriousInvitation('finances', pattern);
    assert.equal(typeof invitation, 'string');
  });

  it('Solomon Wisdom Lab withholds recommendation until Chair commits', () => {
    let pkg = createEvidencePackage('Should we expand the architecture?');
    pkg = addFinding(pkg, { type: 'evidence', content: 'Builder velocity is slowing.' });
    pkg = addFinding(pkg, { type: 'model', content: 'Fewer principles absorb more ideas.' });
    pkg = addRecommendation(pkg, 'Do not expand unless reality demonstrates a missing capability.', true);
    assert.equal(getRevelation(pkg, null), null);
    assert.equal(typeof getRevelation(pkg, 'Chair decides to wait'), 'string');
  });
});
