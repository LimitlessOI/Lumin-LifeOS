/**
 * SYNOPSIS: Mechanical visual UI patches (border-radius, etc.) — fast path, not full council HTML rewrite.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { bumpServiceWorkerCache } from './founder-css-patch.js';

export const VISUAL_UI_CSS_TARGET = 'public/overlay/lifeos-theme-overrides.css';
export const VISUAL_UI_SW_TARGET = 'public/overlay/sw.js';
export const VISUAL_UI_APP_TARGET = 'public/overlay/lifeos-app.html';
export const VISUAL_UI_DASH_TARGET = 'public/overlay/lifeos-dashboard.html';

const MARKER_START = '/* founder-visual-ui:start */';
const MARKER_END = '/* founder-visual-ui:end */';

export function parseVisualUiIntent(task = '') {
  const t = String(task || '').toLowerCase();
  if (/\b(rounded|round|radius|border-radius)\b/.test(t) && /\b(send|button|lumin)\b/.test(t)) {
    let px = '10px';
    if (/\b(slightly|a bit|little)\b/.test(t)) px = '10px';
    else if (/\b(more|very|extra)\b/.test(t)) px = '14px';
    return { kind: 'lumin_send_rounded', borderRadius: px };
  }
  return null;
}

export function isVisualUiPatchRequest(task = '') {
  return Boolean(parseVisualUiIntent(task));
}

function mergeVisualBlock(cssContent, block) {
  const text = String(cssContent || '');
  if (text.includes(MARKER_START)) {
    const start = text.indexOf(MARKER_START);
    const end = text.indexOf(MARKER_END);
    if (end > start) {
      return `${text.slice(0, start)}${block}\n${text.slice(end + MARKER_END.length)}`.trim();
    }
  }
  return `${text.trim()}\n\n${block}\n`.trim();
}

function bumpThemeHref(html, token) {
  return String(html || '').replace(
    /href="\/overlay\/lifeos-theme-overrides\.css\?v=[^"]+"/,
    `href="/overlay/lifeos-theme-overrides.css?v=${token}"`,
  );
}

export function applyVisualUiPatch({ root, task, cacheBust = null }) {
  const intent = parseVisualUiIntent(task);
  if (!intent) return { ok: false, reason: 'no_visual_intent' };

  const bust = cacheBust || `f${Date.now()}`;
  const block = [
    MARKER_START,
    `#lumin-send-btn, .lumin-send-btn { border-radius: ${intent.borderRadius} !important; }`,
    MARKER_END,
  ].join('\n');

  const themeAbs = path.join(root, VISUAL_UI_CSS_TARGET);
  const appAbs = path.join(root, VISUAL_UI_APP_TARGET);
  const dashAbs = path.join(root, VISUAL_UI_DASH_TARGET);
  const swAbs = path.join(root, VISUAL_UI_SW_TARGET);

  if (!fs.existsSync(themeAbs) || !fs.existsSync(appAbs)) {
    return { ok: false, reason: 'missing_overlay_shell' };
  }

  const themeMerged = mergeVisualBlock(fs.readFileSync(themeAbs, 'utf8'), block);
  const files = [
    { target_file: VISUAL_UI_CSS_TARGET, output: themeMerged },
    { target_file: VISUAL_UI_APP_TARGET, output: bumpThemeHref(fs.readFileSync(appAbs, 'utf8'), bust) },
  ];

  if (fs.existsSync(dashAbs)) {
    files.push({ target_file: VISUAL_UI_DASH_TARGET, output: bumpThemeHref(fs.readFileSync(dashAbs, 'utf8'), bust) });
  }
  if (fs.existsSync(swAbs)) {
    files.push({ target_file: VISUAL_UI_SW_TARGET, output: bumpServiceWorkerCache(fs.readFileSync(swAbs, 'utf8')) });
  }

  return { ok: true, files, intent, patch: 'visual_ui_css', cache_bust: bust };
}
