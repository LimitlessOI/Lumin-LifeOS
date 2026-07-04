/**
 * SYNOPSIS: Exports createLessonPlanGenerator — services/lesson-plan-generator.js.
 */
export function createLessonPlanGenerator({ callCouncilMember }) {
  function normalizeIntent(intent) {
    if (typeof intent === 'string') {
      return {
        teacherIntent: intent.trim(),
      };
    }

    if (intent && typeof intent === 'object') {
      const teacherIntent =
        String(
          intent.teacherIntent ??
            intent.intent ??
            intent.prompt ??
            intent.rawText ??
            '',
        ).trim();

      return {
        teacherIntent,
        gradeLevels: Array.isArray(intent.gradeLevels) ? intent.gradeLevels : intent.grade_levels || null,
        subjects: Array.isArray(intent.subjects) ? intent.subjects : null,
        durationMinutes: intent.durationMinutes ?? intent.duration_minutes ?? null,
        standards: Array.isArray(intent.standards) ? intent.standards : null,
        objective: intent.objective ?? null,
        materials: Array.isArray(intent.materials) ? intent.materials : null,
      };
    }

    return { teacherIntent: '' };
  }

  async function generateLessonPlan(input) {
    const payload = normalizeIntent(input);
    const teacherIntent = String(payload.teacherIntent || '').trim();

    if (!teacherIntent) {
      const err = new Error('teacher_intent_required');
      err.status = 400;
      throw err;
    }

    const prompt = [
      'Generate a standards-aligned lesson plan from the teacher\'s intent.',
      'Return a practical lesson plan with objectives, materials, warm-up, instruction, guided practice, independent practice, assessment, differentiation, and closure.',
      'Use the provided intent as the primary source of truth.',
      '',
      `Teacher intent: ${teacherIntent}`,
      payload.gradeLevels ? `Grade levels: ${JSON.stringify(payload.gradeLevels)}` : null,
      payload.subjects ? `Subjects: ${JSON.stringify(payload.subjects)}` : null,
      payload.durationMinutes ? `Duration minutes: ${payload.durationMinutes}` : null,
      payload.standards ? `Standards: ${JSON.stringify(payload.standards)}` : null,
      payload.objective ? `Objective: ${payload.objective}` : null,
      payload.materials ? `Materials: ${JSON.stringify(payload.materials)}` : null,
    ].filter(Boolean).join('\n');

    const result = await callCouncilMember('openai', prompt, { taskType: 'general' });
    return result;
  }

  return {
    generateLessonPlan,
  };
}