/**
 * SYNOPSIS: Exports createLifereAppointmentCopilot — services/lifere-appointment-copilot.js.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
export function createLifereAppointmentCopilot({ pool, emailQueue, mlsSearch, crmUpdater }) {
  return {
    async processAppointmentTranscript(agentId, transcript) {
      const commitments = this.extractCommitments(transcript);
      const criteria = this.extractMlsCriteria(transcript);

      const capture = await pool.query(
        `INSERT INTO lifere_appointment_captures (agent_id, transcript, extracted_commitments, extracted_criteria)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [agentId, transcript, JSON.stringify(commitments), JSON.stringify(criteria)]
      );

      for (const promise of commitments) {
        await this.queueCrmUpdate(agentId, promise.contact, promise.notes);
        if (promise.type === 'email') {
          await this.queueEmailDraft(agentId, promise.contact, promise.subject, promise.body);
        }
      }

      if (criteria) {
        await this.setupMlsSearch(agentId, criteria);
      }

      return { captureId: capture.rows[0].id, commitments, criteria };
    },

    extractCommitments(transcript) {
      const text = String(transcript || '').toLowerCase();
      const commitments = [];

      if (/send (you |them |the client )?an? (email|message)/.test(text) || /i('ll| will) send/.test(text)) {
        commitments.push({
          type: 'email',
          contact: 'client@example.com',
          notes: 'Agent promised to send an email.',
          subject: 'Following up on our conversation',
          body: 'Hi,\n\nThanks for the conversation today. I will follow up with the details we discussed.\n\nBest,',
        });
      }

      if (/set up (a )?search/.test(text) || /search for/.test(text)) {
        commitments.push({
          type: 'mls_search',
          notes: 'Agent promised to set up an MLS search.',
        });
      }

      return commitments;
    },

    extractMlsCriteria(transcript) {
      const text = String(transcript || '');
      const criteria = {};
      const bedrooms = text.match(/(\d+)\s*(?:bed|bedroom)/i);
      const bathrooms = text.match(/(\d+(?:\.\d+)?)\s*(?:bath|bathroom)/i);
      const location = text.match(/(?:in|around|near)\s+([A-Za-z\s]+?)(?:\.|,|;|$)/i);
      const price = text.match(/\$?([\d,]+)\s*(?:k|thousand)?/i);

      if (bedrooms) criteria.bedrooms = parseInt(bedrooms[1], 10);
      if (bathrooms) criteria.bathrooms = parseFloat(bathrooms[1]);
      if (location) criteria.location = location[1].trim();
      if (price) criteria.maxPrice = parseInt(price[1].replace(/,/g, ''), 10) * (price[2]?.toLowerCase().startsWith('k') ? 1000 : 1);

      if (Object.keys(criteria).length === 0) return null;
      return criteria;
    },

    async queueCrmUpdate(agentId, contact, notes) {
      await pool.query(
        'INSERT INTO lifere_commitment_queue (agent_id, promise_text, due_at, status) VALUES ($1, $2, now() + interval \'1 day\', $3)',
        [agentId, `CRM update for ${contact}: ${notes}`, 'pending']
      );
      if (typeof crmUpdater?.addNote === 'function') {
        await crmUpdater.addNote(agentId, contact, notes);
      }
    },

    async queueEmailDraft(agentId, recipient, subject, body) {
      await pool.query(
        'INSERT INTO lifere_commitment_queue (agent_id, promise_text, due_at, status) VALUES ($1, $2, now() + interval \'1 hour\', $3)',
        [agentId, `Email draft to ${recipient}: ${subject}`, 'pending']
      );
      if (typeof emailQueue?.add === 'function') {
        await emailQueue.add({ agentId, recipient, subject, body });
      }
      return { ok: true, recipient, subject };
    },

    async setupMlsSearch(agentId, criteria) {
      await pool.query(
        'INSERT INTO lifere_mls_search_queue (agent_id, criteria, status) VALUES ($1, $2, $3)',
        [agentId, JSON.stringify(criteria), 'pending']
      );
      if (typeof mlsSearch?.setup === 'function') {
        await mlsSearch.setup(agentId, criteria);
      }
      return { ok: true, criteria };
    },

    async getPendingActions(agentId) {
      const commitments = await pool.query('SELECT * FROM lifere_commitment_queue WHERE agent_id = $1 AND status = $2 ORDER BY due_at', [agentId, 'pending']);
      const searches = await pool.query('SELECT * FROM lifere_mls_search_queue WHERE agent_id = $1 AND status = $2 ORDER BY created_at', [agentId, 'pending']);
      return { commitments: commitments.rows, mlsSearches: searches.rows };
    },
  };
}
