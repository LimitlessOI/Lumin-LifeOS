/**
 * SYNOPSIS: Mechanical Enter-to-send for dashboard + Lumin drawer chat inputs.
 * Mechanical Enter-to-send for dashboard + Lumin drawer chat inputs.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  CANONICAL_FOUNDER_UI_TARGET,
  extractTargetFileFromInstruction,
} from './builder-instruction-target.js';
import { isFounderUiBehaviorChangeRequest } from './chair-intent-signals.js';

export const DASHBOARD_HTML_TARGET = 'public/overlay/lifeos-dashboard.html';
const MARKER = 'founder-enter-send-wire';

const DASHBOARD_TEXTAREA_ONKEYDOWN =
  'onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendMessage();}"';

const DASHBOARD_KEYPRESS_BLOCK = `chatInput.addEventListener('keypress', e => {
if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});`;

export function isEnterKeySendWireOrder(task = '') {
  const t = String(task || '');
  if (isFounderUiBehaviorChangeRequest(t)) return true;
  if (/\b(enter|return key)\b/i.test(t) && /\b(send|post|submit|message|chat)\b/i.test(t)) {
    const explicit = extractTargetFileFromInstruction(t);
    if (explicit && !/dashboard|lifeos-app/i.test(explicit)) return false;
    return true;
  }
  return false;
}

function resolveTargets(task) {
  const ui = isFounderUiBehaviorChangeRequest(task);
  if (ui?.target_file) return [ui.target_file];
  const explicit = extractTargetFileFromInstruction(task);
  if (explicit) return [explicit];
  return [DASHBOARD_HTML_TARGET, CANONICAL_FOUNDER_UI_TARGET];
}

function patchDashboardEnterSend(html) {
  let out = String(html || '');
  if (out.includes(MARKER)) return { output: out, already_present: true };
  if (/id="chat-input"[\s\S]*onkeydown[\s\S]*Enter[\s\S]*sendMessage/.test(out)
    && /chatInput\.addEventListener\('keypress'/.test(out)) {
    return { output: out, already_present: true };
  }

  if (!out.includes(DASHBOARD_TEXTAREA_ONKEYDOWN)) {
    out = out.replace(
      /<textarea id="chat-input" class="chat-input"([^>]*)>/,
      `<textarea id="chat-input" class="chat-input" ${DASHBOARD_TEXTAREA_ONKEYDOWN}$1>`,
    );
  }

  if (!/chatInput\.addEventListener\('keypress'/.test(out)) {
    const anchor = 'sendBtn.addEventListener(\'click\', sendMessage);';
    const idx = out.indexOf(anchor);
    if (idx !== -1) {
      out = `${out.slice(0, idx)}${DASHBOARD_KEYPRESS_BLOCK}\n${out.slice(idx)}`;
    }
  }

  if (!out.includes(MARKER)) {
    out = out.replace(
      '</script>',
      `/* ${MARKER} — Enter sends, Shift+Enter newline */\n</script>`,
    );
  }

  return { output: out, already_present: false };
}

function patchAppLuminEnterSend(html) {
  let out = String(html || '');
  const fn = `function luminHandleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); luminSend(); }
}`;
  if (/function luminHandleKey\(e\)\s*\{[\s\S]*?luminSend\(\)/.test(out)) {
    return { output: out, already_present: true };
  }
  if (out.includes('function luminHandleKey')) {
    out = out.replace(/function luminHandleKey\(e\)\s*\{[\s\S]*?\n\}/, fn);
  }
  return { output: out, already_present: false };
}

export function applyEnterKeySendWirePatch({ root, task }) {
  if (!isEnterKeySendWireOrder(task)) {
    return { ok: false, reason: 'not_enter_send_wire' };
  }

  const files = [];
  for (const target of resolveTargets(task)) {
    const abs = path.join(root, target);
    if (!fs.existsSync(abs)) continue;
    const existing = fs.readFileSync(abs, 'utf8');
    const patch = target.includes('lifeos-app.html')
      ? patchAppLuminEnterSend(existing)
      : patchDashboardEnterSend(existing);
    if (patch.output !== existing || patch.already_present) {
      files.push({ target_file: target, output: patch.output });
    }
  }

  if (!files.length) {
    return { ok: false, reason: 'no_change' };
  }

  const allPresent = files.every((f) => {
    const abs = path.join(root, f.target_file);
    return fs.readFileSync(abs, 'utf8') === f.output;
  });

  return {
    ok: true,
    patch: 'enter_key_send_wire',
    files,
    already_present: allPresent,
  };
}

export async function commitEnterKeySendPatchViaBuilder({
  baseUrl,
  commandKey,
  patchResult,
  fetchImpl = fetch,
  timeoutMs = 120000,
}) {
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
        commit_message: `[system-build] Enter key send wire ${patchResult.patch}`,
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
