/**
 * SYNOPSIS: Executes chat actions based on intent-router lanes.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { captureCommitment, getCommitments } from './lifeos-commitment-service.js';
import { captureNote } from './lifeos-note-capture-service.js';
import { addCheckinEntry, getTodaySummary } from './lifeos-daily-checkin-service.js';

export async function executeCommitment(deps, payload) {
  const { pool, logger } = deps;
  const { text, userId, timezone } = payload || {};
  try {
    const commitment = await captureCommitment(pool, text, { userId, timezone });
    return `Commitment "${commitment.title}" for ${commitment.datetime} captured successfully.`;
  } catch (error) {
    logger.error({ error, payload }, 'Error in executeCommitment');
    return 'Failed to capture commitment.';
  }
}

export async function executeNote(deps, payload) {
  const { logger } = deps;
  const { text, userId, source, tags } = payload || {};
  try {
    const note = await captureNote(text, { userId, source, tags });
    return `Note "${note.text || note.summary}" captured successfully.`;
  } catch (error) {
    logger.error({ error, payload }, 'Error in executeNote');
    return 'Failed to capture note.';
  }
}

export async function executeCheckin(deps, payload) {
  const { pool, logger } = deps;
  const { userId, text, minutesAgo } = payload || {};
  try {
    await addCheckinEntry(pool, userId, text, { minutesAgo });
    const summary = await getTodaySummary(pool, userId);
    const summaryList = summary.map(entry => `- ${entry.text}`).join('\n');
    return `Check-in recorded. Today's entries:\n${summaryList}`;
  } catch (error) {
    logger.error({ error, payload }, 'Error in executeCheckin');
    return 'Failed to record check-in.';
  }
}

export async function executeBuild(deps, payload) {
  const { callCouncilMember, logger } = deps;
  const { task, routeToBuilder, operatorKey } = payload || {}; // routeToBuilder is expected to be a function passed in payload
  try {
    // Assuming routeToBuilder is a function that takes task, operatorKey, and options
    // and that callCouncilMember can be used if routeToBuilder is not directly available
    let receipt;
    if (typeof routeToBuilder === 'function') {
      receipt = await routeToBuilder(task, operatorKey, { confirmIntent: true });
    } else {
      // Fallback if routeToBuilder is not a direct function in payload,
      // assuming a council member can orchestrate the build.
      // This is an assumption based on common patterns where a 'routeToBuilder'
      // might be an internal system call or a delegated AI task.
      logger.warn({ task, operatorKey }, 'routeToBuilder not a function, delegating to AI Council for build execution.');
      const prompt = `Execute a build task. Task details: ${JSON.stringify(task)}. Operator key provided. Confirm intent.`;
      receipt = JSON.parse(await callCouncilMember('build_orchestrator', prompt, { operatorKey }));
    }

    if (receipt.ok) {
      return `Build successful! Committed with SHA: ${receipt.sha}`;
    } else if (receipt.committed) {
      return `Build committed but with warnings/issues. SHA: ${receipt.sha}`;
    } else if (receipt.error) {
      return `Build failed: ${receipt.error}`;
    } else {
      return `Build status unclear: ${JSON.stringify(receipt)}`;
    }
  } catch (error) {
    logger.error({ error, payload }, 'Error in executeBuild');
    return 'Failed to execute build task.';
  }
}

export async function executeAmbient(deps, payload) {
  const { logger } = deps;
  const { text } = payload || {};
  try {
    return 'Tap the mic icon to speak your next command.';
  } catch (error) {
    logger.error({ error, payload }, 'Error in executeAmbient');
    return 'An error occurred while trying to provide ambient feedback.';
  }
}