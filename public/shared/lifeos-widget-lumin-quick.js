(function(){
  const STORAGE_KEY_HISTORY = 'lifeos-lumin-quick-history';
  const API_ENDPOINT = '/api/v1/lifeos/chat';
  const MAX_HISTORY_ITEMS = 3;

  let containerEl;
  let inputEl;
  let sendBtn;
  let historyEl;
  let statusEl;
  let openFullChatLink;

  let currentUser = 'anonymous';
  let currentCommandKey = null;

  function getHistory() {
    try {
      const history = sessionStorage.getItem(STORAGE_KEY_HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (e) {
      console.error('Lumin Quick Widget: Error reading history from sessionStorage:', e);
      return [];
    }
  }

  function saveHistory(history) {
    try {
      sessionStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error('Lumin Quick Widget: Error saving history to sessionStorage:', e);
    }
  }

  function renderHistory() {
    if (!historyEl) return;
    const history = getHistory();
    historyEl.innerHTML = history.map(item => `<div class="lumin-quick-response">${item}</div>`).join('');
  }

  function showStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = isError ? 'var(--lumin-quick-error-color, red)' : 'var(--dash-muted, grey)';
    statusEl.style.display = message ? 'block' : 'none';
  }

  async function sendMessage() {
    const message = inputEl.value.trim();
    if (!message) return;

    inputEl.disabled = true;
    sendBtn.disabled = true;
    showStatus('...');

    try {
      const postBody = {
        message: message,
        user: currentUser,
      };
      if (currentCommandKey) {
        postBody.commandKey = currentCommandKey;
      }

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.reply || data.message || data.response;

      if (reply) {
        const history = getHistory();
        history.unshift(reply);
        if (history.length > MAX_HISTORY_ITEMS) {
          history.pop();
        }
        saveHistory(history);
        renderHistory();
        inputEl.value = '';
        showStatus('');
      } else {
        showStatus('No reply received.', true);
      }

    } catch (error) {
      console.error('Lumin Quick Widget: Chat error:', error);
      showStatus(`Error: ${error.message}`, true);
    } finally {
      inputEl.disabled = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  function handleOpenFullChat() {
    if (window.LifeOSDashboardAiRail && typeof window.LifeOSDashboardAiRail.expand === 'function') {
      window.LifeOSDashboardAiRail.expand();
    } else {
      console.warn('Lumin Quick Widget: window.LifeOSDashboardAiRail.expand() not found or not a function.');
    }
  }

  function mount({ container, user, commandKey }) {
    containerEl = document.getElementById(container);
    if (!containerEl) {
      console.error(`Lumin Quick Widget: Container element #${container} not found.`);
      return;
    }

    currentUser = user || 'anonymous';
    currentCommandKey = commandKey || null;

    containerEl.innerHTML = `
      <style>
        .lumin-quick-widget {
          --lumin-quick-error-color: red; /* Fallback if --dash-error is not defined */
          font-family: var(--dash-font-family, sans-serif);
          font-size: 0.9em;
          color: var(--dash-text, #1a1a22);
          background-color: var(--dash-surface, #ffffff);
          border: 1px solid var(--dash-border, rgba(0,0,0,0.1));
          border-radius: var(--dash-radius-lg, 8px);
          padding: var(--dash-space-unit, 8px);
          display: flex;
          flex-direction: column;
          gap: calc(var(--dash-space-unit, 8px) / 2);
        }
        .lumin-quick-input-area {
          display: flex;
          gap: calc(var(--dash-space-unit, 8px) / 2);
        }
        .lumin-quick-input {
          flex-grow: 1;
          padding: calc(var(--dash-space-unit, 8px) / 2);
          border: 1px solid var(--dash-border, rgba(0,0,0,0.1));
          border-radius: var(--dash-radius-lg, 4px);
          background-color: var(--dash-bg, #f6f7fb);
          color: var(--dash-text, #1a1a22);
        }
        .lumin-quick-input:focus {
          outline: none;
          border-color: var(--dash-accent, #5b6af5);
        }
        .lumin-quick-btn {
          padding: calc(var(--dash-space-unit, 8px) / 2) var(--dash-space-unit, 8px);
          border: none;
          border-radius: var(--dash-radius-lg, 4px);
          background-color: var(--dash-accent, #5b6af5);
          color: white;
          cursor: pointer;
          font-weight: bold;
        }
        .lumin-quick-btn:hover:not(:disabled) {
          opacity: 0.9;
        }
        .lumin-quick-btn:disabled {
          background-color: var(--dash-muted, #777788);
          cursor: not-allowed;
        }
        .lumin-quick-history {
          display: flex;
          flex-direction: column;
          gap: calc(var(--dash-space-unit, 8px) / 4);
          margin-top: calc(var(--dash-space-unit, 8px) / 2);
        }
        .lumin-quick-response {
          background-color: var(--dash-bg, #f6f7fb);
          padding: calc(var(--dash-space-unit, 8px) / 2);
          border-radius: var(--dash-radius-lg, 4px);
          border: 1px solid var(--dash-border, rgba(0,0,0,0.05));
          color: var(--dash-text, #1a1a22);
        }
        .lumin-quick-status {
          margin-top: calc(var(--dash-space-unit, 8px) / 4);
          font-size: 0.8em;
          min-height: 1em; /* Prevent layout shift */
        }
        .lumin-quick-open-chat {
          text-align: right;
          margin-top: calc(var(--dash-space-unit, 8px) / 2);
        }
        .lumin-quick-open-chat a {
          color: var(--dash-accent, #5b6af5);
          text-decoration: none;
          font-size: 0.85em;
        }
        .lumin-quick-open-chat a:hover {
          text-decoration: underline;
        }
      </style>
      <div class="lumin-quick-widget">
        <div class="lumin-quick-input-area">
          <input type="text" class="lumin-quick-input" placeholder="Ask Lumin anything..." />
          <button class="lumin-quick-btn">Send</button>
        </div>
        <div class="lumin-quick-status" style="display: none;"></div>
        <div class="lumin-quick-history"></div>
        <div class="lumin-quick-open-chat" id="lumin-quick-open-chat-link-container"></div>
      </div>
    `;

    inputEl = containerEl.querySelector('.lumin-quick-input');
    sendBtn = containerEl.querySelector('.lumin-quick-btn');
    historyEl = containerEl.querySelector('.lumin-quick-history');
    statusEl = containerEl.querySelector('.lumin-quick-status');
    const openChatLinkContainer = containerEl.querySelector('#lumin-quick-open-chat-link-container');

    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    if (window.LifeOSDashboardAiRail && typeof window.LifeOSDashboardAiRail.expand === 'function') {
      openChatLinkContainer.innerHTML = '<a href="#" class="lumin-quick-open-chat-link">Open full chat</a>';
      openFullChatLink = openChatLinkContainer.querySelector('.lumin-quick-open-chat-link');
      openFullChatLink.addEventListener('click', (e) => {
        e.preventDefault();
        handleOpenFullChat();
      });
    }

    renderHistory();
  }

  window.LifeOSWidgetLuminQuick = {
    mount: mount
  };
})();