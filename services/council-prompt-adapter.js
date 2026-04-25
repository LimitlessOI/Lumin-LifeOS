/**
 * Council prompt adapter — bridges legacy `callAI(prompt)` and two-argument
 * `(systemLine, userBody)` call sites to `callCouncilMember(member, prompt, options)`.
 *
 * Used by: Lumin chat, weekly review, scorecard, communication-profile summaries,
 * and any other LifeOS surface that historically passed a single concatenated prompt.
 *
 * Env:
 *   LIFEOS_CHAT_COUNCIL_MEMBER / LUMIN_COUNCIL_MEMBER — council member key (default `anthropic`,
 *   which resolves via COUNCIL_ALIAS_MAP in config/council-members.js).
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

/**
 * @param {Function} callCouncilMember
 * @param {{ member?: string, taskType?: string }} [opts]
 * @returns {null | ((...args: unknown[]) => Promise<string>)}
 */
export function createCouncilPromptAdapter(callCouncilMember, opts = {}) {
  if (typeof callCouncilMember !== 'function') {
    return null;
  }

  const member =
    opts.member ||
    process.env.LIFEOS_CHAT_COUNCIL_MEMBER ||
    process.env.LUMIN_COUNCIL_MEMBER ||
    'anthropic';
  const defaultTaskType = opts.taskType || 'general';

  /**
   * @param {...unknown} args
   * @returns {Promise<string>}
   */
  return async function callAI(...args) {
    let prompt;
    let councilOpts = {};

    if (
      args.length >= 2 &&
      typeof args[0] === 'string' &&
      typeof args[1] === 'string'
    ) {
      prompt = `${args[0]}\n\n---\n\n${args[1]}`;
      if (args.length >= 3 && args[2] && typeof args[2] === 'object') {
        councilOpts = /** @type {Record<string, unknown>} */ (args[2]);
      }
    } else if (typeof args[0] === 'string') {
      prompt = args[0];
      if (args[1] && typeof args[1] === 'object') {
        councilOpts = /** @type {Record<string, unknown>} */ (args[1]);
      }
    } else {
      throw new Error('callAI: expected a string prompt (or system string + user string)');
    }

    const options = { taskType: defaultTaskType, ...councilOpts };
    const r = await callCouncilMember(member, prompt, options);
    return typeof r === 'string' ? r : (r?.content || r?.text || '');
  };
}
