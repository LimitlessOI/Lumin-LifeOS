/**
 * SYNOPSIS: Registers WellnessTherapistRoutes routes/handlers (routes/wellness-therapist-routes.js).
 */
export function registerWellnessTherapistRoutes(app, deps = {}) {
  const pool = deps.pool;
  const requireAuth = deps.requireAuth || ((req, res, next) => next());
  const consentRegistry = deps.consentRegistry || {};
  const logger = deps.logger || console;

  if (!app || typeof app.post !== 'function' || typeof app.get !== 'function') {
    throw new Error('registerWellnessTherapistRoutes requires an express app');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerWellnessTherapistRoutes requires deps.pool');
  }

  const json = (res, status, body) => res.status(status).json(body);

  const getActor = (req) => {
    const user = req.user || req.auth || {};
    return {
      userId: user.id ?? user.userId ?? user.sub ?? null,
      role: user.role ?? user.type ?? null,
      email: user.email ?? null,
    };
  };

  const canActAsTherapist = (actor) => actor && (actor.role === 'therapist' || actor.role === 'admin');

  const shareBriefIfConsented =
    typeof consentRegistry.shareBriefIfConsented === 'function'
      ? consentRegistry.shareBriefIfConsented
      : async (brief, clientUserId) => {
          if (!brief) return { shared: false, reason: 'missing_brief' };
          if (!clientUserId) return { shared: false, reason: 'missing_client_user_id' };
          return { shared: true, brief, clientUserId };
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
          returning id, user_id, display_name, approach, session_frequency, focus_areas, crisis_contact, created_at
        `,
        [
          actor.userId,
          display_name ?? null,
          approach ?? null,
          session_frequency ?? null,
          focus_areas ?? null,
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

      const { therapist_user_id, client_user_id, status, client_consented_at } = req.body || {};
      const effectiveTherapistUserId = therapist_user_id ?? actor.userId;

      if (effectiveTherapistUserId !== actor.userId && actor.role !== 'admin') {
        return json(res, 403, { ok: false, error: 'forbidden' });
      }

      const result = await pool.query(
        `
          insert into therapist_client_links (therapist_user_id, client_user_id, status, client_consented_at)
          values ($1, $2, $3, $4)
          returning id, therapist_user_id, client_user_id, status, client_consented_at, created_at
        `,
        [effectiveTherapistUserId, client_user_id ?? null, status ?? 'active', client_consented_at ?? null],
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

      const brief = req.body || {};
      return json(res, 201, {
        ok: true,
        brief: {
          id: brief.id ?? null,
          therapist_user_id: actor.userId,
          client_user_id: brief.client_user_id ?? null,
          content: brief.content ?? brief.text ?? null,
          title: brief.title ?? null,
        },
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

      const briefId = req.params.id;
      const { client_user_id, brief } = req.body || {};
      const payload = brief || { id: briefId, therapist_user_id: actor.userId };

      const shareResult = await shareBriefIfConsented(payload, client_user_id);
      if (!shareResult || shareResult.shared === false) {
        return json(res, 403, { ok: false, error: shareResult?.reason || 'consent_required' });
      }

      return json(res, 200, { ok: true, shared: true, brief_id: briefId, result: shareResult });
    } catch (error) {
      logger.error?.({ err: error }, 'failed to share brief');
      return json(res, 500, { ok: false, error: 'internal_error' });
    }
  });
}

export default registerWellnessTherapistRoutes;