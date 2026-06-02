import { randomUUID } from 'node:crypto';

export class CommandCenter {
  #taskQueue = []; // Stores tasks that are pending or running
  #tasks = new Map(); // Stores all tasks by ID for status lookup
  #isRunning = false;

  constructor() {
    // #taskQueue and #tasks Map are initialized above.
  }

  /**
   * Submits a new task to the command center.
   * @param {object} taskPayload - The payload for the task.
   * @returns {string} The unique ID of the submitted task.
   */
  submitTask(taskPayload) {
    const taskId = randomUUID();
    const task = {
      id: taskId,
      payload: taskPayload,
      status: 'pending',
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      error: null,
    };
    this.#tasks.set(taskId, task);
    this.#taskQueue.push(task); // Add to queue for processing
    return taskId;
  }

  /**
   * Retrieves the current status of a task by its ID.
   * @param {string} taskId - The ID of the task.
   * @returns {object | null} An object containing task details (id, status, payload) or null if not found.
   */
  getTaskStatus(taskId) {
    const task = this.#tasks.get(taskId);
    if (!task) {
      return null;
    }
    // Return a copy to prevent external modification of internal state
    return { ...task };
  }

  /**
   * Initiates a mock asynchronous processing loop.
   */
  start() {
    if (this.#isRunning) {
      return; // Already running
    }
    this.#isRunning = true;
    // console.log('CommandCenter: Starting mock processing loop...');

    // Use a recursive setTimeout to simulate async processing without blocking
    const processNextTask = async () => {
      if (!this.#isRunning) {
        // console.log('CommandCenter: Stopping mock processing loop.');
        return;
      }

      const nextTask = this.#taskQueue.shift(); // Get the next task from the front of the queue

      if (nextTask) {
        nextTask.status = 'running';
        nextTask.startedAt = Date.now();
        this.#tasks.set(nextTask.id, nextTask); // Update status in the main tasks map
        // console.log(`CommandCenter: Processing task ${nextTask.id} (type: ${nextTask.payload.type || 'unknown'})`);

        // Simulate asynchronous work
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate 50ms work

        nextTask.status = 'completed';
        nextTask.completedAt = Date.now();
        this.#tasks.set(nextTask.id, nextTask); // Update status in the main tasks map
        // console.log(`CommandCenter: Task ${nextTask.id} completed.`);
      }

      // Schedule the next processing cycle
      setTimeout(processNextTask, 10); // Check for new tasks every 10ms
    };

    // Start the first processing cycle
    processNextTask();
  }

  /**
   * Stops the mock asynchronous processing loop.
   */
  stop() {
    this.#isRunning = false;
    // The recursive setTimeout will naturally stop on the next check.
    // console.log('CommandCenter: Stopped processing loop.');
  }
}

ASSUMPTIONS: `node:crypto` is considered a built-in utility and not an 'external dependency' in the context of the isolation requirement.