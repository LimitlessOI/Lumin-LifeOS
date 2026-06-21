/**
 * SYNOPSIS: js — public/shared/lifeos-founder-bubble-proof.js.
 */
(function (global) {
  'use strict';

  function rgbToHex(rgb) {
    const m = String(rgb || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return null;
    const hex = (n) => Number(n).toString(16).padStart(2, '0');
    return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
  }

  function normalizeHex(value) {
    const v = String(value || '').trim().toLowerCase();
    if (!v) return null;
    if (v.startsWith('#') && v.length === 4) {
      return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
    }
    return v;
  }

  function probeAssistantBubbleCss(className) {
    const probe = document.createElement('div');
    probe.className = className;
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;';
    document.body.appendChild(probe);
    const style = getComputedStyle(probe);
    const bg = normalizeHex(rgbToHex(style.backgroundColor));
    const color = normalizeHex(rgbToHex(style.color));
    probe.remove();
    return { background: bg, color };
  }

  function verifyFounderBubbleColors(expected) {
    const wantBg = normalizeHex(expected?.background);
    const wantColor = normalizeHex(expected?.color);
    const dash = probeAssistantBubbleCss('msg assistant');
    const app = probeAssistantBubbleCss('lumin-msg assistant');
    const ok = Boolean(
      wantBg && wantColor
      && dash.background === wantBg
      && dash.color === wantColor
      && app.background === wantBg
      && app.color === wantColor,
    );
    return {
      ok,
      expected: { background: wantBg, color: wantColor },
      dashboard: dash,
      app,
    };
  }

  global.LifeOSFounderBubbleProof = { verifyFounderBubbleColors, probeAssistantBubbleCss };
})(typeof window !== 'undefined' ? window : globalThis);
