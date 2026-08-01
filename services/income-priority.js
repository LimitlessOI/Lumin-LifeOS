/**
 * SYNOPSIS: Calculate income priorities by fetching relevant data from the database.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
export async function calculateIncomePriorities(deps, payload) {
  const { pool, logger } = deps;
  const { userId } = payload || {}; // Assuming payload might contain a user ID for filtering
  try {
    // Fetch income sources and potentially lifeos priorities to determine income priorities
    // This example fetches all income sources; a more complex logic would involve
    // joining with lifeos_priorities or other tables to rank/filter.
    const { rows: incomeSources } = await pool.query(
      'SELECT id, owner_id, name, amount, frequency FROM income_sources WHERE owner_id = $1 ORDER BY amount DESC',
      [userId]
    );

    // For the purpose of this task, we'll consider income sources as the primary driver for "income priorities".
    // A more sophisticated system might integrate with tasks, projects, or other metrics.
    // The existing getIncomePriorities function is not directly used here as it operates on a 'tasks' array
    // with a 'money_impact' property, which is not directly available from the database tables provided.
    // Instead, we are fetching raw income sources and can imply priorities based on amount or frequency.

    // If the goal is to integrate with the existing `getIncomePriorities` function,
    // the database query would need to fetch data that maps to the `tasks` structure
    // expected by that function (e.g., tasks with a `money_impact` field).
    // Given the current DB schema and task, we're focusing on income sources.

    const incomePriorities = incomeSources.map(source => ({
      id: source.id,
      name: source.name,
      amount: source.amount,
      frequency: source.frequency,
      // A simple priority score could be derived from the amount.
      // More complex logic would consider frequency, reliability, etc.
      priorityScore: source.amount,
    }));

    // Sort by priorityScore in descending order
    incomePriorities.sort((a, b) => b.priorityScore - a.priorityScore);

    return incomePriorities;
  } catch (error) {
    logger.error({ error, payload }, 'Error in calculateIncomePriorities');
    throw new Error('Failed to calculate income priorities');
  }
}

// The existing getIncomePriorities function is kept as per the instruction
// to extend what is there, although it's not directly used by the new `calculateIncomePriorities`
// due to differing data structures.
export function getIncomePriorities(tasks) {
  return tasks.filter(task => task.money_impact > 0);
}