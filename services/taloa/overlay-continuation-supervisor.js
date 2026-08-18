/**
 * SYNOPSIS: TALOA-A2Z-007 -- composes the observation engine, target
 * selector, action router, result verifier, ChatGPT adapter, and runtime
 * truth into the OBSERVE -> SELECT -> ACT -> VERIFY -> UPDATE_CONTEXT ->
 * CONTINUE loop. Terminal states are exactly POINT_B_REACHED,
 * FOUNDER_DECISION_REQUIRED, HARD_CAPABILITY_BLOCKER, BLUEPRINT_EXHAUSTED --
 * idle is never reported as success while Point B is false.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

const MAX_DUPLICATE_ACTIONS = 2;

function actionSignature(action) {
  if (!action) return null;
  return `${action.type}:${action.target?.selector || ''}:${String(action.value || '').slice(0, 40)}`;
}

export function createOverlayContinuationSupervisor({
  observationEngine,
  targetSelector,
  actionRouter,
  resultVerifier,
  chatGptAdapter,
  runtimeTruth,
} = {}) {
  for (const [name, dep] of Object.entries({ observationEngine, targetSelector, actionRouter, resultVerifier, chatGptAdapter, runtimeTruth })) {
    if (!dep) throw new Error(`createOverlayContinuationSupervisor requires ${name}`);
  }

  let lastActionSig = null;
  let duplicateCount = 0;
  const receipts = [];

  function recordReceipt(entry) {
    const receipt = { id: `ovl-${Date.now()}-${receipts.length}`, at: new Date().toISOString(), ...entry };
    receipts.push(receipt);
    runtimeTruth.addReceipt(receipt.id);
    return receipt;
  }

  /**
   * Runs one full cycle. `getSnapshot` fetches a fresh raw snapshot;
   * `adapters` are the action-router's control-tree implementations
   * (dom/browser/app/visual/keyboard); `intent` carries what this turn is
   * trying to accomplish (e.g. { messageText } for TURN_COMPLETE).
   */
  async function runCycle({ getSnapshot, adapters, intent = {}, acceptance = null, authorized = false } = {}) {
    runtimeTruth.heartbeat();

    if (typeof getSnapshot !== 'function') {
      const blocker = { type: 'BLUEPRINT_EXHAUSTED', reason: 'no_snapshot_source_provided' };
      runtimeTruth.setBlocker(blocker);
      return { state: 'BLUEPRINT_EXHAUSTED', blocker };
    }

    // OBSERVE
    const beforeSnapshot = await getSnapshot();
    const beforeObservation = observationEngine.observe(beforeSnapshot);
    runtimeTruth.setObservation(beforeObservation);

    // SELECT (via the ChatGPT adapter, which itself calls the generic selector)
    const decision = chatGptAdapter.nextAction(beforeSnapshot, intent);
    runtimeTruth.setTask({ intent, decision_state: decision.classified?.state || null });

    if (!decision.ok) {
      if (decision.blocker === 'FOUNDER_DECISION_REQUIRED') {
        runtimeTruth.setBlocker({ type: 'FOUNDER_DECISION_REQUIRED', reason: decision.reason });
        recordReceipt({ phase: 'SELECT', outcome: 'FOUNDER_DECISION_REQUIRED', reason: decision.reason });
        return { state: 'FOUNDER_DECISION_REQUIRED', reason: decision.reason, observation: beforeObservation };
      }
      runtimeTruth.setBlocker({ type: 'HARD_CAPABILITY_BLOCKER', reason: decision.reason });
      recordReceipt({ phase: 'SELECT', outcome: 'HARD_CAPABILITY_BLOCKER', reason: decision.reason });
      return { state: 'HARD_CAPABILITY_BLOCKER', reason: decision.reason, observation: beforeObservation };
    }

    if (decision.action.type === 'wait') {
      recordReceipt({ phase: 'ACT', outcome: 'waiting', reason: 'chatgpt_still_working' });
      return { state: 'CONTINUE', reason: 'waiting_on_generation', observation: beforeObservation };
    }

    // Duplicate/no-progress guard -- the exact stuck-loop failure class
    // found live: re-clicking the same stale target forever.
    const sig = actionSignature(decision.action);
    duplicateCount = sig && sig === lastActionSig ? duplicateCount + 1 : 0;
    lastActionSig = sig;
    if (duplicateCount >= MAX_DUPLICATE_ACTIONS) {
      const blocker = { type: 'HARD_CAPABILITY_BLOCKER', reason: 'duplicate_action_with_no_progress', evidence: { signature: sig } };
      runtimeTruth.setBlocker(blocker);
      recordReceipt({ phase: 'ACT', outcome: 'HARD_CAPABILITY_BLOCKER', reason: blocker.reason });
      return { state: 'HARD_CAPABILITY_BLOCKER', ...blocker, observation: beforeObservation };
    }

    // ACT
    const planned = actionRouter.plan(decision.action, decision.action.target, { authorized });
    if (!planned.ok) {
      recordReceipt({ phase: 'ACT', outcome: 'plan_rejected', reason: planned.error });
      return { state: 'HARD_CAPABILITY_BLOCKER', reason: planned.error, observation: beforeObservation };
    }
    const executed = await actionRouter.execute(planned, adapters || {});
    runtimeTruth.setAction({ plan: planned.plan, executed_ok: executed.ok, tree: executed.tree });
    recordReceipt({ phase: 'ACT', outcome: executed.ok ? 'executed' : 'failed', tree: executed.tree, error: executed.error || null });

    if (!executed.ok) {
      const blocker = { type: 'HARD_CAPABILITY_BLOCKER', reason: executed.error, evidence: { attempts: executed.attempts } };
      runtimeTruth.setBlocker(blocker);
      return { state: 'HARD_CAPABILITY_BLOCKER', ...blocker, observation: beforeObservation };
    }

    // VERIFY
    const afterSnapshot = await getSnapshot();
    const afterObservation = observationEngine.observe(afterSnapshot);
    const verdict = resultVerifier.verify({ before: beforeObservation, plan: planned.plan, after: afterObservation, acceptance });
    runtimeTruth.setVerifiedResult(verdict);
    recordReceipt({ phase: 'VERIFY', outcome: verdict.status, reason: verdict.reason || null });

    // UPDATE_CONTEXT
    runtimeTruth.setObservation(afterObservation);

    // CONTINUE / terminal
    if (verdict.status === 'VERIFIED') {
      lastActionSig = null;
      duplicateCount = 0;
      if (acceptance?.pointB === true) {
        return { state: 'POINT_B_REACHED', observation: afterObservation, receipts: receipts.slice(-5) };
      }
      return { state: 'CONTINUE', reason: 'verified_advancing', observation: afterObservation };
    }
    if (verdict.status === 'RETRY_BOUNDED') {
      return { state: 'CONTINUE', reason: 'retry_bounded', observation: afterObservation };
    }
    const blocker = { type: 'HARD_CAPABILITY_BLOCKER', reason: verdict.reason };
    runtimeTruth.setBlocker(blocker);
    return { state: 'HARD_CAPABILITY_BLOCKER', ...blocker, observation: afterObservation };
  }

  function getReceipts() {
    return receipts.slice();
  }

  return { runCycle, getReceipts };
}

export default { createOverlayContinuationSupervisor };
