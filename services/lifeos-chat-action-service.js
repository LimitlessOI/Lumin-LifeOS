/**
 * SYNOPSIS: Exports executeCommitment — services/lifeos-chat-action-service.js.
 */
import { captureCommitment, getCommitments } from './lifeos-commitment-service.js';
import { captureNote } from './lifeos-note-capture-service.js';
import { addCheckinEntry, getTodaySummary } from './lifeos-daily-checkin-service.js';

export async function executeCommitment(db, text, { userId, timezone }) {
  try {
    const commitment = await captureCommitment(db, text, { userId, timezone });
    return `Commitment captured: ${commitment.title} at ${commitment.datetime}`;
  } catch (error) {
    return `Failed to capture commitment: ${error.message}`;
  }
}

export function executeNote(text, { userId, source, tags }) {
  try {
    const note = captureNote(text, { userId, source, tags });
    return `Note captured: ${note.text || note.summary}`;
  } catch (error) {
    return `Failed to capture note: ${error.message}`;
  }
}

export async function executeCheckin(db, userId, text, { minutesAgo }) {
  try {
    await addCheckinEntry(db, userId, text, { minutesAgo });
    const summary = await getTodaySummary(db, userId);
    return `Today's entries:\n- ${summary.join('\n- ')}`;
  } catch (error) {
    return `Failed to add check-in entry: ${error.message}`;
  }
}

export async function executeBuild(task, { routeToBuilder, operatorKey }) {
  try {
    const receipt = await routeToBuilder(task, operatorKey, { confirmIntent: true });
    if (receipt.ok) {
      return `Build successful: Committed ${receipt.committed}, SHA: ${receipt.sha}`;
    } else {
      return `Build failed: ${receipt.error || JSON.stringify(receipt)}`;
    }
  } catch (error) {
    return `Failed to execute build: ${error.message}`;
  }
}

export function executeAmbient(text) {
  return "Hint: Tap the mic icon to start speaking.";
}