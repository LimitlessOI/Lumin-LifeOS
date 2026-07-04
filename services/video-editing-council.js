/**
 * SYNOPSIS: Exports createVideoEditingCouncil — services/video-editing-council.js.
 */
export function createVideoEditingCouncil(callCouncilMember) {
  if (typeof callCouncilMember !== 'function') {
    throw new TypeError('callCouncilMember_required');
  }

  const COUNCIL_MEMBER_ROLE = 'UNKNOWN';
  const DEFAULT_TASK_TYPE = 'general';

  async function decidePostProduction({ prompt, context, metadata } = {}) {
    const decisionPrompt = String(prompt || '').trim();
    if (!decisionPrompt) {
      const err = new Error('prompt_required');
      err.status = 400;
      throw err;
    }

    const payload = {
      prompt: decisionPrompt,
      context: context || null,
      metadata: metadata || null,
    };

    return callCouncilMember(COUNIL_MEMBER_ROLE, payload, { taskType: DEFAULT_TASK_TYPE });
  }

  return {
    decidePostProduction,
  };
}