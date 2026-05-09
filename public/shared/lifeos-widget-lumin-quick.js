(function(){
  const STORAGE_KEY_HISTORY = 'lifeos-lumin-quick-history';
  const API_ENDPOINT = '/api/v1/lifeos/chat';
  const MAX_HISTORY_ITEMS = 3;

  let _containerEl = null;
  let _user = 'anonymous';
  let _commandKey = null; // Stored but not used in POST body per spec

  let _history = [];
  let _isLoading = false;
  let _error = null;

  function getHistory() {
    try {
      const storedHistory = sessionStorage.getItem(STORAGE_KEY_HISTORY);
      return storedHistory ? JSON.parse(storedHistory) : [];
    } catch (e) {
      console.error('Lumin Quick Widget: Error parsing history from sessionStorage:', e);
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

  function render() {
    if (!_containerEl) return;

    _containerEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px; padding: 10px; border: 1px solid var(--dash-border, #ccc); border-radius: var(--dash-radius-lg, 8px); background-color: var(--dash-surface, #fff);">
        <div id="lumin-quick-history" style="display: flex; flex-direction: column; gap: 4px;">
          ${_history.map(item => `<div style="font-size: 0.9em; color: var(--dash-text, #333);">${item}</div>`).join('')}
        </div>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="lumin-quick-input" placeholder="Ask Lumin anything..." style="flex-grow: 1; padding: 8px; border: 1px solid var(--dash-border, #eee); border-radius: 4px; background-color: var(--dash-bg, #f9f9f9); color: var(--dash-text, #333);">
          <button id="lumin-quick-send-btn" style="padding: 8px 12px; border: none; border-radius: 4px; background-color: var(--dash-accent, #5b6af5); color: white; cursor: pointer;">Send</button>
        </div>
        <div id="lumin-quick-status" style="min-height: 1.2em; font-size: 0.9em; color: var(--dash-muted, #666);">
          ${_isLoading ? '...' : ''}
          ${_error ? `<span style="color: red;">${_error}</span>` : ''}
        </div>
        ${window.LifeOSDashboardAiRail?.expand ? `
          <a href="#" id="lumin-quick-open-full-chat" style="font-size: 0.9em; color: var(--dash-accent, #5b6af5); text-decoration: none; margin-top: 4px;">Open full chat</a>
        ` : ''}
      </div>
    `;

    const inputEl = _containerEl.querySelector('#lumin-quick-input');
    const sendBtn = _containerEl.querySelector('#lumin-quick-send-btn');
    const openFullChatLink = _containerEl.querySelector('#lumin-quick-open-full-chat');

    if (sendBtn) {
      sendBtn.addEventListener('click', () => sendMessage(inputEl.value));
    }
    if (inputEl) {
      inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendMessage(inputEl.value);
        }
      });
    }
    if (openFullChatLink) {
      openFullChatLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.LifeOSDashboardAiRail.expand();
      });
    }
  }

  async function sendMessage(message) {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    _isLoading = true;
    _error = null;
    render(); // Show loading state

    const inputEl = _containerEl.querySelector('#lumin-quick-input');
    if (inputEl) inputEl.value = ''; // Clear input immediately

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: trimmedMessage, user: _user }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.reply || data.message || data.response;

      if (reply) {
        _history.unshift(reply);
        if (_history.length > MAX_HISTORY_ITEMS) {
          _history = _history.slice(0, MAX_HISTORY_ITEMS);
        }
        saveHistory(_history);
      } else {
        _error = 'No reply received.';
      }

    } catch (e) {
      console.error('Lumin Quick Widget: Chat error:', e);
      _error = `Failed to send message: ${e.message}`;
    } finally {
      _isLoading = false;
      render(); // Update UI with response or error
    }
  }

  function mount({ container, user, commandKey }) {
    if (!container || !(container instanceof HTMLElement)) {
      console.error('Lumin Quick Widget: Invalid container element provided.');
      return;
    }
    _containerEl = container;
    _user = user || 'anonymous';
    _commandKey = commandKey;

    _history = getHistory();
    render();
  }

  window.LifeOSWidgetLuminQuick = {
    mount: mount
  };
})();