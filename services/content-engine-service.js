/**
 * SYNOPSIS: Exports createContentEngineService — services/content-engine-service.js.
 */
function normalizeText(value) {
  return String(value ?? '').trim();
}

function safeParseJson(value, fallback = null) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function asJson(value) {
  return JSON.stringify(value ?? {});
}

function buildContentPrompt({ story, founderContext, platform, brandVoice, campaignContext }) {
  const storyText =
    typeof story === 'string'
      ? story
      : story?.narrative || story?.summary || story?.title || asJson(story);

  return [
    'You are a MarketingOS social media content engine.',
    'Generate a content pack from a founder story.',
    'Return concise, structured output with platform-specific social media assets.',
    '',
    `Platform: ${platform || 'general'}`,
    `Brand voice: ${brandVoice || 'unknown'}`,
    `Campaign context: ${campaignContext || 'unknown'}`,
    `Founder context: ${founderContext || 'unknown'}`,
    '',
    'Story:',
    storyText,
  ].join('\n');
}

function parseContentPack(raw) {
  const text = normalizeText(raw);
  if (!text) {
    return { contentPack: [], summary: '', raw };
  }

  const parsed = safeParseJson(text, null);
  if (parsed && typeof parsed === 'object') {
    const contentPack = Array.isArray(parsed.contentPack)
      ? parsed.contentPack
      : Array.isArray(parsed.packs)
        ? parsed.packs
        : Array.isArray(parsed.items)
          ? parsed.items
          : [];
    return {
      summary: normalizeText(parsed.summary || parsed.overview || ''),
      contentPack,
      raw,
    };
  }

  return {
    summary: '',
    contentPack: [
      {
        platform: 'general',
        copy: text,
      },
    ],
    raw,
  };
}

export function createContentEngineService({ pool, callCouncilMember }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_query_required');
  }
  if (typeof callCouncilMember !== 'function') {
    throw new Error('callCouncilMember_required');
  }

  async function listStories({ founderId, limit = 50 } = {}) {
    const founder = normalizeText(founderId);
    if (!founder) {
      const err = new Error('founder_id_required');
      err.status = 400;
      throw err;
    }

    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const { rows } = await pool.query(
      `SELECT *
         FROM coaching_sessions
        WHERE founder_id = $1
          AND consent_record IS NOT NULL
        ORDER BY timestamp DESC
        LIMIT $2`,
      [founder, lim],
    );

    return rows;
  }

  async function generateContentPack({
    story,
    founderContext,
    platform,
    brandVoice,
    campaignContext,
  } = {}) {
    const normalizedStory = normalizeText(typeof story === 'string' ? story : story?.narrative || story?.summary || story?.title);
    if (!normalizedStory) {
      const err = new Error('story_required');
      err.status = 400;
      throw err;
    }

    const prompt = buildContentPrompt({
      story,
      founderContext: founderContext || '',
      platform: platform || '',
      brandVoice: brandVoice || '',
      campaignContext: campaignContext || '',
    });

    const result = await callCouncilMember(
      'openai',
      {
        prompt,
        story,
        founder_context: founderContext || null,
        platform: platform || null,
        brand_voice: brandVoice || null,
        campaign_context: campaignContext || null,
      },
      { taskType: 'general' },
    );

    const rawOutput =
      typeof result === 'string'
        ? result
        : result?.output ?? result?.text ?? result?.content ?? result?.message ?? '';

    return parseContentPack(rawOutput);
  }

  async function generateContentFromStory(storyId, options = {}) {
    const id = normalizeText(storyId);
    if (!id) {
      const err = new Error('story_id_required');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `SELECT * FROM coaching_sessions WHERE session_id = $1 LIMIT 1`,
      [id],
    );

    const session = rows[0];
    if (!session) {
      const err = new Error('story_not_found');
      err.status = 404;
      throw err;
    }

    const extraction = safeParseJson(session.extraction || session.story_extraction || null, null);
    const story = extraction?.stories?.[0] || extraction?.story || session.story || session.story_text || session.summary || session.transcript_text || '';

    const content = await generateContentPack({
      story,
      founderContext: options.founderContext || session.founder_id || '',
      platform: options.platform || '',
      brandVoice: options.brandVoice || '',
      campaignContext: options.campaignContext || '',
    });

    return {
      story: story || null,
      content,
      session,
    };
  }

  return {
    listStories,
    generateContentPack,
    generateContentFromStory,
  };
}