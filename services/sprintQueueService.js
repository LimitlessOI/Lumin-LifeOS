/**
 * SYNOPSIS: Existing file content preserved
 */
// Existing file content preserved

const sprintQueue = [];

export function addSprintToQueue(sprint) {
    sprintQueue.push(sprint);
}

export function removeSprintFromQueue(sprintId) {
    const index = sprintQueue.findIndex(sprint => sprint.id === sprintId);
    if (index !== -1) {
        sprintQueue.splice(index, 1);
    }
}

// Optionally, you can add more functions to manage the queue if needed

export { sprintQueue };
