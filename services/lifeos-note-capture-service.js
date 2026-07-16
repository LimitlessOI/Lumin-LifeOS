/**
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * SYNOPSIS: Exports captureNote — services/lifeos-note-capture-service.js.
 */
let notes = [];

export function captureNote(text, { userId, source, tags = [] }) {
  const noteId = notes.length + 1;
  const suggestedTags = suggestTags(text);
  const summary = summarize(text);
  const note = { noteId, userId, text, source, tags: [...tags, ...suggestedTags], summary };
  notes.push(note);
  return note;
}

function suggestTags(text) {
  // Simple keyword-based tag suggestion logic
  const keywords = ['important', 'todo', 'urgent'];
  return keywords.filter(keyword => text.includes(keyword));
}

function summarize(text) {
  // Simple one-line summary logic
  return text.split('.').slice(0, 1).join('.').trim();
}

export function getNotes(userId, opts = {}) {
  return notes.filter(note => note.userId === userId);
}

export function searchNotes(userId, query) {
  return notes.filter(note => note.userId === userId && note.text.includes(query));
}

export function tagNotes(userId, noteIds, tags) {
  notes = notes.map(note => {
    if (note.userId === userId && noteIds.includes(note.noteId)) {
      note.tags = [...new Set([...note.tags, ...tags])];
    }
    return note;
  });
}
