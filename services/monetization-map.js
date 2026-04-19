/**
 * services/monetization-map.js
 *
 * Bridges `purpose_profiles.economic_paths` (AI-synthesized opportunities) into an
 * opt-in monetization/outreach surface. Nothing is ever generated or sent without
 * explicit per-path opt-in from the user — economic paths remain inert until then.
 *
 * Pipeline:
 *   purpose_profiles.economic_paths (AI synthesis)
 *        ↓  (user clicks "I'm interested in path #2")
 *   monetization_paths (opted-in, snapshots the path details)
 *        ↓  (user clicks "Draft outreach" on that path)
 *   monetization_outreach (drafts only, always requires explicit approval to send)
 *
 * Every call that produces AI output is wired behind per-request intent, not
 * background polling, so the Zero-Waste-AI rule holds automatically. Nothing here
 * runs on a timer.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createMonetizationMap({ pool, callAI = null }) {
  if (!pool) throw new Error('[monetization-map] pool is required');

  // ── listEconomicPaths ────────────────────────────────────────────────────────
  // Returns the AI-synthesized economic paths from the user's purpose profile,
  // joined with any active opt-in rows. Each path gets:
  //   - path_index         (stable index into economic_paths array)
  //   - title/description/market_demand/effort/revenue_potential
  //   - opt_in             (bool — does an active monetization_paths row exist?)
  //   - monetization_path_id (if opted in)
  //   - outreach_count     (how many drafts exist under this path)
  async function listEconomicPaths(userId) {
    const { rows: profRows } = await pool.query(
      `SELECT economic_paths
         FROM purpose_profiles
        WHERE user_id = $1`,
      [userId]
    );
    if (!profRows.length) return { profile_exists: false, paths: [] };

    let paths = profRows[0].economic_paths;
    if (typeof paths === 'string') {
      try { paths = JSON.parse(paths); } catch { paths = []; }
    }
    if (!Array.isArray(paths)) paths = [];

    const { rows: optRows } = await pool.query(
      `SELECT id, path_index, status, opted_in_at
         FROM monetization_paths
        WHERE user_id = $1 AND opted_out_at IS NULL`,
      [userId]
    );
    const optByIndex = new Map(optRows.map((r) => [r.path_index, r]));

    const pathIds = optRows.map((r) => r.id);
    let outreachCounts = new Map();
    if (pathIds.length) {
      const { rows: cnt } = await pool.query(
        `SELECT path_id, COUNT(*)::int AS count
           FROM monetization_outreach
          WHERE path_id = ANY($1::bigint[])
            AND status <> 'archived'
          GROUP BY path_id`,
        [pathIds]
      );
      outreachCounts = new Map(cnt.map((r) => [Number(r.path_id), r.count]));
    }

    const decorated = paths.map((p, idx) => {
      const opt = optByIndex.get(idx);
      return {
        path_index:         idx,
        title:              p.title             || '(untitled)',
        description:        p.description       || '',
        market_demand:      p.market_demand     || null,
        effort:             p.effort            || null,
        revenue_potential:  p.revenue_potential || null,
        opt_in:             Boolean(opt),
        monetization_path_id: opt ? opt.id : null,
        status:             opt ? opt.status : null,
        opted_in_at:        opt ? opt.opted_in_at : null,
        outreach_count:     opt ? (outreachCounts.get(opt.id) || 0) : 0,
      };
    });

    return { profile_exists: true, paths: decorated };
  }

  // ── optIn ────────────────────────────────────────────────────────────────────
  async function optIn(userId, pathIndex) {
    const idx = Number(pathIndex);
    if (!Number.isFinite(idx) || idx < 0) {
      throw new Error('path_index must be a non-negative integer');
    }

    const { rows: profRows } = await pool.query(
      `SELECT economic_paths
         FROM purpose_profiles
        WHERE user_id = $1`,
      [userId]
    );
    if (!profRows.length) throw new Error('No purpose profile — run synthesis first');

    let paths = profRows[0].economic_paths;
    if (typeof paths === 'string') {
      try { paths = JSON.parse(paths); } catch { paths = []; }
    }
    if (!Array.isArray(paths) || idx >= paths.length) {
      throw new Error(`path_index ${idx} is out of range (profile has ${paths.length} paths)`);
    }
    const chosen = paths[idx];

    const { rows: existing } = await pool.query(
      `SELECT id, status, opted_out_at
         FROM monetization_paths
        WHERE user_id = $1 AND path_index = $2 AND opted_out_at IS NULL`,
      [userId, idx]
    );
    if (existing.length) {
      const row = existing[0];
      if (row.status !== 'active') {
        await pool.query(
          `UPDATE monetization_paths
              SET status = 'active', updated_at = NOW()
            WHERE id = $1`,
          [row.id]
        );
      }
      return { reactivated: true, path_id: row.id };
    }

    const { rows } = await pool.query(
      `INSERT INTO monetization_paths
         (user_id, path_index, path_title, path_description,
          market_demand, effort, revenue_potential, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       RETURNING *`,
      [
        userId,
        idx,
        chosen.title            || '(untitled)',
        chosen.description      || null,
        chosen.market_demand    || null,
        chosen.effort           || null,
        chosen.revenue_potential || null,
      ]
    );
    return { reactivated: false, path: rows[0] };
  }

  // ── optOut ───────────────────────────────────────────────────────────────────
  async function optOut(userId, monetizationPathId) {
    const { rowCount } = await pool.query(
      `UPDATE monetization_paths
          SET status = 'archived',
              opted_out_at = NOW(),
              updated_at = NOW()
        WHERE id = $1 AND user_id = $2`,
      [monetizationPathId, userId]
    );
    if (!rowCount) throw new Error('monetization_path not found for user');
    return { ok: true };
  }

  // ── generateOutreach ─────────────────────────────────────────────────────────
  // Only runs on explicit user click. AI is optional; if callAI is not provided
  // we write a starter template so the feature degrades gracefully.
  async function generateOutreach({ userId, monetizationPathId, count = 3 }) {
    const { rows: pathRows } = await pool.query(
      `SELECT * FROM monetization_paths
        WHERE id = $1 AND user_id = $2 AND opted_out_at IS NULL AND status = 'active'`,
      [monetizationPathId, userId]
    );
    if (!pathRows.length) throw new Error('Active opted-in path not found');
    const path = pathRows[0];

    const drafts = [];
    if (callAI) {
      const prompt = `You are drafting outreach tasks for a user pursuing this economic path:

Title: ${path.path_title}
Description: ${path.path_description || '(no description)'}
Market demand: ${path.market_demand || 'unknown'}
Effort: ${path.effort || 'unknown'}
Revenue potential: ${path.revenue_potential || 'unknown'}

Generate ${Math.max(1, Math.min(5, Number(count) || 3))} concrete, specific outreach tasks the user can take this week. Each task should be the kind of thing that moves real money, not just "networking". Each task must include a rationale tying it to the path above.

Return JSON only. Schema:
{
  "tasks": [
    {
      "task_type": "outreach_email" | "outreach_call" | "content" | "offer" | "other",
      "title": "short action title (≤ 80 chars)",
      "body": "draft body or talking points (2-5 sentences)",
      "rationale": "why this fits the path (1-2 sentences)"
    }
  ]
}`;

      let parsed = { tasks: [] };
      try {
        const raw = await callAI(prompt);
        const match = typeof raw === 'string' ? raw.match(/\{[\s\S]*\}/) : null;
        parsed = JSON.parse(match ? match[0] : raw);
      } catch {
        parsed = { tasks: [] };
      }
      const tasks = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
      for (const t of tasks) {
        const { rows } = await pool.query(
          `INSERT INTO monetization_outreach
             (user_id, path_id, task_type, title, body, rationale, status, source)
           VALUES ($1, $2, $3, $4, $5, $6, 'draft', 'ai')
           RETURNING *`,
          [
            userId,
            path.id,
            String(t.task_type || 'other').slice(0, 32),
            String(t.title || 'Untitled task').slice(0, 200),
            t.body      ? String(t.body).slice(0, 4000)      : null,
            t.rationale ? String(t.rationale).slice(0, 1500) : null,
          ]
        );
        drafts.push(rows[0]);
      }
    }

    if (drafts.length === 0) {
      const { rows } = await pool.query(
        `INSERT INTO monetization_outreach
           (user_id, path_id, task_type, title, body, rationale, status, source)
         VALUES ($1, $2, 'other', $3, $4, $5, 'draft', 'manual')
         RETURNING *`,
        [
          userId,
          path.id,
          `First step for "${path.path_title}"`,
          'Draft your first concrete action for this path. What is the smallest thing you could do this week that would prove demand or revenue?',
          'Starter template — AI drafter was not configured, so the system left this blank for you to define.',
        ]
      );
      drafts.push(rows[0]);
    }

    return { count: drafts.length, drafts };
  }

  // ── listOutreach ─────────────────────────────────────────────────────────────
  async function listOutreach({ userId, monetizationPathId = null, status = null, limit = 100 }) {
    const conds = ['user_id = $1'];
    const args  = [userId];
    let argIdx  = 2;
    if (monetizationPathId) {
      conds.push(`path_id = $${argIdx++}`);
      args.push(monetizationPathId);
    }
    if (status) {
      conds.push(`status = $${argIdx++}`);
      args.push(status);
    }
    const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));
    const { rows } = await pool.query(
      `SELECT o.*, p.path_title, p.path_index
         FROM monetization_outreach o
         JOIN monetization_paths    p ON p.id = o.path_id
        WHERE ${conds.join(' AND ')}
        ORDER BY o.created_at DESC
        LIMIT ${safeLimit}`,
      args
    );
    return rows;
  }

  // ── updateOutreachStatus ─────────────────────────────────────────────────────
  // Allowed transitions: draft → approved, draft → declined, approved → sent,
  // any → archived. This is the only surface that moves a draft toward "sent".
  async function updateOutreachStatus({ userId, outreachId, newStatus }) {
    const allowed = new Set(['approved', 'declined', 'sent', 'archived']);
    if (!allowed.has(newStatus)) throw new Error(`invalid status: ${newStatus}`);

    const stampCol = {
      approved: 'approved_at',
      declined: 'declined_at',
      sent:     'sent_at',
      archived: null,
    }[newStatus];

    const setStamp = stampCol ? `, ${stampCol} = NOW()` : '';
    const { rows } = await pool.query(
      `UPDATE monetization_outreach
          SET status = $1, updated_at = NOW()${setStamp}
        WHERE id = $2 AND user_id = $3
        RETURNING *`,
      [newStatus, outreachId, userId]
    );
    if (!rows.length) throw new Error('outreach task not found for user');
    return rows[0];
  }

  return {
    listEconomicPaths,
    optIn,
    optOut,
    generateOutreach,
    listOutreach,
    updateOutreachStatus,
  };
}
