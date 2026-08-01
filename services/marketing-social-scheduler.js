/**
 * SYNOPSIS: MarketingOS scheduled social post service.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */

const ALLOWED_PLATFORMS = new Set(['instagram', 'linkedin', 'x', 'facebook', 'email', 'general']);
const VALID_STATUSES = new Set(['pending', 'published', 'cancelled', 'failed']);

function normalizePlatform(platform) {
  const p = String(platform || '').toLowerCase().trim();
  if (p === 'twitter') return 'x';
  return ALLOWED_PLATFORMS.has(p) ? p : 'general';
}

export async function schedulePost(pool, postId, platform, scheduledAt, metadata = {}) {
  if (!pool || typeof pool.query !== 'function') throw new Error('pool_required');
  if (!postId) throw new Error('post_id_required');

  const normalized = normalizePlatform(platform);
  const scheduleTime = new Date(scheduledAt);
  if (Number.isNaN(scheduleTime.getTime())) throw new Error('invalid_scheduled_at');

  const result = await pool.query(
    `INSERT INTO marketing_social_post_schedules (post_id, platform, scheduled_at, status, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, 'pending', $4::jsonb, NOW(), NOW())
     RETURNING id, post_id, platform, scheduled_at, status, metadata, created_at, updated_at`,
    [postId, normalized, scheduleTime.toISOString(), JSON.stringify(metadata || {})],
  );

  return result.rows[0];
}

export async function cancelScheduledPost(pool, scheduleId) {
  if (!pool || typeof pool.query !== 'function') throw new Error('pool_required');
  if (!scheduleId) throw new Error('schedule_id_required');

  const result = await pool.query(
    `UPDATE marketing_social_post_schedules
     SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING id, post_id, platform, scheduled_at, status, metadata, created_at, updated_at`,
    [scheduleId],
  );

  return result.rows[0] || null;
}

export async function getScheduledPosts(pool, status = 'pending') {
  if (!pool || typeof pool.query !== 'function') throw new Error('pool_required');

  const safeStatus = VALID_STATUSES.has(status) ? status : 'pending';
  const result = await pool.query(
    `SELECT s.id, s.post_id, s.platform, s.scheduled_at, s.status, s.metadata, s.created_at, s.updated_at,
            p.owner_id, p.content_text
     FROM marketing_social_post_schedules s
     LEFT JOIN marketing_social_publishing p ON p.id = s.post_id
     WHERE s.status = $1
     ORDER BY s.scheduled_at ASC`,
    [safeStatus],
  );

  return result.rows;
}

async function publishDuePosts(pool, logger) {
  try {
    const result = await pool.query(
      `UPDATE marketing_social_post_schedules
       SET status = 'published', updated_at = NOW()
       WHERE status = 'pending' AND scheduled_at <= NOW()
       RETURNING id, post_id, platform, scheduled_at`,
    );

    if (result.rowCount > 0) {
      logger?.info?.({ count: result.rowCount }, 'marketing-social-scheduler published due posts');
    }
  } catch (error) {
    logger?.error?.({ error }, 'marketing-social-scheduler failed to publish due posts');
  }
}

export function initScheduler(pool, logger, intervalMs = 60_000) {
  if (!pool || typeof pool.query !== 'function') throw new Error('pool_required');

  publishDuePosts(pool, logger);
  const interval = setInterval(() => publishDuePosts(pool, logger), intervalMs);

  return {
    stop: () => clearInterval(interval),
  };
}
