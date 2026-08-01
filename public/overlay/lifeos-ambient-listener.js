/**
 * SYNOPSIS: LifeOS ambient listening overlay — classic browser script for lifeos-app.html.
 * Initializes on DOMContentLoaded, wires the #lumin-mic-btn toggle, and uses the
 * Web Speech API (SpeechRecognition or vendor-prefixed webkitSpeechRecognition)
 * to stream transcript text into #lumin-input.
 */
(function () {
  'use strict';

  const NAMESPACE = 'LifeOSAmbientListener';
  const STATES = ['off', 'sleeping', 'listening', 'processing'];

  let recognition = null;
  let listening = false;
  let mode = 'off';
  let pauseTimer = null;
  let finalTranscript = '';
  let onStateChange = null;
  let onToast = null;

  function getInput() { return document.getElementById('lumin-input'); }
  function getMicButton() { return document.getElementById('lumin-mic-btn'); }

  function setMode(newMode) {
    if (mode === newMode) return;
    mode = newMode;
    if (typeof onStateChange === 'function') {
      try { onStateChange(newMode); } catch { /* ignore */ }
    }
    updateMicUi();
  }

  function getMode() { return mode; }

  function isEnabled() { return listening; }

  function hasConsent() { return true; }

  function notify(message, kind = 'note') {
    if (typeof onToast === 'function') {
      try { onToast(message, kind); } catch { /* ignore */ }
    }
  }

  function getInterimContainer() {
    let el = document.getElementById('lumin-interim-text');
    if (!el) {
      el = document.createElement('div');
      el.id = 'lumin-interim-text';
      el.className = 'lumin-interim';
      const inputBar = document.querySelector('.lumin-input-bar');
      if (inputBar && inputBar.parentNode) {
        inputBar.parentNode.insertBefore(el, inputBar);
      }
    }
    return el;
  }

  function appendTranscript(text) {
    const input = getInput();
    if (!input) return;
    const current = (input.value || '').trim();
    input.value = current ? `${current} ${text}` : text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  }

  async function sendAmbientCapture(transcript) {
    try {
      await fetch('/api/v1/lifeos/ambient/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, surface: 'lifeos-app', ts: new Date().toISOString() }),
      });
    } catch (err) {
      // Degrade silently if the endpoint is not yet deployed or returns 404.
    }
  }

  function triggerSend() {
    const sendBtn = document.getElementById('lumin-send-btn');
    if (sendBtn && !sendBtn.disabled) sendBtn.click();
  }

  function buildRecognition() {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return null;
    const rec = new SpeechRecognitionCtor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || 'en-US';
    return rec;
  }

  function updateMicUi() {
    const btn = getMicButton();
    if (!btn) return;
    btn.classList.toggle('voice-active', listening);
    btn.title = listening ? 'Ambient listening on (click to stop)' : 'Voice input (tap to toggle)';
    const indicator = getInterimContainer();
    if (!listening) indicator.textContent = '';
  }

  function resetPauseTimer() {
    if (pauseTimer) clearTimeout(pauseTimer);
    pauseTimer = setTimeout(() => {
      if (finalTranscript.trim()) triggerSend();
      finalTranscript = '';
    }, 2000);
  }

  function onRecognitionResult(event) {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      if (result.isFinal) {
        finalTranscript += transcript;
        appendTranscript(transcript);
        getInterimContainer().textContent = '';
        sendAmbientCapture(transcript);
        resetPauseTimer();
      } else {
        interim += transcript;
      }
    }
    if (interim) {
      getInterimContainer().textContent = `${finalTranscript} ${interim}`.trim();
    }
  }

  function onRecognitionError(event) {
    if (event.error === 'not-allowed') stop();
  }

  async function enable() {
    if (listening) return true;
    recognition = buildRecognition();
    if (!recognition) {
      notify('Ambient listener unavailable: SpeechRecognition / webkitSpeechRecognition not supported.', 'error');
      setMode('off');
      return false;
    }

    recognition.onresult = onRecognitionResult;
    recognition.onerror = onRecognitionError;
    recognition.onend = () => {
      if (listening) {
        try { recognition.start(); } catch { /* ignore restart race */ }
      } else {
        setMode('off');
      }
    };

    setMode('listening');
    listening = true;
    finalTranscript = '';
    updateMicUi();

    try {
      recognition.start();
      return true;
    } catch (err) {
      listening = false;
      setMode('off');
      notify('Ambient listener start failed.', 'error');
      return false;
    }
  }

  async function disable() {
    if (!listening) return true;
    listening = false;
    if (pauseTimer) { clearTimeout(pauseTimer); pauseTimer = null; }
    if (recognition) {
      try { recognition.stop(); } catch { /* ignore */ }
      recognition = null;
    }
    setMode('off');
    return true;
  }

  async function toggle() {
    if (listening) return disable();
    return enable();
  }

  function stop() {
    return disable();
  }

  function start() {
    return enable();
  }

  function init(options = {}) {
    onStateChange = options?.onStateChange || null;
    onToast = options?.onToast || null;
    if (hasConsent()) {
      setMode('off');
    } else {
      setMode('off');
    }
    initAmbientListener();
    return true;
  }

  function initAmbientListener() {
    const micBtn = getMicButton();
    if (!micBtn) return;
    micBtn.removeAttribute('onclick');
    micBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggle();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAmbientListener);
  } else {
    initAmbientListener();
  }

  window[NAMESPACE] = {
    init,
    start,
    stop,
    enable,
    disable,
    toggle,
    isEnabled,
    hasConsent,
    getMode,
    STATES,
  };
}());
