/**
 * SYNOPSIS: scripts/autonomy/builder-batching.mjs — concurrency-safe batch planner for the builder supervisor.
 *
 * Groups pending segments into batches of at most `maxConcurrent`, guaranteeing
 * that no two segments in the same batch declare overlapping `allowed_files`.
 * Each lane runs in its own git worktree, but two lanes editing the same file
 * still race at merge/PR time — planning batches by file-scope removes that
 * class of cross-lane conflict before any agent runs. Pure + deterministic so
 * it is unit-testable in isolation from the supervisor's side effects.
 *
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */

/**
 * @param {Array<{allowed_files?: string[]}>} segments  pending segments, in priority order
 * @param {number} maxConcurrent                        max lanes per batch
 * @returns {Array<Array>} batches; concatenating them preserves every input segment exactly once
 */
export function planBatches(segments = [], maxConcurrent = 3) {
  const cap = Math.max(1, Number(maxConcurrent) || 1);
  const remaining = [...segments];
  const batches = [];

  while (remaining.length) {
    const batch = [];
    const claimed = new Set();

    for (let i = 0; i < remaining.length && batch.length < cap; ) {
      const files = remaining[i].allowed_files || [];
      const overlaps = files.some((f) => claimed.has(f));
      if (overlaps) { i += 1; continue; }
      for (const f of files) claimed.add(f);
      batch.push(remaining[i]);
      remaining.splice(i, 1);
    }

    // Defensive: if nothing could be placed (shouldn't happen — empty file
    // scopes never overlap), take one to guarantee forward progress.
    if (batch.length === 0) batch.push(remaining.shift());
    batches.push(batch);
  }

  return batches;
}
