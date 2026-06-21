/**
 * SYNOPSIS: Exports summarizeBuilderEvidence — services/builderos-live-enforcement-pass.js.
 */
export function summarizeBuilderEvidence({ build, proof, queue }) {
  const hasBuild = !!build;
  const hasProof = !!proof;
  const hasQueue = !!queue;

  const presentItems = [];
  if (hasBuild) {
    presentItems.push('build');
  }
  if (hasProof) {
    presentItems.push('proof');
  }
  if (hasQueue) {
    presentItems.push('queue');
  }

  let summary;
  if (presentItems.length === 3) {
    summary = 'Build, proof, and queue evidence are all present.';
  } else if (presentItems.length === 0) {
    summary = 'No build, proof, or queue evidence found.';
  } else {
    const presentString = presentItems.join(', ');
    const allPossibleItems = ['build', 'proof', 'queue'];
    const missingItems = allPossibleItems.filter(item => !presentItems.includes(item));
    const missingString = missingItems.join(', ');
    summary = `${presentString} evidence present; ${missingString} evidence missing.`;
  }

  return {
    hasBuild,
    hasProof,
    hasQueue,
    summary,
  };
}