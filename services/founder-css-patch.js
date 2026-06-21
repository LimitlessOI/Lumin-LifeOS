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
export const SW_TARGET = 'public/overlay/sw.js';
export const FOUNDER_CSS_BATCH_FILES = [
  ASSISTANT_BUBBLE_CSS_TARGET,
  DASHBOARD_HTML_TARGET,
  APP_HTML_TARGET,
  SW_TARGET,
];
const MARKER_START = '/* founder-assistant-bubble-style:start */';
const MARKER_END = '/* founder-assistant-bubble-style:end */';

const NAMED_COLORS = {
  yellow: { background: '#ffeb3b', border: '#f9d800', color: '#000000' },
  blue: { background: '#2196f3', border: '#1976d2', color: '#ffffff' },
  red: { background: '#f44336', border: '#d32f2f', color: '#ffffff' },
  green: { background: '#4caf50', border: '#388e3c', color: '#000000' },
  purple: { background: '#9c27b0', border: '#7b1fa2', color: '#ffffff' },
  orange: { background: '#ff9800', border: '#f57c00', color: '#000000' },
  pink: { background: '#e91e63', border: '#c2185b', color: '#ffffff' },
  white: { background: '#ffffff', border: '#cccccc', color: '#000000' },
  black: { background: '#111111', border: '#333333', color: '#ffffff' },
};

export function replaceCssRuleBlock(html, selector, replacement) {
  const text = String(html || '');
  const idx = text.search(selector);
  if (idx === -1) return text;
  const braceStart = text.indexOf('{', idx);
  if (braceStart === -1) return text;
  let depth = 1;
  let i = braceStart + 1;
  while (i < text.length && depth > 0) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') depth -= 1;
    i += 1;
  }
  return `${text.slice(0, idx)}${replacement.trim()}\n${text.slice(i)}`;
}

export function parseAssistantBubbleColors(task = '') {
  const t = String(task || '').toLowerCase();
  if (!/(color|colour|background|font|yellow|blue|red|green|purple|orange|pink|black|white|#[0-9a-f]{3,8}|response|reply|assistant|message|bubble)/i.test(t)) {
    return null;
  }

  let background = '#1e2030';
  let border = '#3d4266';
  let color = '#e8e8f0';

  for (const [name, palette] of Object.entries(NAMED_COLORS)) {
    if (new RegExp(`\\b${name}\\b`).test(t)) {
      background = palette.background;
      border = palette.border;
      color = palette.color;
      break;
    }
  }

  const hexes = t.match(/#([0-9a-f]{3,8})/gi) || [];
  if (hexes[0]) background = hexes[0];
  if (hexes[1]) color = hexes[1];
  if (hexes[2]) border = hexes[2];
  else if (hexes[0]) border = hexes[0];

  if (/black text|text black|with black/.test(t)) color = '#000000';
  if (/white text|text white/.test(t)) color = '#ffffff';

  if (/\bresponse|\breply|\bassistant|\bbubble|\bmessage/.test(t) && !/(yellow|blue|red|green|purple|orange|pink|#)/.test(t)) {
    background = NAMED_COLORS.yellow.background;
    border = NAMED_COLORS.yellow.border;
    color = NAMED_COLORS.yellow.color;
  }

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
  const replacement = `.msg.assistant {
align-self: flex-start;
background: ${colors.background};
color: ${colors.color};
border-bottom-left-radius: var(--radius-sm);
border: 1px solid ${colors.border};
}`;
  return replaceCssRuleBlock(html, /\.msg\.assistant\s*\{/, replacement);
}

export function patchInlineAppAssistant(html, colors) {
  const replacement = `    .lumin-msg.assistant {
      align-self: flex-start;
      background: ${colors.background};
      border: 1px solid ${colors.border};
      color: ${colors.color};
      border-bottom-left-radius: 4px;
    }`;
  return replaceCssRuleBlock(html, /\.lumin-msg\.assistant\s*\{/, replacement);
}

export function bumpThemeOverridesHref(html, bust) {
  const token = String(bust || `f${Date.now()}`);
  return String(html || '').replace(
    /href="\/overlay\/lifeos-theme-overrides\.css(?:\?v=[^"]*)?"/g,
    `href="/overlay/lifeos-theme-overrides.css?v=${token}"`,
  );
}

export function bumpServiceWorkerCache(swContent) {
  const ts = `lifeos-${Date.now()}`;
  return String(swContent || '').replace(
    /const\s+CACHE_NAME\s*=\s*['"][^'"]+['"]/,
    `const CACHE_NAME   = '${ts}'`,
  );
}

export function applyAssistantBubbleCssPatch({ root, task, cacheBust = null }) {
  const bust = cacheBust || `f${Date.now()}`;
  if (!isCssOnlyUiFeedback(task)) return { ok: false, reason: 'not_css_only_ui' };
  const colors = parseAssistantBubbleColors(task);
  if (!colors) return { ok: false, reason: 'no_color_intent' };

  const themeAbs = path.join(root, ASSISTANT_BUBBLE_CSS_TARGET);
  const dashAbs = path.join(root, DASHBOARD_HTML_TARGET);
  const appAbs = path.join(root, APP_HTML_TARGET);
  const swAbs = path.join(root, SW_TARGET);
  const block = buildAssistantBubbleCssBlock(colors);
  const themeMerged = mergeAssistantBubbleCss(
    fs.existsSync(themeAbs) ? fs.readFileSync(themeAbs, 'utf8') : '',
    block,
  );
  let dashboardOut = fs.existsSync(dashAbs) ? fs.readFileSync(dashAbs, 'utf8') : '';
  let appOut = fs.existsSync(appAbs) ? fs.readFileSync(appAbs, 'utf8') : '';
  if (!dashboardOut || !appOut) {
    return { ok: false, reason: 'missing_overlay_shell' };
  }
  dashboardOut = bumpThemeOverridesHref(patchInlineDashboardAssistant(dashboardOut, colors), bust);
  appOut = bumpThemeOverridesHref(patchInlineAppAssistant(appOut, colors), bust);

  const files = [
    { target_file: ASSISTANT_BUBBLE_CSS_TARGET, output: themeMerged },
    { target_file: DASHBOARD_HTML_TARGET, output: dashboardOut },
    { target_file: APP_HTML_TARGET, output: appOut },
  ];

  if (!fs.existsSync(swAbs)) {
    return { ok: false, reason: 'missing_service_worker' };
  }
  files.push({
    target_file: SW_TARGET,
    output: bumpServiceWorkerCache(fs.readFileSync(swAbs, 'utf8')),
  });

  return { ok: true, files, colors, patch: 'assistant_bubble_css', cache_bust: bust };
}

export async function commitCssPatchViaBuilder({ baseUrl, commandKey, patchResult, fetchImpl = fetch, timeoutMs = 120000 }) {
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
        commit_message: `[system-build] CSS patch ${patchResult.patch} — ${files.length} files`,
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
