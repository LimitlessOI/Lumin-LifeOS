/**
 * SYNOPSIS: Identify and map personal relapse triggers with AI-assisted structure.
 * WIRED: service factory for Wellness Studio intake blueprint
 * @ssot docs/products/WELLNESS_STUDIO/WELLNESS_STUDIO_HOME.md
 */
const TRIGGER_TYPES = [
  'environmental',
  'emotional',
  'social',
  'behavioral',
  'physical',
  'cognitive',
  'situational',
  'unknown',
];

const MAPPING_STATUS = ['identified', 'mapped'];

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

function extractCandidateText(input) {
  if (!input) return '';
  if (typeof input === 'string') return input;
  if (Array.isArray(input)) return input.map(extractCandidateText).filter(Boolean).join('\n');
  if (typeof input === 'object') {
    return [
      input.raw_text,
      input.text,
      input.prompt,
      input.answer,
      input.notes,
      input.trigger,
      input.context,
      input.summary,
    ]
      .map(extractCandidateText)
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

function createPayloadFromAI(result, fallbackText) {
  const raw = result && typeof result === 'object' ? result : {};
  const mapped = {
    status: 'mapped',
    triggers: Array.isArray(raw.triggers) ? raw.triggers : [],
    raw_input: fallbackText || null,
    summary: typeof raw.summary === 'string' ? raw.summary : null,
    confidence: typeof raw.confidence === 'number' ? raw.confidence : null,
    meta: raw.meta && typeof raw.meta === 'object' ? raw.meta : {},
  };

  if (!mapped.triggers.length && fallbackText) {
    mapped.triggers = [
      {
        type: 'unknown',
        label: fallbackText.slice(0, 120),
        notes: null,
      },
    ];
  }

  return mapped;
}

export function createTriggerMapper({ pool, callCouncilMember }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_query_required');
  }
  if (typeof callCouncilMember !== 'function') {
    throw new Error('callCouncilMember_required');
  }

  async function mapTriggers(req, res) {
    const ownerId = req?.lifeosUser?.sub || null;
    if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

    const body = req?.body || {};
    const sourceText = normalizeText(
      extractCandidateText(body) ||
        extractCandidateText(req?.query) ||
        extractCandidateText(req?.params),
    );

    if (!sourceText) {
      return res.status(400).json({ error: 'trigger_text_required' });
    }

    const aiResult = await callCouncilMember(
      'gemini',
      [
        {
          role: 'system',
          content:
            'Identify and map the user\'s personal relapse triggers. Return a concise JSON object with summary, triggers, and confidence.',
        },
        {
          role: 'user',
          content: sourceText,
        },
      ],
      { taskType: 'general' },
    );

    const mapped = createPayloadFromAI(aiResult, sourceText);

    const { rows } = await pool.query(
      `INSERT INTO wellness_trigger_maps (owner_id, raw_input, mapped_data, status, created_at, updated_at)
       VALUES ($1, $2, $3::jsonb, $4, NOW(), NOW())
       RETURNING *`,
      [
        ownerId,
        sourceText,
        JSON.stringify(mapped),
        MAPPING_STATUS.includes(mapped.status) ? mapped.status : 'mapped',
      ],
    );

    return res.status(201).json(rows[0]);
  }

  return {
    TRIGGER_TYPES,
    MAPPING_STATUS,
    mapTriggers,
  };
}