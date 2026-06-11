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
    if (/Samantha|Ava|Allison|Karen|Daniel|Serena|Moira|Tessa|Victoria|Tom/i.test(name)) score += 70;
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

    const utterance = new SpeechSynthesisUtterance(cleaned.slice(0, 2000));
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = pitch;
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
      : ['send it', 'send message', 'send that', 'send now', 'send', 'over'];
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

  function attach(options) {
    const settings = Object.assign({
      mode: 'append',
      lang: 'en-US',
      idleText: 'Voice ready',
      startLabel: 'Start voice',
      stopLabel: 'Stop voice',
      storageKey: '',
      speakRepliesDefault: false,
      /** If set, leading wake phrases (case-insensitive) are stripped from the textarea when a listen session ends. */
      wakePrefixes: [],
      /** When true, saying "send" / "over" at end of utterance triggers onVoiceSend (walkie-talkie style). */
      voiceSendEnabled: false,
      voiceSendPhrases: ['send it', 'send message', 'send that', 'send now', 'send', 'over'],
      onVoiceSend: null,
      focusInputOnMic: true,
      iconOnly: false,
      silentStatus: false,
      onStart: null,
      onStop: null,
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
      buffer: '',
      destroyed: false,
      buttonListener: null,
      speakListener: null,
      storageKey: settings.storageKey,
      speakingEnabled: settings.speakRepliesDefault,
    };

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
      button.classList.toggle('listening', state.listening);
      button.setAttribute('aria-pressed', state.listening ? 'true' : 'false');
    }

    function maybeVoiceSend(fromFinal) {
      if (!settings.voiceSendEnabled || typeof settings.onVoiceSend !== 'function') return false;
      const parsed = stripVoiceSendCommand(input.value, settings.voiceSendPhrases);
      if (!parsed.send || !String(parsed.message || '').trim()) return false;
      stopListening();
      input.value = parsed.message;
      try {
        settings.onVoiceSend(parsed.message);
      } catch (_) {}
      return true;
    }

    function focusInputHighlight() {
      if (!settings.focusInputOnMic || !input) return;
      input.focus();
      input.classList.add('mic-active');
      try {
        const len = input.value.length;
        input.setSelectionRange(len, len);
      } catch (_) {}
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

    function stopListening() {
      if (state.recognition) {
        try {
          state.recognition.onend = null;
          state.recognition.stop();
        } catch (_) {
          // Ignore stop failures.
        }
        state.recognition = null;
      }
      state.listening = false;
      clearInputHighlight();
      updateButton();
      updateStatus(settings.idleText);
    }

    function startListening() {
      if (!SpeechRecognitionCtor) {
        button.disabled = true;
        updateStatus('Voice input is not supported in this browser');
        return;
      }
      if (state.listening) {
        stopListening();
        return;
      }

      const recognition = new SpeechRecognitionCtor();
      const baseText = settings.mode === 'replace' ? '' : String(input.value || '').trim();
      state.buffer = baseText ? baseText + ' ' : '';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = settings.lang;
      recognition.onstart = function onStart() {
        state.listening = true;
        updateButton();
        focusInputHighlight();
        updateStatus(settings.silentStatus ? '' : 'Listening... Say “send” or “over” when done.');
        if (typeof settings.onStart === 'function') {
          try { settings.onStart({ inputValue: String(input?.value || '') }); } catch (_) {}
        }
      };
      recognition.onerror = function onError(event) {
        const message = event && event.error ? 'Voice error: ' + event.error : 'Voice input failed';
        state.listening = false;
        state.recognition = null;
        updateButton();
        updateStatus(message);
      };
      recognition.onresult = function onResult(event) {
        let finalChunk = '';
        let interimChunk = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = String(event.results[index][0].transcript || '');
          if (event.results[index].isFinal) finalChunk += transcript + ' ';
          else interimChunk += transcript;
        }
        if (finalChunk) state.buffer += finalChunk;
        input.value = (state.buffer + interimChunk).trim();
        if (finalChunk && maybeVoiceSend(true)) return;
        updateStatus(interimChunk ? 'Listening... ' + interimChunk.trim() : 'Listening...');
      };
      recognition.onend = function onEnd() {
        state.recognition = null;
        state.listening = false;
        if (input && settings.wakePrefixes && settings.wakePrefixes.length) {
          const next = stripLeadingWakePrefixes(input.value, settings.wakePrefixes);
          if (next !== input.value) input.value = next;
        }
        if (!maybeVoiceSend(true)) {
          clearInputHighlight();
        }
        updateButton();
        updateStatus(settings.idleText);
        if (typeof settings.onStop === 'function') {
          try { settings.onStop({ inputValue: String(input?.value || '') }); } catch (_) {}
        }
      };
      state.recognition = recognition;
      recognition.start();
    }

    state.buttonListener = function onButtonClick() {
      if (state.listening) stopListening();
      else startListening();
    };
    button.addEventListener('click', state.buttonListener);

    if (speakToggle) {
      loadSpeakPreference();
      state.speakListener = function onSpeakChange() {
        saveSpeakPreference();
      };
      speakToggle.addEventListener('change', state.speakListener);
    }

    if (!SpeechRecognitionCtor) {
      button.disabled = true;
      updateStatus('Voice input is not supported in this browser');
    } else {
      updateStatus(settings.idleText);
      updateButton();
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
        stopListening();
      },
      stop() {
        stopListening();
        if (synth) synth.cancel();
      },
      destroy() {
        if (state.destroyed) return;
        state.destroyed = true;
        stopListening();
        button.removeEventListener('click', state.buttonListener);
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
  };
})(window);
