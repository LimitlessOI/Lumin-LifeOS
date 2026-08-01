/**
 * SYNOPSIS: LifeOS chat action executor — turns intent-router lanes into real execution.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { captureCommitment } from './lifeos-commitment-service.js';
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
  const { logger } = deps;
  const { userId, text, minutesAgo } = payload || {};
  try {
    await addCheckinEntry(deps, userId, text, { minutesAgo });
    const { entries } = await getTodaySummary(deps, userId);
    const summaryList = entries.map((entry) => `- ${entry}`).join('\n');
    return `Check-in recorded. Today's entries:\n${summaryList}`;
  } catch (error) {
    logger.error({ error, payload }, 'Error in executeCheckin');
    return 'Failed to record check-in.';
  }
}

export async function executeBuild(deps, payload) {
  const { logger } = deps;
  const { task, routeToBuilder, operatorKey } = payload || {};
  try {
    let receipt;
    if (typeof routeToBuilder === 'function') {
      receipt = await routeToBuilder(task, operatorKey, { confirmIntent: true });
    } else {
      return 'Build failed: routeToBuilder function not provided.';
    }

    if (receipt.ok) {
      return `Build successful! Committed with SHA: ${receipt.sha}`;
    }
    if (receipt.committed) {
      return `Build committed but with warnings/issues. SHA: ${receipt.sha}`;
    }
    if (receipt.error) {
      return `Build failed: ${receipt.error}`;
    }
    return `Build status unclear: ${JSON.stringify(receipt)}`;
  } catch (error) {
    logger.error({ error, payload }, 'Error in executeBuild');
    return 'Failed to execute build task.';
  }
}

export async function executeAmbient() {
  return 'Tap the mic icon to speak your next command.';
}
