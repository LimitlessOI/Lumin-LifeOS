/**
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 * Shared browser voice input/output controls for LifeOS chat surfaces.
 */
(function (global) {
  const SpeechRecognitionCtor = global.SpeechRecognition || global.webkitSpeechRecognition || null;
  const synth = global.speechSynthesis || null;
  const controllers = new Map();

  function normalizeText(value) {
    return String(value || '')
      .replace(/[`*_>#-]+/g, ' ')
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
    if (/Samantha|Ava|Allison|Daniel|Serena|Moira|Tessa|Victoria|Tom/i.test(name)) score += 70;
    if (/Karen/i.test(name)) score += 20;
    if (/Google (US )?English|Microsoft (Aria|Jenny|Guy|Zira|Steffan)/i.test(name)) score += 50;
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

  function speakText(text, options) {
    const opts = typeof options === 'function' ? { onEnd: options } : options || {};
    let cleaned = normalizeText(text);
    cleaned = cleaned
      .replace(/\bintent:\s*\S+/gi, '')
      .replace(/\bvia lifeos\/\S+.*$/gim, '')
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

  function stopSpeaking() {
    if (synth) synth.cancel();
  }

  function isSpeaking() {
    return Boolean(synth && synth.speaking);
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  function stripVoiceSendCommand(text, phrases) {
    let t = String(text || '').trim();
    if (!t) return { send: false, message: '' };
    const list = phrases && phrases.length
      ? phrases
      : ['send it', 'send message', 'send that', 'send now', 'send'];
    for (let i = 0; i < list.length; i += 1) {
      const raw = String(list[i] || '').trim();
      if (!raw) continue;
      const re = new RegExp('(?:^|\\s)' + raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.?\\s*$', 'i');
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
      voiceSendPhrases: ['send it', 'send message', 'send that', 'send now', 'send'],
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
      serverSttEnabled: false,
      serverSttTranscribe: null,
      serverSttChunkMs: 1800,
      serverSttMinBytes: 600,
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
      storageKey: settings.storageKey,
      speakingEnabled: settings.speakRepliesDefault,
    };

    function releaseWarmStream() {
      if (!state.warmStream) return;
      try {
        state.warmStream.getTracks().forEach((t) => { try { t.stop(); } catch (_) {} });
      } catch (_) {}
      state.warmStream = null;
      state.micWarmed = false;
    }

    async function warmAudioInput() {
      if (!settings.warmMicOnStart || !global.navigator?.mediaDevices?.getUserMedia) return true;
      if (state.micWarmed && state.warmStream) return true;
      if (state.warming) return true;
      state.warming = true;
      updateStatus('Starting microphone…');
      try {
        const stream = await global.navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        state.warmStream = stream;
        state.micWarmed = true;
        return true;
      } catch (err) {
        updateStatus('Mic permission needed — allow microphone in browser settings.');
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
        settings.serverSttEnabled &&
        typeof settings.serverSttTranscribe === 'function' &&
        global.MediaRecorder &&
        global.navigator?.mediaDevices?.getUserMedia,
      );
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

    function maybeVoiceSend(fromFinal) {
      if (!settings.voiceSendEnabled || typeof settings.onVoiceSend !== 'function') return false;
      const parsed = stripVoiceSendCommand(input.value, settings.voiceSendPhrases);
      if (!parsed.send || !String(parsed.message || '').trim()) return false;
      const msg = parsed.message;
      if (settings.keepListeningOnVoiceSend) {
        clearInputBuffer();
        try {
          settings.onVoiceSend(msg);
        } catch (_) {}
        updateStatus('Listening… (say “send” to post again)');
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
      abortActiveCapture();
      state.listening = false;
      syncCommittedFromInput(true);
      if (!state.userWantsListen) clearInputHighlight();
      updateButton();
      updateStatus(state.userWantsListen ? 'Restarting mic…' : settings.idleText);
    }

    function bindRecognitionHandlers(recognition, sessionEpoch) {
      recognition.onstart = function onStart() {
        if (sessionEpoch !== state.dictationEpoch || recognition !== state.recognition) return;
        state.listening = true;
        updateButton();
        focusInputHighlight();
        updateStatus(settings.silentStatus ? '' : 'Listening… say “send” to post.');
        if (typeof settings.onStart === 'function') {
          try { settings.onStart({ inputValue: String(input?.value || '') }); } catch (_) {}
        }
      };
      recognition.onerror = function onError(event) {
        if (sessionEpoch !== state.dictationEpoch || recognition !== state.recognition) return;
        const code = event && event.error ? event.error : 'unknown';
        if (code === 'no-speech' && state.userWantsListen) return;
        if (code === 'aborted') return;
        const message = 'Voice error: ' + code;
        state.listening = false;
        state.recognition = null;
        updateButton();
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
        if (finalChunk && maybeVoiceSend(true)) return;
        updateStatus(interimChunk ? interimChunk.trim() : 'Listening…');
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
        maybeVoiceSend(true);
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
        if (text && String(text).trim()) {
          appendServerTranscript(text);
          maybeVoiceSend(true);
          updateStatus('Listening (Whisper)…');
        }
      } catch (_) {
        if (sessionEpoch === state.dictationEpoch) {
          updateStatus('Whisper chunk failed — still listening…');
        }
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
        updateStatus('Could not start server mic — try again.');
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
        updateStatus('Listening (Whisper)… say “send” to post.');
        if (typeof settings.onStart === 'function') {
          try { settings.onStart({ inputValue: String(input?.value || ''), engine: 'whisper' }); } catch (_) {}
        }
      };

      recorder.onstop = function onSttStop() {
        if (sessionEpoch !== state.dictationEpoch) return;
        if (state.mediaRecorder === recorder) state.mediaRecorder = null;
        state.listening = false;
        syncCommittedFromInput(false);
        maybeVoiceSend(true);
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
        updateStatus('Mic error — tap mic again.');
      };

      state.mediaRecorder = recorder;
      try {
        recorder.start(settings.serverSttChunkMs || 1800);
      } catch (_) {
        state.mediaRecorder = null;
        updateStatus('Mic busy — tap mic again in a second.');
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
        speakText(text);
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
    stopSpeaking: stopSpeaking,
    isSpeaking: isSpeaking,
    listSpeakableVoices: listSpeakableVoices,
    isRecognitionSupported: function isRecognitionSupported() {
      return Boolean(SpeechRecognitionCtor);
    },
    isServerSttSupported: function isServerSttSupported() {
      return Boolean(global.MediaRecorder && global.navigator?.mediaDevices?.getUserMedia);
    },
  };
})(window);
