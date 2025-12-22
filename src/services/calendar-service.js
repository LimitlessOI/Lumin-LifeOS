// src/services/calendar-service.js
// Calendar management for appointments and training sessions

export class CalendarService {
  constructor(pool, callRecorder, activityTracker) {
    this.pool = pool;
    this.callRecorder = callRecorder;
    this.activityTracker = activityTracker;
  }

  /**
   * Create a calendar event
   */
  async createEvent(agentId, eventData) {
    try {
      const {
        event_type,
        title,
        description,
        start_time,
        end_time,
        location,
        client_name,
        client_email,
        client_phone,
        property_address,
        is_recurring,
        recurrence_pattern,
        auto_record
      } = eventData;

      const result = await this.pool.query(
        `INSERT INTO agent_calendar_events 
         (agent_id, event_type, title, description, start_time, end_time, location,
          client_name, client_email, client_phone, property_address, is_recurring, 
          recurrence_pattern, auto_record)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          agentId,
          event_type,
          title,
          description || null,
          new Date(start_time),
          new Date(end_time),
          location || null,
          client_name || null,
          client_email || null,
          client_phone || null,
          property_address || null,
          is_recurring || false,
          recurrence_pattern ? JSON.stringify(recurrence_pattern) : null,
          auto_record !== false // Default true
        ]
      );

      return { ok: true, event: result.rows[0] };
    } catch (error) {
      console.error('Create calendar event error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Get events for an agent
   */
  async getEvents(agentId, startDate, endDate) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM agent_calendar_events
         WHERE agent_id = $1 
           AND start_time >= $2 
           AND start_time <= $3
         ORDER BY start_time ASC`,
        [agentId, new Date(startDate), new Date(endDate)]
      );

      return { ok: true, events: result.rows };
    } catch (error) {
      console.error('Get calendar events error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Handle event start - auto-start recording if needed
   */
  async handleEventStart(eventId) {
    try {
      const event = await this.pool.query(
        `SELECT * FROM agent_calendar_events WHERE id = $1`,
        [eventId]
      );

      if (event.rows.length === 0) {
        return { ok: false, error: 'Event not found' };
      }

      const evt = event.rows[0];

      // Auto-start recording for calls/appointments if enabled
      if (evt.auto_record && 
          (evt.event_type === 'appointment' || evt.event_type === 'showing' || evt.event_type === 'meeting')) {
        
        if (this.callRecorder) {
          const recording = await this.callRecorder.startRecording(
            evt.agent_id,
            evt.event_type === 'showing' ? 'showing_presentation' : 'phone_call',
            {
              client_name: evt.client_name,
              client_email: evt.client_email,
              client_phone: evt.client_phone,
              property_address: evt.property_address
            }
          );

          if (recording.ok) {
            // Store recording ID in event metadata
            await this.pool.query(
              `UPDATE agent_calendar_events 
               SET metadata = jsonb_build_object('recording_id', $1, 'recording_call_id', $2)
               WHERE id = $3`,
              [recording.recording_id, recording.call_id, eventId]
            );

            return {
              ok: true,
              recording_started: true,
              recording: recording
            };
          }
        }
      }

      return { ok: true, recording_started: false };
    } catch (error) {
      console.error('Handle event start error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Mark event as completed
   */
  async completeEvent(eventId, outcome = null) {
    try {
      const event = await this.pool.query(
        `SELECT * FROM agent_calendar_events WHERE id = $1`,
        [eventId]
      );

      if (event.rows.length === 0) {
        return { ok: false, error: 'Event not found' };
      }

      const evt = event.rows[0];

      // Stop recording if active
      if (evt.metadata && evt.metadata.recording_call_id && this.callRecorder) {
        await this.callRecorder.stopRecording(evt.metadata.recording_call_id);
      }

      // Record activity
      if (this.activityTracker) {
        await this.activityTracker.recordActivity(evt.agent_id, {
          activity_type: evt.event_type,
          client_name: evt.client_name,
          client_email: evt.client_email,
          client_phone: evt.client_phone,
          property_address: evt.property_address,
          outcome: outcome || 'completed',
          notes: `Completed: ${evt.title}`
        });
      }

      // Update event status
      const result = await this.pool.query(
        `UPDATE agent_calendar_events 
         SET status = 'completed', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [eventId]
      );

      return { ok: true, event: result.rows[0] };
    } catch (error) {
      console.error('Complete event error:', error);
      return { ok: false, error: error.message };
    }
  }
}
