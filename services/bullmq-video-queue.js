/**
 * SYNOPSIS: Service module — Bullmq Video Queue.
 */
import { Queue } from 'bullmq';

const connection = {
  host: 'localhost',
  port: 6379
};

const videoQueueName = 'video-processing';

export const createVideoQueue = () => {
  return new Queue(videoQueueName, { connection });
};
