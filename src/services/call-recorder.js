// src/services/call-recorder.js
// Handles recording sales calls and presentations

export class CallRecorder {
  constructor(pool, salesAnalyzer) {
    this.pool = pool;
    this.analyzer = salesAnalyzer;
    this.activeRecordings = new Map(); // callId -> recording state
  }

  /**
   * Start recording a call or presentation
   */
  async startRecording(agentId, recordingType = 'phone_call', metadata = {}) {
    try {
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await this.pool.query(
        `INSERT INTO sales_call_recordings 
         (agent_id, call_id, recording_type, client_name, client_email, client_phone, property_address, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'recording')
         RETURNING *`,
        [
          agentId,
          callId,
          recordingType,
          metadata.client_name || null,
          metadata.client_email || null,
          metadata.client_phone || null,
          metadata.property_address || null
        ]
      );

      const recording = result.rows[0];
      
      // Store active recording state
      this.activeRecordings.set(callId, {
        recordingId: recording.id,
        agentId,
        startTime: Date.now(),
        transcript: [],
        segments: []
      });

      return {
        ok: true,
        call_id: callId,
        recording_id: recording.id,
        status: 'recording'
      };
    } catch (error) {
      console.error('Start recording error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Add transcript segment (real-time during call)
   */
  async addTranscriptSegment(callId, segment) {
    try {
      const state = this.activeRecordings.get(callId);
      if (!state) {
        return { ok: false, error: 'Recording not found' };
      }

      const timestamp = Math.floor((Date.now() - state.startTime) / 1000);
      
      state.transcript.push(segment);
      state.segments.push({
        timestamp,
        speaker: segment.speaker || 'unknown',
        text: segment.text || ''
      });

      // Update database
      await this.pool.query(
        `UPDATE sales_call_recordings 
         SET transcript_segments = $1
         WHERE call_id = $2`,
        [JSON.stringify(state.segments), callId]
      );

      // Real-time analysis (every 30 seconds or on key events)
      if (timestamp % 30 === 0 || segment.isKeyEvent) {
        const recentText = state.segments
          .slice(-10)
          .map(s => `${s.speaker}: ${s.text}`)
          .join('\n');
        
        const coaching = await this.analyzer.analyzeRealTime(
          recentText,
          state.agentId,
          state.recordingId,
          timestamp
        );

        if (coaching) {
          return {
            ok: true,
            coaching: coaching
          };
        }
      }

      return { ok: true };
    } catch (error) {
      console.error('Add transcript segment error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Stop recording and analyze
   */
  async stopRecording(callId, recordingUrl = null) {
    try {
      const state = this.activeRecordings.get(callId);
      if (!state) {
        return { ok: false, error: 'Recording not found' };
      }

      const duration = Math.floor((Date.now() - state.startTime) / 1000);
      const fullTranscript = state.segments
        .map(s => `${s.speaker}: ${s.text}`)
        .join('\n');

      // Update recording
      await this.pool.query(
        `UPDATE sales_call_recordings 
         SET status = 'completed',
             recording_url = $1,
             transcript = $2,
             transcript_segments = $3,
             duration = $4,
             completed_at = NOW()
         WHERE call_id = $5`,
        [
          recordingUrl,
          fullTranscript,
          JSON.stringify(state.segments),
          duration,
          callId
        ]
      );

      // Analyze the full call
      const analysis = await this.analyzer.analyzeCall(
        fullTranscript,
        state.agentId,
        state.recordingId
      );

      // Clean up active recording
      this.activeRecordings.delete(callId);

      return {
        ok: true,
        recording_id: state.recordingId,
        duration,
        analysis
      };
    } catch (error) {
      console.error('Stop recording error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Mark a moment (good or bad) during recording
   */
  async markMoment(callId, momentType, startTime, endTime, notes = '') {
    try {
      const state = this.activeRecordings.get(callId);
      if (!state) {
        return { ok: false, error: 'Recording not found' };
      }

      // Extract transcript segment
      const segment = state.segments
        .filter(s => s.timestamp >= startTime && s.timestamp <= endTime)
        .map(s => s.text)
        .join(' ');

      // Insert coaching clip
      const result = await this.pool.query(
        `INSERT INTO coaching_clips 
         (recording_id, agent_id, clip_type, start_time, end_time, transcript_segment, coaching_suggestion)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          state.recordingId,
          state.agentId,
          momentType === 'good' ? 'good_moment' : 'coaching_needed',
          startTime,
          endTime,
          segment,
          notes
        ]
      );

      return {
        ok: true,
        clip: result.rows[0]
      };
    } catch (error) {
      console.error('Mark moment error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Get active recording status
   */
  getRecordingStatus(callId) {
    const state = this.activeRecordings.get(callId);
    if (!state) {
      return null;
    }

    return {
      call_id: callId,
      recording_id: state.recordingId,
      duration: Math.floor((Date.now() - state.startTime) / 1000),
      segments_count: state.segments.length
    };
  }
}
