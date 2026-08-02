/**
 * SYNOPSIS: Exports runImprovementLoop — services/builderos-self-improvement-loop.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { scoreBlueprint } from './blueprint-quality-index.js';
import { attributeVariance } from './variance-attribution-engine.js';
import { measureGovernanceCost } from './governance-cost-index.js';
import { calibrateOffice } from './organizational-calibration-engine.js';
import { classifyIdea } from './discovery-classification-engine.js';
import { runIndependentAnalysis } from './independent-laboratory-architecture.js';
import { rankApproaches } from './meta-learning-system.js';

export const version = "2026-08-02";

/**
 * Runs the BuilderOS improvement loop to refine blueprints, measure performance,
 * assess governance overhead, and integrate learnings into the architecture.
 * @param {object} mission_outcome - The outcome of a mission, including prediction, actual results, and logs.
 * @param {object} blueprint - The blueprint object used for the mission.
 * @param {array} runtime_logs - Additional runtime logs from the mission execution.
 * @returns {object} An object containing the improved blueprint, an improvement report, and next actions.
 */
export async function runImprovementLoop(mission_outcome, blueprint, runtime_logs = []) {
  const allLogs = [...mission_outcome.logs, ...runtime_logs];

  // Phase 1: Measure and Attribute
  const blueprintQuality = await scoreBlueprint(blueprint);
  const varianceReport = await attributeVariance(mission_outcome.prediction, mission_outcome.actual, allLogs);
  const governanceCost = await measureGovernanceCost(blueprint, allLogs);

  // Phase 2: Learn and Calibrate
  const calibrationResults = await calibrateOffice(blueprint, mission_outcome.actual);
  const ideaClassification = await classifyIdea(mission_outcome.actual);
  const independentAnalysis = await runIndependentAnalysis(mission_outcome.actual, allLogs);

  // Phase 3: Meta-Learning and Action
  const metaLearnings = [
    `Blueprint quality index: ${blueprintQuality.index}`,
    `Variance attribution: ${varianceReport.summary}`,
    `Governance cost: ${governanceCost.total_cost_usd}`,
    `Organizational calibration insights: ${calibrationResults.calibration_summary}`,
    `Discovery classification: ${ideaClassification.category}`,
    `Independent analysis findings: ${independentAnalysis.summary_findings}`,
  ];
  const rankedApproaches = await rankApproaches(metaLearnings);

  const qualityDelta = blueprintQuality.index - (blueprint.initial_quality_index || blueprintQuality.index); // Assuming initial_quality_index might exist or default
  
  const improvement_notes = [
    `Quality index: ${blueprintQuality.index}`,
    `Variance lessons: ${varianceReport.lessons.join('; ')}`,
    `Governance cost impact: ${governanceCost.impact_summary}`,
    `Calibration adjustments: ${calibrationResults.adjustments_proposed.join('; ')}`,
    `New idea category: ${ideaClassification.category}`,
    `Independent lab recommendations: ${independentAnalysis.recommendations.join('; ')}`,
    `Top ranked approaches: ${rankedApproaches.join('; ')}`
  ];

  const improved_blueprint = { ...blueprint, improvement_notes: improvement_notes };

  const improvement_report = {
    quality_delta: qualityDelta,
    variance_lessons: varianceReport.lessons,
    governance_cost: governanceCost,
    meta_insights: metaLearnings,
  };

  const next_actions = rankedApproaches; // Using ranked approaches as next actions

  return { improved_blueprint, improvement_report, next_actions };
}

/**
 * Generates a skeleton blueprint incorporating product ID and feedback.
 * @param {string} product_id - The ID of the product.
 * @param {object} previous_blueprint - The previous blueprint to base the new one on.
 * @param {array} feedback - An array of feedback strings or objects.
 * @returns {object} A new blueprint skeleton.
 */
export function generateNextBlueprint(product_id, previous_blueprint, feedback = []) {
  const newBlueprint = {
    product_id: product_id,
    version: (previous_blueprint.version || 0) + 1,
    created_at: new Date().toISOString(),
    base_on_blueprint_id: previous_blueprint.id || null, // Assuming previous_blueprint has an 'id'
    feedback_incorporated: feedback,
    design_elements: previous_blueprint.design_elements || {},
    // Additional structure can be added here as needed for a skeleton
  };
  return newBlueprint;
}

/**
 * Summarizes an improvement report into a human-readable string.
 * @param {object} report - The improvement report object.
 * @returns {string} A short human-readable summary.
 */
export function summarizeImprovementReport(report) {
  const { quality_delta, variance_lessons, governance_cost, meta_insights } = report;
  const qualitySummary = quality_delta >= 0 ? `Blueprint quality improved by ${quality_delta.toFixed(2)}.` : `Blueprint quality decreased by ${Math.abs(quality_delta).toFixed(2)}.`;
  const varianceSummary = variance_lessons.length > 0 ? `Key variance lessons: ${variance_lessons.slice(0, 2).join(', ')}${variance_lessons.length > 2 ? '...' : ''}.` : 'No specific variance lessons.';
  const costSummary = `Governance cost: $${governance_cost.total_cost_usd ? governance_cost.total_cost_usd.toFixed(2) : 'N/A'}.`;
  const insightsSummary = meta_insights.length > 0 ? `Key insights: ${meta_insights.slice(0, 2).join(', ')}${meta_insights.length > 2 ? '...' : ''}.` : 'No new meta insights.';

  return `${qualitySummary} ${varianceSummary} ${costSummary} ${insightsSummary}`;
}