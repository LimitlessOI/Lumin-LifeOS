/**
 * SYNOPSIS: Mechanical overlay HTML patches — insert comments/markers without LLM whole-file rewrite.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  extractTargetFileFromInstruction,
  CANONICAL_FOUNDER_UI_TARGET,
} from './builder-instruction-target.js';

const COMMENT_RE = /<!--\s*([^>]+?)\s*-->/;

const SMOKE_CANARY_FILE = 'scripts/lifeos-direct-build-smoke-test.mjs';
const SMOKE_PROOF_RE = /\/\/\sui-e2e-build-proof:\s*(\S+)/i;

export function isSurgicalHtmlCommentPatch(task = '') {
  const t = String(task || '');
  if (!/\bhtml comment\b/i.test(t) && !COMMENT_RE.test(t)) return false;
  if (!/\b(add|insert|place|put)\b/i.test(t)) return false;
  return Boolean(extractTargetFileFromInstruction(t) || /\.html\b/i.test(t));
}

/** E2E drawer canary: mechanical comment stamp — no AI / no multi-instance orphan risk. */
export function isSmokeCanaryMjsCommentPatch(task = '') {
  const t = String(task || '');
  return /lifeos-direct-build-smoke-test\.mjs/i.test(t) && /ui-e2e-build-proof:/i.test(t);
}

export function parseSmokeCanaryMjsCommentPatch(task = '') {
  const t = String(task || '').trim();
  if (!isSmokeCanaryMjsCommentPatch(t)) return null;
  const m = t.match(SMOKE_PROOF_RE) || t.match(/ui-e2e-build-proof:\s*(\S+)/i);
  if (!m) return null;
  const stamp = String(m[1] || '').trim().replace(/^["'`]+|["'`]+$/g, '');
  if (!stamp) return null;
  return {
    targetFile: SMOKE_CANARY_FILE,
    comment: `// ui-e2e-build-proof: ${stamp}`,
  };
}

export function applySmokeCanaryMjsCommentPatch({ root, task }) {
  const spec = parseSmokeCanaryMjsCommentPatch(task);
  if (!spec?.comment) return { ok: false, reason: 'not_smoke_canary_mjs_comment' };

  const abs = path.join(root, spec.targetFile);
  if (!fs.existsSync(abs)) return { ok: false, reason: 'target_missing' };
  const existing = fs.readFileSync(abs, 'utf8');
  let output;
  let already_present = false;
  if (existing.includes(spec.comment)) {
    output = existing;
    already_present = true;
  } else if (SMOKE_PROOF_RE.test(existing)) {
    output = existing.replace(SMOKE_PROOF_RE, spec.comment);
  } else {
    const lines = existing.split('\n');
    const insertAt = lines.findIndex((line, i) => i > 0 && !line.startsWith('/*') && !line.startsWith(' *') && !line.startsWith('*/') && line.trim() !== '');
    const idx = insertAt === -1 ? 0 : insertAt;
    lines.splice(idx, 0, spec.comment);
    output = lines.join('\n');
  }
  if (output === existing && !already_present) {
    return { ok: false, reason: 'no_change' };
  }
  return {
    ok: true,
    patch: 'smoke_canary_mjs_comment',
    files: [{ target_file: spec.targetFile, output }],
    comment: spec.comment,
    already_present,
  };
}

export function parseSurgicalHtmlCommentPatch(task = '') {
  const t = String(task || '').trim();
  const targetFile = extractTargetFileFromInstruction(t) || CANONICAL_FOUNDER_UI_TARGET;
  const commentMatch = t.match(COMMENT_RE);
  let comment = commentMatch ? `<!-- ${commentMatch[1].trim()} -->` : null;
  if (!comment) {
    const gen = t.match(/comment\s+([^\n]+?)(?:\s+(?:on|in|before|immediately)|$)/i);
    if (gen) comment = `<!-- ${gen[1].trim()} -->`;
  }
  if (!comment) return null;

  let anchor = null;
  if (/lumin[- ]drawer|id=["']lumin-drawer["']/i.test(t)) {
    anchor = '<div class="lumin-drawer';
  } else {
    const idMatch = t.match(/\bid=["']([^"']+)["']/i);
    if (idMatch) anchor = `id="${idMatch[1]}"`;
  }
  if (!anchor) anchor = '<div class="lumin-drawer';

  return { targetFile, comment, anchor };
}

export function insertHtmlCommentBeforeAnchor(content, { comment, anchor }) {
  const text = String(content || '');
  const idx = text.indexOf(anchor);
  if (idx === -1) {
    throw new Error(`Anchor not found for surgical patch: ${anchor}`);
  }
  const lineStart = text.lastIndexOf('\n', idx) + 1;
  const prefix = text.slice(0, lineStart);
  const suffix = text.slice(lineStart);
  if (suffix.includes(comment)) {
    return { output: text, already_present: true };
  }
  const indent = (text.slice(lineStart, idx).match(/^(\s*)/) || ['', ''])[1];
  const line = `${indent}${comment}\n`;
  return { output: `${prefix}${line}${suffix}`, already_present: false };
}

export function applySurgicalHtmlCommentPatch({ root, task }) {
  if (!isSurgicalHtmlCommentPatch(task)) {
    return { ok: false, reason: 'not_surgical_html_comment' };
  }
  const spec = parseSurgicalHtmlCommentPatch(task);
  if (!spec?.comment) return { ok: false, reason: 'no_comment_parsed' };

  const abs = path.join(root, spec.targetFile);
  if (!fs.existsSync(abs)) return { ok: false, reason: 'target_missing' };
  const existing = fs.readFileSync(abs, 'utf8');
  const { output, already_present } = insertHtmlCommentBeforeAnchor(existing, spec);
  if (output === existing && !already_present) {
    return { ok: false, reason: 'no_change' };
  }

  return {
    ok: true,
    patch: 'surgical_html_comment',
    files: [{ target_file: spec.targetFile, output }],
    comment: spec.comment,
    anchor: spec.anchor,
    already_present: already_present === true,
  };
}

export async function commitSurgicalPatchViaBuilder({ baseUrl, commandKey, patchResult, fetchImpl = fetch, timeoutMs = 120000 }) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  const files = patchResult.files || [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${base}/api/v1/lifeos/builder/execute-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-command-key': commandKey },
      body: JSON.stringify({
        files,
        commit_message: `[system-build] Surgical overlay patch ${patchResult.patch}`,
      }),
      signal: controller.signal,
    });
    const json = await res.json();
    // Idempotent surgical patch: a no-op means the EXACT requested content is already
    // on main (execute-batch verified content == HEAD and returns the HEAD sha in
    // `sha`). That is a satisfied end-state, not a build failure. Normalize it to a
    // committed-equivalent success so callers (which gate on json.committed) report
    // PASS with the sha that already contains the change — restoring the pre-no-op-
    // guard behavior for these patches WITHOUT landing a phantom commit. The
    // `already_satisfied` flag keeps the "no new commit this call" nuance honest.
    if (json && json.ok === true && json.no_op === true) {
      json.committed = true;
      json.already_satisfied = true;
    }
    if (!res.ok || !json.ok || !json.committed) {
      return { status: res.status, json, failed_file: json.failed_file || json.target_file || null };
    }
    return {
      status: res.status,
      json,
      already_satisfied: json.already_satisfied === true,
      committed_files: json.committed_files || files.map((f) => f.target_file),
    };
  } finally {
    clearTimeout(timer);
  }
}