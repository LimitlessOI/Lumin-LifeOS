/**
 * SYNOPSIS: Exports createProgressReportDrafter — services/progress-report-drafter.js.
 */
export function createProgressReportDrafter({ callCouncilMember }) {
  async function draftProgressReport({
    studentName,
    gradebook,
    classNotes,
    context,
    tone,
  } = {}) {
    const payload = {
      studentName: studentName || null,
      gradebook: gradebook || null,
      classNotes: classNotes || null,
      context: context || null,
      tone: tone || null,
    };

    const prompt = [
      'Draft a concise teacher progress report from the supplied gradebook data and class notes.',
      'Use only the provided information.',
      'Return a polished progress report with strengths, growth areas, and next steps.',
      'If details are limited, write cautiously and avoid inventing facts.',
      '',
      `Student name: ${payload.studentName || 'Unknown'}`,
      `Tone: ${payload.tone || 'professional'}`,
      `Context: ${JSON.stringify(payload.context || {})}`,
      '',
      'Gradebook data:',
      typeof payload.gradebook === 'string' ? payload.gradebook : JSON.stringify(payload.gradebook || {}, null, 2),
      '',
      'Class notes:',
      typeof payload.classNotes === 'string' ? payload.classNotes : JSON.stringify(payload.classNotes || {}, null, 2),
    ].join('\n');

    const result = await callCouncilMember(
      'openai',
      prompt,
      { taskType: 'general' },
    );

    if (typeof result === 'string') {
      return {
        draft: result,
        model_output: result,
      };
    }

    if (result && typeof result === 'object') {
      return {
        draft: result.draft || result.output || result.text || '',
        model_output: result,
      };
    }

    return {
      draft: '',
      model_output: result ?? null,
    };
  }

  return {
    draftProgressReport,
  };
}