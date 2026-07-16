/**
 * SYNOPSIS: services/mission-ledger.js
 * services/mission-ledger.js
 * Mission Runtime DB service layer — all DB logic, no Express.
 * Authority: docs/history/legacy-history-salvage/docs-projects-root/BPB-0001-MISSION-RUNTIME-V1.md §Section 4.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * GAP-FILL: builder /build returned "generated JS is too short (10 lines); likely
 * token-limit truncation — refusing to commit" on 2 consecutive attempts (attempts at
 * 2026-06-02T20:xx UTC). Known gemini_flash truncation pattern per BPB-0001 §16.
 * Written by Conductor from BPB-0001 §Section 4 prescription exactly.
 */

/**
 * Valid state transitions for MISSION-0001 state machine (22 transitions, 12 states).
 * AIC DISCUSSION-6 resolved 2026-06-02: backward transitions require Founder authority
 * (transitioned_by === 'adam') + mandatory non-empty note. No AI may initiate unilaterally.
 * @type {Readonly<Record<string, string[]>>}
 */
export const MISSION_STATE_TRANSITIONS = Object.freeze({
  'Proposed':          ['Clarified', 'Approved', 'Council Review'],
  'Clarified':         ['Council Review', 'Approved'],
  'Council Review':    ['Approved', 'Clarified'],
  'Approved':          ['BPB Blueprinting', 'Building'],
  'BPB Blueprinting':  ['OIL Review', 'Approved'],
  'OIL Review':        ['Build Approved', 'BPB Blueprinting'],
  'Build Approved':    ['Building'],
  'Building':          ['Verification', 'Approved'],
  'Verification':      ['Deployed', 'Build Approved'],
  'Deployed':          ['Outcome Measured'],
  'Outcome Measured':  ['Lessons Captured', 'Approved'],
  'Lessons Captured':  ['Proposed'],
});

// AIC DISCUSSION-6 (2026-06-02): Founder-only backward transitions. Requires
// transitioned_by === 'adam' and non-empty note in transitionMissionState().
export const BACKWARD_TRANSITIONS = Object.freeze(new Set([
  'Building→Approved',
  'Verification→Build Approved',
  'Outcome Measured→Approved',
]));

export async function createMission(pool, {
  slug, title, purpose, authority_class, owner, blueprint_ref, metadata_json, participants,
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO missions (slug, title, purpose, authority_class, owner, blueprint_ref, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [slug, title, purpose ?? null, authority_class ?? 'Supervised', owner ?? 'adam', blueprint_ref ?? null, metadata_json ?? {}],
    );
    const mission = rows[0];
    if (Array.isArray(participants) && participants.length > 0) {
      for (const p of participants) {
        await client.query(
          `INSERT INTO mission_participants (mission_id, participant, role)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [mission.id, p.participant, p.role ?? 'contributor'],
        );
      }
    }
    await client.query('COMMIT');
    return mission;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listMissions(pool, { state, owner, limit } = {}) {
  const conditions = [];
  const params = [];
  if (state) { params.push(state); conditions.push(`state = $${params.length}`); }
  if (owner) { params.push(owner); conditions.push(`owner = $${params.length}`); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(Number(limit) || 50);
  const { rows } = await pool.query(
    `SELECT * FROM missions ${where} ORDER BY updated_at DESC LIMIT $${params.length}`,
    params,
  );
  return rows;
}

export async function getMission(pool, id) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(String(id));
  const col = isUuid ? 'id' : 'slug';
  const { rows: mRows } = await pool.query(`SELECT * FROM missions WHERE ${col} = $1`, [id]);
  if (mRows.length === 0) return null;
  const mission = mRows[0];
  const [pRes, tRes, cRes] = await Promise.all([
    pool.query('SELECT * FROM mission_participants WHERE mission_id = $1 ORDER BY created_at', [mission.id]),
    pool.query('SELECT * FROM mission_state_transitions WHERE mission_id = $1 ORDER BY created_at', [mission.id]),
    pool.query('SELECT * FROM commitments WHERE mission_id = $1 ORDER BY due_date ASC NULLS LAST, created_at DESC', [mission.id]),
  ]);
  return { mission, participants: pRes.rows, transitions: tRes.rows, commitments: cRes.rows };
}

export async function updateMission(pool, id, fields) {
  const allowed = ['title', 'purpose', 'authority_class', 'blueprint_ref', 'metadata_json'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      params.push(fields[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }
  if (sets.length === 0) throw new Error('updateMission: no valid fields provided');
  params.push(new Date().toISOString());
  sets.push(`updated_at = $${params.length}`);
  params.push(id);
  const { rows } = await pool.query(
    `UPDATE missions SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params,
  );
  return rows[0] ?? null;
}

export async function transitionMissionState(pool, id, { to_state, transitioned_by, note }) {
  const { rows: mRows } = await pool.query('SELECT * FROM missions WHERE id = $1', [id]);
  if (mRows.length === 0) throw Object.assign(new Error('mission not found'), { code: 'NOT_FOUND' });
  const mission = mRows[0];
  const from_state = mission.state;
  const valid_next = MISSION_STATE_TRANSITIONS[from_state] ?? [];
  if (!valid_next.includes(to_state)) {
    throw Object.assign(new Error('invalid_transition'), {
      code: 'INVALID_TRANSITION',
      from: from_state,
      to: to_state,
      valid_next,
    });
  }
  // AIC DISCUSSION-6: backward transitions are Founder-only with mandatory note.
  const pairKey = `${from_state}→${to_state}`;
  if (BACKWARD_TRANSITIONS.has(pairKey)) {
    if (transitioned_by !== 'adam') {
      throw Object.assign(new Error('backward_transition_requires_founder'), {
        code: 'BACKWARD_TRANSITION_AUTHORITY_REQUIRED',
        pair: pairKey,
        required: 'transitioned_by must be "adam" for backward transitions',
      });
    }
    if (!note || String(note).trim().length < 10) {
      throw Object.assign(new Error('backward_transition_requires_note'), {
        code: 'BACKWARD_TRANSITION_NOTE_REQUIRED',
        pair: pairKey,
        required: 'note (min 10 chars) is mandatory for backward transitions',
      });
    }
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: updated } = await client.query(
      `UPDATE missions SET state = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [to_state, id],
    );
    const { rows: tRows } = await client.query(
      `INSERT INTO mission_state_transitions (mission_id, from_state, to_state, transitioned_by, note)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, from_state, to_state, transitioned_by, note ?? null],
    );
    await client.query('COMMIT');
    return { mission: updated[0], transition: tRows[0] };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function addParticipant(pool, mission_id, { participant, role }) {
  const { rows } = await pool.query(
    `INSERT INTO mission_participants (mission_id, participant, role)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING *`,
    [mission_id, participant, role ?? 'contributor'],
  );
  return rows[0] ?? null;
}

export async function removeParticipant(pool, mission_id, participant) {
  await pool.query(
    'DELETE FROM mission_participants WHERE mission_id = $1 AND participant = $2',
    [mission_id, participant],
  );
  return { deleted: true };
}

export async function createCommitment(pool, { user_id, title, ...fields }) {
  const cols = [
    'user_id', 'title', 'mission_id', 'owner', 'text', 'due_date', 'reminder_at', 'risk_if_missed',
    'time_estimate_hours', 'urgency', 'importance', 'energy_cost', 'money_impact',
    'relationship_impact', 'opportunity_cost_note', 'better_owner', 'approval_required',
  ];
  const names = [];
  const placeholders = [];
  const params = [];
  for (const col of cols) {
    if (Object.prototype.hasOwnProperty.call(fields, col)) {
      names.push(col);
      params.push(fields[col]);
      placeholders.push(`$${params.length}`);
    }
  }
  if (names.length === 0) throw new Error('createCommitment: no fields provided');
  const { rows } = await pool.query(
    `INSERT INTO commitments (${names.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    params,
  );
  return rows[0];
}

export async function listCommitments(pool, { owner, status, mission_id, limit } = {}) {
  const conditions = [];
  const params = [];
  if (owner) { params.push(owner); conditions.push(`owner = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (mission_id) { params.push(mission_id); conditions.push(`mission_id = $${params.length}`); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(Number(limit) || 50);
  const { rows } = await pool.query(
    `SELECT * FROM commitments ${where} ORDER BY due_date ASC NULLS LAST, created_at DESC LIMIT $${params.length}`,
    params,
  );
  return rows;
}

export async function updateCommitment(pool, id, fields) {
  const allowed = [
    'owner', 'text', 'due_date', 'reminder_at', 'risk_if_missed', 'status',
    'time_estimate_hours', 'urgency', 'importance', 'energy_cost', 'money_impact',
    'relationship_impact', 'opportunity_cost_note', 'better_owner', 'approval_required',
    'approved_by', 'approved_at', 'mission_id',
  ];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      params.push(fields[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }
  if (sets.length === 0) throw new Error('updateCommitment: no valid fields provided');
  params.push(id);
  const { rows } = await pool.query(
    `UPDATE commitments SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params,
  );
  return rows[0] ?? null;
}

export async function getHouseholdBoard(pool, mission_id_or_slug) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(String(mission_id_or_slug ?? ''));
  const col = isUuid ? 'id' : 'slug';
  const { rows: mRows } = await pool.query(`SELECT * FROM missions WHERE ${col} = $1`, [mission_id_or_slug]);
  if (mRows.length === 0) throw Object.assign(new Error('mission not found'), { code: 'NOT_FOUND' });
  const mission = mRows[0];
  const mId = mission.id;

  const [today, overdue, adam, sherry, waiting, household, income] = await Promise.all([
    pool.query(`SELECT * FROM commitments WHERE mission_id = $1 AND status = 'open' AND due_date = CURRENT_DATE`, [mId]),
    pool.query(`SELECT * FROM commitments WHERE mission_id = $1 AND status = 'open' AND due_date < CURRENT_DATE`, [mId]),
    pool.query(`SELECT * FROM commitments WHERE mission_id = $1 AND owner = 'adam' AND status = 'open'`, [mId]),
    pool.query(`SELECT * FROM commitments WHERE mission_id = $1 AND owner = 'sherry' AND status = 'open'`, [mId]),
    pool.query(`SELECT * FROM commitments WHERE mission_id = $1 AND approval_required = TRUE AND status = 'open' AND approved_at IS NULL`, [mId]),
    pool.query(`SELECT * FROM commitments WHERE mission_id = $1 AND importance >= 4 AND status = 'open'`, [mId]),
    pool.query(`SELECT * FROM commitments WHERE mission_id = $1 AND money_impact >= 4 AND status = 'open'`, [mId]),
  ]);

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    mission: { id: mission.id, slug: mission.slug, title: mission.title, state: mission.state },
    today_commitments: today.rows,
    overdue_commitments: overdue.rows,
    adam_tasks: adam.rows,
    sherry_tasks: sherry.rows,
    waiting_approval: waiting.rows,
    household_priorities: household.rows,
    income_priorities: income.rows,
    capacity_warnings: [], // Phase 1: always empty. Do not compute.
  };
}
