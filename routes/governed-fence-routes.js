/**
 * SYNOPSIS: CONDUCTOR-GLUE founder-lane route for the governed-factory fence
 * switch. Mounts POST /api/v1/factory/governance/fence/enable, which lets the
 * SYSTEM turn its own governance fence ON (GOVERNED_FACTORY_ONLY=1) via the
 * Railway API and redeploy itself — but is physically incapable of turning it
 * OFF (any non-truthy value is rejected). Only a human editing Railway directly
 * can disable oversight. This is the separation-of-powers ratchet the Chair
 * approved (receipt LIFERE_COUNCIL_1783462353983); PR #272 added the guard but
 * never mounted a live surface, so nothing could actually flip it. Authors no
 * new governance logic — enable-only ratchet + Railway GraphQL, exposed through
 * the auto-register contract so it goes live on prod without editing the
 * protected composition root.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
const RAILWAY_GQL = 'https://backboard.railway.app/graphql/v2';
const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);

async function railwayGql(query, variables) {
  const token = process.env.RAILWAY_TOKEN;
  if (!token) throw new Error('RAILWAY_TOKEN not set in environment');
  const res = await fetch(RAILWAY_GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Railway API HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(`Railway GQL error: ${json.errors.map((e) => e.message).join('; ')}`);
  return json.data;
}

function fenceIsOn() {
  return TRUTHY_VALUES.has(String(process.env.GOVERNED_FACTORY_ONLY || '').trim().toLowerCase());
}

export function registerGovernedFenceRoutes(app, deps = {}) {
  const requireKey = deps.requireKey;
  const logger = deps.logger ?? console;

  if (typeof requireKey !== 'function') {
    throw new Error('registerGovernedFenceRoutes requires deps.requireKey');
  }

  // Read-only: is the governed-factory fence currently ON?
  app.get('/api/v1/factory/governance/fence', requireKey, (_req, res) => {
    res.json({
      ok: true,
      governed_factory_only: fenceIsOn(),
      raw: process.env.GOVERNED_FACTORY_ONLY ?? null,
      ratchet: 'enable-only — only a human in Railway can set it back to 0',
      receipt: 'LIFERE_COUNCIL_1783462353983',
    });
  });

  // One-way ratchet: turn the fence ON (and redeploy so it takes effect). A
  // request that would set a non-truthy value is REJECTED — the system can
  // enable its own oversight but can never disable it via this surface.
  app.post('/api/v1/factory/governance/fence/enable', requireKey, async (req, res) => {
    try {
      const requested = req.body?.value === undefined ? '1' : String(req.body.value).trim();
      if (!TRUTHY_VALUES.has(requested.toLowerCase())) {
        return res.status(403).json({
          ok: false,
          error: 'enable_only_ratchet: GOVERNED_FACTORY_ONLY can only be ENABLED via API; disabling requires a human editing Railway directly',
          receipt: 'LIFERE_COUNCIL_1783462353983',
        });
      }

      const projectId = process.env.RAILWAY_PROJECT_ID;
      const serviceId = process.env.RAILWAY_SERVICE_ID;
      const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;
      if (!projectId || !serviceId || !environmentId) {
        return res.status(500).json({
          ok: false,
          error: 'missing RAILWAY_PROJECT_ID / RAILWAY_SERVICE_ID / RAILWAY_ENVIRONMENT_ID — cannot self-manage env',
        });
      }

      await railwayGql(
        `mutation UpsertVars($input: VariableCollectionUpsertInput!) {
          variableCollectionUpsert(input: $input)
        }`,
        { input: { projectId, serviceId, environmentId, variables: { GOVERNED_FACTORY_ONLY: '1' } } },
      );

      await railwayGql(
        `mutation Redeploy($serviceId: String!, $environmentId: String!) {
          serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
        }`,
        { serviceId, environmentId },
      );

      logger.info?.('✅ [GOVERNED-FENCE] GOVERNED_FACTORY_ONLY=1 set in Railway + redeploy triggered');
      return res.json({
        ok: true,
        set: { GOVERNED_FACTORY_ONLY: '1' },
        redeploy: 'triggered',
        note: 'Redeploy takes ~1-2 min. One-way ratchet: only a human in Railway can disable.',
        receipt: 'LIFERE_COUNCIL_1783462353983',
      });
    } catch (err) {
      logger.error?.({ err: err.message }, '[GOVERNED-FENCE] enable failed');
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  logger.info?.('✅ [GOVERNED-FENCE] Routes mounted at /api/v1/factory/governance/fence[/enable]');
}

export default registerGovernedFenceRoutes;
