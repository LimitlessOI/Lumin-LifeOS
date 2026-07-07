/**
 * SYNOPSIS: Exports renderChatPanel — services/site-builder-editor-chat.js.
 */
function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function jsString(value) {
  return JSON.stringify(String(value ?? ""));
}

export function renderChatPanel({ clientId, editToken, baseUrl } = {}) {
  const safeClientId = htmlEscape(clientId);
  const safeBaseUrl = htmlEscape(baseUrl);
  const clientIdJs = jsString(clientId);
  const editTokenJs = jsString(editToken);
  const baseUrlJs = jsString(baseUrl);

  return `
<section class="sb-chat-panel" data-sb-chat-panel data-client-id="${safeClientId}" data-base-url="${safeBaseUrl}" aria-label="AI chat and voice editor">
  <style>
    .sb-chat-panel {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      gap: 10px;
      padding: 12px;
      color: #111827;
      background: #ffffff;
      border-left: 1px solid rgba(17, 24, 39, 0.10);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .sb-chat-panel * {
      box-sizing: border-box;
    }

    .sb-chat-panel__title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.25;
    }

    .sb-chat-panel__hint {
      margin: -4px 0 0;
      color: #6b7280;
      font-size: 12px;
      line-height: 1.35;
    }

    .sb-chat-panel__messages {
      flex: 1 1 auto;
      min-height: 180px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px;
      border: 1px solid rgba(17, 24, 39, 0.10);
      border-radius: 12px;
      background: #f9fafb;
    }

    .sb-chat-panel__bubble {
      max-width: 92%;
      padding: 8px 10px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.4;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .sb-chat-panel__bubble--user {
      align-self: flex-end;
      color: #ffffff;
      background: #2563eb;
      border-bottom-right-radius: 4px;
    }

    .sb-chat-panel__bubble--assistant {
      align-self: flex-start;
      color: #111827;
      background: #ffffff;
      border: 1px solid rgba(17, 24, 39, 0.08);
      border-bottom-left-radius: 4px;
    }

    .sb-chat-panel__bubble--error {
      align-self: flex-start;
      color: #991b1b;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-bottom-left-radius: 4px;
    }

    .sb-chat-panel__form {
      display: flex;
      gap: 8px;
      align-items: stretch;
      margin: 0;
    }

    .sb-chat-panel__input {
      flex: 1 1 auto;
      min-width: 0;
      height: 40px;
      padding: 0 10px;
      color: #111827;
      background: #ffffff;
      border: 1px solid rgba(17, 24, 39, 0.16);
      border-radius: 10px;
      font: inherit;
      font-size: 13px;
      outline: none;
    }

    .sb-chat-panel__input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    .sb-chat-panel__button {
      flex: 0 0 auto;
      height: 40px;
      padding: 0 12px;
      border: 0;
      border-radius: 10px;
      color: #ffffff;
      background: #111827;
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    .sb-chat-panel__button:hover {
      background: #1f2937;
    }

    .sb-chat-panel__button:disabled {
      opacity: 0.58;
      cursor: not-allowed;
    }

    .sb-chat-panel__mic {
      width: 40px;
      padding: 0;
      font-size: 16px;
      background: #2563eb;
    }

    .sb-chat-panel__mic:hover {
      background: #1d4ed8;
    }

    .sb-chat-panel__mic.is-listening {
      background: #dc2626;
    }

    .sb-chat-panel__voice-note {
      display: none;
      margin: -2px 0 0;
      color: #6b7280;
      font-size: 11px;
      line-height: 1.3;
    }

    .sb-chat-panel__voice-note.is-visible {
      display: block;
    }
  </style>

  <h2 class="sb-chat-panel__title">AI editor</h2>
  <p class="sb-chat-panel__hint">Type or speak what you want changed, then send it to update the site preview.</p>

  <div class="sb-chat-panel__messages" data-sb-chat-messages role="log" aria-live="polite" aria-relevant="additions">
    <div class="sb-chat-panel__bubble sb-chat-panel__bubble--assistant">Tell me what to change on this site.</div>
  </div>

  <form class="sb-chat-panel__form" data-sb-chat-form>
    <input
      class="sb-chat-panel__input"
      data-sb-chat-input
      type="text"
      autocomplete="off"
      placeholder="Describe a change..."
      aria-label="Site edit instruction"
    />
    <button class="sb-chat-panel__button" data-sb-chat-send type="submit">Send</button>
    <button class="sb-chat-panel__button sb-chat-panel__mic" data-sb-chat-mic type="button" title="Speak your change" aria-label="Speak your change">🎙</button>
  </form>
  <p class="sb-chat-panel__voice-note" data-sb-chat-voice-note>Voice not supported in this browser</p>

  <script>
    try {
      (function () {
        var root = document.currentScript && document.currentScript.closest('[data-sb-chat-panel]');
        if (!root) return;

        var clientId = ${clientIdJs};
        var editToken = ${editTokenJs};
        var baseUrl = ${baseUrlJs};
        var messages = root.querySelector('[data-sb-chat-messages]');
        var form = root.querySelector('[data-sb-chat-form]');
        var input = root.querySelector('[data-sb-chat-input]');
        var sendButton = root.querySelector('[data-sb-chat-send]');
        var micButton = root.querySelector('[data-sb-chat-mic]');
        var voiceNote = root.querySelector('[data-sb-chat-voice-note]');
        var recognition = null;
        var isSending = false;

        function escapeText(value) {
          return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        }

        function appendBubble(kind, text) {
          if (!messages) return;
          var bubble = document.createElement('div');
          var className = 'sb-chat-panel__bubble sb-chat-panel__bubble--assistant';

          if (kind === 'user') className = 'sb-chat-panel__bubble sb-chat-panel__bubble--user';
          if (kind === 'error') className = 'sb-chat-panel__bubble sb-chat-panel__bubble--error';

          bubble.className = className;
          bubble.innerHTML = escapeText(text);
          messages.appendChild(bubble);
          messages.scrollTop = messages.scrollHeight;
        }

        function setSending(nextValue) {
          isSending = Boolean(nextValue);
          if (sendButton) sendButton.disabled = isSending;
          if (input) input.disabled = isSending;
        }

        function endpoint() {
          return String(baseUrl || '').replace(/\\/$/, '') + '/api/v1/sites/edit';
        }

        function sendInstruction(rawInstruction) {
          var instruction = String(rawInstruction || '').trim();
          if (!instruction || isSending) return Promise.resolve();

          appendBubble('user', instruction);
          if (input) input.value = '';
          setSending(true);

          return fetch(endpoint(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
              clientId: clientId,
              file: null,
              instruction: instruction,
              token: editToken
            })
          })
            .then(function (response) {
              if (!response || !response.ok) {
                return response.text().catch(function () { return ''; }).then(function (body) {
                  var message = body || ('Edit request failed with status ' + (response ? response.status : 'unknown') + '.');
                  throw new Error(message);
                });
              }

              appendBubble('assistant', 'Change sent. Reloading the preview...');
              try {
                window.dispatchEvent(new CustomEvent('sb-editor:reload', {
                  detail: {
                    clientId: clientId
                  }
                }));
              } catch (eventError) {
                window.dispatchEvent(new Event('sb-editor:reload'));
              }
            })
            .catch(function (error) {
              appendBubble('error', (error && error.message) ? error.message : 'Edit request failed. Please try again.');
            })
            .finally(function () {
              setSending(false);
              if (input) input.focus();
            });
        }

        if (form) {
          form.addEventListener('submit', function (event) {
            event.preventDefault();
            sendInstruction(input ? input.value : '');
          });
        }

        var SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        if (!SpeechRecognition) {
          if (micButton) {
            micButton.hidden = true;
            micButton.title = 'Voice not supported in this browser';
            micButton.setAttribute('aria-hidden', 'true');
          }
          if (voiceNote) {
            voiceNote.classList.add('is-visible');
            voiceNote.title = 'Voice not supported in this browser';
          }
          return;
        }

        if (micButton) {
          recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = document.documentElement.lang || navigator.language || 'en-US';

          recognition.addEventListener('start', function () {
            micButton.classList.add('is-listening');
            micButton.setAttribute('aria-label', 'Listening');
            micButton.title = 'Listening...';
          });

          recognition.addEventListener('end', function () {
            micButton.classList.remove('is-listening');
            micButton.setAttribute('aria-label', 'Speak your change');
            micButton.title = 'Speak your change';
          });

          recognition.addEventListener('result', function (event) {
            var transcript = '';
            for (var i = event.resultIndex || 0; i < event.results.length; i += 1) {
              if (event.results[i] && event.results[i][0] && event.results[i].isFinal !== false) {
                transcript += event.results[i][0].transcript || '';
              }
            }

            transcript = transcript.trim();
            if (!transcript) return;

            if (input) input.value = transcript;
            sendInstruction(transcript);
          });

          recognition.addEventListener('error', function (event) {
            var message = event && event.error ? ('Voice input failed: ' + event.error) : 'Voice input failed. Please type the change instead.';
            appendBubble('error', message);
          });

          micButton.addEventListener('click', function () {
            try {
              recognition.start();
            } catch (error) {
              appendBubble('error', 'Voice input is already active or unavailable. Please try again.');
            }
          });
        }
      })();
    } catch (error) {
      try {
        var script = document.currentScript;
        var panel = script && script.closest('[data-sb-chat-panel]');
        var log = panel && panel.querySelector('[data-sb-chat-messages]');
        if (log) {
          var bubble = document.createElement('div');
          bubble.className = 'sb-chat-panel__bubble sb-chat-panel__bubble--error';
          bubble.textContent = (error && error.message) ? error.message : 'Chat panel failed to initialize.';
          log.appendChild(bubble);
        }
      } catch (nestedError) {}
    }
  </script>
</section>`;
}

export default renderChatPanel;