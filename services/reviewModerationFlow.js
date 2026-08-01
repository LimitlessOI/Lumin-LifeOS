/**
 * SYNOPSIS: Implements the review moderation flow, including processing and decision logging.
 * @ssot docs/products/faith-studio/PRODUCT_HOME.md
 */
import { getModerationRules, moderateWithCouncil } from './reviewModerationFlow.js'; // Assuming these exist in the same file or a sibling file.

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

    // 2. Apply moderation rules (using existing logic)
    const moderationRules = getModerationRules(); // Use the existing function
    const sacredContentRules = moderationRules.sacredContent.rules;

    // Simulate initial automated scan/keyword detection
    let initialDecision = { status: 'approved', reason: 'No immediate red flags.' };
    for (const rule of sacredContentRules) {
      if (reviewContent.toLowerCase().includes(rule.id.toLowerCase())) { // Simple keyword match for demo
        if (rule.action === 'reject') {
          initialDecision = { status: 'rejected', reason: `Automated rejection: ${rule.description}` };
          break;
        } else if (rule.action === 'flag_for_human_review') {
          initialDecision = { status: 'pending_human_review', reason: `Automated flag: ${rule.description}` };
          // Don't break, continue to find higher severity issues
        }
      }
    }

    // 3. If not immediately rejected, involve the AI Council (using existing logic)
    let councilDecision;
    if (initialDecision.status !== 'rejected') {
      councilDecision = await moderateWithCouncil({ text: reviewContent }); // Use the existing function
    } else {
      councilDecision = { status: initialDecision.status, reason: initialDecision.reason, councilMembersVoted: [] };
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
    } else {
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