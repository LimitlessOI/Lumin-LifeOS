/**
 * SYNOPSIS: Exports createAiCouncilService — services/ai-council-service.js.
 */
import { classifyIntent } from './voice-rail-v1.js';

const BRIEF_ASSET_TYPES = [
  'landing_page_copy',
  'email_sequence',
  'ad_copy',
  'social_content',
  'product_description',
  'sales_page_copy',
  'internal_memo',
  'presentation_outline',
  'workflow_brief',
  'unknown',
];

function safeJsonParse(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function normalizeText(value) {
  return String(value || '').trim();
}

function inferAssetType(text) {
  const t = String(text || '').toLowerCase();

  if (!t) return 'unknown';
  if (/\b(email sequence|drip campaign|welcome series|newsletter)\b/.test(t)) return 'email_sequence';
  if (/\b(landing page|homepage copy|hero section|conversion page)\b/.test(t)) return 'landing_page_copy';
  if (/\b(ad copy|facebook ad|google ad|paid social|campaign creative)\b/.test(t)) return 'ad_copy';
  if (/\b(social post|linkedin post|twitter thread|x post|instagram caption|social content)\b/.test(t)) return 'social_content';
  if (/\b(product description|product page|listing copy|catalog copy)\b/.test(t)) return 'product_description';
  if (/\b(sales page|sales letter|long-form sales page|vsl)\b/.test(t)) return 'sales_page_copy';
  if (/\b(internal memo|ops memo|team memo|announcement)\b/.test(t)) return 'internal_memo';
  if (/\b(presentation|deck|slide outline|pitch deck)\b/.test(t)) return 'presentation_outline';
  if (/\b(workflow|process|brief|intake|requirements|spec)\b/.test(t)) return 'workflow_brief';

  const voiceIntent = classifyIntent(text, 'conversation');
  if (voiceIntent === 'command') return 'workflow_brief';
  if (voiceIntent === 'general_conversation') return 'workflow_brief';

  return 'unknown';
}

function extractDraftText(aiResult, fallbackText) {
  if (typeof aiResult === 'string') return aiResult.trim();
  if (aiResult && typeof aiResult === 'object') {
    return (
      aiResult.draft ||
      aiResult.content ||
      aiResult.text ||
      aiResult.output ||
      aiResult.message ||
      fallbackText ||
      ''
    ).toString().trim();
  }
  return String(fallbackText || '').trim();
}

function extractAiPayload(aiResult, briefText) {
  const payload = aiResult && typeof aiResult === 'object' ? aiResult : {};
  const draft = extractDraftText(aiResult, briefText);
  return {
    asset_type: payload.asset_type || payload.assetType || inferAssetType(briefText),
    draft,
    summary: payload.summary || payload.overview || null,
    key_points: Array.isArray(payload.key_points)
      ? payload.key_points
      : Array.isArray(payload.keyPoints)
        ? payload.keyPoints
        : [],
    tone: payload.tone || null,
    raw: payload,
  };
}

export function createAiCouncilService(callCouncilMember) {
  if (typeof callCouncilMember !== 'function') {
    throw new Error('callCouncilMember_required');
  }

  async function preAnalyzeBriefs({ briefs = [], context = {} } = {}) {
    const inputBriefs = Array.isArray(briefs) ? briefs : [briefs];
    const cleaned = inputBriefs
      .map((brief, index) => {
        if (brief && typeof brief === 'object') {
          return {
            index,
            id: brief.id ?? null,
            text: normalizeText(brief.text || brief.brief || brief.raw_text || brief.content || ''),
            metadata: brief.metadata || {},
          };
        }
        return {
          index,
          id: null,
          text: normalizeText(brief),
          metadata: {},
        };
      })
      .filter((item) => item.text);

    if (!cleaned.length) {
      const err = new Error('briefs_required');
      err.status = 400;
      throw err;
    }

    const aiResponse = await callCouncilMember(
      'openai',
      {
        task: 'Analyze customer briefs and generate a first-pass draft for each brief.',
        briefs: cleaned.map((item) => ({
          id: item.id,
          brief: item.text,
          metadata: item.metadata,
        })),
        context: safeJsonParse(context, context) || {},
        output_schema: {
          briefs: [
            {
              id: 'string|null',
              asset_type: 'string',
              draft: 'string',
              summary: 'string|null',
              key_points: ['string'],
              tone: 'string|null',
            },
          ],
        },
      },
      { taskType: 'general' },
    );

    const parsed = safeJsonParse(aiResponse, aiResponse);
    const aiBriefs = Array.isArray(parsed?.briefs)
      ? parsed.briefs
      : Array.isArray(parsed)
        ? parsed
        : null;

    const results = cleaned.map((item, index) => {
      const fromAi = aiBriefs?.[index] || aiBriefs?.find((entry) => entry && entry.id != null && String(entry.id) === String(item.id)) || null;
      const extracted = extractAiPayload(fromAi, item.text);
      const assetType = BRIEF_ASSET_TYPES.includes(extracted.asset_type)
        ? extracted.asset_type
        : inferAssetType(item.text);

      return {
        id: item.id,
        index: item.index,
        brief: item.text,
        asset_type: assetType,
        draft: extracted.draft || item.text,
        summary: extracted.summary,
        key_points: extracted.key_points,
        tone: extracted.tone,
      };
    });

    return {
      briefs: results,
      raw: parsed,
    };
  }

  return {
    preAnalyzeBriefs,
  };
}