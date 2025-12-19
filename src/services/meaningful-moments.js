// src/services/meaningful-moments.js
// Meaningful moments recording and playback system

export class MeaningfulMoments {
  constructor(pool, callRecorder) {
    this.pool = pool;
    this.callRecorder = callRecorder;
    this.recordingBuffer = new Map(); // agentId -> {segments: [], startTime: Date}
  }

  /**
   * Start continuous recording (with consent)
   */
  async startContinuousRecording(agentId, consent = true, resetIntervalMinutes = 60) {
    try {
      if (!consent) {
        return { ok: false, error: 'Recording requires consent' };
      }

      // Store recording config
      this.recordingBuffer.set(agentId, {
        segments: [],
        startTime: new Date(),
        resetInterval: resetIntervalMinutes * 60 * 1000,
        lastReset: Date.now()
      });

      return {
        ok: true,
        message: 'Continuous recording started',
        reset_interval_minutes: resetIntervalMinutes
      };
    } catch (error) {
      console.error('Start continuous recording error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Capture meaningful moment
   */
  async captureMoment(agentId, momentData) {
    try {
      const {
        moment_type, // 'winning_moment', 'coaching_moment', 'breakthrough'
        recording_url,
        transcript,
        context,
        tags = []
      } = momentData;

      const result = await this.pool.query(
        `INSERT INTO agent_meaningful_moments 
         (agent_id, moment_type, recording_url, transcript, context, tags)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          agentId,
          moment_type,
          recording_url,
          transcript,
          context,
          JSON.stringify(tags)
        ]
      );

      return { ok: true, moment: result.rows[0] };
    } catch (error) {
      console.error('Capture moment error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Auto-detect meaningful moments from recording
   */
  async detectMoments(agentId, recordingId) {
    try {
      // Get recording
      const recording = await this.pool.query(
        `SELECT * FROM sales_call_recordings WHERE id = $1 AND agent_id = $2`,
        [recordingId, agentId]
      );

      if (recording.rows.length === 0) {
        return { ok: false, error: 'Recording not found' };
      }

      const rec = recording.rows[0];
      const transcript = rec.transcript || '';

      // Detect winning moments (positive outcomes, celebrations)
      const winningPatterns = [
        /appointment.*set/i,
        /deal.*closed/i,
        /sold/i,
        /excited/i,
        /perfect/i,
        /great.*news/i
      ];

      // Detect coaching moments (struggles, learning opportunities)
      const coachingPatterns = [
        /i.*don.*know/i,
        /struggl/i,
        /difficult/i,
        /help.*me/i,
        /not.*sure/i
      ];

      const moments = [];

      // Check for winning moments
      if (winningPatterns.some(pattern => pattern.test(transcript))) {
        moments.push({
          moment_type: 'winning_moment',
          context: 'Positive outcome detected in call',
          tags: ['success', 'achievement']
        });
      }

      // Check for coaching moments
      if (coachingPatterns.some(pattern => pattern.test(transcript))) {
        moments.push({
          moment_type: 'coaching_moment',
          context: 'Learning opportunity detected',
          tags: ['growth', 'learning']
        });
      }

      // Save moments
      for (const moment of moments) {
        await this.captureMoment(agentId, {
          ...moment,
          recording_url: rec.recording_url,
          transcript: transcript.substring(0, 500) // First 500 chars
        });
      }

      return { ok: true, moments_detected: moments.length, moments };
    } catch (error) {
      console.error('Detect moments error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Get moments for playback (when discouraged)
   */
  async getMomentsForPlayback(agentId, momentType = null) {
    try {
      let query = `
        SELECT * FROM agent_meaningful_moments
        WHERE agent_id = $1
      `;
      const params = [agentId];

      if (momentType) {
        query += ` AND moment_type = $2`;
        params.push(momentType);
      } else {
        // Default to winning moments when discouraged
        query += ` AND moment_type = 'winning_moment'`;
      }

      query += ` ORDER BY created_at DESC LIMIT 5`;

      const result = await this.pool.query(query, params);

      // Update playback count
      if (result.rows.length > 0) {
        await this.pool.query(
          `UPDATE agent_meaningful_moments 
           SET playback_count = playback_count + 1,
               last_played_at = NOW()
           WHERE id = ANY($1)`,
          [result.rows.map(r => r.id)]
        );
      }

      return { ok: true, moments: result.rows };
    } catch (error) {
      console.error('Get moments for playback error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Reset recording buffer (after interval)
   */
  async resetRecordingBuffer(agentId) {
    try {
      const buffer = this.recordingBuffer.get(agentId);
      if (!buffer) return { ok: false, error: 'No active recording' };

      const now = Date.now();
      if (now - buffer.lastReset >= buffer.resetInterval) {
        // Save any meaningful moments before reset
        // Then clear buffer
        buffer.segments = [];
        buffer.lastReset = now;

        return { ok: true, message: 'Recording buffer reset' };
      }

      return { ok: true, message: 'Not time to reset yet' };
    } catch (error) {
      console.error('Reset recording buffer error:', error);
      return { ok: false, error: error.message };
    }
  }
}
