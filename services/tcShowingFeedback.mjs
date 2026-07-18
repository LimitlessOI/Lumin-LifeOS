/**
 * SYNOPSIS: Exports sendShowingFeedbackRequest — services/tcShowingFeedback.mjs.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
export async function sendShowingFeedbackRequest(
  deps,
  { transactionId, agentEmail, showingDate }
) {
  if (!deps?.callCouncilMember) throw new Error('deps.callCouncilMember is required');
  if (!deps?.pool) throw new Error('deps.pool is required');
  if (!deps?.postmark) throw new Error('deps.postmark is required');

  const prompt = [
    'Write a concise, friendly feedback-request email for a real-estate showing.',
    'Goal: ask the agent to reply with showing feedback after the showing.',
    'Include a clear call to action and mention the showing date.',
    'Keep it professional, brief, and easy to reply to.',
    '',
    `Transaction ID: ${transactionId}`,
    `Agent email: ${agentEmail}`,
    `Showing date: ${showingDate ?? 'unknown'}`,
  ].join('\n');

  const body = await deps.callCouncilMember('comms-writer', prompt);

  const subject = `Feedback request for showing ${showingDate ? `on ${showingDate}` : ''}`.trim();

  const sent = await deps.postmark(agentEmail, subject, body);

  const requestData = {
    transactionId,
    agentEmail,
    showingDate,
    subject,
    body,
    delivery: sent ?? null,
  };

  const result = await deps.pool.query(
    `
      INSERT INTO tc_showing_feedback_requests (
        transaction_id,
        agent_email,
        showing_date,
        subject,
        body,
        status,
        request_data,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, 'sent', $6, NOW(), NOW())
      RETURNING *
    `,
    [
      transactionId,
      agentEmail,
      showingDate ?? null,
      subject,
      body,
      JSON.stringify(requestData),
    ]
  );

  return result.rows[0];
}

export async function recordFeedbackWebhook(deps, { requestId, feedbackPayload }) {
  if (!deps?.pool) throw new Error('deps.pool is required');

  const result = await deps.pool.query(
    `
      UPDATE tc_showing_feedback_requests
      SET
        status = 'received',
        feedback_payload = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [requestId, JSON.stringify(feedbackPayload)]
  );

  return result.rows[0] ?? null;
}

export default {
  sendShowingFeedbackRequest,
  recordFeedbackWebhook,
};
