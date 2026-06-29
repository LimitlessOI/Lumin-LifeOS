/**
 * SYNOPSIS: Mechanical voice "send it" wire for Lumin drawer — no whole-file HTML rewrite.
 * Mechanical voice "send it" wire for Lumin drawer — no whole-file HTML rewrite.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  CANONICAL_FOUNDER_UI_TARGET,
  extractTargetFileFromInstruction,
  inferTargetFileFromFounderFeedback,
} from './builder-instruction-target.js';

export const VOICE_SEND_APP_TARGET = CANONICAL_FOUNDER_UI_TARGET;
const MARKER_START = '/* founder-lumin-voice-send:start';
const MARKER_END = '/* founder-lumin-voice-send:end */';
const VOICE_CHAT_SCRIPT = '<script src="/shared/lifeos-voice-chat.js?v=20260626"></script>';

const VOICE_SEND_BLOCK = `${MARKER_START} — mechanical voice "send it" wire */
let luminDrawerVoiceCtrl = null;
let luminSpaceMicHeld = false;

function initLuminDrawerVoiceSend() {
  if (!window.LifeOSVoiceChat || luminDrawerVoiceCtrl) return;
  const input = document.getElementById('lumin-input');
  const micBtn = document.getElementById('lumin-mic-btn');
  if (!input || !micBtn) return;
  micBtn.onclick = null;
  luminDrawerVoiceCtrl = LifeOSVoiceChat.attach({
    inputId: 'lumin-input',
    buttonId: 'lumin-mic-btn',
    iconOnly: true,
    idleText: 'Tap mic or hold Space — say "send it" to post',
    voiceSendEnabled: true,
    voiceSendPhrases: ['send it', 'send message', 'send that', 'send now'],
    voiceSendRequireFinal: true,
    manualSendOnly: true,
    keepListeningOnVoiceSend: true,
    persistentListen: false,
    onVoiceSend: (text) => {
      const msg = String(text || '').trim();
      if (!msg || luminState.sending) return;
      luminSend({ text: msg, voice: true });
    },
    silenceAutoSendMs: 0,
    sendOnMicStop: false,
  });
  if (!window.__luminDrawerSpacePtt) {
    window.__luminDrawerSpacePtt = true;
    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || e.repeat) return;
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'textarea' || tag === 'input' || e.target?.isContentEditable) return;
      if (!luminState.open) return;
      e.preventDefault();
      if (!luminSpaceMicHeld && luminDrawerVoiceCtrl) {
        luminSpaceMicHeld = true;
        luminDrawerVoiceCtrl.startMic();
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.code !== 'Space' || !luminSpaceMicHeld) return;
      luminSpaceMicHeld = false;
      if (luminDrawerVoiceCtrl) luminDrawerVoiceCtrl.stopMic();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => { initLuminDrawerVoiceSend(); });
${MARKER_END}
`;

export function isVoiceSendWireOrder(task = '') {
  const t = String(task || '');
  if (!/\b(voice|dictat|mic|send it|speech)\b/i.test(t)) return false;
  if (!/\b(send|post|submit|message|click send)\b/i.test(t)) return false;
  const explicit = extractTargetFileFromInstruction(t);
  if (explicit && !/lifeos-app\.html/i.test(explicit)) return false;
  const inferred = inferTargetFileFromFounderFeedback(t);
  if (explicit) return true;
  return inferred?.source === 'voice_send_heuristic'
    || inferred?.target_file === VOICE_SEND_APP_TARGET;
}

function insertVoiceChatScript(html) {
  let out = String(html || '');
  if (out.includes('lifeos-voice-chat.js')) return out;
  const anchor = '<script src="/overlay/lifeos-voice.js';
  const idx = out.indexOf(anchor);
  if (idx === -1) return out;
  const lineEnd = out.indexOf('</script>', idx);
  if (lineEnd === -1) return out;
  const insertAt = lineEnd + '</script>'.length;
  return `${out.slice(0, insertAt)}\n  ${VOICE_CHAT_SCRIPT}${out.slice(insertAt)}`;
}

function insertVoiceSendBlock(html) {
  let out = String(html || '');
  if (out.includes(MARKER_START)) return { output: out, already_present: true };
  const anchor = '/* Voice input for Lumin drawer */';
  const idx = out.indexOf(anchor);
  if (idx === -1) return { output: out, already_present: false, anchor_missing: true };
  return {
    output: `${out.slice(0, idx)}${VOICE_SEND_BLOCK}\n\n${out.slice(idx)}`,
    already_present: false,
  };
}

function patchDictateThenSendFlag(html) {
  return String(html || '').replace(
    /dictate_then_send:\s*false,/,
    'dictate_then_send: voiceTurn,',
  );
}

function patchLuminVoiceInputFallback(html) {
  const fn = `function luminVoiceInput() {
  if (window.LifeOSVoiceChat) {
    initLuminDrawerVoiceSend();
    luminDrawerVoiceCtrl?.startMic();
    return;
  }
  if (!window.LuminVoice) return;
  const input  = document.getElementById('lumin-input');
  const micBtn = document.getElementById('lumin-mic-btn');
  LuminVoice.startForInput(input, micBtn);
}`;
  return String(html || '').replace(
    /function luminVoiceInput\(\)\s*\{[\s\S]*?\n\}/,
    fn,
  );
}

export function applyVoiceSendWirePatch({ root, task }) {
  if (!isVoiceSendWireOrder(task)) {
    return { ok: false, reason: 'not_voice_send_wire' };
  }
  const abs = path.join(root, VOICE_SEND_APP_TARGET);
  if (!fs.existsSync(abs)) return { ok: false, reason: 'target_missing' };

  const existing = fs.readFileSync(abs, 'utf8');
  if (existing.includes(MARKER_START) && existing.includes('lifeos-voice-chat.js')) {
    return {
      ok: true,
      patch: 'voice_send_wire',
      files: [{ target_file: VOICE_SEND_APP_TARGET, output: existing }],
      already_present: true,
    };
  }

  let output = existing;
  output = insertVoiceChatScript(output);
  const block = insertVoiceSendBlock(output);
  if (block.anchor_missing) {
    return { ok: false, reason: 'voice_input_anchor_missing' };
  }
  output = block.output;
  output = patchDictateThenSendFlag(output);
  output = patchLuminVoiceInputFallback(output);

  if (output === existing) {
    return {
      ok: true,
      patch: 'voice_send_wire',
      files: [{ target_file: VOICE_SEND_APP_TARGET, output: existing }],
      already_present: true,
    };
  }

  return {
    ok: true,
    patch: 'voice_send_wire',
    files: [{ target_file: VOICE_SEND_APP_TARGET, output }],
    already_present: false,
  };
}

export async function commitVoiceSendPatchViaBuilder({
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
        commit_message: `[system-build] Voice send wire ${patchResult.patch}`,
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
