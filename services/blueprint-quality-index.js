/**
 * SYNOPSIS: Service module — Blueprint Quality Index.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

const version = "2026-08-02";

/**
 * Calculates a quality score for a given blueprint.
 * @param {object} blueprint - The blueprint object.
 * @param {Array<object>} blueprint.steps - An array of blueprint steps.
 * @param {object} blueprint.acceptance - Acceptance criteria for the blueprint.
 * @param {Array<string>} blueprint.dependencies - An array of dependency identifiers.
 * @param {Array<string>} blueprint.risk_notes - An array of risk notes.
 * @param {object} context - Additional context (currently unused).
 * @returns {{quality_score: number, dimensions: {completeness: number, testability: number, traceability: number, simplicity: number, risk_awareness: number}, recommendations: string[]}} The quality score and dimensions.
 */
function scoreBlueprint(blueprint, context = {}) {
  let completeness = 0;
  let testability = 0;
  let traceability = 0;
  let simplicity = 0;
  let risk_awareness = 0;
  const recommendations = [];

  // Completeness: all steps have acceptance criteria
  const stepsWithAcceptance = blueprint.steps.filter(step => step.acceptance && Object.keys(step.acceptance).length > 0);
  completeness = blueprint.steps.length > 0 ? stepsWithAcceptance.length / blueprint.steps.length : 0;
  if (completeness < 1 && blueprint.steps.length > 0) {
    recommendations.push("Ensure all blueprint steps have defined acceptance criteria.");
  }

  // Testability: each step has acceptance (covered by completeness for this version)
  // In a future iteration, this might involve checking for specific types of acceptance criteria that are testable.
  testability = completeness;
  if (testability < 1 && blueprint.steps.length > 0) {
    recommendations.push("Enhance the testability of blueprint steps by refining acceptance criteria.");
  }

  // Traceability: dependencies are mentioned in risk_notes or steps (simplified for this version)
  const allMentions = JSON.stringify(blueprint.risk_notes) + JSON.stringify(blueprint.steps);
  const missingDependencies = blueprint.dependencies.filter(dep => !allMentions.includes(dep));
  traceability = blueprint.dependencies.length > 0 ? (blueprint.dependencies.length - missingDependencies.length) / blueprint.dependencies.length : 1;
  if (traceability < 1 && blueprint.dependencies.length > 0) {
    recommendations.push("Ensure all declared dependencies are explicitly mentioned within the blueprint steps or risk notes.");
  }

  // Simplicity: fewer than 50 steps preferred
  simplicity = blueprint.steps.length <= 50 ? 1 : Math.max(0, 1 - (blueprint.steps.length - 50) / 50); // Linear decay after 50 steps
  if (blueprint.steps.length > 50) {
    recommendations.push("Consider breaking down the blueprint into smaller, more manageable sub-blueprints to improve simplicity.");
  }

  // Risk Awareness: risk_notes are present
  risk_awareness = blueprint.risk_notes && blueprint.risk_notes.length > 0 ? 1 : 0;
  if (risk_awareness === 0) {
    recommendations.push("Add detailed risk notes to address potential issues during execution.");
  }

  const dimensions = { completeness, testability, traceability, simplicity, risk_awareness };
  const quality_score = Object.values(dimensions).reduce((sum, val) => sum + val, 0) / Object.keys(dimensions).length;

  return { quality_score, dimensions, recommendations };
}

/**
 * Compares the quality of two blueprints (before and after execution).
 * @param {object} before - The blueprint object before execution.
 * @param {object} after - The blueprint object after execution.
 * @returns {{quality_delta: number, improved_dimensions: string[], regressed_dimensions: string[]}} The quality delta and dimension changes.
 */
function compareBlueprints(before, after) {
  const scoreBefore = scoreBlueprint(before);
  const scoreAfter = scoreBlueprint(after);

  const quality_delta = scoreAfter.quality_score - scoreBefore.quality_score;
  const improved_dimensions = [];
  const regressed_dimensions = [];

  for (const dim in scoreBefore.dimensions) {
    if (scoreAfter.dimensions[dim] > scoreBefore.dimensions[dim]) {
      improved_dimensions.push(dim);
    } else if (scoreAfter.dimensions[dim] < scoreBefore.dimensions[dim]) {
      regressed_dimensions.push(dim);
    }
  }

  return { quality_delta, improved_dimensions, regressed_dimensions };
}

/**
 * Provides concrete improvement recommendations based on a blueprint score.
 * @param {{quality_score: number, dimensions: {completeness: number, testability: number, traceability: number, simplicity: number, risk_awareness: number}, recommendations: string[]}} score - The result from scoreBlueprint.
 * @returns {string[]} An array of recommendation strings.
 */
function recommendImprovements(score) {
  const recommendations = [...score.recommendations]; // Start with recommendations from scoring

  if (score.dimensions.completeness < 0.8 && !recommendations.includes("Ensure all blueprint steps have defined acceptance criteria.")) {
    recommendations.push("Review and complete missing acceptance criteria for blueprint steps.");
  }
  if (score.dimensions.testability < 0.8 && !recommendations.includes("Enhance the testability of blueprint steps by refining acceptance criteria.")) {
    recommendations.push("Refine acceptance criteria to be more specific and measurable, improving testability.");
  }
  if (score.dimensions.traceability < 0.8 && !recommendations.includes("Ensure all declared dependencies are explicitly mentioned within the blueprint steps or risk notes.")) {
    recommendations.push("Explicitly document the usage or impact of all dependencies within the blueprint content.");
  }
  if (score.dimensions.simplicity < 0.8 && !recommendations.includes("Consider breaking down the blueprint into smaller, more manageable sub-blueprints to improve simplicity.")) {
    recommendations.push("Evaluate opportunities to modularize complex blueprints into simpler, focused units.");
  }
  if (score.dimensions.risk_awareness < 1 && !recommendations.includes("Add detailed risk notes to address potential issues during execution.")) {
    recommendations.push("Conduct a thorough risk assessment and document all identified risks and mitigation strategies.");
  }

  // Remove duplicates
  return Array.from(new Set(recommendations));
}

/**
 * Returns the expected blueprint schema object.
 * @returns {object} The blueprint schema.
 */
function getDefaultBlueprintSchema() {
  return {
    steps: [
      {
        id: "string",
        description: "string",
        acceptance: {
          criteria: "string",
          expected_outcome: "string"
        }
      }
    ],
    acceptance: {
      overall_goal: "string",
      success_conditions: ["string"]
    },
    dependencies: ["string"],
    risk_notes: ["string"]
  };
}

export {
  scoreBlueprint,
  compareBlueprints,
  recommendImprovements,
  getDefaultBlueprintSchema,
  version
};