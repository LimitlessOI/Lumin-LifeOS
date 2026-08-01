/**
 * SYNOPSIS: Provides AI pre-analysis prompt writing and execution services.
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 */

/**
 * Performs AI pre-analysis with a provided prompt.
 * @param {object} deps - Dependencies (pool, logger, callCouncilMember).
 * @param {object} payload - Contains the analysis prompt and optional taskType.
 */
export const aiPreAnalysisPrompt = async (deps, payload) => {
  const { pool, logger, callCouncilMember } = deps;
  const { prompt: analysisPrompt, taskType = 'general' } = payload || {};

  if (!analysisPrompt) {
    logger.warn({ payload }, 'Missing prompt for AI pre-analysis.');
    throw new Error('Analysis prompt is required for AI pre-analysis.');
  }

  try {
    logger.info({ taskType, promptSnippet: analysisPrompt.substring(0, 100) }, 'Initiating AI pre-analysis with provided prompt.');

    const aiResponse = await callCouncilMember('Founder', analysisPrompt, { taskType: `pre-analysis-${taskType}` });

    const tokensUsed = aiResponse.tokensUsed || 0;
    const aiMember = 'Founder';
    const success = true;

    await pool.query(
      `INSERT INTO ai_performance (ai_member, task_id, task_type, tokens_used, success)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [aiMember, null, `pre-analysis-${taskType}`, tokensUsed, success]
    );

    return { success: true, analysisResult: aiResponse.response };
  } catch (error) {
    logger.error({ error, payload }, 'Error in aiPreAnalysisPrompt during AI pre-analysis execution.');
    throw new Error('Failed to perform AI pre-analysis with provided prompt.');
  }
};

/**
 * Registers the AI Pre-Analysis Service and runs a generated pre-analysis prompt.
 * @param {object} deps - Dependencies (pool, logger, callCouncilMember).
 * @param {object} payload - Contains taskType and inputData.
 */
export const registerAIPreAnalysisService = async (deps, payload) => {
  const { pool, logger, callCouncilMember } = deps;
  const { taskType, inputData } = payload || {};

  if (!taskType || !inputData) {
    logger.warn({ payload }, 'Missing taskType or inputData for AI pre-analysis.');
    throw new Error('Task type and input data are required for AI pre-analysis.');
  }

  try {
    const prompt = generatePreAnalysisPrompt(taskType, inputData);
    logger.info({ taskType, promptSnippet: prompt.substring(0, 100) }, 'Generated AI pre-analysis prompt.');

    const aiResponse = await callCouncilMember('Founder', prompt, { taskType: `pre-analysis-${taskType}` });

    await pool.query(
      `INSERT INTO ai_performance (ai_member, task_id, task_type, tokens_used, success)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['Founder', null, `pre-analysis-${taskType}`, aiResponse.tokensUsed || 0, true]
    );

    return { success: true, analysisResult: aiResponse.response };
  } catch (error) {
    logger.error({ error, payload }, 'Error in registerAIPreAnalysisService during AI pre-analysis.');
    throw new Error('Failed to perform AI pre-analysis.');
  }
};

/**
 * Generates a pre-analysis prompt for AI processing based on task type and input data.
 */
export function generatePreAnalysisPrompt(taskType, inputData) {
  let prompt = `Perform a pre-analysis for the following ${taskType} task. Provide a high-level overview, identify potential challenges, suggest key areas of focus, and recommend the next steps.`;

  if (inputData) {
    prompt += `\n\nInput Data:\n\`\`\`json\n${JSON.stringify(inputData, null, 2)}\n\`\`\``;
  }

  prompt += `\n\nBased on this, what are the critical points for a successful execution?`;
  return prompt;
}

// The following functions from the original file are not directly used by registerAIPreAnalysisService
// but are kept to satisfy the "extend what is there" principle and potential future use.

/**
 * Writes a generic AI pre-analysis prompt based on provided data.
 */
export function writeAIPreAnalysisPrompt(data) {
  return `Analyze the following data: ${JSON.stringify(data)}`;
}

/**
 * Tests the AI pre-analysis prompt generation.
 */
export function testAIPreAnalysisPrompt() {
  const testData = { key: 'value' };
  const prompt = writeAIPreAnalysisPrompt(testData);
  console.log('Generated Prompt:', prompt);
}

/**
 * Exposes the pre-analysis prompt generator for callers.
 */
export function runPreAnalysis(taskType, inputData) {
  return generatePreAnalysisPrompt(taskType, inputData);
}
