/**
 * SYNOPSIS: Script — Run Marketingos Social Publish Verify.
 */
export default async function runMarketingosLayerA({ deps }) {
  const {
    pool,
    requireKey,
    logger,
    baseUrl,
    commitToGitHub,
    commitManyToGitHub,
  } = deps;

  const fetchFn = globalThis.fetch;
  if (typeof fetchFn !== 'function') {
    throw new Error('fetch_unavailable');
  }

  const publicBaseUrl = process.env.PUBLIC_BASE_URL || baseUrl;
  const commandCenterKey = process.env.COMMAND_CENTER_KEY;
  const liveSocialPublishEnabled = process.env.LIVE_SOCIAL_PUBLISH_ENABLED;

  if (!publicBaseUrl || !commandCenterKey) {
    throw new Error('missing_required_env_PUBLIC_BASE_URL_or_COMMAND_CENTER_KEY');
  }

  const headers = {
    'content-type': 'application/json',
    'x-command-key': commandCenterKey,
  };

  const requestJson = async (path, options = {}) => {
    const res = await fetchFn(new URL(path, publicBaseUrl), {
      method: options.method || 'GET',
      headers: { ...headers, ...(options.headers || {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    return { status: res.status, json };
  };

  const findApprovedPiece = async () => {
    const queries = [
      `select id, status from marketing_publish_records where status = 'approved' order by created_at desc limit 1`,
      `select id, status from socialmediaos_content_packs where status = 'approved' order by updated_at desc nulls last, created_at desc limit 1`,
      `select id, status from socialmediaos_sessions where status = 'approved' order by updated_at desc nulls last, created_at desc limit 1`,
    ];
    for (const sql of queries) {
      const r = await pool.query(sql);
      if (r.rows[0]?.id) return r.rows[0].id;
    }
    const draft = await pool.query(
      `select id from marketing_publish_records where status is distinct from 'approved' order by created_at desc limit 1`
    );
    return draft.rows[0]?.id || null;
  };

  const gates = [];
  const receipts = {
    assertions: [],
    liveSocialPublishEnabledAtRun: liveSocialPublishEnabled ?? null,
    killSwitchUnsetOrFalse: liveSocialPublishEnabled === undefined || liveSocialPublishEnabled === null || liveSocialPublishEnabled === '' || liveSocialPublishEnabled === '0' || liveSocialPublishEnabled === 'false',
  };

  const connections = await requestJson('/api/v1/marketing/social-connections');
  if (connections.status !== 200 || !connections.json || connections.json.ok !== true) {
    throw new Error(`social_connections_gate_failed:${connections.status}`);
  }
  gates.push('social_connections_ok');
  receipts.assertions.push({
    name: 'GET /api/v1/marketing/social-connections',
    gate: 'social_connections_ok',
    result: 'proven',
    response: connections.json,
  });

  const draftPieceId = await findApprovedPiece().then(async (approvedId) => {
    if (approvedId) {
      const r = await pool.query(`select id from marketing_publish_records where id = $1`, [approvedId]);
      if (r.rows[0]?.id) {
        const nonApproved = await pool.query(
          `select id from marketing_publish_records where id <> $1 and status is distinct from 'approved' order by created_at desc limit 1`,
          [approvedId]
        );
        if (nonApproved.rows[0]?.id) return nonApproved.rows[0].id;
      }
    }
    const inserted = await pool.query(
      `insert into marketing_publish_records (piece_id, platform, platform_post_id, published_at, status, publisher_service, error_detail)
       values ($1, $2, null, null, $3, $4, null)
       returning id`,
      ['layer-a-draft-piece', 'instagram', 'draft', 'layer-a-verifier']
    );
    return inserted.rows[0].id;
  });

  const draftPublish = await requestJson('/api/v1/marketing/publish', {
    method: 'POST',
    body: { piece_id: draftPieceId, platform: 'instagram' },
  });

  if (
    draftPublish.status !== 200 ||
    !draftPublish.json ||
    draftPublish.json.ok !== false ||
    draftPublish.json.error !== 'not_approved'
  ) {
    throw new Error(`approval_gate_failed:${draftPublish.status}`);
  }
  gates.push('approval_gate_not_soft');
  receipts.assertions.push({
    name: 'POST /api/v1/marketing/publish draft piece',
    gate: 'approval_gate_not_soft',
    result: 'proven',
    response: draftPublish.json,
  });

  const approvedPieceId = await (async () => {
    const approved = await pool.query(
      `select id from marketing_publish_records where status = 'approved' order by created_at desc limit 1`
    );
    if (approved.rows[0]?.id) return approved.rows[0].id;
    const pack = await pool.query(
      `select id from socialmediaos_content_packs where status = 'approved' order by updated_at desc nulls last, created_at desc limit 1`
    );
    if (pack.rows[0]?.id) return pack.rows[0].id;
    const session = await pool.query(
      `select id from socialmediaos_sessions where status = 'approved' order by updated_at desc nulls last, created_at desc limit 1`
    );
    if (session.rows[0]?.id) return session.rows[0].id;
    throw new Error('no_approved_piece_available_for_not_connected_gate');
  })();

  const notConnectedPublish = await requestJson('/api/v1/marketing/publish', {
    method: 'POST',
    body: { piece_id: approvedPieceId, platform: 'instagram' },
  });

  if (
    notConnectedPublish.status !== 200 ||
    !notConnectedPublish.json ||
    notConnectedPublish.json.ok !== false ||
    notConnectedPublish.json.reason !== 'not_connected'
  ) {
    throw new Error(`not_connected_gate_failed:${notConnectedPublish.status}`);
  }
  gates.push('connection_gate_not_soft');
  receipts.assertions.push({
    name: 'POST /api/v1/marketing/publish approved piece without connection',
    gate: 'connection_gate_not_soft',
    result: 'proven',
    response: notConnectedPublish.json,
  });

  if (!receipts.killSwitchUnsetOrFalse) {
    throw new Error('kill_switch_expected_unset_or_false');
  }

  const receipt = {
    surface_name: 'marketingos_social_publish_layer_a',
    proven_gates: gates,
    kill_switch_unset_or_false: receipts.killSwitchUnsetOrFalse,
    assertions: receipts.assertions,
    note: 'No real platform post was attempted; this verifier only asserts gate behavior with LIVE_SOCIAL_PUBLISH_ENABLED unset/false.',
    created_at: new Date().toISOString(),
  };

  await commitManyToGitHub(
    [
      {
        path: 'receipts/products/receipts/SENTRY_MARKETINGOS_SOCIAL_PUBLISH_LAYER_A.json',
        content: JSON.stringify(receipt, null, 2) + '\n',
      },
      {
        path: 'builderos-reboot/governance/SENTRY_PRODUCT_REGISTRY.json',
        content: await (async () => {
          const current = await pool.query(
            `select value_json from builder_truth_surfaces where surface_name = $1 order by id desc limit 1`,
            ['marketingos']
          );
          let registry = {};
          try {
            registry = current.rows[0]?.value_json || {};
          } catch {
            registry = {};
          }
          const next = JSON.parse(JSON.stringify(registry));
          next.marketingos = next.marketingos || {};
          next.marketingos.additional_a_checks = Array.isArray(next.marketingos.additional_a_checks)
            ? next.marketingos.additional_a_checks
            : [];
          if (!next.marketingos.additional_a_checks.includes('SENTRY_MARKETINGOS_SOCIAL_PUBLISH_LAYER_A')) {
            next.marketingos.additional_a_checks.push('SENTRY_MARKETINGOS_SOCIAL_PUBLISH_LAYER_A');
          }
          return JSON.stringify(next, null, 2) + '\n';
        })(),
      },
    ],
    'Register marketingos social publish layer A verifier and receipt'
  );

  logger.info({ receipt }, 'marketingos_social_publish_layer_a_verified');
  return receipt;
}