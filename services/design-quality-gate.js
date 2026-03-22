/**
 * services/design-quality-gate.js
 * Post-build quality check run on every generated file before it's committed.
 *
 * Checks:
 *  1. Brand compliance (colors, fonts, spacing)
 *  2. UX heuristics (Nielsen)
 *  3. Accessibility baseline (contrast, labels, focus states)
 *  4. Mobile responsiveness signals
 *  5. Vision match (does it match what Adam asked for?)
 *
 * If a check fails and the AI can auto-fix it, it patches the code and re-evaluates.
 * Max 2 fix attempts before passing with warnings.
 *
 * Exports: createDesignQualityGate(deps) → { check, checkAndFix }
 */

import fs from 'fs/promises';
import path from 'path';
import { createUXEvaluator } from './ux-evaluator.js';

const BRAND_PATH = path.join(process.cwd(), 'docs', 'brand.md');
const PREFS_PATH = path.join(process.cwd(), 'data', 'adam-preferences.json');

async function loadBrandGuide() {
  try {
    return await fs.readFile(BRAND_PATH, 'utf-8');
  } catch {
    return '';
  }
}

async function loadPreferences() {
  try {
    const raw = await fs.readFile(PREFS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Separate builder AI from critic AI to avoid conflict of interest.
 * If callCritic is provided, it's used for evaluation (ideally a different model).
 * Falls back to callAI if no critic is provided.
 */
export function createDesignQualityGate({ callAI, callCritic }) {
  const criticAI = callCritic || callAI; // Different model for critique
  const { evaluate } = createUXEvaluator({ callAI: criticAI });

  // ── Accessibility check ───────────────────────────────────────────────────
  function checkAccessibilitySignals(code) {
    const issues = [];
    const isHTML = code.includes('<html') || code.includes('<!DOCTYPE');

    if (isHTML) {
      if (!code.includes('alt=')) issues.push('Images missing alt attributes');
      if (!code.includes('focus:') && !code.includes('focus-visible')) {
        issues.push('No focus ring styles found — keyboard navigation may be broken');
      }
      if (code.includes('<button') && !code.includes('aria-label') && code.match(/<button[^>]*>\s*<svg/)) {
        issues.push('Icon-only buttons missing aria-label');
      }
      if (!code.includes('<label') && code.includes('<input')) {
        issues.push('Input fields missing <label> elements');
      }
    }

    return issues;
  }

  // ── Mobile responsiveness signals ─────────────────────────────────────────
  function checkMobileSignals(code) {
    const issues = [];
    const isHTML = code.includes('<html') || code.includes('<!DOCTYPE');

    if (isHTML) {
      if (!code.includes('viewport')) {
        issues.push('Missing viewport meta tag');
      }
      if (!code.includes('sm:') && !code.includes('md:') && !code.includes('lg:') && !code.includes('@media')) {
        issues.push('No responsive breakpoints detected — may not work on mobile');
      }
      if (code.match(/width:\s*\d{4,}px/) || code.match(/min-width:\s*\d{4,}px/)) {
        issues.push('Fixed large widths detected — may cause horizontal scroll on mobile');
      }
    }

    return issues;
  }

  // ── Brand compliance check ────────────────────────────────────────────────
  function checkBrandSignals(code) {
    const issues = [];
    const isHTML = code.includes('<html') || code.includes('<!DOCTYPE');

    if (isHTML) {
      if (!code.includes('tailwindcss') && !code.includes('cdn.tailwindcss') && !code.includes('class=')) {
        issues.push('Not using Tailwind CSS — brand styles may be missing');
      }
      if (!code.includes('Inter') && !code.includes('font-sans') && isHTML) {
        issues.push('Inter font not loaded — use brand typography');
      }
      // Check for obviously wrong color schemes
      if (code.includes('#ff0000') || code.includes('background: red')) {
        issues.push('Raw red color used — use brand danger color #EF4444 via Tailwind');
      }
    }

    return issues;
  }

  // ── Main check ────────────────────────────────────────────────────────────
  /**
   * Run all quality checks on a generated file.
   * @param {string} code             — generated code
   * @param {string} fileType         — 'html'|'js'|'css'
   * @param {string} productDescription
   * @param {object} [vision]         — idea vision fields
   * @returns {{ passed: boolean, score: number|null, issues: string[], warnings: string[] }}
   */
  async function check(code, fileType, productDescription, vision = {}) {
    const [brandGuide, preferences] = await Promise.all([loadBrandGuide(), loadPreferences()]);

    const allIssues = [];
    const allWarnings = [];

    // Static checks (fast, no AI)
    if (fileType === 'html') {
      const a11y = checkAccessibilitySignals(code);
      const mobile = checkMobileSignals(code);
      const brand = checkBrandSignals(code);

      // Accessibility issues are warnings (not hard failures)
      allWarnings.push(...a11y);
      // Mobile is a soft failure
      if (mobile.length > 0) allWarnings.push(...mobile);
      // Brand issues are warnings
      allWarnings.push(...brand);
    }

    // AI-powered UX evaluation (skipped for non-visual files)
    let uxResult = null;
    if (callAI && ['html', 'css'].includes(fileType)) {
      uxResult = await evaluate(code, `${fileType} component`, productDescription, brandGuide, preferences);
      if (uxResult && !uxResult.skipped) {
        if (uxResult.issues?.length > 0) {
          allIssues.push(...uxResult.issues.slice(0, 3));
        }
      }
    }

    // Vision match check
    if (callAI && vision?.design_notes) {
      const visionPrompt = `Does this ${fileType} code match this design vision?

Vision: "${vision.design_notes}"
Reference: "${vision.reference_url || 'none'}"

Code snippet:
\`\`\`
${code.substring(0, 2000)}
\`\`\`

Reply with just: MATCH, PARTIAL, or MISMATCH — followed by one sentence explaining why.`;

      try {
        const visionCheck = await callAI(visionPrompt);
        if (visionCheck.startsWith('MISMATCH')) {
          allWarnings.push(`Vision mismatch: ${visionCheck.replace('MISMATCH', '').trim()}`);
        } else if (visionCheck.startsWith('PARTIAL')) {
          allWarnings.push(`Partial vision match: ${visionCheck.replace('PARTIAL', '').trim()}`);
        }
      } catch {
        // Vision check failure is non-blocking
      }
    }

    const passed = allIssues.length === 0;
    const score = uxResult?.score || null;

    if (!passed) {
      console.log(`❌ [QUALITY-GATE] FAILED (${allIssues.length} issues)`);
      allIssues.forEach(i => console.log(`   • ${i}`));
    } else if (allWarnings.length > 0) {
      console.log(`⚠️  [QUALITY-GATE] PASSED with ${allWarnings.length} warnings`);
      allWarnings.forEach(w => console.log(`   • ${w}`));
    } else {
      console.log(`✅ [QUALITY-GATE] PASSED${score ? ` (score: ${score}/10)` : ''}`);
    }

    return { passed, score, issues: allIssues, warnings: allWarnings, uxResult };
  }

  // ── Check + auto-fix ──────────────────────────────────────────────────────
  /**
   * Run quality check. If it fails, ask AI to fix the issues and re-check.
   * Max 2 fix attempts.
   *
   * @returns {{ code: string, passed: boolean, attempts: number, finalResult: object }}
   */
  async function checkAndFix(code, fileType, productDescription, vision = {}) {
    let currentCode = code;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      const result = await check(currentCode, fileType, productDescription, vision);
      attempts++;

      if (result.passed) {
        return { code: currentCode, passed: true, attempts, finalResult: result };
      }

      if (!callAI || attempts >= maxAttempts) {
        console.log(`⚠️  [QUALITY-GATE] Passing with warnings after ${attempts} attempt(s)`);
        return { code: currentCode, passed: true, attempts, finalResult: result, hadIssues: true };
      }

      // Ask AI to fix
      console.log(`🔧 [QUALITY-GATE] Auto-fixing ${result.issues.length} issue(s)...`);
      const fixPrompt = `Fix these UX/design issues in the following ${fileType} code. Make minimal targeted changes.

Issues to fix:
${result.issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

${result.uxResult?.fixes?.length > 0 ? `Suggested fixes:\n${result.uxResult.fixes.join('\n')}` : ''}

Current code:
\`\`\`
${currentCode}
\`\`\`

OUTPUT ONLY THE FIXED CODE. No explanation. No markdown fences.`;

      try {
        const fixed = await callAI(fixPrompt);
        if (fixed && fixed.length > 100) {
          currentCode = fixed;
          console.log(`🔧 [QUALITY-GATE] Applied fix attempt ${attempts}`);
        } else {
          break;
        }
      } catch (err) {
        console.warn(`[QUALITY-GATE] Auto-fix failed: ${err.message}`);
        break;
      }
    }

    return { code: currentCode, passed: true, attempts, hadIssues: true };
  }

  // ── Update Adam's preference store with feedback ──────────────────────────
  async function recordFeedback(feedback, context = '') {
    try {
      const raw = await fs.readFile(PREFS_PATH, 'utf-8');
      const prefs = JSON.parse(raw);

      prefs.feedback_history = prefs.feedback_history || [];
      prefs.feedback_history.push({
        date: new Date().toISOString(),
        feedback,
        context,
      });

      // Keep last 50 entries
      if (prefs.feedback_history.length > 50) {
        prefs.feedback_history = prefs.feedback_history.slice(-50);
      }

      prefs._updated = new Date().toISOString().split('T')[0];
      await fs.writeFile(PREFS_PATH, JSON.stringify(prefs, null, 2));
      console.log(`📝 [QUALITY-GATE] Preference feedback recorded`);
    } catch (err) {
      console.warn(`[QUALITY-GATE] Could not record feedback: ${err.message}`);
    }
  }

  return { check, checkAndFix, recordFeedback };
}
