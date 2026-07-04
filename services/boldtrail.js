/**
 * SYNOPSIS: The specification is incomplete about the target file path and surrounding route wiring, so this implementation follows the provided service-factory pattern only.
 */
// The specification is incomplete about the target file path and surrounding route wiring, so this implementation follows the provided service-factory pattern only.
import crypto from 'node:crypto';

const VALID_ENTITY_TYPES = new Set(['contact', 'note', 'tag']);
const VALID_LINK_KINDS = new Set(['contact_tag', 'contact_note']);
const VALID_SYNC_STATUSES = new Set(['pending', 'synced', 'failed']);

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeOptionalText(value) {
  const v = normalizeText(value);
  return v || null;
}

function ensureObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  return {};
}

function toJson(value) {
  return JSON.stringify(ensureObject(value));
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function pickFirst(...values) {
  for (const value of values) {
    const v = normalizeOptionalText(value);
    if (v) return v;
  }
  return null;
}

function buildNoteBody(payload) {
  return {
    body: normalizeText(payload?.body ?? payload?.text ?? payload?.content),
    subject: normalizeOptionalText(payload?.subject),
  };
}

function buildContactBody(payload) {
  return {
    email: normalizeOptionalText(payload?.email),
    first_name: normalizeOptionalText(payload?.first_name ?? payload?.firstName),
    last_name: normalizeOptionalText(payload?.last_name ?? payload?.lastName),
    phone: normalizeOptionalText(payload?.phone),
    external_id: normalizeOptionalText(payload?.external_id ?? payload?.externalId),
  };
}

export function createBoldTrailService({ pool, logger }) {
  function log(level, message, meta) {
    const fn = logger && typeof logger[level] === 'function' ? logger[level].bind(logger) : null;
    if (fn) fn(meta ? { message, ...meta } : { message });
  }

  async function createContact({ ownerId, contact }) {
    const body = buildContactBody(contact);
    const { rows } = await pool.query(
      `INSERT INTO boldtrail_contacts
         (id, owner_id, external_id, email, first_name, last_name, phone, sync_status, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8::jsonb, NOW(), NOW())
       RETURNING *`,
      [
        makeId('btc'),
        ownerId,
        body.external_id,
        body.email,
        body.first_name,
        body.last_name,
        body.phone,
        toJson(contact?.metadata),
      ],
    );

    log('info', 'boldtrail.contact.created', { ownerId, contactId: rows[0]?.id });
    return rows[0];
  }

  async function updateContact({ ownerId, contactId, contact }) {
    const body = buildContactBody(contact);
    const { rows } = await pool.query(
      `UPDATE boldtrail_contacts
          SET external_id = COALESCE($3, external_id),
              email = COALESCE($4, email),
              first_name = COALESCE($5, first_name),
              last_name = COALESCE($6, last_name),
              phone = COALESCE($7, phone),
              metadata = CASE WHEN $8::jsonb = '{}'::jsonb THEN metadata ELSE $8::jsonb END,
              sync_status = 'pending',
              updated_at = NOW()
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [
        contactId,
        ownerId,
        body.external_id,
        body.email,
        body.first_name,
        body.last_name,
        body.phone,
        toJson(contact?.metadata),
      ],
    );

    if (!rows[0]) {
      const err = new Error('contact_not_found');
      err.status = 404;
      throw err;
    }

    log('info', 'boldtrail.contact.updated', { ownerId, contactId });
    return rows[0];
  }

  async function getContact({ ownerId, contactId }) {
    const { rows } = await pool.query(
      `SELECT * FROM boldtrail_contacts WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [contactId, ownerId],
    );
    if (!rows[0]) {
      const err = new Error('contact_not_found');
      err.status = 404;
      throw err;
    }
    return rows[0];
  }

  async function listContacts({ ownerId, limit = 50, cursor = null }) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const params = [ownerId, lim];
    let query = `SELECT * FROM boldtrail_contacts WHERE owner_id = $1`;
    if (cursor) {
      params.push(cursor);
      query += ` AND created_at < $3`;
    }
    query += ` ORDER BY created_at DESC LIMIT $2`;
    const { rows } = await pool.query(query, params);
    return rows;
  }

  async function createNote({ ownerId, contactId = null, note }) {
    const body = buildNoteBody(note);
    if (!body.body) {
      const err = new Error('body_required');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `INSERT INTO boldtrail_notes
         (id, owner_id, contact_id, subject, body, external_id, sync_status, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7::jsonb, NOW(), NOW())
       RETURNING *`,
      [
        makeId('btn'),
        ownerId,
        contactId,
        body.subject,
        body.body,
        normalizeOptionalText(note?.external_id ?? note?.externalId),
        toJson(note?.metadata),
      ],
    );

    log('info', 'boldtrail.note.created', { ownerId, noteId: rows[0]?.id, contactId });
    return rows[0];
  }

  async function listNotes({ ownerId, contactId = null, limit = 50 }) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const params = [ownerId];
    let query = `SELECT * FROM boldtrail_notes WHERE owner_id = $1`;
    if (contactId) {
      params.push(contactId);
      query += ` AND contact_id = $2`;
    }
    query += ` ORDER BY created_at DESC LIMIT ${contactId ? '$3' : '$2'}`;
    params.push(lim);
    const { rows } = await pool.query(query, params);
    return rows;
  }

  async function createTag({ ownerId, tag }) {
    const name = pickFirst(tag?.name, tag?.tag, tag?.value);
    if (!name) {
      const err = new Error('name_required');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `INSERT INTO boldtrail_tags
         (id, owner_id, name, external_id, sync_status, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', $5::jsonb, NOW(), NOW())
       RETURNING *`,
      [
        makeId('btt'),
        ownerId,
        name,
        normalizeOptionalText(tag?.external_id ?? tag?.externalId),
        toJson(tag?.metadata),
      ],
    );

    log('info', 'boldtrail.tag.created', { ownerId, tagId: rows[0]?.id });
    return rows[0];
  }

  async function listTags({ ownerId, limit = 50 }) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const { rows } = await pool.query(
      `SELECT * FROM boldtrail_tags WHERE owner_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [ownerId, lim],
    );
    return rows;
  }

  async function addTagToContact({ ownerId, contactId, tagId }) {
    const { rows } = await pool.query(
      `INSERT INTO boldtrail_contact_tags
         (id, owner_id, contact_id, tag_id, link_kind, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'contact_tag', NOW(), NOW())
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [makeId('btl'), ownerId, contactId, tagId],
    );
    return rows[0] || null;
  }

  async function addNoteToContact({ ownerId, contactId, noteId }) {
    const { rows } = await pool.query(
      `INSERT INTO boldtrail_contact_notes
         (id, owner_id, contact_id, note_id, link_kind, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'contact_note', NOW(), NOW())
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [makeId('btl'), ownerId, contactId, noteId],
    );
    return rows[0] || null;
  }

  async function listContactTags({ ownerId, contactId }) {
    const { rows } = await pool.query(
      `SELECT ct.*, t.*
         FROM boldtrail_contact_tags ct
         JOIN boldtrail_tags t ON t.id = ct.tag_id
        WHERE ct.owner_id = $1 AND ct.contact_id = $2
        ORDER BY ct.created_at DESC`,
      [ownerId, contactId],
    );
    return rows;
  }

  async function listContactNotes({ ownerId, contactId }) {
    const { rows } = await pool.query(
      `SELECT cn.*, n.*
         FROM boldtrail_contact_notes cn
         JOIN boldtrail_notes n ON n.id = cn.note_id
        WHERE cn.owner_id = $1 AND cn.contact_id = $2
        ORDER BY cn.created_at DESC`,
      [ownerId, contactId],
    );
    return rows;
  }

  async function markSynced({ entityType, entityId, externalId, syncStatus = 'synced', syncPayload = {} }) {
    if (!VALID_ENTITY_TYPES.has(entityType)) {
      const err = new Error('invalid_entity_type');
      err.status = 400;
      throw err;
    }
    if (!VALID_SYNC_STATUSES.has(syncStatus)) {
      const err = new Error('invalid_sync_status');
      err.status = 400;
      throw err;
    }

    const table =
      entityType === 'contact' ? 'boldtrail_contacts' :
      entityType === 'note' ? 'boldtrail_notes' :
      'boldtrail_tags';

    const { rows } = await pool.query(
      `UPDATE ${table}
          SET external_id = COALESCE($2, external_id),
              sync_status = $3,
              sync_payload = $4::jsonb,
              updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
      [entityId, normalizeOptionalText(externalId), syncStatus, toJson(syncPayload)],
    );
    if (!rows[0]) {
      const err = new Error(`${entityType}_not_found`);
      err.status = 404;
      throw err;
    }
    return rows[0];
  }

  return {
    createContact,
    updateContact,
    getContact,
    listContacts,
    createNote,
    listNotes,
    createTag,
    listTags,
    addTagToContact,
    addNoteToContact,
    listContactTags,
    listContactNotes,
    markSynced,
    VALID_ENTITY_TYPES,
    VALID_LINK_KINDS,
    VALID_SYNC_STATUSES,
  };
}