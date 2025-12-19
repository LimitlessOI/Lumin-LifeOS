// src/services/activity-tracker.js
// Tracks all agent activities and calculates analytics

export class ActivityTracker {
  constructor(pool, callRecorder) {
    this.pool = pool;
    this.callRecorder = callRecorder;
  }

  /**
   * Record an activity
   */
  async recordActivity(agentId, activityData) {
    try {
      const {
        activity_type,
        activity_subtype,
        client_name,
        client_email,
        client_phone,
        property_address,
        duration,
        outcome,
        notes,
        recording_id,
        metadata
      } = activityData;

      const result = await this.pool.query(
        `INSERT INTO agent_activities 
         (agent_id, activity_type, activity_subtype, client_name, client_email, client_phone,
          property_address, duration, outcome, notes, recording_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          agentId,
          activity_type,
          activity_subtype || null,
          client_name || null,
          client_email || null,
          client_phone || null,
          property_address || null,
          duration || null,
          outcome || null,
          notes || null,
          recording_id || null,
          metadata ? JSON.stringify(metadata) : null
        ]
      );

      // Update goal progress if applicable
      await this.updateRelatedGoals(agentId, activityData);

      // Update analytics
      await this.updateAnalytics(agentId, activityData);

      return { ok: true, activity: result.rows[0] };
    } catch (error) {
      console.error('Record activity error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Auto-start recording for calls (if enabled)
   */
  async startCallWithRecording(agentId, callData) {
    try {
      // Check if agent has auto-record enabled
      const agent = await this.pool.query(
        `SELECT preferences FROM boldtrail_agents WHERE id = $1`,
        [agentId]
      );

      const preferences = agent.rows[0]?.preferences || {};
      const autoRecord = preferences.auto_record_calls !== false; // Default true

      let recordingId = null;
      let callId = null;

      if (autoRecord && this.callRecorder) {
        // Start recording
        const recording = await this.callRecorder.startRecording(
          agentId,
          'phone_call',
          {
            client_name: callData.client_name,
            client_email: callData.client_email,
            client_phone: callData.client_phone
          }
        );

        if (recording.ok) {
          callId = recording.call_id;
          recordingId = recording.recording_id;
        }
      }

      // Record the activity
      const activity = await this.recordActivity(agentId, {
        activity_type: 'call',
        activity_subtype: callData.call_type || 'phone_call',
        client_name: callData.client_name,
        client_email: callData.client_email,
        client_phone: callData.client_phone,
        recording_id: recordingId,
        metadata: {
          call_id: callId,
          auto_recorded: autoRecord
        }
      });

      return {
        ok: true,
        activity: activity.activity,
        recording: recordingId ? { call_id: callId, recording_id: recordingId } : null
      };
    } catch (error) {
      console.error('Start call with recording error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Get activity analytics for an agent
   */
  async getActivityAnalytics(agentId, period = '30 days') {
    try {
      const activities = await this.pool.query(
        `SELECT 
           activity_type,
           activity_subtype,
           outcome,
           COUNT(*) as count,
           AVG(duration) as avg_duration,
           COUNT(CASE WHEN outcome IN ('appointment_set', 'sale', 'showing_scheduled', 'interested') THEN 1 END) as success_count
         FROM agent_activities
         WHERE agent_id = $1 AND created_at >= NOW() - INTERVAL '${period}'
         GROUP BY activity_type, activity_subtype, outcome
         ORDER BY count DESC`,
        [agentId]
      );

      // Calculate best activities
      const activityTotals = {};
      activities.rows.forEach(row => {
        const key = row.activity_type;
        if (!activityTotals[key]) {
          activityTotals[key] = {
            total: 0,
            success: 0,
            avg_duration: 0
          };
        }
        activityTotals[key].total += parseInt(row.count);
        activityTotals[key].success += parseInt(row.success_count);
        activityTotals[key].avg_duration = parseFloat(row.avg_duration) || 0;
      });

      // Find best performing activity
      let bestActivity = null;
      let bestScore = 0;

      Object.entries(activityTotals).forEach(([type, data]) => {
        const successRate = data.total > 0 ? (data.success / data.total) * 100 : 0;
        const score = successRate * (data.total / 100); // Weighted score
        
        if (score > bestScore) {
          bestScore = score;
          bestActivity = {
            activity_type: type,
            total_count: data.total,
            success_count: data.success,
            success_rate: successRate,
            avg_duration: data.avg_duration
          };
        }
      });

      // Calculate areas needing improvement (low success rate but high activity)
      const improvementAreas = [];
      Object.entries(activityTotals).forEach(([type, data]) => {
        const successRate = data.total > 0 ? (data.success / data.total) * 100 : 0;
        if (data.total >= 5 && successRate < 20) { // Low success but frequent
          improvementAreas.push({
            activity_type: type,
            total_count: data.total,
            success_rate: successRate,
            recommendation: `Focus on improving ${type} skills - high volume but low conversion`
          });
        }
      });

      return {
        ok: true,
        analytics: {
          best_activity: bestActivity,
          improvement_areas: improvementAreas,
          activity_totals: activityTotals,
          period: period
        }
      };
    } catch (error) {
      console.error('Get activity analytics error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Update related goals when activity is recorded
   */
  async updateRelatedGoals(agentId, activityData) {
    try {
      // Find active goals related to this activity type
      const goals = await this.pool.query(
        `SELECT * FROM agent_goals 
         WHERE agent_id = $1 AND status = 'active' 
           AND (goal_type = $2 OR goal_type = 'custom')`,
        [agentId, activityData.activity_type]
      );

      for (const goal of goals.rows) {
        // Update goal progress based on activity
        let newValue = parseFloat(goal.current_value) || 0;

        if (goal.goal_type === activityData.activity_type) {
          if (activityData.outcome === 'sale' && goal.goal_type === 'sales') {
            newValue += 1;
          } else if (activityData.activity_type === 'call' && goal.goal_type === 'calls') {
            newValue += 1;
          } else if (activityData.outcome === 'appointment_set' && goal.goal_type === 'appointments') {
            newValue += 1;
          }
        }

        if (newValue !== parseFloat(goal.current_value)) {
          await this.pool.query(
            `UPDATE agent_goals SET current_value = $1, updated_at = NOW() WHERE id = $2`,
            [newValue, goal.id]
          );
        }
      }
    } catch (error) {
      console.error('Update related goals error:', error);
    }
  }

  /**
   * Update analytics aggregates
   */
  async updateAnalytics(agentId, activityData) {
    try {
      // This would typically run as a background job, but we can do simple updates here
      // For now, just log - full analytics can be calculated on-demand
    } catch (error) {
      console.error('Update analytics error:', error);
    }
  }
}
