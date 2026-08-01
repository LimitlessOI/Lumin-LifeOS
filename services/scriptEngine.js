/**
 * SYNOPSIS: Engine generates scripts with titles/hooks for media content.
 * @ssot docs/products/creator-media-os/PRODUCT_HOME.md
 */

// Script for long and short form generation.

export async function generateScriptHooks(deps, payload) {
  const { pool, logger, callCouncilMember } = deps;
  const { creator_script_id } = payload || {};

  try {
    if (!creator_script_id) {
      throw new Error('creator_script_id is required in payload');
    }

    const { rows } = await pool.query(
      'SELECT id, channel_id, content_goal, format, script_text FROM creator_scripts WHERE id = $1',
      [creator_script_id]
    );

    const scriptData = rows[0];

    if (!scriptData) {
      return null; // Script not found
    }

    const { content_goal, format, script_text } = scriptData;

    // Use AI Council to generate title and hooks based on the script content and goal
    const titlePrompt = `Generate a concise and engaging title for a media content script. The content goal is "${content_goal}" and the format is "${format}". Here is the script content: "${script_text}"`;
    const hooksPrompt = `Generate 3-5 compelling hook variants for a media content script. The content goal is "${content_goal}" and the format is "${format}". Here is the script content: "${script_text}"`;
    const scriptPrompt = `Review and refine the following script for long and short form media content, ensuring it aligns with the content goal "${content_goal}" and format "${format}". Script: "${script_text}"`;


    const [title, hookVariants, refinedScript] = await Promise.all([
      callCouncilMember('TitleGenerator', titlePrompt),
      callCouncilMember('HookGenerator', hooksPrompt),
      callCouncilMember('ScriptRefiner', scriptPrompt),
    ]);

    const hookVariantsJson = JSON.stringify(hookVariants.split('\n').filter(h => h.trim() !== '')); // Assuming hooks are newline-separated

    // Update the creator_scripts table with the generated title and hooks
    await pool.query(
      `UPDATE creator_scripts SET hook_variants_json = $1, script_text = $2 WHERE id = $3`,
      [hookVariantsJson, refinedScript, creator_script_id]
    );

    return {
      script: refinedScript,
      title: title,
      hooks: JSON.parse(hookVariantsJson),
      creator_script_id: creator_script_id,
    };
  } catch (error) {
    logger.error({ error, payload }, 'Error in generateScriptHooks');
    throw new Error('Failed to generate script titles/hooks');
  }
}
