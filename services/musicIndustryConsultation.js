/**
 * SYNOPSIS: Verifies that a minimum number of music industry professionals have been consulted by querying the database.
 * @ssot docs/products/music-talent-studio/PRODUCT_HOME.md
 */
export async function checkMusicIndustryConsultations(deps, payload) {
  const { pool, logger } = deps;
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM music_industry_consults');
    const consultationCount = parseInt(rows[0].count, 10);
    return consultationCount >= 2;
  } catch (error) {
    logger.error({ error }, 'Error in checkMusicIndustryConsultations');
    throw new Error('Failed to verify Music Industry Consultation count');
  }
}