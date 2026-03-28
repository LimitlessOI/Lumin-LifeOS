/**
 * services/capability-map.js
 *
 * Capability Map: analyzes competitor/industry ideas and maps them to the
 * existing architecture. Prevents ad-hoc code dumping by routing every
 * inbound idea to one of:
 *   - existing_module  → maps to a file/service that already handles this
 *   - extension_point  → maps to a specific hook/factory in existing code
 *   - new_segment      → generates a ready-to-insert project_segments spec
 *
 * Uses Gemini 2.5 Pro (1M context) to read the full amendment index in one
 * call, so it cross-references all 19+ amendments simultaneously.
 *
 * @ssot docs/projects/AMENDMENT_20_CAPABILITY_MAP.md
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const AMENDMENTS_DIR = path.join(ROOT, 'docs', 'projects');
const INDEX_PATH = path.join(AMENDMENTS_DIR, 'INDEX.md');

// ── Gemini 2.5 Pro call (re-uses same pattern as builder-council-review) ──────

async function callGeminiPro(prompt, systemInstruction = '') {
  const key = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GOOGLE_AI_KEY not set — cannot run capability analysis');

  const model = process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro';
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2000, temperature: 0.2 },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ── Build amendment context ────────────────────────────────────────────────────

function buildAmendmentContext() {
  const files = fs.readdirSync(AMENDMENTS_DIR)
    .filter(f => f.startsWith('AMENDMENT_') && f.endsWith('.md'))
    .sort();

  const chunks = [];
  let totalChars = 0;
  const MAX_CHARS = 600_000; // leave room for prompt + response

  // Always include the index first
  if (fs.existsSync(INDEX_PATH)) {
    const idx = fs.readFileSync(INDEX_PATH, 'utf8');
    chunks.push(`=== INDEX.md ===\n${idx}`);
    totalChars += idx.length;
  }

  for (const f of files) {
    if (totalChars >= MAX_CHARS) break;
    try {
      const content = fs.readFileSync(path.join(AMENDMENTS_DIR, f), 'utf8');
      const excerpt = content.slice(0, 8000); // first 8k chars per amendment
      chunks.push(`=== ${f} ===\n${excerpt}`);
      totalChars += excerpt.length;
    } catch { /* skip unreadable */ }
  }

  return { context: chunks.join('\n\n'), fileCount: chunks.length, charCount: totalChars };
}

// ── Build a suggested segment spec ────────────────────────────────────────────

function buildSuggestedSegment(analysis, idea) {
  // Extract fields from analysis JSON if present, else return minimal spec
  try {
    const title = (analysis.title || idea.slice(0, 60)).trim();
    return {
      name: title,
      description: analysis.rationale || idea,
      review_tier: analysis.review_tier || 'tier_2',
      exact_outcome: analysis.exact_outcome || `${title} is implemented, tested, and deployed`,
      allowed_files: analysis.allowed_files || [],
      required_checks: ['node --check'],
      rollback_note: analysis.rollback_note || 'Revert PR if regression detected',
      market_sensitive: analysis.market_sensitive ?? false,
    };
  } catch {
    return null;
  }
}

// ── Main analysis function ────────────────────────────────────────────────────

/**
 * analyzeCapability(idea, source, opts)
 *
 * @param {string} idea   — free-text description of the capability/feature
 * @param {string} source — where this came from ('codex', 'user', 'competitor_scan', etc.)
 * @param {object} opts
 * @param {object} opts.pool — pg pool for DB persistence (optional)
 * @returns {Promise<{mapping_type, target, rationale, suggested_segment, raw}>}
 */
export async function analyzeCapability(idea, source = 'user', { pool } = {}) {
  const { context, fileCount, charCount } = buildAmendmentContext();

  const systemInstruction = `You are a software architect for the LimitlessOS / LifeOS platform.
Your job is to map an inbound feature idea to the existing architecture.
You have access to all SSOT amendments (the source of truth for every module).
Return ONLY valid JSON. No markdown. No explanation outside the JSON object.`;

  const prompt = `
## Architecture Context (${fileCount} amendments, ${charCount.toLocaleString()} chars)

${context}

---

## Inbound Idea
"${idea}"
Source: ${source}

---

## Your Task
Map this idea to the architecture above. Return a JSON object with these exact fields:

{
  "mapping_type": "existing_module" | "extension_point" | "new_segment",
  "target": "<amendment filename OR file path OR segment name this maps to>",
  "rationale": "<2-3 sentences: why this mapping, what the idea adds or overlaps>",
  "confidence": 0.0-1.0,
  "title": "<short title for this capability if new_segment>",
  "exact_outcome": "<one-sentence success criterion if new_segment>",
  "allowed_files": ["<file1>", "<file2>"] if new_segment else [],
  "review_tier": "tier_0" | "tier_1" | "tier_2" | "tier_3",
  "rollback_note": "<how to undo if new_segment>",
  "market_sensitive": true | false,
  "overlap_warning": "<null or description of existing functionality this would duplicate>"
}

mapping_type rules:
- existing_module: this is already handled by a module — describe where and what to extend
- extension_point: partially handled — a specific hook/function/factory can absorb this
- new_segment: genuinely new capability — generate the full segment spec
`.trim();

  const start = Date.now();
  const raw = await callGeminiPro(prompt, systemInstruction);
  const latencyMs = Date.now() - start;

  // Parse JSON — strip any accidental markdown fences
  let analysis;
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    analysis = JSON.parse(cleaned);
  } catch {
    // Fallback: return raw text as extension_point with low confidence
    analysis = {
      mapping_type: 'extension_point',
      target: 'unknown — manual review required',
      rationale: raw.slice(0, 500),
      confidence: 0.3,
      overlap_warning: null,
    };
  }

  const result = {
    idea,
    source,
    mapping_type: analysis.mapping_type,
    target: analysis.target,
    rationale: analysis.rationale,
    confidence: analysis.confidence,
    overlap_warning: analysis.overlap_warning || null,
    suggested_segment: analysis.mapping_type === 'new_segment'
      ? buildSuggestedSegment(analysis, idea)
      : null,
    latency_ms: latencyMs,
    raw,
  };

  // Persist to DB if pool provided
  if (pool) {
    try {
      const row = await pool.query(
        `INSERT INTO capability_map
           (idea, source, mapping_type, target, rationale, suggested_segment, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING id`,
        [
          idea,
          source,
          result.mapping_type,
          result.target,
          result.rationale,
          result.suggested_segment ? JSON.stringify(result.suggested_segment) : null,
        ]
      );
      result.id = row.rows[0]?.id;
    } catch (err) {
      // Non-fatal — return result even if DB insert fails
      result.db_error = err.message;
    }
  }

  return result;
}

/**
 * actOnCapability(id, action, pool)
 *
 * accept  → marks accepted, returns suggested_segment for review
 * reject  → marks rejected
 * insert  → inserts suggested_segment into project_segments (requires project_id)
 */
export async function actOnCapability(id, action, { pool, projectId } = {}) {
  if (!pool) throw new Error('pool required');

  const { rows } = await pool.query('SELECT * FROM capability_map WHERE id = $1', [id]);
  if (!rows.length) throw new Error(`capability_map id ${id} not found`);
  const cap = rows[0];

  if (action === 'reject') {
    await pool.query(`UPDATE capability_map SET status = 'rejected', acted_at = NOW() WHERE id = $1`, [id]);
    return { status: 'rejected' };
  }

  if (action === 'accept') {
    await pool.query(`UPDATE capability_map SET status = 'accepted', acted_at = NOW() WHERE id = $1`, [id]);
    return { status: 'accepted', suggested_segment: cap.suggested_segment };
  }

  if (action === 'insert') {
    if (!projectId) throw new Error('projectId required for insert action');
    if (cap.mapping_type !== 'new_segment') throw new Error('Only new_segment capabilities can be inserted');
    if (!cap.suggested_segment) throw new Error('No suggested_segment on this capability');

    const spec = cap.suggested_segment;

    // Get current max position for this project
    const pos = await pool.query(
      `SELECT COALESCE(MAX(position), 0) + 1 AS next_pos FROM project_segments WHERE project_id = $1`,
      [projectId]
    );
    const nextPos = pos.rows[0].next_pos;

    const ins = await pool.query(
      `INSERT INTO project_segments
         (project_id, name, description, status, position, review_tier,
          exact_outcome, allowed_files, required_checks, rollback_note)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        projectId,
        spec.name,
        spec.description || cap.idea,
        nextPos,
        spec.review_tier || 'tier_2',
        spec.exact_outcome || '',
        JSON.stringify(spec.allowed_files || []),
        JSON.stringify(spec.required_checks || ['node --check']),
        spec.rollback_note || '',
      ]
    );

    const segmentId = ins.rows[0].id;
    await pool.query(
      `UPDATE capability_map SET status = 'inserted', segment_id = $1, acted_at = NOW() WHERE id = $2`,
      [segmentId, id]
    );

    return { status: 'inserted', segment_id: segmentId };
  }

  throw new Error(`Unknown action: ${action}. Use accept | reject | insert`);
}

/**
 * listCapabilities(pool, opts)
 * Returns capability_map rows with optional status filter.
 */
export async function listCapabilities(pool, { status, limit = 50 } = {}) {
  const params = [];
  let where = '';
  if (status) {
    params.push(status);
    where = 'WHERE status = $1';
  }
  params.push(limit);
  const { rows } = await pool.query(
    `SELECT * FROM capability_map ${where} ORDER BY analyzed_at DESC LIMIT $${params.length}`,
    params
  );
  return rows;
}
