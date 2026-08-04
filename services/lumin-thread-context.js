/**
 * SYNOPSIS: Server-side founder thread — DB history for unified Lumin conversation.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 *
 * GAP-FILL 2026-08-04 (temporal grounding, part 2): confirmed live that
 * loadFounderThreadHistory discarded each message's real `created_at` down to
 * {role, content} only, and formatThreadForPrompt rendered history as plain
 * "Adam: ... / Lumin: ..." lines with zero timing information -- even after
 * SYSTEM_FACTS.current_time_local was added (chair-native-facts.js), the
 * model still had no way to know *when* a referenced past turn actually
 * happened, only what time it is now. Both are required to correctly say
 * "earlier today" instead of "last night" once enough time has passed. The
 * DB query (lifeos-lumin.js#getMessages) already selects `created_at`; this
 * was pure data loss three steps downstream, not a missing source.
 * Deterministic relative-time computation (not left to the model to compute
 * from a raw ISO string) for the same reason every other safety/correctness
 * gate this session shipped is deterministic: don't depend on an LLM doing
 * arithmetic correctly and consistently when the answer can just be computed.
 */

const RELATIVE_TIME_ZONE = 'America/Los_Angeles';

/**
 * @param {string|Date|null} pastAt
 * @param {Date} [now]
 * @returns {string|null} e.g. "3 hours ago", "yesterday", "4 days ago"
 */
export function formatRelativeTime(pastAt, now = new Date()) {
  if (!pastAt) return null;
  const past = pastAt instanceof Date ? pastAt : new Date(pastAt);
  if (Number.isNaN(past.getTime())) return null;

  const diffMs = now.getTime() - past.getTime();
  if (diffMs < 0) return null; // clock skew / future timestamp — don't guess
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);

  if (diffMin < 2) return 'just now';
  if (diffMin < 60) return `${diffMin} minutes ago`;

  // Compare calendar days in the founder's real timezone, not raw 24h math,
  // so "11pm last night" to "1am today" reads as yesterday, not "2 hours ago".
  const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: RELATIVE_TIME_ZONE });
  const pastDay = dayFmt.format(past);
  const nowDay = dayFmt.format(now);
  const dayDiff = Math.round((new Date(nowDay) - new Date(pastDay)) / 86400000);

  if (dayDiff === 0) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (dayDiff === 1) return 'yesterday';
  if (dayDiff > 1 && dayDiff <= 6) return `${dayDiff} days ago`;
  if (dayDiff > 6 && dayDiff <= 13) return 'last week';
  if (dayDiff > 13 && dayDiff <= 30) return `${Math.floor(dayDiff / 7)} weeks ago`;
  return `${Math.floor(dayDiff / 30)} month${Math.floor(dayDiff / 30) === 1 ? '' : 's'} ago`;
}

export async function loadFounderThreadHistory(luminPersist, userId, { limit = 24 } = {}) {
  if (!luminPersist || !userId) return [];
  try {
    const thread = await luminPersist.getOrCreateDefaultThread(userId);
    const messages = await luminPersist.getMessages(thread.id, { limit: Math.min(limit, 40) });
    return messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role,
        content: String(m.content || '').trim(),
        created_at: m.created_at || null,
      }))
      .filter((m) => m.content.length > 0);
  } catch {
    return [];
  }
}

/** Server thread is source of truth; client history fills gaps until persisted. */
export function mergeConversationHistory(serverHist = [], clientHist = [], { max = 24 } = {}) {
  const merged = [];
  const seen = new Set();
  for (const m of [...serverHist, ...(clientHist || [])]) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = String(m.content || m.text || '').trim();
    if (!content) continue;
    const key = `${role}:${content.slice(0, 200)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ role, content, created_at: m.created_at || m.timestamp || null });
  }
  return merged.slice(-max);
}

export function formatThreadForPrompt(history = [], { maxChars = 6000, now = new Date() } = {}) {
  const lines = [];
  let used = 0;
  for (const m of history.slice(-16)) {
    const rel = formatRelativeTime(m.created_at, now);
    const prefix = rel ? `[${rel}] ` : '';
    const line = `${prefix}${m.role === 'user' ? 'Adam' : 'Lumin'}: ${m.content}`;
    if (used + line.length > maxChars) break;
    lines.push(line);
    used += line.length;
  }
  return lines.join('\n');
}
