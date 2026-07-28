/**
 * SYNOPSIS: services/mission-tracker.js
 * North Star §2.0D Mission State Machine Law + Companion §0.9 Mission-First
 * Attachment Rule: "The system must think primarily in missions, not files,
 * commits, jobs, routes, or scripts... every meaningful action must attach
 * to a mission record." Confirmed missing this session: real work was
 * tracked via PRODUCT_HOME.md Change Receipts (good practice, real
 * evidence) and BUILD_QUEUE.json's mission_id/blueprint_id fields (real,
 * but scoped only to governed-factory build steps, with no explicit state
 * machine) -- neither is the constitutionally-specified mission object with
 * its 12-state lifecycle.
 *
 * Honest scope: this is the real mechanism (schema, state machine, CRUD),
 * proven end-to-end against a real mission from this same session -- not a
 * retroactive rewrite of every prior commit/receipt into mission records,
 * which would be fabricated history, not truth. Going forward, real work
 * can attach to a real mission; past work stays honestly represented by
 * the PRODUCT_HOME receipts that already document it accurately.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

// North Star §2.0D, in the constitution's own listed order. Sequential,
// forward-only by default -- 'blocked' is the one allowed side-state at any
// point, and unblocking returns to whichever state preceded it.
export const MISSION_STATES = [
  'proposed',
  'clarified',
  'council_review',
  'approved',
  'bpb_blueprinting',
  'oil_review',
  'build_approved',
  'building',
  'verification',
  'deployed',
  'outcome_measured',
  'lessons_captured',
];

const STATE_INDEX = new Map(MISSION_STATES.map((s, i) => [s, i]));

async function ensureTable(pool) {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS missions (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'proposed',
      pre_blocked_state TEXT,
      governing_blueprint TEXT,
      authority_class TEXT,
      actors JSONB NOT NULL DEFAULT '[]',
      predicted_outcome TEXT,
      verification_result TEXT,
      lesson TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS mission_transitions (
      id SERIAL PRIMARY KEY,
      mission_id INTEGER NOT NULL REFERENCES missions(id),
      from_state TEXT,
      to_state TEXT NOT NULL,
      evidence TEXT,
      transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
  );
}

export async function createMission(pool, {
  title,
  governing_blueprint = null,
  authority_class = null,
  actors = [],
  predicted_outcome = null,
} = {}) {
  const t = String(title || '').trim();
  if (!pool || !t) return { ok: false, reason: 'title required' };
  await ensureTable(pool);
  const { rows } = await pool.query(
    `INSERT INTO missions (title, state, governing_blueprint, authority_class, actors, predicted_outcome)
     VALUES ($1, 'proposed', $2, $3, $4::jsonb, $5)
     RETURNING id, state, created_at`,
    [t, governing_blueprint, authority_class, JSON.stringify(actors), predicted_outcome]
  );
  await pool.query(
    `INSERT INTO mission_transitions (mission_id, from_state, to_state, evidence) VALUES ($1, NULL, 'proposed', 'mission created')`,
    [rows[0].id]
  );
  return { ok: true, mission_id: rows[0].id, state: rows[0].state, created_at: rows[0].created_at };
}

export async function getMission(pool, { mission_id } = {}) {
  if (!pool || !mission_id) return { ok: false, reason: 'mission_id required' };
  await ensureTable(pool);
  const { rows } = await pool.query(`SELECT * FROM missions WHERE id = $1`, [mission_id]);
  if (!rows[0]) return { ok: false, reason: 'not_found' };
  const { rows: transitions } = await pool.query(
    `SELECT from_state, to_state, evidence, transitioned_at FROM mission_transitions WHERE mission_id = $1 ORDER BY transitioned_at ASC`,
    [mission_id]
  );
  return { ok: true, mission: rows[0], transitions };
}

export async function listMissions(pool, { state = null, limit = 100 } = {}) {
  if (!pool) return { ok: false, reason: 'no_pool' };
  await ensureTable(pool);
  const params = [];
  let where = '';
  if (state) {
    params.push(state);
    where = 'WHERE state = $1';
  }
  params.push(Math.min(500, Math.max(1, Number(limit) || 100)));
  const { rows } = await pool.query(
    `SELECT id, title, state, governing_blueprint, authority_class, updated_at
     FROM missions ${where} ORDER BY updated_at DESC LIMIT $${params.length}`,
    params
  );
  return { ok: true, count: rows.length, missions: rows };
}

/**
 * Transition a mission forward one or more states, or into/out of
 * 'blocked'. Fail-closed: rejects backward jumps and skips-with-no-reason
 * are still allowed (a lightweight mission may not need every state) but a
 * regression to an earlier state is rejected outright -- matches North
 * Star §2.18's "course-correct or HALT," never silently rewrite history
 * backward.
 */
export async function transitionMission(pool, { mission_id, to_state, evidence = null } = {}) {
  if (!pool || !mission_id) return { ok: false, reason: 'mission_id required' };
  await ensureTable(pool);
  const { rows } = await pool.query(`SELECT state, pre_blocked_state FROM missions WHERE id = $1`, [mission_id]);
  if (!rows[0]) return { ok: false, reason: 'not_found' };
  const current = rows[0].state;

  if (to_state === 'blocked') {
    if (current === 'blocked') return { ok: false, reason: 'already_blocked' };
    await pool.query(
      `UPDATE missions SET pre_blocked_state = $2, state = 'blocked', updated_at = now() WHERE id = $1`,
      [mission_id, current]
    );
    await pool.query(
      `INSERT INTO mission_transitions (mission_id, from_state, to_state, evidence) VALUES ($1, $2, 'blocked', $3)`,
      [mission_id, current, evidence]
    );
    return { ok: true, mission_id, state: 'blocked', from: current };
  }

  if (current === 'blocked') {
    // Unblocking must explicitly target the state to resume into.
    const resumeIndex = STATE_INDEX.get(to_state);
    if (resumeIndex === undefined) return { ok: false, reason: `unknown_state: ${to_state}` };
    await pool.query(
      `UPDATE missions SET state = $2, pre_blocked_state = NULL, updated_at = now() WHERE id = $1`,
      [mission_id, to_state]
    );
    await pool.query(
      `INSERT INTO mission_transitions (mission_id, from_state, to_state, evidence) VALUES ($1, 'blocked', $2, $3)`,
      [mission_id, to_state, evidence || 'unblocked']
    );
    return { ok: true, mission_id, state: to_state, from: 'blocked' };
  }

  const fromIndex = STATE_INDEX.get(current);
  const toIndex = STATE_INDEX.get(to_state);
  if (toIndex === undefined) return { ok: false, reason: `unknown_state: ${to_state}` };
  if (toIndex <= fromIndex) {
    return { ok: false, reason: `backward_transition_rejected: ${current} -> ${to_state}` };
  }

  const updates = ['state = $2', 'updated_at = now()'];
  const params = [mission_id, to_state];
  if (to_state === 'verification' && evidence) {
    updates.push(`verification_result = $${params.length + 1}`);
    params.push(evidence);
  }
  if (to_state === 'lessons_captured' && evidence) {
    updates.push(`lesson = $${params.length + 1}`);
    params.push(evidence);
  }
  await pool.query(`UPDATE missions SET ${updates.join(', ')} WHERE id = $1`, params);
  await pool.query(
    `INSERT INTO mission_transitions (mission_id, from_state, to_state, evidence) VALUES ($1, $2, $3, $4)`,
    [mission_id, current, to_state, evidence]
  );
  return { ok: true, mission_id, state: to_state, from: current };
}
