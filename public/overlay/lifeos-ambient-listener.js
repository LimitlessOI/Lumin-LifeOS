/**
 * SYNOPSIS: LifeOS ambient listening overlay — classic browser script for lifeos-app.html.
 * Initializes on DOMContentLoaded, wires the #lumin-mic-btn toggle, and uses the
 * Web Speech API (SpeechRecognition or vendor-prefixed webkitSpeechRecognition)
 * to stream transcript text into #lumin-input.
 */
(function () {
  'use strict';

  const NAMESPACE = 'LifeOSAmbientListener';

  function getInput() {
    return document.getElementById('lumin-input');
  }

  function getMicButton() {
    return document.getElementById('lumin-mic-btn');
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

  const LifeOSAmbientListener = {
    listening: false,
    recognition: null,
    pauseTimer: null,
    finalTranscript: '',

    toggle() {
      if (this.listening) {
        this.stop();
      } else {
        this.start();
      }
    },

    start() {
      if (this.listening) return;
      this.recognition = buildRecognition();
      if (!this.recognition) {
        // eslint-disable-next-line no-console
        console.warn('Ambient listener unavailable: SpeechRecognition / webkitSpeechRecognition not supported.');
        return;
      }

      this.listening = true;
      this.finalTranscript = '';
      this.updateMicUi();

      this.recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          if (result.isFinal) {
            this.finalTranscript += transcript;
            appendTranscript(transcript);
            getInterimContainer().textContent = '';
            sendAmbientCapture(transcript);
            this.resetPauseTimer();
          } else {
            interim += transcript;
          }
        }
        if (interim) {
          getInterimContainer().textContent = `${this.finalTranscript} ${interim}`.trim();
        }
      };

      this.recognition.onerror = (event) => {
        if (event.error === 'not-allowed') this.stop();
      };

      this.recognition.onend = () => {
        if (this.listening) {
          try { this.recognition.start(); } catch { /* ignore restart race */ }
        } else {
          this.updateMicUi();
        }
      };

      try {
        this.recognition.start();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Ambient listener start failed:', err);
        this.listening = false;
        this.updateMicUi();
      }
    },

    stop() {
      this.listening = false;
      if (this.pauseTimer) {
        clearTimeout(this.pauseTimer);
        this.pauseTimer = null;
      }
      if (this.recognition) {
        try { this.recognition.stop(); } catch { /* ignore */ }
        this.recognition = null;
      }
      this.updateMicUi();
    },

    resetPauseTimer() {
      if (this.pauseTimer) clearTimeout(this.pauseTimer);
      this.pauseTimer = setTimeout(() => {
        if (this.finalTranscript.trim()) triggerSend();
        this.finalTranscript = '';
      }, 2000);
    },

    updateMicUi() {
      const btn = getMicButton();
      if (!btn) return;
      btn.classList.toggle('voice-active', this.listening);
      btn.title = this.listening ? 'Ambient listening on (click to stop)' : 'Voice input (tap to toggle)';
      const indicator = getInterimContainer();
      if (!this.listening) indicator.textContent = '';
    },
  };

  function initAmbientListener() {
    const micBtn = getMicButton();
    if (!micBtn) return;
    // Remove the inline handler so the ambient listener controls toggling.
    micBtn.removeAttribute('onclick');
    micBtn.addEventListener('click', (e) => {
      e.preventDefault();
      LifeOSAmbientListener.toggle();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAmbientListener);
  } else {
    initAmbientListener();
  }

  window[NAMESPACE] = LifeOSAmbientListener;
}());
