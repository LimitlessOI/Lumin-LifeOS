/**
 * services/chatgpt-import.js
 *
 * Imports ChatGPT conversation history export into LifeOS.
 *
 * ChatGPT exports a conversations.json file (Settings → Data Controls → Export).
 * This service parses it and extracts:
 *   1. Commitments — anything Adam said he would do
 *   2. Purpose signals — energy observations, what creates joy, what drains
 *   3. Vision statements — declared goals, identity statements
 *   4. Insights — key ideas about LifeOS and personal development
 *
 * The export format is an array of conversation objects, each with a mapping
 * of messages keyed by node ID with parent/children links.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createChatGPTImport({ pool, callAI, logger }) {

  // ── Parse export file ─────────────────────────────────────────────────────

  function parseExport(rawJson) {
    let conversations;
    try {
      conversations = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
    } catch {
      throw new Error('Invalid JSON in ChatGPT export');
    }
    if (!Array.isArray(conversations)) throw new Error('Expected array of conversations');
    return conversations;
  }

  // Flatten a conversation's message tree into ordered [role, text] pairs
  function flattenMessages(conversation) {
    const mapping = conversation.mapping || {};
    const messages = [];

    function walk(nodeId) {
      const node = mapping[nodeId];
      if (!node) return;
      const msg = node.message;
      if (msg && msg.content && msg.author) {
        const role = msg.author.role; // 'user'|'assistant'|'system'
        const parts = msg.content.parts || [];
        const text  = parts.filter(p => typeof p === 'string').join('').trim();
        if (text && role !== 'system') messages.push({ role, text });
      }
      for (const childId of (node.children || [])) walk(childId);
    }

    // Find root node
    const rootNode = Object.values(mapping).find(n => !n.parent || n.parent === null);
    if (rootNode) walk(rootNode.id);
    return messages;
  }

  // Extract all user messages from an export
  function extractUserMessages(conversations) {
    const all = [];
    for (const conv of conversations) {
      const title = conv.title || 'Untitled';
      const created = conv.create_time ? new Date(conv.create_time * 1000).toISOString() : null;
      const messages = flattenMessages(conv);
      const userMessages = messages.filter(m => m.role === 'user').map(m => m.text);
      if (userMessages.length > 0) {
        all.push({ title, created, userMessages, messageCount: messages.length });
      }
    }
    return all;
  }

  // ── AI extraction over batches of user messages ───────────────────────────

  async function extractInsights(userMessages, batchLabel) {
    if (!callAI || userMessages.length === 0) return { commitments: [], signals: [], insights: [] };

    // Sample — avoid massive context windows
    const sample = userMessages.slice(0, 30).join('\n\n---\n\n').substring(0, 8000);

    const prompt = `You are analyzing messages from Adam Hopkins's ChatGPT conversations to extract information for his LifeOS personal operating system.

Context: These are messages Adam wrote. He is building LifeOS — a personal operating system for himself and his wife Sherry. He has ADD and memory challenges. He is a real estate professional. He is deeply interested in human flourishing, purpose, integrity, and building technology that helps people become who they say they want to be.

Messages:
---
${sample}
---

Extract three categories:

1. COMMITMENTS — things Adam said he would do, promises to himself or others.
Return as array of: { title, committed_to, approximate_date }

2. PURPOSE_SIGNALS — observations about what creates energy, joy, or meaning for Adam. What he said he loves, what drains him, what he's built for.
Return as array of: { type: 'energy_source'|'energy_drain'|'joy_source'|'purpose_hint', observation }

3. INSIGHTS — key ideas or realizations Adam expressed that should be preserved in LifeOS for future context.
Return as array of: { insight, category: 'lifeos_vision'|'personal_development'|'health'|'relationships'|'business' }

Return a JSON object with keys: commitments, purpose_signals, insights.
Return ONLY valid JSON, no explanation.`;

    try {
      const raw = await callAI(prompt);
      const text = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return { commitments: [], signals: [], insights: [] };
      const parsed = JSON.parse(match[0]);
      return {
        commitments: parsed.commitments || [],
        signals:     parsed.purpose_signals || [],
        insights:    parsed.insights || [],
      };
    } catch (err) {
      logger?.warn?.(`[CHATGPT-IMPORT] Extraction failed for "${batchLabel}": ${err.message}`);
      return { commitments: [], signals: [], insights: [] };
    }
  }

  // ── Import into DB ────────────────────────────────────────────────────────

  async function importToLifeOS({ userId, conversations, options = {} }) {
    const { dryRun = false, maxConversations = 200 } = options;
    const convList = parseExport(conversations);
    const batches  = extractUserMessages(convList).slice(0, maxConversations);

    logger?.info?.(`[CHATGPT-IMPORT] Processing ${batches.length} conversations for user ${userId}`);

    const results = {
      conversations_processed: batches.length,
      commitments_extracted:   0,
      commitments_logged:      0,
      purpose_signals:         0,
      insights_logged:         0,
      errors:                  [],
    };

    const { createCommitmentTracker } = await import('./commitment-tracker.js');
    const tracker = createCommitmentTracker(pool, null);

    for (const batch of batches) {
      try {
        const extracted = await extractInsights(batch.userMessages, batch.title);

        // Log commitments
        results.commitments_extracted += extracted.commitments.length;
        if (!dryRun) {
          for (const c of extracted.commitments) {
            try {
              await tracker.logCommitment({
                userId,
                title: c.title,
                committedTo: c.committed_to || 'self',
                dueAt: c.approximate_date ? parseApproxDate(c.approximate_date) : null,
                weight: 1,
                source: 'chatgpt_import',
                sourceRef: batch.title,
              });
              results.commitments_logged++;
            } catch { /* skip individual failures */ }
          }
        }

        // Log purpose signals to joy check-in sources/drains
        if (!dryRun && extracted.signals.length > 0) {
          const sources = extracted.signals.filter(s => ['energy_source','joy_source'].includes(s.type)).map(s => slugify(s.observation));
          const drains  = extracted.signals.filter(s => s.type === 'energy_drain').map(s => slugify(s.observation));
          if (sources.length > 0 || drains.length > 0) {
            await pool.query(`
              INSERT INTO joy_checkins (user_id, checkin_date, joy_sources, joy_drains, source, inferred_from)
              VALUES ($1, $2::date, $3, $4, 'chatgpt_import', $5)
              ON CONFLICT (user_id, checkin_date) DO UPDATE SET
                joy_sources = array_cat(joy_checkins.joy_sources, EXCLUDED.joy_sources),
                joy_drains  = array_cat(joy_checkins.joy_drains,  EXCLUDED.joy_drains)
            `, [userId, batch.created?.split('T')[0] || new Date().toISOString().split('T')[0], sources, drains, batch.title])
              .catch(() => {});
            results.purpose_signals += extracted.signals.length;
          }
        }

        // Log insights as adam_decisions for twin
        if (!dryRun && extracted.insights.length > 0) {
          for (const ins of extracted.insights) {
            await pool.query(`
              INSERT INTO adam_decisions (event_type, subject, input_text, context, tags)
              VALUES ('conversation', $1, $2, $3, $4)
            `, [
              ins.category,
              ins.insight.substring(0, 500),
              JSON.stringify({ source: 'chatgpt_import', conversation: batch.title }),
              [ins.category, 'chatgpt_import'],
            ]).catch(() => {});
            results.insights_logged++;
          }
        }
      } catch (err) {
        results.errors.push({ conversation: batch.title, error: err.message });
      }
    }

    logger?.info?.(`[CHATGPT-IMPORT] Done — ${results.commitments_logged} commitments, ${results.purpose_signals} purpose signals, ${results.insights_logged} insights`);
    return results;
  }

  function slugify(str) {
    return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').substring(0, 50);
  }

  function parseApproxDate(str) {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  return { importToLifeOS, extractUserMessages, extractInsights };
}
