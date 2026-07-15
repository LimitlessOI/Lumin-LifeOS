/**
 * SYNOPSIS: Service module — MissionControlDaemon.
 */
import { EventEmitter } from 'events';

class MissionControlDaemon extends EventEmitter {
    constructor() {
        super();
        this.workerStates = new Map(); // workerId -> { status: 'idle' | 'busy' | 'error', lastHeartbeat: Date }
        this.queueDepths = new Map(); // queueName -> depth
        this.failClosedCounts = new Map(); // workerId | queueName -> count
        this.interval = null;
    }

    start() {
        if (this.interval) {
            console.warn("MissionControlDaemon already running.");
            return;
        }
        console.log("MissionControlDaemon starting...");
        this.interval = setInterval(() => this.orchestrate(), 5000); // Run orchestration every 5 seconds
        this.emit('daemonStarted');
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log("MissionControlDaemon stopped.");
            this.emit('daemonStopped');
        }
    }

    registerWorker(workerId) {
        this.workerStates.set(workerId, { status: 'idle', lastHeartbeat: new Date() });
        this.failClosedCounts.set(workerId, 0);
        console.log(`Worker ${workerId} registered.`);
    }

    updateWorkerState(workerId, status) {
        const worker = this.workerStates.get(workerId);
        if (worker) {
            worker.status = status;
            worker.lastHeartbeat = new Date();
            this.workerStates.set(workerId, worker);
            // console.log(`Worker ${workerId} state updated to ${status}.`);
        } else {
            console.warn(`Attempted to update state for unregistered worker: ${workerId}`);
            this.registerWorker(workerId); // Register if not found
            this.updateWorkerState(workerId, status); // Then update
        }
    }

    updateQueueDepth(queueName, depth) {
        this.queueDepths.set(queueName, depth);
        // console.log(`Queue ${queueName} depth updated to ${depth}.`);
    }

    incrementFailClosed(id) {
        const currentCount = this.failClosedCounts.get(id) || 0;
        this.failClosedCounts.set(id, currentCount + 1);
        console.warn(`Fail-closed count for ${id} incremented to ${currentCount + 1}.`);
    }

    resetFailClosed(id) {
        this.failClosedCounts.set(id, 0);
        console.log(`Fail-closed count for ${id} reset.`);
    }

    orchestrate() {
        // console.log("Orchestrating...");
        const actions = [];

        // Check for unresponsive workers
        const now = new Date();
        for (const [workerId, state] of this.workerStates.entries()) {
            const idleTime = (now.getTime() - state.lastHeartbeat.getTime()) / 1000; // seconds
            if (idleTime > 15 && state.status !== 'error') { // If no heartbeat for 15s, mark as error
                this.updateWorkerState(workerId, 'error');
                actions.push({ type: 'alert', target: workerId, message: `Worker ${workerId} unresponsive.` });
                this.emit('next_action', { type: 'restartWorker', workerId: workerId, reason: 'unresponsive' });
            }
        }

        // Example: Scale out if queue depth is high and workers are busy
        const highQueueThreshold = 100;
        const busyWorkerThreshold = 0.8; // 80% of workers are busy

        const totalWorkers = this.workerStates.size;
        const busyWorkers = Array.from(this.workerStates.values()).filter(w => w.status === 'busy').length;

        const busyWorkerRatio = totalWorkers > 0 ? busyWorkers / totalWorkers : 0;

        for (const [queueName, depth] of this.queueDepths.entries()) {
            if (depth > highQueueThreshold && busyWorkerRatio > busyWorkerThreshold) {
                actions.push({ type: 'scaleOut', target: 'workers', reason: `Queue ${queueName} depth high (${depth}) and workers busy.` });
                this.emit('next_action', { type: 'provisionNewWorker', queueName: queueName, reason: 'high_load' });
            } else if (depth === 0 && busyWorkerRatio === 0 && totalWorkers > 1) {
                // Example: Scale in if no work and many idle workers
                actions.push({ type: 'scaleIn', target: 'workers', reason: `Queue ${queueName} empty and workers idle.` });
                // Emit an action to potentially de-provision a worker, being careful not to scale to zero
                this.emit('next_action', { type: 'deprovisionWorker', reason: 'low_load' });
            }
        }

        // Check fail-closed counts and trigger specific actions
        const failClosedThreshold = 3;
        for (const [id, count] of this.failClosedCounts.entries()) {
            if (count >= failClosedThreshold) {
                actions.push({ type: 'alert', target: id, message: `Entity ${id} exceeded fail-closed threshold (${count}).` });
                this.emit('next_action', { type: 'quarantine', target: id, reason: 'fail_closed_exceeded' });
                // Optionally reset after emitting quarantine to prevent repeated alerts
                // this.resetFailClosed(id);
            }
        }

        // console.log("Orchestration complete. Actions:", actions);
        if (actions.length > 0) {
            this.emit('orchestrationComplete', actions);
        }
    }
}

let daemonInstance = null;

export const runDaemon = () => {
    if (!daemonInstance) {
        daemonInstance = new MissionControlDaemon();
        daemonInstance.start();
    }
    return daemonInstance;
};
