/**
 * SYNOPSIS: Investigates system prompt bloat in Ollama usage.
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */
export async function investigateOllamaPrompts(deps, payload) {
  const { pool, logger } = deps;
  const { startDate, endDate } = payload || {};

  try {
    let query = `
      SELECT
        prompt_text,
        tokens_used
      FROM
        ai_response_cache
      WHERE
        model_used LIKE 'ollama%'
    `;
    const params = [];
    let paramIndex = 1;

    if (startDate) {
      query += ` AND created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    const { rows } = await pool.query(query, params);

    const promptDetails = rows.map(row => {
      const promptText = row.prompt_text || '';
      const tokensUsed = row.tokens_used || 0;
      const systemPromptLength = promptText.length;
      const tokensPerCharacter = systemPromptLength > 0 ? tokensUsed / systemPromptLength : 0;

      return {
        promptText,
        systemPromptLength,
        tokensUsed,
        tokensPerCharacter
      };
    });

    const totalTokensUsed = promptDetails.reduce((acc, { tokensUsed }) => acc + tokensUsed, 0);
    const averageTokensPerPrompt = promptDetails.length > 0 ? totalTokensUsed / promptDetails.length : 0;

    return {
      promptDetails,
      averageTokensPerPrompt,
      totalPromptsAnalyzed: promptDetails.length
    };
  } catch (error) {
    logger.error({ error, payload }, 'Error in investigateOllamaPrompts');
    throw new Error('Failed to investigate Ollama prompts');
  }
}