/**
 * SYNOPSIS: Exports getMetaScore — services/meta-learning-system.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export const version = "2026-08-02";

/**
 * Computes the meta-score for a given experiment.
 * The meta-score is calculated as reality_alignment / (1 + cost).
 * @param {object} experiment - The experiment object.
 * @param {object} experiment.outcome - The outcome of the experiment.
 * @param {number} experiment.outcome.reality_alignment - A number between 0 and 1 indicating alignment with reality.
 * @param {number} experiment.outcome.cost - The cost associated with the experiment.
 * @returns {number} The computed meta-score.
 */
export function getMetaScore(experiment) {
  if (!experiment || !experiment.outcome) {
    return 0;
  }
  const { reality_alignment, cost } = experiment.outcome;
  return reality_alignment / (1 + cost);
}

/**
 * Records an experiment, adding a timestamp and computing its meta-score.
 * @param {object} experiment - The experiment to record.
 * @param {string} experiment.model - The model used in the experiment.
 * @param {string} experiment.prompt_id - The ID of the prompt used.
 * @param {string} experiment.workflow - The workflow executed.
 * @param {object} experiment.outcome - The outcome of the experiment.
 * @param {number} experiment.outcome.reality_alignment - A number between 0 and 1 indicating alignment with reality.
 * @param {number} experiment.outcome.cost - The cost associated with the experiment.
 * @returns {object} The recorded experiment with `recorded_at` and `meta_score`.
 */
export function recordExperiment(experiment) {
  const recordedExperiment = { ...experiment };
  recordedExperiment.recorded_at = new Date().toISOString();
  recordedExperiment.meta_score = getMetaScore(recordedExperiment);
  return recordedExperiment;
}

/**
 * Ranks approaches based on their average meta-score from a history of experiments.
 * @param {Array<object>} history - An array of recorded experiment objects.
 * @returns {object} An object containing rankings, the best approach, and the worst approach.
 */
export function rankApproaches(history = []) {
  const groupedScores = new Map(); // Key: `${model}-${prompt_id}-${workflow}`, Value: { totalScore: number, count: number }

  for (const experiment of history) {
    const { model, prompt_id, workflow, meta_score } = experiment;
    const key = `${model}-${prompt_id}-${workflow}`;

    if (!groupedScores.has(key)) {
      groupedScores.set(key, { totalScore: 0, count: 0 });
    }
    const current = groupedScores.get(key);
    current.totalScore += meta_score;
    current.count += 1;
  }

  const rankings = [];
  for (const [key, { totalScore, count }] of groupedScores.entries()) {
    const [model, prompt_id, workflow] = key.split('-');
    const average_meta_score = totalScore / count;
    rankings.push({ model, prompt_id, workflow, average_meta_score });
  }

  rankings.sort((a, b) => b.average_meta_score - a.average_meta_score);

  const best = rankings.length > 0 ? rankings[0] : null;
  const worst = rankings.length > 0 ? rankings[rankings.length - 1] : null;

  return { rankings, best, worst };
}

/**
 * Recommends a configuration (model, prompt_id, workflow) based on historical performance and constraints.
 * @param {Array<object>} history - An array of recorded experiment objects.
 * @param {object} constraints - An object specifying constraints for the recommendation (e.g., {model: 'gpt-4'}).
 * @returns {object} An object containing the recommended configuration, confidence, and rationale.
 */
export function recommendConfig(history = [], constraints = {}) {
  const { rankings } = rankApproaches(history);

  let recommended = null;
  let confidence = 0;
  let rationale = "No suitable configuration found based on history and constraints.";

  const filteredRankings = rankings.filter(item => {
    for (const key in constraints) {
      if (item[key] !== constraints[key]) {
        return false;
      }
    }
    return true;
  });

  if (filteredRankings.length > 0) {
    recommended = {
      model: filteredRankings[0].model,
      prompt_id: filteredRankings[0].prompt_id,
      workflow: filteredRankings[0].workflow,
    };
    confidence = filteredRankings[0].average_meta_score; // Using average_meta_score as a simple confidence measure
    rationale = `Recommended based on highest average meta-score (${confidence.toFixed(4)}) among matching configurations.`;
  }

  return { recommended, confidence, rationale };
}