/**
 * SYNOPSIS: In a real application, this would be a database connection
 */
import crypto from 'crypto';

// In a real application, this would be a database connection
// For this example, we'll use a simple in-memory store
const notesStore = [];

function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

export async function captureNote(text, { userId, source = 'manual', tags = [] }) {
  const noteId = generateId();
  const timestamp = new Date().toISOString();

  // Simple extraction for summary and suggested tags
  // In a production system, this would involve more sophisticated NLP
  const summary = text.split('\n')[0].substring(0, 100) + (text.split('\n')[0].length > 100 ? '...' : '');
  
  // Infer tags from keywords if not provided
  let inferredTags = [];
  if (tags.length === 0) {
    const commonKeywords = ['meeting', 'idea', 'task', 'reminder', 'project'];
    inferredTags = commonKeywords.filter(keyword => text.toLowerCase().includes(keyword));
  } else if (typeof tags === 'string') {
    inferredTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
  } else {
    inferredTags = tags;
  }

  const newNote = {
    noteId,
    userId,
    text,
    summary,
    source,
    tags: [...new Set(inferredTags)], // Ensure unique tags
    timestamp,
  };

  notesStore.push(newNote);
  return newNote;
}

export async function getNotes(userId, { limit = 10, offset = 0, tag = null } = {}) {
  let userNotes = notesStore.filter(note => note.userId === userId);

  if (tag) {
    userNotes = userNotes.filter(note => note.tags.includes(tag));
  }

  const paginatedNotes = userNotes.slice(offset, offset + limit);
  return paginatedNotes;
}

export async function searchNotes(userId, query) {
  const lowerQuery = query.toLowerCase();
  const results = notesStore.filter(note =>
    note.userId === userId &&
    (note.text.toLowerCase().includes(lowerQuery) ||
     note.summary.toLowerCase().includes(lowerQuery) ||
     note.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
  );
  return results;
}

export async function tagNotes(userId, noteIds, tags) {
  const updatedNotes = [];
  const tagsToAdd = typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(t => t !== '') : tags;

  for (const noteId of noteIds) {
    const noteIndex = notesStore.findIndex(note => note.noteId === noteId && note.userId === userId);
    if (noteIndex !== -1) {
      const note = notesStore[noteIndex];
      note.tags = [...new Set([...note.tags, ...tagsToAdd])]; // Add new tags, ensure uniqueness
      notesStore[noteIndex] = note;
      updatedNotes.push(note);
    }
  }
  return updatedNotes;
}