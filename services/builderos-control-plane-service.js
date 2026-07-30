/**
 * SYNOPSIS: BuilderOS Control Plane — measurement aggregation + DONE gate + build ledger.
 * WIRED: partial — HTTP /api/v1/builderos/control-plane; founder job poll does not read ledger
 * INTEGRATE: founder-interface/build-job/:id poll UI + founder-build-success-gate PASS sync
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

function todayStartUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function createBuilderOSControlPlaneService({ pool, tokenAccounting, logger = console }) {
  async function recordBuildStart(payload = {}) {
    if (!pool) throw new Error('database pool unavailable');
    const task_id = payload.task_id;
    if (!task_id) throw new Error('task_id is required');

    const { rows } = await pool.query(
      `INSERT INTO build_task_ledger (
         task_id, blueprint_id, product_lane, source, status, start_time,
         files_planned, model_used, agent_used, human_intervention, proof_required, metadata
       ) VALUES ($1,$2,$3,$4,'running',COALESCE($5::timestamptz, NOW()),$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        task_id,
        payload.blueprint_id || null,
        payload.product_lane || null,
        payload.source || 'builderos',
        payload.start_time || null,
        payload.files_planned || null,
        payload.model_used || null,
        payload.agent_used || null,
        Boolean(payload.human_intervention),
        JSON.stringify(payload.proof_required || ['token', 'build', 'oil']),
        JSON.stringify(payload.metadata || {}),
      ]
    );
    return rows[0];
  }

  async function recordBuildComplete(payload = {}) {
    if (!pool) throw new Error('database pool unavailable');
    const task_id = payload.task_id;
    if (!task_id) throw new Error('task_id is required');

    let token_receipt_id = payload.token_receipt_id ?? null;
    if (!token_receipt_id && !payload.unmetered_exception_id) {
      try {
        const { linkTokenReceiptToTask } = await import('./kernel-token-linker.js');
        const linked = await linkTokenReceiptToTask(pool, task_id);
        if (linked?.token_id) token_receipt_id = linked.token_id;
      } catch {
        /* non-fatal — gate may still find by request_id */
      }
    }

    const gate = await canMarkBuildDone({
      task_id,
      allow_exception: payload.allow_exception,
      pending: {
        end_time: payload.end_time || new Date().toISOString(),
        token_receipt_id,
        oil_receipt_id: payload.oil_receipt_id || null,
      },
    });
    if (!gate.allowed && payload.enforce !== false) {
      throw new Error(`BUILDEROS_DONE_BLOCKED: ${gate.reason}`);
    }

    const { rows } = await pool.query(
      `UPDATE build_task_ledger SET
         status = COALESCE($2, 'done'),
         end_time = COALESCE($3::timestamptz, NOW()),
         files_changed = COALESCE($4, files_changed),
         lines_added = COALESCE($5, lines_added),
         lines_removed = COALESCE($6, lines_removed),
         commands_run = COALESCE($7::jsonb, commands_run),
         tests_run = COALESCE($8::jsonb, tests_run),
         failures = COALESCE($9::jsonb, failures),
         retries = COALESCE($10, retries),
         deploy_status = COALESCE($11, deploy_status),
         rollback_status = COALESCE($12, rollback_status),
         token_receipt_id = COALESCE($13, token_receipt_id),
         oil_receipt_id = COALESCE($14, oil_receipt_id),
         unmetered_exception_id = COALESCE($15, unmetered_exception_id),
         proof_status = $16,
         human_intervention = COALESCE($17, human_intervention),
         human_intervention_note = COALESCE($18, human_intervention_note),
         metadata = COALESCE($19::jsonb, metadata),
         updated_at = NOW()
       WHERE task_id = $1 AND status = 'running'
       RETURNING *`,
      [
        task_id,
        payload.status || 'done',
        payload.end_time || null,
        payload.files_changed || null,
        payload.lines_added ?? null,
        payload.lines_removed ?? null,
        payload.commands_run ? JSON.stringify(payload.commands_run) : null,
        payload.tests_run ? JSON.stringify(payload.tests_run) : null,
        payload.failures ? JSON.stringify(payload.failures) : null,
        payload.retries ?? null,
        payload.deploy_status || null,
        payload.rollback_status || null,
        token_receipt_id,
        payload.oil_receipt_id || null,
        payload.unmetered_exception_id ?? null,
        gate.proof_status,
        payload.human_intervention ?? null,
        payload.human_intervention_note || null,
        payload.metadata ? JSON.stringify(payload.metadata) : null,
      ]
    );

    if (!rows[0]) {
      await recordBuildStart({ ...payload });
      const retry = await pool.query(
        `UPDATE build_task_ledger SET
           status = COALESCE($2, 'done'),
           end_time = COALESCE($3::timestamptz, NOW()),
           files_changed = COALESCE($4, files_changed),
           lines_added = COALESCE($5, lines_added),
           lines_removed = COALESCE($6, lines_removed),
           commands_run = COALESCE($7::jsonb, commands_run),
           tests_run = COALESCE($8::jsonb, tests_run),
           failures = COALESCE($9::jsonb, failures),
           retries = COALESCE($10, retries),
           deploy_status = COALESCE($11, deploy_status),
           rollback_status = COALESCE($12, rollback_status),
           token_receipt_id = COALESCE($13, token_receipt_id),
           oil_receipt_id = COALESCE($14, oil_receipt_id),
           unmetered_exception_id = COALESCE($15, unmetered_exception_id),
           proof_status = $16,
           human_intervention = COALESCE($17, human_intervention),
           human_intervention_note = COALESCE($18, human_intervention_note),
           metadata = COALESCE($19::jsonb, metadata),
           updated_at = NOW()
         WHERE id = (
           SELECT id FROM build_task_ledger WHERE task_id = $1 ORDER BY start_time DESC LIMIT 1
         )
         RETURNING *`,
        [
          task_id,
          payload.status || 'done',
          payload.end_time || null,
          payload.files_changed || null,
          payload.lines_added ?? null,
          payload.lines_removed ?? null,
          payload.commands_run ? JSON.stringify(payload.commands_run) : null,
          payload.tests_run ? JSON.stringify(payload.tests_run) : null,
          payload.failures ? JSON.stringify(payload.failures) : null,
          payload.retries ?? null,
          payload.deploy_status || null,
          payload.rollback_status || null,
          token_receipt_id,
          payload.oil_receipt_id || null,
          payload.unmetered_exception_id ?? null,
          gate.proof_status,
          payload.human_intervention ?? null,
          payload.human_intervention_note || null,
          payload.metadata ? JSON.stringify(payload.metadata) : null,
        ]
      );
      return retry.rows[0];
    }
    return rows[0];
  }

  async function getBuildByTaskId(task_id) {
    if (!pool) return null;
    const { rows } = await pool.query(
      `SELECT * FROM build_task_ledger WHERE task_id = $1 ORDER BY start_time DESC LIMIT 1`,
      [task_id]
    );
    return rows[0] || null;
  }

  async function getTokenMetricsToday() {
    const since = todayStartUtc();
    const empty = {
      ai_calls_today: 0,
      metered_today: 0,
      unmetered_today: 0,
      estimated_spend_usd: 0,
      top_token_task: null,
    };
    if (!pool) return empty;

    try {
      const calls = await pool.query(
        `SELECT COUNT(*)::int AS n,
                COALESCE(SUM(cost_usd),0)::float AS spend
         FROM token_usage_log WHERE logged_at >= $1`,
        [since]
      );
      const unmetered = await pool.query(
        `SELECT COUNT(*)::int AS n FROM ai_unmetered_exceptions WHERE created_at >= $1`,
        [since]
      ).catch(() => ({ rows: [{ n: 0 }] }));

      const top = await pool.query(
        `SELECT COALESCE(request_id, session_id, task_type) AS task_id,
                SUM(input_tokens + output_tokens)::bigint AS total_tokens,
                SUM(cost_usd)::float AS cost_usd
         FROM token_usage_log WHERE logged_at >= $1
         GROUP BY 1 ORDER BY total_tokens DESC NULLS LAST LIMIT 1`,
        [since]
      ).catch(() => ({ rows: [] }));

      const aiCalls = calls.rows[0]?.n || 0;
      const unmeteredN = unmetered.rows[0]?.n || 0;
      return {
        ai_calls_today: aiCalls,
        metered_today: aiCalls,
        unmetered_today: unmeteredN,
        estimated_spend_usd: Number(calls.rows[0]?.spend || 0),
        top_token_task: top.rows[0] || null,
      };
    } catch (err) {
      logger.warn?.('[CONTROL-PLANE] token metrics failed:', err.message);
      return empty;
    }
  }

  async function getBuildMetricsToday() {
    const since = todayStartUtc();
    if (!pool) return { builds_today: 0, longest_build_ms: null, without_proof: 0 };
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS builds_today,
              MAX(duration_ms)::int AS longest_build_ms,
              COUNT(*) FILTER (WHERE proof_status NOT IN ('complete','exception'))::int AS without_proof
       FROM build_task_ledger WHERE start_time >= $1`,
      [since]
    ).catch(() => ({ rows: [{ builds_today: 0, longest_build_ms: null, without_proof: 0 }] }));
    return rows[0];
  }

  async function getTasksWithoutProof(limit = 20) {
    if (!pool) return [];
    const { rows } = await pool.query(
      `SELECT task_id, blueprint_id, status, proof_status, start_time, end_time, duration_ms
       FROM build_task_ledger
       WHERE proof_status NOT IN ('complete', 'exception')
       ORDER BY start_time DESC LIMIT $1`,
      [Math.min(Number(limit) || 20, 100)]
    ).catch(() => ({ rows: [] }));
    return rows;
  }

  async function getWorstPerformingModels(limit = 5) {
    if (!pool) return [];
    const { rows } = await pool.query(
      `SELECT model_used, agent_used,
              COUNT(*)::int AS builds,
              COUNT(*) FILTER (WHERE status = 'failed')::int AS failures,
              ROUND(AVG(duration_ms))::int AS avg_duration_ms
       FROM build_task_ledger
       WHERE model_used IS NOT NULL
       GROUP BY model_used, agent_used
       ORDER BY failures DESC, builds DESC
       LIMIT $1`,
      [Math.min(Number(limit) || 5, 20)]
    ).catch(() => ({ rows: [] }));
    return rows;
  }

  async function canMarkBuildDone({ task_id, allow_exception = false, pending = {} } = {}) {
    const health = await getMeasurementHealth();
    if (health.status === 'RED' && !allow_exception) {
      return { allowed: false, reason: 'measurement_coverage_red', proof_status: 'pending', health };
    }

    const build = await getBuildByTaskId(task_id);
    if (!build) {
      return { allowed: false, reason: 'no_build_ledger_row', proof_status: 'pending' };
    }

    const merged = {
      ...build,
      ...(pending.end_time && { end_time: pending.end_time }),
      ...(pending.token_receipt_id && { token_receipt_id: pending.token_receipt_id }),
      ...(pending.oil_receipt_id && { oil_receipt_id: pending.oil_receipt_id }),
    };

    let hasToken = Boolean(merged.token_receipt_id || merged.unmetered_exception_id);
    let hasOil = Boolean(merged.oil_receipt_id);

    if (!hasToken && pool) {
      const tok = await pool.query(
        `SELECT id FROM token_usage_log
         WHERE request_id = $1 OR session_id = $1 LIMIT 1`,
        [task_id]
      ).catch(() => ({ rows: [] }));
      hasToken = tok.rows.length > 0;
      if (!hasToken) {
        const exc = await pool.query(
          `SELECT id FROM ai_unmetered_exceptions WHERE task_id = $1 LIMIT 1`,
          [task_id]
        ).catch(() => ({ rows: [] }));
        hasToken = exc.rows.length > 0;
      }
    }

    if (!hasOil && pool) {
      const oil = await pool.query(
        `SELECT id::text FROM security_receipts
         WHERE payload->>'task_id' = $1 OR payload->>'build_task_id' = $1
         LIMIT 1`,
        [task_id]
      ).catch(() => ({ rows: [] }));
      hasOil = oil.rows.length > 0;
    }

    const complete = hasToken && merged.end_time && hasOil;
    const partial = hasToken || merged.end_time || hasOil;
    const proof_status = complete ? 'complete' : allow_exception ? 'exception' : partial ? 'partial' : 'pending';

    if (!complete && !allow_exception) {
      const missing = [];
      if (!hasToken) missing.push('token_receipt');
      if (!merged.end_time) missing.push('build_end_time');
      if (!hasOil) missing.push('oil_receipt');
      return { allowed: false, reason: `missing_proof:${missing.join(',')}`, proof_status, hasToken, hasOil, build: merged };
    }

    return { allowed: true, proof_status, hasToken, hasOil, build: merged };
  }

  async function getMeasurementHealth() {
    const health = {
      status: 'RED',
      measurement_coverage: {},
      blind_spots: [],
      token: {},
      build: {},
      tables: {},
    };

    if (!pool) {
      health.blind_spots.push('no_database_pool');
      return health;
    }

    const reg = await pool.query(`
      SELECT
        to_regclass('public.build_task_ledger') IS NOT NULL AS btl,
        to_regclass('public.token_usage_log') IS NOT NULL AS tul,
        to_regclass('public.ai_unmetered_exceptions') IS NOT NULL AS aue,
        to_regclass('public.unified_token_accounting_report') IS NOT NULL AS uta,
        to_regclass('public.security_receipts') IS NOT NULL AS oil,
        to_regclass('public.lessons_learned') IS NOT NULL AS lessons,
        to_regclass('public.builderos_tsos_routing_decisions') IS NOT NULL AS routing
    `).catch(() => ({ rows: [{}] }));

    health.tables = reg.rows[0] || {};
    health.token = await getTokenMetricsToday();
    health.build = await getBuildMetricsToday();

    if (tokenAccounting?.getHealth) {
      health.token_accounting = await tokenAccounting.getHealth();
    }

    const coverage = {
      build_task_ledger: Boolean(health.tables.btl),
      token_usage_log: Boolean(health.tables.tul),
      ai_unmetered_exceptions: Boolean(health.tables.aue),
      unified_token_view: Boolean(health.tables.uta),
      oil_receipts: Boolean(health.tables.oil),
    };
    health.measurement_coverage = coverage;

    if (!coverage.build_task_ledger) health.blind_spots.push('build_task_ledger_missing');
    if (!coverage.token_usage_log) health.blind_spots.push('token_usage_log_missing');
    if (!coverage.ai_unmetered_exceptions) health.blind_spots.push('ai_unmetered_exceptions_missing');
    if (!coverage.unified_token_view) health.blind_spots.push('unified_token_accounting_view_missing');
    if (health.token.ai_calls_today === 0 && health.build.builds_today === 0) {
      health.blind_spots.push('no_activity_today');
    }
    if (health.token.unmetered_today > 0) health.blind_spots.push('unmetered_calls_today');

    const covered = Object.values(coverage).filter(Boolean).length;
    const total = Object.keys(coverage).length;

    if (covered === total && health.token.unmetered_today === 0) {
      health.status = health.token.ai_calls_today > 0 || health.build.builds_today > 0 ? 'GREEN' : 'YELLOW';
    } else if (covered >= 3) {
      health.status = 'YELLOW';
    } else {
      health.status = 'RED';
    }

    if (health.build.without_proof > 0) {
      health.status = health.status === 'GREEN' ? 'YELLOW' : health.status;
      health.blind_spots.push('builds_without_proof');
    }

    health.linkage = await getLinkageStats({ sinceHours: 168, limit: 50 });
    if (health.linkage.linkage_gap) {
      health.blind_spots.push('spend_outcome_linkage_gap');
      if (health.status === 'GREEN') health.status = 'YELLOW';
    }
    const strictOutcome = process.env.SPEND_OUTCOME_STRICT === '1'
      || /^true$/i.test(String(process.env.SPEND_OUTCOME_STRICT || ''));
    if (strictOutcome && health.linkage.linkage_gap) {
      health.status = 'RED';
      health.blind_spots.push('spend_outcome_strict_refuse');
    }

    return health;
  }

  async function getLinkageStats({ sinceHours = 168, limit = 50 } = {}) {
    if (!pool) {
      return {
        sample: 0,
        linked: 0,
        linkage_rate: null,
        linkage_gap: true,
        note: 'no_database_pool',
      };
    }
    const since = new Date(Date.now() - Math.max(1, Number(sinceHours) || 168) * 3600_000);
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int AS sample,
         COUNT(*) FILTER (WHERE token_receipt_id IS NOT NULL OR unmetered_exception_id IS NOT NULL)::int AS linked
       FROM (
         SELECT token_receipt_id, unmetered_exception_id
         FROM build_task_ledger
         WHERE start_time >= $1
           AND status IN ('done', 'failed')
         ORDER BY start_time DESC
         LIMIT $2
       ) recent`,
      [since.toISOString(), Math.min(Math.max(Number(limit) || 50, 5), 500)],
    ).catch(() => ({ rows: [{ sample: 0, linked: 0 }] }));
    const sample = rows[0]?.sample || 0;
    const linked = rows[0]?.linked || 0;
    const linkage_rate = sample > 0 ? linked / sample : null;
    return {
      sample,
      linked,
      linkage_rate,
      linkage_gap: sample === 0 ? true : linkage_rate < 0.5,
      since_hours: sinceHours,
    };
  }

  /**
   * Founder S00 report: dollars in → named build outcomes out.
   * If spendUsd is set, walks newest→oldest builds until cumulative token cost ≈ that budget.
   */
  async function getSpendOutcomesReport({
    sinceHours = 168,
    spendUsd = null,
  } = {}) {
    const since = new Date(Date.now() - Math.max(1, Number(sinceHours) || 168) * 3600_000);
    const empty = {
      ok: true,
      schema: 'spend_outcomes_report_v1',
      since: since.toISOString(),
      spend_usd_window: spendUsd != null ? Number(spendUsd) : null,
      total_spend_usd: 0,
      total_tokens: 0,
      builds: 0,
      shipped: 0,
      failed: 0,
      linked_builds: 0,
      linkage_rate: null,
      cost_per_shipped_usd: null,
      avg_duration_ms_shipped: null,
      outcomes: [],
      efficiency: null,
      founder_line: 'No metered build activity in window.',
      blind: true,
    };
    if (!pool) return { ...empty, ok: false, error: 'no_database_pool' };

    const spendQ = await pool.query(
      `SELECT COALESCE(SUM(cost_usd),0)::float AS spend,
              COALESCE(SUM(COALESCE(input_tokens,0)+COALESCE(output_tokens,0)),0)::bigint AS tokens
       FROM token_usage_log WHERE logged_at >= $1`,
      [since.toISOString()],
    ).catch(() => ({ rows: [{ spend: 0, tokens: 0 }] }));

    const buildsQ = await pool.query(
      `SELECT b.task_id, b.blueprint_id, b.product_lane, b.status, b.duration_ms,
              b.files_changed, b.proof_status, b.start_time, b.end_time,
              b.token_receipt_id, b.unmetered_exception_id, b.metadata,
              t.cost_usd::float AS receipt_cost_usd,
              COALESCE(t.input_tokens,0)::int AS input_tokens,
              COALESCE(t.output_tokens,0)::int AS output_tokens,
              t.model, t.provider
       FROM build_task_ledger b
       LEFT JOIN token_usage_log t ON t.id::text = b.token_receipt_id::text
       WHERE b.start_time >= $1
         AND b.status IN ('done', 'failed')
       ORDER BY b.start_time DESC
       LIMIT 200`,
      [since.toISOString()],
    ).catch(() => ({ rows: [] }));

    let rows = buildsQ.rows || [];
    const budget = spendUsd != null && Number(spendUsd) > 0 ? Number(spendUsd) : null;
    if (budget != null) {
      const picked = [];
      let acc = 0;
      for (const row of rows) {
        const c = Number(row.receipt_cost_usd || 0);
        picked.push(row);
        acc += c;
        if (acc >= budget) break;
      }
      rows = picked;
    }

    const outcomes = rows.map((r) => {
      const files = Array.isArray(r.files_changed) ? r.files_changed : [];
      const meta = typeof r.metadata === 'object' && r.metadata ? r.metadata : {};
      const commit_sha = meta.commit_sha || meta.sha || null;
      return {
        task_id: r.task_id,
        blueprint_id: r.blueprint_id,
        product_lane: r.product_lane,
        status: r.status,
        duration_ms: r.duration_ms,
        files_changed: files,
        commit_sha,
        cost_usd: r.receipt_cost_usd != null ? Number(r.receipt_cost_usd) : null,
        tokens: (r.input_tokens || 0) + (r.output_tokens || 0),
        linked: Boolean(r.token_receipt_id || r.unmetered_exception_id),
        proof_status: r.proof_status,
        at: r.start_time,
      };
    });

    const shipped = outcomes.filter((o) => o.status === 'done');
    const failed = outcomes.filter((o) => o.status === 'failed');
    const linked_builds = outcomes.filter((o) => o.linked).length;
    const outcomeSpend = outcomes.reduce((s, o) => s + (o.cost_usd || 0), 0);
    const total_spend_usd = budget != null ? outcomeSpend : Number(spendQ.rows[0]?.spend || 0);
    const avg_duration_ms_shipped = shipped.length
      ? Math.round(shipped.reduce((s, o) => s + (o.duration_ms || 0), 0) / shipped.length)
      : null;
    const cost_per_shipped_usd = shipped.length
      ? total_spend_usd / shipped.length
      : null;
    const linkage_rate = outcomes.length ? linked_builds / outcomes.length : null;

    const efficiency = await getEfficiencyTrend().catch(() => null);

    const topFiles = shipped
      .flatMap((o) => o.files_changed || [])
      .slice(0, 12);
    const founder_line = shipped.length
      ? `$${total_spend_usd.toFixed(2)} produced ${shipped.length} shipped build(s)`
        + (topFiles.length ? ` touching ${[...new Set(topFiles)].slice(0, 5).join(', ')}` : '')
        + (cost_per_shipped_usd != null ? ` (≈$${cost_per_shipped_usd.toFixed(2)}/shipped)` : '')
        + '.'
      : `$${Number(spendQ.rows[0]?.spend || 0).toFixed(2)} spent in window with ${outcomes.length} ledger builds — none status=done (or ledger empty).`;

    const blind = outcomes.length === 0
      || linkage_rate == null
      || linkage_rate < 0.5
      || (shipped.length > 0 && outcomeSpend === 0 && Number(spendQ.rows[0]?.spend || 0) > 0);

    return {
      ok: true,
      schema: 'spend_outcomes_report_v1',
      since: since.toISOString(),
      spend_usd_window: budget,
      total_spend_usd,
      window_spend_usd: Number(spendQ.rows[0]?.spend || 0),
      total_tokens: Number(spendQ.rows[0]?.tokens || 0),
      builds: outcomes.length,
      shipped: shipped.length,
      failed: failed.length,
      linked_builds,
      linkage_rate,
      cost_per_shipped_usd,
      avg_duration_ms_shipped,
      outcomes,
      efficiency,
      founder_line,
      blind,
      hard_gate: {
        spend_outcome_strict: process.env.SPEND_OUTCOME_STRICT === '1' || process.env.SPEND_OUTCOME_STRICT === 'true',
        token_accounting_strict: process.env.TOKEN_ACCOUNTING_STRICT === '1' || process.env.TOKEN_ACCOUNTING_STRICT === 'true',
        refuse_when_blind: process.env.SPEND_OUTCOME_STRICT === '1' || process.env.SPEND_OUTCOME_STRICT === 'true',
      },
    };
  }

  async function getEfficiencyTrend() {
    if (!pool) return null;
    const q = async (hoursAgoStart, hoursAgoEnd) => {
      const start = new Date(Date.now() - hoursAgoStart * 3600_000);
      const end = new Date(Date.now() - hoursAgoEnd * 3600_000);
      const { rows } = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE b.status = 'done')::int AS shipped,
           COALESCE(SUM(t.cost_usd) FILTER (WHERE b.status = 'done'),0)::float AS spend,
           ROUND(AVG(b.duration_ms) FILTER (WHERE b.status = 'done'))::int AS avg_ms
         FROM build_task_ledger b
         LEFT JOIN token_usage_log t ON t.id::text = b.token_receipt_id::text
         WHERE b.start_time >= $1 AND b.start_time < $2`,
        [start.toISOString(), end.toISOString()],
      ).catch(() => ({ rows: [{ shipped: 0, spend: 0, avg_ms: null }] }));
      const shipped = rows[0]?.shipped || 0;
      const spend = Number(rows[0]?.spend || 0);
      return {
        shipped,
        spend_usd: spend,
        avg_duration_ms: rows[0]?.avg_ms ?? null,
        cost_per_shipped_usd: shipped ? spend / shipped : null,
      };
    };
    const current = await q(168, 0);
    const prior = await q(336, 168);
    let direction = 'unknown';
    if (current.cost_per_shipped_usd != null && prior.cost_per_shipped_usd != null) {
      if (current.cost_per_shipped_usd < prior.cost_per_shipped_usd * 0.95) direction = 'more_efficient';
      else if (current.cost_per_shipped_usd > prior.cost_per_shipped_usd * 1.05) direction = 'less_efficient';
      else direction = 'flat';
    }
    return { current_7d: current, prior_7d: prior, direction };
  }

  async function estimateBuilds({ items = [] } = {}) {
    if (!pool) {
      return { ok: false, error: 'no_database_pool', estimates: [] };
    }
    const list = Array.isArray(items) && items.length
      ? items
      : [{ label: 'generic_build' }];
    const estimates = [];
    for (const item of list) {
      const label = item.label || item.blueprint_id || item.product_lane || 'build';
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n,
                ROUND(AVG(b.duration_ms))::int AS avg_ms,
                COALESCE(AVG(t.cost_usd),0)::float AS avg_cost,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY b.duration_ms)::int AS p50_ms
         FROM build_task_ledger b
         LEFT JOIN token_usage_log t ON t.id::text = b.token_receipt_id::text
         WHERE b.status = 'done'
           AND (
             ($1::text IS NOT NULL AND b.blueprint_id = $1)
             OR ($2::text IS NOT NULL AND b.product_lane = $2)
             OR ($1::text IS NULL AND $2::text IS NULL)
           )
           AND b.start_time >= NOW() - INTERVAL '60 days'
           AND b.duration_ms IS NOT NULL`,
        [item.blueprint_id || null, item.product_lane || null],
      ).catch(() => ({ rows: [{ n: 0, avg_ms: null, avg_cost: 0, p50_ms: null }] }));
      const n = rows[0]?.n || 0;
      estimates.push({
        label,
        blueprint_id: item.blueprint_id || null,
        product_lane: item.product_lane || null,
        sample_size: n,
        estimated_duration_ms: rows[0]?.p50_ms ?? rows[0]?.avg_ms ?? null,
        estimated_cost_usd: n ? Number(rows[0]?.avg_cost || 0) : null,
        confidence: n >= 10 ? 'high' : n >= 3 ? 'medium' : n >= 1 ? 'low' : 'none',
      });
    }
    const total_ms = estimates.reduce((s, e) => s + (e.estimated_duration_ms || 0), 0);
    const total_usd = estimates.reduce((s, e) => s + (e.estimated_cost_usd || 0), 0);
    return {
      ok: true,
      schema: 'build_estimate_v1',
      estimates,
      total_estimated_duration_ms: estimates.every((e) => e.estimated_duration_ms != null) ? total_ms : null,
      total_estimated_cost_usd: estimates.every((e) => e.estimated_cost_usd != null) ? total_usd : null,
      founder_line: estimates.some((e) => e.sample_size === 0)
        ? 'Insufficient history for at least one item — estimates incomplete.'
        : `About ${Math.round(total_ms / 60000)} min and $${total_usd.toFixed(2)} for ${estimates.length} item(s) from history.`,
    };
  }

  async function getControlPlaneSummary() {
    const health = await getMeasurementHealth();
    const spend_outcomes = await getSpendOutcomesReport({ sinceHours: 24 }).catch(() => null);
    return {
      ...health,
      tasks_without_proof: await getTasksWithoutProof(10),
      worst_models: await getWorstPerformingModels(5),
      spend_outcomes_24h: spend_outcomes,
      answers: {
        ai_calls_today: health.token.ai_calls_today,
        metered_today: health.token.metered_today,
        unmetered_today: health.token.unmetered_today,
        spend_usd_today: health.token.estimated_spend_usd,
        top_token_task: health.token.top_token_task,
        longest_build_ms: health.build.longest_build_ms,
        builds_today: health.build.builds_today,
        founder_line_24h: spend_outcomes?.founder_line || null,
        blind: spend_outcomes?.blind ?? true,
      },
    };
  }

  return {
    recordBuildStart,
    recordBuildComplete,
    getBuildByTaskId,
    canMarkBuildDone,
    getMeasurementHealth,
    getControlPlaneSummary,
    getTasksWithoutProof,
    getWorstPerformingModels,
    getTokenMetricsToday,
    getBuildMetricsToday,
    getSpendOutcomesReport,
    getEfficiencyTrend,
    estimateBuilds,
    getLinkageStats,
  };
}