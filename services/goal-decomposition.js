/**
 * SYNOPSIS: Break a mission into sub-goals and track dependencies.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export function decomposeGoal({ id, title, description, steps = [], dependencies = [] }) {
  const subGoals = steps.map((step, idx) => ({
    id: `${id}-step-${idx + 1}`,
    title: typeof step === 'string' ? step : step.title,
    description: typeof step === 'string' ? '' : step.description,
    status: 'pending',
    depends_on: (typeof step === 'string' ? [] : step.depends_on) || [],
  }));

  return {
    id,
    title,
    description,
    status: 'pending',
    sub_goals: subGoals,
    dependencies,
    ready_sub_goals: subGoals.filter((s) => s.depends_on.length === 0),
    blocked_sub_goals: subGoals.filter((s) => s.depends_on.length > 0),
  };
}

export function nextReadySubGoal(goal) {
  return goal?.sub_goals?.find((s) => s.status === 'pending' && s.depends_on.every((d) => {
    const dep = goal.sub_goals.find((x) => x.id === d || x.title === d);
    return dep?.status === 'done';
  }));
}

export function markSubGoalDone(goal, subGoalId) {
  const next = { ...goal, sub_goals: goal.sub_goals.map((s) => ({ ...s })) };
  const target = next.sub_goals.find((s) => s.id === subGoalId || s.title === subGoalId);
  if (target) target.status = 'done';
  if (next.sub_goals.every((s) => s.status === 'done')) next.status = 'done';
  return next;
}
