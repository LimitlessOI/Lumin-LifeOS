/**
 * SYNOPSIS: Curated deep-talk question decks from couple signal (debriefs, patterns, values).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import { safeInt } from './lifeos-request-helpers.js';

const FALLBACK_DECK = [
  'What felt unspoken between us this week?',
  'Where did we repair well — and where did we miss?',
  'What do you need from me that you have not asked for yet?',
  'Which value of ours felt most alive lately?',
  'What is one fear you are carrying that I can help hold?',
];

function uniqueQuestions(items) {
  const seen = new Set();
  const out = [];
  for (const q of items) {
    const t = String(q || '').trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
  }
  return out;
}

export function createDeepTalkDeckService({ pool } = {}) {
  return {
    /**
     * Build a weekly deep-talk deck from couple/user signal when tables exist.
     * Falls back to a short curated starter deck (never empty).
     */
    async buildWeeklyDeck(userId, { partnerUserId = null, limit = 7 } = {}) {
      const uid = safeInt(userId);
      const questions = [];
      const sources = [];

      if (pool) {
        try {
          const patterns = await pool.query(
            `SELECT pattern_label, unresolved, last_seen_at
               FROM emotional_patterns
              WHERE user_id = $1
              ORDER BY unresolved DESC NULLS LAST, last_seen_at DESC NULLS LAST
              LIMIT 5`,
            [uid],
          );
          for (const row of patterns.rows) {
            if (row.unresolved) {
              questions.push(
                `We still have an open pattern around "${row.pattern_label}". What would closing that look like together?`,
              );
              sources.push('emotional_patterns');
            } else if (row.pattern_label) {
              questions.push(
                `How is "${row.pattern_label}" showing up between us lately?`,
              );
              sources.push('emotional_patterns');
            }
          }
        } catch {
          /* table optional */
        }

        try {
          const debriefs = await pool.query(
            `SELECT summary, created_at
               FROM conflict_debriefs
              WHERE user_id = $1
              ORDER BY created_at DESC LIMIT 5`,
            [uid],
          );
          for (const row of debriefs.rows) {
            const bit = String(row.summary || '').trim().slice(0, 80);
            if (bit) {
              questions.push(`Looking back on "${bit}…" — what still needs a soft conversation?`);
              sources.push('conflict_debriefs');
            }
          }
        } catch {
          /* optional */
        }

        try {
          const values = await pool.query(
            `SELECT result_label, assessment_type
               FROM assessment_results
              WHERE user_id = $1 AND assessment_type IN ('core_values', 'love_language', 'communication_style')
              ORDER BY taken_at DESC LIMIT 4`,
            [uid],
          );
          for (const row of values.rows) {
            if (row.result_label) {
              questions.push(
                `Your ${row.assessment_type.replace(/_/g, ' ')} signal is "${row.result_label}". How should we honor that this week?`,
              );
              sources.push('assessment_results');
            }
          }
        } catch {
          /* optional */
        }

        if (partnerUserId) {
          try {
            const other = safeInt(partnerUserId);
            const pair = await pool.query(
              `SELECT assessment_type, result_label FROM assessment_results
                WHERE user_id = ANY($1::int[]) AND assessment_type = 'conflict_style'
                ORDER BY taken_at DESC LIMIT 4`,
              [[uid, other]],
            );
            if (pair.rows.length >= 2) {
              questions.push(
                'Our conflict styles differ. What is one rule we want for the next hard conversation?',
              );
              sources.push('pair_conflict_style');
            }
          } catch {
            /* optional */
          }
        }
      }

      const deck = uniqueQuestions([...questions, ...FALLBACK_DECK]).slice(0, Math.max(3, Math.min(12, limit)));
      return {
        ok: true,
        week_of: new Date().toISOString().slice(0, 10),
        questions: deck,
        sources: [...new Set(sources)],
        personalized: sources.length > 0,
      };
    },
  };
}