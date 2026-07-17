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
        if (promise.type === 'crm_update') {
          await this.queueCrmUpdate(agentId, promise.contact, promise.notes);
        } else if (promise.type === 'email') {
          await this.queueEmailDraft(agentId, promise.recipient, promise.subject, promise.body);
        } else if (promise.type === 'mls_search') {
          await this.setupMlsSearch(agentId, promise.criteria || {});
        }
      }

      if (Object.keys(criteria).length > 0 && !commitments.some(p => p.type === 'mls_search')) {
        await this.setupMlsSearch(agentId, criteria);
      }

      return { captureId: capture.rows[0].id, commitments, criteria };
    },

    extractCommitments(transcript) {
      const text = String(transcript || '').toLowerCase();
      const commitments = [];
      const extractedCriteria = this.extractMlsCriteria(transcript);

      const emailMatch = text.match(/i('ll| will) send (?:you |them |the client )?(an? (?:email|message)(?: about (.+?))?)?/);
      if (emailMatch) {
        const subject = emailMatch[4] ? `Following up on: ${emailMatch[4]}` : 'Following up on our conversation';
        commitments.push({
          type: 'email',
          recipient: 'client@example.com',
          subject: subject,
          body: `Hi,\n\nThanks for the conversation today. I will follow up with the details we discussed.\n\nBest,`,
          notes: 'Agent promised to send an email.',
        });
      }

      if ((/i('ll| will) set up (a )?search/.test(text) || /i('ll| will) search for/.test(text)) && extractedCriteria) {
        commitments.push({
          type: 'mls_search',
          notes: 'Agent promised to set up an MLS search.',
          criteria: extractedCriteria,
        });
      } else if (/i('ll| will) set up (a )?search/.test(text) || /i('ll| will) search for/.test(text)) {
        commitments.push({
          type: 'mls_search',
          notes: 'Agent promised to set up an MLS search, but no specific criteria were extracted.',
          criteria: {},
        });
      }

      const crmUpdateMatch = text.match(/i('ll| will) (call|get back to|follow up with) (?:you|them|the client)(?: about (.+?))?/);
      if (crmUpdateMatch) {
        const notes = crmUpdateMatch[4] ? `Agent promised to follow up regarding: ${crmUpdateMatch[4]}.` : 'Agent promised to follow up.';
        commitments.push({
          type: 'crm_update',
          contact: 'client@example.com',
          notes: notes,
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
      const minPrice = text.match(/(?:over|above|at least)\s*\$?([\d,]+(?:k|thousand|million)?)/i);
      const maxPrice = text.match(/(?:under|below|up to|no more than)\s*\$?([\d,]+(?:k|thousand|million)?)/i);
      const priceRange = text.match(/\$?([\d,]+(?:k|thousand|million)?)\s*(?:to|-)\s*\$?([\d,]+(?:k|thousand|million)?)/i);

      const parsePrice = (priceStr) => {
        if (!priceStr) return undefined;
        const cleanPrice = priceStr.replace(/,/g, '');
        if (cleanPrice.toLowerCase().endsWith('k')) {
          return parseFloat(cleanPrice.slice(0, -1)) * 1000;
        } else if (cleanPrice.toLowerCase().endsWith('million')) {
          return parseFloat(cleanPrice.slice(0, -7)) * 1000000;
        }
        return parseFloat(cleanPrice);
      };

      if (bedrooms) criteria.bedrooms = parseInt(bedrooms[1], 10);
      if (bathrooms) criteria.bathrooms = parseFloat(bathrooms[1]);
      if (location) criteria.location = location[1].trim();

      if (priceRange) {
        criteria.minPrice = parsePrice(priceRange[1]);
        criteria.maxPrice = parsePrice(priceRange[2]);
      } else if (minPrice) {
        criteria.minPrice = parsePrice(minPrice[1]);
      } else if (maxPrice) {
        criteria.maxPrice = parsePrice(maxPrice[1]);
      }

      // If no criteria were extracted, return an empty object instead of null for consistency.
      // This avoids potential null-checking issues downstream where an empty object is expected.
      return criteria;
    },

    async queueCrmUpdate(agentId, contact, notes) {
      await pool.query(
        'INSERT INTO lifere_commitment_queue (agent_id, promise_text, due_at, status, type) VALUES ($1, $2, now() + interval \'1 day\', $3, $4)',
        [agentId, `CRM update for ${contact}: ${notes}`, 'pending', 'crm_update']
      );
      if (typeof crmUpdater?.addNote === 'function') {
        await crmUpdater.addNote(agentId, contact, notes);
      }
    },

    async queueEmailDraft(agentId, recipient, subject, body) {
      await pool.query(
        'INSERT INTO lifere_commitment_queue (agent_id, promise_text, due_at, status, type) VALUES ($1, $2, now() + interval \'1 hour\', $3, $4)',
        [agentId, `Email draft to ${recipient}: ${subject}`, 'pending', 'email']
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
