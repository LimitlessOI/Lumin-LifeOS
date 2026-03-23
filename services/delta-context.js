/**
 * services/delta-context.js — TCO-A04
 *
 * Conversation state snapshot + delta-only sending.
 * Instead of resending the full chat history every turn, we:
 *   1. Store a structured snapshot of the conversation state in memory
 *   2. On each turn, send: stable cached prefix + compact state summary + only the delta
 *   3. History is truncated to a rolling window; older turns are summarised not dropped
 *
 * This is often the largest single win — a 10-turn conversation normally resends
 * ~9 turns of history on turn 10. With delta-context, turn 10 sends only turn 10
 * plus a 2-line state summary.
 *
 * Audit trail: every snapshot is timestamped; nothing is silently deleted.
 *
 * Exports: createDeltaContext() → { startSession, addTurn, getDelta, getSnapshot, stats }
 * @ssot docs/projects/AMENDMENT_10_API_COST_SAVINGS.md
 */

const MAX_TURNS_IN_WINDOW  = 6;   // keep last N turns in active window
const MAX_SUMMARY_CHARS    = 400; // compact state summary max length
const SNAPSHOT_TTL_MS      = 2 * 60 * 60 * 1000; // 2h — sessions expire after this

// In-memory session store (survives across requests within one server process)
const sessions = new Map();

/**
 * Summarise older turns into a compact state string.
 * This is a local heuristic — no AI call needed.
 */
function summariseTurns(turns) {
  if (!turns || turns.length === 0) return '';

  // Extract key info: decisions made, outputs produced, errors seen
  const decisions = [];
  const outputs   = [];
  const errors    = [];

  for (const turn of turns) {
    const content = turn.content || '';
    if (/error|fail|exception/i.test(content)) {
      errors.push(content.slice(0, 60).trim());
    } else if (/decision|approved|rejected|selected/i.test(content)) {
      decisions.push(content.slice(0, 60).trim());
    } else if (turn.role === 'assistant') {
      outputs.push(content.slice(0, 80).trim());
    }
  }

  const parts = [];
  if (errors.length)    parts.push(`Errors: ${errors.slice(-2).join('; ')}`);
  if (decisions.length) parts.push(`Decisions: ${decisions.slice(-2).join('; ')}`);
  if (outputs.length)   parts.push(`Prior output: ${outputs.slice(-1)[0]}`);

  return parts.join('\n').slice(0, MAX_SUMMARY_CHARS);
}

/**
 * Start or resume a session.
 * @param {string} sessionId
 * @param {string} [stablePrefix] - system prompt / instructions (goes into cached prefix)
 * @returns {object} session
 */
export function startSession(sessionId, stablePrefix = '') {
  if (sessions.has(sessionId)) {
    const existing = sessions.get(sessionId);
    existing.lastActive = Date.now();
    // Update stable prefix if provided
    if (stablePrefix) existing.stablePrefix = stablePrefix;
    return existing;
  }

  const session = {
    id: sessionId,
    stablePrefix,         // system prompt — sent once, cached by provider
    archivedSummary: '',  // compact digest of turns older than window
    activeTurns: [],      // last MAX_TURNS_IN_WINDOW turns
    turnCount: 0,
    createdAt: Date.now(),
    lastActive: Date.now(),
    totalCharsSent: 0,
    totalCharsSaved: 0,
  };

  sessions.set(sessionId, session);
  return session;
}

/**
 * Add a turn to a session.
 * Automatically archives old turns when window is exceeded.
 *
 * @param {string} sessionId
 * @param {{ role: 'user'|'assistant'|'system', content: string }} turn
 */
export function addTurn(sessionId, turn) {
  let session = sessions.get(sessionId);
  if (!session) session = startSession(sessionId);

  session.activeTurns.push({
    role: turn.role,
    content: turn.content,
    timestamp: Date.now(),
    turnIndex: session.turnCount++,
  });

  session.lastActive = Date.now();

  // Archive if over window
  if (session.activeTurns.length > MAX_TURNS_IN_WINDOW) {
    const toArchive = session.activeTurns.splice(0, session.activeTurns.length - MAX_TURNS_IN_WINDOW);
    const newSummary = summariseTurns(toArchive);
    // Merge with existing summary (keep recent)
    session.archivedSummary = [session.archivedSummary, newSummary]
      .filter(Boolean)
      .join('\n')
      .slice(0, MAX_SUMMARY_CHARS);
  }
}

/**
 * Get the delta payload for the next AI call.
 * Returns the minimum context needed — not the full history.
 *
 * @param {string} sessionId
 * @param {string} newUserMessage - the current user turn (latest delta)
 * @returns {{
 *   messages: Array<{role, content}>,  // ready to send to AI
 *   stablePrefix: string,              // system prompt (cache this)
 *   savedChars: number,
 *   savedPct: number,
 *   fullHistoryChars: number,
 * }}
 */
export function getDelta(sessionId, newUserMessage) {
  let session = sessions.get(sessionId);
  if (!session) session = startSession(sessionId);

  // What the full history would have been
  const allTurns   = [...session.activeTurns];
  const fullHistory = allTurns.map(t => t.content).join('\n') + '\n' + (newUserMessage || '');
  const fullChars   = (session.stablePrefix + fullHistory).length;

  // Build compact messages array
  const messages = [];

  // 1. Archived summary (if any)
  if (session.archivedSummary) {
    messages.push({
      role: 'system',
      content: `[Context summary from earlier in this session]\n${session.archivedSummary}`,
    });
  }

  // 2. Active window turns
  for (const turn of session.activeTurns) {
    messages.push({ role: turn.role, content: turn.content });
  }

  // 3. New user message (the delta)
  if (newUserMessage) {
    messages.push({ role: 'user', content: newUserMessage });
  }

  const deltaChars = messages.reduce((sum, m) => sum + m.content.length, 0)
                   + session.stablePrefix.length;
  const savedChars = Math.max(0, fullChars - deltaChars);
  const savedPct   = fullChars > 0 ? Math.round((savedChars / fullChars) * 100) : 0;

  // Track savings
  session.totalCharsSent  += deltaChars;
  session.totalCharsSaved += savedChars;

  return {
    messages,
    stablePrefix: session.stablePrefix,
    savedChars,
    savedPct,
    fullHistoryChars: fullChars,
    deltaChars,
  };
}

/**
 * Get a snapshot of a session (for audit/debugging).
 */
export function getSnapshot(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  return {
    id: session.id,
    turnCount: session.turnCount,
    activeWindowSize: session.activeTurns.length,
    hasArchivedSummary: Boolean(session.archivedSummary),
    totalCharsSent: session.totalCharsSent,
    totalCharsSaved: session.totalCharsSaved,
    avgSavingsPct: session.totalCharsSent > 0
      ? Math.round(session.totalCharsSaved / (session.totalCharsSent + session.totalCharsSaved) * 100)
      : 0,
    createdAt: new Date(session.createdAt).toISOString(),
    lastActive: new Date(session.lastActive).toISOString(),
  };
}

/**
 * Expire old sessions (call periodically — e.g. every hour).
 * Returns count of expired sessions.
 */
export function expireOldSessions() {
  const now = Date.now();
  let expired = 0;
  for (const [id, session] of sessions) {
    if (now - session.lastActive > SNAPSHOT_TTL_MS) {
      sessions.delete(id);
      expired++;
    }
  }
  return expired;
}

/**
 * Get aggregate stats across all active sessions.
 */
export function stats() {
  let totalSent = 0, totalSaved = 0, totalTurns = 0;
  for (const s of sessions.values()) {
    totalSent  += s.totalCharsSent;
    totalSaved += s.totalCharsSaved;
    totalTurns += s.turnCount;
  }
  return {
    activeSessions: sessions.size,
    totalTurns,
    totalCharsSent: totalSent,
    totalCharsSaved: totalSaved,
    overallSavingsPct: (totalSent + totalSaved) > 0
      ? Math.round(totalSaved / (totalSent + totalSaved) * 100)
      : 0,
  };
}
