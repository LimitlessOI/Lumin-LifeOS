/**
 * SYNOPSIS: Mechanical overlay HTML patches — insert comments/markers without LLM whole-file rewrite.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  extractTargetFileFromInstruction,
  CANONICAL_FOUNDER_UI_TARGET,
} from './builder-instruction-target.js';

const COMMENT_RE = /<!--\s*([^>]+?)\s*-->/;

export function isSurgicalHtmlCommentPatch(task = '') {
  const t = String(task || '');
  if (!/\bhtml comment\b/i.test(t) && !COMMENT_RE.test(t)) return false;
  if (!/\b(add|insert|place|put)\b/i.test(t)) return false;
  return Boolean(extractTargetFileFromInstruction(t) || /\.html\b/i.test(t));
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
    if (!res.ok || !json.ok || !json.committed) {
      return { status: res.status, json, failed_file: json.failed_file || json.target_file || null };
    }
    return {
      status: res.status,
      json,
      committed_files: json.committed_files || files.map((f) => f.target_file),
    };
  } finally {
    clearTimeout(timer);
  }
}
