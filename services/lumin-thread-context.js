/**
 * SYNOPSIS: Server-side founder thread — DB history for unified Lumin conversation.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

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
    merged.push({ role, content });
  }
  return merged.slice(-max);
}

export function formatThreadForPrompt(history = [], { maxChars = 6000 } = {}) {
  const lines = [];
  let used = 0;
  for (const m of history.slice(-16)) {
    const line = `${m.role === 'user' ? 'Adam' : 'Lumin'}: ${m.content}`;
    if (used + line.length > maxChars) break;
    lines.push(line);
    used += line.length;
  }
  return lines.join('\n');
}
