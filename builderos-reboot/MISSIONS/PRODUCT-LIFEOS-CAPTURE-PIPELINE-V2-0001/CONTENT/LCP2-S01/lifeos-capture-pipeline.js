/**
 * SYNOPSIS: LifeOS Capture Pipeline v2 — Voice Rail → Action Inbox staging.
 * LifeOS Capture Pipeline v2 — Voice Rail → Action Inbox staging.
 * Non-private Voice Rail messages auto-stage in Action Inbox for review.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * HISTORY_SNAPSHOT — not runtime authority; mission-era snapshot.
 */
import { createActionInbox } from './action-inbox.js';

export function createLifeOSCapturePipeline({ pool, logger }) {
  const inbox = createActionInbox({ pool, logger });

  async function stageFromVoiceSubmit({
    userId,
    text,
    mode,
    sessionId,
    voiceIntent,
    private: isPrivate,
    simulateOnly,
  }) {
    if (isPrivate) {
      return { staged: false, reason: 'private_mode' };
    }
    if (simulateOnly) {
      return { staged: false, reason: 'simulate_only' };
    }

    const raw = String(text || '').trim();
    if (!raw) {
      return { staged: false, reason: 'empty_text' };
    }

    try {
      const item = await inbox.captureItem({
        userId,
        sessionId: sessionId || null,
        source: 'voice_rail',
        rawText: raw,
        metadata: {
          voice_intent: voiceIntent || null,
          pipeline_version: 'v2',
          staged_at: new Date().toISOString(),
        },
        mode: mode || 'conversation',
      });

      if (item.private || item.classification === 'private_no_save') {
        return {
          staged: false,
          reason: 'private_classification',
          classification: item.classification,
        };
      }

      return {
        staged: true,
        inbox_item_id: item.id,
        classification: item.classification,
        status: item.status,
        source: item.source,
      };
    } catch (err) {
      logger?.warn?.({ err: err.message, userId }, 'capture-pipeline stage failed');
      return { staged: false, reason: 'capture_error', error: err.message };
    }
  }

  async function countVoiceRailStaged(userId) {
    const items = await inbox.listItems(userId, { limit: 200 });
    return items.filter((i) => i.source === 'voice_rail').length;
  }

  return {
    stageFromVoiceSubmit,
    countVoiceRailStaged,
    inbox,
  };
}
