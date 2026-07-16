/**
 * SYNOPSIS: Exports captureSessionReplay — services/sessionReplay.js.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
let sessionReplayEnabled = false;
const userSessionReplayMap = new Map();
const adminSessionReplayMap = new Map();

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

export function recordSessionReplay(adminId, userId) {
  if (!sessionReplayEnabled || !adminSessionReplayMap.get(adminId)) {
    console.log(`Admin session replay is not enabled or admin not authorized.`);
    return;
  }
  // Logic to allow admin to view session replay for the given userId
  console.log(`Admin ${adminId} is viewing session replay for user: ${userId}`);
}

export function startAdminSessionReplay(adminId) {
  if (!sessionReplayEnabled) {
    console.log(`Session replay is not globally enabled.`);
    return;
  }
  adminSessionReplayMap.set(adminId, true);
  console.log(`Admin session replay started for admin: ${adminId}`);
}

export function stopAdminSessionReplay(adminId) {
  adminSessionReplayMap.set(adminId, false);
  console.log(`Admin session replay stopped for admin: ${adminId}`);
}
