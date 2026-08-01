import { createHash } from 'crypto';
import { schedulePost, cancelScheduledPost, initScheduler } from '../services/marketing-social-scheduler.js';

/**
 * SYNOPSIS: MarketingOS social post scheduling routes and scheduling UI.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */

function toOwnerUuid(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) {
    return s.toLowerCase();
  }
  const hex = createHash('sha256').update(`marketing-owner:${s}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function getOwnerId(req) {
  const sub = req.lifeosUser?.sub || req.user?.id || req.user?.sub || null;
  if (sub) return toOwnerUuid(sub);
  const bodyOwner = req.body?.owner_id || req.query?.owner_id || null;
  return toOwnerUuid(bodyOwner || 'adam');
}

const ALLOWED_PLATFORMS = new Set(['instagram', 'linkedin', 'x', 'facebook']);

export function registerMarketingSocialScheduleRoutes(app, deps) {
  const { pool, requireKey, logger } = deps;

  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_required');
  }

  // HTML overlay for creating a scheduled social post
  app.get('/marketingos/social/schedule/new', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Schedule Social Post</title>
  <style>
    body { font-family: sans-serif; margin: 20px; max-width: 600px; }
    form div { margin-bottom: 12px; }
    label { display: block; margin-bottom: 4px; font-weight: bold; }
    input[type="text"], textarea, select { width: 100%; padding: 8px; box-sizing: border-box; }
    button { padding: 10px 15px; background-color: #007bff; color: white; border: none; cursor: pointer; }
    button:hover { background-color: #0056b3; }
    #response { margin-top: 20px; padding: 10px; border: 1px solid #ccc; background-color: #f9f9f9; }
  </style>
</head>
<body>
  <h1>Schedule New Social Post</h1>
  <form id="scheduleForm">
    <div>
      <label for="platform">Platform:</label>
      <select id="platform" name="platform" required>
        <option value="instagram">Instagram</option>
        <option value="linkedin">LinkedIn</option>
        <option value="x">X / Twitter</option>
        <option value="facebook">Facebook</option>
      </select>
    </div>
    <div>
      <label for="content">Content:</label>
      <textarea id="content" name="content" rows="5" required></textarea>
    </div>
    <div>
      <label for="scheduleTime">Schedule Time (YYYY-MM-DDTHH:mm):</label>
      <input type="datetime-local" id="scheduleTime" name="scheduleTime" required>
    </div>
    <div>
      <button type="submit">Schedule Post</button>
    </div>
  </form>
  <div id="response"></div>
  <script>
    document.getElementById('scheduleForm').addEventListener('submit', async function(event) {
      event.preventDefault();
      const platform = document.getElementById('platform').value;
      const content = document.getElementById('content').value;
      const scheduleTime = document.getElementById('scheduleTime').value;
      const responseDiv = document.getElementById('response');
      try {
        const res = await fetch('/api/v1/marketingos/social/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform, content, scheduleTime })
        });
        const data = await res.json();
        if (res.ok) {
          responseDiv.style.color = 'green';
          responseDiv.textContent = 'Post scheduled successfully: ' + JSON.stringify(data.schedule || data);
          document.getElementById('scheduleForm').reset();
        } else {
          responseDiv.style.color = 'red';
          responseDiv.textContent = 'Error: ' + (data.error || JSON.stringify(data));
        }
      } catch (err) {
        responseDiv.style.color = 'red';
        responseDiv.textContent = 'Network error: ' + err.message;
      }
    });
  </script>
</body>
</html>`);
  });

  // POST /api/v1/marketingos/social/schedule — create a new scheduled post
  app.post('/api/v1/marketingos/social/schedule', requireKey, async (req, res) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) {
        return res.status(400).json({ ok: false, error: 'owner_id_required' });
      }

      const { platform, content, scheduleTime } = req.body || {};
      if (!platform || !content || !scheduleTime) {
        return res.status(400).json({ ok: false, error: 'platform_content_scheduleTime_required' });
      }

      if (!ALLOWED_PLATFORMS.has(platform)) {
        return res.status(400).json({ ok: false, error: 'invalid_platform' });
      }

      const scheduledAt = new Date(scheduleTime);
      if (Number.isNaN(scheduledAt.getTime())) {
        return res.status(400).json({ ok: false, error: 'invalid_schedule_time' });
      }

      // Create the publishing post record, then schedule it.
      const postResult = await pool.query(
        `INSERT INTO marketing_social_publishing (owner_id, platform, content_text, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'draft', NOW(), NOW())
         RETURNING id, owner_id, platform, content_text, status, created_at, updated_at`,
        [ownerId, platform, content],
      );

      const schedule = await schedulePost(pool, postResult.rows[0].id, platform, scheduledAt.toISOString(), {
        content_text: content,
      });

      logger?.info?.({ scheduleId: schedule.id, ownerId, platform }, 'Social post scheduled');
      return res.status(201).json({ ok: true, schedule });
    } catch (err) {
      logger?.error?.({ err }, 'Failed to schedule social post');
      return res.status(500).json({ ok: false, error: 'failed_to_schedule_post' });
    }
  });

  // GET /api/v1/marketingos/social/schedules — list scheduled posts for owner
  app.get('/api/v1/marketingos/social/schedules', requireKey, async (req, res) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) {
        return res.status(400).json({ ok: false, error: 'owner_id_required' });
      }

      const statusFilter = req.query.status || 'pending';
      const safeStatus = ['pending', 'published', 'cancelled', 'failed'].includes(statusFilter) ? statusFilter : 'pending';

      const { rows } = await pool.query(
        `SELECT s.id, s.post_id, s.platform, s.scheduled_at, s.status, s.metadata, s.created_at, s.updated_at,
                p.owner_id, p.content_text
         FROM marketing_social_post_schedules s
         JOIN marketing_social_publishing p ON p.id = s.post_id
         WHERE p.owner_id = $1 AND s.status = $2
         ORDER BY s.scheduled_at ASC`,
        [ownerId, safeStatus],
      );

      return res.json({ ok: true, schedules: rows });
    } catch (err) {
      logger?.error?.({ err }, 'Failed to list social schedules');
      return res.status(500).json({ ok: false, error: 'failed_to_list_schedules' });
    }
  });

  // DELETE /api/v1/marketingos/social/schedule/:id — cancel a scheduled post
  app.delete('/api/v1/marketingos/social/schedule/:id', requireKey, async (req, res) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) {
        return res.status(400).json({ ok: false, error: 'owner_id_required' });
      }

      const { id } = req.params;

      // Verify ownership before cancelling.
      const ownerCheck = await pool.query(
        `SELECT s.id
         FROM marketing_social_post_schedules s
         JOIN marketing_social_publishing p ON p.id = s.post_id
         WHERE s.id = $1 AND p.owner_id = $2`,
        [id, ownerId],
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'schedule_not_found' });
      }

      const cancelled = await cancelScheduledPost(pool, id);
      if (!cancelled) {
        return res.status(404).json({ ok: false, error: 'schedule_not_found_or_already_processed' });
      }

      logger?.info?.({ scheduleId: id, ownerId }, 'Social schedule cancelled');
      return res.json({ ok: true, schedule: cancelled });
    } catch (err) {
      logger?.error?.({ err, scheduleId: req.params.id }, 'Failed to cancel social schedule');
      return res.status(500).json({ ok: false, error: 'failed_to_cancel_schedule' });
    }
  });

  // Start the background scheduler to publish due posts.
  initScheduler(pool, logger);
}
