/**
 * SYNOPSIS: Exports captureSessionReplay — services/sessionReplay.js.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
let sessionReplayEnabled = false;
const userSessionReplayMap = new Map();

export function captureSessionReplay(userId) {
  if (!sessionReplayEnabled || !userSessionReplayMap.get(userId)) {
    return;
  }
  // Logic to capture session replay for the given userId
  console.log(`Capturing session replay for user: ${userId}`);
}

export function enableSessionReplay() {
  sessionReplayEnabled = true;
}

export function disableSessionReplay() {
  sessionReplayEnabled = false;
}

export function startSessionReplay(userId) {
  if (!sessionReplayEnabled) {
    console.log(`Session replay is not globally enabled.`);
    return;
  }
  userSessionReplayMap.set(userId, true);
  console.log(`Session replay started for user: ${userId}`);
}

export function stopSessionReplay(userId) {
  userSessionReplayMap.set(userId, false);
  console.log(`Session replay stopped for user: ${userId}`);
}
