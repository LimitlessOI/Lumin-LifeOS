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

  function chooseVoice() {
    if (!synth || typeof synth.getVoices !== 'function') return null;
    const voices = synth.getVoices();
    const preferred = [
      /Google US English/i,
      /Microsoft Aria/i,
      /Samantha/i,
      /Alex/i,
      /Neural/i,
      /Natural/i,
      /en-US/i,
      /en-/i,
    ];
    for (const matcher of preferred) {
      const voice = voices.find((candidate) => matcher.test(candidate.name) || matcher.test(candidate.lang));
      if (voice) return voice;
    }
    return voices[0] || null;
  }

  let cachedVoice = chooseVoice();
  if (synth) {
    global.speechSynthesis.onvoiceschanged = function onVoicesChanged() {
      cachedVoice = chooseVoice();
    };
  }

  function speakText(text, options) {
    const opts = typeof options === 'function' ? { onEnd: options } : options || {};
    const cleaned = normalizeText(text);
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
    const utterance = new SpeechSynthesisUtterance(cleaned.slice(0, 2000));
    if (cachedVoice) utterance.voice = cachedVoice;
    utterance.rate = 0.97;
    utterance.pitch = 1;
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

  function setText(node, value) {
    if (node) node.textContent = value;
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
      storageKey: '',
      speakRepliesDefault: false,
      /** If set, leading wake phrases (case-insensitive) are stripped from the textarea when a listen session ends. */
      wakePrefixes: [],
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
      button.textContent = state.listening ? 'Stop voice' : 'Start voice';
      button.classList.toggle('listening', state.listening);
    }

    function updateStatus(value) {
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
        updateStatus('Listening...');
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
        updateStatus(interimChunk ? 'Listening... ' + interimChunk.trim() : 'Listening...');
      };
      recognition.onend = function onEnd() {
        state.recognition = null;
        state.listening = false;
        if (input && settings.wakePrefixes && settings.wakePrefixes.length) {
          const next = stripLeadingWakePrefixes(input.value, settings.wakePrefixes);
          if (next !== input.value) input.value = next;
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
    isRecognitionSupported: function isRecognitionSupported() {
      return Boolean(SpeechRecognitionCtor);
    },
  };
})(window);
