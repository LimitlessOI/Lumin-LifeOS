/**
 * routes/word-keeper-routes.js — Amendment 16 (Word Keeper & Integrity Engine)
 *
 * All Word Keeper API endpoints. Requires COMMAND_CENTER_KEY header.
 *
 * Mounted at: /api/v1/word-keeper
 */

import express from 'express';
import multer from 'multer';
import { createCommitmentDetector } from '../services/commitment-detector.js';
import { createIntegrityEngine } from '../services/integrity-engine.js';
import { createMediatorService } from '../services/mediator-service.js';
import { createTranscriber } from '../services/word-keeper-transcriber.js';
import { createGoogleCalendarService } from '../services/google-calendar-service.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export function createWordKeeperRoutes({ pool, councilService, twilioService }) {
  const router    = express.Router();
  const detector  = createCommitmentDetector(councilService);
  const engine    = createIntegrityEngine(pool, councilService);
  const mediator  = createMediatorService(pool, councilService);
  const transcriber = createTranscriber();
  const calendar  = createGoogleCalendarService(pool);

  // ── Auth middleware ─────────────────────────────────────────────────────
  // Bug fix: if COMMAND_CENTER_KEY is not set, undefined !== undefined is FALSE,
  // meaning auth would silently PASS for any request. Now explicit: reject if
  // the env var is missing OR the key doesn't match.
  router.use((req, res, next) => {
    const expectedKey = process.env.COMMAND_CENTER_KEY;
    if (!expectedKey) {
      return res.status(503).json({ error: 'Service not configured (COMMAND_CENTER_KEY missing)' });
    }
    const key = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (!key || key !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });

  // ── POST /transcript/audio — upload audio blob → Whisper → scan ─────────
  // The phone PWA sends 60-second webm chunks here via FormData.
  // Whisper transcribes, commitment detector scans, results returned immediately.
  router.post('/transcript/audio', upload.single('audio'), async (req, res) => {
    try {
      const { userId, chunkIndex, context } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded' });
      }

      // Transcribe via Whisper
      const transcript = await transcriber.transcribeFormData(req.file);

      if (!transcript) {
        return res.json({ transcript: '', commitmentsDetected: 0, commitments: [] });
      }

      // Store transcript (24h TTL enforced at DB level)
      const { rows } = await pool.query(`
        INSERT INTO word_keeper_transcripts (user_id, chunk_index, transcript_text)
        VALUES ($1, $2, $3) RETURNING id
      `, [userId || 'adam', parseInt(chunkIndex) || 0, transcript]);

      const transcriptId = rows[0].id;

      // Scan for commitments
      const commitments = await detector.scan(transcript, context || '');

      // Store detected commitments
      const stored = [];
      for (const c of commitments) {
        const { rows: cRows } = await pool.query(`
          INSERT INTO commitments (
            user_id, raw_text, normalized_text, category, deadline, deadline_raw,
            to_person, relationship, confidence, detected_from, transcript_context, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'audio',$10,'pending')
          RETURNING id
        `, [
          userId || 'adam', c.rawText, c.normalizedText, c.category,
          c.deadline || null, c.deadlineRaw || null,
          c.toWhom || null, c.relationship || null,
          c.confidence, c.transcriptContext || context || null,
        ]);

        const commitmentId = cRows[0].id;
        stored.push({ commitmentId, ...c });

        await pool.query(`
          UPDATE word_keeper_transcripts
          SET has_commitment = TRUE, commitment_id = $1
          WHERE id = $2
        `, [commitmentId, transcriptId]);
      }

      res.json({ transcript, transcriptId, commitmentsDetected: stored.length, commitments: stored });
    } catch (err) {
      console.error('[WordKeeper] /transcript/audio error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /transcript — submit pre-transcribed text for scan ──────────────
  router.post('/transcript', async (req, res) => {
    try {
      const { transcriptText, context, userId, chunkIndex } = req.body;
      if (!transcriptText) return res.status(400).json({ error: 'transcriptText required' });

      // Store transcript (24h TTL enforced at DB level)
      const { rows } = await pool.query(`
        INSERT INTO word_keeper_transcripts (user_id, chunk_index, transcript_text)
        VALUES ($1, $2, $3) RETURNING id
      `, [userId || 'adam', chunkIndex || 0, transcriptText]);

      const transcriptId = rows[0].id;

      // Scan for commitments
      const commitments = await detector.scan(transcriptText, context);

      // If commitments found, store them as 'pending' + update transcript
      const stored = [];
      for (const c of commitments) {
        const { rows: cRows } = await pool.query(`
          INSERT INTO commitments (
            user_id, raw_text, normalized_text, category, deadline, deadline_raw,
            to_person, relationship, confidence, detected_from, transcript_context, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'audio',$10,'pending')
          RETURNING id
        `, [
          userId || 'adam', c.rawText, c.normalizedText, c.category,
          c.deadline || null, c.deadlineRaw || null,
          c.toWhom || null, c.relationship || null,
          c.confidence, c.transcriptContext || context || null,
        ]);

        const commitmentId = cRows[0].id;
        stored.push({ commitmentId, ...c });

        // Mark transcript as having a commitment
        await pool.query(`
          UPDATE word_keeper_transcripts
          SET has_commitment = TRUE, commitment_id = $1
          WHERE id = $2
        `, [commitmentId, transcriptId]);
      }

      res.json({
        transcriptId,
        commitmentsDetected: stored.length,
        commitments: stored,
      });
    } catch (err) {
      console.error('[WordKeeper] /transcript error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /commitments — list commitments ─────────────────────────────────
  router.get('/commitments', async (req, res) => {
    try {
      const { status, limit = 50, offset = 0, userId = 'adam' } = req.query;
      const params = [userId, parseInt(limit), parseInt(offset)];
      const statusClause = status ? `AND status = $4` : '';
      if (status) params.push(status);

      const { rows } = await pool.query(`
        SELECT * FROM commitments
        WHERE user_id = $1 ${statusClause}
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, params);

      res.json({ commitments: rows, count: rows.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /commitments — manually add a commitment ───────────────────────
  router.post('/commitments', async (req, res) => {
    try {
      const { rawText, userId = 'adam' } = req.body;
      if (!rawText) return res.status(400).json({ error: 'rawText required' });

      const details = await detector.extractDetails(rawText);

      const { rows } = await pool.query(`
        INSERT INTO commitments (
          user_id, raw_text, normalized_text, category, deadline, deadline_raw,
          to_person, confidence, detected_from, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'manual','pending')
        RETURNING *
      `, [
        userId,
        rawText,
        details?.normalizedText || rawText,
        details?.category || 'other',
        details?.deadline || null,
        details?.deadlineRaw || null,
        details?.toWhom || null,
        details?.confidence || 0.95,
      ]);

      // Schedule reminders if deadline exists
      const commitment = rows[0];
      if (commitment.deadline) {
        await scheduleReminders(pool, commitment);
      }

      res.json({ commitment, realityCheck: details?.realityCheck });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── PATCH /commitments/:id — confirm, update status, mark outcome ────────
  router.patch('/commitments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { action, notes, status, userId = 'adam' } = req.body;

      // action values: confirm, kept, broken, honourable_exit, renegotiate, decline
      if (action === 'confirm') {
        await pool.query(`
          UPDATE commitments SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
          WHERE id = $1
        `, [id]);

        // Schedule reminders now that it's confirmed
        const { rows } = await pool.query('SELECT * FROM commitments WHERE id = $1', [id]);
        if (rows[0]?.deadline) await scheduleReminders(pool, rows[0]);

        return res.json({ updated: true, status: 'confirmed' });
      }

      const EVENT_MAP = {
        kept:            'kept_on_time',
        broken:          'broken_no_notice',
        honourable_exit: 'honourable_exit',
        renegotiate:     'renegotiated_proactive',
      };

      const eventType = EVENT_MAP[action];
      if (eventType) {
        const result = await engine.recordOutcome(parseInt(id), eventType, { userId, notes });
        return res.json({ updated: true, ...result });
      }

      if (action === 'decline') {
        await pool.query(`
          UPDATE commitments SET status = 'declined', updated_at = NOW()
          WHERE id = $1
        `, [id]);
        return res.json({ updated: true, status: 'declined' });
      }

      // Generic status update
      if (status) {
        await pool.query(`
          UPDATE commitments SET status = $1, updated_at = NOW() WHERE id = $2
        `, [status, id]);
        return res.json({ updated: true, status });
      }

      res.status(400).json({ error: 'action or status required' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /score — current integrity score + breakdown ────────────────────
  router.get('/score', async (req, res) => {
    try {
      const { userId = 'adam' } = req.query;
      const score = await engine.getScore(userId);
      if (!score) return res.status(404).json({ error: 'No score found' });
      res.json(score);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /dashboard — full dashboard data ────────────────────────────────
  router.get('/dashboard', async (req, res) => {
    try {
      const { userId = 'adam' } = req.query;
      const [score, patterns] = await Promise.all([
        engine.getScore(userId),
        engine.getPatterns(userId),
      ]);

      // Pending commitments needing attention
      const { rows: pending } = await pool.query(`
        SELECT * FROM commitments
        WHERE user_id = $1 AND status IN ('pending','confirmed')
        ORDER BY deadline ASC NULLS LAST LIMIT 10
      `, [userId]);

      // Recent events
      const { rows: recentEvents } = await pool.query(`
        SELECT ie.*, c.normalized_text, c.to_person
        FROM integrity_events ie
        LEFT JOIN commitments c ON c.id = ie.commitment_id
        WHERE ie.user_id = $1
        ORDER BY ie.created_at DESC LIMIT 20
      `, [userId]);

      res.json({ score, patterns, pending, recentEvents });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /patterns — pattern analysis ────────────────────────────────────
  router.get('/patterns', async (req, res) => {
    try {
      const { userId = 'adam' } = req.query;
      const patterns = await engine.getPatterns(userId);
      res.json(patterns);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /exit/:id — generate honourable exit message ───────────────────
  router.post('/exit/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, alternative } = req.body;

      const { rows } = await pool.query('SELECT * FROM commitments WHERE id = $1', [id]);
      const commitment = rows[0];
      if (!commitment) return res.status(404).json({ error: 'Commitment not found' });

      const prompt = `Draft an honourable exit message for this commitment.

Original commitment: "${commitment.normalized_text || commitment.raw_text}"
To: ${commitment.to_person || 'the person'}
Reason (optional): ${reason || 'not specified'}
Alternative offered: ${alternative || 'not specified'}

Script template:
"I committed to [X] by [date]. I'm not going to be able to keep that. I take responsibility for that. [Brief honest reason if appropriate.] Here's what I can offer instead: [alternative]. I'm sorry for any inconvenience this causes."

Generate 2 versions: one formal, one casual. Return ONLY valid JSON:
{
  "formal": "string",
  "casual": "string"
}`;

      let messages = { formal: '', casual: '' };
      try {
        const response = await councilService.ask(prompt, {
          model: 'claude',
          taskType: 'summary',
          temperature: 0.6,
        });
        const text = (response?.content || response?.text || response || '').trim();
        const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
        messages = JSON.parse(cleaned);
      } catch {
        messages.formal = `I committed to ${commitment.normalized_text || commitment.raw_text}. I'm not able to keep that commitment. I take full responsibility. ${alternative ? `Here's what I can offer instead: ${alternative}.` : ''} I apologize for any inconvenience.`;
        messages.casual = messages.formal;
      }

      res.json({ commitmentId: id, messages });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Mediator endpoints ─────────────────────────────────────────────────

  // POST /mediator/start
  router.post('/mediator/start', async (req, res) => {
    try {
      const { userId = 'adam', otherParty, triggerMethod } = req.body;
      const session = await mediator.startSession({ userId, otherParty, triggerMethod });
      res.json(session);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /mediator/:id/speak
  router.post('/mediator/:id/speak', async (req, res) => {
    try {
      const { id } = req.params;
      const { party, statement, userId } = req.body;
      if (!party || !statement) {
        return res.status(400).json({ error: 'party and statement required' });
      }
      const result = await mediator.submitStatement(parseInt(id), { party, statement, userId });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /mediator/:id/consent
  router.post('/mediator/:id/consent', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await mediator.grantConsent(parseInt(id));
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /mediator/:id/analysis
  router.get('/mediator/:id/analysis', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await mediator.getAnalysis(parseInt(id));
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /mediator/:id/close
  router.post('/mediator/:id/close', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await mediator.closeSession(parseInt(id));
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Google Calendar endpoints ──────────────────────────────────────────

  // GET /calendar/status
  router.get('/calendar/status', async (req, res) => {
    try {
      const status = await calendar.getStatus(req.query.userId || 'adam');
      res.json(status);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // GET /calendar/connect — returns OAuth2 URL for Google Calendar
  router.get('/calendar/connect', async (req, res) => {
    try {
      const result = await calendar.getAuthUrl(req.query.userId || 'adam');
      if (result.error) return res.status(503).json(result);
      res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // GET /calendar/callback — OAuth2 redirect (no auth header — comes from Google)
  router.get('/calendar/callback', async (req, res) => {
    try {
      const { code, state: userId } = req.query;
      if (!code) return res.status(400).send('Missing auth code');
      await calendar.handleCallback(code, userId || 'adam');
      res.send('<h2>✅ Google Calendar connected!</h2><p>You can close this tab.</p><script>window.close();</script>');
    } catch (err) { res.status(500).send(`Connection failed: ${err.message}`); }
  });

  // POST /calendar/add/:id — add commitment to Google Calendar
  router.post('/calendar/add/:id', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM commitments WHERE id = $1', [req.params.id]);
      if (!rows[0]) return res.status(404).json({ error: 'Commitment not found' });
      const result = await calendar.addCommitment(parseInt(req.params.id), rows[0], req.body.userId || 'adam');
      res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // DELETE /calendar/remove/:id
  router.delete('/calendar/remove/:id', async (req, res) => {
    try {
      const result = await calendar.removeCommitment(parseInt(req.params.id), req.body.userId || 'adam');
      res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  return router;
}

// ── Helper: schedule reminders for a confirmed commitment ──────────────────
async function scheduleReminders(pool, commitment) {
  if (!commitment.deadline) return;

  const deadline = new Date(commitment.deadline);
  const remind24h = new Date(deadline.getTime() - 24 * 60 * 60 * 1000);
  const remind1h  = new Date(deadline.getTime() - 60 * 60 * 1000);
  const now = new Date();

  const reminders = [];

  if (commitment.remind_24h !== false && remind24h > now) {
    reminders.push([
      commitment.id,
      remind24h.toISOString(),
      '24h',
      'sms',
      `Your commitment: "${commitment.normalized_text || commitment.raw_text}" — due tomorrow.`,
    ]);
  }

  if (commitment.remind_1h !== false && remind1h > now) {
    reminders.push([
      commitment.id,
      remind1h.toISOString(),
      '1h',
      'sms',
      `1 hour until your commitment: "${commitment.normalized_text || commitment.raw_text}" — ready?`,
    ]);
  }

  // Deadline reminder
  if (deadline > now) {
    reminders.push([
      commitment.id,
      deadline.toISOString(),
      'deadline',
      'overlay',
      `Your commitment to ${commitment.to_person || 'yourself'} is due now. How did it go?`,
    ]);
  }

  for (const [cId, remindAt, type, channel, msg] of reminders) {
    // Bug fix: ON CONFLICT DO NOTHING requires a conflict target (unique constraint).
    // commitment_reminders has none, so we use a check instead.
    const { rows: existing } = await pool.query(`
      SELECT id FROM commitment_reminders
      WHERE commitment_id = $1 AND type = $2 AND channel = $3
      LIMIT 1
    `, [cId, type, channel]).catch(() => ({ rows: [] }));

    if (!existing.length) {
      await pool.query(`
        INSERT INTO commitment_reminders (commitment_id, remind_at, type, channel, message_text)
        VALUES ($1, $2, $3, $4, $5)
      `, [cId, remindAt, type, channel, msg]).catch(() => {});
    }
  }
}
