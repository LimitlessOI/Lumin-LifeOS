/**
 * Task Queue — BullMQ + Redis (with in-memory fallback for dev/no-Redis)
 *
 * Replaces the custom in-memory execution queue.
 * Jobs survive server restarts when Redis is available.
 *
 * Usage:
 *   import { addJob, getQueueStats } from './services/queue.js';
 *
 *   // Add a job
 *   await addJob('idea-pipeline', { ideaId: '123', idea: 'Build a game' }, { priority: 10 });
 *   await addJob('video-generate', { script: '...', style: 'cinematic' });
 *   await addJob('game-build', { spec: '...', engine: 'phaser' });
 *   await addJob('self-program', { instruction: '...', pipelineId: '...' });
 *
 * Queue names (canonical):
 *   'idea-pipeline'  — idea → concept → design → plan → implement
 *   'video-generate' — script → images → audio → compose → deliver
 *   'game-build'     — spec → code → deploy → serve URL
 *   'self-program'   — instruction → snapshot → patch → validate → rollback on fail
 *   'outreach'       — campaign → send → track
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import logger from './logger.js';

let Queue, Worker, QueueEvents;
let redisAvailable = false;
let redisConnection = null;

// Try to init Redis + BullMQ
async function initRedis() {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
  if (!redisUrl) {
    logger.warn('[QUEUE] No REDIS_URL set — running in-memory fallback mode. Jobs will NOT survive restarts.');
    return false;
  }

  try {
    const { default: IORedis } = await import('ioredis');
    const bullmq = await import('bullmq');
    Queue = bullmq.Queue;
    Worker = bullmq.Worker;
    QueueEvents = bullmq.QueueEvents;

    redisConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null, // REQUIRED for BullMQ — without this, workers crash with timeout errors
      enableReadyCheck: false,
      tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined, // Upstash uses rediss://
    });

    await redisConnection.ping();
    redisAvailable = true;
    logger.info('[QUEUE] Redis connected — BullMQ active');
    return true;
  } catch (err) {
    logger.warn('[QUEUE] Redis unavailable, falling back to in-memory', { error: err.message });
    return false;
  }
}

// In-memory fallback queue (simple FIFO, lost on restart)
const inMemoryQueues = {};

function getInMemoryQueue(name) {
  if (!inMemoryQueues[name]) {
    inMemoryQueues[name] = { jobs: [], processors: [] };
  }
  return inMemoryQueues[name];
}

// BullMQ queue instances (when Redis available)
const bullQueues = {};

function getBullQueue(name) {
  if (!bullQueues[name]) {
    bullQueues[name] = new Queue(name, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return bullQueues[name];
}

// Initialize on module load
const initPromise = initRedis();

/**
 * Add a job to a named queue.
 * @param {string} queueName - canonical queue name
 * @param {object} data - job payload
 * @param {object} opts - { priority (1=high, 10=low), delay (ms), jobId }
 */
export async function addJob(queueName, data, opts = {}) {
  await initPromise;

  const jobId = opts.jobId || `${queueName}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  if (redisAvailable) {
    const q = getBullQueue(queueName);
    const job = await q.add(queueName, data, {
      jobId,
      priority: opts.priority,
      delay: opts.delay,
    });
    logger.debug('[QUEUE] Job added to BullMQ', { queueName, jobId: job.id });
    return job.id;
  }

  // In-memory fallback
  const q = getInMemoryQueue(queueName);
  const job = { id: jobId, name: queueName, data, opts, createdAt: Date.now(), status: 'waiting' };
  q.jobs.push(job);
  logger.debug('[QUEUE] Job added to in-memory queue', { queueName, jobId });

  // Run immediately if there's a processor registered
  if (q.processors.length > 0) {
    setImmediate(() => runInMemoryJob(queueName, job));
  }

  return jobId;
}

/**
 * Register a processor function for a queue.
 * @param {string} queueName
 * @param {function} processor - async (job) => result
 * @param {object} opts - { concurrency }
 */
export async function registerProcessor(queueName, processor, opts = {}) {
  await initPromise;

  if (redisAvailable) {
    const worker = new Worker(queueName, processor, {
      connection: redisConnection,
      concurrency: opts.concurrency || 2,
    });

    worker.on('completed', (job) => {
      logger.info('[QUEUE] Job completed', { queueName, jobId: job.id });
    });
    worker.on('failed', (job, err) => {
      logger.error('[QUEUE] Job failed', { queueName, jobId: job?.id, error: err.message });
    });

    logger.info('[QUEUE] Worker registered', { queueName, concurrency: opts.concurrency || 2 });
    return worker;
  }

  // In-memory fallback
  const q = getInMemoryQueue(queueName);
  q.processors.push(processor);
  logger.debug('[QUEUE] In-memory processor registered', { queueName });
}

async function runInMemoryJob(queueName, job) {
  const q = getInMemoryQueue(queueName);
  if (q.processors.length === 0) return;

  job.status = 'active';
  try {
    const result = await q.processors[0](job);
    job.status = 'completed';
    job.result = result;
    logger.debug('[QUEUE] In-memory job completed', { queueName, jobId: job.id });
  } catch (err) {
    job.status = 'failed';
    job.error = err.message;
    logger.error('[QUEUE] In-memory job failed', { queueName, jobId: job.id, error: err.message });
  }
}

/**
 * Get queue stats (job counts by status).
 */
export async function getQueueStats(queueName) {
  await initPromise;

  if (redisAvailable) {
    const q = getBullQueue(queueName);
    const counts = await q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    return { queue: queueName, redis: true, ...counts };
  }

  const q = getInMemoryQueue(queueName);
  const counts = { waiting: 0, active: 0, completed: 0, failed: 0 };
  for (const job of q.jobs) counts[job.status] = (counts[job.status] || 0) + 1;
  return { queue: queueName, redis: false, ...counts };
}

/**
 * Get all queue stats at once.
 */
export async function getAllQueueStats() {
  const queues = ['idea-pipeline', 'video-generate', 'game-build', 'self-program', 'outreach'];
  const stats = await Promise.all(queues.map(getQueueStats));
  return stats;
}

/**
 * Graceful shutdown — close all workers and queues.
 */
export async function shutdownQueues() {
  if (!redisAvailable) return;
  await Promise.all(Object.values(bullQueues).map((q) => q.close()));
  if (redisConnection) await redisConnection.quit();
  logger.info('[QUEUE] All queues shut down');
}
