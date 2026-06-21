/**
 * Mechanical CSS patches for founder UI feedback — no whole-file HTML rewrite.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { isCssOnlyUiFeedback } from './builder-instruction-target.js';

export const ASSISTANT_BUBBLE_CSS_TARGET = 'public/overlay/lifeos-theme-overrides.css';
const MARKER_START = '/* founder-assistant-bubble-style:start */';
const MARKER_END = '/* founder-assistant-bubble-style:end */';

export function parseAssistantBubbleColors(task = '') {
  const t = String(task || '').toLowerCase();
  if (!/(color|colour|background|yellow|black text|response|reply|assistant|message|bubble)/i.test(t)) {
    return null;
  }
  let background = '#ffeb3b';
  let border = '#f9d800';
  let color = '#000000';
  if (/yellow/.test(t)) {
    background = '#ffeb3b';
    border = '#f9d800';
  }
  if (/black text|black text|text black|with black/.test(t)) {
    color = '#000000';
  }
  if (/white text/.test(t)) color = '#ffffff';
  return { background, border, color };
}

export function buildAssistantBubbleCssBlock({ background, border, color }) {
  return [
    MARKER_START,
    '/* Lumin + dashboard assistant reply bubbles — founder UI preference */',
    '.lumin-msg.assistant,',
    '.msg.assistant {',
    `  background: ${background} !important;`,
    `  border-color: ${border} !important;`,
    `  color: ${color} !important;`,
    '}',
    MARKER_END,
  ].join('\n');
}

export function mergeAssistantBubbleCss(existingContent, block) {
  const text = String(existingContent || '');
  if (text.includes(MARKER_START) && text.includes(MARKER_END)) {
    const re = new RegExp(`${MARKER_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${MARKER_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    return text.replace(re, block);
  }
  const trimmed = text.trimEnd();
  return trimmed ? `${trimmed}\n\n${block}\n` : `${block}\n`;
}

export function applyAssistantBubbleCssPatch({ root, task }) {
  if (!isCssOnlyUiFeedback(task)) return { ok: false, reason: 'not_css_only_ui' };
  const colors = parseAssistantBubbleColors(task);
  if (!colors) return { ok: false, reason: 'no_color_intent' };
  const rel = ASSISTANT_BUBBLE_CSS_TARGET;
  const abs = path.join(root, rel);
  const prior = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
  const block = buildAssistantBubbleCssBlock(colors);
  const merged = mergeAssistantBubbleCss(prior, block);
  return { ok: true, target_file: rel, output: merged, colors, patch: 'assistant_bubble_css' };
}

export async function commitCssPatchViaBuilder({ baseUrl, commandKey, patchResult }) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  const res = await fetch(`${base}/api/v1/lifeos/builder/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-command-key': commandKey },
    body: JSON.stringify({
      output: patchResult.output,
      target_file: patchResult.target_file,
      commit_message: `[system-build] CSS patch ${patchResult.patch} — founder UI color`,
    }),
  });
  const json = await res.json();
  return { status: res.status, json };
}
