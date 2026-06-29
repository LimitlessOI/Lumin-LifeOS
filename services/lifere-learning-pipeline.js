/**
 * SYNOPSIS: LifeRE learning pipeline — experiment → best practice → strategy evolution.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { createLifeREExperimentEngine } from './lifere-experiment-engine.js';
import { createLifeREBestPracticeEngine } from './lifere-best-practice-engine.js';
import { createLifeREStrategyEvolutionEngine } from './lifere-strategy-evolution-engine.js';
import { createLifeREPermissionTwin } from './lifere-permission-twin.js';

export function createLifeRELearningPipeline({ pool = null } = {}) {
  const experiment = createLifeREExperimentEngine({ pool });
  const bestPractice = createLifeREBestPracticeEngine();
  const strategy = createLifeREStrategyEvolutionEngine();
  const permission = createLifeREPermissionTwin({ pool });

  async function runLearningCycle({
    tenantId = 'default',
    userId = 'adam',
    variantA,
    variantB,
    metric,
    winner,
    weightDelta = {},
  }) {
    const started = await experiment.startExperiment({
      tenantId,
      userId,
      variantA,
      variantB,
      metric,
    });

    const result = {
      winner,
      variant_a: variantA,
      variant_b: variantB,
      metric,
      completed_at: new Date().toISOString(),
    };

    await experiment.recordResult({
      tenantId,
      userId,
      experimentId: started.experiment_id,
      result,
    });

    const promoted = bestPractice.promoteWinner({
      experimentId: started.experiment_id,
      winnerVariant: winner,
    });

    const { level } = await permission.getAutonomyLevel({ userId, actionType: 'learning_weight_update' });
    let weights = null;
    if (level >= 4) {
      weights = await strategy.updateWeights({ delta: weightDelta, userId });
    }

    return {
      ok: true,
      experiment_id: started.experiment_id,
      promoted,
      weights,
      autonomy_level: level,
      label: 'THINK',
    };
  }

  async function status() {
    const playbook = bestPractice.listPlaybook();
    const weights = strategy.getWeights();
    return { ok: true, playbook, weights };
  }

  return { runLearningCycle, status };
}
