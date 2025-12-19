// src/services/relationship-mediation.js
// Relationship mediation system for personal and business conflicts

export class RelationshipMediation {
  constructor(pool, callCouncilWithFailover) {
    this.pool = pool;
    this.callCouncil = callCouncilWithFailover;
  }

  /**
   * Request mediation
   */
  async requestMediation(agentId, mediationData) {
    try {
      const {
        mediation_type,
        other_party_name,
        other_party_contact,
        issue_description,
        recording_consent = false
      } = mediationData;

      const result = await this.pool.query(
        `INSERT INTO agent_relationship_mediation 
         (agent_id, mediation_type, other_party_name, other_party_contact, 
          issue_description, recording_consent, mediation_status)
         VALUES ($1, $2, $3, $4, $5, $6, 'requested')
         RETURNING *`,
        [
          agentId,
          mediation_type,
          other_party_name,
          other_party_contact,
          issue_description,
          recording_consent
        ]
      );

      return { ok: true, mediation: result.rows[0] };
    } catch (error) {
      console.error('Request mediation error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Start mediation session
   */
  async startMediation(mediationId, agentId) {
    try {
      const mediation = await this.pool.query(
        `SELECT * FROM agent_relationship_mediation 
         WHERE id = $1 AND agent_id = $2`,
        [mediationId, agentId]
      );

      if (mediation.rows.length === 0) {
        return { ok: false, error: 'Mediation not found' };
      }

      // Update status
      await this.pool.query(
        `UPDATE agent_relationship_mediation 
         SET mediation_status = 'in_progress'
         WHERE id = $1`,
        [mediationId]
      );

      return {
        ok: true,
        mediation: mediation.rows[0],
        guidelines: this.getMediationGuidelines(mediation.rows[0].mediation_type)
      };
    } catch (error) {
      console.error('Start mediation error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Get mediation guidelines based on type
   */
  getMediationGuidelines(type) {
    const guidelines = {
      spouse: {
        approach: 'Build relationship, not damage it',
        principles: [
          'Listen to understand, not to respond',
          'Focus on feelings, not blame',
          'Seek solutions that work for both',
          'Create greater love, not division'
        ],
        warnings: [
          'Avoid doing this in front of children',
          'Take breaks if emotions get too high',
          'Focus on repair, not winning'
        ]
      },
      child: {
        approach: 'Help child understand, not feel judged',
        principles: [
          'Debrief after, not during',
          'Text suggestions for healthy communication',
          'Help unpack what happened',
          'Focus on teaching, not punishment'
        ],
        warnings: [
          'Never mediate in front of child',
          'Child should not feel responsible for adult conflicts',
          'Focus on repair and understanding'
        ]
      },
      customer: {
        approach: 'Resolve conflict, avoid court',
        principles: [
          'Completely unbiased, no judgment',
          'Listen to both sides',
          'Find mutually acceptable solution',
          'Create written agreement'
        ],
        outcome: 'Like Judge Judy - both parties accept outcome'
      },
      business: {
        approach: 'Professional conflict resolution',
        principles: [
          'Neutral third party',
          'Focus on business outcomes',
          'Document agreements',
          'Maintain relationships'
        ]
      }
    };

    return guidelines[type] || guidelines.business;
  }

  /**
   * Process mediation (AI-assisted)
   */
  async processMediation(mediationId, conversationData) {
    try {
      const mediation = await this.pool.query(
        `SELECT * FROM agent_relationship_mediation WHERE id = $1`,
        [mediationId]
      );

      if (mediation.rows.length === 0) {
        return { ok: false, error: 'Mediation not found' };
      }

      const med = mediation.rows[0];

      // Use AI to help mediate
      const prompt = `You are a neutral mediator helping resolve a ${med.mediation_type} conflict.

Issue: ${med.issue_description}

Conversation so far:
${conversationData.conversation || 'Just starting'}

Guidelines:
${JSON.stringify(this.getMediationGuidelines(med.mediation_type))}

Provide:
1. Next question to ask (to understand both sides)
2. Reframing of the issue (to help both parties see it differently)
3. Suggested solution (that both might accept)
4. What to say next (to move toward resolution)

Return JSON:
{
  "next_question": "...",
  "reframing": "...",
  "suggested_solution": "...",
  "what_to_say": "..."
}`;

      const response = await this.callCouncil(prompt, 'chatgpt');
      
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        const guidance = JSON.parse(jsonMatch ? jsonMatch[0] : response);
        
        return {
          ok: true,
          guidance: guidance
        };
      } catch {
        return {
          ok: true,
          guidance: {
            next_question: 'Can you help me understand what you need?',
            reframing: 'Let\'s look at this from a different angle',
            suggested_solution: 'Find a solution that works for both',
            what_to_say: 'I hear you. Let\'s work together on this.'
          }
        };
      }
    } catch (error) {
      console.error('Process mediation error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Create agreement
   */
  async createAgreement(mediationId, agreementText) {
    try {
      const result = await this.pool.query(
        `UPDATE agent_relationship_mediation 
         SET agreement_text = $1,
             both_parties_accepted = FALSE,
             mediation_status = 'pending_acceptance'
         WHERE id = $2
         RETURNING *`,
        [agreementText, mediationId]
      );

      return { ok: true, mediation: result.rows[0] };
    } catch (error) {
      console.error('Create agreement error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Accept agreement
   */
  async acceptAgreement(mediationId, party = 'agent') {
    try {
      // For now, just mark as accepted
      // In full implementation, would track both parties
      const result = await this.pool.query(
        `UPDATE agent_relationship_mediation 
         SET both_parties_accepted = TRUE,
             mediation_status = 'resolved',
             resolved_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [mediationId]
      );

      return { ok: true, mediation: result.rows[0] };
    } catch (error) {
      console.error('Accept agreement error:', error);
      return { ok: false, error: error.message };
    }
  }
}
