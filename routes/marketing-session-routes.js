/**
 * SYNOPSIS: Registers MarketingSessionRoutes routes/handlers (routes/marketing-session-routes.js).
 */
import { Router } from 'express';
import { sendCoachMessage } from '../services/marketing-coach.js';
import { extractFromTranscript, generatePieces, regeneratePiece } from '../services/marketing-content-engine.js';

const router = Router();

export function registerMarketingSessionRoutes(app, { pool, requireKey }) {
  router.post('/api/v1/marketing/consent', requireKey, async (req, res) => {
    try {
      const { user_id } = req.body; // Assuming user_id is passed in the body for consent
      if (!user_id) {
        return res.status(400).json({ ok: false, error: 'user_id is required for consent' });
      }
      const client = await pool.connect();
      try {
        const result = await client.query(
          'INSERT INTO marketing_consent_records (user_id) VALUES ($1) RETURNING id',
          [user_id]
        );
        res.status(201).json({ ok: true, id: result.rows[0].id });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating marketing consent record:', error);
      res.status(500).json({ ok: false, error: 'Failed to create marketing consent record' });
    }
  });

  router.post('/api/v1/marketing/sessions', requireKey, async (req, res) => {
    try {
      const { consent_record_id } = req.body;
      if (!consent_record_id) {
        return res.status(400).json({ ok: false, error: 'consent_record_id is required' });
      }

      const client = await pool.connect();
      try {
        const consentCheck = await client.query('SELECT id FROM marketing_consent_records WHERE id = $1', [consent_record_id]);
        if (consentCheck.rows.length === 0) {
          return res.status(400).json({ ok: false, error: 'Invalid consent_record_id' });
        }

        const result = await client.query(
          'INSERT INTO marketing_sessions (consent_record_id, input_mode) VALUES ($1, $2) RETURNING id',
          [consent_record_id, 'text']
        );
        res.status(201).json({ ok: true, id: result.rows[0].id });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating marketing session:', error);
      res.status(500).json({ ok: false, error: 'Failed to create marketing session' });
    }
  });

  router.post('/api/v1/marketing/sessions/:id/coach', requireKey, async (req, res) => {
    try {
      const sessionId = req.params.id;
      const { userMessage } = req.body;
      if (!userMessage) {
        return res.status(400).json({ ok: false, error: 'userMessage is required' });
      }

      const client = await pool.connect();
      try {
        const sessionResult = await client.query('SELECT coach_messages_json FROM marketing_sessions WHERE id = $1', [sessionId]);
        if (sessionResult.rows.length === 0) {
          return res.status(404).json({ ok: false, error: 'Session not found' });
        }
        const currentMessages = sessionResult.rows[0].coach_messages_json || [];

        const { response, hookDetected, hookText } = await sendCoachMessage(sessionId, userMessage, pool);

        const updatedMessages = [...currentMessages, { role: 'user', content: userMessage }, { role: 'coach', content: response }];

        await client.query(
          'UPDATE marketing_sessions SET coach_messages_json = $1 WHERE id = $2',
          [JSON.stringify(updatedMessages), sessionId]
        );

        res.json({ ok: true, response, hookDetected, hookText });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error sending coach message:', error);
      res.status(500).json({ ok: false, error: 'Failed to send coach message' });
    }
  });

  router.post('/api/v1/marketing/sessions/:id/extract', requireKey, async (req, res) => {
    try {
      const sessionId = req.params.id;
      const { transcript } = req.body;
      if (!transcript) {
        return res.status(400).json({ ok: false, error: 'transcript is required' });
      }

      const extractions = await extractFromTranscript(transcript, sessionId, pool);
      res.json({ ok: true, extractions });
    } catch (error) {
      console.error('Error extracting from transcript:', error);
      res.status(500).json({ ok: false, error: 'Failed to extract from transcript' });
    }
  });

  router.post('/api/v1/marketing/sessions/:id/generate', requireKey, async (req, res) => {
    try {
      const sessionId = req.params.id;
      const { extractions, channelProfile } = req.body;
      if (!extractions || !Array.isArray(extractions) || !channelProfile) {
        return res.status(400).json({ ok: false, error: 'extractions (array) and channelProfile are required' });
      }

      const generatedPieces = await generatePieces(sessionId, extractions, channelProfile, pool);
      res.json({ ok: true, generatedPieces });
    } catch (error) {
      console.error('Error generating pieces:', error);
      res.status(500).json({ ok: false, error: 'Failed to generate pieces' });
    }
  });

  router.get('/api/v1/marketing/sessions/:id', requireKey, async (req, res) => {
    try {
      const sessionId = req.params.id;
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT * FROM marketing_sessions WHERE id = $1', [sessionId]);
        if (result.rows.length === 0) {
          return res.status(404).json({ ok: false, error: 'Session not found' });
        }
        res.json({ ok: true, session: result.rows[0] });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting session state:', error);
      res.status(500).json({ ok: false, error: 'Failed to get session state' });
    }
  });

  router.get('/api/v1/marketing/sessions/:id/content', requireKey, async (req, res) => {
    try {
      const sessionId = req.params.id;
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT * FROM marketing_content_pieces WHERE session_id = $1', [sessionId]);
        res.json({ ok: true, contentPieces: result.rows });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting content pieces:', error);
      res.status(500).json({ ok: false, error: 'Failed to get content pieces' });
    }
  });

  router.patch('/api/v1/marketing/content/:id', requireKey, async (req, res) => {
    try {
      const pieceId = req.params.id;
      const { status, hint } = req.body; // status can be 'approved', 'rejected', hint for regeneration

      const client = await pool.connect();
      try {
        if (status) {
          // Validate status against CHECK constraint enum values
          const validStatuses = ['draft', 'approved', 'rejected']; // Assuming these are the valid statuses from product doc
          if (!validStatuses.includes(status)) {
            return res.status(400).json({ ok: false, error: `Invalid status: ${status}. Must be one of ${validStatuses.join(', ')}.` });
          }
          await client.query('UPDATE marketing_content_pieces SET status = $1 WHERE id = $2', [status, pieceId]);
          return res.json({ ok: true, message: `Content piece ${pieceId} status updated to ${status}.` });
        } else if (hint) {
          const regenerated = await regeneratePiece(pieceId, hint, pool);
          return res.json({ ok: true, regeneratedPiece: regenerated });
        } else {
          return res.status(400).json({ ok: false, error: 'Either status or hint for regeneration is required.' });
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating or regenerating content piece:', error);
      res.status(500).json({ ok: false, error: 'Failed to update or regenerate content piece' });
    }
  });

  router.get('/api/v1/marketing/sessions/:id/export', requireKey, async (req, res) => {
    try {
      const sessionId = req.params.id;
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT content_text FROM marketing_content_pieces WHERE session_id = $1 AND status = $2 ORDER BY created_at ASC', [sessionId, 'approved']);
        if (result.rows.length === 0) {
          return res.status(404).json({ ok: false, error: 'No approved content found for this session.' });
        }

        const formattedTextPack = result.rows.map(row => row.content_text).join('\n\n---\n\n'); // Simple formatting

        res.setHeader('Content-Disposition', `attachment; filename="marketing_content_session_${sessionId}.txt"`);
        res.setHeader('Content-Type', 'text/plain');
        res.send(formattedTextPack);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error exporting content:', error);
      res.status(500).json({ ok: false, error: 'Failed to export content' });
    }
  });

  router.get('/api/v1/marketing/channel-profile', requireKey, async (req, res) => {
    try {
      const { user_id } = req.query; // Assuming user_id is passed as a query param for identifying the profile
      if (!user_id) {
        return res.status(400).json({ ok: false, error: 'user_id is required to get channel profile' });
      }

      const client = await pool.connect();
      try {
        const result = await client.query('SELECT * FROM marketing_channel_profiles WHERE user_id = $1', [user_id]);
        if (result.rows.length === 0) {
          // If no profile exists, create a default one
          const insertResult = await client.query(
            'INSERT INTO marketing_channel_profiles (user_id, profile_data_json) VALUES ($1, $2) RETURNING *',
            [user_id, JSON.stringify({})] // Empty JSON object as default profile data
          );
          return res.status(201).json({ ok: true, channelProfile: insertResult.rows[0] });
        }
        res.json({ ok: true, channelProfile: result.rows[0] });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting or creating channel profile:', error);
      res.status(500).json({ ok: false, error: 'Failed to get or create channel profile' });
    }
  });

  router.put('/api/v1/marketing/channel-profile', requireKey, async (req, res) => {
    try {
      const { user_id, profile_data_json } = req.body;
      if (!user_id || !profile_data_json) {
        return res.status(400).json({ ok: false, error: 'user_id and profile_data_json are required to update channel profile' });
      }

      const client = await pool.connect();
      try {
        const result = await client.query(
          'UPDATE marketing_channel_profiles SET profile_data_json = $1 WHERE user_id = $2 RETURNING *',
          [JSON.stringify(profile_data_json), user_id]
        );
        if (result.rows.length === 0) {
          return res.status(404).json({ ok: false, error: 'Channel profile not found for this user_id.' });
        }
        res.json({ ok: true, channelProfile: result.rows[0] });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating channel profile:', error);
      res.status(500).json({ ok: false, error: 'Failed to update channel profile' });
    }
  });

  app.use(router);
}

export default registerMarketingSessionRoutes;