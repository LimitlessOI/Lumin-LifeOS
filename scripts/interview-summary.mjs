/**
 * SYNOPSIS: Summarize insights from parent interviews.
 * @ssot docs/products/kids-os/PRODUCT_HOME.md
 */

/**
 * Gathers and summarizes key insights from parent interviews.
 * This script queries the `parenting_moments` and `kids_os_children` tables
 * to synthesize a narrative about parent experiences and child profiles.
 *
 * @param {object} deps - Injected dependencies including pool, callCouncilMember, and logger.
 * @returns {Promise<string>} A summary of parent interview insights.
 */
export async function summarizeParentInterviews(deps) {
  const { pool, callCouncilMember, logger } = deps;

  logger.info("Starting parent interview summarization.");

  try {
    // Fetch parenting moments
    const momentsResult = await pool.query(
      `SELECT user_id, moment_date, child_name, child_age_years, what_happened, user_response
       FROM parenting_moments
       ORDER BY created_at DESC
       LIMIT 100` // Limiting to recent moments for summarization focus
    );
    const parentingMoments = momentsResult.rows;
    logger.info(`Fetched ${parentingMoments.length} parenting moments.`);

    // Fetch children profiles
    const childrenResult = await pool.query(
      `SELECT id, parent_user_id, grade_level, learning_style, engagement_profile, interests, flags, welfare
       FROM kids_os_children
       LIMIT 10` // Limiting to a sample of children profiles
    );
    const childrenProfiles = childrenResult.rows;
    logger.info(`Fetched ${childrenProfiles.length} children profiles.`);

    if (parentingMoments.length === 0 && childrenProfiles.length === 0) {
      logger.warn("No parent interview data or child profiles found to summarize.");
      return "No parent interview data or child profiles available for summarization.";
    }

    // Prepare data for the AI council
    const dataForCouncil = {
      parentingMoments,
      childrenProfiles,
    };

    const prompt = `
      You are an expert analyst for the LifeOS platform, specializing in "Kids-OS".
      Your task is to synthesize insights from parent interviews and child profiles.
      Identify common themes, challenges, successes, and unique aspects related to child development,
      parental responses, and educational approaches (homeschool vs. traditional if discernible).

      Here is the raw data:
      Parenting Moments: ${JSON.stringify(dataForCouncil.parentingMoments, null, 2)}
      Children Profiles: ${JSON.stringify(dataForCouncil.childrenProfiles, null, 2)}

      Please provide a concise summary, highlighting key findings and potential areas for product development or support.
      Focus on patterns, not just individual anecdotes.
    `;

    logger.info("Calling AI Council for summarization.");
    const summary = await callCouncilMember("analyst", prompt, {
      temperature: 0.3,
      maxTokens: 1000,
    });
    logger.info("AI Council summarization complete.");

    return summary;
  } catch (error) {
    logger.error({ error: error.message }, "Error summarizing parent interviews.");
    throw new Error("Failed to summarize parent interviews: " + error.message);
  }
}