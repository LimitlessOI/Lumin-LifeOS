/**
 * SYNOPSIS: Verifies if music industry professionals have been consulted by querying the database.
 * @ssot docs/products/music-talent-studio/PRODUCT_HOME.md
 */
export async function checkMusicIndustryConsultations(deps, payload) {
  const { pool, logger } = deps;
  const { id } = payload || {};
  try {
    // The specification requires ensuring "2 music industry professionals have been consulted".
    // The existing file had a hardcoded array, but the task requires using the DB.
    // To verify "2 professionals", we can count rows in the music_industry_consults table.
    // The `id` from payload is not directly used for this count but kept for consistency with the template.
    const { rows } = await pool.query('SELECT COUNT(*) FROM music_industry_consults');
    const count = parseInt(rows[0].count, 10);
    return { consultedCount: count, meetsRequirement: count >= 2 };
  } catch (error) {
    logger.error({ error }, 'Error in checkMusicIndustryConsultations');
    throw new Error('Failed in checkMusicIndustryConsultations');
  }
}