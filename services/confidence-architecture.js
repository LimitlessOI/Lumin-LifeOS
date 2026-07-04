/**
 * SYNOPSIS: Exports createConfidenceArchitecture — services/confidence-architecture.js.
 */
import crypto from 'node:crypto';

const TABLE_NAME = 'children_achievements';

function safeJson(value) {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return '{}';
  }
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function clampLimit(value, fallback = 50) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, 1), 200);
}

function createNotFoundError(message = 'not_found') {
  const err = new Error(message);
  err.status = 404;
  return err;
}

function createBadRequestError(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

export function createConfidenceArchitecture({ pool, callCouncilMember }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_query_required');
  }

  async function maybeAnalyzePatterns({ childId, ownerId }) {
    if (typeof callCouncilMember !== 'function') return null;

    const { rows } = await pool.query(
      `SELECT id, child_id, owner_id, achievement_title, achievement_date, evidence_type, evidence_uri, notes, created_at
         FROM ${TABLE_NAME}
        WHERE child_id = $1 AND owner_id = $2
        ORDER BY achievement_date DESC, created_at DESC
        LIMIT 20`,
      [childId, ownerId],
    );

    const prompt = [
      'Analyze these child achievement records for patterns, milestones, and display-friendly summaries.',
      'Return concise guidance that can help surface evidence of achievements.',
      JSON.stringify(rows),
    ].join('\n\n');

    try {
      return await callCouncilMember('openai', prompt, { taskType: 'general' });
    } catch (err) {
      return {
        error: 'ai_analysis_failed',
        detail: err?.message || 'unknown_error',
      };
    }
  }

  async function logAchievement(req, res) {
    const ownerId = req?.lifeosUser?.sub || null;
    if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

    const body = req?.body || {};
    const childId = normalizeText(body.childId || body.child_id);
    const achievementTitle = normalizeText(body.achievementTitle || body.achievement_title);
    const achievementDate = normalizeText(body.achievementDate || body.achievement_date);
    const evidenceType = normalizeText(body.evidenceType || body.evidence_type || 'note');
    const evidenceUri = normalizeText(body.evidenceUri || body.evidence_uri);
    const notes = normalizeText(body.notes);
    const metadata = body.metadata ?? {};

    if (!childId) return res.status(400).json({ error: 'child_id_required' });
    if (!achievementTitle) return res.status(400).json({ error: 'achievement_title_required' });
    if (!achievementDate) return res.status(400).json({ error: 'achievement_date_required' });

    const { rows: childRows } = await pool.query(
      `SELECT id, name, birthdate
         FROM children
        WHERE id = $1
        LIMIT 1`,
      [childId],
    );

    if (!childRows[0]) return res.status(404).json({ error: 'child_not_found' });

    const { rows } = await pool.query(
      `INSERT INTO ${TABLE_NAME}
        (id, child_id, owner_id, achievement_title, achievement_date, evidence_type, evidence_uri, notes, metadata)
       VALUES ($1, $2, $3, $4, $5::timestamptz, $6, $7, $8, $9::jsonb)
       RETURNING *`,
      [
        crypto.randomUUID(),
        childId,
        ownerId,
        achievementTitle,
        achievementDate,
        evidenceType,
        evidenceUri || null,
        notes || null,
        safeJson(metadata),
      ],
    );

    const record = rows[0];
    const analysis = await maybeAnalyzePatterns({ childId, ownerId });

    return res.status(201).json({
      achievement: record,
      analysis,
    });
  }

  async function getAchievements(req, res) {
    const ownerId = req?.lifeosUser?.sub || null;
    if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

    const childId = normalizeText(req?.query?.childId || req?.query?.child_id);
    if (!childId) return res.status(400).json({ error: 'child_id_required' });

    const limit = clampLimit(req?.query?.limit, 50);

    const { rows: childRows } = await pool.query(
      `SELECT id, name, birthdate
         FROM children
        WHERE id = $1
        LIMIT 1`,
      [childId],
    );

    if (!childRows[0]) return res.status(404).json({ error: 'child_not_found' });

    const { rows: achievements } = await pool.query(
      `SELECT *
         FROM ${TABLE_NAME}
        WHERE child_id = $1 AND owner_id = $2
        ORDER BY achievement_date DESC, created_at DESC
        LIMIT $3`,
      [childId, ownerId, limit],
    );

    const analysis = await maybeAnalyzePatterns({ childId, ownerId });

    return res.status(200).json({
      child: childRows[0],
      achievements,
      analysis,
    });
  }

  return {
    logAchievement,
    getAchievements,
  };
}