/**
 * SYNOPSIS: Exports createStoryFormatEngine — services/story-format-engine.js.
 */
export function createStoryFormatEngine({ pool, callCouncilMember }) {
  const DEFAULT_FORMATS = ['screenplay', 'outline', 'pitch_deck', 'treatment', 'synopsis', 'logline'];

  function normalizeStoryStoryInput(input) {
    if (!input || typeof input !== 'object') return {};
    return input;
  }

  function buildPrompt({ story, targetFormat, voice, audience, constraints }) {
    const payload = {
      story,
      targetFormat,
      voice: voice || null,
      audience: audience || null,
      constraints: constraints || null,
    };

    return [
      'Adapt the story to the requested format.',
      'Preserve canon and meaning unless the target format requires compression.',
      'Return a clean, production-ready adaptation in the target format.',
      'If details are missing, make minimal reasonable assumptions without inventing major new canon.',
      '',
      `INPUT:\n${JSON.stringify(payload, null, 2)}`,
    ].join('\n');
  }

  async function adaptStoryToFormat({
    ownerId,
    storyId = null,
    story = null,
    targetFormat,
    voice = null,
    audience = null,
    constraints = null,
  }) {
    const format = String(targetFormat || '').trim().toLowerCase();
    if (!format) {
      const err = new Error('target_format_required');
      err.status = 400;
      throw err;
    }

    const normalizedStory = normalizeStoryStoryInput(story);

    let resolvedStory = normalizedStory;
    if (!resolvedStory && storyId) {
      const { rows } = await pool.query(
        `SELECT * FROM story_projects WHERE id = $1 AND owner_id = $2 LIMIT 1`,
        [storyId, ownerId],
      );
      resolvedStory = rows[0] || null;
    }

    if (!resolvedStory) {
      const err = new Error('story_required');
      err.status = 400;
      throw err;
    }

    const prompt = buildPrompt({
      story: resolvedStory,
      targetFormat: format,
      voice,
      audience,
      constraints,
    });

    const result = await callCouncilMember('claude', prompt, { taskType: 'general' });

    return {
      targetFormat: format,
      storyId: storyId || resolvedStory.id || null,
      result,
    };
  }

  async function listSupportedFormats() {
    return DEFAULT_FORMATS.slice();
  }

  return {
    DEFAULT_FORMATS,
    adaptStoryToFormat,
    listSupportedFormats,
  };
}