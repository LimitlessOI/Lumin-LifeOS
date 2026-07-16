/**
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * SYNOPSIS: Exports captureNote — services/lifeos-note-capture-service.js.
 */
let memoryNotes = [];

function suggestTags(text) {
  const keywords = ['important', 'todo', 'urgent'];
  return keywords.filter((keyword) => text.toLowerCase().includes(keyword));
}

function summarize(text) {
  return text.split('.').slice(0, 1).join('.').trim() || text;
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags;
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function captureNote(db, text, { userId, source, tags = [] }) {
  const suggestedTags = suggestTags(text);
  const allTags = [...new Set([...tags, ...suggestedTags])];
  const summary = summarize(text);

  if (db) {
    const result = await db.query(
      'INSERT INTO lifeos_notes (user_id, content, source, tags, summary, created_at) VALUES ($1, $2, $3, $4::jsonb, $5, NOW()) RETURNING *',
      [userId, text, source || 'chat', JSON.stringify(allTags), summary]
    );
    const row = result.rows[0];
    return {
      noteId: row.id,
      userId: row.user_id,
      text: row.content,
      source: row.source,
      tags: normalizeTags(row.tags),
      summary: row.summary,
    };
  }

  const noteId = memoryNotes.length + 1;
  const note = { noteId, userId, text, source, tags: allTags, summary };
  memoryNotes.push(note);
  return note;
}

export async function getNotes(db, userId, opts = {}) {
  if (db) {
    const result = await db.query(
      'SELECT id, user_id, content, source, tags, summary, created_at FROM lifeos_notes WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map((row) => ({
      noteId: row.id,
      userId: row.user_id,
      text: row.content,
      source: row.source,
      tags: normalizeTags(row.tags),
      summary: row.summary,
      createdAt: row.created_at,
    }));
  }
  return memoryNotes.filter((note) => note.userId === userId);
}

export async function searchNotes(db, userId, query) {
  const notes = await getNotes(db, userId);
  const q = String(query || '').toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(q));
}

export async function tagNotes(db, userId, noteIds, tags) {
  if (db) {
    const existing = await getNotes(db, userId);
    const byId = Object.fromEntries(existing.map((n) => [String(n.noteId), n]));
    for (const noteId of noteIds) {
      const note = byId[String(noteId)];
      if (!note) continue;
      const merged = [...new Set([...note.tags, ...tags])];
      await db.query(
        'UPDATE lifeos_notes SET tags = $1::jsonb WHERE user_id = $2 AND id = $3',
        [JSON.stringify(merged), userId, noteId]
      );
    }
    return getNotes(db, userId);
  }
  memoryNotes = memoryNotes.map((note) => {
    if (note.userId === userId && noteIds.includes(note.noteId)) {
      note.tags = [...new Set([...note.tags, ...tags])];
    }
    return note;
  });
  return memoryNotes.filter((note) => note.userId === userId);
}
