/**
 * SYNOPSIS: Exports runImprovementLoop — services/builderos-self-improvement-loop.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { scoreBlueprint, compareBlueprints } from './blueprint-quality-index.js';
import { attributeVariance, rankCauses } from './variance-attribution-engine.js';
import { measureGovernanceCost } from './governance-cost-index.js';
import { calibrateOffice } from './organizational-calibration-engine.js';
import { classifyIdea } from './discovery-classification-engine.js';
import { runIndependentAnalysis, recommendConvergence } from './independent-laboratory-architecture.js';
import { recordExperiment, rankApproaches } from './meta-learning-system.js';

export const version = "2026-08-02";

function toLogEntries(logs) {
  return (logs || []).filter((l) => typeof l === 'object' && l !== null && !Array.isArray(l));
}

function defaultPrediction(actual) {
  if (!actual || typeof actual !== 'object') return {};
  const copy = {};
  for (const key of Object.keys(actual)) {
    const v = actual[key];
    copy[key] = typeof v === 'number' ? Math.min(1, Math.max(0, v + 0.1)) : v;
  }
  return copy;
}

/**
 * Runs the BuilderOS improvement loop to refine blueprints, measure performance,
 * assess governance overhead, and integrate learnings into the architecture.
 * @param {object} mission_outcome - The outcome of a mission, including prediction, actual results, and logs.
 * @param {object} blueprint - The blueprint object used for the mission.
 * @param {array} runtime_logs - Additional runtime logs from the mission execution.
 * @returns {object} An object containing the improved blueprint, an improvement report, and next actions.
 */
export function runImprovementLoop(mission_outcome, blueprint, runtime_logs = []) {
  const outcome = mission_outcome || {};
  const prediction = outcome.prediction || defaultPrediction(outcome.actual);
  const actual = outcome.actual || {};
  const allLogs = toLogEntries([...(outcome.logs || []), ...runtime_logs]);

  const beforeScore = scoreBlueprint(blueprint);
  const qualityComparison = compareBlueprints({ ...blueprint, initial_quality_index: beforeScore.quality_score }, blueprint);
  const qualityDelta = qualityComparison.quality_delta;

  const varianceReport = attributeVariance(prediction, actual, allLogs);
  const rankedCauses = rankCauses(varianceReport.attributions || []);
  const varianceLessons = rankedCauses.map((c) => `${c.cause} (${(c.contribution * 100).toFixed(0)}%)`);
  if (varianceReport.learned_lesson) varianceLessons.push(varianceReport.learned_lesson);

  const decision = { id: blueprint.id || 'mission', title: blueprint.title || 'Blueprint', urgency: blueprint.urgency || 'normal' };
  const governanceCost = measureGovernanceCost(decision, allLogs);

  const predictionQuality = typeof prediction.quality_score === 'number' ? prediction.quality_score : beforeScore.quality_score;
  const actualQuality = typeof actual.quality_score === 'number' ? actual.quality_score : beforeScore.quality_score;
  const builderPrediction = { prediction: predictionQuality, outcome: actualQuality, confidence: 0.8 };
  const calibrationResults = calibrateOffice('Builder', [builderPrediction]);

  const ideaEvidence = [{ type: 'outcome', source: 'runtime', weight: varianceReport.variance_score || 0.5 }];
  const idea = { statement: 'Mission outcome variance', evidence: ideaEvidence, current_tier: 'observation' };
  const ideaClassification = classifyIdea(idea, ideaEvidence);

  const independentAnalysis = runIndependentAnalysis(actual, ['Chair', 'Solomon', 'Sentry']);
  const convergenceRecommendation = recommendConvergence(independentAnalysis.independent_findings || []);

  const experiment = recordExperiment({
    model: 'builderos-self-improvement-loop',
    prompt_id: blueprint.id || 'default',
    workflow: 'improvement-loop',
    outcome: { reality_alignment: 1 - (varianceReport.variance_score || 0), cost: governanceCost.cost_score || 0 },
  });
  const rankedApproachesResult = rankApproaches([experiment]);
  const metaInsights = [
    `Blueprint quality score: ${beforeScore.quality_score.toFixed(3)}`,
    `Variance score: ${varianceReport.variance_score.toFixed(3)}`,
    `Governance cost score: ${governanceCost.cost_score.toFixed(3)}`,
    `Builder calibration: ${calibrationResults.calibration_score.toFixed(3)} — ${calibrationResults.recommendation}`,
    `Idea classified as: ${ideaClassification.classification}`,
    `Independent lab: ${convergenceRecommendation}`,
  ];

  const nextActions = [
    ...varianceLessons.slice(0, 3),
    ...(governanceCost.bottlenecks || []),
    ...(calibrationResults.recommendation ? [calibrationResults.recommendation] : []),
    ...(rankedApproachesResult.rankings[0] ? [`Adopt top-ranked approach: ${rankedApproachesResult.rankings[0].workflow}`] : []),
  ];

  const improvement_notes = [
    `Quality delta: ${qualityDelta.toFixed(3)}`,
    `Variance lessons: ${varianceLessons.join('; ')}`,
    `Governance cost breakdown: ${JSON.stringify(governanceCost.breakdown)}`,
    `Builder calibration: ${calibrationResults.calibration_score.toFixed(3)}`,
    `Discovery classification: ${ideaClassification.classification}`,
    `Convergence recommendation: ${convergenceRecommendation}`,
  ];

  const improved_blueprint = { ...blueprint, improvement_notes };

  const improvement_report = {
    quality_delta: qualityDelta,
    variance_lessons: varianceLessons,
    governance_cost: governanceCost,
    meta_insights: metaInsights,
  };

  return { improved_blueprint, improvement_report, next_actions: nextActions };
}

/**
 * Generates a skeleton blueprint incorporating product ID and feedback.
 * @param {string} product_id - The ID of the product.
 * @param {object} previous_blueprint - The previous blueprint to base the new one on.
 * @param {array} feedback - An array of feedback strings or objects.
 * @returns {object} A new blueprint skeleton.
 */
export function generateNextBlueprint(product_id, previous_blueprint, feedback = []) {
  return {
    id: `${product_id}-v${(previous_blueprint.version || 0) + 1}`,
    product_id,
    version: (previous_blueprint.version || 0) + 1,
    created_at: new Date().toISOString(),
    based_on_blueprint_id: previous_blueprint.id || null,
    feedback_incorporated: feedback,
    steps: previous_blueprint.steps || [],
    acceptance: previous_blueprint.acceptance || {},
    dependencies: previous_blueprint.dependencies || [],
    risk_notes: previous_blueprint.risk_notes || [],
  };
}

/**
 * Summarizes an improvement report into a human-readable string.
 * @param {object} report - The improvement report object.
 * @returns {string} A short human-readable summary.
 */
export function summarizeImprovementReport(report) {
  const { quality_delta, variance_lessons, governance_cost, meta_insights } = report;
  const qualitySummary = typeof quality_delta === 'number' ? (quality_delta >= 0 ? `Blueprint quality improved by ${quality_delta.toFixed(2)}.` : `Blueprint quality decreased by ${Math.abs(quality_delta).toFixed(2)}.`) : 'Blueprint quality delta unavailable.';
  const varianceSummary = variance_lessons.length > 0 ? `Key variance lessons: ${variance_lessons.slice(0, 2).join(', ')}${variance_lessons.length > 2 ? '...' : ''}.` : 'No specific variance lessons.';
  const costScore = governance_cost && typeof governance_cost.cost_score === 'number' ? governance_cost.cost_score : null;
  const costSummary = costScore !== null ? `Governance cost score: ${costScore.toFixed(2)}.` : 'Governance cost unavailable.';
  const insightsSummary = meta_insights.length > 0 ? `Key insights: ${meta_insights.slice(0, 2).join(', ')}${meta_insights.length > 2 ? '...' : ''}.` : 'No new meta insights.';

  return `${qualitySummary} ${varianceSummary} ${costSummary} ${insightsSummary}`;
}