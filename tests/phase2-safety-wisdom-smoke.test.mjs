/**
 * SYNOPSIS: Minimal smoke tests for Phase 2 Safety, Coaching, and Wisdom services.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import * as emotional from '../services/emotional-modeling.js';
import * as state from '../services/state-modeling.js';
import * as coaching from '../services/lifeos-coaching-protocol.js';
import * as risk from '../services/lifeos-risk-detection.js';
import * as crisis from '../services/lifeos-crisis-protocol.js';
import * as avoidance from '../services/lifeos-avoidance-pattern.js';
import * as chair from '../services/chair-preliminary-decision.js';
import * as solomon from '../services/solomon-withheld-recommendation.js';
import * as calibration from '../services/chair-solomon-calibration.js';
import * as comm from '../services/founder-communication-calibration.js';

function assertType(value, type, name) {
  if (typeof value !== type) throw new Error(`${name} expected ${type}, got ${typeof value}`);
}

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} expected object, got ${typeof value}`);
  }
}

// Emotional modeling
const obs = { subject: 'Adam', event: 'missed deadline', bodySensation: 'tight chest', intensity: 0.7, context: 'work', timestamp: new Date().toISOString(), valuesAtStake: ['integrity', 'commitment'] };
const score = emotional.scoreEmotionalWeight(obs);
assertObject(score, 'scoreEmotionalWeight');
assertType(score.significance, 'number', 'significance');
assertType(score.emotionalWeight, 'number', 'emotionalWeight');

// State modeling
const constellation = { nodes: [{ id: 'n1', type: 'states', name: 'overwhelmed', value: 0.8 }], edges: [] };
const stateRes = state.inferState(constellation, ['too much', 'cannot focus']);
assertObject(stateRes, 'inferState');
assertType(stateRes.state, 'string', 'state');
assertObject(stateRes.suggestions, 'suggestions');

// Coaching protocol
const curious = coaching.becomeCurious({ observation: 'I keep avoiding the budget' });
assertType(curious, 'string', 'becomeCurious');
const understood = coaching.helpFeelUnderstood(constellation, 'I feel like I am failing');
assertType(understood, 'string', 'helpFeelUnderstood');

// Risk detection
const risks = risk.detectTrajectory(constellation, [{ type: 'event', description: 'missed sleep 5 nights', timestamp: new Date().toISOString(), weight: 0.8 }]);
assertObject(risks, 'detectTrajectory');
assertType(risks.risks.length, 'number', 'risks.length');

// Crisis protocol
const plan = crisis.createCrisisPlan({ userId: 'u1', contacts: [{ name: 'Sam', relation: 'partner' }], groundingTechniques: ['breathe 4-7-8'], avoidLanguage: ['just calm down'], consent: 'yes' });
assertObject(plan, 'createCrisisPlan');
if (!crisis.verifyConsent(plan)) throw new Error('verifyConsent');

// Avoidance pattern
const pattern = avoidance.detectAvoidancePattern(constellation, 'budget', [{ topic: 'budget', action: 'avoid', timestamp: new Date().toISOString() }]);
assertObject(pattern, 'detectAvoidancePattern');
assertType(pattern.detected, 'boolean', 'detected');

// Chair preliminary decision
const evidence = chair.createEvidencePackage('new feature', [{ source: 'reality', content: 'users ask', confidence: 0.8 }]);
assertObject(evidence, 'createEvidencePackage');
const prelim = chair.recordPreliminaryDecision(evidence, 'chair-1', 'build small', 'yes');
if (!chair.hasPreliminaryDecision(prelim)) throw new Error('hasPreliminaryDecision');

// Solomon withheld
let pkg = solomon.createWithheldPackage(evidence);
pkg = solomon.addSolomonFinding(pkg, { claim: 'ship small', evidence: 'low risk', confidence: 0.7 });
pkg = solomon.addSolomonRecommendation(pkg, { courseOfAction: 'ship small', confidence: 0.7, assumptions: ['users want'], uncertainties: ['scale'], constitutionalTensions: [] });
const revealed = solomon.revealRecommendation(pkg, prelim);
assertObject(revealed, 'revealRecommendation');

// Calibration
const comparison = calibration.compareDecisions(prelim, pkg.solomonRecommendation, { actualResult: 'success' });
assertObject(comparison, 'compareDecisions');
assertType(comparison.agreement, 'boolean', 'agreement');

// Founder communication calibration
const profile = comm.getDefaultProfile();
assertObject(profile, 'getDefaultProfile');
const calibrated = comm.calibrateMessage('We should consider this.', profile);
assertObject(calibrated, 'calibrateMessage');
assertType(calibrated.adjusted, 'string', 'adjusted');

console.log('Phase 2 smoke tests passed');
