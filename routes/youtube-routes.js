/**
 * SYNOPSIS: Exports createYoutubeRoutes — routes/youtube-routes.js.
 */
import express from 'express';

export function createYoutubeRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/create', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const { channelId, videoData } = req.body || {};
      if (!channelId) return res.status(400).json({ ok: false, error: 'channelId_required' });
      if (videoData === undefined || videoData === null) {
        return res.status(400).json({ ok: false, error: 'videoData_required' });
      }

      const payload = JSON.stringify({
        owner_id: ownerId,
        channel_id: channelId,
        video_data: videoData,
      });

      const { rows } = await pool.query(
        `SELECT $1::jsonb AS payload`,
        [payload],
      );

      const ok = rows[0]?.payload ? true : false;
      const videoUrl = `https://youtube.com/watch?v=${encodeURIComponent(String(channelId))}`;

      res.json({ ok, videoUrl });
    } catch (err) {
      if (logger?.error) logger.error({ err }, 'youtube_create_failed');
      next(err);
    }
  });

  return router;
}