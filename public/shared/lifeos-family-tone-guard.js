/**
 * SYNOPSIS: Family Tone Guard — opt-in mic watch for yelling (continuous vibrate until calm)
 * Family Tone Guard — opt-in mic watch for yelling (continuous vibrate until calm)
 * and snippy/mean speech (single vibrate). Client-only; no audio stored.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
(function (global) {
  const STORAGE_ENABLED = 'lifeos_family_tone_guard';
  const STORAGE_CONSENT = 'lifeos_family_tone_guard_consent_v1';

  const SpeechRecognitionCtor = global.SpeechRecognition || global.webkitSpeechRecognition || null;

  const SNIPPY_PATTERNS = [
    /\bwhatever\b/i,
    /\bforget it\b/i,
    /\b(fine|okay)[\s!.]*$/i,
    /\bstop (it|that|talking|yelling)\b/i,
    /\bshut up\b/i,
    /\bleave me alone\b/i,
    /\bi don't care\b/i,
    /\byou always\b/i,
    /\byou never\b/i,
    /\bthat's not fair\b/i,
    /\byou're not listening\b/i,
    /\byou're impossible\b/i,
    /\bi'm done\b/i,
    /\bthis is pointless\b/i,
  ];

  const MEAN_PATTERNS = [
    /\b(idiot|stupid|dumb|moron|jerk|selfish|lazy|worthless|pathetic|disgusting)\b/i,
    /\bshut your mouth\b/i,
    /\bgo away\b/i,
    /\bi hate you\b/i,
    /\byou're such a\b/i,
  ];

  const state = {
    enabled: false,
    yelling: false,
    audioCtx: null,
    analyser: null,
    micStream: null,
    rafId: null,
    recognition: null,
    sessionEpoch: 0,
    baselineRms: 0.04,
    calibratingUntil: 0,
    loudSince: 0,
    quietSince: 0,
    vibrateTimer: null,
    lastSnippyAt: 0,
    onStateChange: null,
    onToast: null,
  };

  function isEnabled() {
    return global.localStorage?.getItem(STORAGE_ENABLED) === '1';
  }

  function hasConsent() {
    return global.localStorage?.getItem(STORAGE_CONSENT) === '1';
  }

  function setEnabled(on) {
    global.localStorage?.setItem(STORAGE_ENABLED, on ? '1' : '0');
    state.enabled = on;
    if (on) start();
    else stop();
    notifyState();
  }

  function notifyState() {
    if (typeof state.onStateChange === 'function') {
      try {
        state.onStateChange(getMode());
      } catch (_) {}
    }
  }

  function showToast(msg, kind) {
    if (typeof state.onToast === 'function') {
      try { state.onToast(msg, kind); } catch (_) {}
    }
  }

  function getMode() {
    if (!isEnabled()) return 'off';
    if (state.yelling) return 'yelling';
    return 'watching';
  }

  function canVibrate() {
    return typeof global.navigator !== 'undefined' && typeof global.navigator.vibrate === 'function';
  }

  function startVibrateLoop() {
    if (!canVibrate()) return;
    if (state.vibrateTimer) return;
    const pulse = () => {
      if (!state.yelling) {
        stopVibrateLoop();
        return;
      }
      try { global.navigator.vibrate([300, 100, 300, 100, 300]); } catch (_) {}
      state.vibrateTimer = global.setTimeout(pulse, 950);
    };
    pulse();
  }

  function stopVibrateLoop() {
    if (state.vibrateTimer) {
      global.clearTimeout(state.vibrateTimer);
      state.vibrateTimer = null;
    }
    if (canVibrate()) {
      try { global.navigator.vibrate(0); } catch (_) {}
    }
  }

  function pulseOnce(ms) {
    if (!canVibrate()) return;
    try { global.navigator.vibrate(ms || 420); } catch (_) {}
  }

  function classifyText(text) {
    const body = String(text || '').trim();
    if (body.length < 6) return null;
    if (MEAN_PATTERNS.some((re) => re.test(body))) return 'mean';
    if (SNIPPY_PATTERNS.some((re) => re.test(body))) return 'snippy';
    const letters = body.replace(/[^a-zA-Z]/g, '');
    const caps = body.replace(/[^A-Z]/g, '').length;
    if (letters.length >= 8 && caps / letters.length > 0.55) return 'yelling_words';
    return null;
  }

  function onTranscript(text, isFinal) {
    const kind = classifyText(text);
    if (!kind) return;
    const now = Date.now();
    if (kind === 'yelling_words' && state.yelling) return;
    if (now - state.lastSnippyAt < 9000) return;
    state.lastSnippyAt = now;
    if (kind === 'mean') {
      pulseOnce(480);
      showToast('Mean tone — pause and breathe', 'mean');
      try { global.dispatchEvent(new CustomEvent('lifeos-family-guard-snippy', { detail: { kind: 'mean' } })); } catch (_) {}
    } else {
      pulseOnce(380);
      showToast(kind === 'yelling_words' ? 'Raised voice — ease up' : 'Snippy tone — soften', 'snippy');
      try { global.dispatchEvent(new CustomEvent('lifeos-family-guard-snippy', { detail: { kind } })); } catch (_) {}
    }
  }

  function setYelling(active) {
    if (active === state.yelling) return;
    state.yelling = active;
    if (active) {
      startVibrateLoop();
      showToast('Yelling detected — phone vibrating until you calm', 'yelling');
      try {
        global.dispatchEvent(new CustomEvent('lifeos-family-guard-yelling-start', { detail: { stream: state.micStream } }));
      } catch (_) {}
    } else {
      stopVibrateLoop();
      showToast('Volume back down — good reset', 'calm');
      try {
        global.dispatchEvent(new CustomEvent('lifeos-family-guard-yelling-end'));
      } catch (_) {}
    }
    notifyState();
  }

  function measureRms() {
    if (!state.analyser) return 0;
    const buf = new Float32Array(state.analyser.fftSize);
    state.analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i += 1) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  }

  function tickVolume() {
    if (!state.enabled || !state.analyser) return;
    const rms = measureRms();
    const now = Date.now();

    if (now < state.calibratingUntil) {
      state.baselineRms = state.baselineRms * 0.92 + rms * 0.08;
    }

    const threshold = Math.max(0.11, state.baselineRms * 3.2);
    const release = Math.max(0.07, state.baselineRms * 2.0);

    if (rms >= threshold) {
      state.quietSince = 0;
      if (!state.loudSince) state.loudSince = now;
      if (now - state.loudSince >= 320) setYelling(true);
    } else if (rms <= release) {
      state.loudSince = 0;
      if (!state.quietSince) state.quietSince = now;
      if (state.yelling && now - state.quietSince >= 520) setYelling(false);
    } else {
      state.loudSince = 0;
      state.quietSince = 0;
    }

    state.rafId = global.requestAnimationFrame(tickVolume);
  }

  async function startAudioMonitor() {
    if (!global.navigator?.mediaDevices?.getUserMedia) {
      showToast('Microphone not available on this device', 'error');
      return false;
    }
    try {
      state.micStream = await global.navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
    } catch (err) {
      showToast('Mic permission needed for family tone guard', 'error');
      setEnabled(false);
      return false;
    }

    state.audioCtx = new (global.AudioContext || global.webkitAudioContext)();
    const source = state.audioCtx.createMediaStreamSource(state.micStream);
    state.analyser = state.audioCtx.createAnalyser();
    state.analyser.fftSize = 2048;
    source.connect(state.analyser);
    state.calibratingUntil = Date.now() + 2800;
    state.baselineRms = 0.04;
    state.rafId = global.requestAnimationFrame(tickVolume);
    return true;
  }

  function stopAudioMonitor() {
    if (state.rafId) {
      global.cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
    setYelling(false);
    try { state.micStream?.getTracks?.().forEach((t) => t.stop()); } catch (_) {}
    state.micStream = null;
    try { state.audioCtx?.close?.(); } catch (_) {}
    state.audioCtx = null;
    state.analyser = null;
  }

  function stopRecognition() {
    state.sessionEpoch += 1;
    try { state.recognition?.stop?.(); } catch (_) {}
    state.recognition = null;
  }

  function startRecognition() {
    if (!SpeechRecognitionCtor || state.recognition) return;
    const epoch = state.sessionEpoch;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    state.recognition = recognition;

    recognition.onresult = (event) => {
      if (epoch !== state.sessionEpoch) return;
      let finalText = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = String(event.results[i][0]?.transcript || '');
        if (event.results[i].isFinal) finalText += chunk + ' ';
        else interim += chunk;
      }
      const sample = (finalText || interim).trim();
      if (sample) onTranscript(sample, !!finalText.trim());
    };

    recognition.onerror = (event) => {
      if (epoch !== state.sessionEpoch) return;
      const code = event?.error || '';
      if (code === 'not-allowed' || code === 'permission-denied') {
        showToast('Speech permission denied — tone guard off', 'error');
        setEnabled(false);
      }
    };

    recognition.onend = () => {
      if (epoch !== state.sessionEpoch) return;
      state.recognition = null;
      if (state.enabled) {
        global.setTimeout(() => {
          if (state.enabled && !state.recognition) startRecognition();
        }, 400);
      }
    };

    try {
      recognition.start();
    } catch (_) {
      state.recognition = null;
    }
  }

  async function start() {
    if (!hasConsent()) return false;
    state.enabled = true;
    state.sessionEpoch += 1;
    const ok = await startAudioMonitor();
    if (!ok) return false;
    startRecognition();
    notifyState();
    return true;
  }

  function stop() {
    state.enabled = false;
    state.sessionEpoch += 1;
    stopRecognition();
    stopAudioMonitor();
    notifyState();
  }

  async function requestConsentAndEnable() {
    const ok = global.confirm(
      'Family Tone Guard listens through your phone mic (nothing is recorded).\n\n'
      + '• Sustained yelling → phone vibrates until you calm down\n'
      + '• Snippy or mean tone → one vibration nudge\n\n'
      + 'Enable now?'
    );
    if (!ok) return false;
    global.localStorage?.setItem(STORAGE_CONSENT, '1');
    global.localStorage?.setItem(STORAGE_ENABLED, '1');
    return start();
  }

  async function toggle() {
    if (isEnabled()) {
      setEnabled(false);
      return false;
    }
    if (!hasConsent()) return requestConsentAndEnable();
    global.localStorage?.setItem(STORAGE_ENABLED, '1');
    return start();
  }

  function init(opts = {}) {
    state.onStateChange = opts.onStateChange || null;
    state.onToast = opts.onToast || null;
    if (isEnabled() && hasConsent()) start();
    else notifyState();
  }

  global.LifeOSFamilyToneGuard = {
    init,
    toggle,
    start,
    stop,
    setEnabled,
    isEnabled,
    hasConsent,
    getMode,
  };
})(typeof window !== 'undefined' ? window : globalThis);
