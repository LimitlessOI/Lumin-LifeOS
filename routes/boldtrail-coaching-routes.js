/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║              BOLDTRAIL COACHING API ROUTES                                       ║
 * ║              Sales coaching, call recording, technique analysis                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * NEW endpoints for real estate sales coaching:
 * - POST /api/v1/boldtrail/start-recording - Start call/showing recording
 * - POST /api/v1/boldtrail/stop-recording - Stop and analyze recording
 * - POST /api/v1/boldtrail/mark-moment - Mark good/bad moment
 * - GET /api/v1/boldtrail/coaching-clips/:agentId - Get coaching clips
 * - GET /api/v1/boldtrail/technique-patterns/:agentId - Get bad habits
 */

import { SalesTechniqueAnalyzer } from '../core/sales-technique-analyzer.js';

export function registerBoldTrailCoachingRoutes(app, pool, callCouncilMember, requireKey) {
  const analyzer = new SalesTechniqueAnalyzer(callCouncilMember, pool);

  /**
   * POST /api/v1/boldtrail/start-recording
   * Start recording a call or showing
   */
  app.post('/api/v1/boldtrail/start-recording', requireKey, async (req, res) => {
    try {
      const { agent_id, recording_type = 'phone_call', client_name, client_phone } = req.body;

      if (!agent_id) {
        return res.status(400).json({ ok: false, error: 'agent_id required' });
      }

      // Generate unique call ID
      const call_id = `call_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      // Insert recording record
      const result = await pool.query(
        `INSERT INTO sales_call_recordings
         (agent_id, call_id, call_type, client_name, client_phone, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, call_id`,
        [agent_id, call_id, recording_type, client_name || null, client_phone || null]
      );

      console.log(`🎙️ [RECORDING] Started: ${call_id} for agent ${agent_id}`);

      res.json({
        ok: true,
        call_id,
        recording_id: result.rows[0].id,
        message: 'Recording started',
      });
    } catch (error) {
      console.error('Start recording error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /api/v1/boldtrail/stop-recording
   * Stop recording and analyze
   */
  app.post('/api/v1/boldtrail/stop-recording', requireKey, async (req, res) => {
    try {
      const { call_id, transcript, duration } = req.body;

      if (!call_id) {
        return res.status(400).json({ ok: false, error: 'call_id required' });
      }

      // Get recording
      const recording = await pool.query(
        `SELECT id, agent_id, transcript FROM sales_call_recordings WHERE call_id = $1`,
        [call_id]
      );

      if (recording.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Recording not found' });
      }

      const rec = recording.rows[0];
      const finalTranscript = transcript || rec.transcript || '';

      // Analyze transcript
      let analysis = { ok: true, overall_score: 7.0, summary: 'No transcript to analyze' };

      if (finalTranscript && finalTranscript.length > 50) {
        analysis = await analyzer.analyzeCall(finalTranscript, { duration });
      }

      // Update recording with analysis
      await pool.query(
        `UPDATE sales_call_recordings
         SET transcript = $1,
             duration = $2,
             overall_score = $3,
             analysis_complete = TRUE,
             ai_analysis = $4,
             analyzed_at = NOW()
         WHERE call_id = $5`,
        [
          finalTranscript,
          duration || 0,
          analysis.overall_score || 7.0,
          JSON.stringify(analysis),
          call_id,
        ]
      );

      // Store coaching clips
      if (analysis.moments_to_review && analysis.moments_to_review.length > 0) {
        for (const moment of analysis.moments_to_review) {
          // Parse timestamp (e.g., "2:30" -> 150 seconds)
          const startTime = parseTimestamp(moment.timestamp) || 0;
          const endTime = startTime + 30; // 30 second clip

          await pool.query(
            `INSERT INTO coaching_clips
             (recording_id, agent_id, clip_type, start_time, end_time,
              technique_detected, coaching_suggestion, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              rec.id,
              rec.agent_id,
              moment.clip_type || 'coaching_needed',
              startTime,
              endTime,
              moment.reason || 'Moment to review',
              moment.coaching_suggestion || '',
            ]
          );
        }
      }

      // Store bad habits
      if (analysis.techniques_detected && analysis.techniques_detected.poor) {
        for (const poor of analysis.techniques_detected.poor) {
          await analyzer.storeBadHabitPattern(
            rec.agent_id,
            poor.technique,
            poor.severity || 'medium'
          );
        }
      }

      console.log(`✅ [RECORDING] Analyzed: ${call_id} - Score: ${analysis.overall_score}/10`);

      res.json({
        ok: true,
        analysis,
        message: 'Recording stopped and analyzed',
      });
    } catch (error) {
      console.error('Stop recording error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /api/v1/boldtrail/mark-moment
   * Mark a specific moment as good or needing coaching
   */
  app.post('/api/v1/boldtrail/mark-moment', requireKey, async (req, res) => {
    try {
      const { call_id, moment_type, start_time, end_time, notes } = req.body;

      if (!call_id || !moment_type) {
        return res.status(400).json({ ok: false, error: 'call_id and moment_type required' });
      }

      // Get recording
      const recording = await pool.query(
        `SELECT id, agent_id FROM sales_call_recordings WHERE call_id = $1`,
        [call_id]
      );

      if (recording.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Recording not found' });
      }

      const rec = recording.rows[0];

      // Insert coaching clip
      const result = await pool.query(
        `INSERT INTO coaching_clips
         (recording_id, agent_id, clip_type, start_time, end_time, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id`,
        [
          rec.id,
          rec.agent_id,
          moment_type === 'good' ? 'good_moment' : 'coaching_needed',
          start_time || 0,
          end_time || 30,
          notes || '',
        ]
      );

      console.log(`📌 [MOMENT] Marked ${moment_type} moment in ${call_id}`);

      res.json({
        ok: true,
        clip_id: result.rows[0].id,
        message: 'Moment marked',
      });
    } catch (error) {
      console.error('Mark moment error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * GET /api/v1/boldtrail/coaching-clips/:agentId
   * Get coaching clips for an agent
   */
  app.get('/api/v1/boldtrail/coaching-clips/:agentId', requireKey, async (req, res) => {
    try {
      const { agentId } = req.params;
      const { limit = 10, clip_type } = req.query;

      let query = `
        SELECT cc.*, scr.call_id, scr.client_name, scr.created_at as call_date
        FROM coaching_clips cc
        JOIN sales_call_recordings scr ON cc.recording_id = scr.id
        WHERE cc.agent_id = $1
      `;

      const params = [agentId];

      if (clip_type) {
        query += ` AND cc.clip_type = $${params.length + 1}`;
        params.push(clip_type);
      }

      query += ` ORDER BY cc.created_at DESC LIMIT $${params.length + 1}`;
      params.push(parseInt(limit));

      const result = await pool.query(query, params);

      res.json({
        ok: true,
        clips: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      console.error('Get coaching clips error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * GET /api/v1/boldtrail/technique-patterns/:agentId
   * Get bad habits or good practices for an agent
   */
  app.get('/api/v1/boldtrail/technique-patterns/:agentId', requireKey, async (req, res) => {
    try {
      const { agentId } = req.params;
      const { pattern_type = 'bad_habit' } = req.query;

      const result = await pool.query(
        `SELECT technique_name, frequency, last_detected, created_at
         FROM sales_technique_patterns
         WHERE agent_id = $1 AND pattern_type = $2
         ORDER BY frequency DESC, last_detected DESC
         LIMIT 20`,
        [agentId, pattern_type]
      );

      res.json({
        ok: true,
        [pattern_type === 'bad_habit' ? 'bad_habits' : 'good_practices']: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      console.error('Get technique patterns error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * GET /api/v1/boldtrail/call-history/:agentId
   * Get call recording history for an agent
   */
  app.get('/api/v1/boldtrail/call-history/:agentId', requireKey, async (req, res) => {
    try {
      const { agentId } = req.params;
      const { limit = 20 } = req.query;

      const result = await pool.query(
        `SELECT call_id, call_type, client_name, client_phone,
                duration, overall_score, analysis_complete, created_at
         FROM sales_call_recordings
         WHERE agent_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [agentId, parseInt(limit)]
      );

      // Calculate statistics
      const stats = {
        totalCalls: result.rows.length,
        averageScore: 0,
        analyzedCalls: 0,
      };

      if (result.rows.length > 0) {
        const analyzedCalls = result.rows.filter(r => r.analysis_complete && r.overall_score);
        stats.analyzedCalls = analyzedCalls.length;
        if (analyzedCalls.length > 0) {
          stats.averageScore = analyzedCalls.reduce((sum, r) => sum + parseFloat(r.overall_score), 0) / analyzedCalls.length;
          stats.averageScore = Math.round(stats.averageScore * 10) / 10;
        }
      }

      res.json({
        ok: true,
        calls: result.rows,
        stats,
      });
    } catch (error) {
      console.error('Get call history error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  console.log('✅ [ROUTES] BoldTrail Coaching routes registered');
}

/**
 * Parse timestamp string to seconds
 * "2:30" -> 150 seconds
 */
function parseTimestamp(timestamp) {
  if (!timestamp) return 0;

  try {
    const parts = String(timestamp).split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
  } catch (error) {
    return 0;
  }

  return 0;
}
