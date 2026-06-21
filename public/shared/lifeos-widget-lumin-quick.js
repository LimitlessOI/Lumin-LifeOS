/**
 * SYNOPSIS: js — public/shared/lifeos-widget-lumin-quick.js.
 */
(function(){
  const STORAGE_KEY_HISTORY = 'lifeos-lumin-quick-history';
  const API_ENDPOINT = '/api/v1/lifeos/chat';

  let _container = null;
  let _user = null;
  let _commandKey = null;
  let _history = [];

  let _inputElement = null;
  let _sendButton = null;
  let _historyDisplay = null;
  let _statusDisplay = null;
  let _fullChatLink = null;

  function loadHistory() {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_HISTORY);
      _history = stored ? JSON.parse(stored) : [];
      // Ensure history is an array and max 3 items
      if (!Array.isArray(_history)) {
        _history = [];
      }
      _history = _history.slice(-3);
    } catch (e) {
      console.error('Failed to load Lumin quick history from sessionStorage:', e);
      _history = [];
    }
  }

  function saveHistory() {
    try {
      sessionStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(_history));
    } catch (e) {
      console.error('Failed to save Lumin quick history to sessionStorage:', e);
    }
  }

  function renderHistory() {
    if (!_historyDisplay) return;
    _historyDisplay.innerHTML = '';
    _history.forEach(item => {
      const p = document.createElement('p');
      p.textContent = item;
      p.style.margin = '4px 0';
      p.style.fontSize = '0.9em';
      p.style.color = 'var(--dash-text, #e8e8f0)'; // Use CSS variable if available
      _historyDisplay.appendChild(p);
    });
    _historyDisplay.scrollTop = _historyDisplay.scrollHeight; // Scroll to bottom
  }

  function showStatus(message, isError = false) {
    if (!_statusDisplay) return;
    _statusDisplay.textContent = message;
    _statusDisplay.style.color = isError ? 'red' : 'var(--dash-muted, #555566)';
    _statusDisplay.style.display = 'block';
  }

  function hideStatus() {
    if (!_statusDisplay) return;
    _statusDisplay.style.display = 'none';
    _statusDisplay.textContent = '';
  }

  async function sendMessage() {
    const message = _inputElement.value.trim();
    if (!message) return;

    _inputElement.value = '';
    _inputElement.disabled = true;
    _sendButton.disabled = true;
    showStatus('...');

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, user: _user, commandKey: _commandKey }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.reply || data.message || data.response;

      if (reply) {
        _history.push(`You: ${message}`);
        _history.push(`Lumin: ${reply}`);
        _history = _history.slice(-3); // Keep last 3 interactions (user + lumin = 2 items)
        saveHistory();
        renderHistory();
      } else {
        showStatus('Lumin did not provide a clear response.', true);
      }
    } catch (error) {
      console.error('Lumin chat error:', error);
      showStatus(`Error: ${error.message}`, true);
    } finally {
      _inputElement.disabled = false;
      _sendButton.disabled = false;
      hideStatus();
      _inputElement.focus();
    }
  }

  function mount({ container, user, commandKey }) {
    if (!container) {
      console.error('Lumin Quick Widget: Container element is required for mounting.');
      return;
    }

    _container = container;
    _user = user || 'anonymous';
    _commandKey = commandKey || 'quick-chat';

    _container.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        border: 1px solid var(--dash-border, rgba(255,255,255,0.07));
        border-radius: var(--dash-radius-lg, 14px);
        background-color: var(--dash-surface, #111118);
        color: var(--dash-text, #e8e8f0);
        font-family: sans-serif;
        max-width: 300px;
      ">
        <div class="lumin-quick-history" style="
          min-height: 60px;
          max-height: 120px;
          overflow-y: auto;
          padding-right: 5px;
          font-size: 0.9em;
          line-height: 1.4;
          color: var(--dash-text, #e8e8f0);
        "></div>
        <div style="display: flex; gap: 8px;">
          <input type="text" class="lumin-quick-input" placeholder="Ask Lumin anything..." style="
            flex-grow: 1;
            padding: 8px 12px;
            border: 1px solid var(--dash-border, rgba(255,255,255,0.07));
            border-radius: 8px;
            background-color: var(--dash-bg, #0a0a0f);
            color: var(--dash-text, #e8e8f0);
            font-size: 1em;
          ">
          <button class="lumin-quick-send-btn" style="
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            background-color: var(--dash-accent, #5b6af5);
            color: white;
            font-size: 1em;
            cursor: pointer;
            transition: background-color 0.2s ease;
          ">Send</button>
        </div>
        <div class="lumin-quick-status" style="
          font-size: 0.8em;
          color: var(--dash-muted, #555566);
          min-height: 1.2em;
          display: none;
        "></div>
        <div class="lumin-quick-footer" style="text-align: center;">
          <!-- Full chat link will be inserted here -->
        </div>
      </div>
    `;

    _inputElement = _container.querySelector('.lumin-quick-input');
    _sendButton = _container.querySelector('.lumin-quick-send-btn');
    _historyDisplay = _container.querySelector('.lumin-quick-history');
    _statusDisplay = _container.querySelector('.lumin-quick-status');
    const footer = _container.querySelector('.lumin-quick-footer');

    _sendButton.addEventListener('click', sendMessage);
    _inputElement.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    loadHistory();
    renderHistory();

    // Check for LifeOSDashboardAiRail and its expand method
    if (window.LifeOSDashboardAiRail && typeof window.LifeOSDashboardAiRail.expand === 'function') {
      _fullChatLink = document.createElement('a');
      _fullChatLink.href = '#';
      _fullChatLink.textContent = 'Open full chat';
      _fullChatLink.style.fontSize = '0.8em';
      _fullChatLink.style.color = 'var(--dash-accent, #5b6af5)';
      _fullChatLink.style.textDecoration = 'none';
      _fullChatLink.style.cursor = 'pointer';
      _fullChatLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.LifeOSDashboardAiRail.expand();
      });
      footer.appendChild(_fullChatLink);
    }
  }

  window.LifeOSWidgetLuminQuick = {
    mount: mount
  };
})();