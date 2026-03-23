/**
 * services/ux-evaluator.js
 * Evaluates generated UI against Nielsen's 10 usability heuristics,
 * user flow quality, and Adam's known preferences.
 *
 * No browser required — evaluates HTML/JS source directly using AI.
 *
 * Exports: createUXEvaluator(deps) → { evaluate, evaluateUserFlow, scoreHeuristics }
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

// Nielsen's 10 Usability Heuristics
const NIELSEN_HEURISTICS = [
  { id: 1, name: 'Visibility of system status', description: 'Always keep users informed about what is going on through appropriate feedback within reasonable time.' },
  { id: 2, name: 'Match between system and the real world', description: 'Speak the users language. Use words, phrases and concepts familiar to the user.' },
  { id: 3, name: 'User control and freedom', description: 'Users often choose system functions by mistake. They need clearly marked emergency exits. Support undo and redo.' },
  { id: 4, name: 'Consistency and standards', description: 'Users should not have to wonder whether different words, situations, or actions mean the same thing.' },
  { id: 5, name: 'Error prevention', description: 'Even better than good error messages is a careful design which prevents a problem from occurring in the first place.' },
  { id: 6, name: 'Recognition rather than recall', description: 'Minimize the users memory load by making objects, actions, and options visible.' },
  { id: 7, name: 'Flexibility and efficiency of use', description: 'Accelerators may speed up interaction for the expert user such that the system can cater to both inexperienced and experienced users.' },
  { id: 8, name: 'Aesthetic and minimalist design', description: 'Dialogues should not contain irrelevant or rarely needed information. Every extra unit of information competes with relevant information.' },
  { id: 9, name: 'Help users recognize, diagnose, and recover from errors', description: 'Error messages should be expressed in plain language, precisely indicate the problem, and constructively suggest a solution.' },
  { id: 10, name: 'Help and documentation', description: 'Even though it is better if the system can be used without documentation, it may be necessary to provide help.' },
];

// Common user flow anti-patterns
const FLOW_ANTIPATTERNS = [
  'Requiring account creation before showing value',
  'More than 3 steps to complete the primary action',
  'No confirmation after form submission',
  'Broken back button behavior',
  'No loading feedback during async operations',
  'Dead-end error pages with no path forward',
  'Required fields not marked until after submission',
  'Losing user input on validation error',
  'CTA buttons that are hard to find or below the fold on mobile',
  'No empty state when a list has no items',
];

export function createUXEvaluator({ callAI }) {
  // ── Score a piece of code against Nielsen heuristics ───────────────────────
  async function scoreHeuristics(code, componentType, productDescription) {
    if (!callAI) return null;

    const heuristicsList = NIELSEN_HEURISTICS
      .map(h => `${h.id}. ${h.name}: ${h.description}`)
      .join('\n');

    const prompt = `You are a senior UX designer reviewing ${componentType} code for: "${productDescription}"

Review this code against Nielsen's 10 Usability Heuristics and provide:
1. A score for each heuristic (1-10)
2. The top 3 issues found
3. The top 3 things done well
4. Specific code changes to fix the top issues

Nielsen's Heuristics:
${heuristicsList}

Code to review:
\`\`\`
${code.substring(0, 4000)}
\`\`\`

Respond in JSON:
{
  "scores": { "1": 8, "2": 7, ... },
  "overall": 7.5,
  "issues": ["issue 1", "issue 2", "issue 3"],
  "strengths": ["strength 1", ...],
  "fixes": ["specific fix 1", "specific fix 2", "specific fix 3"],
  "passed": true
}

"passed" is true if overall >= 6.`;

    try {
      const response = await callAI(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      console.warn(`[UX-EVALUATOR] Score parse failed: ${err.message}`);
    }
    return null;
  }

  // ── Evaluate a user flow description ───────────────────────────────────────
  async function evaluateUserFlow(flow, productType) {
    if (!callAI) return null;

    const antiPatternList = FLOW_ANTIPATTERNS.map((p, i) => `${i + 1}. ${p}`).join('\n');

    const prompt = `You are a UX expert. Evaluate this user flow for a "${productType}" product.

User Flow:
${flow}

Common flow anti-patterns to check for:
${antiPatternList}

Evaluate:
1. Is this flow intuitive for a first-time user?
2. How many steps to complete the primary goal?
3. Where will users get confused or drop off?
4. What anti-patterns are present?
5. How to improve it?

Respond in JSON:
{
  "intuitive": true,
  "steps_to_goal": 3,
  "drop_off_points": ["point 1"],
  "antipatterns_found": ["antipattern 1"],
  "improvements": ["improvement 1", "improvement 2"],
  "score": 7,
  "passed": true
}

"passed" is true if score >= 6.`;

    try {
      const response = await callAI(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      console.warn(`[UX-EVALUATOR] Flow eval parse failed: ${err.message}`);
    }
    return null;
  }

  // ── Full evaluation of generated code ──────────────────────────────────────
  /**
   * @param {string} code           — generated HTML or JS
   * @param {string} componentType  — 'landing_page'|'dashboard'|'form'|'api'
   * @param {string} productDescription
   * @param {object} brandGuide     — parsed brand.md content
   * @param {object} preferences    — adam-preferences.json
   * @returns {{ passed: boolean, score: number, issues: string[], fixes: string[] }}
   */
  async function evaluate(code, componentType, productDescription, brandGuide = '', preferences = {}) {
    if (!callAI) {
      return { passed: true, score: null, issues: [], fixes: [], skipped: true };
    }

    const dislikesList = (preferences.design?.dislikes || []).join(', ');
    const likesList = (preferences.design?.likes || []).join(', ');

    const prompt = `You are a senior product designer and UX expert reviewing generated ${componentType} code.

Product: "${productDescription}"

Adam's preferences:
- Likes: ${likesList || 'clean, minimal, dark theme, indigo palette'}
- Dislikes: ${dislikesList || 'modals, cluttered navigation, excessive whitespace'}

Brand guidelines summary:
${brandGuide ? brandGuide.substring(0, 1500) : 'Dark theme, indigo primary color, Inter font, clean minimal design'}

Review the code for:
1. Does it follow the brand guidelines (colors, fonts, spacing)?
2. Is the UI intuitive — can a new user figure it out in under 5 seconds?
3. Are there any UX anti-patterns (broken flows, missing feedback, poor empty states)?
4. Is it mobile responsive?
5. Does it match Adam's preferences?

Code (first 3000 chars):
\`\`\`
${code.substring(0, 3000)}
\`\`\`

Respond in JSON:
{
  "passed": true,
  "score": 8,
  "issues": ["issue 1", "issue 2"],
  "fixes": ["specific fix with code example 1", "fix 2"],
  "brand_compliance": "high|medium|low",
  "mobile_ready": true,
  "intuitive": true
}`;

    try {
      const response = await callAI(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log(`🎨 [UX-EVALUATOR] Score: ${result.score}/10 — ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
        if (result.issues?.length > 0) {
          result.issues.forEach(issue => console.log(`   ⚠️  ${issue}`));
        }
        return result;
      }
    } catch (err) {
      console.warn(`[UX-EVALUATOR] Evaluation parse failed: ${err.message}`);
    }

    return { passed: true, score: null, issues: [], fixes: [], skipped: true };
  }

  return { evaluate, evaluateUserFlow, scoreHeuristics };
}
