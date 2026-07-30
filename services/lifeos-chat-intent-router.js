/**
 * SYNOPSIS: Exports classifyFounderIntent — services/lifeos-chat-intent-router.js.
 */
import fetch from 'node-fetch';

const DEFAULT_PORT = 3000;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${process.env.PORT || DEFAULT_PORT}`;

export async function classifyFounderIntent(message, context) {
  // This is a placeholder for a more sophisticated intent classification.
  // In a real scenario, this would involve NLP, machine learning, or a rule-based system.
  // For now, we'll use simple keyword matching to demonstrate the concept.

  if (message.includes("build") || message.includes("create file") || message.includes("generate code")) {
    return { lane: "direct_build", confidence: 0.9, payload: { instruction: message } };
  }
  if (message.includes("social media os") || message.includes("smos workflow") || message.includes("relocation plan")) {
    return { lane: "workflow_content", confidence: 0.8, payload: { workflow: "SMOS_RELOCATION" } };
  }
  if (message.includes("commitment to") || message.includes("I will do")) {
    return { lane: "commitment", confidence: 0.7, payload: { text: message } };
  }
  if (message.includes("note to self") || message.includes("remember this")) {
    return { lane: "note", confidence: 0.6, payload: { text: message } };
  }
  if (message.includes("check in") || message.includes("how am I doing")) {
    return { lane: "checkin", confidence: 0.6, payload: { text: message } };
  }
  if (message.includes("digital twin context") || message.includes("my current state")) {
    return { lane: "digital_twin_context", confidence: 0.5, payload: { query: message } };
  }

  return { lane: "counsel", confidence: 0.3, payload: { text: message } };
}

export function buildSMOSWorkflowReply(intent, context) {
  // This content should be dynamic based on the actual SMOS relocation workflow.
  // For now, it's a static placeholder.
  return {
    type: "workflow_content",
    content: "Here is the Social Media OS relocation workflow content:\n\n" +
      "1. Audit existing social media presence.\n" +
      "2. Define new brand voice and messaging.\n" +
      "3. Develop content strategy for new platforms.\n" +
      "4. Schedule content migration and new content creation.\n" +
      "5. Monitor performance and adjust strategy."
  };
}

export async function buildDirectBuildReply(intent, context, options = {}) {
  const { instruction } = intent.payload;
  const { commandKey } = options; // Expecting x-command-key in options

  if (!instruction || !commandKey) {
    return {
      type: "counsel",
      content: "I need a build instruction and a command key to proceed with the build."
    };
  }

  try {
    const response = await fetch(`${PUBLIC_BASE_URL}/api/v1/lifeos/builder/build`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-command-key': commandKey,
      },
      body: JSON.stringify({ instruction }),
    });

    const result = await response.json();

    if (response.ok) {
      return {
        type: "build_receipt",
        content: `BUILD RECEIPT:\n` +
          `Status: ${result.pass_fail}\n` +
          `Command Executed: ${result.command_executed}\n` +
          `Target File: ${result.target_file || 'N/A'}\n` +
          `Commit SHA: ${result.commit_sha || 'N/A'}\n` +
          `Duration (ms): ${result.duration_ms || 'N/A'}\n` +
          `First Blocker: ${result.first_blocker || 'None'}\n` +
          `Command Truth: ${result.command_truth || 'N/A'}`
      };
    } else {
      return {
        type: "build_receipt_fail",
        content: `BUILD FAILED: ${result.message || 'Unknown error'}\n` +
          `Details: ${JSON.stringify(result)}`
      };
    }
  } catch (error) {
    console.error("Error during direct build:", error);
    return {
      type: "counsel",
      content: `I encountered an error trying to build: ${error.message}. Please try again.`
    };
  }
}

export async function routeByIntent(message, context) {
  const intent = await classifyFounderIntent(message, context);

  switch (intent.lane) {
    case "workflow_content":
      return buildSMOSWorkflowReply(intent, context);
    case "direct_build":
      // For direct_build, we need the command key. This is a simplification;
      // in a real app, the key might be part of the context or a user setting.
      // For now, we'll assume it's passed in the context for this example.
      return buildDirectBuildReply(intent, context, { commandKey: context.commandKey });
    case "commitment":
      return { type: "commitment_acknowledged", content: `Acknowledged your commitment: "${intent.payload.text}"` };
    case "note":
      return { type: "note_recorded", content: `Recorded your note: "${intent.payload.text}"` };
    case "checkin":
      return { type: "checkin_prompt", content: `Understood you want to check in. How are things progressing with "${intent.payload.text}"?` };
    case "digital_twin_context":
      return { type: "digital_twin_query_acknowledged", content: `Acknowledged request for digital twin context regarding "${intent.payload.query}". I'll retrieve that information.` };
    case "ambient": // Placeholder for future ambient responses
      return { type: "ambient_response", content: "I'm here to assist. What's on your mind?" };
    case "counsel":
    default:
      return { type: "counsel", content: "I'm here to help you think through this. What are you trying to achieve?" };
  }
}