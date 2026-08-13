/**
 * SYNOPSIS: Android Universal Body adapter — observe/act/verify for the Android body.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 * Android Universal Body adapter — observe/act/verify for the Android body.
 * Overlay print §64 item 3.
 */

/**
 * Create the Android Universal Body adapter.
 * @param {object} deps - Injected dependencies.
 * @param {Function} deps.dumpVisibleText - Dumps visible text from the Android body.
 * @param {Function} deps.enqueueCommand - Enqueues a command to the Android body.
 * @param {Function} deps.redactObservation - Redacts sensitive content from observed text.
 * @returns {{ observe: Function, act: Function, verify: Function }} The adapter API.
 */
export function createAndroidBodyAdapter(deps) {
  const { dumpVisibleText, enqueueCommand, redactObservation } = deps;

  /**
   * Observe the current visible state of the Android body.
   * @param {object} scope - The observation scope.
   * @returns {Promise<object>} The redacted observation result.
   */
  async function observe(scope) {
    const rawText = await dumpVisibleText(scope);
    return redactObservation(rawText);
  }

  /**
   * Act on the Android body by enqueuing a command.
   * @param {object} action - The action to perform.
   * @returns {Promise<*>} The result of enqueuing the command.
   */
  async function act(action) {
    return enqueueCommand(action);
  }

  /**
   * Verify a goal against independent evidence from a fresh observation.
   * @param {object} goal - The goal to verify.
   * @param {*} expected - The expected evidence.
   * @returns {Promise<boolean>} Whether the goal is satisfied.
   */
  async function verify(goal, expected) {
    const evidence = await observe(goal);
    return evidence === expected;
  }

  return { observe, act, verify };
}