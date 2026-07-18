/**
 * SYNOPSIS: Exports createWellnessTherapistService — services/wellness-therapist.js.
 */
export function createWellnessTherapistService({ pool, consentRegistry }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('createWellnessTherapistService requires a pg pool with query()');
  }
  if (!consentRegistry || typeof consentRegistry.hasConsent !== 'function') {
    throw new Error('createWellnessTherapistService requires a consentRegistry with hasConsent()');
  }

  const normalizeText = (value) => {
    if (value === null || value === undefined) return null;
    const s = String(value).trim();
    return s.length ? s : null;
  };

  const toBriefJson = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return { text: value };
      }
    }
    return { value };
  };

  const getTherapistProfileByUserId = async (userId) => {
    const { rows } = await pool.query(
      `select id, user_id, display_name, approach, session_frequency, focus_areas, crisis_contact, created_at
       from therapist_profiles
       where user_id = $1
       order by created_at desc
       limit 1`,
      [userId]
    );
    return rows[0] || null;
  };

  const upsertTherapistProfile = async ({
    userId,
    displayName,
    approach,
    sessionFrequency,
    focusAreas,
    crisisContact,
  }) => {
    const existing = await getTherapistProfileByUserId(userId);
    const params = [
      userId,
      normalizeText(displayName),
      normalizeText(approach),
      normalizeText(sessionFrequency),
      normalizeText(focusAreas),
      normalizeText(crisisContact),
    ];

    if (existing) {
      const { rows } = await pool.query(
        `update therapist_profiles
         set display_name = $2,
             approach = $3,
             session_frequency = $4,
             focus_areas = $5,
             crisis_contact = $6
         where user_id = $1
         returning id, user_id, display_name, approach, session_frequency, focus_areas, crisis_contact, created_at`,
        params
      );
      return rows[0];
    }

    const { rows } = await pool.query(
      `insert into therapist_profiles
         (user_id, display_name, approach, session_frequency, focus_areas, crisis_contact)
       values ($1, $2, $3, $4, $5, $6)
       returning id, user_id, display_name, approach, session_frequency, focus_areas, crisis_contact, created_at`,
      params
    );
    return rows[0];
  };

  const linkClient = async ({ therapistUserId, clientUserId, clientConsentedAt = null }) => {
    const consentGranted = await consentRegistry.hasConsent(clientUserId, 'therapist_share');
    if (!consentGranted) {
      return { ok: false, reason: 'consent_required' };
    }

    const { rows } = await pool.query(
      `insert into therapist_client_links
         (therapist_user_id, client_user_id, status, client_consented_at)
       values ($1, $2, $3, $4)
       returning id, therapist_user_id, client_user_id, status, client_consented_at, created_at`,
      [therapistUserId, clientUserId, 'linked', clientConsentedAt]
    );
    return { ok: true, link: rows[0] };
  };

  const listLinkedClients = async ({ therapistUserId }) => {
    const { rows } = await pool.query(
      `select id, therapist_user_id, client_user_id, status, client_consented_at, created_at
       from therapist_client_links
       where therapist_user_id = $1
       order by created_at desc`,
      [therapistUserId]
    );
    return rows;
  };

  const createSessionBrief = async ({
    therapistUserId,
    clientUserId,
    sessionPrompt,
    sessionNotes,
    briefJson,
  }) => {
    const consentGranted = await consentRegistry.hasConsent(clientUserId, 'therapist_share');
    if (!consentGranted) {
      return { ok: false, reason: 'consent_required' };
    }

    const payload = toBriefJson(briefJson) ?? {
      therapist_user_id: therapistUserId,
      client_user_id: clientUserId,
      session_prompt: normalizeText(sessionPrompt),
      session_notes: normalizeText(sessionNotes),
    };

    return {
      ok: true,
      brief_json: payload,
    };
  };

  const markBriefReviewed = async ({ briefJson, reviewedByUserId }) => {
    return {
      ok: true,
      brief_json: toBriefJson(briefJson),
      reviewed_by_user_id: reviewedByUserId ?? null,
      reviewed_at: new Date().toISOString(),
    };
  };

  const shareBriefIfConsented = async ({ therapistUserId, clientUserId, briefJson }) => {
    const consentGranted = await consentRegistry.hasConsent(clientUserId, 'therapist_share');
    if (!consentGranted) {
      return { ok: false, reason: 'consent_required' };
    }

    const { rows } = await pool.query(
      `insert into lifere_client_comms_log
         (tenant_id, user_id, client_ref, channel, template_id, body, sent_at, approval_queue_id)
       values ($1, $2, $3, $4, $5, $6, NOW(), $7)
       returning id, tenant_id, user_id, client_ref, channel, template_id, body, sent_at, approval_queue_id`,
      [
        therapistUserId,
        therapistUserId,
        String(clientUserId),
        'therapist_brief',
        'session_brief',
        JSON.stringify({ brief_json: toBriefJson(briefJson) }),
        null,
      ]
    );

    return {
      ok: true,
      brief_json: toBriefJson(briefJson),
      comms_log: rows[0],
    };
  };

  return {
    upsertTherapistProfile,
    linkClient,
    listLinkedClients,
    createSessionBrief,
    markBriefReviewed,
    shareBriefIfConsented,
  };
}