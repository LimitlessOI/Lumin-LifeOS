/**
 * SYNOPSIS: Opt-in ambient voice listener — sleeps when silent, wakes on speech, sends finals to /ambient/process.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
(function (global) {
  const SpeechRecognitionCtor = global.SpeechRecognition || global.webkitSpeechRecognition || null;
  const STORAGE_ENABLED = 'lifeos_ambient_enabled';
  const STORAGE_CONSENT = 'lifeos_ambient_consent_v1';
  const SLEEP_AFTER_MS = 8000;
  const MIN_UTTERANCE_CHARS = 14;
  const DEDUPE_MS = 12000;

  const state = {
    mode: 'off',
    recognition: null,
    sessionEpoch: 0,
    lastSpeechAt: 0,
    sleepTimer: null,
    lastSentHash: '',
    lastSentAt: 0,
    processing: false,
    onStateChange: null,
    onToast: null,
  };

  function hashText(t) {
    return String(t || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function getContext() {
    return global.LifeOSBootstrap?.getLifeOSContext?.({ promptForKey: false })
      || global.LifeOSAuth?.()
      || null;
  }

  async function apiFetch(url, options = {}) {
    const ctx = getContext();
    const payload = {
      credentials: 'same-origin',
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };
    if (ctx?.fetchWithAuth) {
      return ctx.fetchWithAuth(url, payload);
    }
    if (ctx?.headers) {
      payload.headers = ctx.headers(payload.headers);
    }
    return fetch(url, payload);
  }

  function setMode(mode) {
    state.mode = mode;
    if (typeof state.onStateChange === 'function') {
      try { state.onStateChange(mode); } catch (_) {}
    }
  }

  function clearSleepTimer() {
    if (state.sleepTimer) {
      clearTimeout(state.sleepTimer);
      state.sleepTimer = null;
    }
  }

  function scheduleSleepCheck() {
    clearSleepTimer();
    state.sleepTimer = setTimeout(() => {
      if (!isEnabled()) return;
      const silentFor = Date.now() - state.lastSpeechAt;
      if (silentFor >= SLEEP_AFTER_MS && !state.processing) {
        setMode('sleeping');
      }
    }, SLEEP_AFTER_MS + 200);
  }

  function markSpeechActivity() {
    state.lastSpeechAt = Date.now();
    if (isEnabled() && !state.processing) setMode('listening');
    scheduleSleepCheck();
  }

  function isEnabled() {
    return global.localStorage?.getItem(STORAGE_ENABLED) === '1';
  }

  function hasConsent() {
    return global.localStorage?.getItem(STORAGE_CONSENT) === '1';
  }

  function showToast(message, kind) {
    if (typeof state.onToast === 'function') {
      try { state.onToast(message, kind); } catch (_) {}
    }
  }

  async function sendUtterance(text) {
    const body = String(text || '').trim();
    if (body.length < MIN_UTTERANCE_CHARS) return;

    const h = hashText(body);
    const now = Date.now();
    if (h === state.lastSentHash && now - state.lastSentAt < DEDUPE_MS) return;

    state.lastSentHash = h;
    state.lastSentAt = now;
    state.processing = true;
    setMode('processing');

    try {
      const ctx = getContext();
      const res = await apiFetch('/api/v1/lifeos/ambient/process', {
        method: 'POST',
        body: JSON.stringify({
          user: ctx?.USER || global.localStorage?.getItem('lifeos_user') || 'adam',
          text: body,
          channel: 'ambient_voice',
          auto_apply_commitments: true,
          metadata: { client: 'lifeos-ambient-listener', captured_at: new Date().toISOString() },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        showToast('Sign in to save ambient notes — opening login…', 'error');
        if (ctx?.requireAuth) {
          ctx.requireAuth('/overlay/lifeos-login.html');
        }
        return;
      }
      if (!res.ok) {
        showToast(data.error || 'Ambient capture failed', 'error');
        return;
      }
      if (data.persisted && data.disposition !== 'ignore') {
        const momentHint = Array.isArray(data.moments) && data.moments.length
          ? ` · ${data.moments.map((m) => m.type).join(', ')}`
          : '';
        const label = data.disposition === 'commitment'
          ? `Commitment logged: ${(data.commitments?.[0]?.title || body).slice(0, 80)}${momentHint}`
          : data.disposition === 'renegotiate'
            ? (data.feedback || 'Commitment renegotiated') + momentHint
            : data.disposition === 'moment'
              ? (data.feedback || 'Saved from ambient listen')
              : (data.feedback || 'Noted for your twin') + momentHint;
        showToast(label, data.disposition);
      }
    } catch (err) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      state.processing = false;
      if (isEnabled()) {
        setMode(Date.now() - state.lastSpeechAt >= SLEEP_AFTER_MS ? 'sleeping' : 'listening');
        scheduleSleepCheck();
      }
    }
  }

  function stopRecognition() {
    state.sessionEpoch += 1;
    clearSleepTimer();
    try {
      state.recognition?.stop?.();
    } catch (_) {}
    state.recognition = null;
  }

  function startRecognitionLoop() {
    if (!SpeechRecognitionCtor) {
      showToast('Browser speech recognition not available', 'error');
      return false;
    }
    if (state.recognition) return true;

    const epoch = state.sessionEpoch;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    state.recognition = recognition;

    recognition.onstart = function onStart() {
      if (epoch !== state.sessionEpoch) return;
      state.lastSpeechAt = Date.now();
      setMode('sleeping');
      scheduleSleepCheck();
    };

    recognition.onerror = function onError(event) {
      if (epoch !== state.sessionEpoch) return;
      const code = event?.error || 'unknown';
      if (code === 'no-speech' || code === 'aborted') return;
      if (code === 'not-allowed' || code === 'permission-denied') {
        showToast('Microphone permission denied — ambient listen off', 'error');
        disable();
        return;
      }
      showToast('Voice error: ' + code, 'error');
    };

    recognition.onresult = function onResult(event) {
      if (epoch !== state.sessionEpoch) return;
      let finalText = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = String(event.results[i][0]?.transcript || '');
        if (event.results[i].isFinal) finalText += chunk + ' ';
        else interim += chunk;
      }
      if (interim.trim() || finalText.trim()) markSpeechActivity();
      if (finalText.trim()) {
        sendUtterance(finalText.trim());
      }
    };

    recognition.onend = function onEnd() {
      if (epoch !== state.sessionEpoch) return;
      state.recognition = null;
      if (isEnabled()) {
        setTimeout(() => {
          if (isEnabled() && !state.recognition) startRecognitionLoop();
        }, 350);
      }
    };

    try {
      recognition.start();
      return true;
    } catch (err) {
      showToast(err.message || 'Could not start mic', 'error');
      state.recognition = null;
      return false;
    }
  }

  function consentPrompt() {
    return global.confirm(
      'Turn on Ambient Listen?\n\n' +
      'LifeOS will keep the mic active while you use this tab. It sleeps when you are silent, ' +
      'wakes on speech, and only saves commitments, renegotiations, and important notes — not casual chatter.\n\n' +
      'No audio is stored. You can turn this off anytime from the pill in the header.'
    );
  }

  async function ensureSignedIn() {
    const ctx = getContext();
    if (!ctx?.refreshIfNeeded) return true;
    const token = await ctx.refreshIfNeeded();
    if (token) return true;
    if (global.localStorage?.getItem('lifeos_refresh_token')) {
      const retry = await ctx.refreshIfNeeded();
      if (retry) return true;
    }
    showToast('Sign in with your LifeOS account first', 'error');
    if (ctx.requireAuth) {
      await ctx.requireAuth('/overlay/lifeos-login.html');
    }
    return false;
  }

  async function enable() {
    if (!(await ensureSignedIn())) return false;
    if (!hasConsent()) {
      if (!consentPrompt()) return false;
      global.localStorage?.setItem(STORAGE_CONSENT, '1');
    }
    global.localStorage?.setItem(STORAGE_ENABLED, '1');
    state.lastSpeechAt = Date.now();
    setMode('sleeping');
    return startRecognitionLoop();
  }

  function disable() {
    global.localStorage?.setItem(STORAGE_ENABLED, '0');
    stopRecognition();
    setMode('off');
    return true;
  }

  async function toggle() {
    if (isEnabled()) return disable();
    return enable();
  }

  function init(options) {
    state.onStateChange = options?.onStateChange || null;
    state.onToast = options?.onToast || null;
    if (isEnabled() && hasConsent()) {
      enable().catch(() => setMode('off'));
    } else {
      setMode('off');
    }
    global.addEventListener('beforeunload', () => stopRecognition());
  }

  global.LifeOSAmbientListener = {
    init,
    enable,
    disable,
    toggle,
    isEnabled,
    hasConsent,
    getMode: () => state.mode,
    STATES: ['off', 'sleeping', 'listening', 'processing'],
  };
})(typeof window !== 'undefined' ? window : globalThis);
