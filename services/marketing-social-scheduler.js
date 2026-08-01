/**
 * SYNOPSIS: Service to manage and execute scheduled social posts.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import { Queue } from 'bullmq';

// We'll use a single queue for all scheduled social posts.
// The queue name is derived from the service's purpose.
const socialPostQueueName = 'marketing_social_posts';
let socialPostQueue;

/**
 * Schedules a social media post for a given platform at a specified time.
 * @param {object} deps - Injected dependencies (pool, logger, callCouncilMember, etc.).
 * @param {object} payload - The post scheduling details.
 * @param {string} payload.postId - The ID of the marketing_content to post.
 * @param {string} payload.platform - The social media platform (e.g., 'twitter', 'facebook').
 * @param {string} payload.scheduledAt - ISO 8601 string for the scheduled publication time.
 * @param {object} payload.metadata - Additional metadata for the post.
 * @returns {Promise<object>} The scheduled post record from the database.
 */
export async function schedulePost(deps, payload) {
  const { pool, logger } = deps;
  const { postId, platform, scheduledAt, metadata } = payload;

  if (!postId || !platform || !scheduledAt) {
    throw new Error('Missing required payload fields: postId, platform, scheduledAt');
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO marketing_social_posts (content_id, platform, scheduled_at, metadata, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [postId, platform, scheduledAt, metadata, 'scheduled']
    );

    const scheduledRecord = rows[0];

    if (socialPostQueue) {
      // Add job to BullMQ queue with a delay
      const delay = new Date(scheduledAt).getTime() - Date.now();
      if (delay > 0) {
        await socialPostQueue.add(
          'publishSocialPost',
          { scheduleId: scheduledRecord.id, contentId: postId, platform },
          { delay: delay, jobId: scheduledRecord.id } // Use scheduleId as jobId for easy lookup/cancellation
        );
        logger.info({ scheduleId: scheduledRecord.id, postId, platform, scheduledAt }, 'Scheduled post added to queue.');
      } else {
        logger.warn({ scheduleId: scheduledRecord.id, postId, platform, scheduledAt }, 'Scheduled time is in the past or now, post will be processed immediately.');
        // For immediate processing, we could trigger it directly or let the worker pick it up very soon.
        // For now, let's assume the worker will process it.
        await socialPostQueue.add(
          'publishSocialPost',
          { scheduleId: scheduledRecord.id, contentId: postId, platform },
          { jobId: scheduledRecord.id }
        );
      }
    } else {
      logger.warn('Social post queue not initialized. Post will be scheduled in DB but not queued for execution.');
    }

    return scheduledRecord;
  } catch (error) {
    logger.error({ error, payload }, 'Error in schedulePost');
    throw new Error('Failed to schedule post');
  }
}

/**
 * Cancels a previously scheduled social media post.
 * @param {object} deps - Injected dependencies (pool, logger).
 * @param {object} payload - The cancellation details.
 * @param {string} payload.scheduleId - The ID of the scheduled post to cancel.
 * @returns {Promise<object|null>} The updated scheduled post record, or null if not found.
 */
export async function cancelScheduledPost(deps, payload) {
  const { pool, logger } = deps;
  const { scheduleId } = payload;

  if (!scheduleId) {
    throw new Error('Missing required payload field: scheduleId');
  }

  try {
    const { rows } = await pool.query(
      `UPDATE marketing_social_posts
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'scheduled'
       RETURNING *`,
      ['cancelled', scheduleId]
    );

    const cancelledRecord = rows[0] || null;

    if (cancelledRecord && socialPostQueue) {
      await socialPostQueue.remove(scheduleId); // Remove job from BullMQ queue
      logger.info({ scheduleId }, 'Scheduled post cancelled and removed from queue.');
    } else if (cancelledRecord) {
      logger.warn('Social post queue not initialized. Post cancelled in DB but not removed from queue.');
    }

    return cancelledRecord;
  } catch (error) {
    logger.error({ error, scheduleId }, 'Error in cancelScheduledPost');
    throw new Error('Failed to cancel scheduled post');
  }
}

/**
 * Retrieves a list of scheduled social posts based on their status.
 * @param {object} deps - Injected dependencies (pool, logger).
 * @param {object} payload - The filtering details.
 * @param {string} payload.status - The status of posts to retrieve (e.g., 'scheduled', 'published', 'failed', 'cancelled').
 * @returns {Promise<Array<object>>} An array of scheduled post records.
 */
export async function getScheduledPosts(deps, payload) {
  const { pool, logger } = deps;
  const { status } = payload;

  try {
    let query = 'SELECT * FROM marketing_social_posts';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    query += ' ORDER BY scheduled_at ASC';

    const { rows } = await pool.query(query, params);
    return rows;
  } catch (error) {
    logger.error({ error, status }, 'Error in getScheduledPosts');
    throw new Error('Failed to retrieve scheduled posts');
  }
}

/**
 * Initializes the BullMQ scheduler and queue for social posts.
 * This should be called once during application startup.
 * @param {object} deps - Injected dependencies (logger).
 * @param {object} deps.redisConnection - A pre-configured ioredis client instance.
 */
export function initScheduler(deps) {
  const { logger, redisConnection } = deps;

  if (!redisConnection) {
    logger.error('Redis connection not provided to initScheduler. Social post scheduling will not function.');
    return;
  }

  if (!socialPostQueue) {
    socialPostQueue = new Queue(socialPostQueueName, { connection: redisConnection });
    logger.info('BullMQ social post queue initialized.');
  } else {
    logger.warn('BullMQ social post queue already initialized.');
  }
}

// Add a new table for marketing_social_posts
// This would be part of a migration, not directly in this service,
// but for the sake of schema grounding, it's assumed to exist.
//
// CREATE TABLE marketing_social_posts (
//     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     content_id UUID NOT NULL REFERENCES marketing_content(id),
//     platform TEXT NOT NULL,
//     scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
//     published_at TIMESTAMP WITH TIME ZONE,
//     status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'published', 'failed', 'cancelled'
//     metadata JSONB,
//     error_message TEXT,
//     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
//     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
// );
//
// No direct publishing logic here; it's handled by marketing-publisher.js
// and triggered by a BullMQ worker (not part of this file's scope).