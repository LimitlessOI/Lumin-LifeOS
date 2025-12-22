// src/services/sales-technique-analyzer.js
// Analyzes sales call transcripts to detect poor techniques and good practices

export class SalesTechniqueAnalyzer {
  constructor(pool, callCouncilWithFailover) {
    this.pool = pool;
    this.callCouncil = callCouncilWithFailover;
    
    // Common bad sales habits to detect
    this.badHabits = [
      'interrupting_client',
      'talking_too_much',
      'not_listening',
      'pushing_too_hard',
      'ignoring_objections',
      'using_jargon',
      'being_defensive',
      'making_assumptions',
      'rushing_the_close',
      'not_building_rapport'
    ];
    
    // Good practices to recognize
    this.goodPractices = [
      'active_listening',
      'asking_open_questions',
      'addressing_objections',
      'building_rapport',
      'showing_empathy',
      'providing_value',
      'following_up_properly',
      'being_authentic'
    ];
  }

  /**
   * Analyze a call transcript for sales techniques
   */
  async analyzeCall(transcript, agentId, callId) {
    try {
      const analysisPrompt = `Analyze this sales call transcript for a real estate agent. Identify:

1. POOR SALES TECHNIQUES (bad habits):
   - Interrupting the client
   - Talking too much (agent speaking >60% of time)
   - Not listening to client needs
   - Pushing too hard for a close
   - Ignoring or dismissing objections
   - Using too much jargon
   - Being defensive
   - Making assumptions without asking
   - Rushing the close
   - Not building rapport

2. GOOD SALES PRACTICES:
   - Active listening (asking follow-up questions)
   - Asking open-ended questions
   - Properly addressing objections
   - Building rapport and connection
   - Showing empathy
   - Providing value/insights
   - Following up properly
   - Being authentic

3. SPECIFIC MOMENTS:
   - Timestamp ranges where poor techniques occurred
   - Timestamp ranges where good practices were demonstrated
   - Specific quotes/examples

Return JSON format:
{
  "poor_techniques": [
    {
      "technique": "interrupting_client",
      "severity": "high",
      "timestamp_start": 45,
      "timestamp_end": 52,
      "transcript_segment": "...",
      "coaching_suggestion": "..."
    }
  ],
  "good_practices": [
    {
      "technique": "active_listening",
      "timestamp_start": 120,
      "timestamp_end": 135,
      "transcript_segment": "...",
      "strength": "excellent"
    }
  ],
  "overall_score": 7.5,
  "summary": "..."
}

Transcript:
${transcript}`;

      const analysisText = await this.callCouncil(analysisPrompt, 'chatgpt');
      
      // Parse JSON from response
      let analysis;
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/) || 
                         analysisText.match(/```\s*([\s\S]*?)\s*```/) ||
                         analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          analysis = JSON.parse(analysisText);
        }
      } catch (parseError) {
        // Fallback: try to extract structured data manually
        console.warn('Failed to parse AI analysis as JSON, using fallback:', parseError.message);
        analysis = this.fallbackAnalysis(transcript);
      }

      // Store analysis in database
      await this.pool.query(
        `UPDATE sales_call_recordings 
         SET ai_analysis = $1, analyzed_at = NOW(), status = 'analyzed'
         WHERE id = $2`,
        [JSON.stringify(analysis), callId]
      );

      // Extract and store coaching clips
      await this.extractCoachingClips(analysis, agentId, callId);

      // Update technique patterns
      await this.updateTechniquePatterns(analysis, agentId);

      return analysis;
    } catch (error) {
      console.error('Sales technique analysis error:', error);
      throw error;
    }
  }

  /**
   * Extract coaching clips from analysis
   */
  async extractCoachingClips(analysis, agentId, callId) {
    const clips = [];

    // Extract poor technique clips
    if (analysis.poor_techniques && Array.isArray(analysis.poor_techniques)) {
      for (const technique of analysis.poor_techniques) {
        clips.push({
          recording_id: callId,
          agent_id: agentId,
          clip_type: 'coaching_needed',
          start_time: technique.timestamp_start || 0,
          end_time: technique.timestamp_end || 0,
          transcript_segment: technique.transcript_segment || '',
          ai_analysis: JSON.stringify(technique),
          technique_detected: technique.technique,
          severity: technique.severity || 'medium',
          coaching_suggestion: technique.coaching_suggestion || ''
        });
      }
    }

    // Extract good practice clips
    if (analysis.good_practices && Array.isArray(analysis.good_practices)) {
      for (const practice of analysis.good_practices) {
        clips.push({
          recording_id: callId,
          agent_id: agentId,
          clip_type: 'good_moment',
          start_time: practice.timestamp_start || 0,
          end_time: practice.timestamp_end || 0,
          transcript_segment: practice.transcript_segment || '',
          ai_analysis: JSON.stringify(practice),
          technique_detected: practice.technique,
          severity: null,
          coaching_suggestion: null
        });
      }
    }

    // Insert clips
    for (const clip of clips) {
      await this.pool.query(
        `INSERT INTO coaching_clips 
         (recording_id, agent_id, clip_type, start_time, end_time, transcript_segment, 
          ai_analysis, technique_detected, severity, coaching_suggestion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          clip.recording_id,
          clip.agent_id,
          clip.clip_type,
          clip.start_time,
          clip.end_time,
          clip.transcript_segment,
          clip.ai_analysis,
          clip.technique_detected,
          clip.severity,
          clip.coaching_suggestion
        ]
      );
    }

    return clips.length;
  }

  /**
   * Update technique patterns (track recurring bad habits)
   */
  async updateTechniquePatterns(analysis, agentId) {
    const techniques = new Map();

    // Collect all techniques from analysis
    if (analysis.poor_techniques) {
      for (const tech of analysis.poor_techniques) {
        const name = tech.technique;
        if (!techniques.has(name)) {
          techniques.set(name, { type: 'bad_habit', count: 0 });
        }
        techniques.get(name).count++;
      }
    }

    if (analysis.good_practices) {
      for (const practice of analysis.good_practices) {
        const name = practice.technique;
        if (!techniques.has(name)) {
          techniques.set(name, { type: 'good_practice', count: 0 });
        }
        techniques.get(name).count++;
      }
    }

    // Update or insert patterns
    for (const [techniqueName, data] of techniques.entries()) {
      const existing = await this.pool.query(
        `SELECT id, frequency FROM sales_technique_patterns 
         WHERE agent_id = $1 AND technique_name = $2`,
        [agentId, techniqueName]
      );

      if (existing.rows.length > 0) {
        // Update frequency
        await this.pool.query(
          `UPDATE sales_technique_patterns 
           SET frequency = frequency + $1, 
               last_detected = NOW(),
               updated_at = NOW()
           WHERE id = $2`,
          [data.count, existing.rows[0].id]
        );
      } else {
        // Insert new pattern
        await this.pool.query(
          `INSERT INTO sales_technique_patterns 
           (agent_id, technique_name, pattern_type, frequency)
           VALUES ($1, $2, $3, $4)`,
          [agentId, techniqueName, data.type, data.count]
        );
      }
    }
  }

  /**
   * Real-time analysis during call (streaming)
   */
  async analyzeRealTime(transcriptSegment, agentId, callId, currentTimestamp) {
    try {
      const prompt = `Analyze this segment from an ongoing sales call. Provide real-time coaching if needed.

Segment (timestamp ${currentTimestamp}s):
${transcriptSegment}

If you detect a poor sales technique happening RIGHT NOW, provide:
1. Immediate coaching suggestion (1-2 sentences)
2. Technique detected
3. Severity (low/medium/high)

Return JSON:
{
  "needs_coaching": true/false,
  "technique": "...",
  "severity": "...",
  "coaching_message": "...",
  "timestamp": ${currentTimestamp}
}`;

      const response = await this.callCouncil(prompt, 'chatgpt');
      
      let coaching;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        coaching = JSON.parse(jsonMatch ? jsonMatch[0] : response);
      } catch {
        return null; // Skip if can't parse
      }

      if (coaching.needs_coaching) {
        // Store real-time coaching event
        await this.pool.query(
          `INSERT INTO real_time_coaching_events 
           (recording_id, agent_id, event_type, timestamp, message, severity)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            callId,
            agentId,
            'suggestion',
            currentTimestamp,
            coaching.coaching_message,
            coaching.severity
          ]
        );

        return coaching;
      }

      return null;
    } catch (error) {
      console.error('Real-time analysis error:', error);
      return null;
    }
  }

  /**
   * Fallback analysis if AI parsing fails
   */
  fallbackAnalysis(transcript) {
    // Simple keyword-based fallback
    const wordCount = transcript.split(/\s+/).length;
    const agentWords = (transcript.match(/Agent:/g) || []).length;
    const clientWords = (transcript.match(/Client:/g) || []).length;
    
    const agentRatio = agentWords / (agentWords + clientWords);
    
    return {
      poor_techniques: agentRatio > 0.6 ? [{
        technique: 'talking_too_much',
        severity: 'medium',
        timestamp_start: 0,
        timestamp_end: 0,
        transcript_segment: 'Agent speaking more than 60% of conversation',
        coaching_suggestion: 'Try to listen more and ask open-ended questions'
      }] : [],
      good_practices: [],
      overall_score: agentRatio < 0.5 ? 8 : agentRatio < 0.6 ? 6 : 4,
      summary: `Agent spoke ${Math.round(agentRatio * 100)}% of the conversation`
    };
  }
}
