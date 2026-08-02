/**
 * SYNOPSIS: Service to generate short animations with high-risk tasks managed
 * @ssot docs/products/story-studio/PRODUCT_HOME.md
 */
export async function generateCartoon(deps, payload) {
  const { pool, logger, callCouncilMember } = deps;
  const { projectId, characterId, styleProfileId, prompt } = payload || {};

  if (!projectId || !characterId || !styleProfileId || !prompt) {
    logger.warn({ payload }, 'Missing required payload fields for generateCartoon');
    throw new Error('Missing required fields: projectId, characterId, styleProfileId, prompt');
  }

  try {
    // Fetch project details
    const { rows: projectRows } = await pool.query(
      'SELECT * FROM story_projects WHERE id = $1',
      [projectId]
    );
    const project = projectRows[0];
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`);
    }

    // Fetch character details
    const { rows: characterRows } = await pool.query(
      'SELECT * FROM story_characters WHERE id = $1',
      [characterId]
    );
    const character = characterRows[0];
    if (!character) {
      throw new Error(`Character with ID ${characterId} not found.`);
    }

    // Fetch user style profile
    const { rows: styleProfileRows } = await pool.query(
      'SELECT profile_data FROM user_style_profile WHERE id = $1',
      [styleProfileId]
    );
    const styleProfile = styleProfileRows[0]?.profile_data;
    if (!styleProfile) {
      throw new Error(`Style profile with ID ${styleProfileId} not found.`);
    }

    // Construct AI prompt for cartoon generation
    const aiPrompt = `Generate a short cartoon animation script based on the following details:
    Project Title: ${project.title}
    Logline: ${project.logline}
    Character Name: ${character.name}
    Character Role: ${character.role}
    Character Appearance: ${JSON.stringify(character.appearance_profile)}
    Character Voice: ${JSON.stringify(character.voice_profile)}
    Character Personality: ${JSON.stringify(character.personality_profile)}
    User Style Preferences: ${JSON.stringify(styleProfile)}
    Specific Request/Prompt: ${prompt}

    Output a detailed script including scene descriptions, character actions, dialogue, and suggested visual style elements for a 15-30 second cartoon short. Focus on a clear narrative arc suitable for animation.`;

    const generatedScript = await callCouncilMember('story-studio-animator', aiPrompt, {
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Store the generated script as a story asset
    const { rows: assetRows } = await pool.query(
      `INSERT INTO story_assets (project_id, asset_type, format, storage_url, metadata_json)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [
        projectId,
        'cartoon_script',
        'text/plain', // Assuming a text script for now, actual storage_url would be a real URL
        'placeholder_url_for_script', // In a real scenario, this would be a link to stored content
        {
          generated_by: 'Gemini Flash',
          source_prompt: prompt,
          character_id: characterId,
          style_profile_id: styleProfileId,
          script_content: generatedScript, // Storing script content directly in metadata for now
        },
      ]
    );

    return {
      assetId: assetRows[0].id,
      projectId: projectId,
      characterId: characterId,
      script: generatedScript,
      status: 'script_generated',
      createdAt: assetRows[0].created_at,
    };
  } catch (error) {
    logger.error({ error, projectId, characterId, styleProfileId, prompt }, 'Error in generateCartoon');
    throw new Error('Failed to generate cartoon script');
  }
}

/**
 * SYNOPSIS: Generates an anime-style short animation script.
 * @ssot docs/products/story-studio/PRODUCT_HOME.md
 */
export async function generateAnimeStyleShort(deps, payload) {
  const { pool, logger, callCouncilMember } = deps;
  const { projectId, characterId, styleProfileId, prompt } = payload || {};

  if (!projectId || !characterId || !styleProfileId || !prompt) {
    logger.warn({ payload }, 'Missing required payload fields for generateAnimeStyleShort');
    throw new Error('Missing required fields: projectId, characterId, styleProfileId, prompt');
  }

  try {
    // Fetch project details
    const { rows: projectRows } = await pool.query(
      'SELECT * FROM story_projects WHERE id = $1',
      [projectId]
    );
    const project = projectRows[0];
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`);
    }

    // Fetch character details
    const { rows: characterRows } = await pool.query(
      'SELECT * FROM story_characters WHERE id = $1',
      [characterId]
    );
    const character = characterRows[0];
    if (!character) {
      throw new Error(`Character with ID ${characterId} not found.`);
    }

    // Fetch user style profile
    const { rows: styleProfileRows } = await pool.query(
      'SELECT profile_data FROM user_style_profile WHERE id = $1',
      [styleProfileId]
    );
    const styleProfile = styleProfileRows[0]?.profile_data;
    if (!styleProfile) {
      throw new Error(`Style profile with ID ${styleProfileId} not found.`);
    }

    // Construct AI prompt for anime generation
    const aiPrompt = `Generate a short anime animation script based on the following details:
    Project Title: ${project.title}
    Logline: ${project.logline}
    Character Name: ${character.name}
    Character Role: ${character.role}
    Character Appearance: ${JSON.stringify(character.appearance_profile)}
    Character Voice: ${JSON.stringify(character.voice_profile)}
    Character Personality: ${JSON.stringify(character.personality_profile)}
    User Style Preferences: ${JSON.stringify(styleProfile)}
    Specific Request/Prompt: ${prompt}

    Output a detailed script including scene descriptions, character actions, dialogue, and suggested visual style elements for a 15-30 second anime short. Emphasize dynamic camera work, expressive character animation, and a compelling narrative arc suitable for the anime aesthetic.`;

    const generatedScript = await callCouncilMember('story-studio-animator', aiPrompt, {
      temperature: 0.8,
      max_tokens: 2000,
    });

    // Store the generated script as a story asset
    const { rows: assetRows } = await pool.query(
      `INSERT INTO story_assets (project_id, asset_type, format, storage_url, metadata_json)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [
        projectId,
        'anime_script',
        'text/plain', // Assuming a text script for now, actual storage_url would be a real URL
        'placeholder_url_for_script', // In a real scenario, this would be a link to stored content
        {
          generated_by: 'Gemini Flash',
          source_prompt: prompt,
          character_id: characterId,
          style_profile_id: styleProfileId,
          script_content: generatedScript, // Storing script content directly in metadata for now
        },
      ]
    );

    return {
      assetId: assetRows[0].id,
      projectId: projectId,
      characterId: characterId,
      script: generatedScript,
      status: 'script_generated',
      createdAt: assetRows[0].created_at,
    };
  } catch (error) {
    logger.error({ error, projectId, characterId, styleProfileId, prompt }, 'Error in generateAnimeStyleShort');
    throw new Error('Failed to generate anime script');
  }
}