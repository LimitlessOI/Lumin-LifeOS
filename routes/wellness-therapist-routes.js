/**
 * SYNOPSIS: Registers WellnessTherapistRoutes routes/handlers (routes/wellness-therapist-routes.js).
 * @ssot docs/products/wellness-studio/PRODUCT_HOME.md
 */
import { createConsentRegistry } from '../services/consent-registry.js';

export function registerWellnessTherapistRoutes(app, deps = {}) {
  const pool = deps.pool;
  const requireAuth = deps.requireAuth || deps.requireKey;
  const consentRegistry = deps.consentRegistry || createConsentRegistry({ pool });
  const logger = deps.logger || console;

  if (!app || typeof app.post !== 'function' || typeof app.get !== 'function') {
    throw new Error('registerWellnessTherapistRoutes requires an express app');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerWellnessTherapistRoutes requires deps.pool');
  }
  if (typeof requireAuth !== 'function') {
    throw new Error('registerWellnessTherapistRoutes requires deps.requireAuth or deps.requireKey');
  }

  const json = (res, status, body) => res.status(status).json(body);
  const normalizeUserId = (value) => {
    if (value === null || value === undefined) return null;
    const s = String(value).trim();
    return /^\d+$/.test(s) ? s : null;
  };
  const sameId = (a, b) => String(a) === String(b);
  const normalizeJsonb = (value, fallback) => {
    if (value === null || value === undefined) return JSON.stringify(fallback);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return JSON.stringify(fallback);
      try {
        JSON.parse(trimmed);
        return trimmed;
      } catch {
        return JSON.stringify([trimmed]);
      }
    }
    return JSON.stringify(value);
  };

  const getActor = (req) => {
    const user = req.lifeosUser || req.user || req.auth || {};
    const userId = normalizeUserId(user.id ?? user.userId ?? user.sub);
    return {
      userId,
      role: String(user.role ?? user.type ?? '').toLowerCase() || null,
      email: user.email ?? null,
    };
  };

  const canActAsTherapist = (actor) => actor && ['therapist', 'admin', 'founder_admin'].includes(actor.role);
  const isAdmin = (actor) => actor && ['admin', 'founder_admin'].includes(actor.role);

  const hasTherapistShareConsent = async (clientUserId) => {
    if (!clientUserId || typeof consentRegistry.hasConsent !== 'function') return false;
    return (await consentRegistry.hasConsent(clientUserId, 'therapist_share')) === true;
  };

  const therapistCanAccessClient = async (actor, clientUserId) => {
    if (isAdmin(actor)) return true;
    const result = await pool.query(
      `
        select 1
        from therapist_client_links
        where therapist_user_id = $1
          and client_user_id = $2
          and status in ('active', 'linked')
        limit 1
      `,
      [actor.userId, clientUserId],
    );
    return result.rows.length > 0;
  };

  app.post('/api/v1/wellness/therapist/profile', requireAuth, async (req, res) => {
    try {
      const actor = getActor(req);
      if (!actor.userId) return json(res, 401, { ok: false, error: 'unauthorized' });

      const { display_name, approach, session_frequency, focus_areas, crisis_contact } = req.body || {};
      const result = await pool.query(
        `
          insert into therapist_profiles (user_id, display_name, approach, session_frequency, focus_areas, crisis_contact)
          values ($1, $2, $3, $4, $5, $6)
          on conflict (user_id) do update set
            display_name = excluded.display_name,
            approach = excluded.approach,
            session_frequency = excluded.session_frequency,
            focus_areas = excluded.focus_areas,
            crisis_contact = excluded.crisis_contact
          returning id, user_id, display_name, approach, session_frequency, focus_areas, crisis_contact, created_at
        `,
        [
          actor.userId,
          display_name ?? null,
          approach ?? null,
          session_frequency ?? null,
          normalizeJsonb(focus_areas, []),
          crisis_contact ?? null,
        ],
      );

      return json(res, 201, { ok: true, profile: result.rows[0] });
    } catch (error) {
      logger.error?.({ err: error }, 'failed to save therapist profile');
      return json(res, 500, { ok: false, error: 'internal_error' });
    }
  });

  app.get('/api/v1/wellness/therapist/profile/me', requireAuth, async (req, res) => {
    try {
      const actor = getActor(req);
      if (!actor.userId) return json(res, 401, { ok: false, error: 'unauthorized' });

      const result = await pool.query(
        `
          select id, user_id, display_name, approach, session_frequency, focus_areas, crisis_contact, created_at
          from therapist_profiles
          where user_id = $1
          order by created_at desc
          limit 1
        `,
        [actor.userId],
      );

      return json(res, 200, { ok: true, profile: result.rows[0] || null });
    } catch (error) {
      logger.error?.({ err: error }, 'failed to fetch therapist profile');
      return json(res, 500, { ok: false, error: 'internal_error' });
    }
  });

  app.post('/api/v1/wellness/therapist/links', requireAuth, async (req, res) => {
    try {
      const actor = getActor(req);
      if (!actor.userId) return json(res, 401, { ok: false, error: 'unauthorized' });
      if (!canActAsTherapist(actor)) return json(res, 403, { ok: false, error: 'forbidden' });

      const { therapist_user_id, client_user_id, client_consented_at } = req.body || {};
      const effectiveTherapistUserId = normalizeUserId(therapist_user_id) ?? actor.userId;
      const clientUserId = normalizeUserId(client_user_id);

      if (!clientUserId) return json(res, 400, { ok: false, error: 'client_user_id_required' });
      if (!isAdmin(actor) && !sameId(effectiveTherapistUserId, actor.userId)) {
        return json(res, 403, { ok: false, error: 'forbidden' });
      }
      if (!(await hasTherapistShareConsent(clientUserId))) {
        return json(res, 403, { ok: false, error: 'consent_required' });
      }

      const result = await pool.query(
        `
          insert into therapist_client_links (therapist_user_id, client_user_id, status, client_consented_at)
          values ($1, $2, $3, $4)
          on conflict (therapist_user_id, client_user_id) do update set
            status = excluded.status,
            client_consented_at = excluded.client_consented_at
          returning id, therapist_user_id, client_user_id, status, client_consented_at, created_at
        `,
        [effectiveTherapistUserId, clientUserId, 'linked', client_consented_at ?? new Date().toISOString()],
      );

      return json(res, 201, { ok: true, link: result.rows[0] });
    } catch (error) {
      logger.error?.({ err: error }, 'failed to create therapist-client link');
      return json(res, 500, { ok: false, error: 'internal_error' });
    }
  });

  app.get('/api/v1/wellness/therapist/clients', requireAuth, async (req, res) => {
    try {
      const actor = getActor(req);
      if (!actor.userId) return json(res, 401, { ok: false, error: 'unauthorized' });
      if (!canActAsTherapist(actor)) return json(res, 403, { ok: false, error: 'forbidden' });

      const result = await pool.query(
        `
          select l.id as link_id, l.therapist_user_id, l.client_user_id, l.status, l.client_consented_at, l.created_at
          from therapist_client_links l
          where l.therapist_user_id = $1 or $2 = 'admin'
          order by l.created_at desc
        `,
        [actor.userId, actor.role],
      );

      return json(res, 200, { ok: true, clients: result.rows });
    } catch (error) {
      logger.error?.({ err: error }, 'failed to fetch therapist clients');
      return json(res, 500, { ok: false, error: 'internal_error' });
    }
  });

  app.post('/api/v1/wellness/therapist/briefs', requireAuth, async (req, res) => {
    try {
      const actor = getActor(req);
      if (!actor.userId) return json(res, 401, { ok: false, error: 'unauthorized' });
      if (!canActAsTherapist(actor)) return json(res, 403, { ok: false, error: 'forbidden' });

      const brief = req.body || {};
      const clientUserId = normalizeUserId(brief.client_user_id);
      if (!clientUserId) return json(res, 400, { ok: false, error: 'client_user_id_required' });
      if (!(await therapistCanAccessClient(actor, clientUserId))) {
        return json(res, 403, { ok: false, error: 'client_link_required' });
      }
      if (!(await hasTherapistShareConsent(clientUserId))) {
        return json(res, 403, { ok: false, error: 'consent_required' });
      }

      const briefJson = {
        title: brief.title ?? null,
        content: brief.content ?? brief.text ?? null,
        brief_json: brief.brief_json ?? null,
      };
      const result = await pool.query(
        `
          insert into session_briefs (client_user_id, therapist_user_id, brief_json)
          values ($1, $2, $3)
          returning id, client_user_id, therapist_user_id, brief_json, client_reviewed_at, shared_at, created_at
        `,
        [clientUserId, actor.userId, normalizeJsonb(briefJson, {})],
      );

      return json(res, 201, {
        ok: true,
        brief: result.rows[0],
      });
    } catch (error) {
      logger.error?.({ err: error }, 'failed to create brief');
      return json(res, 500, { ok: false, error: 'internal_error' });
    }
  });

  app.post('/api/v1/wellness/therapist/briefs/:id/share', requireAuth, async (req, res) => {
    try {
      const actor = getActor(req);
      if (!actor.userId) return json(res, 401, { ok: false, error: 'unauthorized' });
      if (!canActAsTherapist(actor)) return json(res, 403, { ok: false, error: 'forbidden' });

      const briefId = req.params.id;
      const { client_user_id } = req.body || {};
      const briefResult = await pool.query(
        `
          select id, client_user_id, therapist_user_id, brief_json, client_reviewed_at, shared_at, created_at
          from session_briefs
          where id = $1
            and ($2 = true or therapist_user_id = $3)
          limit 1
        `,
        [briefId, isAdmin(actor), actor.userId],
      );
      const storedBrief = briefResult.rows[0] || null;
      if (!storedBrief) return json(res, 404, { ok: false, error: 'brief_not_found' });

      const requestedClientUserId = normalizeUserId(client_user_id);
      if (requestedClientUserId && !sameId(requestedClientUserId, storedBrief.client_user_id)) {
        return json(res, 403, { ok: false, error: 'client_mismatch' });
      }
      if (!(await therapistCanAccessClient(actor, storedBrief.client_user_id))) {
        return json(res, 403, { ok: false, error: 'client_link_required' });
      }
      if (!(await hasTherapistShareConsent(storedBrief.client_user_id))) {
        return json(res, 403, { ok: false, error: 'consent_required' });
      }

      const updateResult = await pool.query(
        `
          update session_briefs
          set shared_at = now()
          where id = $1
          returning id, client_user_id, therapist_user_id, brief_json, client_reviewed_at, shared_at, created_at
        `,
        [briefId],
      );

      return json(res, 200, { ok: true, shared: true, brief_id: briefId, brief: updateResult.rows[0] });
    } catch (error) {
      logger.error?.({ err: error }, 'failed to share brief');
      return json(res, 500, { ok: false, error: 'internal_error' });
    }
  });
}

export default registerWellnessTherapistRoutes;