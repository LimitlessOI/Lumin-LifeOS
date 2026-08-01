/**
 * SYNOPSIS: Supports building scripture scenes, including with private witness mode.
 * @ssot docs/products/faith-studio/PRODUCT_HOME.md
 */
let privateWitnessModeEnabled = false;

export function buildScriptureScene(sceneConfig) {
  // Logic to build a scripture scene based on the provided configuration
  const scene = {
    ...sceneConfig,
    witness_mode_enabled: privateWitnessModeEnabled, // Use database column name
  };
  // Simulate building process
  console.log("Building scripture scene:", scene);
  return scene;
}

export function enablePrivateWitnessMode(enable) {
  // Enable or disable the private witness mode
  privateWitnessModeEnabled = enable;
  console.log("Private witness mode enabled:", privateWitnessModeEnabled);
}

/**
 * SYNOPSIS: Builds a scripture scene, incorporating the private witness mode setting.
 * @ssot docs/products/faith-studio/PRODUCT_HOME.md
 */
export async function buildSceneWithPrivateMode(deps, payload) {
  const { pool, logger } = deps;
  const { projectId, sequenceNo, sceneSummary, explanationLevel } = payload || {};

  try {
    // Insert a new scene into faith_scenes, setting witness_mode_enabled based on the current global state
    const { rows } = await pool.query(
      `INSERT INTO faith_scenes (project_id, sequence_no, scene_summary, witness_mode_enabled, explanation_level)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, project_id, sequence_no, scene_summary, witness_mode_enabled, explanation_level, created_at`,
      [projectId, sequenceNo, sceneSummary, privateWitnessModeEnabled, explanationLevel]
    );
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, payload }, 'Error in buildSceneWithPrivateMode');
    throw new Error('Failed to build scene with private mode');
  }
}