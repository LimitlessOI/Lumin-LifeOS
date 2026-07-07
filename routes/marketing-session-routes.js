/**
 * SYNOPSIS: Registers MarketingSessionRoutes routes/handlers (routes/marketing-session-routes.js).
 */
import { Router } from 'express';
import { sendCoachMessage } from '../services/marketing-coach.js';
import { extractFromTranscript, generatePieces, regeneratePiece } from '../services/marketing-content-engine.js';

const router = Router();

export function registerMarketingSessionRoutes(app, { pool, requireKey }) {
  router.post('/consent', requireKey, async (req, res) => {
    try {
      const { user_id, email, agreed_at } = req.body;
      if (!user_id || !email || !agreed_at) {
        return res.status(400).json({ ok: false, error: 'Missing required consent fields.' });
      }
      const result = await pool.query(
        'INSERT INTO marketing_consent_records (user_id, email, agreed_at) VALUES ($1, $2, $3) RETURNING id',
        [user_id, email, agreed_at]
      );
      res.status(201).json({ ok: true, id: result.rows[0].id });
    } catch (error) {
      console.error('Error creating marketing consent record:', error);
      res.status(500).json({ ok: false, error: 'Failed to create marketing consent record.' });
    }
  });

  router.post('/sessions', requireKey, async (req, res) => {
    try {
      const { consent_record_id } = req.body;
      if (!consent_record_id) {
        return res.status(400).json({ ok: false, error: 'consent_record_id is required.' });
      }

      // Verify consent_record_id exists
      const consentCheck = await pool.query('SELECT id FROM marketing_consent_records WHERE id = $1', [consent_record_id]);
      if (consentCheck.rows.length === 0) {
        return res.status(400).json({ ok: false, error: 'Invalid consent_record_id.' });
      }

      const result = await pool.query(
        'INSERT INTO marketing_sessions (consent_record_id, input_mode, created_at, updated_at, status) VALUES ($1, $2, NOW(), NOW(), $3) RETURNING id',
        [consent_record_id, 'text', 'initialized']
      );
      res.status(201).json({ ok: true, id: result.rows[0].id });
    } catch (error) {
      console.error('Error creating marketing session:', error);
      res.status(500).json({ ok: false, error: 'Failed to create marketing session.' });
    }
  });

  router.post('/sessions/:id/coach', requireKey, async (req, res) => {
    try {
      const sessionId = req.params.id;
      const { userMessage } = req.body;
      if (!userMessage) {
        return res.status(400).json({ ok: false, error: 'userMessage is required.' });
      }

      const sessionCheck = await pool.query('SELECT id FROM marketing_sessions WHERE id = $1', [sessionId]);
      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Session not found.' });
      }

      const { response, hookDetected, hookText } = await sendCoachMessage(sessionId, userMessage, pool);

      await pool.query(
        `UPDATE marketing_sessions 
         SET coach_messages_json = COALESCE(coach_messages_json, '[]'::jsonb) || jsonb_build_object('user', $2, 'coach', $3), 
             updated_at = NOW() 
         WHERE id = $1`,
        [sessionId, userMessage, response]
      );

      res.status(200).json({ ok: true, response, hookDetected, hookText });
    } catch (error) {
      console.error('Error sending coach message:', error);
      res.status(500).json({ ok: false, error: 'Failed to send coach message.' });
    }
  });

  router.post('/sessions/:id/extract', requireKey, async (req, res) => {
    try {
      const sessionId = req.params.id;
      const { transcript } = req.body;
      if (!transcript) {
        return res.status(400).json({ ok: false, error: 'Transcript is required.' });
      }

      const sessionCheck = await pool.query('SELECT id FROM marketing_sessions WHERE id = $1', [sessionId]);
      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Session not found.' });
      }

      const extractions = await extractFromTranscript(transcript, sessionId, pool);
      res.status(200).json({ ok: true, extractions });
    } catch (error) {
      console.error('Error extracting from transcript:', error);
      res.status(500).json({ ok: false, error: 'Failed to extract from transcript.' });
    }
  });

  router.post('/sessions/:id/generate', requireKey, async (req, res) => {
    try {
      const sessionId = req.params.id;
      const { extractions, channelProfile } = req.body;
      if (!extractions || !channelProfile) {
        return res.status(400).json({ ok: false, error: 'Extractions and channelProfile are required.' });
      }

      const sessionCheck = await pool.query('SELECT id FROM marketing_sessions WHERE id = $1', [sessionId]);
      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Session not found.' });
      }

      const generatedPieces = await generatePieces(sessionId, extractions, channelProfile, pool);
      res.status(200).json({ ok: true, generatedPieces });
    } catch (error) {
      console.error('Error generating pieces:', error);
      res.status(500).json({ ok: false, error: 'Failed to generate pieces.' });
    }
  });

  router.get('/sessions/:id', requireKey, async (req, res) => {
    try {
      const sessionId = req.params.id;
      const result = await pool.query('SELECT * FROM marketing_sessions WHERE id = $1', [sessionId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Session not found.' });
      }
      res.status(200).json({ ok: true, session: result.rows[0] });
    } catch (error) {
      console.error('Error getting session state:', error);
      res.status(500).json({ ok: false, error: 'Failed to retrieve session state.' });
    }
  });

  router.get('/sessions/:id/content', requireKey, async (req, res) => {
    try {
      const sessionId = req.params.id;
      const result = await pool.query(
        'SELECT id, session_id, piece_type, content_text, status, created_at, updated_at FROM marketing_content_pieces WHERE session_id = $1 ORDER BY created_at ASC',
        [sessionId]
      );
      res.status(200).json({ ok: true, contentPieces: result.rows });
    } catch (error) {
      console.error('Error getting session content:', error);
      res.status(500).json({ ok: false, error: 'Failed to retrieve session content.' });
    }
  });

  router.patch('/content/:id', requireKey, async (req, res) => {
    try {
      const pieceId = req.params.id;
      const { status, hint } = req.body; // status can be 'approved', 'rejected', hint for regeneration

      const pieceCheck = await pool.query('SELECT id FROM marketing_content_pieces WHERE id = $1', [pieceId]);
      if (pieceCheck.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Content piece not found.' });
      }

      if (status) {
        const validStatuses = ['approved', 'rejected', 'pending', 'regenerating']; // Assuming these are valid from CHECK constraint
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ ok: false, error: `Invalid status: ${status}.` });
        }
        await pool.query(
          'UPDATE marketing_content_pieces SET status = $1, updated_at = NOW() WHERE id = $2',
          [status, pieceId]
        );
        res.status(200).json({ ok: true, message: `Content piece ${pieceId} status updated to ${status}.` });
      } else if (hint) {
        // Regenerate
        const regeneratedPiece = await regeneratePiece(pieceId, hint, pool);
        res.status(200).json({ ok: true, regeneratedPiece });
      } else {
        return res.status(400).json({ ok: false, error: 'No status or hint provided for update/regeneration.' });
      }
    } catch (error) {
      console.error('Error updating/regenerating content piece:', error);
      res.status(500).json({ ok: false, error: 'Failed to update or regenerate content piece.' });
    }
  });

  router.get('/sessions/:id/export', requireKey, async (req, res) => {
    try {
      const sessionId = req.params.id;
      const result = await pool.query(
        'SELECT piece_type, content_text FROM marketing_content_pieces WHERE session_id = $1 AND status = $2 ORDER BY created_at ASC',
        [sessionId, 'approved']
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'No approved content found for this session.' });
      }

      let exportText = '';
      result.rows.forEach(piece => {
        exportText += `--- ${piece.piece_type.toUpperCase()} ---\n${piece.content_text}\n\n`;
      });

      res.setHeader('Content-Disposition', `attachment; filename="marketing-content-session-${sessionId}.txt"`);
      res.setHeader('Content-Type', 'text/plain');
      res.status(200).send(exportText);
    } catch (error) {
      console.error('Error exporting session content:', error);
      res.status(500).json({ ok: false, error: 'Failed to export session content.' });
    }
  });

  router.get('/channel-profile', requireKey, async (req, res) => {
    try {
      const userId = req.user.id; // Assuming req.user.id is set by requireKey or similar auth middleware
      const result = await pool.query('SELECT * FROM marketing_channel_profiles WHERE user_id = $1', [userId]);
      if (result.rows.length === 0) {
        return res.status(200).json({ ok: true, profile: null, message: 'No channel profile found for user.' });
      }
      res.status(200).json({ ok: true, profile: result.rows[0] });
    } catch (error) {
      console.error('Error getting channel profile:', error);
      res.status(500).json({ ok: false, error: 'Failed to retrieve channel profile.' });
    }
  });

  router.put('/channel-profile', requireKey, async (req, res) => {
    try {
      const userId = req.user.id; // Assuming req.user.id is set by requireKey or similar auth middleware
      const { profile_data } = req.body; // profile_data should be a JSONB object

      if (!profile_data) {
        return res.status(400).json({ ok: false, error: 'profile_data is required.' });
      }

      const result = await pool.query(
        `INSERT INTO marketing_channel_profiles (user_id, profile_data, created_at, updated_at) 
         VALUES ($1, $2, NOW(), NOW()) 
         ON CONFLICT (user_id) DO UPDATE SET profile_data = $2, updated_at = NOW() 
         RETURNING *`,
        [userId, profile_data]
      );
      res.status(200).json({ ok: true, profile: result.rows[0] });
    } catch (error) {
      console.error('Error creating/updating channel profile:', error);
      res.status(500).json({ ok: false, error: 'Failed to create or update channel profile.' });
    }
  });

  app.use('/api/v1/marketing', router);
}

export default router;