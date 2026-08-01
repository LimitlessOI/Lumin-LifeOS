/**
 * SYNOPSIS: Provides services for editing character, story, and world bibles, and adding self-insert profiles.
 * @ssot docs/products/story-studio/PRODUCT_HOME.md
 */
export async function editCharacterProfile(deps, payload) {
  const { pool, logger } = deps;
  const { id, name, role, appearance_profile, voice_profile, personality_profile } = payload || {};

  if (!id) {
    logger.warn('editCharacterProfile called without an ID');
    throw new Error('Character ID is required to edit a profile.');
  }

  try {
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(name);
    }
    if (role !== undefined) {
      updateFields.push(`role = $${paramIndex++}`);
      updateValues.push(role);
    }
    if (appearance_profile !== undefined) {
      updateFields.push(`appearance_profile = $${paramIndex++}`);
      updateValues.push(appearance_profile);
    }
    if (voice_profile !== undefined) {
      updateFields.push(`voice_profile = $${paramIndex++}`);
      updateValues.push(voice_profile);
    }
    if (personality_profile !== undefined) {
      updateFields.push(`personality_profile = $${paramIndex++}`);
      updateValues.push(personality_profile);
    }

    if (updateFields.length === 0) {
      logger.info({ id }, 'No fields provided for character profile update.');
      const { rows } = await pool.query('SELECT * FROM story_characters WHERE id = $1', [id]);
      return rows[0] || null;
    }

    updateValues.push(id); // Add ID for the WHERE clause

    const sql = `
      UPDATE story_characters
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    const { rows } = await pool.query(sql, updateValues);
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, payload }, 'Error in editCharacterProfile');
    throw new Error('Failed to update character profile.');
  }
}

/**
 * SYNOPSIS: A user can add themselves as a character with opt-in likeness controls.
 * @ssot docs/products/story-studio/PRODUCT_HOME.md
 */
export async function addSelfInsertProfile(deps, payload) {
  const { pool, logger } = deps;
  const { child_id, project_id, name, role, appearance_profile, voice_profile, personality_profile, likenessOptIn } = payload || {};

  if (!child_id || !project_id || !name) {
    logger.warn('addSelfInsertProfile called with missing required fields: child_id, project_id, or name.');
    throw new Error('child_id, project_id, and name are required to add a self-insert profile.');
  }

  try {
    // Insert into story_characters
    const insertCharacterSql = `
      INSERT INTO story_characters (project_id, name, role, appearance_profile, voice_profile, personality_profile)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, project_id, name, role, appearance_profile, voice_profile, personality_profile, created_at, updated_at;
    `;
    const characterValues = [project_id, name, role, appearance_profile, voice_profile, personality_profile];
    const { rows: characterRows } = await pool.query(insertCharacterSql, characterValues);
    const newCharacter = characterRows[0];

    // Optionally, also insert into character_profiles if specific profile data is provided
    // For a "self-insert", we might default these or allow them to be set
    const integrity_pts = payload.integrity_pts !== undefined ? payload.integrity_pts : 0;
    const generosity_pts = payload.generosity_pts !== undefined ? payload.generosity_pts : 0;
    const courage_pts = payload.courage_pts !== undefined ? payload.courage_pts : 0;
    const level = payload.level !== undefined ? payload.level : 1;

    const insertProfileSql = `
      INSERT INTO character_profiles (child_id, integrity_pts, generosity_pts, courage_pts, level)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, child_id, integrity_pts, generosity_pts, courage_pts, level, created_at, updated_at;
    `;
    const profileValues = [child_id, integrity_pts, generosity_pts, courage_pts, level];
    const { rows: profileRows } = await pool.query(insertProfileSql, profileValues);
    const newProfile = profileRows[0];

    // The likenessOptIn is a conceptual flag, not directly mapped to a DB column in the provided schema.
    // It would typically be stored in a metadata JSON field if available, or handled application-side.
    // For this implementation, we'll return it as part of the response.
    return {
      success: true,
      character: newCharacter,
      profile: newProfile,
      likenessOptIn: !!likenessOptIn, // Ensure boolean
    };
  } catch (error) {
    logger.error({ error, payload }, 'Error in addSelfInsertProfile');
    throw new Error('Failed to add self-insert profile.');
  }
}

/**
 * SYNOPSIS: Edits an existing story bible entry.
 * @ssot docs/products/story-studio/PRODUCT_HOME.md
 */
export async function editStoryBible(deps, payload) {
  const { pool, logger } = deps;
  const { id, owner_id, title, logline, rights_mode, privacy_mode, canon_mode, status } = payload || {};

  if (!id) {
    logger.warn('editStoryBible called without an ID');
    throw new Error('Story ID is required to edit a story bible.');
  }

  try {
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (owner_id !== undefined) {
      updateFields.push(`owner_id = $${paramIndex++}`);
      updateValues.push(owner_id);
    }
    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      updateValues.push(title);
    }
    if (logline !== undefined) {
      updateFields.push(`logline = $${paramIndex++}`);
      updateValues.push(logline);
    }
    if (rights_mode !== undefined) {
      updateFields.push(`rights_mode = $${paramIndex++}`);
      updateValues.push(rights_mode);
    }
    if (privacy_mode !== undefined) {
      updateFields.push(`privacy_mode = $${paramIndex++}`);
      updateValues.push(privacy_mode);
    }
    if (canon_mode !== undefined) {
      updateFields.push(`canon_mode = $${paramIndex++}`);
      updateValues.push(canon_mode);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(status);
    }

    if (updateFields.length === 0) {
      logger.info({ id }, 'No fields provided for story bible update.');
      const { rows } = await pool.query('SELECT * FROM story_projects WHERE id = $1', [id]);
      return rows[0] || null;
    }

    updateValues.push(id); // Add ID for the WHERE clause

    const sql = `
      UPDATE story_projects
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    const { rows } = await pool.query(sql, updateValues);
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, payload }, 'Error in editStoryBible');
    throw new Error('Failed to update story bible.');
  }
}

/**
 * SYNOPSIS: Edits an existing world bible entry.
 * @ssot docs/products/story-studio/PRODUCT_HOME.md
 */
export async function editWorldBible(deps, payload) {
  const { pool, logger } = deps;
  const { id, project_id, lore_json, rules_json, style_bible_json } = payload || {};

  if (!id) {
    logger.warn('editWorldBible called without an ID');
    throw new Error('World ID is required to edit a world bible.');
  }

  try {
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (project_id !== undefined) {
      updateFields.push(`project_id = $${paramIndex++}`);
      updateValues.push(project_id);
    }
    if (lore_json !== undefined) {
      updateFields.push(`lore_json = $${paramIndex++}`);
      updateValues.push(lore_json);
    }
    if (rules_json !== undefined) {
      updateFields.push(`rules_json = $${paramIndex++}`);
      updateValues.push(rules_json);
    }
    if (style_bible_json !== undefined) {
      updateFields.push(`style_bible_json = $${paramIndex++}`);
      updateValues.push(style_bible_json);
    }

    if (updateFields.length === 0) {
      logger.info({ id }, 'No fields provided for world bible update.');
      const { rows } = await pool.query('SELECT * FROM story_worlds WHERE id = $1', [id]);
      return rows[0] || null;
    }

    updateValues.push(id); // Add ID for the WHERE clause

    const sql = `
      UPDATE story_worlds
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    const { rows } = await pool.query(sql, updateValues);
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, payload }, 'Error in editWorldBible');
    throw new Error('Failed to update world bible.');
  }
}