/**
 * SYNOPSIS: Exports addSprintToQueue — services/sprintQueueService.js.
 */
let sprintQueue = [];

export function addSprintToQueue(sprint) {
  sprintQueue.push(sprint);
  // Additional logic for scheduling or prioritizing could go here
  return { success: true, message: `Sprint ${sprint.id} added to queue.` };
}

export function removeSprintFromQueue(sprintId) {
  const initialLength = sprintQueue.length;
  sprintQueue = sprintQueue.filter(sprint => sprint.id !== sprintId);
  if (sprintQueue.length < initialLength) {
    return { success: true, message: `Sprint ${sprintId} removed from queue.` };
  } else {
    return { success: false, message: `Sprint ${sprintId} not found in queue.` };
  }
}