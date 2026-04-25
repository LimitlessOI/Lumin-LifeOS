/**
 * services/lifeos-legacy-core.js
 *
 * Layer-11 legacy core primitives.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

function clampInt(v, min, max, fallback) {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function createLifeOSLegacyCore({ pool }) {
  async function listTrustedContacts(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM legacy_trusted_contacts
        WHERE user_id = $1 AND active = TRUE
        ORDER BY is_primary DESC, created_at DESC`,
      [userId]
    );
    return rows;
  }

  async function addTrustedContact(userId, input = {}) {
    if (!input.contact_name || !String(input.contact_name).trim()) {
      const e = new Error('contact_name is required');
      e.status = 400;
      throw e;
    }
    const primary = !!input.is_primary;
    if (primary) {
      await pool.query(
        `UPDATE legacy_trusted_contacts
            SET is_primary = FALSE, updated_at = NOW()
          WHERE user_id = $1`,
        [userId]
      );
    }
    const { rows } = await pool.query(
      `INSERT INTO legacy_trusted_contacts
       (user_id, contact_name, contact_email, contact_phone, relationship, is_primary)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        userId,
        String(input.contact_name).trim().slice(0, 200),
        input.contact_email ? String(input.contact_email).trim().slice(0, 200) : null,
        input.contact_phone ? String(input.contact_phone).trim().slice(0, 60) : null,
        input.relationship ? String(input.relationship).trim().slice(0, 100) : null,
        primary,
      ]
    );
    return rows[0];
  }

  async function deactivateTrustedContact(userId, contactId) {
    const { rows } = await pool.query(
      `UPDATE legacy_trusted_contacts
          SET active = FALSE, is_primary = FALSE, updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
      [contactId, userId]
    );
    return rows[0] || null;
  }

  async function getCheckInCadence(userId) {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(legacy_check_in_cadence_days, 30) AS cadence_days,
         legacy_last_check_in_at
       FROM lifeos_users
       WHERE id = $1`,
      [userId]
    );
    if (!rows.length) return null;
    return rows[0];
  }

  async function updateCheckInCadence(userId, cadenceDays) {
    const days = clampInt(cadenceDays, 7, 180, 30);
    const { rows } = await pool.query(
      `UPDATE lifeos_users
          SET legacy_check_in_cadence_days = $2,
              legacy_last_check_in_at = NOW()
        WHERE id = $1
        RETURNING
          COALESCE(legacy_check_in_cadence_days, 30) AS cadence_days,
          legacy_last_check_in_at`,
      [userId, days]
    );
    return rows[0] || null;
  }

  async function createTimeCapsule(userId, input = {}) {
    if (!input.title || !input.message || !input.deliver_at) {
      const e = new Error('title, message, and deliver_at are required');
      e.status = 400;
      throw e;
    }
    const deliverAt = new Date(input.deliver_at);
    if (Number.isNaN(deliverAt.getTime())) {
      const e = new Error('deliver_at must be a valid datetime');
      e.status = 400;
      throw e;
    }
    const { rows } = await pool.query(
      `INSERT INTO legacy_messages
         (user_id, contact_id, title, message, deliver_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        userId,
        input.contact_id || null,
        String(input.title).slice(0, 200),
        String(input.message).slice(0, 10000),
        deliverAt.toISOString(),
      ]
    );
    return rows[0];
  }

  async function listTimeCapsules(userId) {
    const { rows } = await pool.query(
      `SELECT m.*, c.contact_name
         FROM legacy_messages m
         LEFT JOIN legacy_trusted_contacts c ON c.id = m.contact_id
        WHERE m.user_id = $1
        ORDER BY m.deliver_at DESC`,
      [userId]
    );
    return rows;
  }

  function computeCompleteness(payload = {}) {
    const fields = [
      'executor_name',
      'executor_contact',
      'guardianship_notes',
      'asset_notes',
      'instructions',
    ];
    let filled = 0;
    for (const f of fields) {
      if (payload[f] && String(payload[f]).trim()) filled += 1;
    }
    return Math.round((filled / fields.length) * 100);
  }

  async function getDigitalWill(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM digital_wills WHERE user_id = $1`,
      [userId]
    );
    return rows[0] || null;
  }

  async function upsertDigitalWill(userId, payload = {}) {
    const completeness = computeCompleteness(payload);
    const { rows } = await pool.query(
      `INSERT INTO digital_wills
         (user_id, executor_name, executor_contact, guardianship_notes, asset_notes, instructions, completeness_pct)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (user_id) DO UPDATE SET
         executor_name = EXCLUDED.executor_name,
         executor_contact = EXCLUDED.executor_contact,
         guardianship_notes = EXCLUDED.guardianship_notes,
         asset_notes = EXCLUDED.asset_notes,
         instructions = EXCLUDED.instructions,
         completeness_pct = EXCLUDED.completeness_pct,
         updated_at = NOW()
       RETURNING *`,
      [
        userId,
        payload.executor_name || null,
        payload.executor_contact || null,
        payload.guardianship_notes || null,
        payload.asset_notes || null,
        payload.instructions || null,
        completeness,
      ]
    );
    return rows[0];
  }

  async function getLegacyCompleteness(userId) {
    const [contacts, will] = await Promise.all([
      listTrustedContacts(userId),
      getDigitalWill(userId),
    ]);
    const contactsScore = contacts.length > 0 ? 20 : 0;
    const willScore = will?.completeness_pct || 0;
    const overall = Math.min(100, Math.round((contactsScore + willScore) / 1.2));
    return {
      trusted_contacts_count: contacts.length,
      digital_will_pct: willScore,
      overall_pct: overall,
    };
  }

  return {
    listTrustedContacts,
    addTrustedContact,
    deactivateTrustedContact,
    getCheckInCadence,
    updateCheckInCadence,
    createTimeCapsule,
    listTimeCapsules,
    getDigitalWill,
    upsertDigitalWill,
    getLegacyCompleteness,
  };
}
