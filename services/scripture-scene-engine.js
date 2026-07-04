/**
 * SYNOPSIS: Exports createScriptureSceneEngine — services/scripture-scene-engine.js.
 */
export function createScriptureSceneEngine({ callCouncilMember }) {
  if (typeof callCouncilMember !== 'function') {
    throw new TypeError('callCouncilMember_required');
  }

  const TRADITION_HINTS = [
    { key: 'christian', terms: ['christian', 'christianity', 'bible', 'jesus', 'gospel', 'old testament', 'new testament'] },
    { key: 'judaism', terms: ['jewish', 'judaism', 'torah', 'tanakh', 'hebrew bible', 'rabbi', 'moses', 'exodus'] },
    { key: 'islam', terms: ['islam', 'muslim', 'quran', 'qur\'an', 'hadith', 'prophet muhammad', 'muhammad'] },
    { key: 'hinduism', terms: ['hindu', 'hinduism', 'veda', 'vedas', 'bhagavad gita', 'gita', 'krishna', 'rama'] },
    { key: 'buddhism', terms: ['buddhist', 'buddhism', 'sutra', 'sutta', 'dharma', 'buddha'] },
  ];

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function inferTradition({ tradition, source }) {
    const direct = normalizeText(tradition).toLowerCase();
    if (direct) return direct;

    const src = normalizeText(source).toLowerCase();
    for (const entry of TRADITION_HINTS) {
      if (entry.terms.some((term) => src.includes(term))) return entry.key;
    }
    return 'unknown';
  }

  function buildCouncilPrompt({ tradition, source, sceneCount, audience, tone }) {
    const safeCount = Math.min(Math.max(parseInt(sceneCount, 10) || 3, 1), 12);
    const payload = {
      tradition: inferTradition({ tradition, source }),
      source: normalizeText(source),
      scene_count: safeCount,
      audience: normalizeText(audience) || 'general',
      tone: normalizeText(tone) || 'faithful, reverent, vivid',
      output_shape: {
        scenes: [
          {
            title: 'string',
            scripture_reference: 'string or null',
            setting: 'string',
            characters: ['string'],
            visual_motifs: ['string'],
            action: 'string',
            emotion: 'string',
            narration: 'string',
          },
        ],
      },
    };

    return [
      'Generate scripture scenes based on the provided tradition and source.',
      'Use only the source and tradition context given by the user.',
      'Return structured JSON matching the requested shape.',
      `INPUT: ${JSON.stringify(payload)}`,
    ].join('\n');
  }

  async function generateScenes({ tradition, source, sceneCount, audience, tone } = {}) {
    const sourceText = normalizeText(source);
    if (!sourceText) {
      const err = new Error('source_required');
      err.status = 400;
      throw err;
    }

    const prompt = buildCouncilPrompt({ tradition, source, sceneCount, audience, tone });
    const result = await callCouncilMember({
      task: 'generate_scripture_scenes',
      prompt,
      tradition: inferTradition({ tradition, source: sourceText }),
      source: sourceText,
      sceneCount: Math.min(Math.max(parseInt(sceneCount, 10) || 3, 1), 12),
      audience: normalizeText(audience) || null,
      tone: normalizeText(tone) || null,
    });

    if (result && typeof result === 'object') {
      if (Array.isArray(result.scenes)) return result;
      if (result.output && typeof result.output === 'object' && Array.isArray(result.output.scenes)) {
        return result.output;
      }
      if (typeof result.text === 'string') {
        try {
          const parsed = JSON.parse(result.text);
          if (parsed && Array.isArray(parsed.scenes)) return parsed;
        } catch {
          // fall through
        }
      }
    }

    const err = new Error('invalid_council_response');
    err.status = 502;
    throw err;
  }

  return {
    generateScenes,
  };
}