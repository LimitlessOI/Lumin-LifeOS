/**
 * SYNOPSIS: Lightweight shared-ritual / date-night planner from couple signal.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import { safeInt } from './lifeos-request-helpers.js';

const RITUAL_IDEAS = [
  { id: 'walk-talk', title: 'Sunset walk + one honest question', minutes: 40, energy: 'low' },
  { id: 'cook-together', title: 'Cook one simple meal with phones away', minutes: 75, energy: 'medium' },
  { id: 'deep-talk', title: 'Deep-talk deck — 3 cards, no fixing', minutes: 45, energy: 'medium' },
  { id: 'memory-lane', title: 'Replay one victory from the vault', minutes: 30, energy: 'low' },
  { id: 'adventure-micro', title: 'Micro-adventure within 20 minutes of home', minutes: 90, energy: 'high' },
  { id: 'silence-tea', title: 'Tea + 10 minutes of shared quiet', minutes: 25, energy: 'low' },
];

export function createDateNightPlanner({ pool } = {}) {
  return {
    listIdeas() {
      return RITUAL_IDEAS.slice();
    },

    async planWeek(userId, { energy = 'medium', partnerUserId = null } = {}) {
      const uid = safeInt(userId);
      let preferred = RITUAL_IDEAS.filter((r) => r.energy === energy || energy === 'any');
      if (!preferred.length) preferred = RITUAL_IDEAS.slice();

      let fromHistory = null;
      if (pool) {
        try {
          const r = await pool.query(
            `SELECT summary FROM conflict_debriefs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [uid],
          );
          if (r.rows[0]?.summary) {
            fromHistory = `After recent tension (“${String(r.rows[0].summary).slice(0, 60)}…”), prefer low-pressure connection first.`;
            preferred = RITUAL_IDEAS.filter((r) => r.energy === 'low').concat(preferred);
          }
        } catch {
          /* optional */
        }
      }

      const unique = [];
      const seen = new Set();
      for (const idea of preferred) {
        if (seen.has(idea.id)) continue;
        seen.add(idea.id);
        unique.push(idea);
        if (unique.length >= 3) break;
      }

      return {
        ok: true,
        week_of: new Date().toISOString().slice(0, 10),
        suggestions: unique,
        guidance: fromHistory || 'Pick one ritual and protect the time — small and kept beats big and cancelled.',
        partner_user_id: partnerUserId ? safeInt(partnerUserId) : null,
      };
    },
  };
}