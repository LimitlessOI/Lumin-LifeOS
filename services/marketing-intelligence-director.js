/**
 * SYNOPSIS: Provides strategic marketing recommendations and budget allocation advice.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
export async function getStrategicRecommendations(deps, payload) {
  const { pool, logger, callCouncilMember } = deps;
  const { founderId } = payload || {};

  if (!founderId) {
    logger.warn('getStrategicRecommendations called without founderId');
    throw new Error('Founder ID is required for strategic recommendations.');
  }

  try {
    // Fetch relevant data for the founder from various marketing tables
    const { rows: campaigns } = await pool.query(
      'SELECT campaign_name, campaign_data, status FROM marketing_campaigns WHERE client = $1 ORDER BY created_at DESC LIMIT 5',
      [founderId]
    );
    const { rows: playbooks } = await pool.query(
      'SELECT playbook_data FROM marketing_playbook ORDER BY created_at DESC LIMIT 1'
    );
    const { rows: research } = await pool.query(
      'SELECT research_data FROM marketing_research ORDER BY created_at DESC LIMIT 1'
    );
    const { rows: channelProfiles } = await pool.query(
      'SELECT platform, niche, brand_voice_json, audience_json, posting_cadence_json, performance_memory_json FROM marketing_channel_profiles WHERE owner_id = $1 AND is_active = TRUE',
      [founderId]
    );

    const context = {
      founderId,
      recentCampaigns: campaigns,
      latestPlaybook: playbooks[0]?.playbook_data || null,
      latestResearch: research[0]?.research_data || null,
      activeChannelProfiles: channelProfiles,
    };

    const prompt = `Based on the following marketing context for founder ID ${founderId}, provide strategic recommendations for the next quarter. Focus on high-level strategy, potential growth areas, and areas for optimization. The response should be concise and actionable.

Marketing Context:
${JSON.stringify(context, null, 2)}

Strategic Recommendations:`;

    const recommendations = await callCouncilMember('marketing_director', prompt, { temperature: 0.7 });

    // Assuming marketingMessageLearning.learnFromPerformance is a method available via deps
    // This part is specified in the prompt but the method signature or exact usage is not fully defined.
    // Making a reasonable assumption for its usage.
    if (deps.marketingMessageLearning && typeof deps.marketingMessageLearning.learnFromPerformance === 'function') {
      await deps.marketingMessageLearning.learnFromPerformance({
        founderId,
        contextData: context,
        aiRecommendations: recommendations,
      });
    } else {
      logger.warn('deps.marketingMessageLearning.learnFromPerformance is not available or not a function.');
    }

    return { founderId, recommendations };
  } catch (error) {
    logger.error({ error, founderId }, 'Error in getStrategicRecommendations');
    throw new Error('Failed to retrieve strategic recommendations');
  }
}

/**
 * SYNOPSIS: Allocates marketing budget based on strategic recommendations and past performance.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
export async function allocateBudget(deps, payload) {
  const { pool, logger, callCouncilMember } = deps;
  const { founderId, totalBudget, strategicPriorities } = payload || {};

  if (!founderId || typeof totalBudget !== 'number' || totalBudget <= 0 || !strategicPriorities) {
    logger.warn('allocateBudget called with invalid or missing parameters', { founderId, totalBudget, strategicPriorities });
    throw new Error('Founder ID, valid total budget, and strategic priorities are required for budget allocation.');
  }

  try {
    // Fetch recent campaign performance for context
    const { rows: campaignPerformance } = await pool.query(
      'SELECT campaign_name, status, campaign_data FROM marketing_campaigns WHERE client = $1 ORDER BY created_at DESC LIMIT 10',
      [founderId]
    );

    const { rows: channelPerformance } = await pool.query(
      'SELECT platform, performance_memory_json FROM marketing_channel_profiles WHERE owner_id = $1 AND is_active = TRUE',
      [founderId]
    );

    const context = {
      founderId,
      totalBudget,
      strategicPriorities,
      recentCampaignPerformance: campaignPerformance,
      channelPerformanceMetrics: channelPerformance,
    };

    const prompt = `Given a total marketing budget of $${totalBudget} for founder ID ${founderId} and the following strategic priorities and performance data, propose a detailed budget allocation across key marketing channels and activities. Provide percentages and absolute dollar amounts. Justify the allocation based on the provided context.

Marketing Context:
${JSON.stringify(context, null, 2)}

Budget Allocation Proposal:`;

    const budgetAllocation = await callCouncilMember('marketing_director', prompt, { temperature: 0.7 });

    // Assuming marketingMessageLearning.learnFromPerformance is a method available via deps
    if (deps.marketingMessageLearning && typeof deps.marketingMessageLearning.learnFromPerformance === 'function') {
      await deps.marketingMessageLearning.learnFromPerformance({
        founderId,
        contextData: context,
        aiBudgetAllocation: budgetAllocation,
      });
    } else {
      logger.warn('deps.marketingMessageLearning.learnFromPerformance is not available or not a function.');
    }

    return { founderId, totalBudget, budgetAllocation };
  } catch (error) {
    logger.error({ error, founderId, totalBudget }, 'Error in allocateBudget');
    throw new Error('Failed to allocate budget');
  }
}