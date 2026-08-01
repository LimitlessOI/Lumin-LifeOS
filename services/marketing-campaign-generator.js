/**
 * SYNOPSIS: Generates and retrieves marketing campaign assets.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */

export async function generateCampaignAssets(deps, payload) {
  const { pool, logger, callCouncilMember } = deps;
  const { sessionId, campaignDetails } = payload || {};

  if (!sessionId || !campaignDetails) {
    logger.warn({ payload }, 'Missing sessionId or campaignDetails in generateCampaignAssets payload');
    throw new Error('Missing required payload parameters.');
  }

  try {
    const landingPageHeadlinePrompt = `Generate a compelling landing page headline for a campaign with these details: ${JSON.stringify(campaignDetails)}.`;
    const landingPageHeadline = await callCouncilMember('marketing_copywriter', landingPageHeadlinePrompt);

    const emailSubjectLinePrompt = `Craft an engaging email subject line for a campaign with these details: ${JSON.stringify(campaignDetails)}.`;
    const emailSubjectLine = await callCouncilMember('marketing_copywriter', emailSubjectLinePrompt);

    const adCopyPrompt = `Write concise and persuasive ad copy for a campaign with these details: ${JSON.stringify(campaignDetails)}.`;
    const adCopy = await callCouncilMember('marketing_copywriter', adCopyPrompt);

    const leadMagnetIdeaPrompt = `Suggest a high-value lead magnet idea for a campaign targeting these details: ${JSON.stringify(campaignDetails)}.`;
    const leadMagnetIdea = await callCouncilMember('marketing_strategist', leadMagnetIdeaPrompt);

    const generatedAssets = {
      landingPageHeadline,
      emailSubjectLine,
      adCopy,
      leadMagnetIdea,
    };

    const insertSql = `
      INSERT INTO marketing_campaign_assets (
        session_id,
        asset_type,
        asset_content,
        status
      ) VALUES ($1, $2, $3, $4)
      RETURNING id, created_at;
    `;

    await pool.query(insertSql, [
      sessionId,
      'full_campaign_assets',
      JSON.stringify(generatedAssets),
      'generated',
    ]);

    logger.info({ sessionId, generatedAssets }, 'Successfully generated and saved campaign assets.');

    return { success: true, assets: generatedAssets };
  } catch (error) {
    logger.error({ error, sessionId, campaignDetails }, 'Error in generateCampaignAssets');
    throw new Error('Failed to generate campaign assets.');
  }
}

export async function getCampaignAssetsBySessionId(deps, payload) {
  const { pool, logger } = deps;
  const sessionId = typeof payload === 'string' ? payload : payload?.sessionId;

  if (!sessionId) {
    logger.warn({ payload }, 'Missing sessionId in getCampaignAssetsBySessionId');
    throw new Error('sessionId is required');
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, session_id, asset_type, asset_content, status, created_at, updated_at
       FROM marketing_campaign_assets
       WHERE session_id = $1
       ORDER BY created_at DESC`,
      [sessionId],
    );

    if (rows.length === 0) {
      return null;
    }

    return rows;
  } catch (error) {
    logger.error({ error, sessionId }, 'Error in getCampaignAssetsBySessionId');
    throw new Error('Failed to retrieve campaign assets.');
  }
}
