/**
 * SYNOPSIS: BuilderOS Zone 3 patch-mode policy — classify build targets, generate
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 * extract-helper specs for large files, validate output size safety.
 *
 * Pure-function module. No pool, no factory, no side effects.
 *
 * GAP-FILL: builder (groq_llama) two attempts both failed with embedded
 * markdown fences + JSON metadata (```json block at line 105 in both
 * be00cd8e and retry d8e51a79). SYNTAX correction injection did not
 * prevent groq from appending metadata blocks.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, basename } from 'path';

const ZONE4_PATH_PREFIXES = ['startup/', 'middleware/', 'core/', 'config/'];
const ZONE4_BASENAMES = ['server.js'];
const ZONE3_LINE_THRESHOLD = 150;
const ZONE2_LINE_THRESHOLD = 50;

function countLines(resolvedPath) {
  try {
    return readFileSync(resolvedPath, 'utf8').split('\n').length;
  } catch {
    return 0;
  }
}

/**
 * Classify a build target file into Zone 1-4.
 * @returns {{ zone, label, allowBuilder, patchModeRequired, reason, lineCount }}
 */
export function classifyBuildTarget(filePath) {
  const resolved = resolve(filePath);
  const base = basename(resolved);

  // Zone 4: blocked paths
  const inBlockedPrefix = ZONE4_PATH_PREFIXES.some((p) => resolved.includes('/' + p) || resolved.includes('\\' + p));
  const isBlockedBasename = ZONE4_BASENAMES.includes(base);
  if (inBlockedPrefix || isBlockedBasename) {
    return {
      zone: 4,
      label: 'BLOCKED',
      allowBuilder: false,
      patchModeRequired: false,
      reason: 'Zone 4: startup/middleware/core/config/server.js paths are blocked for all builder mutations',
      lineCount: 0,
    };
  }

  // New file
  if (!existsSync(resolved)) {
    return {
      zone: 1,
      label: 'SAFE',
      allowBuilder: true,
      patchModeRequired: false,
      reason: 'Zone 1: new file',
      lineCount: 0,
    };
  }

  const lineCount = countLines(resolved);

  if (lineCount > ZONE3_LINE_THRESHOLD) {
    return {
      zone: 3,
      label: 'DANGER',
      allowBuilder: false,
      patchModeRequired: true,
      reason: 'Zone 3: file is ' + lineCount + ' lines — builder will generate stub. Use extract-helper strategy.',
      lineCount,
    };
  }

  if (lineCount >= ZONE2_LINE_THRESHOLD) {
    return {
      zone: 2,
      label: 'CAUTION',
      allowBuilder: true,
      patchModeRequired: false,
      reason: 'Zone 2: file is ' + lineCount + ' lines — builder may generate stub. Verify output immediately.',
      lineCount,
    };
  }

  return {
    zone: 1,
    label: 'SAFE',
    allowBuilder: true,
    patchModeRequired: false,
    reason: 'Zone 1: file is under ' + ZONE2_LINE_THRESHOLD + ' lines',
    lineCount,
  };
}

/**
 * Classify whether a Zone 3 build request wants to MODIFY existing in-file logic
 * (surgical find-and-replace / edit-patch) vs purely ADD new code (additive
 * splice). Additive mode is forbidden from touching existing content, so a
 * "change X to Y" request against a large file can only be satisfied by an edit
 * patch. Defaults to 'additive' (the safe, existing behavior) unless the task
 * clearly asks to change/replace/rename/remove something that already exists.
 * @returns {'edit'|'additive'}
 */
export function classifyPatchIntent(task) {
  const t = String(task || '').toLowerCase();
  if (!t.trim()) return 'additive';
  const modifyVerb = /\b(chang|modif|updat|replac|renam|adjust|edit|switch|convert|decreas|increas|disabl|enabl|toggl|rewrit|refactor|fix|remov|delet)\w*\b/i.test(t);
  const modifyPhrase = /\b(instead of|rather than|set\s+[\w.]+\s+to\b|so (?:it|they|the)\b.*\b(?:lasts?|uses?|returns?|becomes?)\b)/i.test(t);
  return (modifyVerb || modifyPhrase) ? 'edit' : 'additive';
}

/**
 * Generate a patch-mode spec for Zone 3 targets using extract-helper strategy.
 * Instead of editing the large file, builder creates a new helper file.
 * @returns {{ patchSpec, strategy, warning }}
 */
export function generatePatchSpec(originalSpec, targetFile, currentLineCount) {
  const base = basename(targetFile, '.js');
  const helperPath = 'services/builderos-' + base + '-helper.js';
  const patchSpec = [
    'ZONE3_PATCH_MODE: target file has ' + currentLineCount + ' lines.',
    'DO NOT rewrite the full file. Use extract-helper strategy:',
    '1. Create a NEW file at ' + helperPath + ' containing only the new logic.',
    '2. The new helper file should export the new functions.',
    '3. The original file will import from the helper with a 2-line addition.',
    'Spec for the new helper file: ' + originalSpec,
  ].join(' ');

  return {
    patchSpec,
    strategy: 'extract_to_helper',
    helperTargetFile: helperPath,
    warning: 'Zone 3 surgical edits require GAP-FILL annotation if builder stubs. Use Zone 1 helper extraction to stay in safe scope.',
  };
}

/**
 * Validate that builder output is not a line-count collapse (stub detection).
 * @returns {{ safe, reason }}
 */
export function validateOutputSafety(originalLineCount, newLineCount) {
  if (originalLineCount === 0 || newLineCount === 0) {
    return { safe: true, reason: 'line counts unavailable — cannot validate' };
  }
  if (originalLineCount > ZONE3_LINE_THRESHOLD && newLineCount < 30) {
    return {
      safe: false,
      reason: 'line_count_collapse: was ' + originalLineCount + ' lines now ' + newLineCount + ' — full stub detected',
    };
  }
  if (newLineCount < originalLineCount * 0.5) {
    return {
      safe: false,
      reason: 'output_truncated: new content is less than 50% of original (' + newLineCount + ' vs ' + originalLineCount + ' lines)',
    };
  }
  return { safe: true, reason: 'output size acceptable' };
}
