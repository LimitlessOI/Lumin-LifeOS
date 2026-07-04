/**
 * SYNOPSIS: Exports createTraditionLensService — services/tradition-lens-service.js.
 */
import { randomUUID } from 'node:crypto';

const VALID_TRADITIONS = new Set([
  'christianity',
  'catholicism',
  'orthodoxy',
  'protestantism',
  'judaism',
  'islam',
  'buddhism',
  'hinduism',
  'sikhism',
  'taoism',
  'shinto',
  'interfaith',
  'general',
]);

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeTradition(value) {
  const t = normalizeText(value).toLowerCase();
  if (!t) return 'general';
  if (VALID_TRADITIONS.has(t)) return t;
  return 'general';
}

function buildLens(tradition, content) {
  const text = normalizeText(content);
  const base = {
    tradition,
    content: text,
    lens: 'general',
    emphasis: [],
    considerations: [],
  };

  switch (tradition) {
    case 'christianity':
    case 'catholicism':
    case 'orthodoxy':
    case 'protestantism':
      return {
        ...base,
        lens: tradition,
        emphasis: ['scripture', 'discipleship', 'grace', 'community'],
        considerations: ['clarify theological framing', 'avoid sect-specific assumptions unless present'],
      };
    case 'judaism':
      return {
        ...base,
        lens: tradition,
        emphasis: ['torah', 'covenant', 'practice', 'communal interpretation'],
        considerations: ['respect halakhic diversity', 'avoid collapsing denominations'],
      };
    case 'islam':
      return {
        ...base,
        lens: tradition,
        emphasis: ['quran', 'prophetic tradition', 'submission to God', 'practice'],
        considerations: ['avoid sectarian assumptions', 'distinguish normative and cultural practice'],
      };
    case 'buddhism':
      return {
        ...base,
        lens: tradition,
        emphasis: ['suffering', 'practice', 'mindfulness', 'compassion'],
        considerations: ['avoid theistic framing', 'preserve school differences where relevant'],
      };
    case 'hinduism':
      return {
        ...base,
        lens: tradition,
        emphasis: ['dharma', 'devotion', 'practice', 'path diversity'],
        considerations: ['avoid flattening traditions into one system', 'acknowledge pluralism'],
      };
    case 'sikhism':
      return {
        ...base,
        lens: tradition,
        emphasis: ['guru', 'seva', 'justice', 'community'],
        considerations: ['avoid conflating with adjacent traditions', 'respect core identity markers'],
      };
    case 'taoism':
      return {
        ...base,
        lens: tradition,
        emphasis: ['harmony', 'way', 'non-forcing', 'balance'],
        considerations: ['keep metaphysics light unless requested', 'avoid rigid moralizing tone'],
      };
    case 'shinto':
      return {
        ...base,
        lens: tradition,
        emphasis: ['ritual', 'purity', 'place', 'relationship'],
        considerations: ['respect contextual practice', 'avoid universalizing local customs'],
      };
    case 'interfaith':
      return {
        ...base,
        lens: tradition,
        emphasis: ['shared values', 'difference awareness', 'bridge language'],
        considerations: ['make room for multiple traditions', 'avoid privileging one lens'],
      };
    default:
      return {
        ...base,
        lens: 'general',
        emphasis: ['clarity', 'context', 'purpose'],
        considerations: ['apply a neutral framing', 'invite tradition selection when useful'],
      };
  }
}

export function createTraditionLensService({ pool }) {
  async function applyLenses({ content, tradition, userId = null, metadata = null }) {
    const normalizedTradition = normalizeTradition(tradition);
    const lens = buildLens(normalizedTradition, content);

    const record = {
      id: randomUUID(),
      user_id: userId,
      tradition: normalizedTradition,
      content: normalizeText(content),
      result: JSON.stringify(lens),
      metadata: JSON.stringify(metadata || {}),
    };

    if (pool?.query) {
      await pool.query(
        `INSERT INTO tradition_lens_applied
           (id, user_id, tradition, content, result, metadata)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
        [record.id, record.user_id, record.tradition, record.content, record.result, record.metadata],
      );
    }

    return lens;
  }

  async function listTraditions() {
    return [
      'general',
      'christianity',
      'catholicism',
      'orthodoxy',
      'protestantism',
      'judaism',
      'islam',
      'buddhism',
      'hinduism',
      'sikhism',
      'taoism',
      'shinto',
      'interfaith',
    ];
  }

  return {
    applyLenses,
    listTraditions,
  };
}