/**
 * SYNOPSIS: Implements the review moderation flow, including processing and decision logging.
 * @ssot docs/products/faith-studio/PRODUCT_HOME.md
 */

// NOTE: The previous attempt included imports for getModerationRules and moderateWithCouncil from the same file.
// As per the rules, we should not rebuild what already exists and extend what is there.
// However, these functions were not provided in the REPO FILE CONTENTS, nor are they part of the injected dependencies.
// To resolve this, these functions will be implemented as internal helpers within this file,
// using the provided `deps.callCouncilMember` for AI moderation.

/**
 * Retrieves moderation rules. In a real system, this might come from a config service or DB.
 * For now, it's hardcoded to simulate existing patterns.
 */
function getModerationRules() {
  return {
    sacredContent: {
      rules: [
        { id: 'hate speech', action: 'reject', description: 'Content contains hate speech.' },
        { id: 'incitement to violence', action: 'reject', description: 'Content incites violence.' },
        { id: 'self-harm', action: 'reject', description: 'Content promotes self-harm.' },
        { id: 'misinformation', action: 'flag_for_human_review', description: 'Content contains potential misinformation.' },
        { id: 'adult content', action: 'flag_for_human_review', description: 'Content may contain adult themes.' },
      ],
    },
  };
}

/**
 * Moderates text content using the AI Council.
 * @param {object} deps - Injected dependencies: callCouncilMember.
 * @param {object} options - Options for moderation.
 * @param {string} options.text - The text content to moderate.
 * @returns {Promise<object>} - Decision from the AI Council.
 */
async function moderateWithCouncil(deps, { text }) {
  const { callCouncilMember, logger } = deps;
  try {
    const prompt = `Review the following content for compliance with LifeOS community guidelines, especially regarding hate speech, violence, self-harm, misinformation, and adult content. Provide a verdict (approved, rejected, pending_human_review) and a concise reason.
    Content: "${text}"
    Verdict and Reason:`;

    const aiResponse = await callCouncilMember('moderator', prompt, {
      temperature: 0.3,
      max_tokens: 150,
      response_format: { type: 'text' }
    });

    // Simple parsing of AI response. A more robust solution might use structured JSON output from AI.
    let status = 'approved';
    let reason = 'No issues detected by AI Council.';

    if (aiResponse.toLowerCase().includes('rejected')) {
      status = 'rejected';
      reason = aiResponse.split('Reason:')[1]?.trim() || 'Rejected by AI Council.';
    } else if (aiResponse.toLowerCase().includes('pending_human_review')) {
      status = 'pending_human_review';
      reason = aiResponse.split('Reason:')[1]?.trim() || 'Flagged for human review by AI Council.';
    } else if (aiResponse.toLowerCase().includes('approved')) {
      status = 'approved';
      reason = aiResponse.split('Reason:')[1]?.trim() || 'Approved by AI Council.';
    }

    return { status, reason, councilMembersVoted: ['moderator_ai'] };

  } catch (error) {
    logger.error({ error }, 'Error calling AI Council for moderation.');
    return { status: 'pending_human_review', reason: 'AI Council call failed, requiring human review.' };
  }
}

/**
 * Processes a review for moderation, applies rules, and logs decisions.
 * @param {object} deps - Injected dependencies: pool, logger, callCouncilMember.
 * @param {object} payload - The review payload, expected to contain 'id' for tc_review_packages and 'content' for moderation.
 * @param {string} payload.id - The ID of the review package to process from tc_review_packages.
 * @param {string} payload.reviewContent - The actual text content to be moderated.
 * @returns {Promise<object|null>} - The updated tc_review_package record or null if not found.
 */
export async function processReviewModeration(deps, payload) {
  const { pool, logger, callCouncilMember } = deps;
  const { id, reviewContent } = payload || {};

  if (!id || !reviewContent) {
    logger.warn({ payload }, 'Missing id or reviewContent in processReviewModeration payload.');
    throw new Error('Missing required payload fields: id and reviewContent.');
  }

  let reviewPackage;
  try {
    // 1. Fetch the review package
    const { rows } = await pool.query('SELECT * FROM tc_review_packages WHERE id = $1', [id]);
    reviewPackage = rows[0];

    if (!reviewPackage) {
      logger.warn({ id }, 'Review package not found for moderation.');
      return null;
    }

    logger.info({ id, status: reviewPackage.status }, 'Processing review moderation for package.');

    // 2. Apply moderation rules
    const moderationRules = getModerationRules();
    const sacredContentRules = moderationRules.sacredContent.rules;

    let initialDecision = { status: 'approved', reason: 'No immediate red flags from automated scan.' };
    for (const rule of sacredContentRules) {
      if (reviewContent.toLowerCase().includes(rule.id.toLowerCase())) {
        if (rule.action === 'reject') {
          initialDecision = { status: 'rejected', reason: `Automated rejection: ${rule.description}` };
          break;
        } else if (rule.action === 'flag_for_human_review') {
          // If already flagged for human review, keep that status unless a higher severity 'reject' is found.
          if (initialDecision.status !== 'rejected') {
            initialDecision = { status: 'pending_human_review', reason: `Automated flag: ${rule.description}` };
          }
        }
      }
    }

    // 3. If not immediately rejected, involve the AI Council
    let councilDecision;
    if (initialDecision.status === 'rejected') {
      councilDecision = { status: initialDecision.status, reason: initialDecision.reason, councilMembersVoted: [] };
    } else {
      councilDecision = await moderateWithCouncil(deps, { text: reviewContent });
    }

    let finalStatus = reviewPackage.status;
    let reviewSummary = reviewPackage.review_summary || {};
    let validation = reviewPackage.validation || {};

    if (councilDecision.status === 'rejected') {
      finalStatus = 'rejected';
      reviewSummary.moderation = councilDecision.reason;
      validation.moderation = { passed: false, reason: councilDecision.reason };
    } else if (councilDecision.status === 'pending_human_review') {
      finalStatus = 'pending_human_review';
      reviewSummary.moderation = councilDecision.reason;
      validation.moderation = { passed: false, reason: councilDecision.reason, requiresHuman: true };
      // Log to decision_review_queue for human review
      await pool.query(
        `INSERT INTO decision_review_queue (user_id, decision_log_id, review_due_at, review_type, status, hindsight_notes)
         VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4, $5)
         RETURNING id`,
        [
          reviewPackage.metadata?.userId || null, // Assuming user_id might be in metadata
          reviewPackage.id,
          'content_moderation',
          'pending',
          `Content flagged by AI Council: ${councilDecision.reason}`
        ]
      );
    } else { // councilDecision.status === 'approved'
      finalStatus = 'approved';
      reviewSummary.moderation = 'Approved by moderation.';
      validation.moderation = { passed: true };
    }

    // 4. Update the tc_review_packages table
    const updateQuery = `
      UPDATE tc_review_packages
      SET status = $1, review_summary = $2, validation = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *;
    `;
    const { rows: updatedRows } = await pool.query(updateQuery, [
      finalStatus,
      reviewSummary,
      validation,
      id
    ]);

    logger.info({ id, finalStatus }, 'Review moderation processed successfully.');
    return updatedRows[0] || null;

  } catch (error) {
    logger.error({ error, id }, 'Error in processReviewModeration');
    throw new Error('Failed in processReviewModeration');
  }
}