/**
 * services/build-critic.js
 *
 * Build Critic Loop — the system reviews its own output before shipping.
 *
 * Protocol (3 rounds max):
 *   Round 1 — DeepSeek reads the code cold. Lists every bug, gap, assumption.
 *   Round 2 — Builder fixes what DeepSeek flagged. Outputs revised code.
 *   Round 3 — Grok checks the fixed code against the SSOT spec (if provided).
 *             If it passes → ship. If not → one more fix pass. Then ship regardless.
 *
 * Why 3 different models:
 *   Builder (deepseek-coder / claude) → writes the initial code
 *   Critic (grok or deepseek)         → reads cold, spots what builder missed
 *   Validator (gemini or claude)      → checks spec compliance
 *
 * Exports: createBuildCritic(callAI, callCritic, callValidator) → { review }
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */

// Issues below this severity are warnings only — don't force a fix pass
const MIN_SEVERITY_TO_FIX = 'medium'; // low | medium | high | critical

const SEVERITY_RANK = { low: 0, medium: 1, high: 2, critical: 3 };

function rankAbove(sev, threshold) {
  return (SEVERITY_RANK[sev] || 0) >= (SEVERITY_RANK[threshold] || 1);
}

/**
 * Parse the critic's JSON response. Tolerant of markdown fences and trailing text.
 */
function parseCriticResponse(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/```\s*$/m, '')
    .trim();

  // Find first { ... } block
  const start = cleaned.indexOf('{');
  const end   = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;

  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Extract code from a fix response.
 * Looks for fenced code blocks first, then returns the full response.
 */
function extractCodeFromFix(raw, fileType) {
  if (!raw) return null;

  // Try fenced block for the specific type
  const fenceRe = new RegExp('```(?:' + fileType + '|javascript|js|html|css)?\\s*([\\s\\S]+?)```', 'i');
  const match = raw.match(fenceRe);
  if (match) return match[1].trim();

  // Try any fenced block
  const anyFence = raw.match(/```[\s\S]*?\n([\s\S]+?)```/);
  if (anyFence) return anyFence[1].trim();

  // Return raw if it looks like code (starts with import/export/<!DOCTYPE/function)
  const trimmed = raw.trim();
  if (/^(?:import|export|<!DOCTYPE|function|const|class|\/\*\*)/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function createBuildCritic({ callAI, callCritic, callValidator }) {
  /**
   * Run the full critic loop on a piece of generated code.
   *
   * @param {string}  code        — The generated code to review
   * @param {object}  component   — { name, file, type, prompt }
   * @param {string}  [ssotSpec]  — Optional: SSOT spec text to validate against
   * @param {number}  [maxRounds] — Max critic→fix iterations (default 3)
   *
   * @returns {Promise<{
   *   code: string,           — Final (possibly fixed) code
   *   rounds: number,         — How many critic rounds ran
   *   issues: Array,          — All issues found across rounds
   *   fixesApplied: number,   — How many fix passes ran
   *   passed: boolean,        — True if validator approved or no critical issues remain
   *   summary: string,        — Human-readable outcome
   * }>}
   */
  async function review(code, component, ssotSpec = null, maxRounds = 3) {
    const fileType = component.type || 'js';
    const fileName = component.file || component.name || 'unknown';
    const allIssues = [];
    let currentCode = code;
    let fixesApplied = 0;
    let passed = false;

    console.log(`\n🔍 [BUILD-CRITIC] Starting review: ${fileName}`);

    for (let round = 1; round <= maxRounds; round++) {
      console.log(`   Round ${round}/${maxRounds}`);

      // ── Step A: Critic reads cold ──────────────────────────────────────────
      const criticPrompt = buildCriticPrompt(currentCode, component, ssotSpec, round, allIssues);

      let criticRaw;
      try {
        criticRaw = await callCritic(criticPrompt);
      } catch (err) {
        console.warn(`   [BUILD-CRITIC] Critic call failed (round ${round}): ${err.message}`);
        break; // Critic unavailable — ship what we have
      }

      const criticResult = parseCriticResponse(
        typeof criticRaw === 'string' ? criticRaw : (criticRaw?.content || criticRaw?.text || JSON.stringify(criticRaw))
      );

      if (!criticResult) {
        console.warn(`   [BUILD-CRITIC] Could not parse critic response (round ${round}) — skipping`);
        break;
      }

      const roundIssues = (criticResult.issues || []).map(i => ({ ...i, round }));
      allIssues.push(...roundIssues);

      const actionableIssues = roundIssues.filter(i => rankAbove(i.severity, MIN_SEVERITY_TO_FIX));
      const criticalCount = roundIssues.filter(i => i.severity === 'critical').length;

      console.log(`   Found ${roundIssues.length} issues (${actionableIssues.length} actionable, ${criticalCount} critical)`);

      if (criticResult.approved && criticalCount === 0) {
        console.log(`   ✅ Critic approved (round ${round})`);
        passed = true;
        break;
      }

      if (actionableIssues.length === 0 && round >= 2) {
        console.log(`   ✅ No actionable issues remain`);
        passed = true;
        break;
      }

      // Last round — don't fix, just note result
      if (round === maxRounds) {
        const remaining = allIssues.filter(i => rankAbove(i.severity, 'high'));
        passed = remaining.length === 0;
        console.log(`   Final round: ${passed ? '✅ acceptable' : '⚠️ shipping with warnings'}`);
        break;
      }

      // ── Step B: Builder fixes flagged issues ───────────────────────────────
      console.log(`   🔧 Requesting fix pass...`);
      const fixPrompt = buildFixPrompt(currentCode, actionableIssues, component, fileType);

      let fixRaw;
      try {
        fixRaw = await callAI(fixPrompt);
      } catch (err) {
        console.warn(`   [BUILD-CRITIC] Fix call failed (round ${round}): ${err.message}`);
        break;
      }

      const fixedCode = extractCodeFromFix(
        typeof fixRaw === 'string' ? fixRaw : (fixRaw?.content || fixRaw?.text || ''),
        fileType
      );

      if (!fixedCode || fixedCode.length < 50) {
        console.warn(`   [BUILD-CRITIC] Fix returned no usable code — keeping current`);
        break;
      }

      // Basic sanity: fixed code should be at least 70% as long as original
      if (fixedCode.length < currentCode.length * 0.7) {
        console.warn(`   [BUILD-CRITIC] Fix suspiciously short (${fixedCode.length} vs ${currentCode.length}) — keeping current`);
        break;
      }

      currentCode = fixedCode;
      fixesApplied++;
      console.log(`   ✅ Fix applied (${fixedCode.length} chars)`);
    }

    // ── Step C: SSOT validator (if spec provided and at least one fix was applied) ──
    if (ssotSpec && fixesApplied > 0 && callValidator) {
      console.log(`   📋 Running SSOT validator...`);
      try {
        const validatorPrompt = buildValidatorPrompt(currentCode, ssotSpec, component);
        const validatorRaw = await callValidator(validatorPrompt);
        const validatorResult = parseCriticResponse(
          typeof validatorRaw === 'string' ? validatorRaw : (validatorRaw?.content || validatorRaw?.text || '')
        );

        if (validatorResult) {
          const specViolations = (validatorResult.violations || []).filter(v => v.severity === 'critical');
          if (specViolations.length > 0) {
            console.warn(`   ⚠️ SSOT validator: ${specViolations.length} critical spec violations`);
            allIssues.push(...specViolations.map(v => ({ ...v, source: 'ssot-validator', round: 'final' })));
            passed = false;
          } else {
            console.log(`   ✅ SSOT validator passed`);
            passed = validatorResult.passed ?? passed;
          }
        }
      } catch (err) {
        console.warn(`   [BUILD-CRITIC] Validator failed (non-blocking): ${err.message}`);
      }
    }

    const criticalRemaining = allIssues.filter(i => i.severity === 'critical' && i.round !== 1);
    const summary = passed
      ? `Passed critic loop. ${fixesApplied} fix pass(es). ${allIssues.length} total issues found.`
      : `Shipped with warnings. ${criticalRemaining.length} unresolved critical issue(s). Review ${fileName}.`;

    console.log(`\n   ${passed ? '✅' : '⚠️'} [BUILD-CRITIC] ${summary}\n`);

    return {
      code: currentCode,
      rounds: Math.min(allIssues.length > 0 ? fixesApplied + 1 : 1, maxRounds),
      issues: allIssues,
      fixesApplied,
      passed,
      summary,
    };
  }

  return { review };
}

// ── Prompt builders ──────────────────────────────────────────────────────────

function buildCriticPrompt(code, component, ssotSpec, round, priorIssues) {
  const priorBlock = priorIssues.length > 0
    ? `\n\nPRIOR ISSUES ALREADY FLAGGED (do NOT re-flag these unless still present after fixes):\n${priorIssues.map(i => `- [${i.severity}] ${i.description}`).join('\n')}`
    : '';

  const ssotBlock = ssotSpec
    ? `\n\nSSOT SPEC (the file must comply with this):\n${ssotSpec.slice(0, 2000)}`
    : '';

  return `You are a senior code reviewer doing a cold read of this file. Find every real bug, gap, and risk.

FILE: ${component.file || component.name}
TYPE: ${component.type || 'js'}
PURPOSE: ${component.prompt?.slice(0, 300) || component.name}

CODE TO REVIEW:
\`\`\`${component.type || 'js'}
${code}
\`\`\`
${priorBlock}${ssotBlock}

Review checklist:
- Logic bugs (wrong conditions, off-by-one, race conditions)
- Unhandled errors / missing try-catch at system boundaries
- Security issues (injection, unvalidated input, exposed secrets)
- Missing edge cases (null, empty, concurrent)
- SSOT spec violations (if spec provided)
- Anything that will silently fail in production

Do NOT flag:
- Style preferences
- Missing comments/docs on unchanged code
- Low-value suggestions

Respond ONLY with valid JSON:
{
  "approved": true|false,
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "location": "function name or line description",
      "description": "what is wrong (specific, not vague)",
      "fix": "exact fix instruction"
    }
  ],
  "verdict": "one sentence overall assessment"
}`;
}

function buildFixPrompt(code, issues, component, fileType) {
  const issueList = issues
    .map((i, n) => `${n + 1}. [${i.severity.toUpperCase()}] ${i.location}: ${i.description}\n   Fix: ${i.fix}`)
    .join('\n\n');

  // Bug fix: ending with an open ``` fence causes extractCodeFromFix to fail —
  // it looks for a *closed* fence pair. Instead, ask for a complete fenced block.
  return `Fix the following issues in this ${fileType} file. Return ONLY a single fenced code block containing the complete corrected file. No explanation before or after.

FILE: ${component.file || component.name}

ISSUES TO FIX:
${issueList}

CURRENT CODE:
\`\`\`${fileType}
${code}
\`\`\`

Rules:
- Fix ONLY the listed issues. Do not refactor, rename, or restructure anything else.
- Keep every existing export, function signature, and comment.
- Return the COMPLETE file — no truncation, no ellipsis, no summarizing.
- Wrap the entire file in a single \`\`\`${fileType} ... \`\`\` block.`;
}

function buildValidatorPrompt(code, ssotSpec, component) {
  return `Validate that this code correctly implements the SSOT specification.

FILE: ${component.file || component.name}

SSOT SPEC:
${ssotSpec.slice(0, 3000)}

IMPLEMENTED CODE:
\`\`\`${component.type || 'js'}
${code.slice(0, 6000)}
\`\`\`

Check:
- Are all required features/endpoints from the spec implemented?
- Are any non-negotiables from the spec missing or wrong?
- Are there any spec violations that would break functionality?

Respond ONLY with valid JSON:
{
  "passed": true|false,
  "violations": [
    {
      "severity": "critical|high|medium",
      "requirement": "what the spec requires",
      "actual": "what the code does instead",
      "fix": "how to fix"
    }
  ],
  "summary": "one sentence verdict"
}`;
}
