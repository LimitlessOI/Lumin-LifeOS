/**
 * SYNOPSIS: Service for analyzing competitor data and providing insights.
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */
export async function analyzeCompetitors(deps, payload) {
  const { pool, logger, callCouncilMember } = deps;
  const { competitorId, niche, query } = payload || {};

  try {
    // Fetch competitor data from the database
    let competitors = [];
    if (competitorId) {
      const { rows } = await pool.query('SELECT * FROM competitors WHERE id = $1', [competitorId]);
      competitors = rows;
    } else {
      const { rows } = await pool.query('SELECT * FROM competitors');
      competitors = rows;
    }

    if (competitors.length === 0) {
      logger.warn('No competitors found for analysis.');
      return [];
    }

    // Prepare data for AI analysis
    const competitorDataString = competitors.map(c =>
      `Name: ${c.name}, Industry: ${c.industry}, Market Cap: ${c.market_cap}`
    ).join('\n');

    const prompt = `Analyze the following competitors and provide insights based on their name, industry, and market cap.
    ${niche ? `Focus on the niche: ${niche}.` : ''}
    ${query ? `Consider the specific query: "${query}".` : ''}

    Competitors:\n${competitorDataString}\n\n
    Provide a concise summary of their strengths, weaknesses, and potential market opportunities.
    Return the analysis as a JSON array of objects, where each object represents a competitor and includes 'name', 'analysis_summary', 'strengths', 'weaknesses', 'and 'opportunities'.`;

    // Call AI Council Member for analysis
    const aiResponse = await callCouncilMember('competitor-analyst', prompt, {
      response_format: { type: 'json_object' }
    });

    const parsedResponse = JSON.parse(aiResponse);

    // Log the analysis and potentially store it in the database
    logger.info({ competitorId, niche, query, analysis: parsedResponse }, 'Competitor analysis completed');

    // Store the report in creative_competitor_reports table
    // Assuming owner_id and creative_job_id are not directly available in payload for this service,
    // we'll use placeholders or null if not provided.
    // In a real scenario, these might come from a broader context or another service.
    const owner_id = payload.ownerId || null;
    const creative_job_id = payload.creativeJobId || null;

    if (owner_id && creative_job_id) { // Only store if related to a creative job and owner
      await pool.query(
        `INSERT INTO creative_competitor_reports (owner_id, creative_job_id, niche, query_used, report_json)
         VALUES ($1, $2, $3, $4, $5)`,
        [owner_id, creative_job_id, niche, query, JSON.stringify(parsedResponse)]
      );
    }

    return parsedResponse;
  } catch (error) {
    logger.error({ error, competitorId, niche, query }, 'Error in analyzeCompetitors');
    throw new Error('Failed to perform competitor analysis');
  }
}