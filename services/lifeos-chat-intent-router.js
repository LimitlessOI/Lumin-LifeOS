/**
 * SYNOPSIS: Exports classifyFounderIntent — services/lifeos-chat-intent-router.js.
 */
import fetch from 'node-fetch';

export async function classifyFounderIntent(message, context) {
  // Analyze the message and context to classify the intent
  // Returning a mocked response for demonstration
  return {
    lane: 'workflow_content', // Example lane
    confidence: 0.95,
    payload: { message, context }
  };
}

export async function buildSMOSWorkflowReply(intent, context) {
  // Return concrete workflow content for a Social Media OS relocation
  if (intent.lane === 'workflow_content') {
    return {
      content: "Here is the relocation workflow content for your request.",
      details: { intent, context }
    };
  }
  return { content: "Unable to process workflow content.", details: { intent, context } };
}

export async function buildDirectBuildReply(intent, context, options) {
  try {
    const response = await fetch(`${process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3000'}/api/v1/lifeos/builder/build`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-command-key': options.commandKey
      },
      body: JSON.stringify({ instruction: intent.payload })
    });

    if (response.ok) {
      const result = await response.json();
      return {
        command_truth: result.command_truth,
        pass_fail: result.pass_fail,
        command_executed: result.command_executed,
        target_file: result.target_file,
        commit_sha: result.commit_sha,
        duration_ms: result.duration_ms,
        first_blocker: result.first_blocker || null
      };
    } else {
      return {
        command_truth: null,
        pass_fail: 'FAIL',
        command_executed: null,
        target_file: null,
        commit_sha: null,
        duration_ms: null,
        first_blocker: 'Request failed'
      };
    }
  } catch (error) {
    return {
      command_truth: null,
      pass_fail: 'FAIL',
      command_executed: null,
      target_file: null,
      commit_sha: null,
      duration_ms: null,
      first_blocker: error.message
    };
  }
}

export async function routeByIntent(message, context) {
  const classification = await classifyFounderIntent(message, context);
  switch (classification.lane) {
    case 'workflow_content':
      return buildSMOSWorkflowReply(classification, context);
    case 'direct_build':
      return buildDirectBuildReply(classification, context, { commandKey: 'your-command-key' });
    default:
      return { content: "This request requires further analysis.", details: { message, context } };
  }
}
