/**
 * extension/content.js — Lumin Universal Overlay
 * Injected into every web page. Thin launcher (~4KB bundled).
 *
 * Responsibilities:
 *   1. Inject the overlay iframe (served from Railway — real-time updates)
 *   2. Bridge postMessages between the iframe and the host page DOM
 *   3. Run struggle detection on the host page
 *   4. Handle "OVERLAY_UPDATE_AVAILABLE" notifications from background
 *
 * IMPORTANT: This file MUST remain small. All UI logic lives in frame.html
 * which is served from the Railway server. Changes to overlay UI/features
 * deploy to ALL users instantly without an extension store update.
 *
 * @ssot docs/projects/AMENDMENT_37_UNIVERSAL_OVERLAY.md
 */

(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────────
  const FRAME_ORIGIN  = 'https://lumin-lifeos.up.railway.app';
  const FRAME_PATH    = '/extension/frame.html';
  const VERSION_PATH  = '/extension/version.json';
  const OVERLAY_ID    = '__lumin_overlay_root__';

  // Don't inject on our own domain (LifeOS shell has its own overlay)
  if (location.hostname.includes('lumin-lifeos') || location.hostname.includes('railway.app')) return;
  // Don't inject on chrome:// or extension:// pages
  if (location.protocol === 'chrome-extension:' || location.protocol === 'chrome:') return;
  // Don't inject twice
  if (document.getElementById(OVERLAY_ID)) return;

  // ── State ───────────────────────────────────────────────────────────────────
  let frameReady  = false;
  let authState   = { token: '', commandKey: '', user: '', authenticated: false };
  let updateAvailable = false;

  // ── Bootstrap auth from background ─────────────────────────────────────────
  chrome.runtime.sendMessage({ type: 'GET_AUTH' }, (res) => {
    if (res) authState = res;
  });

  // ── Get current overlay version + build frame URL ──────────────────────────
  let frameVersion = '';
  chrome.runtime.sendMessage({ type: 'GET_VERSION' }, (res) => {
    frameVersion = res?.version || '';
    injectOverlay(frameVersion);
  });

  // ── Inject the overlay ──────────────────────────────────────────────────────
  function injectOverlay(version) {
    const root = document.createElement('div');
    root.id = OVERLAY_ID;
    root.style.cssText = [
      'position:fixed',
      'bottom:20px',
      'right:20px',
      'z-index:2147483647',
      'pointer-events:none',
      'font-family:inherit',
      'width:0',
      'height:0',
    ].join(';');

    // The iframe — all overlay UI lives here
    const ts    = version || Date.now();
    const src   = `${FRAME_ORIGIN}${FRAME_PATH}?v=${ts}&host=${encodeURIComponent(location.hostname)}`;
    const frame = document.createElement('iframe');
    frame.id    = '__lumin_frame__';
    frame.src   = src;
    frame.style.cssText = [
      'position:fixed',
      'bottom:0',
      'right:0',
      'width:72px',          // starts as trigger button size
      'height:72px',
      'border:none',
      'background:transparent',
      'z-index:2147483647',
      'pointer-events:auto',
      'transition:width 0.3s ease,height 0.3s ease',
      'border-radius:50%',
      'overflow:hidden',
    ].join(';');
    frame.setAttribute('allowtransparency', 'true');
    frame.setAttribute('frameborder', '0');
    frame.setAttribute('scrolling', 'no');
    frame.setAttribute('title', 'Lumin AI Overlay');
    frame.setAttribute('aria-label', 'Lumin AI Overlay');

    root.appendChild(frame);
    document.body.appendChild(root);

    frame.addEventListener('load', () => {
      frameReady = true;
      // Send initial auth + page context to frame
      postToFrame({ type: 'AUTH_STATE', ...authState });
      postToFrame({ type: 'PAGE_CONTEXT', ...readPageContext() });
    });
  }

  // ── postMessage to frame ────────────────────────────────────────────────────
  function postToFrame(data) {
    const frame = document.getElementById('__lumin_frame__');
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(data, FRAME_ORIGIN);
  }

  // ── Listen to messages from frame ──────────────────────────────────────────
  window.addEventListener('message', (event) => {
    if (event.origin !== FRAME_ORIGIN) return;
    const msg = event.data;
    if (!msg?.type) return;

    switch (msg.type) {

      // Frame asking for page context
      case 'REQUEST_PAGE_CONTEXT':
        postToFrame({ type: 'PAGE_CONTEXT', ...readPageContext() });
        break;

      // Frame wants to expand / collapse the iframe dimensions
      case 'RESIZE_FRAME': {
        const frame = document.getElementById('__lumin_frame__');
        if (!frame) break;
        if (msg.expanded) {
          frame.style.width       = msg.width  || '420px';
          frame.style.height      = msg.height || '600px';
          frame.style.borderRadius = '16px 0 0 0';
          frame.style.bottom      = '0';
          frame.style.right       = '0';
          frame.style.boxShadow   = '-4px 0 40px rgba(0,0,0,0.4)';
        } else {
          frame.style.width       = '72px';
          frame.style.height      = '72px';
          frame.style.borderRadius = '50%';
          frame.style.boxShadow   = 'none';
        }
        break;
      }

      // Frame wants to fill a form field
      case 'FILL_FIELD': {
        const el = findElement(msg.selector, msg.label);
        if (el) {
          nativeFill(el, msg.value);
          postToFrame({ type: 'FILL_RESULT', selector: msg.selector, ok: true });
        } else {
          postToFrame({ type: 'FILL_RESULT', selector: msg.selector, ok: false, error: 'Element not found' });
        }
        break;
      }

      // Frame wants to click something
      case 'CLICK_ELEMENT': {
        const el = findElement(msg.selector, msg.label);
        if (el) {
          el.click();
          postToFrame({ type: 'CLICK_RESULT', selector: msg.selector, ok: true });
        } else {
          postToFrame({ type: 'CLICK_RESULT', selector: msg.selector, ok: false });
        }
        break;
      }

      // Frame wants to scroll to an element
      case 'SCROLL_TO': {
        const el = findElement(msg.selector);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }

      // Frame updated its auth state (user logged in via frame)
      case 'AUTH_UPDATE':
        authState = { token: msg.token || '', commandKey: msg.commandKey || '', user: msg.user || '', authenticated: msg.authenticated };
        chrome.runtime.sendMessage({ type: 'SET_AUTH', ...authState });
        break;

      // Frame wants the latest page context (re-read)
      case 'REFRESH_CONTEXT':
        postToFrame({ type: 'PAGE_CONTEXT', ...readPageContext() });
        break;
    }
  });

  // ── Page context reader ─────────────────────────────────────────────────────
  function readPageContext() {
    const fields = [];
    document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea').forEach(el => {
      if (!isVisible(el)) return;
      fields.push({
        selector:  cssSelector(el),
        type:      el.type || el.tagName.toLowerCase(),
        name:      el.name     || '',
        id:        el.id       || '',
        label:     findLabel(el),
        placeholder: el.placeholder || '',
        value:     el.value    || '',
        required:  el.required || false,
      });
    });

    const selectedText = window.getSelection()?.toString()?.trim() || '';
    const bodyText = (document.body?.innerText || '').slice(0, 2000);

    return {
      url:          location.href,
      hostname:     location.hostname,
      title:        document.title,
      fields,
      selectedText,
      bodyText,
      fieldCount:   fields.length,
    };
  }

  function isVisible(el) {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
  }

  function findLabel(el) {
    // Method 1: explicit label[for]
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) return label.innerText.trim().slice(0, 100);
    }
    // Method 2: wrapping label
    const parent = el.closest('label');
    if (parent) return parent.innerText.trim().slice(0, 100);
    // Method 3: aria-label
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim().slice(0, 100);
    // Method 4: preceding text node / sibling
    const prev = el.previousElementSibling;
    if (prev && ['LABEL', 'SPAN', 'DIV', 'P'].includes(prev.tagName)) return prev.innerText.trim().slice(0, 100);
    return el.placeholder || el.name || '';
  }

  function cssSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    if (el.name) return `[name="${CSS.escape(el.name)}"]`;
    // Build a path
    const path = [];
    let node = el;
    while (node && node !== document.body) {
      let seg = node.tagName.toLowerCase();
      if (node.className) seg += '.' + [...node.classList].slice(0, 2).map(c => CSS.escape(c)).join('.');
      path.unshift(seg);
      node = node.parentElement;
    }
    return path.join(' > ');
  }

  function findElement(selector, labelHint) {
    if (!selector) return null;
    try {
      const el = document.querySelector(selector);
      if (el) return el;
    } catch {}
    // Fall back to label hint matching
    if (labelHint) {
      const lc = labelHint.toLowerCase();
      const candidates = document.querySelectorAll('input, select, textarea');
      for (const c of candidates) {
        if (findLabel(c).toLowerCase().includes(lc)) return c;
      }
    }
    return null;
  }

  // ── React-compatible native fill ────────────────────────────────────────────
  // Standard assignment doesn't trigger React onChange — we need the native setter
  function nativeFill(el, value) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype,
      'value'
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, value);
    } else {
      el.value = value;
    }

    // Dispatch events that React, Vue, and plain JS all listen to
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur',   { bubbles: true }));
  }

  // ── Struggle detection ──────────────────────────────────────────────────────
  const struggle = {
    focusedEl:       null,
    focusStart:      0,
    sameClicks:      {},   // element path → count
    editCycles:      {},   // element id/name → count
    dwellThresholdMs: 90_000,
    clickThreshold:   3,
    editThreshold:    3,
    _notified:       new Set(),
  };

  document.addEventListener('focusin', (e) => {
    if (!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    struggle.focusedEl  = e.target;
    struggle.focusStart = Date.now();
  });

  document.addEventListener('focusout', () => {
    const dwell = Date.now() - struggle.focusStart;
    if (struggle.focusedEl && dwell >= struggle.dwellThresholdMs) {
      const key = cssSelector(struggle.focusedEl);
      if (!struggle._notified.has(key)) {
        struggle._notified.add(key);
        postToFrame({ type: 'STRUGGLE_SIGNAL', signal: 'dwell', element: key, dwellMs: dwell });
      }
    }
    struggle.focusedEl = null;
  });

  document.addEventListener('click', (e) => {
    if (!e.target || e.target === document.body) return;
    const key = cssSelector(e.target);
    struggle.sameClicks[key] = (struggle.sameClicks[key] || 0) + 1;
    if (struggle.sameClicks[key] >= struggle.clickThreshold && !struggle._notified.has('click:' + key)) {
      struggle._notified.add('click:' + key);
      postToFrame({ type: 'STRUGGLE_SIGNAL', signal: 'repeat_click', element: key, count: struggle.sameClicks[key] });
    }
    // Reset on navigation
    if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
      setTimeout(() => { struggle.sameClicks = {}; struggle._notified.clear(); }, 2000);
    }
  });

  // Edit cycle detection (select-all then delete or type, repeatedly)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const el = e.target;
      if (!['INPUT','TEXTAREA'].includes(el.tagName)) return;
      const key = el.id || el.name || cssSelector(el);
      struggle.editCycles[key] = (struggle.editCycles[key] || 0) + 1;
      if (struggle.editCycles[key] >= struggle.editThreshold && !struggle._notified.has('edit:' + key)) {
        struggle._notified.add('edit:' + key);
        postToFrame({ type: 'STRUGGLE_SIGNAL', signal: 'edit_cycle', element: key, count: struggle.editCycles[key] });
      }
    }
  });

  // Reset struggle state on page navigation
  window.addEventListener('popstate', () => {
    struggle.sameClicks  = {};
    struggle.editCycles  = {};
    struggle._notified.clear();
  });

  // ── Update notifications from background ───────────────────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'OVERLAY_UPDATE_AVAILABLE') {
      updateAvailable = true;
      postToFrame({ type: 'UPDATE_AVAILABLE', version: msg.version });
    }
  });

  // ── Context push on URL changes (SPA navigation) ───────────────────────────
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      struggle.sameClicks = {};
      struggle.editCycles = {};
      struggle._notified.clear();
      setTimeout(() => postToFrame({ type: 'PAGE_CONTEXT', ...readPageContext() }), 500);
    }
  }).observe(document.body, { childList: true, subtree: true });

})();
