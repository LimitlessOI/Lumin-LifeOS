/**
 * SYNOPSIS: Registers TcIntakeRoutes routes/handlers (routes/tcIntakeRoutes.mjs).
 */
export function registerTcIntakeRoutes(app, deps) {
  const {
    pool,
    requireKey,
    callCouncilMember,
    logger
  } = deps || {};

  if (!app || typeof app.post !== 'function' || typeof app.patch !== 'function') {
    throw new Error('registerTcIntakeRoutes requires an Express app instance');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerTcIntakeRoutes requires deps.pool');
  }

  const json = (res, status, body) => res.status(status).json(body);
  const getReqBody = (req) => (req && req.body && typeof req.body === 'object' ? req.body : {});
  const getAgentId = (req) => {
    const body = getReqBody(req);
    return body.agentId ?? body.agent_id ?? req?.query?.agentId ?? req?.query?.agent_id ?? null;
  };

  const validateAgentId = (req, res) => {
    const agentId = getAgentId(req);
    if (!agentId) {
      json(res, 400, { ok: false, error: 'agentId is required' });
      return null;
    }
    return agentId;
  };

  const safeStringify = (value) => {
    try {
      return JSON.stringify(value ?? null);
    } catch {
      return JSON.stringify({ error: 'unserializable_payload' });
    }
  };

  const safeParseJson = (value) => {
    if (value == null) return null;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const insertTcRun = async (table, agentId, payload, status = 'queued') => {
    const result = await pool.query(
      `insert into ${table} (agent_id, status, payload)
       values ($1, $2, $3::jsonb)
       returning *`,
      [agentId, status, safeStringify(payload)]
    );
    return result.rows[0] || null;
  };

  const updateTcRun = async (table, id, patch) => {
    const keys = Object.keys(patch);
    if (!keys.length) return null;
    const setSql = keys.map((key, idx) => `${key} = $${idx + 2}`).join(', ');
    const values = [id];
    for (const key of keys) values.push(patch[key]);
    const result = await pool.query(
      `update ${table}
       set ${setSql}, updated_at = now()
       where id = $1
       returning *`,
      values
    );
    return result.rows[0] || null;
  };

  const createApprovalRow = async (agentId, payload) => {
    const result = await pool.query(
      `insert into tc_mobile_approvals (agent_id, status, payload)
       values ($1, $2, $3::jsonb)
       returning *`,
      [agentId, 'pending', safeStringify(payload)]
    );
    return result.rows[0] || null;
  };

  const processApprovalRow = async (id, payload) => {
    const result = await pool.query(
      `update tc_mobile_approvals
       set status = $2,
           payload = coalesce(payload, '{}'::jsonb) || $3::jsonb,
           updated_at = now()
       where id = $1
       returning *`,
      [id, payload?.status || 'processed', safeStringify(payload)]
    );
    return result.rows[0] || null;
  };

  const createApprovalItemFromPayload = async (payload) => {
    const transactionId = payload?.transactionId ?? payload?.transaction_id ?? null;
    if (!transactionId) return null;
    const result = await pool.query(
      `insert into tc_approval_items
       (transaction_id, category, title, summary, status, priority, due_at, target_type, target_id, prepared_action, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
       returning *`,
      [
        transactionId,
        payload?.category ?? 'mobile_approval',
        payload?.title ?? 'Approval request',
        payload?.summary ?? null,
        payload?.status ?? 'pending',
        payload?.priority ?? 'normal',
        payload?.dueAt ?? payload?.due_at ?? null,
        payload?.targetType ?? payload?.target_type ?? 'tc_mobile_approvals',
        payload?.targetId ?? payload?.target_id ?? null,
        payload?.preparedAction ?? payload?.prepared_action ?? null,
        safeStringify(payload?.metadata ?? payload ?? {})
      ]
    );
    return result.rows[0] || null;
  };

  app.post('/api/tc/intake/run', async (req, res) => {
    try {
      const agentId = validateAgentId(req, res);
      if (!agentId) return;

      const payload = getReqBody(req);
      const row = await insertTcRun('tc_intake_runs', agentId, payload, 'queued');
      json(res, 200, { ok: true, data: row });
    } catch (error) {
      logger?.error?.({ err: error }, 'tc intake run failed');
      json(res, 500, { ok: false, error: 'tc intake run failed' });
    }
  });

  app.post('/api/tc/intake/document-qa', async (req, res) => {
    try {
      const agentId = validateAgentId(req, res);
      if (!agentId) return;

      const payload = getReqBody(req);
      const body = {
        agentId,
        payload
      };

      const resultText = typeof callCouncilMember === 'function'
        ? await callCouncilMember('document-qa', JSON.stringify(body), { baseUrl: deps?.baseUrl })
        : JSON.stringify({ passed: false, issues: ['AI hook unavailable'] });

      const aiResult = safeParseJson(resultText) ?? {};
      const intakeRunId = payload?.intakeRunId ?? payload?.intake_run_id ?? null;
      const documentName = payload?.documentName ?? payload?.document_name ?? 'unknown';

      const insert = await pool.query(
        `insert into document_qa_results (intake_run_id, document_name, issues, passed)
         values ($1, $2, $3::jsonb, $4)
         returning *`,
        [
          intakeRunId,
          documentName,
          safeStringify(aiResult.issues ?? aiResult?.data?.issues ?? []),
          Boolean(aiResult.passed ?? aiResult?.data?.passed ?? false)
        ]
      );

      json(res, 200, { ok: true, data: insert.rows[0] || null });
    } catch (error) {
      logger?.error?.({ err: error }, 'document qa failed');
      json(res, 500, { ok: false, error: 'document qa failed' });
    }
  });

  app.post('/api/tc/offer-prep', async (req, res) => {
    try {
      const agentId = validateAgentId(req, res);
      if (!agentId) return;

      const payload = getReqBody(req);
      const row = await insertTcRun('tc_offer_prep_runs', agentId, payload, 'queued');
      json(res, 200, { ok: true, data: row });
    } catch (error) {
      logger?.error?.({ err: error }, 'offer prep failed');
      json(res, 500, { ok: false, error: 'offer prep failed' });
    }
  });

  app.post('/api/tc/approvals', requireKey, async (req, res) => {
    try {
      const agentId = validateAgentId(req, res);
      if (!agentId) return;

      const payload = getReqBody(req);
      const approval = await createApprovalRow(agentId, payload);
      const item = await createApprovalItemFromPayload(payload);

      json(res, 200, { ok: true, data: { approval, item } });
    } catch (error) {
      logger?.error?.({ err: error }, 'create approval request failed');
      json(res, 500, { ok: false, error: 'create approval request failed' });
    }
  });

  app.patch('/api/tc/approvals/:id', requireKey, async (req, res) => {
    try {
      const agentId = validateAgentId(req, res);
      if (!agentId) return;

      const id = req.params?.id;
      if (!id) {
        json(res, 400, { ok: false, error: 'approval id is required' });
        return;
      }

      const payload = getReqBody(req);
      const row = await processApprovalRow(id, payload);
      if (!row) {
        json(res, 404, { ok: false, error: 'approval not found' });
        return;
      }

      json(res, 200, { ok: true, data: row });
    } catch (error) {
      logger?.error?.({ err: error }, 'process approval failed');
      json(res, 500, { ok: false, error: 'process approval failed' });
    }
  });

  app.post('/api/tc/showing-feedback', async (req, res) => {
    try {
      const agentId = validateAgentId(req, res);
      if (!agentId) return;

      const payload = getReqBody(req);
      const resultText = typeof callCouncilMember === 'function'
        ? await callCouncilMember('showing-feedback', JSON.stringify({ agentId, payload }), { baseUrl: deps?.baseUrl })
        : JSON.stringify({ ok: true });

      json(res, 200, { ok: true, data: safeParseJson(resultText) ?? { ok: true } });
    } catch (error) {
      logger?.error?.({ err: error }, 'showing feedback request failed');
      json(res, 500, { ok: false, error: 'showing feedback request failed' });
    }
  });

  app.post('/api/tc/showing-feedback/webhook', async (req, res) => {
    try {
      const payload = getReqBody(req);
      json(res, 200, { ok: true, data: { received: true, payload } });
    } catch (error) {
      logger?.error?.({ err: error }, 'showing feedback webhook failed');
      json(res, 500, { ok: false, error: 'showing feedback webhook failed' });
    }
  });
}

export default registerTcIntakeRoutes;