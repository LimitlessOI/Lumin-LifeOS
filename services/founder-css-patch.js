/**
 * Mechanical CSS patches for founder UI feedback — no whole-file HTML rewrite.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { isCssOnlyUiFeedback } from './builder-instruction-target.js';

export const ASSISTANT_BUBBLE_CSS_TARGET = 'public/overlay/lifeos-theme-overrides.css';
export const DASHBOARD_HTML_TARGET = 'public/overlay/lifeos-dashboard.html';
export const APP_HTML_TARGET = 'public/overlay/lifeos-app.html';
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
  if (/black text|text black|with black/.test(t)) {
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

export function patchInlineDashboardAssistant(html, colors) {
  return String(html || '').replace(
    /\.msg\.assistant\s*\{[^}]+\}/,
    `.msg.assistant {
align-self: flex-start;
background: ${colors.background};
color: ${colors.color};
border-bottom-left-radius: var(--radius-sm);
border: 1px solid ${colors.border};
}`,
  );
}

export function patchInlineAppAssistant(html, colors) {
  return String(html || '').replace(
    /\.lumin-msg\.assistant\s*\{[^}]+\}/,
    `    .lumin-msg.assistant {
      align-self: flex-start;
      background: ${colors.background};
      border: 1px solid ${colors.border};
      color: ${colors.color};
      border-bottom-left-radius: 4px;
    }`,
  );
}

export function bumpThemeOverridesHref(html, bust) {
  const token = String(bust || '20260621b');
  return String(html || '').replace(
    /href="\/overlay\/lifeos-theme-overrides\.css(?:\?v=[^"]*)?"/g,
    `href="/overlay/lifeos-theme-overrides.css?v=${token}"`,
  );
}

export function applyAssistantBubbleCssPatch({ root, task, cacheBust = '20260621b' }) {
  if (!isCssOnlyUiFeedback(task)) return { ok: false, reason: 'not_css_only_ui' };
  const colors = parseAssistantBubbleColors(task);
  if (!colors) return { ok: false, reason: 'no_color_intent' };

  const themeAbs = path.join(root, ASSISTANT_BUBBLE_CSS_TARGET);
  const dashAbs = path.join(root, DASHBOARD_HTML_TARGET);
  const appAbs = path.join(root, APP_HTML_TARGET);
  const block = buildAssistantBubbleCssBlock(colors);
  const themeMerged = mergeAssistantBubbleCss(
    fs.existsSync(themeAbs) ? fs.readFileSync(themeAbs, 'utf8') : '',
    block,
  );
  let dashboardOut = fs.existsSync(dashAbs) ? fs.readFileSync(dashAbs, 'utf8') : '';
  let appOut = fs.existsSync(appAbs) ? fs.readFileSync(appAbs, 'utf8') : '';
  dashboardOut = bumpThemeOverridesHref(patchInlineDashboardAssistant(dashboardOut, colors), cacheBust);
  appOut = bumpThemeOverridesHref(patchInlineAppAssistant(appOut, colors), cacheBust);

  const files = [
    { target_file: ASSISTANT_BUBBLE_CSS_TARGET, output: themeMerged },
    { target_file: DASHBOARD_HTML_TARGET, output: dashboardOut },
    { target_file: APP_HTML_TARGET, output: appOut },
  ];

  return { ok: true, files, colors, patch: 'assistant_bubble_css', cache_bust: cacheBust };
}

export async function commitCssPatchViaBuilder({ baseUrl, commandKey, patchResult }) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  const files = patchResult.files || [{
    target_file: patchResult.target_file,
    output: patchResult.output,
  }];
  let lastJson = {};
  let lastStatus = 200;
  for (const file of files) {
    const res = await fetch(`${base}/api/v1/lifeos/builder/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-command-key': commandKey },
      body: JSON.stringify({
        output: file.output,
        target_file: file.target_file,
        commit_message: `[system-build] CSS patch ${patchResult.patch} — ${file.target_file}`,
      }),
    });
    lastJson = await res.json();
    lastStatus = res.status;
    if (!lastJson.ok || !lastJson.committed) {
      return { status: lastStatus, json: lastJson, failed_file: file.target_file };
    }
  }
  return { status: lastStatus, json: lastJson, committed_files: files.map((f) => f.target_file) };
}
