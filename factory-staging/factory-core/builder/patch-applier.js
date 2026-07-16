/**
 * SYNOPSIS: Apply model-generated edit patches to existing source files.
 *
 * The factory can ask a model for `old_string` / `new_string` pairs instead of a
 * full-file rewrite. This reduces completion tokens for modifications, which is
 * the primary driver of the low `token_efficiency` score. The applier is
 * fail-closed: if an `old_string` is empty, not found, or ambiguous, it returns
 * an error so the caller can fall back to full-file codegen.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { estimateTokens } from '../../../services/token-optimizer.js';

/**
 * Parse an edit-patch model response into a normalized [{old_string,new_string}]
 * array. Tolerates a stray markdown fence, a leading prose line, a trailing
 * ---METADATA--- block, or a {"patches": [...]} wrapper.
 *
 * @param {string} raw
 * @returns {{ ok: true, edits: Array<{old_string:string, new_string:string}> } | { ok: false, reason: string }}
 */
export function parsePatch(raw) {
  let s = String(raw || '').trim();
  const sepIdx = s.indexOf('\n---METADATA---');
  if (sepIdx !== -1) s = s.slice(0, sepIdx).trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

  // If the model wrapped the array in { "patches": [...] }, unwrap it.
  let arrText = s;
  try {
    const wrapper = JSON.parse(s);
    if (wrapper && typeof wrapper === 'object' && Array.isArray(wrapper.patches)) {
      arrText = JSON.stringify(wrapper.patches);
    } else if (Array.isArray(wrapper)) {
      arrText = s;
    } else if (wrapper && typeof wrapper === 'object' && typeof wrapper.old_string === 'string') {
      arrText = JSON.stringify([wrapper]);
    }
  } catch {
    // Not valid JSON as-is; try to locate an array inside prose.
  }

  const start = arrText.indexOf('[');
  const end = arrText.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    return { ok: false, reason: 'no JSON edit array found in model output' };
  }

  let parsed;
  try {
    parsed = JSON.parse(arrText.slice(start, end + 1));
  } catch (err) {
    return { ok: false, reason: `edit JSON parse failed (likely truncated): ${err.message}` };
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { ok: false, reason: 'edit output is not a non-empty JSON array' };
  }

  const edits = [];
  for (const e of parsed) {
    if (!e || typeof e !== 'object' || typeof e.old_string !== 'string' || typeof e.new_string !== 'string') {
      return { ok: false, reason: 'each edit must be an object with string old_string and new_string' };
    }
    edits.push({ old_string: e.old_string, new_string: e.new_string });
  }
  return { ok: true, edits };
}

/**
 * Apply edits to existing content. Every old_string must be non-empty and match
 * EXACTLY ONCE (missing or ambiguous anchors are rejected rather than guessed).
 *
 * @param {string} content
 * @param {{ ok: true, edits: Array<{old_string:string, new_string:string}> }} patchSpec
 * @returns {{ ok: true, content: string, edits_applied: number, output_baseline_tokens: number } | { ok: false, reason: string }}
 */
export function applyPatch(content, patchSpec) {
  if (!patchSpec || patchSpec.ok !== true || !Array.isArray(patchSpec.edits)) {
    return { ok: false, reason: 'missing_or_invalid_patch_spec' };
  }

  const outputBaselineTokens = estimateTokens(content);
  let current = content;
  let applied = 0;

  for (const { old_string, new_string } of patchSpec.edits) {
    if (old_string === '') {
      return { ok: false, reason: 'edit has an empty old_string — cannot anchor' };
    }
    if (old_string === new_string) continue;

    const first = current.indexOf(old_string);
    if (first === -1) {
      return { ok: false, reason: `edit old_string not found in file — the model must copy it verbatim: ${JSON.stringify(old_string.slice(0, 80))}` };
    }
    if (current.indexOf(old_string, first + old_string.length) !== -1) {
      return { ok: false, reason: `edit old_string is ambiguous (matches more than once) — add surrounding context to make it unique: ${JSON.stringify(old_string.slice(0, 80))}` };
    }

    current = current.slice(0, first) + new_string + current.slice(first + old_string.length);
    applied += 1;
  }

  if (applied === 0) {
    return { ok: false, reason: 'no edits applied (all edits were no-ops)' };
  }

  if (!current.endsWith('\n')) current += '\n';
  return {
    ok: true,
    content: current,
    edits_applied: applied,
    output_baseline_tokens: outputBaselineTokens,
  };
}

/**
 * Decide whether patch mode is appropriate for a step.
 */
export function shouldUsePatchMode(step, existingContent) {
  if (step?.authoring?.mode === 'patch') return true;
  if (step?.authoring?.mode === 'full') return false;
  if (!existingContent) return false;
  // Auto-switch to patch for any existing file unless the target is a
  // classic browser script (where the model often needs to rewrite the whole file).
  // Upper bound raised to 200KB so large route/service files can be edited with
  // small patches instead of full rewrites. Lower bound dropped to 100 bytes so
  // even modest existing files are edited diff-style, which is the main lever for
  // the low token_efficiency score.
  if (step?.module_type === 'classic_browser_script') return false;
  if (existingContent.length < 100) return false;
  if (existingContent.length > 200000) return false;
  return true;
}
