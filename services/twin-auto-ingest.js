/**
 * services/twin-auto-ingest.js
 *
 * The soul of the digital twin system.
 *
 * Every communication Adam has with any program we create automatically
 * feeds into his digital twin. No manual logging. No forgetting.
 * The twin grows forever and never loses data.
 *
 * Pipeline:
 *   1. Read new conversation_messages where role='user' (Adam's actual words)
 *   2. Log each message to adam_decisions via adam-logger
 *   3. After every REBUILD_THRESHOLD new decisions, rebuild adam_profile
 *      using Claude Opus — the highest-quality synthesis of who Adam is
 *   4. The rebuilt profile is immediately available to:
 *      - Builder council review "Adam filter" lens
 *      - POST /api/v1/twin/simulate — predict what Adam would decide
 *      - Any future system that needs to act in Adam's interest
 *
 * The twin is permanent. Messages are never deleted from adam_decisions.
 * Profile rebuilds replace the current profile but all history is preserved.
 *
 * @ssot docs/projects/AMENDMENT_09_LIFE_COACHING.md (Digital Twin)
 */

import { createAdamLogger, EVENTS } from './adam-logger.js';

const REBUILD_THRESHOLD = 25; // rebuild profile after every 25 new decisions
const INGEST_BATCH = 100;     // process up to 100 messages per run

export function createTwinAutoIngest({ pool, callAI }) {
  const adamLogger = createAdamLogger(pool);

  // ── Watermark tracking ────────────────────────────────────────────────────
  // We track the highest conversation_messages.id we've ingested so we only
  // process new messages on each run. Stored in a single-row control table.

  async function getWatermark() {
    try {
      const { rows } = await pool.query(`
        SELECT value FROM twin_ingest_control WHERE key = 'last_message_id'
      `);
      return rows[0] ? parseInt(rows[0].value, 10) : 0;
    } catch {
      return 0;
    }
  }

  async function setWatermark(id) {
    try {
      await pool.query(`
        INSERT INTO twin_ingest_control (key, value, updated_at)
        VALUES ('last_message_id', $1::text, NOW())
        ON CONFLICT (key) DO UPDATE SET value = $1::text, updated_at = NOW()
      `, [id]);
    } catch { /* non-fatal */ }
  }

  // ── Count total decisions logged ──────────────────────────────────────────

  async function countDecisions() {
    const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) FROM adam_decisions');
    return parseInt(count, 10);
  }

  async function countSinceLastRebuild() {
    try {
      const { rows: [profile] } = await pool.query(
        'SELECT decision_count FROM adam_profile WHERE is_current = TRUE LIMIT 1'
      );
      const profileCount = profile?.decision_count || 0;
      const totalCount = await countDecisions();
      return totalCount - profileCount;
    } catch { return 0; }
  }

  // ── Extract insights from a batch of messages ─────────────────────────────
  // For each user message, we log it. For messages that contain decisions,
  // preferences, or strong statements, we also extract structured data.

  function classifyMessage(text = '') {
    const lower = text.toLowerCase();
    if (lower.includes('don\'t') || lower.includes('never') || lower.includes('stop') ||
        lower.includes('no,') || lower.includes('not that')) return EVENTS.FEEDBACK_GIVEN;
    if (lower.includes('approve') || lower.includes('do it') || lower.includes('go ahead') ||
        lower.includes('yes') || lower.includes('ship it')) return EVENTS.IDEA_APPROVED;
    if (lower.includes('reject') || lower.includes('don\'t build') || lower.includes('scrap')) return EVENTS.IDEA_REJECTED;
    if (lower.includes('i prefer') || lower.includes('i like') || lower.includes('i want') ||
        lower.includes('i always') || lower.includes('i never')) return EVENTS.PREFERENCE;
    return EVENTS.CONVERSATION;
  }

  // ── Main ingest run ───────────────────────────────────────────────────────

  async function run() {
    if (!pool) return { ingested: 0, rebuilt: false };

    const watermark = await getWatermark();
    let newHighWatermark = watermark;
    let ingested = 0;

    // Pull new user messages since last run
    const { rows: messages } = await pool.query(`
      SELECT cm.id, cm.content, cm.timestamp, cm.session_id,
             c.source, c.project, c.summary AS conv_summary
      FROM conversation_messages cm
      LEFT JOIN conversations c ON cm.conversation_id = c.id
      WHERE cm.role = 'user'
        AND cm.id > $1
        AND cm.content IS NOT NULL
        AND length(cm.content) > 10
      ORDER BY cm.id ASC
      LIMIT $2
    `, [watermark, INGEST_BATCH]);

    if (messages.length === 0) {
      return { ingested: 0, rebuilt: false };
    }

    for (const msg of messages) {
      const text = msg.content?.trim();
      if (!text) continue;

      const eventType = classifyMessage(text);

      await adamLogger.log(eventType, {
        subject: msg.project || msg.source || 'conversation',
        inputText: text.substring(0, 2000), // cap to avoid huge rows
        context: {
          session_id: msg.session_id,
          source: msg.source,
          timestamp: msg.timestamp,
          conv_summary: msg.conv_summary,
        },
        tags: adamLogger.extractTags ? adamLogger.extractTags(text) : [],
      });

      // ── LifeOS commitment extraction ───────────────────────────────────────
      // Silently extract any commitments from this message and log them
      // against the primary LifeOS user (adam). Non-fatal: never blocks ingest.
      if (callAI && text.length > 20) {
        try {
          const { createCommitmentTracker } = await import('./commitment-tracker.js');
          const tracker = createCommitmentTracker(pool, callAI);
          // Resolve adam's user_id
          const { rows: uRows } = await pool.query(
            `SELECT id FROM lifeos_users WHERE user_handle='adam' LIMIT 1`
          ).catch(() => ({ rows: [] }));
          if (uRows[0]) {
            await tracker.ingestFromMessage({
              userId: uRows[0].id,
              messageText: text,
              sourceRef: String(msg.id),
            });
          }
        } catch { /* non-fatal — never block twin ingest */ }
      }

      newHighWatermark = Math.max(newHighWatermark, msg.id);
      ingested++;
    }

    if (newHighWatermark > watermark) {
      await setWatermark(newHighWatermark);
    }

    // Rebuild profile if we've hit the threshold
    let rebuilt = false;
    if (callAI && ingested > 0) {
      const newSinceRebuild = await countSinceLastRebuild();
      if (newSinceRebuild >= REBUILD_THRESHOLD) {
        console.log(`[TWIN] ${newSinceRebuild} new decisions — rebuilding Adam's profile...`);
        const profile = await adamLogger.buildProfile(callAI);
        rebuilt = !!profile;
        if (rebuilt) {
          console.log('[TWIN] Profile rebuilt successfully — Adam filter updated');
        }
      }
    }

    console.log(`[TWIN] Ingested ${ingested} messages${rebuilt ? ' + profile rebuilt' : ''}`);
    return { ingested, rebuilt, newWatermark: newHighWatermark };
  }

  // ── Force rebuild (called manually or after a major conversation) ─────────

  async function forceRebuild() {
    if (!callAI) throw new Error('callAI function required for profile rebuild');
    console.log('[TWIN] Force rebuild requested — analyzing all decisions...');
    const profile = await adamLogger.buildProfile(callAI);
    return profile;
  }

  // ── Get the current live profile for use in council review ───────────────

  async function getLiveProfile() {
    try {
      const { rows: [row] } = await pool.query(
        'SELECT profile, summary, decision_count, created_at FROM adam_profile WHERE is_current = TRUE LIMIT 1'
      );
      if (!row) return null;
      const profile = typeof row.profile === 'string' ? JSON.parse(row.profile) : row.profile;
      return {
        ...profile,
        _meta: {
          decision_count: row.decision_count,
          built_at: row.created_at,
          summary: row.summary,
        },
      };
    } catch { return null; }
  }

  return { run, forceRebuild, getLiveProfile, adamLogger };
}
