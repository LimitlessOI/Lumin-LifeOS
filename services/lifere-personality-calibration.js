/**
 * SYNOPSIS: LifeRE personality calibration — 10-draft voice learning.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import { createLifeRETwinStore } from './lifere-twin-store.js';

export function createLifeREPersonalityCalibration({ pool = null } = {}) {
  const twinStore = createLifeRETwinStore({ pool });

  async function recordDraftRating({ tenantId = 'default', userId, draftText, rating, feedback = '' }) {
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO lifere_voice_calibration (tenant_id, user_id, draft_text, rating, feedback)
           VALUES ($1,$2,$3,$4,$5)`,
          [tenantId, userId, draftText, rating, feedback],
        );
      } catch (err) {
        /* PG optional — file twin store is source of truth for alpha */
      }
    }

    const personality = twinStore.readTwin({ tenantId, userId, twinKey: 'personality' }) || {
      schema: 'lifere_personality_twin_v1',
      humor: 0.5,
      confidence: 0.5,
      warmth: 0.5,
      directness: 0.5,
      calibration_drafts_rated: 0,
    };
    const communication = twinStore.readTwin({ tenantId, userId, twinKey: 'communication' }) || {
      schema: 'lifere_communication_twin_v1',
      phrases: [],
      tone_vector: { formal: 0.3, casual: 0.7, empathy: 0.8 },
    };

    personality.calibration_drafts_rated = (personality.calibration_drafts_rated || 0) + 1;
    if (rating >= 4) {
      communication.phrases = [...new Set([...(communication.phrases || []), draftText.slice(0, 120)])].slice(-20);
      personality.warmth = Math.min(1, (personality.warmth || 0.5) + 0.02);
    } else if (rating <= 2) {
      personality.directness = Math.max(0, (personality.directness || 0.5) - 0.02);
    }

    await twinStore.writeTwin({ tenantId, userId, twinKey: 'personality', payload: personality });
    await twinStore.writeTwin({ tenantId, userId, twinKey: 'communication', payload: communication });

    return { ok: true, drafts_rated: personality.calibration_drafts_rated };
  }

  return { recordDraftRating };
}
