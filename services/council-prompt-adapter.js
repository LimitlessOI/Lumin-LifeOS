/**
 * SYNOPSIS: Council prompt adapter — bridges legacy `callAI(prompt)` and two-argument
 * `(systemLine, userBody)` call sites to `callCouncilMember(member, prompt, options)`.
 *
 * Used by: Lumin chat, weekly review, scorecard, communication-profile summaries,
 * and any other LifeOS surface that historically passed a single concatenated prompt.
 *
 * Env:
 *   LIFEOS_CHAT_COUNCIL_MEMBER / LUMIN_COUNCIL_MEMBER — preferred council member key.
 *   CHAT_COUNCIL_CASCADE — comma-separated fallback member keys (default: gemini_flash,openai_gpt,deepseek,claude_sonnet).
 *
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */

function isProviderOutageError(err) {
  const msg = String(err?.message || err).toLowerCase();
  return (
    msg.includes('credit balance is too low') ||
    msg.includes('insufficient quota') ||
    msg.includes('rate limit') ||
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('timed out') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('fetch failed') ||
    msg.includes('invalid model') ||
    msg.includes('api key') ||
    msg.includes('unauthorized') ||
    msg.includes('authentication') ||
    msg.includes('quota')
  );
}

/**
 * @param {Function} callCouncilMember
 * @param {{ member?: string, cascade?: string[], taskType?: string }} [opts]
 * @returns {null | ((...args: unknown[]) => Promise<string>)}
 */
export function createCouncilPromptAdapter(callCouncilMember, opts = {}) {
  if (typeof callCouncilMember !== 'function') {
    return null;
  }

  const preferred =
    opts.member ||
    process.env.LIFEOS_CHAT_COUNCIL_MEMBER ||
    process.env.LUMIN_COUNCIL_MEMBER ||
    'gemini_flash';
  const cascade = Array.isArray(opts.cascade)
    ? opts.cascade
    : (process.env.CHAT_COUNCIL_CASCADE || 'gemini_flash,openai_gpt,deepseek,claude_sonnet')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  // Ensure preferred member is first, then the rest, deduped.
  const ordered = [preferred, ...cascade.filter((m) => m !== preferred)].filter(
    (m, i, arr) => arr.indexOf(m) === i
  );
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

    const options = { taskType: defaultTaskType, allowModelDowngrade: false, ...councilOpts };

    let lastErr = null;
    for (const member of ordered) {
      try {
        const r = await callCouncilMember(member, prompt, options);
        const text = typeof r === 'string' ? r : (r?.content || r?.text || '');
        if (text && text.trim().length > 0) {
          return text;
        }
        lastErr = new Error(`${member} returned empty response`);
      } catch (err) {
        lastErr = err;
        const msg = String(err?.message || err).toLowerCase();
        console.log(`[COUNCIL-PROMPT-ADAPTER] ${member} failed: ${msg.slice(0, 160)}`);
        if (isProviderOutageError(err)) {
          continue;
        }
        throw err;
      }
    }
    throw lastErr || new Error('All chat council cascade members failed');
  };
}
