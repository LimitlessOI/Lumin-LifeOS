/**
 * SYNOPSIS: API endpoints for social post scheduling and serving the scheduling UI.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */

export function registerMarketingSocialScheduleRoutes(app, deps) {
  const { pool, requireKey, logger } = deps;

  // Serve the HTML overlay for social post scheduling
  app.get('/marketingos/social/schedule/new', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Schedule Social Post</title>
          <style>
              body { font-family: sans-serif; margin: 20px; }
              form div { margin-bottom: 10px; }
              label { display: block; margin-bottom: 5px; }
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
                      <option value="twitter">Twitter</option>
                      <option value="facebook">Facebook</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="instagram">Instagram</option>
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
                          headers: {
                              'Content-Type': 'application/json',
                              // NOTE: In a real application, the key would be handled securely (e.g., via session, OAuth, or a securely managed client-side token).
                              // For this example, we assume a mechanism for the key is in place, or the route is otherwise protected.
                              // 'x-command-key': 'YOUR_SECURE_KEY'
                          },
                          body: JSON.stringify({ platform, content, scheduleTime })
                      });
                      const data = await res.json();
                      if (res.ok) {
                          responseDiv.style.color = 'green';
                          responseDiv.textContent = 'Post scheduled successfully: ' + JSON.stringify(data);
                          document.getElementById('scheduleForm').reset();
                      } else {
                          responseDiv.style.color = 'red';
                          responseDiv.textContent = 'Error scheduling post: ' + (data.message || JSON.stringify(data));
                      }
                  } catch (error) {
                      responseDiv.style.color = 'red';
                      responseDiv.textContent = 'Network error: ' + error.message;
                  }
              });
          </script>
      </body>
      </html>
    `);
  });

  // POST /api/v1/marketingos/social/schedule - Create a new post schedule
  app.post('/api/v1/marketingos/social/schedule', requireKey, async (req, res) => {
    const { platform, content, scheduleTime } = req.body;

    if (!platform || !content || !scheduleTime) {
      logger.warn({ body: req.body }, 'Missing required fields for social post scheduling');
      return res.status(400).json({ message: 'Missing required fields: platform, content, and scheduleTime are necessary.' });
    }

    try {
      // For simplicity, 'scheduled_posts' table is assumed based on common scheduling needs.
      // If a specific existing table for 'scheduled posts' from the schema is intended,
      // it should be explicitly stated in the spec.
      // As no direct 'scheduled_posts' table exists, we'll use marketing_content_pieces
      // as the closest fit for 'content' that has a 'platform' and 'status'.
      // The 'scheduleTime' will be stored in metadata for now.
      const sql = `
        INSERT INTO marketing_content_pieces (platform, content_text, status, metadata)
        VALUES ($1, $2, $3, $4)
        RETURNING id, platform, content_text, status, metadata, created_at;
      `;
      const metadata = { scheduleTime: scheduleTime, scheduledStatus: 'pending' };
      const result = await pool.query(sql, [platform, content, 'scheduled', metadata]);
      const newSchedule = result.rows[0];

      logger.info({ scheduleId: newSchedule.id, platform, scheduleTime }, 'Social post scheduled successfully.');
      res.status(201).json({
        message: 'Social post scheduled successfully.',
        schedule: {
          id: newSchedule.id,
          platform: newSchedule.platform,
          content: newSchedule.content_text,
          scheduleTime: newSchedule.metadata.scheduleTime,
          status: newSchedule.status,
          createdAt: newSchedule.created_at,
        },
      });
    } catch (error) {
      logger.error({ error, body: req.body }, 'Failed to schedule social post.');
      res.status(500).json({ message: 'Failed to schedule social post.', error: error.message });
    }
  });

  // GET /api/v1/marketingos/social/schedules - Retrieve a list of scheduled posts
  app.get('/api/v1/marketingos/social/schedules', requireKey, async (req, res) => {
    try {
      // Fetch scheduled posts from marketing_content_pieces where status is 'scheduled'
      const sql = `
        SELECT id, platform, content_text, status, metadata, created_at
        FROM marketing_content_pieces
        WHERE status = 'scheduled'
        ORDER BY created_at DESC;
      `;
      const result = await pool.query(sql);
      const schedules = result.rows.map(row => ({
        id: row.id,
        platform: row.platform,
        content: row.content_text,
        scheduleTime: row.metadata ? row.metadata.scheduleTime : null,
        status: row.status,
        createdAt: row.created_at,
      }));

      logger.info('Retrieved list of scheduled social posts.');
      res.status(200).json(schedules);
    } catch (error) {
      logger.error({ error }, 'Failed to retrieve social post schedules.');
      res.status(500).json({ message: 'Failed to retrieve social post schedules.', error: error.message });
    }
  });

  // DELETE /api/v1/marketingos/social/schedule/:id - Cancel a scheduled post
  app.delete('/api/v1/marketingos/social/schedule/:id', requireKey, async (req, res) => {
    const { id } = req.params;

    try {
      // Update the status of the marketing_content_pieces to 'cancelled'
      const sql = `
        UPDATE marketing_content_pieces
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1 AND status = 'scheduled'
        RETURNING id, platform, content_text, status, metadata, updated_at;
      `;
      const result = await pool.query(sql, [id]);

      if (result.rowCount === 0) {
        logger.warn({ scheduleId: id }, 'Attempted to cancel a social post that was not found or not in scheduled status.');
        return res.status(404).json({ message: 'Scheduled post not found or already processed/cancelled.' });
      }

      const cancelledSchedule = result.rows[0];
      logger.info({ scheduleId: id }, 'Social post schedule cancelled successfully.');
      res.status(200).json({
        message: 'Social post schedule cancelled successfully.',
        schedule: {
          id: cancelledSchedule.id,
          platform: cancelledSchedule.platform,
          content: cancelledSchedule.content_text,
          scheduleTime: cancelledSchedule.metadata ? cancelledSchedule.metadata.scheduleTime : null,
          status: cancelledSchedule.status,
          updatedAt: cancelledSchedule.updated_at,
        },
      });
    } catch (error) {
      logger.error({ error, scheduleId: id }, 'Failed to cancel social post schedule.');
      res.status(500).json({ message: 'Failed to cancel social post schedule.', error: error.message });
    }
  });
}