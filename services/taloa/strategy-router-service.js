/**
 * SYNOPSIS: Determines the appropriate strategy for task execution based on a 5-gate deterministic algorithm.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 * Determines the appropriate strategy for task execution based on a 5-gate deterministic algorithm.
 */

export function createStrategyRouterService({ pool, logger, authorityLedger, taskOrchestrator }) {
  if (!pool) {
    throw new Error('createStrategyRouterService: Missing required dependency: pool');
  }
  if (!logger) {
    throw new Error('createStrategyRouterService: Missing required dependency: logger');
  }
  if (!authorityLedger) {
    throw new Error('createStrategyRouterService: Missing required dependency: authorityLedger');
  }
  if (!taskOrchestrator) {
    throw new Error('createStrategyRouterService: Missing required dependency: taskOrchestrator');
  }

  const StrategyRouterService = {
    /**
     * Determines the appropriate strategy for task execution based on a 5-gate deterministic algorithm.
     * @param {object} task - The task object to determine the strategy for.
     * @returns {Promise<object>} A promise that resolves to an object containing the determined strategy.
     */
    async determineStrategy(task) {
      logger.info('Determining strategy for task', { taskId: task.id });

      // Gate 1: Check for explicit strategy in task metadata
      if (task.metadata && task.metadata.strategy) {
        logger.debug('Strategy found in task metadata', { strategy: task.metadata.strategy });
        return { strategy: task.metadata.strategy, reason: 'explicit_task_metadata' };
      }

      // Gate 2: Check Authority Ledger for pre-configured strategy based on task type
      const ledgerStrategy = await authorityLedger.getStrategyForTaskType(task.type);
      if (ledgerStrategy) {
        logger.debug('Strategy found in Authority Ledger', { strategy: ledgerStrategy });
        return { strategy: ledgerStrategy, reason: 'authority_ledger_task_type' };
      }

      // Gate 3: Check Task Orchestrator for available worker capacity for specific task attributes
      const availableCapacityStrategy = await taskOrchestrator.getStrategyBasedOnCapacity(task.attributes);
      if (availableCapacityStrategy) {
        logger.debug('Strategy determined by Task Orchestrator capacity', { strategy: availableCapacityStrategy });
        return { strategy: availableCapacityStrategy, reason: 'task_orchestrator_capacity' };
      }

      // Gate 4: Default strategy based on task priority
      if (task.priority === 'HIGH') {
        logger.debug('Defaulting to high priority strategy');
        return { strategy: 'HIGH_PRIORITY_QUEUE', reason: 'default_high_priority' };
      }

      // Gate 5: Fallback to a generic default strategy
      logger.debug('Defaulting to generic strategy');
      return { strategy: 'GENERIC_QUEUE', reason: 'default_fallback' };
    },
  };

  return StrategyRouterService;
}