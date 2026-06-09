export function recordLesson(entry) {
  return {
    type: 'lesson',
    lesson: entry.lesson,
    evidence: entry.evidence,
    trust_level: entry.trust_level
  };
}
