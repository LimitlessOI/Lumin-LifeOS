/**
 * SYNOPSIS: Exports captureSessionReplay — services/sessionReplay.js.
 */
let sessionReplayEnabled = false;

export function captureSessionReplay(userId) {
  if (!sessionReplayEnabled) {
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
