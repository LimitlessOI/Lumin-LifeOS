/**
 * SYNOPSIS: TaskOrchestrator role per blueprint §14a — the one authoritative
 * task-state owner; all Bodies/workers/receipts reference the same task_id.
 * Real implementation, real wiring: dispatchTask() actually calls
 * StrategyRouter -> BodyAdapter -> VerificationService -> ReceiptLedger in
 * sequence, each a real function call with real return values threading
 * into the next stage. Previously every method here returned a hardcoded
 * mock object regardless of input and never called any other service —
 * confirmed live 2026-08-19 via zero cross-imports among all 8 "heart and
 * soul" components. This file is the fix for that specific finding.
 *
 * State machine is the real (coarser) one honestly documented in the
 * blueprint §14b as today's actual shape, not the full RECEIVED->...->
 * VERIFIED_SUCCESS machine, which needs the RECOVERING/AUTHORITY_RESOLVED
 * states this pass doesn't add: pending -> executing -> verified | failed.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

let taskCounter = 0;
function nextTaskId() {
  taskCounter += 1;
  return `task-${Date.now()}-${taskCounter}`;
}

export function createTaskOrchestratorService({ store, logger, strategyRouter, bodyAdapter, verificationService, receiptLedger }) {
  for (const [name, dep] of Object.entries({ store, logger, strategyRouter, bodyAdapter, verificationService, receiptLedger })) {
    if (!dep) throw new Error(`createTaskOrchestratorService: Missing required dependency: ${name}`);
  }

  return {
    async createTask(taskDetails) {
      const task = {
        id: nextTaskId(),
        ...taskDetails,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      store.createTask(task);
      logger.info('Task created', { taskId: task.id });
      return task;
    },

    /**
     * The real, wired pipeline. Every stage is a genuine call into another
     * of the 8 components — this is what "the islands are connected" means
     * concretely, not a claim about it.
     */
    async dispatchTask(taskId, action, { expected = null, agentId = 'taloa' } = {}) {
      const task = store.getTask(taskId);
      if (!task) return { ok: false, stage: 'lookup', reason: `unknown task_id: ${taskId}` };

      store.updateTask(taskId, { status: 'executing' });

      const routed = await strategyRouter.selectMethod({ taskId, agentId, action });
      if (!routed.ok) {
        store.updateTask(taskId, { status: 'failed' });
        await receiptLedger.recordReceipt({ task_id: taskId, type: 'dispatch_failed', stage: 'strategy_router', detail: routed });
        return { ok: false, stage: 'strategy_router', ...routed };
      }

      const actionResult = await bodyAdapter.act(action);
      if (!actionResult.ok) {
        store.updateTask(taskId, { status: 'failed' });
        await receiptLedger.recordReceipt({ task_id: taskId, type: 'dispatch_failed', stage: 'body_adapter', detail: actionResult });
        return { ok: false, stage: 'body_adapter', ...actionResult };
      }

      const verification = await verificationService.verifyActionResult({ taskId, action, actionResult, expected });
      store.updateTask(taskId, { status: verification.ok ? 'verified' : 'failed' });
      await receiptLedger.recordReceipt({
        task_id: taskId,
        type: 'dispatch_complete',
        method: routed.method,
        action_result: actionResult,
        verification,
      });

      return { ok: verification.ok, stage: 'complete', method: routed.method, actionResult, verification };
    },

    async getTaskStatus(taskId) {
      return store.getTask(taskId);
    },
  };
}

export default createTaskOrchestratorService;
