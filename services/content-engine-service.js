/**
 * SYNOPSIS: Exports createContentEngineService — services/content-engine-service.js.
 */
export function createContentEngineService({ pool, callCouncilMember }) {
  async function extractStories(storySourceId = null, founderId = null) {
    if (!storySourceId && !founderId) {
      const err = new Error('story_source_id_or_founder_id_required');
      err.status = 400;
      throw err;
    }

    const params = [];
    let query = `SELECT * FROM extracted_stories`;
    const where = [];

    if (storySourceId) {
      params.push(storySourceId);
      where.push(`story_source_id = $${params.length}`);
    }

    if (founderId) {
      params.push(founderId);
      where.push(`founder_id = $${params.length}`);
    }

    if (where.length) {
      query += ` WHERE ${where.join(' AND ')}`;
    }

    query += ` ORDER BY created_at DESC LIMIT 1`;

    const { rows } = await pool.query(query, params);
    const story = rows[0] || null;
    if (!story) {
      const err = new Error('extracted_story_not_found');
      err.status = 404;
      throw err;
    }
    return story;
  }

  async function generateContentPack({ storyId = null, story = null, founderId = null, metadata = {}, format = null } = {}) {
    const sourceStory = story || (storyId ? await extractStories(storyId, founderId) : null);
    if (!sourceStory) {
      const err = new Error('story_required');
      err.status = 400;
      throw err;
    }

    const promptPayload = {
      purpose: 'Generate social media content packs from extracted stories',
      story: sourceStory,
      founder_id: founderId || sourceStory.founder_id || null,
      metadata: metadata || {},
      format: format || 'social_media',
    };

    const result = await callCouncilMember(
      'openai',
      {
        task: 'Generate social media content from extracted stories',
        input: promptPayload,
      },
      { taskType: 'general' },
    );

    return {
      story: sourceStory,
      result,
    };
  }

  async function generateContentPackForStory(storyId, options = {}) {
    if (!storyId) {
      const err = new Error('story_id_required');
      err.status = 400;
      throw err;
    }
    return generateContentPack({ storyId, ...options });
  }

  async function listContentPacksByFounder(founderId, { limit = 50 } = {}) {
    if (!founderId) {
      const err = new Error('founder_id_required');
      err.status = 400;
      throw err;
    }

    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const { rows } = await pool.query(
      `SELECT * FROM content_packs
       WHERE founder_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [founderId, lim],
    );
    return rows;
  }

  async function getContentPack(contentPackId, founderId = null) {
    if (!contentPackId) {
      const err = new Error('content_pack_id_required');
      err.status = 400;
      throw err;
    }

    const params = founderId ? [contentPackId, founderId] : [contentPackId];
    const query = founderId
      ? `SELECT * FROM content_packs WHERE id = $1 AND founder_id = $2 LIMIT 1`
      : `SELECT * FROM content_packs WHERE id = $1 LIMIT 1`;

    const { rows } = await pool.query(query, params);
    const pack = rows[0] || null;
    if (!pack) {
      const err = new Error('content_pack_not_found');
      err.status = 404;
      throw err;
    }
    return pack;
  }

  return {
    extractStories,
    generateContentPack,
    generateContentPackForStory,
    listContentPacksByFounder,
    getContentPack,
  };
}