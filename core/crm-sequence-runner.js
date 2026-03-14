/**
 * CRM + Sequence Runner (internal lightweight CRM)
 *
 * Purpose:
 * - Store contacts
 * - Create sequences (steps across email/sms/call)
 * - Enroll contacts and execute steps on schedule
 * - Log sends + basic “reply captured” events
 *
 * This is intentionally minimal and uses existing OutreachAutomation + governance gates.
 */

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export class CrmSequenceRunner {
  constructor({ pool, outreachAutomation }) {
    this.pool = pool;
    this.outreachAutomation = outreachAutomation;
  }

  async ensureSchema() {
    // Tables are created in server.js initDatabase; this is here for reference.
    return true;
  }

  async upsertContact({ name = null, email = null, phone = null, company = null, tags = [] }) {
    const result = await this.pool.query(
      `INSERT INTO crm_contacts (name, email, phone, company, tags, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
       ON CONFLICT (email)
       DO UPDATE SET
         name = COALESCE(EXCLUDED.name, crm_contacts.name),
         phone = COALESCE(EXCLUDED.phone, crm_contacts.phone),
         company = COALESCE(EXCLUDED.company, crm_contacts.company),
         tags = COALESCE(EXCLUDED.tags, crm_contacts.tags),
         updated_at = NOW()
       RETURNING *`,
      [
        name,
        email ? String(email).trim().toLowerCase() : null,
        phone ? String(phone).trim() : null,
        company,
        JSON.stringify(Array.isArray(tags) ? tags : []),
      ]
    );
    return result.rows[0];
  }

  async createSequence({ name, description = null }) {
    const result = await this.pool.query(
      `INSERT INTO crm_sequences (name, description, created_at)
       VALUES ($1,$2,NOW())
       RETURNING *`,
      [name, description]
    );
    return result.rows[0];
  }

  async addSequenceStep(sequenceId, { step_order, channel, delay_minutes = 0, subject = null, body_template = null }) {
    const result = await this.pool.query(
      `INSERT INTO crm_sequence_steps (sequence_id, step_order, channel, delay_minutes, subject, body_template, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       RETURNING *`,
      [sequenceId, step_order, channel, toInt(delay_minutes, 0), subject, body_template]
    );
    return result.rows[0];
  }

  async enroll(sequenceId, contactId) {
    const result = await this.pool.query(
      `INSERT INTO crm_sequence_enrollments (sequence_id, contact_id, status, step_index, next_run_at, created_at, updated_at)
       VALUES ($1,$2,'active',0,NOW(),NOW(),NOW())
       RETURNING *`,
      [sequenceId, contactId]
    );
    return result.rows[0];
  }

  async captureReply({ contact_id, channel, message, external_id = null }) {
    const result = await this.pool.query(
      `INSERT INTO crm_replies (contact_id, channel, message, external_id, created_at)
       VALUES ($1,$2,$3,$4,NOW())
       RETURNING *`,
      [contact_id, channel, message, external_id]
    );
    return result.rows[0];
  }

  async runDueEnrollments(limit = 25) {
    // Find due enrollments
    const due = await this.pool.query(
      `SELECT e.*, c.email, c.phone, c.company, c.name AS contact_name
       FROM crm_sequence_enrollments e
       JOIN crm_contacts c ON c.id = e.contact_id
       WHERE e.status = 'active'
         AND e.next_run_at <= NOW()
       ORDER BY e.next_run_at ASC
       LIMIT $1`,
      [limit]
    );

    let processed = 0;
    let sent = 0;
    let failed = 0;

    for (const enrollment of due.rows) {
      processed++;
      const steps = await this.pool.query(
        `SELECT *
         FROM crm_sequence_steps
         WHERE sequence_id = $1
         ORDER BY step_order ASC`,
        [enrollment.sequence_id]
      );

      const step = steps.rows[enrollment.step_index] || null;
      if (!step) {
        // Done
        await this.pool.query(
          `UPDATE crm_sequence_enrollments
           SET status = 'completed', updated_at = NOW()
           WHERE id = $1`,
          [enrollment.id]
        );
        continue;
      }

      const channel = String(step.channel || '').toLowerCase();

      // Minimal templating
      const body = String(step.body_template || '')
        .replace(/\{\{name\}\}/g, enrollment.contact_name || '')
        .replace(/\{\{company\}\}/g, enrollment.company || '');
      const subject = step.subject ? String(step.subject).replace(/\{\{company\}\}/g, enrollment.company || '') : null;

      try {
        let result;
        if (channel === 'email') {
          if (!enrollment.email) throw new Error('Missing contact email');
          result = await this.outreachAutomation.sendEmail(enrollment.email, subject || 'Hello', body);
        } else if (channel === 'sms') {
          if (!enrollment.phone) throw new Error('Missing contact phone');
          result = await this.outreachAutomation.sendSMS(enrollment.phone, body);
        } else if (channel === 'call') {
          if (!enrollment.phone) throw new Error('Missing contact phone');
          result = await this.outreachAutomation.makeCall(enrollment.phone, body);
        } else {
          throw new Error(`Unsupported channel: ${channel}`);
        }

        if (result?.success) {
          sent++;
          await this.pool.query(
            `INSERT INTO crm_messages (enrollment_id, contact_id, channel, subject, body, status, external_id, created_at)
             VALUES ($1,$2,$3,$4,$5,'sent',$6,NOW())`,
            [
              enrollment.id,
              enrollment.contact_id,
              channel,
              subject,
              body,
              result.messageId || result.messageSid || result.callSid || null,
            ]
          );

          const nextIndex = enrollment.step_index + 1;
          const delayMinutes = toInt(step.delay_minutes, 0);
          await this.pool.query(
            `UPDATE crm_sequence_enrollments
             SET step_index = $2,
                 next_run_at = NOW() + ($3 || ' minutes')::interval,
                 updated_at = NOW()
             WHERE id = $1`,
            [enrollment.id, nextIndex, String(delayMinutes)]
          );
        } else {
          failed++;
          await this.pool.query(
            `INSERT INTO crm_messages (enrollment_id, contact_id, channel, subject, body, status, external_id, created_at)
             VALUES ($1,$2,$3,$4,$5,'failed',$6,NOW())`,
            [
              enrollment.id,
              enrollment.contact_id,
              channel,
              subject,
              body,
              null,
            ]
          );

          // Backoff 60 minutes on failure
          await this.pool.query(
            `UPDATE crm_sequence_enrollments
             SET next_run_at = NOW() + INTERVAL '60 minutes',
                 updated_at = NOW()
             WHERE id = $1`,
            [enrollment.id]
          );
        }
      } catch (e) {
        failed++;
        await this.pool.query(
          `INSERT INTO crm_messages (enrollment_id, contact_id, channel, subject, body, status, external_id, created_at)
           VALUES ($1,$2,$3,$4,$5,'failed',$6,NOW())`,
          [enrollment.id, enrollment.contact_id, channel, subject, body, null]
        );

        await this.pool.query(
          `UPDATE crm_sequence_enrollments
           SET next_run_at = NOW() + INTERVAL '60 minutes',
               updated_at = NOW()
           WHERE id = $1`,
          [enrollment.id]
        );
      }
    }

    return { ok: true, processed, sent, failed };
  }
}

export default CrmSequenceRunner;

