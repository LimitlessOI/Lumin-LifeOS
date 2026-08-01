/**
 * SYNOPSIS: Exports classifyFounderIntent — services/lifeos-chat-intent-router.js.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fetch from 'node-fetch';
import { executeCommitment, executeNote, executeCheckin, executeAmbient } from './lifeos-chat-action-service.js';
import { getTwinContextForUser } from './lifeos-digital-twin-context.js';

const DEFAULT_PORT = 3000;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${process.env.PORT || DEFAULT_PORT}`;

/**
 * GAP FLAGGED (found by audit, not fixed here — needs a founder/Chair call, not a
 * quick autonomous patch): this classifier is bare substring matching, not real
 * intent classification. "build" is a common English word ("I want to build wealth",
 * "let's build on that idea") and would false-positive into the direct_build lane,
 * which can trigger a real POST to /api/v1/lifeos/builder/build. Per SO-003, a
 * decision-classification call that can lead to real execution must not be a
 * cheap/canned match — this is currently zero-AI, which is worse than cheap-tier.
 * DO NOT wire routeByIntent into the live chat dispatch path (chair-lumin-unified.js)
 * until this is replaced with real classification or the direct_build trigger is
 * gated behind an explicit, hard-to-false-positive confirmation phrase.
 */
export async function classifyFounderIntent(message, context) {
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

/**
 * GAP FIXED (found by audit): this used to return fake acknowledgment strings for
 * commitment/note/checkin/digital_twin_context without calling the real executors
 * in lifeos-chat-action-service.js or lifeos-digital-twin-context.js at all — the
 * founder would see "Acknowledged your commitment" with nothing actually captured.
 * Now dispatches to the real, already-shipped, already-tested executors. Requires
 * context.deps ({ pool, logger }) for lanes that touch the database; degrades to a
 * clear error string (not a silent fake success) if deps are missing.
 */
export async function routeByIntent(message, context = {}) {
  const intent = await classifyFounderIntent(message, context);
  const deps = context.deps || {};
  const userId = context.userId || null;

  switch (intent.lane) {
    case "workflow_content":
      return buildSMOSWorkflowReply(intent, context);
    case "direct_build":
      // For direct_build, we need the command key. This is a simplification;
      // in a real app, the key might be part of the context or a user setting.
      // For now, we'll assume it's passed in the context for this example.
      return buildDirectBuildReply(intent, context, { commandKey: context.commandKey });
    case "commitment": {
      if (!deps.pool) {
        return { type: "commitment_failed", content: "Cannot capture commitment: no database connection available." };
      }
      const content = await executeCommitment(deps, { text: intent.payload.text, userId, timezone: context.timezone });
      return { type: "commitment_acknowledged", content };
    }
    case "note": {
      const content = await executeNote(deps, { text: intent.payload.text, userId, source: context.source || 'chat', tags: context.tags || [] });
      return { type: "note_recorded", content };
    }
    case "checkin": {
      if (!deps.pool) {
        return { type: "checkin_failed", content: "Cannot record check-in: no database connection available." };
      }
      const content = await executeCheckin(deps, { userId, text: intent.payload.text, minutesAgo: context.minutesAgo });
      return { type: "checkin_prompt", content };
    }
    case "digital_twin_context": {
      if (!deps.pool || !userId) {
        return { type: "digital_twin_query_failed", content: "Cannot retrieve digital twin context: no database connection or user available." };
      }
      try {
        const twin = await getTwinContextForUser(deps.pool, userId);
        return { type: "digital_twin_query_acknowledged", content: twin };
      } catch (error) {
        return { type: "digital_twin_query_failed", content: `Failed to retrieve digital twin context: ${error.message}` };
      }
    }
    case "ambient": {
      const content = await executeAmbient();
      return { type: "ambient_response", content };
    }
    case "counsel":
    default:
      return { type: "counsel", content: "I'm here to help you think through this. What are you trying to achieve?" };
  }
}
