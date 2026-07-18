/**
 * SYNOPSIS: Registers SiteBuilderAbSubjectRoutes routes/handlers (routes/site-builder-ab-subject-routes.js).
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
export function registerSiteBuilderAbSubjectRoutes(app, deps) {
  const pool = deps?.pool;
  const requireKey = deps?.requireKey;
  const callCouncilMember = deps?.callCouncilMember;
  const logger = deps?.logger ?? console;

  if (!app || !pool || typeof requireKey !== 'function' || typeof callCouncilMember !== 'function') {
    throw new Error('registerSiteBuilderAbSubjectRoutes requires app, deps.pool, deps.requireKey, and deps.callCouncilMember');
  }

  const router = app;

  function jsonError(res, status, message, details) {
    return res.status(status).json({
      ok: false,
      error: message,
      ...(details ? { details } : {})
    });
  }

  function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function parseBody(req) {
    return req && req.body && typeof req.body === 'object' ? req.body : {};
  }

  function computeStats(rows) {
    const test = rows.test;
    const events = rows.events;

    const opensA = Number(test.opens_a ?? 0);
    const opensB = Number(test.opens_b ?? 0);
    const sendsA = Number(test.sends_a ?? 0);
    const sendsB = Number(test.sends_b ?? 0);

    const openRateA = sendsA > 0 ? opensA / sendsA : 0;
    const openRateB = sendsB > 0 ? opensB / sendsB : 0;

    const eventsByVariant = events.reduce((acc, event) => {
      const variant = event.variant;
      if (!acc[variant]) acc[variant] = {};
      acc[variant][event.event_type] = (acc[variant][event.event_type] || 0) + 1;
      return acc;
    }, {});

    return {
      id: test.id,
      site_id: test.site_id,
      variant_a: test.variant_a,
      variant_b: test.variant_b,
      winner: test.winner,
      status: test.status,
      sends_a: sendsA,
      sends_b: sendsB,
      opens_a: opensA,
      opens_b: opensB,
      open_rate_a: openRateA,
      open_rate_b: openRateB,
      events: eventsByVariant,
      created_at: test.created_at,
      updated_at: test.updated_at
    };
  }

  router.post('/api/site-builder/ab-subject/tests', requireKey, async (req, res) => {
    try {
      const body = parseBody(req);
      const siteId = body.site_id;
      const variantA = normalizeText(body.variant_a);
      const variantB = normalizeText(body.variant_b);

      if (!siteId) return jsonError(res, 400, 'site_id is required');
      if (!variantA) return jsonError(res, 400, 'variant_a is required');
      if (!variantB) return jsonError(res, 400, 'variant_b is required');

      const result = await pool.query(
        'INSERT INTO site_builder_ab_subject_tests (site_id, variant_a, variant_b, status, sends_a, sends_b, opens_a, opens_b) VALUES ($1, $2, $3, $4, 0, 0, 0, 0) RETURNING id, site_id, variant_a, variant_b, winner, sends_a, sends_b, opens_a, opens_b, status, created_at, updated_at',
        [siteId, variantA, variantB, 'active']
      );

      logger.info({ testId: result.rows[0]?.id, siteId }, 'Created A/B subject test');
      return res.status(201).json({ ok: true, test: result.rows[0] });
    } catch (error) {
      logger.error({ err: error }, 'Failed to create A/B subject test');
      return jsonError(res, 500, 'Failed to create test');
    }
  });

  router.post('/api/site-builder/ab-subject/tests/:testId/events', requireKey, async (req, res) => {
    try {
      const testId = req.params?.testId;
      const body = parseBody(req);
      const variant = normalizeText(body.variant);
      const eventType = normalizeText(body.event_type);

      if (!testId) return jsonError(res, 400, 'testId is required');
      if (!variant) return jsonError(res, 400, 'variant is required');
      if (!eventType) return jsonError(res, 400, 'event_type is required');

      await pool.query(
        'INSERT INTO site_builder_ab_subject_events (test_id, variant, event_type) VALUES ($1, $2, $3)',
        [testId, variant, eventType]
      );

      if (eventType === 'open') {
        if (variant === 'a') {
          await pool.query('UPDATE site_builder_ab_subject_tests SET opens_a = COALESCE(opens_a, 0) + 1, updated_at = NOW() WHERE id = $1', [testId]);
        } else if (variant === 'b') {
          await pool.query('UPDATE site_builder_ab_subject_tests SET opens_b = COALESCE(opens_b, 0) + 1, updated_at = NOW() WHERE id = $1', [testId]);
        }
      }

      if (eventType === 'send') {
        if (variant === 'a') {
          await pool.query('UPDATE site_builder_ab_subject_tests SET sends_a = COALESCE(sends_a, 0) + 1, updated_at = NOW() WHERE id = $1', [testId]);
        } else if (variant === 'b') {
          await pool.query('UPDATE site_builder_ab_subject_tests SET sends_b = COALESCE(sends_b, 0) + 1, updated_at = NOW() WHERE id = $1', [testId]);
        }
      }

      return res.status(201).json({ ok: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to record A/B subject event');
      return jsonError(res, 500, 'Failed to record event');
    }
  });

  router.get('/api/site-builder/ab-subject/tests/:testId', async (req, res) => {
    try {
      const testId = req.params?.testId;
      if (!testId) return jsonError(res, 400, 'testId is required');

      const testResult = await pool.query(
        'SELECT id, site_id, variant_a, variant_b, winner, sends_a, sends_b, opens_a, opens_b, status, created_at, updated_at FROM site_builder_ab_subject_tests WHERE id = $1 LIMIT 1',
        [testId]
      );

      if (!testResult.rows.length) return jsonError(res, 404, 'Test not found');

      const eventsResult = await pool.query(
        'SELECT id, test_id, variant, event_type, occurred_at FROM site_builder_ab_subject_events WHERE test_id = $1 ORDER BY occurred_at ASC, id ASC',
        [testId]
      );

      return res.json({
        ok: true,
        test: computeStats({ test: testResult.rows[0], events: eventsResult.rows })
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch A/B subject test');
      return jsonError(res, 500, 'Failed to fetch test');
    }
  });

  router.post('/api/site-builder/ab-subject/tests/:testId/conclude', requireKey, async (req, res) => {
    try {
      const testId = req.params?.testId;
      const body = parseBody(req);
      const winner = normalizeText(body.winner);

      if (!testId) return jsonError(res, 400, 'testId is required');
      if (!winner) return jsonError(res, 400, 'winner is required');

      const testResult = await pool.query(
        'SELECT id, variant_a, variant_b, status FROM site_builder_ab_subject_tests WHERE id = $1 LIMIT 1',
        [testId]
      );

      if (!testResult.rows.length) return jsonError(res, 404, 'Test not found');

      if (winner !== 'a' && winner !== 'b' && winner !== 'tie') {
        return jsonError(res, 400, 'winner must be a, b, or tie');
      }

      const updated = await pool.query(
        'UPDATE site_builder_ab_subject_tests SET winner = $2, status = $3, updated_at = NOW() WHERE id = $1 RETURNING id, site_id, variant_a, variant_b, winner, sends_a, sends_b, opens_a, opens_b, status, created_at, updated_at',
        [testId, winner, 'concluded']
      );

      const guidance = await callCouncilMember(
        'product-strategy',
        `Provide a short one-paragraph recommendation for the concluded A/B subject-line test ${testId}. Winner: ${winner}. Return concise guidance only.`
      ).catch((error) => {
        logger.warn({ err: error, testId }, 'Council guidance unavailable');
        return '';
      });

      return res.json({
        ok: true,
        test: updated.rows[0],
        guidance: guidance || null
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to conclude A/B subject test');
      return jsonError(res, 500, 'Failed to conclude test');
    }
  });
}

export default registerSiteBuilderAbSubjectRoutes;