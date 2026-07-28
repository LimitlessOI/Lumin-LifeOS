/**
 * SYNOPSIS: Shared browser voice input/output controls for LifeOS chat surfaces.
 * @ssot docs/products/command-center/PRODUCT_HOME.md
 * Shared browser voice input/output controls for LifeOS chat surfaces.
 */
(function (global) {
  const SpeechRecognitionCtor = global.SpeechRecognition || global.webkitSpeechRecognition || null;
  const synth = global.speechSynthesis || null;
  const controllers = new Map();

  function normalizeText(value) {
    return String(value || '')
      .replace(/[`_>#-]+/g, ' ')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function scoreVoice(voice) {
    if (!voice) return -1000;
    const name = String(voice.name || '');
    const lang = String(voice.lang || '');
    if (!/^en(-|$)/i.test(lang) && !/English/i.test(name)) return -1000;
    let score = 0;
    if (/Enhanced|Premium|Neural|Natural|Wavenet|Super-AI/i.test(name)) score += 90;
    if (/Samantha|Ava|Allison|Serena|Moira|Tessa|Victoria|Jenny|Aria|Zira|Steffan|Nova/i.test(name)) score += 85;
    if (/Karen/i.test(name)) score += 15;
    if (/Google (US )?English|Microsoft (Aria|Jenny|Zira|Steffan)/i.test(name)) score += 55;
    if (/Guy|Fred|Daniel|David|Mark|James|Tom(?!i)/i.test(name)) score -= 35;
    if (/Alex( Enhanced)?/i.test(name)) score += 40;
    if (/Compact|espeak|Flo|Fred|Cellos|Bahh|Bells|Boing|Bubbles|Junior|Kathy|Princess|Organ|Good News|Bad News|Zarvox|Whisper|Trinoids|Albert/i.test(name)) {
      score -= 300;
    }
    if (voice.localService) score += 15;
    if (voice.default) score += 8;
    return score;
  }

  function chooseVoice(preferredUri) {
    if (!synth || typeof synth.getVoices !== 'function') return null;
    const voices = synth.getVoices().filter((v) => scoreVoice(v) > 0);
    if (preferredUri) {
      const picked = voices.find((v) => v.voiceURI === preferredUri);
      if (picked) return picked;
    }
    voices.sort((a, b) => scoreVoice(b) - scoreVoice(a));
    return voices[0] || synth.getVoices().find((v) => /^en/i.test(v.lang)) || synth.getVoices()[0] || null;
  }

  let cachedVoice = chooseVoice();
  if (synth) {
    global.speechSynthesis.onvoiceschanged = function onVoicesChanged() {
      cachedVoice = chooseVoice();
    };
  }

  function listSpeakableVoices() {
    if (!synth || typeof synth.getVoices !== 'function') return [];
    return synth
      .getVoices()
      .filter((v) => scoreVoice(v) > 0)
      .sort((a, b) => scoreVoice(b) - scoreVoice(a))
      .map((v) => ({ name: v.name, lang: v.lang, voiceURI: v.voiceURI, localService: v.localService }));
  }

  function scoreAudioInput(device) {
    const label = String(device?.label || '').toLowerCase();
    let score = 0;
    // Built-in laptop mic — strongest signal (avoid generic "Microphone" alone; Continuity often uses that).
    if (/macbook|built-in|builtin|internal/.test(label)) score += 100;
    else if (/microphone/.test(label)) score += 25;
    if (/usb|headset|airpods|pods|airpod|external/.test(label)) score += 55;
    // iPhone / iPad / Continuity must never win Auto on a laptop.
    if (/continuity|iphone|ipad|airplay|handoff|\bphone\b/.test(label)) score -= 200;
    return score;
  }

  function isBlockedContinuityMic(device) {
    return scoreAudioInput(device) < 0;
  }

  function pickPreferredAudioInputDevice(devices) {
    const inputs = (devices || []).filter((device) => device.kind === 'audioinput');
    const allowed = inputs.filter((device) => !isBlockedContinuityMic(device));
    const pool = allowed.length ? allowed : inputs;
    return [...pool].sort((a, b) => scoreAudioInput(b) - scoreAudioInput(a))[0] || null;
  }

  async function ensureAudioInputLabelsUnlocked() {
    if (!global.navigator?.mediaDevices?.enumerateDevices) return;
    const devices = await global.navigator.mediaDevices.enumerateDevices();
    const hasLabels = devices.some((device) => device.kind === 'audioinput' && String(device.label || '').trim());
    if (hasLabels || !global.navigator.mediaDevices.getUserMedia) return;
    let tmp;
    try {
      tmp = await global.navigator.mediaDevices.getUserMedia({ audio: true });
    } finally {
      tmp?.getTracks?.().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
    }
  }

  async function resolveAutoAudioDeviceId() {
    await ensureAudioInputLabelsUnlocked();
    const devices = await listAudioInputDevices();
    const pick = pickPreferredAudioInputDevice(devices);
    return String(pick?.deviceId || '').trim();
  }

  async function listAudioInputDevices() {
    if (!global.navigator?.mediaDevices?.enumerateDevices) return [];
    const devices = await global.navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind === 'audioinput')
      .sort((a, b) => scoreAudioInput(b) - scoreAudioInput(a));
  }

  function speakText(text, options) {
    const opts = typeof options === 'function' ? { onEnd: options } : options || {};
    let cleaned = normalizeText(text);
    cleaned = cleaned
      .replace(/\bintent:\s*\S+/gi, '')
      .replace(/\bvia lifeos\/\S+.$/gim, '')
      .replace(/\bcouncil:\s*\S+/gi, '')
      .replace(/\bmodel:\s*\S+/gi, '')
      .trim();
    if (!cleaned || !synth) {
      if (typeof opts.onEnd === 'function') {
        try {
          opts.onEnd();
        } catch (_) {
          // Ignore callback failures.
        }
      }
      return;
    }
    const voice = chooseVoice(opts.voiceURI) || cachedVoice;
    if (voice) cachedVoice = voice;

    const rateRaw = typeof opts.rate === 'number' ? opts.rate : 0.94;
    const rate = Math.min(Math.max(rateRaw, 0.75), 1.15);
    const pitchRaw = typeof opts.pitch === 'number' ? opts.pitch : 1.02;
    const pitch = Math.min(Math.max(pitchRaw, 0.9), 1.1);
    const volumeRaw = typeof opts.volume === 'number' ? opts.volume : 1;
    const volume = Math.min(Math.max(volumeRaw, 0), 1);

    const utterance = new SpeechSynthesisUtterance(cleaned.slice(0, 2000));
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    utterance.lang = voice?.lang || 'en-US';
    if (typeof opts.onEnd === 'function') {
      utterance.onend = function onUtteranceEnd() {
        try {
          opts.onEnd();
        } catch (_) {
          // Ignore callback failures.
        }
      };
    }
    synth.cancel();
    synth.speak(utterance);
  }

  let activeServerAudio = null;

  function stopServerAudio() {
    if (!activeServerAudio) return;
    try {
      activeServerAudio.pause();
    } catch (_) {}
    activeServerAudio = null;
  }

  function playServerAudioBlob(blob, options) {
    const opts = options || {};
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = typeof opts.volume === 'number' ? opts.volume : 1;
      audio.playbackRate = typeof opts.rate === 'number' ? opts.rate : 1;
      activeServerAudio = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (activeServerAudio === audio) activeServerAudio = null;
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (activeServerAudio === audio) activeServerAudio = null;
        reject(new Error('audio_playback_failed'));
      };
      audio.play().catch(reject);
    });
  }

  async function speakTextAsync(text, options) {
    const opts = typeof options === 'function' ? { onEnd: options } : options || {};
    let cleaned = normalizeText(text);
    cleaned = cleaned
      .replace(/\bintent:\s*\S+/gi, '')
      .replace(/\bvia lifeos\/\S+.$/gim, '')
      .replace(/\bcouncil:\s*\S+/gi, '')
      .replace(/\bmodel:\s*\S+/gi, '')
      .trim();
    if (!cleaned) {
      if (typeof opts.onEnd === 'function') {
        try { opts.onEnd(); } catch (_) {}
      }
      return;
    }
    if (opts.preferServerTts !== false && typeof opts.serverTtsFetch === 'function') {
      try {
        const result = await opts.serverTtsFetch(cleaned);
        if (result?.ok && result.blob) {
          stopServerAudio();
          if (synth) synth.cancel();
          await playServerAudioBlob(result.blob, opts);
          if (typeof opts.onEnd === 'function') {
            try { opts.onEnd(); } catch (_) {}
          }
          return;
        }
      } catch (_) {}
    }
    speakText(cleaned, opts);
  }

  function stopSpeaking() {
    stopServerAudio();
    if (synth) synth.cancel();
  }

  function isSpeaking() {
    return Boolean((synth && synth.speaking) || activeServerAudio);
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  function stripVoiceSendCommand(text, phrases) {
    let t = String(text || '').trim();
    if (!t) return { send: false, message: '' };
    const list = phrases && phrases.length
      ? phrases
      : ['send it', 'send message', 'send that', 'send now'];
    for (let i = 0; i < list.length; i += 1) {
      const raw = String(list[i] || '').trim();
      if (!raw) continue;
      const re = new RegExp('(?:^|\\s)' + raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.?\\s$', 'i');
      if (re.test(t)) {
        const message = t.replace(re, '').trim();
        if (message) return { send: true, message };
        if (new RegExp('^' + raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.?$', 'i').test(t)) {
          return { send: true, message: '' };
        }
      }
    }
    return { send: false, message: t };
  }

  function stripLeadingWakePrefixes(text, prefixes) {
    let t = String(text || '').trim();
    if (!t || !prefixes || !prefixes.length) return t;
    const lower = t.toLowerCase();
    for (let i = 0; i < prefixes.length; i += 1) {
      const raw = String(prefixes[i] || '').trim();
      if (!raw) continue;
      const pl = raw.toLowerCase();
      if (lower === pl) return '';
      if (lower.startsWith(pl + ' ') || lower.startsWith(pl + ',') || lower.startsWith(pl + '.')) {
        return t.slice(raw.length).trim().replace(/^[,.\s]+/, '');
      }
    }
    return t;
  }

  function joinTextParts(before, middle, after) {
    const left = String(before || '').trimEnd();
    const core = String(middle || '').trim();
    const right = String(after || '').trimStart();
    if (!core) return (left + (left && right ? ' ' : '') + right).trim();
    if (!left) return (core + (right ? ' ' + right : '')).trim();
    if (!right) return (left + ' ' + core).trim();
    return (left + ' ' + core + ' ' + right).trim();
  }

  function attach(options) {
    const settings = Object.assign({
      mode: 'append',
      lang: 'en-US',
      idleText: 'Voice ready',
      startLabel: 'Start voice',
      stopLabel: 'Stop voice',
      storageKey: '',
      speakRepliesDefault: false,
      wakePrefixes: [],
      voiceSendEnabled: false,
      voiceSendPhrases: ['send it', 'send message', 'send that', 'send now'],
      voiceSendRequireFinal: false,
      manualSendOnly: false,
      onVoiceSend: null,
      keepListeningOnVoiceSend: false,
      persistentListen: false,
      pauseMicDuringTts: false,
      warmMicOnStart: true,
      focusInputOnMic: true,
      iconOnly: false,
      silentStatus: false,
      onStart: null,
      onStop: null,
      onInterim: null,
      onAutoSend: null,
      silenceAutoSendMs: 0,
      sendOnMicStop: false,
      preferServerTts: true,
      serverTtsFetch: null,
      serverTtsDepartment: 'ChC',
      serverSttEnabled: false,
      serverSttTranscribe: null,
      serverSttChunkMs: 1800,
      serverSttMinBytes: 400,
      serverSttFailureLimit: 2,
      audioDeviceId: '',
    }, options || {});

    const input = document.getElementById(settings.inputId);
    const button = document.getElementById(settings.buttonId);
    const status = document.getElementById(settings.statusId);
    const speakToggle = settings.speakToggleId ? document.getElementById(settings.speakToggleId) : null;

    if (!input || !button || !status) return null;

    if (controllers.has(settings.buttonId)) {
      controllers.get(settings.buttonId).destroy();
    }

    const state = {
      recognition: null,
      listening: false,
      userWantsListen: false,
      committed: '',
      appendAt: 0,
      replaceEnd: null,
      programmaticUpdate: false,
      micWarmed: false,
      warmStream: null,
      destroyed: false,
      warming: false,
      ttsDuck: false,
      buttonListener: null,
      speakListener: null,
      inputListener: null,
      selectionListener: null,
      pointerDownListener: null,
      hadHighlight: false,
      dictationEpoch: 0,
      lastRenderedValue: null,
      restartTimer: null,
      beforeInputListener: null,
      mediaRecorder: null,
      sttInFlight: 0,
      serverSttConsecutiveFailures: 0,
      serverSttForceBrowser: false,
      voiceSendFired: false,
      silenceTimer: null,
      autoSendFired: false,
      storageKey: settings.storageKey,
      speakingEnabled: settings.speakRepliesDefault,
      selectedAudioDeviceId: String(settings.audioDeviceId || '').trim(),
      autoResolvedDeviceId: '',
    };

    function formatMicError(err) {
      const name = String(err?.name || '');
      if (name === 'NotReadableError' || name === 'AbortError') {
        return 'Mic busy or routed to another device. Pick a mic in Options or disconnect Continuity Camera.';
      }
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        return 'Mic permission needed — allow microphone in browser settings.';
      }
      if (name === 'OverconstrainedError' || name === 'NotFoundError') {
        return 'Selected microphone is unavailable. Choose a different mic in Options.';
      }
      return 'Could not start microphone. Check browser mic access and selected device.';
    }

    function buildAudioConstraints(deviceId) {
      const audio = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      if (deviceId) {
        audio.deviceId = { exact: deviceId };
      }
      return { audio };
    }

    function releaseWarmStream() {
      if (!state.warmStream) return;
      try {
        state.warmStream.getTracks().forEach((t) => { try { t.stop(); } catch (_) {} });
      } catch (_) {}
      state.warmStream = null;
      state.micWarmed = false;
    }

    async function maybeAdoptPreferredDevice() {
      if (!state.warmStream || state.selectedAudioDeviceId) return;
      const currentTrack = state.warmStream.getAudioTracks?.()[0] || null;
      const currentSettings = currentTrack?.getSettings?.() || {};
      const currentDeviceId = String(currentSettings.deviceId || '').trim();
      const devices = await listAudioInputDevices().catch(() => []);
      const preferred = pickPreferredAudioInputDevice(devices);
      const preferredId = String(preferred?.deviceId || '').trim();
      if (!preferredId || preferredId === currentDeviceId) return;
      if (isBlockedContinuityMic({ label: currentTrack?.label || '' })) {
        // Force away from Continuity even if IDs matched unexpectedly.
      } else if (scoreAudioInput({ label: currentTrack?.label || '' }) >= scoreAudioInput(preferred)) {
        return;
      }
      state.autoResolvedDeviceId = preferredId;
      releaseWarmStream();
      const stream = await global.navigator.mediaDevices.getUserMedia(buildAudioConstraints(preferredId));
      state.warmStream = stream;
      state.micWarmed = true;
    }

    async function warmAudioInput() {
      if (!global.navigator?.mediaDevices?.getUserMedia) return false;
      if (state.micWarmed && state.warmStream) return true;
      if (state.warming) return true;
      state.warming = true;
      updateStatus('Starting microphone…');
      try {
        let deviceId = state.selectedAudioDeviceId;
        if (!deviceId) {
          deviceId = await resolveAutoAudioDeviceId();
          state.autoResolvedDeviceId = deviceId;
        }
        const stream = await global.navigator.mediaDevices.getUserMedia(
          buildAudioConstraints(deviceId),
        );
        state.warmStream = stream;
        state.micWarmed = true;
        const activeTrack = stream.getAudioTracks?.()[0] || null;
        if (activeTrack && isBlockedContinuityMic({ label: activeTrack.label || '' })) {
          releaseWarmStream();
          const fallbackId = await resolveAutoAudioDeviceId();
          if (fallbackId && fallbackId !== deviceId) {
            state.autoResolvedDeviceId = fallbackId;
            state.warmStream = await global.navigator.mediaDevices.getUserMedia(buildAudioConstraints(fallbackId));
            state.micWarmed = true;
          }
        }
        await maybeAdoptPreferredDevice().catch(() => {});
        const label = state.warmStream?.getAudioTracks?.()[0]?.label || '';
        if (label) updateStatus(`Mic: ${label}`);
        return true;
      } catch (err) {
        if (state.selectedAudioDeviceId) {
          try {
            state.selectedAudioDeviceId = '';
            state.autoResolvedDeviceId = await resolveAutoAudioDeviceId();
            const fallbackStream = await global.navigator.mediaDevices.getUserMedia(
              buildAudioConstraints(state.autoResolvedDeviceId),
            );
            state.warmStream = fallbackStream;
            state.micWarmed = true;
            updateStatus('Selected mic unavailable — using laptop microphone.');
            return true;
          } catch (fallbackErr) {
            updateStatus(formatMicError(fallbackErr));
            return false;
          }
        }
        updateStatus(formatMicError(err));
        return false;
      } finally {
        state.warming = false;
      }
    }

    function cancelMicRestart() {
      if (state.restartTimer) {
        global.clearTimeout(state.restartTimer);
        state.restartTimer = null;
      }
    }

    function clearSilenceTimer() {
      if (state.silenceTimer) {
        global.clearTimeout(state.silenceTimer);
        state.silenceTimer = null;
      }
    }

    function fireAutoSend(reason) {
      if (settings.manualSendOnly) return false;
      if (state.autoSendFired || typeof settings.onAutoSend !== 'function') return false;
      const msg = String(input?.value || '').trim();
      if (!msg) return false;
      state.autoSendFired = true;
      clearSilenceTimer();
      stopListening(true);
      try {
        settings.onAutoSend(msg, { reason: reason || 'auto' });
      } catch (_) {}
      return true;
    }

    function scheduleSilenceAutoSend() {
      const ms = Number(settings.silenceAutoSendMs || 0);
      if (!ms || ms <= 0 || typeof settings.onAutoSend !== 'function') return;
      clearSilenceTimer();
      state.silenceTimer = global.setTimeout(() => {
        state.silenceTimer = null;
        fireAutoSend('silence');
      }, ms);
    }

    function scheduleMicRestart(delayMs) {
      cancelMicRestart();
      const wait = typeof delayMs === 'number' ? delayMs : 50;
      state.restartTimer = global.setTimeout(() => {
        state.restartTimer = null;
        if (state.userWantsListen && !state.destroyed && !state.ttsDuck && !state.recognition && !state.mediaRecorder) {
          restartListeningInternal();
        }
      }, wait);
    }

    function useServerStt() {
      return Boolean(
        !state.serverSttForceBrowser &&
        settings.serverSttEnabled &&
        typeof settings.serverSttTranscribe === 'function' &&
        global.MediaRecorder &&
        global.navigator?.mediaDevices?.getUserMedia,
      );
    }

    async function switchToBrowserStt(sessionEpoch, reason) {
      if (state.serverSttForceBrowser || !SpeechRecognitionCtor) return false;
      state.serverSttForceBrowser = true;
      stopMediaRecorder();
      const msg = reason || 'Whisper unavailable — using browser mic…';
      updateStatus(msg);
      if (state.userWantsListen && sessionEpoch === state.dictationEpoch && !state.ttsDuck) {
        startListeningInternal();
      }
      return true;
    }

    async function switchToServerStt(sessionEpoch, reason) {
      if (!useServerStt()) return false;
      state.serverSttForceBrowser = false;
      abortActiveRecognition();
      if (reason) updateStatus(reason);
      if (state.userWantsListen && sessionEpoch === state.dictationEpoch && !state.ttsDuck) {
        await startServerListeningInternal();
      }
      return true;
    }

    function noteServerSttFailure(sessionEpoch, reason) {
      state.serverSttConsecutiveFailures += 1;
      const limit = settings.serverSttFailureLimit || 2;
      if (state.serverSttConsecutiveFailures >= limit && SpeechRecognitionCtor) {
        switchToBrowserStt(
          sessionEpoch,
          `${reason || 'Whisper unavailable'} — browser mic uses macOS default; pick MacBook mic in Options if wrong.`,
        );
      } else if (reason) {
        updateStatus(reason);
      }
    }

    function stopMediaRecorder() {
      const rec = state.mediaRecorder;
      if (!rec) return;
      state.mediaRecorder = null;
      try {
        if (rec.state !== 'inactive') rec.stop();
      } catch (_) {}
    }

    function abortActiveRecognition() {
      const rec = state.recognition;
      if (!rec) return;
      state.recognition = null;
      state.listening = false;
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      rec.onstart = null;
      try {
        rec.abort();
      } catch (_) {
        try {
          rec.stop();
        } catch (_) {}
      }
    }

    function abortActiveCapture() {
      stopMediaRecorder();
      abortActiveRecognition();
    }

    function markUserEditedText() {
      state.dictationEpoch += 1;
      if (!input) return;
      state.committed = String(input.value || '');
      state.lastRenderedValue = state.committed;
      try {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        if (typeof start === 'number' && typeof end === 'number' && start !== end) {
          state.appendAt = start;
          state.replaceEnd = end;
        } else {
          state.appendAt = typeof start === 'number' ? start : state.committed.length;
          state.replaceEnd = null;
        }
      } catch (_) {
        state.appendAt = state.committed.length;
        state.replaceEnd = null;
      }
      if (state.userWantsListen && !state.ttsDuck) {
        abortActiveCapture();
        scheduleMicRestart(60);
      }
    }

    function syncCommittedFromInput(moveCursorToEnd) {
      if (!input || state.programmaticUpdate) return;
      state.committed = String(input.value || '');
      state.lastRenderedValue = state.committed;
      if (moveCursorToEnd) {
        state.appendAt = state.committed.length;
        state.replaceEnd = null;
        try {
          input.setSelectionRange(state.appendAt, state.appendAt);
        } catch (_) {}
        return;
      }
      try {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        if (typeof start === 'number' && typeof end === 'number') {
          if (start !== end) {
            state.appendAt = start;
            state.replaceEnd = end;
          } else {
            state.appendAt = start;
            state.replaceEnd = null;
          }
        }
      } catch (_) {}
    }

    function onInputSelectionChange(ev) {
      if (state.programmaticUpdate || !input) return;
      try {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        state.committed = String(input.value || '');
        if (start !== end) {
          state.appendAt = start;
          state.replaceEnd = end;
          return;
        }
        if (state.hadHighlight || ev?.type === 'select') {
          state.appendAt = state.committed.length;
          state.replaceEnd = null;
          input.setSelectionRange(state.appendAt, state.appendAt);
          state.hadHighlight = false;
        } else {
          state.appendAt = start;
          state.replaceEnd = null;
        }
      } catch (_) {}
    }

    function onPointerDown() {
      if (!input) return;
      try {
        state.hadHighlight = input.selectionStart !== input.selectionEnd;
      } catch (_) {
        state.hadHighlight = false;
      }
    }

    function onManualInput() {
      if (state.programmaticUpdate) return;
      markUserEditedText();
    }

    function getDictationRange() {
      if (!input) return { start: 0, end: 0 };
      try {
        if (document.activeElement === input) {
          const start = input.selectionStart;
          const end = input.selectionEnd;
          if (typeof start === 'number' && typeof end === 'number' && start !== end) {
            return { start, end };
          }
        }
      } catch (_) {}
      const start = Math.min(Math.max(state.appendAt, 0), state.committed.length);
      const end = state.replaceEnd != null
        ? Math.min(Math.max(state.replaceEnd, start), state.committed.length)
        : start;
      return { start, end };
    }

    function setInputValue(nextValue, cursorAt) {
      if (!input) return;
      state.programmaticUpdate = true;
      input.value = nextValue;
      const pos = typeof cursorAt === 'number' ? cursorAt : nextValue.length;
      try {
        input.setSelectionRange(pos, pos);
      } catch (_) {}
      state.programmaticUpdate = false;
      state.lastRenderedValue = nextValue;
    }

    function applyDictation(finalChunk, interimChunk) {
      const liveValue = String(input?.value || '');
      if (state.lastRenderedValue != null && liveValue !== state.lastRenderedValue) {
        state.committed = liveValue;
        state.lastRenderedValue = liveValue;
        try {
          const start = input.selectionStart;
          const end = input.selectionEnd;
          if (typeof start === 'number' && typeof end === 'number' && start !== end) {
            state.appendAt = start;
            state.replaceEnd = end;
          } else {
            state.appendAt = typeof start === 'number' ? start : state.committed.length;
            state.replaceEnd = null;
          }
        } catch (_) {
          state.appendAt = state.committed.length;
          state.replaceEnd = null;
        }
      }
      const finalText = String(finalChunk || '').trim();
      const interimText = String(interimChunk || '').trim();
      const range = getDictationRange();
      const before = state.committed.slice(0, range.start);
      const after = state.committed.slice(range.end);

      if (finalText) {
        state.committed = joinTextParts(before, finalText, after);
        state.appendAt = joinTextParts(before, finalText, '').length;
        state.replaceEnd = null;
      }

      let display = state.committed;
      let cursorAt = state.appendAt;
      if (interimText) {
        const pre = state.committed.slice(0, state.appendAt);
        const post = state.committed.slice(state.appendAt);
        display = joinTextParts(pre, interimText, post);
        cursorAt = joinTextParts(pre, interimText, '').length;
      }
      setInputValue(display, cursorAt);
    }

    function clearInputBuffer() {
      state.committed = '';
      state.appendAt = 0;
      state.replaceEnd = null;
      state.lastRenderedValue = '';
      state.voiceSendFired = false;
      state.dictationEpoch += 1;
      cancelMicRestart();
      abortActiveCapture();
      if (input) setInputValue('', 0);
    }

    function loadSpeakPreference() {
      if (!speakToggle) return;
      if (!state.storageKey) {
        state.speakingEnabled = Boolean(settings.speakRepliesDefault);
        speakToggle.checked = state.speakingEnabled;
        return;
      }
      const stored = global.localStorage.getItem(state.storageKey + ':speakReplies');
      state.speakingEnabled = stored === null ? Boolean(settings.speakRepliesDefault) : stored === 'true';
      speakToggle.checked = state.speakingEnabled;
    }

    function saveSpeakPreference() {
      if (!speakToggle) return;
      state.speakingEnabled = Boolean(speakToggle.checked);
      if (state.storageKey) {
        global.localStorage.setItem(state.storageKey + ':speakReplies', String(state.speakingEnabled));
      }
    }

    function updateButton() {
      if (settings.iconOnly) {
        button.setAttribute('aria-label', state.listening ? settings.stopLabel : settings.startLabel);
      } else {
        button.textContent = state.listening ? settings.stopLabel : settings.startLabel;
      }
      button.classList.toggle('listening', state.listening || state.userWantsListen);
      button.setAttribute('aria-pressed', (state.listening || state.userWantsListen) ? 'true' : 'false');
    }

    function maybeVoiceSend(finalChunk) {
      if (!settings.voiceSendEnabled || typeof settings.onVoiceSend !== 'function') return false;
      if (state.voiceSendFired) return true;
      const chunk = String(finalChunk || '').trim();
      if (settings.voiceSendRequireFinal && !chunk) return false;

      const parsed = stripVoiceSendCommand(input.value, settings.voiceSendPhrases);
      if (!parsed.send || !String(parsed.message || '').trim()) return false;

      if (settings.voiceSendRequireFinal) {
        const chunkParsed = stripVoiceSendCommand(chunk, settings.voiceSendPhrases);
        if (!chunkParsed.send) return false;
      }

      const msg = parsed.message;
      state.voiceSendFired = true;
      if (settings.keepListeningOnVoiceSend) {
        clearInputBuffer();
        try {
          settings.onVoiceSend(msg);
        } catch (_) {}
        updateStatus('Listening… (say “send it” to post again)');
        return true;
      }
      stopListening();
      setInputValue(msg, msg.length);
      try {
        settings.onVoiceSend(msg);
      } catch (_) {}
      return true;
    }

    function focusInputHighlight() {
      if (!settings.focusInputOnMic || !input) return;
      input.focus();
      input.classList.add('mic-active');
      syncCommittedFromInput(false);
    }

    function clearInputHighlight() {
      input?.classList.remove('mic-active');
    }

    function updateStatus(value) {
      if (settings.silentStatus && !state.listening && !(value && String(value).startsWith('Voice error'))) {
        setText(status, '');
        return;
      }
      setText(status, value);
    }

    function stopListening(userInitiated) {
      if (userInitiated) {
        state.userWantsListen = false;
        releaseWarmStream();
      }
      cancelMicRestart();
      clearSilenceTimer();
      abortActiveCapture();
      state.listening = false;
      syncCommittedFromInput(true);
      if (!state.userWantsListen) clearInputHighlight();
      updateButton();
      updateStatus(state.userWantsListen ? 'Restarting mic…' : settings.idleText);
      if (userInitiated && settings.sendOnMicStop && !settings.manualSendOnly && !state.autoSendFired) {
        const msg = String(input?.value || '').trim();
        if (msg && typeof settings.onAutoSend === 'function') {
          state.autoSendFired = true;
          try {
            settings.onAutoSend(msg, { reason: 'mic_stop' });
          } catch (_) {}
        }
      }
    }

    function bindRecognitionHandlers(recognition, sessionEpoch) {
      recognition.onstart = function onStart() {
        if (sessionEpoch !== state.dictationEpoch || recognition !== state.recognition) return;
        state.listening = true;
        updateButton();
        focusInputHighlight();
        updateStatus(settings.silentStatus ? '' : 'Listening… say “send it” to post.');
        if (typeof settings.onStart === 'function') {
          try { settings.onStart({ inputValue: String(input?.value || '') }); } catch (_) {}
        }
      };
      recognition.onerror = function onError(event) {
        if (sessionEpoch !== state.dictationEpoch || recognition !== state.recognition) return;
        const code = event && event.error ? event.error : 'unknown';
        if (code === 'no-speech' && state.userWantsListen) return;
        if (code === 'aborted') return;
        state.listening = false;
        state.recognition = null;
        updateButton();
        if (code === 'audio-capture' || code === 'network' || code === 'service-not-allowed') {
          switchToServerStt(sessionEpoch, 'Browser mic failed — trying Whisper…').then((switched) => {
            if (!switched) {
              const msg = code === 'audio-capture'
                ? 'Browser mic capture failed. Pick a mic in Options or disconnect Continuity Camera.'
                : 'Browser speech recognition failed. Check browser mic permissions or use Whisper.';
              updateStatus(msg);
            }
          }).catch(() => {
            updateStatus('Voice error: ' + code);
          });
          return;
        }
        const message = code === 'not-allowed' || code === 'permission-denied'
          ? 'Browser mic permission denied. Allow microphone access in browser settings.'
          : ('Voice error: ' + code);
        updateStatus(message);
      };
      recognition.onresult = function onResult(event) {
        if (sessionEpoch !== state.dictationEpoch || recognition !== state.recognition) return;
        let finalChunk = '';
        let interimChunk = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = String(event.results[index][0].transcript || '');
          if (event.results[index].isFinal) finalChunk += transcript + ' ';
          else interimChunk += transcript;
        }
        applyDictation(finalChunk, interimChunk);
        if (finalChunk.trim() && maybeVoiceSend(finalChunk)) return;
        if (!settings.manualSendOnly && String(input?.value || '').trim()) scheduleSilenceAutoSend();
        updateStatus(interimChunk ? interimChunk.trim() : 'Listening…');
        if (typeof settings.onInterim === 'function') {
          try { settings.onInterim({ text: (interimChunk || finalChunk).trim(), interim: Boolean(interimChunk.trim()) }); } catch (_) {}
        }
      };
      recognition.onend = function onEnd() {
        if (sessionEpoch !== state.dictationEpoch) return;
        if (recognition !== state.recognition) return;
        state.recognition = null;
        state.listening = false;
        if (input && settings.wakePrefixes && settings.wakePrefixes.length) {
          const next = stripLeadingWakePrefixes(state.committed, settings.wakePrefixes);
          if (next !== state.committed) {
            state.committed = next;
            setInputValue(state.committed, state.committed.length);
          }
        }
        syncCommittedFromInput(false);
        if (!state.userWantsListen || !settings.persistentListen) {
          maybeVoiceSend('');
        }
        if (state.ttsDuck) {
          updateButton();
          updateStatus('Speaking…');
          return;
        }
        if (state.userWantsListen && settings.persistentListen) {
          updateButton();
          updateStatus('Restarting mic…');
          if (!state.restartTimer) {
            scheduleMicRestart(40);
          }
          return;
        }
        if (!state.userWantsListen) clearInputHighlight();
        updateButton();
        updateStatus(settings.idleText);
        if (typeof settings.onStop === 'function') {
          try { settings.onStop({ inputValue: String(input?.value || '') }); } catch (_) {}
        }
      };
    }

    function appendServerTranscript(text) {
      const chunk = String(text || '').trim();
      if (!chunk) return;
      const lowerChunk = chunk.toLowerCase();
      const tail = state.committed.slice(-Math.max(chunk.length + 24, 48)).toLowerCase();
      if (tail.endsWith(lowerChunk)) return;
      applyDictation(chunk + ' ', '');
    }

    function syncListenStateFromInput() {
      if (settings.mode === 'replace') {
        state.committed = '';
        state.appendAt = 0;
        state.replaceEnd = null;
      } else {
        state.committed = String(input.value || '');
        try {
          const start = input.selectionStart;
          const end = input.selectionEnd;
          if (typeof start === 'number' && typeof end === 'number' && start !== end) {
            state.appendAt = start;
            state.replaceEnd = end;
          } else {
            state.appendAt = typeof start === 'number' ? start : state.committed.length;
            state.replaceEnd = null;
          }
        } catch (_) {
          state.appendAt = state.committed.length;
          state.replaceEnd = null;
        }
      }
      state.lastRenderedValue = state.committed;
    }

    async function transcribeServerChunk(blob, sessionEpoch) {
      if (sessionEpoch !== state.dictationEpoch) return;
      state.sttInFlight += 1;
      try {
        const text = await settings.serverSttTranscribe(blob, {
          committed: state.committed,
          appendAt: state.appendAt,
        });
        if (sessionEpoch !== state.dictationEpoch || !state.userWantsListen || state.ttsDuck) return;
        const trimmed = String(text || '').trim();
        if (trimmed) {
          state.serverSttConsecutiveFailures = 0;
          if (typeof settings.onInterim === 'function') {
            try { settings.onInterim({ text: trimmed, interim: true, engine: 'whisper' }); } catch (_) {}
          }
          appendServerTranscript(trimmed);
          if (maybeVoiceSend(trimmed)) return;
          updateStatus('Listening (Whisper)…');
          return;
        }
        noteServerSttFailure(sessionEpoch, 'Whisper returned no text — still listening…');
      } catch (err) {
        if (sessionEpoch !== state.dictationEpoch) return;
        const msg = err?.message ? String(err.message) : 'Whisper chunk failed';
        noteServerSttFailure(sessionEpoch, `${msg} — retrying…`);
      } finally {
        state.sttInFlight -= 1;
      }
    }

    async function startServerListeningInternal() {
      if (state.destroyed || state.mediaRecorder) return;
      if (!state.warmStream) {
        const warmed = await warmAudioInput();
        if (!warmed) return;
      }
      syncListenStateFromInput();
      const sessionEpoch = state.dictationEpoch;
      const mimeType = global.MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : (global.MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '');
      let recorder;
      try {
        recorder = mimeType
          ? new global.MediaRecorder(state.warmStream, { mimeType })
          : new global.MediaRecorder(state.warmStream);
      } catch (_) {
        noteServerSttFailure(sessionEpoch, 'Could not start Whisper mic — trying browser…');
        return;
      }

      recorder.ondataavailable = function onSttChunk(ev) {
        if (sessionEpoch !== state.dictationEpoch || !state.userWantsListen || state.ttsDuck) return;
        if (!ev.data || ev.data.size < (settings.serverSttMinBytes || 600)) return;
        transcribeServerChunk(ev.data, sessionEpoch);
      };

      recorder.onstart = function onSttStart() {
        if (sessionEpoch !== state.dictationEpoch) return;
        state.listening = true;
        updateButton();
        focusInputHighlight();
        updateStatus('Listening (Whisper)… say “send it” to post.');
        if (typeof settings.onStart === 'function') {
          try { settings.onStart({ inputValue: String(input?.value || ''), engine: 'whisper' }); } catch (_) {}
        }
      };

      recorder.onstop = function onSttStop() {
        if (sessionEpoch !== state.dictationEpoch) return;
        if (state.mediaRecorder === recorder) state.mediaRecorder = null;
        state.listening = false;
        syncCommittedFromInput(false);
        if (!state.userWantsListen || !settings.persistentListen) {
          maybeVoiceSend('');
        }
        if (state.ttsDuck) {
          updateButton();
          updateStatus('Speaking…');
          return;
        }
        if (state.userWantsListen && settings.persistentListen) {
          updateButton();
          updateStatus('Restarting mic…');
          if (!state.restartTimer) scheduleMicRestart(80);
          return;
        }
        if (!state.userWantsListen) clearInputHighlight();
        updateButton();
        updateStatus(settings.idleText);
        if (typeof settings.onStop === 'function') {
          try { settings.onStop({ inputValue: String(input?.value || ''), engine: 'whisper' }); } catch (_) {}
        }
      };

      recorder.onerror = function onSttError() {
        state.listening = false;
        if (state.mediaRecorder === recorder) state.mediaRecorder = null;
        updateButton();
        noteServerSttFailure(sessionEpoch, 'Mic recorder error — switching…');
      };

      state.mediaRecorder = recorder;
      try {
        recorder.start(settings.serverSttChunkMs || 1800);
      } catch (_) {
        state.mediaRecorder = null;
        noteServerSttFailure(sessionEpoch, 'Mic busy — trying browser mic…');
      }
    }

    function restartListeningInternal() {
      if (useServerStt()) startServerListeningInternal();
      else startListeningInternal();
    }

    function startListeningInternal() {
      if (!SpeechRecognitionCtor || state.destroyed) return;
      if (state.recognition) return;
      const sessionEpoch = state.dictationEpoch;
      const recognition = new SpeechRecognitionCtor();
      if (settings.mode === 'replace') {
        state.committed = '';
        state.appendAt = 0;
        state.replaceEnd = null;
      } else {
        state.committed = String(input.value || '');
        try {
          const start = input.selectionStart;
          const end = input.selectionEnd;
          if (typeof start === 'number' && typeof end === 'number' && start !== end) {
            state.appendAt = start;
            state.replaceEnd = end;
          } else {
            state.appendAt = typeof start === 'number' ? start : state.committed.length;
            state.replaceEnd = null;
          }
        } catch (_) {
          state.appendAt = state.committed.length;
          state.replaceEnd = null;
        }
      }
      state.lastRenderedValue = state.committed;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = settings.lang;
      bindRecognitionHandlers(recognition, sessionEpoch);
      state.recognition = recognition;
      try {
        recognition.start();
      } catch (err) {
        state.recognition = null;
        updateStatus('Mic busy — tap mic again in a second.');
      }
    }

    async function startListening() {
      const canServer = useServerStt();
      const canBrowser = Boolean(SpeechRecognitionCtor);
      if (!canServer && !canBrowser) {
        button.disabled = true;
        updateStatus('Voice input is not supported in this browser');
        return;
      }
      if (state.listening || state.recognition || state.mediaRecorder) return;

      if (state.userWantsListen && !settings.persistentListen) {
        stopListening(true);
        return;
      }

      state.userWantsListen = true;
      state.autoSendFired = false;
      updateButton();
      if (!state.micWarmed) {
        const warmed = await warmAudioInput();
        if (!warmed) {
          state.userWantsListen = false;
          updateButton();
          return;
        }
      } else {
        updateStatus(canServer ? 'Listening (Whisper)…' : 'Listening…');
      }
      restartListeningInternal();
    }

    state.buttonListener = function onButtonClick() {
      if (state.userWantsListen) stopListening(true);
      else startListening();
    };
    button.addEventListener('click', state.buttonListener);

    state.inputListener = function onInputEvent() {
      onManualInput();
    };
    state.selectionListener = function onSelectionEvent(ev) {
      onInputSelectionChange(ev);
    };
    state.pointerDownListener = function onPointerDownEvent() {
      onPointerDown();
    };
    state.beforeInputListener = function onBeforeInputEvent(ev) {
      if (state.programmaticUpdate) return;
      const inputType = String(ev?.inputType || '');
      if (/^delete/.test(inputType) || inputType === 'insertFromPaste' || inputType === 'insertFromDrop') {
        abortActiveCapture();
      }
    };
    input.addEventListener('input', state.inputListener);
    input.addEventListener('beforeinput', state.beforeInputListener);
    input.addEventListener('keyup', state.selectionListener);
    input.addEventListener('mouseup', state.selectionListener);
    input.addEventListener('select', state.selectionListener);
    input.addEventListener('mousedown', state.pointerDownListener);

    if (speakToggle) {
      loadSpeakPreference();
      state.speakListener = function onSpeakChange() {
        saveSpeakPreference();
      };
      speakToggle.addEventListener('change', state.speakListener);
    }

    if (!SpeechRecognitionCtor && !useServerStt()) {
      button.disabled = true;
      updateStatus('Voice input is not supported in this browser');
    } else {
      updateStatus(settings.idleText);
      updateButton();
      if (settings.warmMicOnStart) {
        global.setTimeout(() => { warmAudioInput().catch(() => {}); }, 300);
      }
    }

    const controller = {
      speak(text) {
        if (!state.speakingEnabled) return;
        if (settings.pauseMicDuringTts) controller.pauseForTts();
        speakTextAsync(text, {
          preferServerTts: settings.preferServerTts,
          serverTtsFetch: settings.serverTtsFetch,
          onEnd: () => controller.resumeAfterTts(),
        });
      },
      startMic() {
        startListening();
      },
      stopMic() {
        stopListening(true);
      },
      clearBuffer() {
        clearInputBuffer();
      },
      isPersistentListen() {
        return Boolean(state.userWantsListen);
      },
      pauseForTts() {
        if (!settings.pauseMicDuringTts || !state.userWantsListen) return;
        state.ttsDuck = true;
      cancelMicRestart();
      abortActiveCapture();
      syncCommittedFromInput(false);
        updateButton();
        updateStatus('Speaking…');
      },
      resumeAfterTts() {
        if (!settings.pauseMicDuringTts) return;
        state.ttsDuck = false;
        if (!state.userWantsListen || state.destroyed) return;
        scheduleMicRestart(80);
      },
      warmMic() {
        return warmAudioInput();
      },
      async setAudioDevice(deviceId) {
        state.selectedAudioDeviceId = String(deviceId || '').trim();
        releaseWarmStream();
        if (state.userWantsListen) {
          stopListening(false);
          const warmed = await warmAudioInput();
          if (warmed && !state.ttsDuck) restartListeningInternal();
        }
      },
      getAudioDeviceId() {
        return state.selectedAudioDeviceId || state.autoResolvedDeviceId;
      },
      getActiveMicLabel() {
        const track = state.warmStream?.getAudioTracks?.()[0];
        return String(track?.label || '').trim();
      },
      setServerSttOptions(next) {
        const opts = next && typeof next === 'object' ? next : {};
        if (Object.prototype.hasOwnProperty.call(opts, 'enabled')) {
          settings.serverSttEnabled = Boolean(opts.enabled);
        }
        if (typeof opts.transcribe === 'function') {
          settings.serverSttTranscribe = opts.transcribe;
        }
        if (typeof opts.failureLimit === 'number' && opts.failureLimit > 0) {
          settings.serverSttFailureLimit = opts.failureLimit;
        }
        if (!settings.serverSttEnabled) {
          state.serverSttForceBrowser = false;
        }
      },
      stop() {
        stopListening();
        if (synth) synth.cancel();
      },
      destroy() {
        if (state.destroyed) return;
        state.destroyed = true;
        stopListening(true);
        releaseWarmStream();
        button.removeEventListener('click', state.buttonListener);
        input.removeEventListener('input', state.inputListener);
        input.removeEventListener('beforeinput', state.beforeInputListener);
        input.removeEventListener('keyup', state.selectionListener);
        input.removeEventListener('mouseup', state.selectionListener);
        input.removeEventListener('select', state.selectionListener);
        input.removeEventListener('mousedown', state.pointerDownListener);
        if (speakToggle && state.speakListener) {
          speakToggle.removeEventListener('change', state.speakListener);
        }
        controllers.delete(settings.buttonId);
      },
    };

    controllers.set(settings.buttonId, controller);
    return controller;
  }

  global.LifeOSVoiceChat = {
    attach: attach,
    speakText: speakText,
    speakTextAsync: speakTextAsync,
    stopSpeaking: stopSpeaking,
    isSpeaking: isSpeaking,
    listSpeakableVoices: listSpeakableVoices,
    listAudioInputDevices: listAudioInputDevices,
    isRecognitionSupported: function isRecognitionSupported() {
      return Boolean(SpeechRecognitionCtor);
    },
    isServerSttSupported: function isServerSttSupported() {
      return Boolean(global.MediaRecorder && global.navigator?.mediaDevices?.getUserMedia);
    },
  };
})(window);