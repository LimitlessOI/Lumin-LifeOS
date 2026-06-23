/**
 * SYNOPSIS: LifeRE model router — CFO cheap-model-first ladder.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */

export function pickModel({ taskComplexity = 'low', costSensitive = true }) {
  if (costSensitive && taskComplexity === 'low') {
    return { model: 'gemini-2.0-flash', tier: 'cheap', reason: 'CFO ladder: cheap capable first' };
  }
  if (taskComplexity === 'high') {
    return { model: 'claude-sonnet', tier: 'quality', reason: 'Complex deliberation escalated' };
  }
  return { model: 'gemini-2.0-flash', tier: 'cheap', reason: 'default' };
}

export function createLifeREModelRouter() {
  return { pickModel };
}
