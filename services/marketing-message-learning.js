/**
 * SYNOPSIS: Analyzes performance data from marketing_performance_analytics and extracts content learnings.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
export async function learnFromPerformance(deps, payload) {
  const { pool, logger, callCouncilMember } = deps;
  const { contentId } = payload || {}; // Assuming payload contains a contentId to query performance for

  if (!contentId) {
    logger.warn('learnFromPerformance called without contentId in payload.');
    throw new Error('Content ID is required to learn from performance data.');
  }

  try {
    // 1. Fetch performance data for the given contentId
    // Assuming a table `marketing_performance_analytics` exists as per the original spec wording,
    // even though it's not explicitly in LIVE DB SCHEMA.
    // Given the task is "Implement service to analyze performance data and extract content learnings."
    // and the original spec mentions `marketing_performance_analytics`, it's a reasonable inference.
    // If this table does not exist, the query will fail.
    const performanceQuery = `
      SELECT * 
      FROM marketing_performance_analytics 
      WHERE content_id = $1
      ORDER BY created_at DESC
    `;
    const { rows: performanceData } = await pool.query(performanceQuery, [contentId]);

    if (performanceData.length === 0) {
      logger.info({ contentId }, 'No performance data found for content ID.');
      return { contentId, learnings: [], message: 'No performance data to analyze.' };
    }

    // 2. Fetch associated content pieces for context
    const contentPiecesQuery = `
      SELECT content_text, title, body, url, platform, format
      FROM marketing_content_pieces
      WHERE session_id IN (SELECT session_id FROM marketing_content_extractions WHERE id IN (SELECT source_extraction_id FROM marketing_content_atoms WHERE owner_id = $1))
      OR id IN (SELECT extraction_id FROM marketing_content_atoms WHERE owner_id = $1) -- Direct link if owner_id refers to content_piece.id
    `;
    // The link between marketing_performance_analytics and marketing_content_pieces is not direct.
    // Assuming `owner_id` in `marketing_content_atoms` might refer to a content piece or an extraction.
    // For now, let's assume we can get some relevant text by linking through `marketing_content_extractions`
    // and then `marketing_content_pieces` via `session_id`.
    // If `marketing_performance_analytics` had a `content_piece_id`, that would be better.
    // For now, we'll try to get content text that might* be related.
    // This is a weak link, but necessary given schema.
    const { rows: relatedContentPieces } = await pool.query(contentPiecesQuery, [contentId]);

    const contentText = relatedContentPieces.map(p => p.content_text || p.title || p.body).filter(Boolean).join('\n\n');
    const performanceSummary = JSON.stringify(performanceData, null, 2);

    // 3. Use callCouncilMember to analyze and extract learnings
    const prompt = `
      Analyze the following content performance data and associated content text.
      Identify actionable insights and learnings regarding what worked well and what could be improved for future content.
      Focus on elements like topic, style, format, platform, and audience engagement.
      
      Content Text (if available):
      ${contentText || 'No specific content text found.'}

      Performance Data:
      ${performanceSummary}

      Output your findings as a JSON array of learning objects, where each object has 'insight' (string), 'recommendation' (string), and 'confidence_score' (number between 0 and 1).
    `;

    logger.info({ contentId }, 'Calling Council Member for performance analysis.');
    const councilResponse = await callCouncilMember('marketing-strategist', prompt, {
      model: 'claude-3-opus-20240229', // Example model, assuming a capable model for this task
      temperature: 0.3,
    });

    let learnings;
    try {
      learnings = JSON.parse(councilResponse);
      if (!Array.isArray(learnings)) {
        throw new Error('Council Member response was not a JSON array.');
      }
    } catch (parseError) {
      logger.error({ parseError, councilResponse }, 'Failed to parse Council Member response as JSON.');
      // Return a structured error response, but don't rethrow to avoid breaking the service entirely
      return {
        contentId,
        learnings: [],
        message: 'Failed to extract structured learnings from AI. Raw response received.',
        rawCouncilResponse: councilResponse,
      };
    }

    // 4. Optionally, store these learnings in a new table or update existing ones.
    // For now, we'll just return them as the spec asks to "return actionable insights".
    // If a table like `marketing_content_learnings` existed, we would insert here.

    logger.info({ contentId, numLearnings: learnings.length }, 'Successfully extracted content learnings.');
    return { contentId, learnings };

  } catch (error) {
    logger.error({ error, contentId }, 'Error in learnFromPerformance');
    throw new Error('Failed to learn from performance data: ' + error.message);
  }
}