(function(){
  const STORAGE_KEY = 'lifeos-lumin-quick-history';
  const API_ENDPOINT = '/api/v1/lifeos/chat';

  /**
   * Helper to get state from sessionStorage.
   * @param {string} key - The key for the sessionStorage item.
   * @param {} defaultValue - The default value if the item is not found or parsing fails.
   * @returns {} The parsed value from sessionStorage or the default value.
   */
  function getState(key, defaultValue) {
    try {
      const stored = sessionStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch (e) {
      console.error('Error reading sessionStorage:', e);
      return defaultValue;
    }
  }

  /**
   * Helper to set state in sessionStorage.
   * @param {string} key - The key for the sessionStorage item.
   * @param {} value - The value to store.
   */
  function setState(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Error writing sessionStorage:', e);
    }
  }

  /**
   * Mounts the Lumin quick-entry widget into the specified container.
   * @param {object} options - Configuration options.
   * @param {HTMLElement} options.container - The DOM element to mount the widget into.
   * @param {string} options.user - The current user identifier.
   * @param {string} [options.commandKey] - Optional command key for the chat API.
   */
  function mount({ container, user, commandKey }) {
    if (!container) {
      console.error('Lumin Quick Widget: Container element not provided.');
      return;
    }

    let history = getState(STORAGE_KEY, []);

    container.innerHTML = `
      <style>
        .lifeos-lumin-quick-widget {
          font-family: sans-serif;
          font-size: 14px;
          color: var(--dash-text, #e8e8f0);
          background-color: var(--dash-surface, #111118);
          border: 1px solid var(--dash-border, rgba(255,255,255,0.07));
          border-radius: var(--dash-radius-lg, 14px);
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-width: 400px; /* Arbitrary max-width for better display */
        }
        .lifeos-lumin-quick-input-area {
          display: flex;
          gap: 5px;
        }
        .lifeos-lumin-quick-input {
          flex-grow: 1;
          padding: 8px;
          border: 1px solid var(--dash-border, rgba(255,255,255,0.07));
          border-radius: 6px;
          background-color: var(--dash-bg, #0a0a0f);
          color: var(--dash-text, #e8e8f0);
        }
        .lifeos-lumin-quick-input::placeholder {
          color: var(--dash-muted, #555566);
        }
        .lifeos-lumin-quick-button {
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          background-color: var(--dash-accent, #5b6af5);
          color: white;
          cursor: pointer;
          font-weight: bold;
        }
        .lifeos-lumin-quick-button:disabled {
          background-color: var(--dash-muted, #555566);
          cursor: not-allowed;
        }
        .lifeos-lumin-quick-history {
          display: flex;
          flex-direction: column;
          gap: 5px;
          max-height: 150px; /* Limit history height */
          overflow-y: auto;
          padding-right: 5px; /* For scrollbar */
        }
        .lifeos-lumin-quick-response {
          background-color: var(--dash-bg, #0a0a0f);
          padding: 6px 8px;
          border-radius: 6px;
          word-wrap: break-word;
        }
        .lifeos-lumin-quick-loading {
          color: var(--dash-accent, #5b6af5);
          font-style: italic;
        }
        .lifeos-lumin-quick-error {
          color: red;
          font-weight: bold;
        }
        .lifeos-lumin-quick-full-chat-link {
          text-align: right;
          font-size: 12px;
        }
        .lifeos-lumin-quick-full-chat-link a {
          color: var(--dash-accent, #5b6af5);
          text-decoration: none;
        }
        .lifeos-lumin-quick-full-chat-link a:hover {
          text-decoration: underline;
        }
      </style>
      <div class="lifeos-lumin-quick-widget">
        <div class="lifeos-lumin-quick-history"></div>
        <div class="lifeos-lumin-quick-input-area">
          <input type="text" class="lifeos-lumin-quick-input" placeholder="Ask Lumin anything..." />
          <button class="lifeos-lumin-quick-button">Send</button>
        </div>
        <div class="lifeos-lumin-quick-status"></div>
        ${window.LifeOSDashboardAiRail && typeof window.LifeOSDashboardAiRail.expand === 'function' ?
          `<div class="lifeos-lumin-quick-full-chat-link">
            <a href="#" class="lifeos-lumin-quick-open-full-chat">Open full chat</a>
          </div>` : ''
        }
      </div>
    `;

    const inputEl = container.querySelector('.lifeos-lumin-quick-input');
    const sendBtn = container.querySelector('.lifeos-lumin-quick-button');
    const historyEl = container.querySelector('.lifeos-lumin-quick-history');
    const statusEl = container.querySelector('.lifeos-lumin-quick-status');
    const openChatLink = container.querySelector('.lifeos-lumin-quick-open-full-chat');

    function renderHistory() {
      historyEl.innerHTML = '';
      history.slice(-3).forEach(item => {
        const div = document.createElement('div');
        div.className = 'lifeos-lumin-quick-response';
        div.textContent = item;
        historyEl.appendChild(div);
      });
      historyEl.scrollTop = historyEl.scrollHeight; // Scroll to bottom
    }

    async function sendMessage() {
      const message = inputEl.value.trim();
      if (!message) return;

      statusEl.className = 'lifeos-lumin-quick-loading';
      statusEl.textContent = '...';
      sendBtn.disabled = true;
      inputEl.disabled = true;
      inputEl.value = ''; // Clear input immediately

      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message, user, commandKey }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const reply = data.reply || data.message || data.response;

        if (reply) {
          history.push(reply);
          if (history.length > 3) {
            history = history.slice(-3);
          }
          setState(STORAGE_KEY, history);
          renderHistory();
          statusEl.textContent = '';
        } else {
          statusEl.className = 'lifeos-lumin-quick-error';
          statusEl.textContent = 'No reply received.';
        }
      } catch (error) {
        console.error('Lumin Quick Widget: Fetch error:', error);
        statusEl.className = 'lifeos-lumin-quick-error';
        statusEl.textContent = `Error: ${error.message}`;
      } finally {
        sendBtn.disabled = false;
        inputEl.disabled = false;
        inputEl.focus();
      }
    }

    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !sendBtn.disabled) {
        sendMessage();
      }
    });

    if (openChatLink) {
      openChatLink.addEventListener('click', (event) => {
        event.preventDefault();
        if (window.LifeOSDashboardAiRail && typeof window.LifeOSDashboardAiRail.expand === 'function') {
          window.LifeOSDashboardAiRail.expand();
        }
      });
    }

    renderHistory(); // Initial render
  }

  window.LifeOSWidgetLuminQuick = {
    mount
  };
})();