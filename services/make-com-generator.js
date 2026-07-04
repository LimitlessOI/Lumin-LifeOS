/**
 * SYNOPSIS: Exports createMakeComGenerator — services/make-com-generator.js.
 */
export function createMakeComGenerator({ callCouncilMember }) {
  if (typeof callCouncilMember !== 'function') {
    throw new TypeError('callCouncilMember_required');
  }

  function normalizeDescription(description) {
    return String(description || '').trim();
  }

  async function generateScenario({ description, context = {}, metadata = {} } = {}) {
    const inputDescription = normalizeDescription(description);
    if (!inputDescription) {
      const err = new Error('description_required');
      err.status = 400;
      throw err;
    }

    const prompt = [
      'Generate a Make.com scenario from the following description.',
      '',
      'Return a concise, production-oriented scenario plan with:',
      '- scenario_name',
      '- objective',
      '- trigger',
      '- modules[] in execution order',
      '- data_mappings',
      '- error_handling',
      '- assumptions',
      '',
      'Description:',
      inputDescription,
      '',
      context && Object.keys(context).length ? `Context: ${JSON.stringify(context)}` : '',
      metadata && Object.keys(metadata).length ? `Metadata: ${JSON.stringify(metadata)}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await callCouncilMember('openai', prompt, { taskType: 'general' });

    return {
      description: inputDescription,
      scenario: result,
    };
  }

  return {
    generateScenario,
  };
}