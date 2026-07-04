/**
 * SYNOPSIS: Exports createCapabilityMapService — services/capability-map-service.js.
 */
export function createCapabilityMapService({ pool, callCouncilMember }) {
  const VALID_MAPPING_TYPES = new Set(['skill', 'domain', 'tool', 'workflow', 'system', 'strategy', 'other']);
  const VALID_STATUSES = new Set(['draft', 'analyzed', 'reviewed', 'accepted', 'rejected']);

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function safeJsonParse(value, fallback = null) {
    if (value == null) return fallback;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function toRowShape(row) {
    if (!row) return null;
    return {
      ...row,
      suggested_segment: safeJsonParse(row.suggested_segment, row.suggested_segment),
    };
  }

  function parseAnalysisResponse(payload) {
    if (!payload) return null;
    if (typeof payload === 'object') return payload;

    const text = String(payload).trim();
    if (!text) return null;

    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1].trim() : text;

    try {
      return JSON.parse(candidate);
    } catch {
      return { raw: text };
    }
  }

  function coerceAnalysis(idea, analysis) {
    const inputIdea = normalizeText(idea);
    const raw = analysis && typeof analysis === 'object' ? analysis : {};
    const suggestedSegment = raw.suggested_segment ?? raw.suggestedSegment ?? null;

    return {
      idea: normalizeText(raw.idea) || inputIdea,
      source: normalizeText(raw.source) || 'gemini',
      mapping_type: VALID_MAPPING_TYPES.has(normalizeText(raw.mapping_type))
        ? normalizeText(raw.mapping_type)
        : (VALID_MAPPING_TYPES.has(normalizeText(raw.mappingType)) ? normalizeText(raw.mappingType) : 'other'),
      target: normalizeText(raw.target) || normalizeText(raw.capability) || normalizeText(raw.name) || inputIdea,
      rationale: normalizeText(raw.rationale) || normalizeText(raw.reasoning) || 'AI capability analysis',
      suggested_segment: suggestedSegment == null ? null : suggestedSegment,
      status: VALID_STATUSES.has(normalizeText(raw.status)) ? normalizeText(raw.status) : 'analyzed',
      analysis: raw,
    };
  }

  async function analyzeCapability({ ownerId, idea, source = 'gemini', mappingType = null }) {
    const normalizedIdea = normalizeText(idea);
    if (!normalizedIdea) {
      const err = new Error('idea_required');
      err.status = 400;
      throw err;
    }

    if (!ownerId) {
      const err = new Error('owner_id_required');
      err.status = 400;
      throw err;
    }

    const prompt = [
      'Analyze the capability idea and return JSON only.',
      'Focus on: capability target, mapping type, rationale, suggested segment, and status.',
      `Idea: ${normalizedIdea}`,
      mappingType ? `Preferred mapping type: ${normalizeText(mappingType)}` : null,
      'Return keys: idea, source, mapping_type, target, rationale, suggested_segment, status.',
    ].filter(Boolean).join('\n');

    const councilResult = await callCouncilMember('gemini', prompt, { taskType: 'general' });
    const parsed = parseAnalysisResponse(councilResult);
    const normalized = coerceAnalysis(normalizedIdea, parsed);

    if (mappingType && VALID_MAPPING_TYPES.has(normalizeText(mappingType))) {
      normalized.mapping_type = normalizeText(mappingType);
    }

    const { rows } = await pool.query(
      `INSERT INTO capability_map
         (owner_id, idea, source, mapping_type, target, rationale, suggested_segment, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
       RETURNING *`,
      [
        ownerId,
        normalized.idea,
        normalized.source,
        normalized.mapping_type,
        normalized.target,
        normalized.rationale,
        JSON.stringify(normalized.suggested_segment),
        normalized.status,
      ],
    );

    return {
      item: toRowShape(rows[0]),
      analysis: normalized.analysis,
    };
  }

  return {
    analyzeCapability,
  };
}