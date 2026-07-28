/**
 * SYNOPSIS: Lab biomarker import + simple PhenoAge-style biological age + VO2 trend stub.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import { safeInt } from './lifeos-request-helpers.js';

const memory = new Map();

/** Rough PhenoAge-inspired estimate from common labs when present (education only). */
export function estimateBiologicalAge({ chronologicalAge, albumin, creatinine, glucose, crp, wbc, rbc, alp, lymphocyte_pct } = {}) {
  const age = Number(chronologicalAge);
  if (!Number.isFinite(age) || age < 18 || age > 100) {
    return { ok: false, error: 'chronologicalAge required (18-100)' };
  }
  let delta = 0;
  const used = [];
  if (glucose != null) { delta += (Number(glucose) - 90) / 40; used.push('glucose'); }
  if (crp != null) { delta += (Number(crp) - 1) / 3; used.push('crp'); }
  if (albumin != null) { delta += (4.2 - Number(albumin)) * 1.5; used.push('albumin'); }
  if (creatinine != null) { delta += (Number(creatinine) - 1.0) * 2; used.push('creatinine'); }
  if (wbc != null) { delta += (Number(wbc) - 6.5) / 4; used.push('wbc'); }
  if (lymphocyte_pct != null) { delta += (30 - Number(lymphocyte_pct)) / 20; used.push('lymphocyte_pct'); }
  if (alp != null) { delta += (Number(alp) - 70) / 80; used.push('alp'); }
  if (rbc != null) { delta += (4.5 - Number(rbc)) * 0.8; used.push('rbc'); }
  const biological_age = Math.round((age + delta) * 10) / 10;
  return {
    ok: true,
    chronological_age: age,
    biological_age,
    delta_years: Math.round(delta * 10) / 10,
    biomarkers_used: used,
    disclaimer: 'Education only — not a medical diagnosis. PhenoAge-inspired heuristic.',
  };
}

export function createLabsLongevityService({ pool } = {}) {
  return {
    estimateBiologicalAge,

    async importLabs(userId, { drawn_at = null, biomarkers = {}, chronological_age: chronologicalAge = null } = {}) {
      const uid = safeInt(userId);
      const row = {
        user_id: uid,
        drawn_at: drawn_at || new Date().toISOString(),
        biomarkers,
        chronological_age: chronologicalAge,
        created_at: new Date().toISOString(),
      };
      if (!pool) {
        const list = memory.get(String(uid)) || [];
        list.unshift(row);
        memory.set(String(uid), list.slice(0, 50));
        return row;
      }
      if (uid == null) {
        return { ...row, persisted: 'memory_fallback', db_error: 'invalid_user_id' };
      }
      try {
        const r = await pool.query(
          `INSERT INTO lab_results (user_id, drawn_at, biomarkers, chronological_age)
           VALUES ($1, $2, $3::jsonb, $4) RETURNING *`,
          [uid, row.drawn_at, JSON.stringify(biomarkers), chronologicalAge],
        );
        return { ...r.rows[0], persisted: 'db' };
      } catch (err) {
        // Schema/FK miss — keep session usable but never pretend it persisted.
        const list = memory.get(String(uid)) || [];
        list.unshift(row);
        memory.set(String(uid), list.slice(0, 50));
        return {
          ...row,
          persisted: 'memory_fallback',
          db_error: String(err?.message || err).slice(0, 240),
        };
      }
    },

    async listLabs(userId, { limit = 20 } = {}) {
      const uid = safeInt(userId);
      if (!pool) return memory.get(String(uid)) || [];
      try {
        const r = await pool.query(
          `SELECT * FROM lab_results WHERE user_id = $1 ORDER BY drawn_at DESC LIMIT $2`,
          [uid, Math.min(50, limit)],
        );
        return r.rows;
      } catch {
        return memory.get(String(uid)) || [];
      }
    },

    async vo2Trend(userId) {
      const uid = safeInt(userId);
      if (!pool) return { ok: true, points: [], source: 'none' };
      try {
        const r = await pool.query(
          `SELECT logged_at AS at, value_num AS vo2
             FROM wearable_data
            WHERE user_id = $1 AND metric = 'vo2_max'
            ORDER BY logged_at DESC LIMIT 30`,
          [uid],
        );
        return { ok: true, points: r.rows.reverse(), source: 'wearable_data' };
      } catch {
        return { ok: true, points: [], source: 'unavailable' };
      }
    },

    async longevitySnapshot(userId, { chronological_age: chronologicalAge = null } = {}) {
      const labs = await this.listLabs(userId, { limit: 1 });
      const latest = labs[0] || null;
      const biomarkers = latest?.biomarkers || {};
      const age = chronologicalAge ?? latest?.chronological_age ?? null;
      const bio = age != null
        ? estimateBiologicalAge({ chronologicalAge: age, ...biomarkers })
        : { ok: false, error: 'no_chronological_age' };
      const vo2 = await this.vo2Trend(userId);
      return { ok: true, latest_labs: latest, biological_age: bio, vo2 };
    },
  };
}