/**
 * SYNOPSIS: Existing code and imports
 */
// Existing code and imports
export function getIncomePriorities(tasks) {
  return tasks.filter(task => task.money_impact > 0);
}
