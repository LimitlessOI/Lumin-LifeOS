/**
 * SYNOPSIS: Exports optionalCleanup — services/optionalBoldTrailContactCleanupService.js.
 */
export async function optionalCleanup(cleanupFn, shouldCleanup = true) {
  if (!shouldCleanup || typeof cleanupFn !== 'function') {
    return { cleaned: false, reason: !shouldCleanup ? 'cleanup skipped by config' : 'no cleanup function provided' };
  }

  try {
    const result = await cleanupFn();
    return { cleaned: true, result };
  } catch (error) {
    return { cleaned: false, error: error.message || 'cleanup failed' };
  }
}