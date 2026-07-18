/**
 * SYNOPSIS: Exports renderChatPanel — services/site-builder-editor-chat.js.
 */
import { CHAT_WELCOME } from './site-builder-editor-onboarding.js';

function htmlEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

function escapeForInlineScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

const QUICK_ACTIONS = [
  { label: "🎨 Try different colors", instruction: "Try a different color palette that still fits my brand" },
  { label: "🖼️ Work on my logo", link: "logo-studio" },
  { label: "✏️ Rewrite my headline", instruction: "Rewrite my homepage headline to be punchier" },
  { label: "📞 Make my CTA stronger", instruction: "Make my call-to-action buttons stronger and more direct" },
  { label: "🖊️ Simplify the wording", instruction: "Simplify the wording across the page so it's easier to read" },
];

function makePanelId({ clientId, editToken, baseUrl }) {
  const source = `${clientId ?? ""}:${editToken ?? ""}:${baseUrl ?? ""}`;
  let hash = 5381;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 33) ^ source.charCodeAt(index);
  }

  return `sb-chat-panel-${(hash >>> 0).toString(36)}`;
}

export function renderChatPanel({ clientId, editToken, baseUrl } = {}) {
  const panelId = makePanelId({ clientId, editToken, baseUrl });
  const escapedPanelId = htmlEscape(panelId);
  const config = {
    clientId: String(clientId ?? ""),
    token: String(editToken ?? ""),
    baseUrl: String(baseUrl ?? ""),
  };
  const escapedWelcome = htmlEscape(CHAT_WELCOME);
  const quickActionChips = QUICK_ACTIONS
    .map((action, i) => {
      const attr = action.link
        ? `data-sb-quick-link="${htmlEscape(action.link)}"`
        : `data-sb-quick-instruction="${htmlEscape(action.instruction)}"`;
      return `<button type="button" class="sb-chat-quick" ${attr} data-sb-quick-index="${i}">${htmlEscape(action.label)}</button>`;
    })
    .join("");

  return `
<section id="${escapedPanelId}" class="sb-chat-panel" data-sb-chat-panel aria-label="AI editor chat and voice panel">
  <style>
    #${escapedPanelId} {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 12px;
      height: 100%;
      min-height: 0;
      padding: 16px;
      color: #111827;
      background: #ffffff;
      border-left: 1px solid #e5e7eb;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    #${escapedPanelId} *,
    #${escapedPanelId} *::before,
    #${escapedPanelId} *::after {
      box-sizing: border-box;
    }

    #${escapedPanelId} .sb-chat-panel__header {
      flex: 0 0 auto;
    }

    #${escapedPanelId} .sb-chat-panel__title {
      margin: 0;
      font-size: 15px;
      line-height: 1.3;
      font-weight: 700;
      color: #111827;
    }

    #${escapedPanelId} .sb-chat-panel__hint {
      margin: 4px 0 0;
      font-size: 12px;
      line-height: 1.45;
      color: #6b7280;
    }

    #${escapedPanelId} .sb-chat-panel__messages {
      flex: 1 1 auto;
      min-height: 180px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: #f9fafb;
    }

    #${escapedPanelId} .sb-chat-bubble {
      max-width: 92%;
      padding: 9px 11px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.45;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    #${escapedPanelId} .sb-chat-bubble--user {
      align-self: flex-end;
      color: #ffffff;
      background: #2563eb;
      border-bottom-right-radius: 4px;
    }

    #${escapedPanelId} .sb-chat-bubble--assistant {
      align-self: flex-start;
      color: #111827;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-bottom-left-radius: 4px;
    }

    #${escapedPanelId} .sb-chat-bubble--error {
      align-self: stretch;
      max-width: 100%;
      color: #991b1b;
      background: #fee2e2;
      border: 1px solid #fecaca;
    }

    #${escapedPanelId} .sb-chat-panel__composer {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
    }

    #${escapedPanelId} .sb-chat-panel__input {
      flex: 1 1 auto;
      min-width: 0;
      height: 38px;
      padding: 0 11px;
      color: #111827;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      font: inherit;
      font-size: 13px;
      outline: none;
    }

    #${escapedPanelId} .sb-chat-panel__input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
    }

    #${escapedPanelId} .sb-chat-panel__button {
      flex: 0 0 auto;
      height: 38px;
      border: 0;
      border-radius: 10px;
      padding: 0 12px;
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    #${escapedPanelId} .sb-chat-panel__send {
      color: #ffffff;
      background: #111827;
    }

    #${escapedPanelId} .sb-chat-panel__mic {
      width: 38px;
      padding: 0;
      color: #111827;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
    }

    #${escapedPanelId} .sb-chat-panel__button:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    #${escapedPanelId} .sb-chat-panel__voice-tip {
      flex: 0 0 auto;
      max-width: 130px;
      font-size: 11px;
      line-height: 1.25;
      color: #6b7280;
    }

    #${escapedPanelId} [hidden] {
      display: none !important;
    }

    #${escapedPanelId} .sb-chat-quick-row {
      flex: 0 0 auto;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    #${escapedPanelId} .sb-chat-quick {
      border: 1px solid #d1d5db;
      background: #f9fafb;
      color: #111827;
      border-radius: 999px;
      padding: 6px 11px;
      font: inherit;
      font-size: 12px;
      line-height: 1.2;
      cursor: pointer;
      transition: border-color 120ms ease, background 120ms ease;
    }

    #${escapedPanelId} .sb-chat-quick:hover {
      border-color: #2563eb;
      background: #eff6ff;
    }

    #${escapedPanelId} .sb-chat-quick:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  </style>

  <div class="sb-chat-panel__header">
    <p class="sb-chat-panel__title">AI editor</p>
    <p class="sb-chat-panel__hint">Type or speak what you want changed, then send it to update the site.</p>
  </div>

  <div class="sb-chat-panel__messages" data-sb-messages role="log" aria-live="polite" aria-relevant="additions"><div class="sb-chat-bubble sb-chat-bubble--assistant">${escapedWelcome}</div></div>

  <div class="sb-chat-quick-row" data-sb-quick-row role="group" aria-label="Quick actions">${quickActionChips}</div>

  <form class="sb-chat-panel__composer" data-sb-form autocomplete="off">
    <input
      class="sb-chat-panel__input"
      data-sb-input
      type="text"
      name="instruction"
      placeholder="Describe the change..."
      aria-label="Change instruction"
    >
    <button class="sb-chat-panel__button sb-chat-panel__send" data-sb-send type="submit">Send</button>
    <button class="sb-chat-panel__button sb-chat-panel__mic" data-sb-mic type="button" title="Speak change request" aria-label="Speak change request">🎙</button>
    <span class="sb-chat-panel__voice-tip" data-sb-voice-tip title="Voice not supported in this browser" hidden>Voice not supported in this browser</span>
  </form>
</section>

<script>
(function () {
  try {
    var config = ${escapeForInlineScript(config)};
    var script = document.currentScript;
    var root = script && script.previousElementSibling;

    if (!root || !root.hasAttribute || !root.hasAttribute("data-sb-chat-panel")) {
      root = document.getElementById(${escapeForInlineScript(panelId)});
    }

    if (!root) {
      return;
    }

    var messages = root.querySelector("[data-sb-messages]");
    var form = root.querySelector("[data-sb-form]");
    var input = root.querySelector("[data-sb-input]");
    var sendButton = root.querySelector("[data-sb-send]");
    var micButton = root.querySelector("[data-sb-mic]");
    var voiceTip = root.querySelector("[data-sb-voice-tip]");
    var quickRow = root.querySelector("[data-sb-quick-row]");

    if (!messages || !form || !input || !sendButton || !micButton || !voiceTip) {
      return;
    }

    function appendBubble(kind, text) {
      var bubble = document.createElement("div");
      bubble.className = "sb-chat-bubble sb-chat-bubble--" + kind;
      bubble.textContent = text || (kind === "error" ? "Something went wrong. Please try again." : "");
      messages.appendChild(bubble);
      messages.scrollTop = messages.scrollHeight;
    }

    function setBusy(isBusy) {
      sendButton.disabled = isBusy;
      input.disabled = isBusy;
      if (!micButton.hidden) {
        micButton.disabled = isBusy;
      }
      if (quickRow) {
        var quickButtons = quickRow.querySelectorAll("button");
        for (var i = 0; i < quickButtons.length; i += 1) quickButtons[i].disabled = isBusy;
      }
    }

    function endpoint() {
      return String(config.baseUrl || "") + "/api/v1/sites/edit";
    }

    async function readErrorBody(response) {
      try {
        var body = await response.text();
        body = String(body || "").trim();

        if (body.length > 500) {
          return body.slice(0, 500) + "...";
        }

        return body;
      } catch (error) {
        return "";
      }
    }

    async function sendInstruction(rawInstruction) {
      var instruction = String(rawInstruction || "").trim();

      if (!instruction) {
        return;
      }

      appendBubble("user", instruction);
      input.value = "";
      setBusy(true);

      try {
        var response = await fetch(endpoint(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            clientId: config.clientId,
            file: null,
            instruction: instruction,
            token: config.token
          })
        });

        if (!response.ok) {
          var detail = await readErrorBody(response);
          appendBubble(
            "error",
            "Could not apply the change (" + response.status + "). " + (detail || "Please try again.")
          );
          return;
        }

        appendBubble("assistant", "Done. Reloading the preview.");
        window.dispatchEvent(new CustomEvent("sb-editor:reload", {
          detail: {
            clientId: config.clientId
          }
        }));
      } catch (error) {
        appendBubble("error", "Could not apply the change. " + ((error && error.message) || "Please try again."));
      } finally {
        setBusy(false);
        input.focus();
      }
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      sendInstruction(input.value);
    });

    if (quickRow) {
      quickRow.addEventListener("click", function (event) {
        var button = event.target && event.target.closest ? event.target.closest("[data-sb-quick-instruction], [data-sb-quick-link]") : null;
        if (!button || !quickRow.contains(button)) return;

        var link = button.getAttribute("data-sb-quick-link");
        if (link === "logo-studio") {
          try {
            window.open(String(config.baseUrl || "") + "/api/v1/sites/logo-studio", "_blank", "noopener");
          } catch (_error) {}
          return;
        }

        var instruction = button.getAttribute("data-sb-quick-instruction");
        if (instruction) sendInstruction(instruction);
      });
    }

    var Recognition = window.webkitSpeechRecognition || window.SpeechRecognition;

    if (!Recognition) {
      micButton.hidden = true;
      voiceTip.hidden = false;
      voiceTip.title = "Voice not supported in this browser";
    } else {
      var recognition = null;
      var listening = false;

      micButton.addEventListener("click", function () {
        try {
          if (!recognition) {
            recognition = new Recognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            recognition.lang = document.documentElement.lang || navigator.language || "en-US";

            recognition.onstart = function () {
              listening = true;
              micButton.textContent = "●";
              micButton.title = "Listening...";
              micButton.setAttribute("aria-label", "Listening");
            };

            recognition.onend = function () {
              listening = false;
              micButton.textContent = "🎙";
              micButton.title = "Speak change request";
              micButton.setAttribute("aria-label", "Speak change request");
            };

            recognition.onerror = function (event) {
              var reason = event && event.error ? " (" + event.error + ")" : "";
              appendBubble("error", "Voice input failed" + reason + ". You can type the change instead.");
            };

            recognition.onresult = function (event) {
              var transcript = "";

              for (var index = event.resultIndex || 0; index < event.results.length; index += 1) {
                if (event.results[index] && event.results[index][0] && event.results[index][0].transcript) {
                  transcript += event.results[index][0].transcript;
                }
              }

              transcript = transcript.trim();

              if (!transcript) {
                appendBubble("error", "No speech was detected. You can type the change instead.");
                return;
              }

              input.value = transcript;
              sendInstruction(transcript);
            };
          }

          if (listening) {
            recognition.stop();
            return;
          }

          recognition.start();
        } catch (error) {
          listening = false;
          appendBubble("error", "Voice input is not available right now. You can type the change instead.");
        }
      });
    }
  } catch (error) {
    try {
      var fallbackScript = document.currentScript;
      var fallbackRoot = fallbackScript && fallbackScript.previousElementSibling;
      var fallbackMessages = fallbackRoot && fallbackRoot.querySelector && fallbackRoot.querySelector("[data-sb-messages]");

      if (fallbackMessages) {
        var fallbackBubble = document.createElement("div");
        fallbackBubble.className = "sb-chat-bubble sb-chat-bubble--error";
        fallbackBubble.textContent = "Chat panel could not initialize. Please refresh and try again.";
        fallbackMessages.appendChild(fallbackBubble);
      }
    } catch (fallbackError) {}
  }
})();
</script>
`.trim();
}

export default renderChatPanel;