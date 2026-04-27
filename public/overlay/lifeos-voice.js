/**
 * lifeos-voice.js — Global voice-to-text utility for LifeOS overlays
 *
 * Usage:
 *   <script src="/overlay/lifeos-voice.js"></script>
 *
 * On any input/textarea, add data-voice="true" to get an auto-injected mic icon.
 * Or call LuminVoice.startForInput(el) programmatically.
 * Call LuminVoice.toggleAlwaysListen(onTranscript) for continuous mode.
 *
 * Battery / privacy: when the tab or PWA is hidden, always-listen suspends
 * (mic released, wake lock released). On phones (coarse pointer), screen wake
 * lock is skipped by default — use LuminVoice.configure({ wakeLock: 'always' })
 * only if you accept extra drain.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
(function () {
  'use strict';

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;

  const state = {
    alwaysOn:     false,
    recognizer:   null,
    onTranscript: null,   // callback for always-on transcripts
    _injectDone:  false,
    _wakeLock:    null,   // WakeLockSentinel
    _hourlyTimer: null,   // setInterval handle for hourly restarts
    _startTime:   null,   // when the current always-on session started
    /** True while user wants always-on but we paused because document is hidden */
    suspendedHidden: false,
    /** null = auto (no wake lock on coarse pointer / phones), 'never' | 'always' */
    wakeLockPreference: null,
  };

  const HOUR_MS = 60 * 60 * 1000; // 1 hour — full loop restart interval

  function _isCoarsePointer() {
    try {
      return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    } catch {
      return false;
    }
  }

  function _wakeLockAllowed() {
    if (state.wakeLockPreference === 'never') return false;
    if (state.wakeLockPreference === 'always') return true;
    if (document.hidden) return false;
    if (_isCoarsePointer()) return false;
    return true;
  }

  function _restartHourlyTimer() {
    clearInterval(state._hourlyTimer);
    state._hourlyTimer = null;
    state._hourlyTimer = setInterval(() => {
      if (!state.alwaysOn || state.suspendedHidden) return;
      console.log('[LuminVoice] Hourly restart — cycling mic session');
      try { state.recognizer?.stop(); } catch {}
    }, HOUR_MS);
  }

  /* ── Public API ──────────────────────────────────────────── */

  const LuminVoice = {

    supported: !!SR,

    /**
     * @param {{ wakeLock?: 'auto' | 'never' | 'always' }} opts
     *   auto — default: no wake lock on touch-first devices; desktop may request wake lock when visible
     */
    configure(opts = {}) {
      const w = opts.wakeLock;
      if (w === 'never' || w === 'always') state.wakeLockPreference = w;
      else if (w === 'auto' || w == null) state.wakeLockPreference = null;
      if (state.wakeLockPreference === 'never' || !_wakeLockAllowed()) _releaseWakeLock();
    },

    /**
     * Start a single-shot voice capture and append result to `el`.
     * Shows a brief active state on the mic button while recording.
     */
    startForInput(el, micBtn) {
      if (!SR) { _noSupport(); return; }
      if (state.alwaysOn) return; // don't compete with always-on

      const rec = new SR();
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      if (micBtn) micBtn.classList.add('voice-active');

      rec.onresult = (e) => {
        const t = e.results[0][0].transcript;
        el.value += (el.value ? ' ' : '') + t;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        // auto-resize if the element has a resize handler
        if (typeof el.oninput === 'function') el.oninput();
        if (micBtn) micBtn.classList.remove('voice-active');
      };
      rec.onerror = () => {
        if (micBtn) micBtn.classList.remove('voice-active');
      };
      rec.onend = () => {
        if (micBtn) micBtn.classList.remove('voice-active');
      };
      rec.start();
    },

    /**
     * Toggle continuous listening mode.
     * While active, every utterance fires onTranscript(text).
     * Visual: shell's global mic button pulses red.
     */
    toggleAlwaysListen(onTranscript) {
      if (!SR) { _noSupport(); return false; }

      if (state.alwaysOn) {
        _stopAlwaysOn();
        return false;
      } else {
        state.onTranscript = onTranscript;
        _startAlwaysOn();
        return true;
      }
    },

    isAlwaysOn() { return state.alwaysOn; },

    /**
     * Auto-inject mic icons next to every input/textarea with data-voice="true".
     * Called once on DOMContentLoaded by this script.
     */
    injectMicIcons() {
      if (state._injectDone) return;
      state._injectDone = true;

      document.querySelectorAll('[data-voice="true"]').forEach(el => {
        _wrapWithMic(el);
      });

      // Also observe future DOM additions
      if (window.MutationObserver) {
        const obs = new MutationObserver((mutations) => {
          mutations.forEach(m => m.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            if (node.matches?.('[data-voice="true"]')) _wrapWithMic(node);
            node.querySelectorAll?.('[data-voice="true"]').forEach(_wrapWithMic);
          }));
        });
        obs.observe(document.body, { childList: true, subtree: true });
      }
    },
  };

  /* ── Internals ───────────────────────────────────────────── */

  function _suspendForHiddenTab() {
    if (!state.alwaysOn || state.suspendedHidden) return;
    state.suspendedHidden = true;
    clearInterval(state._hourlyTimer);
    state._hourlyTimer = null;
    try { state.recognizer?.stop(); } catch {}
    state.recognizer = null;
    _releaseWakeLock();
    document.dispatchEvent(new CustomEvent('lumin-voice-interim', { detail: '' }));
    _setGlobalMicState(false);
  }

  function _resumeAfterVisible() {
    if (!state.alwaysOn || !state.suspendedHidden) return;
    state.suspendedHidden = false;
    _spawnRecognizer();
    _acquireWakeLock();
    _restartHourlyTimer();
    _setGlobalMicState(true);
  }

  function _startAlwaysOn() {
    state.alwaysOn  = true;
    state.suspendedHidden = false;
    state._startTime = Date.now();
    if (!document.hidden) {
      _acquireWakeLock();
      _spawnRecognizer();
      _restartHourlyTimer();
    } else {
      state.suspendedHidden = true;
    }
    _setGlobalMicState(!state.suspendedHidden);
  }

  function _spawnRecognizer() {
    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      if (final.trim() && state.onTranscript) {
        state.onTranscript(final.trim(), false);
      }
      if (interim) {
        document.dispatchEvent(new CustomEvent('lumin-voice-interim', { detail: interim }));
      }
    };

    rec.onend = () => {
      // Clear interim indicator
      document.dispatchEvent(new CustomEvent('lumin-voice-interim', { detail: '' }));
      if (state.alwaysOn && !state.suspendedHidden) {
        // Brief pause then restart (browser sometimes needs a moment)
        setTimeout(() => {
          if (state.alwaysOn && !state.suspendedHidden) _spawnRecognizer();
        }, 300);
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        // Mic permission denied — stop everything
        _stopAlwaysOn();
        document.dispatchEvent(new CustomEvent('lumin-voice-error', { detail: 'permission-denied' }));
      }
      // For 'no-speech', 'network', 'aborted' — let onend handle restart
    };

    state.recognizer = rec;
    try { rec.start(); } catch {}
  }

  function _stopAlwaysOn() {
    state.alwaysOn = false;
    state.suspendedHidden = false;
    clearInterval(state._hourlyTimer);
    state._hourlyTimer = null;
    try { state.recognizer?.stop(); } catch {}
    state.recognizer = null;
    _releaseWakeLock();
    _setGlobalMicState(false);
    document.dispatchEvent(new CustomEvent('lumin-voice-interim', { detail: '' }));
  }

  /* ── Wake Lock (keeps screen on while always-listening) ─── */
  async function _acquireWakeLock() {
    if (!_wakeLockAllowed()) return;
    if (!('wakeLock' in navigator)) return; // not supported
    try {
      state._wakeLock = await navigator.wakeLock.request('screen');
      state._wakeLock.addEventListener('release', () => {
        if (state.alwaysOn && !state.suspendedHidden && _wakeLockAllowed()) _acquireWakeLock();
      });
    } catch {
      // Not fatal — device may just dim the screen
    }
  }

  function _releaseWakeLock() {
    try { state._wakeLock?.release(); } catch {}
    state._wakeLock = null;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      _suspendForHiddenTab();
    } else if (state.alwaysOn) {
      _resumeAfterVisible();
      if (!state._wakeLock && _wakeLockAllowed()) _acquireWakeLock();
    }
  });

  function _setGlobalMicState(active) {
    // Notify shell mic buttons (they may not exist in every overlay)
    document.dispatchEvent(new CustomEvent('lumin-voice-state', { detail: { active } }));
    // Also directly toggle class if the shell buttons exist
    ['voice-btn', 'voice-btn-mob'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('voice-active', active);
    });
  }

  function _wrapWithMic(el) {
    if (el.dataset.voiceWrapped) return;
    el.dataset.voiceWrapped = 'true';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;display:inline-flex;width:100%;';

    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'voice-mic-btn';
    btn.title = 'Voice input';
    btn.textContent = '🎙';
    btn.setAttribute('aria-label', 'Voice input');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      LuminVoice.startForInput(el, btn);
    });

    wrapper.appendChild(btn);

    // Inject style once
    if (!document.getElementById('lumin-voice-style')) {
      const style = document.createElement('style');
      style.id = 'lumin-voice-style';
      style.textContent = `
        .voice-mic-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          font-size: 15px;
          cursor: pointer;
          opacity: 0.45;
          transition: opacity 0.15s;
          padding: 4px;
          line-height: 1;
          z-index: 10;
        }
        .voice-mic-btn:hover { opacity: 0.9; }
        .voice-mic-btn.voice-active { opacity: 1; animation: voice-pulse 0.8s infinite; }
        @keyframes voice-pulse {
          0%, 100% { opacity: 1; transform: translateY(-50%) scale(1); }
          50%       { opacity: 0.5; transform: translateY(-50%) scale(1.2); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  function _noSupport() {
    // Only show once per page
    if (!_noSupport._shown) {
      _noSupport._shown = true;
      // Non-blocking — just a small toast if the shell has one
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = 'Voice input requires Chrome or Safari.';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
      }
    }
  }

  /* ── Auto-init ───────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => LuminVoice.injectMicIcons());
  } else {
    LuminVoice.injectMicIcons();
  }

  LuminVoice.configure({ wakeLock: 'auto' });

  window.LuminVoice = LuminVoice;
})();
